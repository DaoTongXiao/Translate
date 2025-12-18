use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

pub struct ChromaServer {
    process: Arc<Mutex<Option<Child>>>,
    data_path: PathBuf,
    port: u16,
}

impl ChromaServer {
    pub fn new(app: &AppHandle, port: u16) -> Result<Self, String> {
        let app_data_dir = app
            .path()
            .resolve("app_data", tauri::path::BaseDirectory::AppData)
            .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
        
        let data_path = app_data_dir.join("chromadb");
        std::fs::create_dir_all(&data_path)
            .map_err(|e| format!("创建数据目录失败: {}", e))?;

        Ok(Self {
            process: Arc::new(Mutex::new(None)),
            data_path,
            port,
        })
    }

    pub fn start(&self) -> Result<(), String> {
        let mut process_guard = self.process.lock().unwrap();
        
        if process_guard.is_some() {
            return Ok(());
        }

        let python_cmd = self.find_python()?;
        self.ensure_chromadb_installed(&python_cmd)?;

        let mut cmd = Command::new(&python_cmd);
        cmd.arg("-m")
            .arg("chromadb.cli")
            .arg("run")
            .arg("--path")
            .arg(&self.data_path)
            .arg("--port")
            .arg(self.port.to_string())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let child = cmd.spawn().map_err(|e| {
            format!("启动 ChromaDB 服务器失败: {}. 请确保已安装 Python 和 chromadb: pip install chromadb", e)
        })?;

        *process_guard = Some(child);
        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut process_guard = self.process.lock().unwrap();
        if let Some(mut child) = process_guard.take() {
            child.kill().map_err(|e| format!("停止 ChromaDB 服务器失败: {}", e))?;
            let _ = child.wait();
        }
        Ok(())
    }

    pub fn base_url(&self) -> String {
        format!("http://localhost:{}", self.port)
    }

    fn find_python(&self) -> Result<String, String> {
        for cmd in &["python3", "python"] {
            if Command::new(cmd)
                .arg("--version")
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .is_ok()
            {
                return Ok(cmd.to_string());
            }
        }
        Err("未找到 Python。请安装 Python 3.7+".to_string())
    }

    fn ensure_chromadb_installed(&self, python_cmd: &str) -> Result<(), String> {
        let check_cmd = Command::new(python_cmd)
            .arg("-c")
            .arg("import chromadb; print('ok')")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output();

        match check_cmd {
            Ok(output) if output.status.success() => Ok(()),
            _ => {
                let install_cmd = Command::new(python_cmd)
                    .arg("-m")
                    .arg("pip")
                    .arg("install")
                    .arg("chromadb")
                    .output();

                match install_cmd {
                    Ok(output) if output.status.success() => Ok(()),
                    Ok(output) => {
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        Err(format!("安装 chromadb 失败: {}", stderr))
                    }
                    Err(e) => Err(format!("执行 pip install 失败: {}", e)),
                }
            }
        }
    }
}

impl Drop for ChromaServer {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

