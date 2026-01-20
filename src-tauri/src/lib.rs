use chrono::{DateTime, TimeZone, Utc};
use image::GenericImageView;
use native_tls::TlsConnector;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream, ToSocketAddrs, UdpSocket};
use std::process::Command;
use std::time::{Duration, Instant};

#[tauri::command]
async fn extract_palette_from_image(
    file_path: String,
    num_colors: usize,
) -> Result<Vec<String>, String> {
    // Don't block main thread
    tokio::task::spawn_blocking(move || extract_palette_from_image_blocking(file_path, num_colors))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

fn extract_palette_from_image_blocking(
    file_path: String,
    num_colors: usize,
) -> Result<Vec<String>, String> {
    // Decode image
    let img = image::open(&file_path).map_err(|e| format!("Failed to open image: {}", e))?;

    // Downsample
    let max_dimension = 200;
    let (width, height) = img.dimensions();
    let scale = (max_dimension as f32 / width.max(height) as f32).min(1.0);
    let new_width = ((width as f32 * scale).round() as u32).max(1);
    let new_height = ((height as f32 * scale).round() as u32).max(1);

    let img = img.resize_exact(new_width, new_height, image::imageops::FilterType::Lanczos3);

    // Sample pixels
    let mut pixels: Vec<[u8; 3]> = Vec::new();
    let img_rgb = img.to_rgb8();

    for (_x, _y, pixel) in img_rgb.enumerate_pixels().step_by(20) {
        let r = pixel[0];
        let g = pixel[1];
        let b = pixel[2];

        // Skip very light/dark pixels
        let brightness = (r as u32 + g as u32 + b as u32) / 3;
        if brightness < 20 || brightness > 235 {
            continue;
        }

        pixels.push([r, g, b]);
    }

    if pixels.is_empty() {
        return Err("No valid pixels found in image".to_string());
    }

    // k-means
    let k = num_colors.min(pixels.len());
    let result = kmeans_clustering(&pixels, k)?;

    // Convert to hex colors and sort
    let mut colors_with_counts: Vec<(String, usize)> = result
        .centers
        .iter()
        .zip(result.pixel_counts.iter())
        .map(|(center, &count)| {
            let hex = format!("#{:02x}{:02x}{:02x}", center[0], center[1], center[2]);
            (hex, count)
        })
        .collect();

    colors_with_counts.sort_by(|a, b| b.1.cmp(&a.1));

    Ok(colors_with_counts.into_iter().map(|(hex, _)| hex).collect())
}

struct KmeansResult {
    centers: Vec<[u8; 3]>,
    pixel_counts: Vec<usize>,
}

fn kmeans_clustering(pixels: &[[u8; 3]], k: usize) -> Result<KmeansResult, String> {
    if pixels.is_empty() {
        return Err("No pixels provided".to_string());
    }

    if k == 0 {
        return Err("k must be greater than 0".to_string());
    }

    let k = k.min(pixels.len());

    // Sample pixels evenly
    let step = pixels.len() / k;
    let mut centroids: Vec<[f32; 3]> = (0..k)
        .map(|i| {
            let pixel = pixels[i * step];
            [pixel[0] as f32, pixel[1] as f32, pixel[2] as f32]
        })
        .collect();

    // Track which cluster each pixel belongs to
    let mut assignments: Vec<usize> = vec![0; pixels.len()];

    let max_iterations = 10;

    for _ in 0..max_iterations {
        // Assign pixels to nearest centroid (Hopefully)
        for (idx, &pixel) in pixels.iter().enumerate() {
            let mut min_dist = f32::MAX;
            let mut cluster_index = 0;
            let pixel_f32 = [pixel[0] as f32, pixel[1] as f32, pixel[2] as f32];

            for (i, centroid) in centroids.iter().enumerate() {
                let dist = color_distance_squared(pixel_f32, *centroid);
                if dist < min_dist {
                    min_dist = dist;
                    cluster_index = i;
                }
            }

            assignments[idx] = cluster_index;
        }

        // Update centroids
        let mut changed = false;
        let mut sums: Vec<[f32; 3]> = vec![[0.0, 0.0, 0.0]; k];
        let mut counts: Vec<usize> = vec![0; k];

        for (idx, &pixel) in pixels.iter().enumerate() {
            let cluster = assignments[idx];
            sums[cluster][0] += pixel[0] as f32;
            sums[cluster][1] += pixel[1] as f32;
            sums[cluster][2] += pixel[2] as f32;
            counts[cluster] += 1;
        }

        for i in 0..k {
            if counts[i] == 0 {
                continue;
            }

            let new_centroid = [
                sums[i][0] / counts[i] as f32,
                sums[i][1] / counts[i] as f32,
                sums[i][2] / counts[i] as f32,
            ];

            if color_distance_squared(centroids[i], new_centroid) > 1.0 {
                changed = true;
                centroids[i] = new_centroid;
            }
        }

        if !changed {
            break;
        }
    }

    // Reuse this
    let mut pixel_counts: Vec<usize> = vec![0; k];
    for &assignment in &assignments {
        pixel_counts[assignment] += 1;
    }

    // Centroids to u8
    let centers: Vec<[u8; 3]> = centroids
        .iter()
        .map(|c| [c[0].round() as u8, c[1].round() as u8, c[2].round() as u8])
        .collect();

    Ok(KmeansResult {
        centers,
        pixel_counts,
    })
}

fn color_distance_squared(c1: [f32; 3], c2: [f32; 3]) -> f32 {
    // Euclidean distance
    (c1[0] - c2[0]).powi(2) + (c1[1] - c2[1]).powi(2) + (c1[2] - c2[2]).powi(2)
}

#[tauri::command]
fn run_deploy_command(directory: String, command: String) -> Result<String, String> {
    if command.trim().is_empty() {
        return Err("Empty command".to_string());
    }

    // On macOS, open Terminal.app with the command
    #[cfg(target_os = "macos")]
    {
        // THANKS CUBIC
        // Two layers of escaping needed:
        // 1. Shell escaping (single quotes) for bash/zsh execution
        // 2. AppleScript escaping (double quotes) for AppleScript string safety
        let escaped_command = command
            .replace("'", "'\\''") // Shell: escape single quotes
            .replace("\"", "\\\""); // AppleScript: escape double quotes
        let escaped_directory = directory
            .replace("'", "'\\''") // Shell: escape single quotes
            .replace("\"", "\\\""); // AppleScript: escape double quotes

        let script = format!(
            r#"tell application "Terminal"
                activate
                do script "cd '{}' && {}"
            end tell"#,
            escaped_directory, escaped_command
        );

        Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;

        return Ok("Command launched in Terminal".to_string());
    }

    // On Windows, open cmd.exe with the command
    #[cfg(target_os = "windows")]
    {
        // For directory (inside double quotes): use "" to escape quotes
        let escape_quoted = |s: &str| -> String { s.replace("\"", "\"\"") };

        // For command (outside quotes): use ^ to escape special characters
        let escape_unquoted = |s: &str| -> String {
            s.chars()
                .flat_map(|c| match c {
                    '^' | '&' | '|' | '<' | '>' | '"' | '%' => vec!['^', c],
                    _ => vec![c],
                })
                .collect()
        };

        Command::new("cmd")
            .args([
                "/C",
                "start",
                "cmd",
                "/K",
                &format!(
                    "cd /d \"{}\" && {}",
                    escape_quoted(&directory),
                    escape_unquoted(&command)
                ),
            ])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;

        return Ok("Command launched in Command Prompt".to_string());
    }

    // On Linux, try common terminal emulators
    #[cfg(target_os = "linux")]
    {
        let terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"];

        // Escape both directory and command for shell execution
        let escaped_directory = directory.replace("'", "'\\''");
        let escaped_command = command.replace("'", "'\\''");

        for term in terminals {
            let result = match term {
                "gnome-terminal" => Command::new(term)
                    .args([
                        "--",
                        "bash",
                        "-c",
                        &format!(
                            "cd '{}' && {} ; read -p 'Press Enter to close...'",
                            escaped_directory, escaped_command
                        ),
                    ])
                    .spawn(),
                "konsole" => Command::new(term)
                    .args([
                        "-e",
                        "bash",
                        "-c",
                        &format!(
                            "cd '{}' && {} ; read -p 'Press Enter to close...'",
                            escaped_directory, escaped_command
                        ),
                    ])
                    .spawn(),
                _ => Command::new(term)
                    .args([
                        "-e",
                        &format!(
                            "cd '{}' && {} ; read -p 'Press Enter to close...'",
                            escaped_directory, escaped_command
                        ),
                    ])
                    .spawn(),
            };

            if result.is_ok() {
                return Ok(format!("Command launched in {}", term));
            }
        }

        return Err("No terminal emulator found".to_string());
    }

    #[allow(unreachable_code)]
    Err("Unsupported platform".to_string())
}

#[derive(serde::Serialize)]
struct PortInfo {
    port: u16,
    #[serde(rename = "inUse")]
    in_use: bool,
    pid: Option<u32>,
    #[serde(rename = "processName")]
    process_name: Option<String>,
    #[serde(rename = "needsAdmin")]
    needs_admin: bool,
}

#[tauri::command]
async fn check_port(port: u16) -> Result<PortInfo, String> {
    tokio::task::spawn_blocking(move || check_port_blocking(port))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

#[cfg(target_os = "macos")]
fn check_port_blocking(port: u16) -> Result<PortInfo, String> {
    let output = Command::new("sh")
        .arg("-c")
        .arg(format!("netstat -anv | grep '\\.{}\\b.*LISTEN'", port))
        .output()
        .map_err(|e| format!("Failed to run netstat: {}", e))?;

    if !output.status.success() || output.stdout.is_empty() {
        // Free port
        return Ok(PortInfo {
            port,
            in_use: false,
            pid: None,
            process_name: None,
            needs_admin: false,
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();

        if parts.len() > 10 {
            let process_info = parts[10];

            if let Some(colon_pos) = process_info.rfind(':') {
                let process_name = process_info[..colon_pos].to_string();
                let pid_str = &process_info[colon_pos + 1..];

                if let Ok(pid) = pid_str.parse::<u32>() {
                    return Ok(PortInfo {
                        port,
                        in_use: true,
                        pid: Some(pid),
                        process_name: Some(process_name),
                        needs_admin: false,
                    });
                }
            }
        }
    }

    // No info
    Ok(PortInfo {
        port,
        in_use: true,
        pid: None,
        process_name: None,
        needs_admin: false,
    })
}

#[cfg(target_os = "windows")]
fn check_port_blocking(port: u16) -> Result<PortInfo, String> {
    let output = Command::new("netstat")
        .args(["-ano", "-p", "TCP"])
        .output()
        .map_err(|e| format!("Failed to run netstat: {}", e))?;

    if !output.status.success() {
        return Ok(PortInfo {
            port,
            in_use: false,
            pid: None,
            process_name: None,
            needs_admin: false,
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines() {
        // Check for LISTENING
        if !line.contains("LISTENING") {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        // Parse the local address to extract the port
        if let Some(local_addr) = parts.get(1) {
            if let Some(port_str) = local_addr.rsplit(':').next() {
                if let Ok(line_port) = port_str.parse::<u16>() {
                    if line_port != port {
                        continue;
                    }
                } else {
                    continue;
                }
            } else {
                continue;
            }
        } else {
            continue;
        }

        // Get PID
        if let Some(pid_str) = parts.last() {
            if let Ok(pid) = pid_str.parse::<u32>() {
                // Get name
                let name_output = Command::new("tasklist")
                    .args(["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"])
                    .output();

                let process_name = name_output
                    .ok()
                    .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
                    .and_then(|s| s.split(',').next().map(|n| n.trim_matches('"').to_string()));

                return Ok(PortInfo {
                    port,
                    in_use: true,
                    pid: Some(pid),
                    process_name,
                    needs_admin: false,
                });
            }
        }
    }

    // Free port
    Ok(PortInfo {
        port,
        in_use: false,
        pid: None,
        process_name: None,
        needs_admin: false,
    })
}

#[cfg(target_os = "linux")]
fn check_port_blocking(port: u16) -> Result<PortInfo, String> {
    // netstat -antp
    let output = Command::new("sh")
        .arg("-c")
        .arg(format!(
            "netstat -antp 2>/dev/null | grep ':{}\\b.*LISTEN'",
            port
        ))
        .output()
        .map_err(|e| format!("Failed to run netstat: {}", e))?;

    if output.status.success() && !output.stdout.is_empty() {
        let stdout = String::from_utf8_lossy(&output.stdout);

        for line in stdout.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();

            if parts.len() > 6 {
                let process_info = parts[6];
                if let Some(slash_pos) = process_info.find('/') {
                    let pid = process_info[..slash_pos].parse::<u32>().ok();
                    let process_name = Some(process_info[slash_pos + 1..].to_string());

                    return Ok(PortInfo {
                        port,
                        in_use: true,
                        pid,
                        process_name,
                        needs_admin: pid.is_none(),
                    });
                }
            }

            continue;
        }
    }

    // Free port
    Ok(PortInfo {
        port,
        in_use: false,
        pid: None,
        process_name: None,
        needs_admin: false,
    })
}

#[tauri::command]
fn kill_process(pid: u32) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to kill process: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "Failed to kill process {}: process may not exist or permission denied",
                pid
            ));
        }

        return Ok(format!("Process {} killed successfully", pid));
    }

    #[cfg(target_os = "windows")]
    {
        let output = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output()
            .map_err(|e| format!("Failed to kill process: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "Failed to kill process {}: process may not exist or permission denied",
                pid
            ));
        }

        return Ok(format!("Process {} killed successfully", pid));
    }

    #[cfg(target_os = "linux")]
    {
        let output = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to kill process: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "Failed to kill process {}: process may not exist or permission denied",
                pid
            ));
        }

        return Ok(format!("Process {} killed successfully", pid));
    }

    #[allow(unreachable_code)]
    Err("Unsupported platform".to_string())
}

