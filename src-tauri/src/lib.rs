use std::process::Command;
use image::GenericImageView;

#[tauri::command]
async fn extract_palette_from_image(file_path: String, num_colors: usize) -> Result<Vec<String>, String> {
    // Don't block main thread
    tokio::task::spawn_blocking(move || {
        extract_palette_from_image_blocking(file_path, num_colors)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

fn extract_palette_from_image_blocking(file_path: String, num_colors: usize) -> Result<Vec<String>, String> {
    // Decode image
    let img = image::open(&file_path)
        .map_err(|e| format!("Failed to open image: {}", e))?;

    // Downsample
    let max_dimension = 200;
    let (width, height) = img.dimensions();
    let scale = (max_dimension as f32 / width.max(height) as f32).min(1.0);
    let new_width = ((width as f32 * scale).round() as u32).max(1);
    let new_height = ((height as f32 * scale).round() as u32).max(1);

    let img = img.resize_exact(
        new_width,
        new_height,
        image::imageops::FilterType::Lanczos3,
    );

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
            let hex = format!(
                "#{:02x}{:02x}{:02x}",
                center[0], center[1], center[2]
            );
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
            .replace("'", "'\\''")      // Shell: escape single quotes
            .replace("\"", "\\\"");     // AppleScript: escape double quotes
        let escaped_directory = directory
            .replace("'", "'\\''")      // Shell: escape single quotes
            .replace("\"", "\\\"");     // AppleScript: escape double quotes

        let script = format!(
            r#"tell application "Terminal"
                activate
                do script "cd '{}' && {}"
            end tell"#,
            escaped_directory,
            escaped_command
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
        let escape_quoted = |s: &str| -> String {
            s.replace("\"", "\"\"")
        };

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
            .args(["/C", "start", "cmd", "/K", &format!("cd /d \"{}\" && {}",
                escape_quoted(&directory),
                escape_unquoted(&command))])
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
                    .args(["--", "bash", "-c", &format!("cd '{}' && {} ; read -p 'Press Enter to close...'", escaped_directory, escaped_command)])
                    .spawn(),
                "konsole" => Command::new(term)
                    .args(["-e", "bash", "-c", &format!("cd '{}' && {} ; read -p 'Press Enter to close...'", escaped_directory, escaped_command)])
                    .spawn(),
                _ => Command::new(term)
                    .args(["-e", &format!("cd '{}' && {} ; read -p 'Press Enter to close...'", escaped_directory, escaped_command)])
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
    tokio::task::spawn_blocking(move || {
        check_port_blocking(port)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[cfg(target_os = "macos")]
fn check_port_blocking(port: u16) -> Result<PortInfo, String> {
    let output = Command::new("sh")
        .arg("-c")
        .arg(format!("netstat -anv | grep '\\.{}.*LISTEN'", port))
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
        if !line.contains(&format!(":{}", port)) || !line.contains("LISTENING") {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 5 {
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
        .arg(format!("netstat -antp 2>/dev/null | grep ':{} .*LISTEN'", port))
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

            return Ok(PortInfo {
                port,
                in_use: true,
                pid: None,
                process_name: None,
                needs_admin: true,
            });
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
        Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to kill process: {}", e))?;

        return Ok(format!("Process {} killed successfully", pid));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output()
            .map_err(|e| format!("Failed to kill process: {}", e))?;

        return Ok(format!("Process {} killed successfully", pid));
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .map_err(|e| format!("Failed to kill process: {}", e))?;

        return Ok(format!("Process {} killed successfully", pid));
    }

    #[allow(unreachable_code)]
    Err("Unsupported platform".to_string())
}

#[tauri::command]
async fn scan_listening_ports(start_port: u16, end_port: u16) -> Result<Vec<PortInfo>, String> {
    tokio::task::spawn_blocking(move || {
        scan_listening_ports_blocking(start_port, end_port)
    })
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


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
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
        scan_listening_ports
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
