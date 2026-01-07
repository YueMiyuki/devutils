use std::process::Command;

#[tauri::command]
fn run_deploy_command(directory: String, command: String) -> Result<String, String> {
    if command.trim().is_empty() {
        return Err("Empty command".to_string());
    }

    // On macOS, open Terminal.app with the command
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"tell application "Terminal"
                activate
                do script "cd '{}' && {}"
            end tell"#,
            directory.replace("'", "'\\''"),
            command.replace("\"", "\\\"")
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
        // Escape cmd.exe special characters: ^ & | < > " %
        let escape_cmd = |s: &str| -> String {
            s.chars()
                .flat_map(|c| match c {
                    '^' | '&' | '|' | '<' | '>' | '"' | '%' => vec!['^', c],
                    _ => vec![c],
                })
                .collect()
        };

        Command::new("cmd")
            .args(["/C", "start", "cmd", "/K", &format!("cd /d \"{}\" && {}",
                escape_cmd(&directory),
                escape_cmd(&command))])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;

        return Ok("Command launched in Command Prompt".to_string());
    }

    // On Linux, try common terminal emulators
    #[cfg(target_os = "linux")]
    {
        let terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"];

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
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
    .invoke_handler(tauri::generate_handler![run_deploy_command])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