#[tauri::command]
async fn scan_listening_ports(start_port: u16, end_port: u16) -> Result<Vec<PortInfo>, String> {
    tokio::task::spawn_blocking(move || scan_listening_ports_blocking(start_port, end_port))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

#[cfg(target_os = "macos")]
fn scan_listening_ports_blocking(start_port: u16, end_port: u16) -> Result<Vec<PortInfo>, String> {
    let output = Command::new("sh")
        .arg("-c")
        .arg("netstat -anv | grep LISTEN")
        .output()
        .map_err(|e| format!("Failed to run netstat: {}", e))?;

    if !output.status.success() {
        return Ok(vec![]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    let mut results = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();

        if parts.len() <= 10 {
            continue;
        }

        // Parse addr
        // Formats: *.3000, 127.0.0.1.7265, ::1.8021
        let local_addr = parts[3];

        let port = if let Some(port_str) = local_addr.strip_prefix("*.") {
            // *.3000
            port_str.parse::<u16>().ok()
        } else if let Some(last_dot) = local_addr.rfind('.') {
            // 127.0.0.1.7265 or ::1.8021
            local_addr[last_dot + 1..].parse::<u16>().ok()
        } else {
            None
        };

        if let Some(port_num) = port {
            // Filter by port range
            if port_num < start_port || port_num > end_port {
                continue;
            }

            let process_info = parts[10];
            let (pid, process_name) = if let Some(colon_pos) = process_info.rfind(':') {
                let name = process_info[..colon_pos].to_string();
                let pid = process_info[colon_pos + 1..].parse::<u32>().ok();
                (pid, Some(name))
            } else {
                (None, None)
            };

            results.push(PortInfo {
                port: port_num,
                in_use: true,
                pid,
                process_name,
                needs_admin: false,
            });
        }
    }

    // Dedupe & sort
    results.sort_by_key(|p| p.port);
    results.dedup_by_key(|p| p.port);

    Ok(results)
}

#[cfg(target_os = "windows")]
fn scan_listening_ports_blocking(start_port: u16, end_port: u16) -> Result<Vec<PortInfo>, String> {
    let output = Command::new("netstat")
        .args(["-ano", "-p", "TCP"])
        .output()
        .map_err(|e| format!("Failed to run netstat: {}", e))?;

    if !output.status.success() {
        return Ok(vec![]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    let mut results = Vec::new();

    for line in stdout.lines() {
        if !line.contains("LISTENING") {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
            continue;
        }

        let local_addr = parts[1];
        let port = if let Some(colon_pos) = local_addr.rfind(':') {
            local_addr[colon_pos + 1..].parse::<u16>().ok()
        } else {
            None
        };

        if let Some(port_num) = port {
            if port_num < start_port || port_num > end_port {
                continue;
            }

            let pid = parts.last().and_then(|s| s.parse::<u32>().ok());

            let process_name = if let Some(pid_val) = pid {
                let name_output = Command::new("tasklist")
                    .args(["/FI", &format!("PID eq {}", pid_val), "/FO", "CSV", "/NH"])
                    .output();

                name_output
                    .ok()
                    .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
                    .and_then(|s| s.split(',').next().map(|n| n.trim_matches('"').to_string()))
            } else {
                None
            };

            results.push(PortInfo {
                port: port_num,
                in_use: true,
                pid,
                process_name,
                needs_admin: pid.is_none(),
            });
        }
    }

    results.sort_by_key(|p| p.port);
    results.dedup_by_key(|p| p.port);
    Ok(results)
}

#[cfg(target_os = "linux")]
fn scan_listening_ports_blocking(start_port: u16, end_port: u16) -> Result<Vec<PortInfo>, String> {
    let output = Command::new("sh")
        .arg("-c")
        .arg("netstat -antp 2>/dev/null | grep LISTEN")
        .output()
        .map_err(|e| format!("Failed to run netstat: {}", e))?;

    if !output.status.success() {
        return Ok(vec![]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    let mut results = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 4 {
            continue;
        }

        let local_addr = parts[3];
        let port = if let Some(colon_pos) = local_addr.rfind(':') {
            local_addr[colon_pos + 1..].parse::<u16>().ok()
        } else {
            None
        };

        if let Some(port_num) = port {
            if port_num < start_port || port_num > end_port {
                continue;
            }

            let (pid, process_name) = if parts.len() > 6 {
                let process_info = parts[6];
                if let Some(slash_pos) = process_info.find('/') {
                    let pid = process_info[..slash_pos].parse::<u32>().ok();
                    let name = Some(process_info[slash_pos + 1..].to_string());
                    (pid, name)
                } else {
                    (None, None)
                }
            } else {
                (None, None)
            };

            results.push(PortInfo {
                port: port_num,
                in_use: true,
                pid,
                process_name,
                needs_admin: pid.is_none(),
            });
        }
    }

    results.sort_by_key(|p| p.port);
    results.dedup_by_key(|p| p.port);
    Ok(results)
}

#[derive(serde::Serialize, Clone)]
struct CertificatePayload {
    source: String,
    subject: Option<String>,
    #[serde(rename = "subjectCN")]
    subject_cn: Option<String>,
    issuer: Option<String>,
    #[serde(rename = "issuerCN")]
    issuer_cn: Option<String>,
    san: Vec<String>,
    #[serde(rename = "validFrom")]
    valid_from: Option<String>,
    #[serde(rename = "validTo")]
    valid_to: Option<String>,
    #[serde(rename = "daysRemaining")]
    days_remaining: Option<i64>,
    #[serde(rename = "isExpired")]
    is_expired: bool,
    #[serde(rename = "aboutToExpire")]
    about_to_expire: bool,
    #[serde(rename = "chainValid")]
    chain_valid: Option<bool>,
    #[serde(rename = "authorizationError")]
    authorization_error: Option<String>,
    #[serde(rename = "validForHost")]
    valid_for_host: Option<bool>,
    #[serde(rename = "rawPem")]
    raw_pem: Option<String>,
    #[serde(rename = "serialNumber")]
    serial_number: Option<String>,
    #[serde(rename = "fingerprint256")]
    fingerprint256: Option<String>,
    warnings: Vec<String>,
}

fn extract_cn(subject: &str) -> Option<String> {
    for part in subject.split(',') {
        let part = part.trim();
        if part.starts_with("CN=") {
            return Some(part[3..].to_string());
        }
    }
    None
}

fn parse_alt_names(
    san_ext: Option<&x509_parser::extensions::SubjectAlternativeName>,
) -> Vec<String> {
    let mut names = Vec::new();
    if let Some(san) = san_ext {
        for name in &san.general_names {
            match name {
                x509_parser::extensions::GeneralName::DNSName(dns) => {
                    names.push(dns.to_string());
                }
                x509_parser::extensions::GeneralName::IPAddress(ip) => {
                    if ip.len() == 4 {
                        names.push(format!("{}.{}.{}.{}", ip[0], ip[1], ip[2], ip[3]));
                    } else if ip.len() == 16 {
                        // IPv6
                        let parts: Vec<String> = ip
                            .chunks(2)
                            .map(|c| format!("{:02x}{:02x}", c[0], c[1]))
                            .collect();
                        names.push(parts.join(":"));
                    }
                }
                _ => {}
            }
        }
    }
    names
}

fn host_matches(host: &str, candidates: &[String]) -> bool {
    if host.is_empty() || candidates.is_empty() {
        return false;
    }
    let normalized_host = host.to_lowercase();

    for entry in candidates {
        let candidate = entry.trim().to_lowercase();
        if candidate.is_empty() {
            continue;
        }

        if candidate.starts_with("*.") {
            let domain = &candidate[2..];
            if domain.is_empty() {
                continue;
            }
            if !normalized_host.ends_with(&format!(".{}", domain)) {
                continue;
            }
            let host_parts: Vec<&str> = normalized_host.split('.').collect();
            let domain_parts: Vec<&str> = domain.split('.').collect();
            if host_parts.len() == domain_parts.len() + 1 {
                return true;
            }
        } else if normalized_host == candidate {
            return true;
        }
    }
    false
}

/// Convert time::OffsetDateTime to chrono::DateTime<Utc>
fn offset_to_chrono(odt: time::OffsetDateTime) -> DateTime<Utc> {
    Utc.timestamp_opt(odt.unix_timestamp(), odt.nanosecond())
        .unwrap()
}

fn calculate_days_remaining(valid_to: Option<&DateTime<Utc>>) -> Option<i64> {
    valid_to.map(|target| {
        let now = Utc::now();
        let duration = *target - now;
        duration.num_days()
    })
}

fn collect_warnings(
    is_expired: bool,
    about_to_expire: bool,
    valid_for_host: Option<bool>,
    chain_valid: Option<bool>,
) -> Vec<String> {
    let mut warnings = Vec::new();
    if is_expired {
        warnings.push("expired".to_string());
    }
    if !is_expired && about_to_expire {
        warnings.push("expiresSoon".to_string());
    }
    if valid_for_host == Some(false) {
        warnings.push("hostnameMismatch".to_string());
    }
    if chain_valid == Some(false) {
        warnings.push("chainInvalid".to_string());
    }
    warnings
}

fn buffer_to_pem(der: &[u8]) -> String {
    use base64::Engine;
    let base64 = base64::engine::general_purpose::STANDARD.encode(der);
    let lines: Vec<&str> = base64
        .as_bytes()
        .chunks(64)
        .map(|chunk| std::str::from_utf8(chunk).unwrap_or(""))
        .collect();
    format!(
        "-----BEGIN CERTIFICATE-----\n{}\n-----END CERTIFICATE-----",
        lines.join("\n")
    )
}

fn sha256_fingerprint(der: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(der);
    let result = hasher.finalize();
    let hex_bytes: Vec<String> = result.iter().map(|b| format!("{:02X}", b)).collect();
    hex_bytes.join(":")
}

#[tauri::command]
async fn cert_check(
    host: Option<String>,
    port: Option<u16>,
    cert_pem: Option<String>,
) -> Result<CertificatePayload, String> {
    // If certPem is provided, parse it directly
    if let Some(pem) = cert_pem {
        return parse_pem_certificate(&pem, host.as_deref());
    }

    let host = host.ok_or("Host is required")?;
    let port = port.unwrap_or(443);

    tokio::task::spawn_blocking(move || fetch_remote_certificate(&host, port))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

fn parse_pem_certificate(pem: &str, host: Option<&str>) -> Result<CertificatePayload, String> {
    use x509_parser::prelude::*;

    let (_, pem_parsed) = x509_parser::pem::parse_x509_pem(pem.as_bytes())
        .map_err(|e| format!("Failed to parse PEM: {:?}", e))?;

    let (_, cert) = X509Certificate::from_der(&pem_parsed.contents)
        .map_err(|e| format!("Failed to parse certificate: {:?}", e))?;

    let subject = cert.subject().to_string();
    let subject_cn = extract_cn(&subject);
    let issuer = cert.issuer().to_string();
    let issuer_cn = extract_cn(&issuer);

    let san = cert.extensions().iter().find_map(|ext| {
        if let x509_parser::extensions::ParsedExtension::SubjectAlternativeName(san) =
            ext.parsed_extension()
        {
            Some(san)
        } else {
            None
        }
    });

    let san_names = parse_alt_names(san);

    let valid_from = offset_to_chrono(cert.validity().not_before.to_datetime());
    let valid_to = offset_to_chrono(cert.validity().not_after.to_datetime());

    let now = Utc::now();
    let is_expired = valid_to < now;
    let days_remaining = calculate_days_remaining(Some(&valid_to));
    let about_to_expire = !is_expired && days_remaining.map(|d| d <= 14).unwrap_or(false);

    let valid_for_host = host.map(|h| {
        let candidates = if !san_names.is_empty() {
            san_names.clone()
        } else if let Some(ref cn) = subject_cn {
            vec![cn.clone()]
        } else {
            vec![subject.clone()]
        };
        host_matches(h, &candidates)
    });

    let warnings = collect_warnings(is_expired, about_to_expire, valid_for_host, None);

    Ok(CertificatePayload {
        source: "pem".to_string(),
        subject: Some(subject),
        subject_cn,
        issuer: Some(issuer),
        issuer_cn,
        san: san_names,
        valid_from: Some(valid_from.to_rfc3339()),
        valid_to: Some(valid_to.to_rfc3339()),
        days_remaining,
        is_expired,
        about_to_expire,
        chain_valid: None,
        authorization_error: None,
        valid_for_host,
        raw_pem: Some(pem.to_string()),
        serial_number: Some(cert.serial.to_str_radix(16)),
        fingerprint256: Some(sha256_fingerprint(&pem_parsed.contents)),
        warnings,
    })
}

fn fetch_remote_certificate(host: &str, port: u16) -> Result<CertificatePayload, String> {
    use x509_parser::prelude::*;

    let addr = format!("{}:{}", host, port);

    // Connect with TCP
    let stream = TcpStream::connect_timeout(
        &addr
            .to_socket_addrs()
            .map_err(|e| format!("Failed to resolve host: {}", e))?
            .next()
            .ok_or("No addresses found")?,
        Duration::from_secs(8),
    )
    .map_err(|e| format!("Failed to connect: {}", e))?;

    stream
        .set_read_timeout(Some(Duration::from_secs(8)))
        .map_err(|e| format!("Failed to set timeout: {}", e))?;

    // TLS handshake
    let connector = TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .danger_accept_invalid_hostnames(true)
        .build()
        .map_err(|e| format!("Failed to build TLS connector: {}", e))?;

    let tls_stream = connector
        .connect(host, stream)
        .map_err(|e| format!("TLS handshake failed: {}", e))?;

    // Get peer certificate
    let cert = tls_stream
        .peer_certificate()
        .map_err(|e| format!("Failed to get certificate: {}", e))?
        .ok_or("No certificate presented")?;

    let der = cert
        .to_der()
        .map_err(|e| format!("Failed to get DER: {}", e))?;

    let (_, x509_cert) = X509Certificate::from_der(&der)
        .map_err(|e| format!("Failed to parse certificate: {:?}", e))?;

    let subject = x509_cert.subject().to_string();
    let subject_cn = extract_cn(&subject);
    let issuer = x509_cert.issuer().to_string();
    let issuer_cn = extract_cn(&issuer);

    let san = x509_cert.extensions().iter().find_map(|ext| {
        if let x509_parser::extensions::ParsedExtension::SubjectAlternativeName(san) =
            ext.parsed_extension()
        {
            Some(san)
        } else {
            None
        }
    });

    let san_names = parse_alt_names(san);

    let valid_from = offset_to_chrono(x509_cert.validity().not_before.to_datetime());
    let valid_to = offset_to_chrono(x509_cert.validity().not_after.to_datetime());

    let now = Utc::now();
    let is_expired = valid_to < now;
    let days_remaining = calculate_days_remaining(Some(&valid_to));
    let about_to_expire = !is_expired && days_remaining.map(|d| d <= 14).unwrap_or(false);

    let valid_for_host = {
        let candidates = if !san_names.is_empty() {
            san_names.clone()
        } else if let Some(ref cn) = subject_cn {
            vec![cn.clone()]
        } else {
            vec![subject.clone()]
        };
        host_matches(host, &candidates)
    };

    // Check chain validity by trying with verification enabled
    let chain_valid = {
        let verify_connector = TlsConnector::builder().build().ok();

        if let Some(vc) = verify_connector {
            let verify_stream = TcpStream::connect_timeout(
                &addr
                    .to_socket_addrs()
                    .ok()
                    .and_then(|mut a| a.next())
                    .unwrap(),
                Duration::from_secs(5),
            )
            .ok();

            if let Some(vs) = verify_stream {
                vc.connect(host, vs).is_ok()
            } else {
                false
            }
        } else {
            false
        }
    };

    let warnings = collect_warnings(
        is_expired,
        about_to_expire,
        Some(valid_for_host),
        Some(chain_valid),
    );

    Ok(CertificatePayload {
        source: "remote".to_string(),
        subject: Some(subject),
        subject_cn,
        issuer: Some(issuer),
        issuer_cn,
        san: san_names,
        valid_from: Some(valid_from.to_rfc3339()),
        valid_to: Some(valid_to.to_rfc3339()),
        days_remaining,
        is_expired,
        about_to_expire,
        chain_valid: Some(chain_valid),
        authorization_error: if !chain_valid {
            Some("Certificate chain validation failed".to_string())
        } else {
            None
        },
        valid_for_host: Some(valid_for_host),
        raw_pem: Some(buffer_to_pem(&der)),
        serial_number: Some(x509_cert.serial.to_str_radix(16)),
        fingerprint256: Some(sha256_fingerprint(&der)),
        warnings,
    })
}

// ============================================================================
// HTTP Proxy Commands
// ============================================================================

#[derive(serde::Deserialize)]
struct ProxyRequest {
    #[serde(rename = "InputUrl")]
    input_url: String,
    method: Option<String>,
    headers: Option<std::collections::HashMap<String, String>>,
    body: Option<String>,
}

#[derive(serde::Serialize)]
struct ProxyResponse {
    status: u16,
    #[serde(rename = "statusText")]
    status_text: String,
    #[serde(rename = "responseTime")]
    response_time: u64,
    data: String,
    #[serde(rename = "contentType")]
    content_type: String,
}

#[tauri::command]
async fn http_proxy(request: ProxyRequest) -> Result<ProxyResponse, String> {
    let url = url::Url::parse(&request.input_url).map_err(|e| format!("Invalid URL: {}", e))?;

    let method = request.method.unwrap_or_else(|| "GET".to_string());
    let method =
        reqwest::Method::from_bytes(method.as_bytes()).map_err(|_| "Invalid HTTP method")?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;

    let start = Instant::now();

    let mut req_builder = client.request(method.clone(), url);

    if let Some(headers) = request.headers {
        for (key, value) in headers {
            // Skip headers with CRLF injection
            if !value.contains('\r') && !value.contains('\n') {
                req_builder = req_builder.header(&key, &value);
            }
        }
    }

    if method != reqwest::Method::GET {
        if let Some(body) = request.body {
            req_builder = req_builder.body(body);
        }
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let response_time = start.elapsed().as_millis() as u64;
    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("")
        .to_string();
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let data = if content_type.contains("application/json") {
        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        serde_json::to_string_pretty(&json).unwrap_or_default()
    } else {
        response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?
    };

    Ok(ProxyResponse {
        status,
        status_text,
        response_time,
        data,
        content_type,
    })
}

// ============================================================================
// TCP/UDP Whistle Commands
// ============================================================================

#[derive(serde::Deserialize, Clone)]
struct WhistleRequest {
    mode: String,
    host: Option<String>,
    port: u16,
    payload: Option<String>,
    #[serde(rename = "timeoutMs")]
    timeout_ms: Option<u64>,
    #[serde(rename = "delayMs")]
    delay_ms: Option<u64>,
    #[serde(rename = "chunkSize")]
    chunk_size: Option<usize>,
    #[serde(rename = "durationMs")]
    duration_ms: Option<u64>,
    malformed: Option<bool>,
    echo: Option<bool>,
    #[serde(rename = "echoPayload")]
    echo_payload: Option<String>,
    #[serde(rename = "respondDelayMs")]
    respond_delay_ms: Option<u64>,
    #[serde(rename = "maxCapture")]
    max_capture: Option<usize>,
}

#[derive(serde::Serialize)]
struct WhistleSendResponse {
    ok: bool,
    mode: String,
    #[serde(rename = "elapsedMs")]
    elapsed_ms: u64,
    #[serde(rename = "bytesSent")]
    bytes_sent: usize,
    #[serde(rename = "bytesReceived")]
    bytes_received: usize,
    response: ResponsePreview,
}

#[derive(serde::Serialize)]
struct ResponsePreview {
    text: String,
    hex: String,
    bytes: usize,
}

#[derive(serde::Serialize, Clone)]
struct CaptureEntry {
    at: String,
    #[serde(rename = "remoteAddress")]
    remote_address: Option<String>,
    #[serde(rename = "remotePort")]
    remote_port: Option<u16>,
    bytes: usize,
    hex: String,
    text: String,
    #[serde(rename = "elapsedMs", skip_serializing_if = "Option::is_none")]
    elapsed_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    note: Option<String>,
}

#[derive(serde::Serialize)]
struct WhistleListenResponse {
    ok: bool,
    mode: String,
    #[serde(rename = "durationMs")]
    duration_ms: u64,
    captures: Vec<CaptureEntry>,
}

const MAX_PAYLOAD_BYTES: usize = 4096;
const MAX_RESPONSE_BYTES: usize = 128 * 1024;
const MAX_DURATION_MS: u64 = 600000;
const MAX_DELAY_MS: u64 = 8000;

fn to_safe_delay(value: Option<u64>, fallback: u64) -> u64 {
    value.map(|v| v.min(MAX_DELAY_MS)).unwrap_or(fallback)
}

fn to_safe_duration(value: Option<u64>, fallback: u64) -> u64 {
    value
        .map(|v| v.min(MAX_DURATION_MS).max(1))
        .unwrap_or(fallback)
}

fn build_payload(payload: Option<&str>, malformed: bool) -> Vec<u8> {
    let mut data: Vec<u8> = payload.unwrap_or("").as_bytes().to_vec();
    data.truncate(MAX_PAYLOAD_BYTES);

    if malformed {
        data.extend_from_slice(&[0x00, 0xff, 0x13, 0x37]);
        data.truncate(MAX_PAYLOAD_BYTES);
    }

    data
}

fn preview(buffer: &[u8]) -> ResponsePreview {
    ResponsePreview {
        text: String::from_utf8_lossy(buffer).to_string(),
        hex: hex::encode(buffer),
        bytes: buffer.len(),
    }
}

fn validate_whistle_host(host: Option<&str>) -> Result<(), String> {
    let host = host.ok_or("Host is required")?;
    let normalized = host.trim().to_lowercase();

    let allowed = ["localhost", "127.0.0.1", "::1", "[::1]"];
    if allowed.contains(&normalized.as_str()) {
        return Ok(());
    }

    // Allow 127.x.x.x range
    if normalized.starts_with("127.") {
        let parts: Vec<&str> = normalized.split('.').collect();
        if parts.len() == 4 && parts.iter().all(|p| p.parse::<u8>().is_ok()) {
            return Ok(());
        }
    }

    Err("Only localhost/loopback addresses are allowed for security reasons".to_string())
}

#[tauri::command]
async fn whistle(request: WhistleRequest) -> Result<serde_json::Value, String> {
    let mode = request.mode.as_str();

    match mode {
        "tcp-send" | "udp-send" => {
            validate_whistle_host(request.host.as_deref())?;
        }
        _ => {}
    }

    match mode {
        "tcp-send" => {
            let result = handle_tcp_send(request).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "udp-send" => {
            let result = handle_udp_send(request).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "tcp-listen" => {
            let result = handle_tcp_listen(request).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "udp-listen" => {
            let result = handle_udp_listen(request).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        _ => Err("Unsupported mode".to_string()),
    }
}

async fn handle_tcp_send(req: WhistleRequest) -> Result<WhistleSendResponse, String> {
    let host = req.host.as_deref().unwrap_or("localhost");
    let payload = build_payload(req.payload.as_deref(), req.malformed.unwrap_or(false));
    let delay_ms = to_safe_delay(req.delay_ms, 0);
    let timeout_ms = req.timeout_ms.unwrap_or(5000).max(500);
    let chunk_size = req.chunk_size;

    let addr = format!("{}:{}", host, req.port);
    let start = Instant::now();

    let result = tokio::task::spawn_blocking(move || {
        let mut stream = TcpStream::connect_timeout(
            &addr
                .to_socket_addrs()
                .map_err(|e| format!("Failed to resolve: {}", e))?
                .next()
                .ok_or("No address found")?,
            Duration::from_millis(timeout_ms),
        )
        .map_err(|e| format!("Connect failed: {}", e))?;

        stream
            .set_read_timeout(Some(Duration::from_millis(timeout_ms)))
            .map_err(|e| format!("Set timeout failed: {}", e))?;
        stream
            .set_write_timeout(Some(Duration::from_millis(timeout_ms)))
            .map_err(|e| format!("Set timeout failed: {}", e))?;

        if delay_ms > 0 {
            std::thread::sleep(Duration::from_millis(delay_ms));
        }

        // Send data
        if let Some(chunk) = chunk_size {
            if chunk < payload.len() {
                for chunk_data in payload.chunks(chunk) {
                    stream
                        .write_all(chunk_data)
                        .map_err(|e| format!("Write failed: {}", e))?;
                    std::thread::sleep(Duration::from_millis(120));
                }
            } else {
                stream
                    .write_all(&payload)
                    .map_err(|e| format!("Write failed: {}", e))?;
            }
        } else {
            stream
                .write_all(&payload)
                .map_err(|e| format!("Write failed: {}", e))?;
        }

        stream.shutdown(std::net::Shutdown::Write).ok();

        // Read response
        let mut response = Vec::new();
        let mut buf = [0u8; 8192];
        loop {
            match stream.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    response.extend_from_slice(&buf[..n]);
                    if response.len() >= MAX_RESPONSE_BYTES {
                        response.truncate(MAX_RESPONSE_BYTES);
                        break;
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => break,
                Err(e) if e.kind() == std::io::ErrorKind::TimedOut => break,
                Err(e) => return Err(format!("Read failed: {}", e)),
            }
        }

        Ok::<(Vec<u8>, usize), String>((response, payload.len()))
    })
    .await
    .map_err(|e| format!("Task error: {}", e))??;

    let elapsed_ms = start.elapsed().as_millis() as u64;

    Ok(WhistleSendResponse {
        ok: true,
        mode: "tcp-send".to_string(),
        elapsed_ms,
        bytes_sent: result.1,
        bytes_received: result.0.len(),
        response: preview(&result.0),
    })
}

async fn handle_udp_send(req: WhistleRequest) -> Result<WhistleSendResponse, String> {
    let host = req.host.as_deref().unwrap_or("localhost");
    let payload = build_payload(req.payload.as_deref(), req.malformed.unwrap_or(false));
    let delay_ms = to_safe_delay(req.delay_ms, 0);
    let timeout_ms = req.timeout_ms.unwrap_or(4000).max(500);

    let addr = format!("{}:{}", host, req.port);
    let start = Instant::now();

    let payload_len = payload.len();

    let result = tokio::task::spawn_blocking(move || {
        let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| format!("Bind failed: {}", e))?;

        socket
            .set_read_timeout(Some(Duration::from_millis(timeout_ms)))
            .map_err(|e| format!("Set timeout failed: {}", e))?;

        socket
            .connect(&addr)
            .map_err(|e| format!("Connect failed: {}", e))?;

        if delay_ms > 0 {
            std::thread::sleep(Duration::from_millis(delay_ms));
        }

        socket
            .send(&payload)
            .map_err(|e| format!("Send failed: {}", e))?;

        let mut buf = [0u8; 65535];
        let response = match socket.recv(&mut buf) {
            Ok(n) => buf[..n.min(MAX_RESPONSE_BYTES)].to_vec(),
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => Vec::new(),
            Err(e) if e.kind() == std::io::ErrorKind::TimedOut => Vec::new(),
            Err(e) => return Err(format!("Recv failed: {}", e)),
        };

        Ok::<Vec<u8>, String>(response)
    })
    .await
    .map_err(|e| format!("Task error: {}", e))??;

    let elapsed_ms = start.elapsed().as_millis() as u64;

    Ok(WhistleSendResponse {
        ok: true,
        mode: "udp-send".to_string(),
        elapsed_ms,
        bytes_sent: payload_len,
        bytes_received: result.len(),
        response: preview(&result),
    })
}

async fn handle_tcp_listen(req: WhistleRequest) -> Result<WhistleListenResponse, String> {
    let duration_ms = to_safe_duration(req.duration_ms, 600000);
    let respond_delay_ms = to_safe_delay(req.respond_delay_ms, 0);
    let max_capture = req.max_capture.unwrap_or(10).min(25);
    let echo = req.echo.unwrap_or(false);
    let echo_payload = build_payload(req.echo_payload.as_deref(), req.malformed.unwrap_or(false));

    let addr = format!("0.0.0.0:{}", req.port);

    let listener = TcpListener::bind(&addr).map_err(|e| format!("Bind failed: {}", e))?;

    listener
        .set_nonblocking(true)
        .map_err(|e| format!("Set nonblocking failed: {}", e))?;

    let start = Instant::now();
    let mut captures: Vec<CaptureEntry> = Vec::new();

    let deadline = Duration::from_millis(duration_ms);

    while start.elapsed() < deadline && captures.len() < max_capture {
        match listener.accept() {
            Ok((mut stream, addr)) => {
                let conn_start = Instant::now();
                stream.set_read_timeout(Some(Duration::from_secs(5))).ok();

                let mut data = Vec::new();
                let mut buf = [0u8; 8192];
                loop {
                    match stream.read(&mut buf) {
                        Ok(0) => break,
                        Ok(n) => {
                            data.extend_from_slice(&buf[..n]);
                            if data.len() >= MAX_RESPONSE_BYTES {
                                data.truncate(MAX_RESPONSE_BYTES);
                                break;
                            }
                        }
                        Err(_) => break,
                    }
                }

                captures.push(CaptureEntry {
                    at: Utc::now().to_rfc3339(),
                    remote_address: Some(addr.ip().to_string()),
                    remote_port: Some(addr.port()),
                    bytes: data.len(),
                    hex: hex::encode(&data),
                    text: String::from_utf8_lossy(&data).to_string(),
                    elapsed_ms: Some(conn_start.elapsed().as_millis() as u64),
                    note: None,
                });

                if echo {
                    if respond_delay_ms > 0 {
                        std::thread::sleep(Duration::from_millis(respond_delay_ms));
                    }
                    stream.write_all(&echo_payload).ok();
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(e) => {
                captures.push(CaptureEntry {
                    at: Utc::now().to_rfc3339(),
                    remote_address: None,
                    remote_port: None,
                    bytes: 0,
                    hex: String::new(),
                    text: String::new(),
                    elapsed_ms: None,
                    note: Some(format!("Accept error: {}", e)),
                });
            }
        }
    }

    Ok(WhistleListenResponse {
        ok: true,
        mode: "tcp-listen".to_string(),
        duration_ms: start.elapsed().as_millis() as u64,
        captures,
    })
}

async fn handle_udp_listen(req: WhistleRequest) -> Result<WhistleListenResponse, String> {
    let duration_ms = to_safe_duration(req.duration_ms, 5000);
    let respond_delay_ms = to_safe_delay(req.respond_delay_ms, 0);
    let max_capture = req.max_capture.unwrap_or(10).min(25);
    let echo = req.echo.unwrap_or(false);
    let echo_payload = build_payload(req.echo_payload.as_deref(), req.malformed.unwrap_or(false));

    let addr = format!("0.0.0.0:{}", req.port);

    let socket = UdpSocket::bind(&addr).map_err(|e| format!("Bind failed: {}", e))?;

    socket
        .set_nonblocking(true)
        .map_err(|e| format!("Set nonblocking failed: {}", e))?;

    let start = Instant::now();
    let mut captures: Vec<CaptureEntry> = Vec::new();

    let deadline = Duration::from_millis(duration_ms);
    let mut buf = [0u8; 65535];

    while start.elapsed() < deadline && captures.len() < max_capture {
        match socket.recv_from(&mut buf) {
            Ok((n, addr)) => {
                let data = buf[..n.min(MAX_RESPONSE_BYTES)].to_vec();

                captures.push(CaptureEntry {
                    at: Utc::now().to_rfc3339(),
                    remote_address: Some(addr.ip().to_string()),
                    remote_port: Some(addr.port()),
                    bytes: data.len(),
                    hex: hex::encode(&data),
                    text: String::from_utf8_lossy(&data).to_string(),
                    elapsed_ms: None,
                    note: None,
                });

                if echo {
                    if respond_delay_ms > 0 {
                        std::thread::sleep(Duration::from_millis(respond_delay_ms));
                    }
                    socket.send_to(&echo_payload, addr).ok();
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(e) => {
                captures.push(CaptureEntry {
                    at: Utc::now().to_rfc3339(),
                    remote_address: None,
                    remote_port: None,
                    bytes: 0,
                    hex: String::new(),
                    text: String::new(),
                    elapsed_ms: None,
                    note: Some(format!("Recv error: {}", e)),
                });
            }
        }
    }

    Ok(WhistleListenResponse {
        ok: true,
        mode: "udp-listen".to_string(),
        duration_ms: start.elapsed().as_millis() as u64,
        captures,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_deploy_command,
            extract_palette_from_image,
            check_port,
            kill_process,
            scan_listening_ports,
            cert_check,
            http_proxy,
            whistle
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
