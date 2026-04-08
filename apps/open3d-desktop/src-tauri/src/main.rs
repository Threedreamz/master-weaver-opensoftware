#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Child};
use std::sync::Mutex;
use tauri::State;

struct ServerState {
    process: Mutex<Option<Child>>,
}

#[tauri::command]
fn start_render_server(state: State<ServerState>) -> Result<String, String> {
    let mut proc = state.process.lock().map_err(|e| e.to_string())?;
    if proc.is_some() {
        return Ok("Server already running".to_string());
    }

    let child = Command::new("node")
        .args(["../../open3d-api/dist/index.js"])
        .spawn()
        .map_err(|e| format!("Failed to start server: {}", e))?;

    *proc = Some(child);
    Ok("Server started on port 4173".to_string())
}

#[tauri::command]
fn stop_render_server(state: State<ServerState>) -> Result<(), String> {
    let mut proc = state.process.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = proc.take() {
        child.kill().map_err(|e| format!("Failed to stop: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn get_server_status(state: State<ServerState>) -> bool {
    let proc = state.process.lock().unwrap();
    proc.is_some()
}

#[tauri::command]
fn check_apple_photogrammetry() -> bool {
    cfg!(target_os = "macos") && Command::new("swift").arg("--version").output().is_ok()
}

fn main() {
    tauri::Builder::default()
        .manage(ServerState { process: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![
            start_render_server,
            stop_render_server,
            get_server_status,
            check_apple_photogrammetry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Open3D Desktop");
}
