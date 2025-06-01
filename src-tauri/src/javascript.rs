use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use temp_dir::TempDir;
use tauri::AppHandle;

// 用于存储 JavaScript 执行结果的结构
#[derive(Debug, Serialize, Deserialize)]
pub struct JsResult {
    success: bool,
    result: Value,
    error: Option<String>,
}

// 全局临时目录
static TEMP_DIR: Lazy<Mutex<Option<TempDir>>> = Lazy::new(|| Mutex::new(None));

// 初始化 JavaScript 环境
pub fn initialize_js() {
    // 创建临时目录
    match TempDir::new() {
        Ok(dir) => {
            let mut temp_dir = TEMP_DIR.lock().unwrap();
            *temp_dir = Some(dir);
            println!("JavaScript 环境初始化成功");
        },
        Err(e) => {
            eprintln!("创建临时目录失败: {}", e);
        }
    }
}

// 执行 JavaScript 代码
#[tauri::command]
pub fn execute_js(code: String) -> JsResult {
    // 获取系统 Node.js 路径
    let node_path = match find_nodejs() {
        Some(path) => path,
        None => {
            return JsResult {
                success: false,
                result: Value::Null,
                error: Some("找不到 Node.js 执行环境".to_string()),
            };
        }
    };
    
    // 获取临时目录
    let temp_dir = match TEMP_DIR.lock().unwrap().as_ref() {
        Some(dir) => dir.path().to_path_buf(),
        None => {
            // 如果临时目录不存在，尝试重新创建
            match TempDir::new() {
                Ok(dir) => {
                    let mut temp_dir_guard = TEMP_DIR.lock().unwrap();
                    *temp_dir_guard = Some(dir);
                    temp_dir_guard.as_ref().unwrap().path().to_path_buf()
                },
                Err(e) => {
                    return JsResult {
                        success: false,
                        result: Value::Null,
                        error: Some(format!("创建临时目录失败: {}", e)),
                    };
                }
            }
        }
    };
    
    let js_file = temp_dir.join("script.js");
    
    // 写入 JavaScript 代码到文件
    let wrapper_code = format!(r#"try {{
  const result = (function() {{ 
    {};
  }})();
  console.log(JSON.stringify({{ success: true, result }}));
}} catch (error) {{
  console.log(JSON.stringify({{ success: false, error: error.toString() }}));
}}
"#, code);
    
    if let Err(e) = fs::write(&js_file, wrapper_code) {
        return JsResult {
            success: false,
            result: Value::Null,
            error: Some(format!("写入临时 JS 文件失败: {}", e)),
        };
    }
    
    // 执行 Node.js 脚本
    let output = match Command::new(&node_path)
        .arg(&js_file)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output() {
        Ok(output) => output,
        Err(e) => {
            return JsResult {
                success: false,
                result: Value::Null,
                error: Some(format!("执行 Node.js 失败: {}", e)),
            };
        }
    };
    
    // 解析输出
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    if !output.status.success() {
        return JsResult {
            success: false,
            result: Value::Null,
            error: Some(format!("Node.js 执行错误: {}", stderr)),
        };
    }
    
    // 尝试解析 JSON 输出
    match serde_json::from_str::<JsResult>(&stdout) {
        Ok(result) => result,
        Err(_) => {
            // 如果无法解析为 JSON，则返回原始输出
            if !stderr.is_empty() {
                JsResult {
                    success: false,
                    result: Value::Null,
                    error: Some(stderr),
                }
            } else {
                JsResult {
                    success: true,
                    result: Value::String(stdout),
                    error: None,
                }
            }
        }
    }
}

// 查找系统中的 Node.js 路径
fn find_nodejs() -> Option<PathBuf> {
    // 尝试在 PATH 中查找 node.exe
    if let Ok(output) = Command::new("where")
        .arg("node.exe")
        .output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout);
            let path = path_str.lines().next()?.trim();
            return Some(PathBuf::from(path));
        }
    }
    
    // 尝试在常见安装位置查找
    let common_locations = [
        "C:\\Program Files\\nodejs\\node.exe",
        "C:\\Program Files (x86)\\nodejs\\node.exe",
    ];
    
    for &location in &common_locations {
        let path = PathBuf::from(location);
        if path.exists() {
            return Some(path);
        }
    }
    
    None
}


