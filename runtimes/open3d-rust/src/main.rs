use std::io::{self, BufRead, Write};

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut stdout = stdout.lock();

    eprintln!("Open3D Rust LRP runtime started");

    for line in stdin.lock().lines() {
        match line {
            Ok(input) => {
                // JSON-RPC 2.0 handler stub
                let response = format!(
                    r#"{{"jsonrpc":"2.0","result":{{"status":"ok","runtime":"rust"}},"id":null}}"#
                );
                writeln!(stdout, "{}", response).ok();
                stdout.flush().ok();
            }
            Err(e) => {
                eprintln!("Read error: {}", e);
                break;
            }
        }
    }
}
