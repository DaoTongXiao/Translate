use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::collections::HashMap;
use once_cell::sync::Lazy;
use temp_dir::TempDir;
// use tauri::AppHandle;

use crate::plugin_api;

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

// 内部函数，执行 JavaScript 代码
pub fn execute_plugin_js(code: String, api_name: Option<String>, api_args: Option<Value>) -> Result<Value, String> {
    // 获取系统 Node.js 路径
    let node_path = match find_nodejs() {
        Some(path) => path,
        None => {
            return Err("找不到 Node.js 执行环境".to_string());
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
                    return Err(format!("创建临时目录失败: {}", e));
                }
            }
        }
    };
    
    let js_file = temp_dir.join("script.js");
    
    // 写入 JavaScript 代码到文件
    if let Err(e) = fs::write(&js_file, code) {
        return Err(format!("写入临时 JS 文件失败: {}", e));
    }
    
    // 创建环境变量，用于 API 调用
    let mut env_vars = HashMap::new();
    
    // 如果有 API 调用，处理 API 结果
    if let (Some(name), Some(args)) = (api_name, api_args.clone()) {
        println!("API调用: {} 参数: {:?}", name, args);
        
        // 为文件操作API提供额外的日志
        if name == "writeFile" {
            if let Some(obj) = args.as_object() {
                if let Some(path) = obj.get("path").and_then(|p| p.as_str()) {
                    println!("尝试写入文件路径: {}", path);
                }
                if let Some(content) = obj.get("content").and_then(|c| c.as_str()) {
                    println!("写入内容长度: {}", content.len());
                }
            }
        }
        
        // 调用 API 并获取结果
        match plugin_api::call_api(&name, args) {
            Ok(result) => {
                // 为API结果提供更多日志
                println!("API调用成功: {} 结果类型: {:?}", name, result);
                
                // 将 API 结果序列化为 JSON 字符串并设置为环境变量
                // 对于大型结果，考虑写入临时文件而不是环境变量
                if let Ok(result_json) = serde_json::to_string(&result) {
                    if result_json.len() > 1024 {
                        // 对于大型结果，写入临时文件
                        let result_file = temp_dir.join("api_result.json");
                        if let Err(e) = fs::write(&result_file, &result_json) {
                            println!("写入API结果到临时文件失败: {}", e);
                        } else {
                            println!("API结果已写入临时文件: {:?}", result_file);
                            env_vars.insert("APP_API_RESULT_FILE".to_string(), result_file.to_string_lossy().to_string());
                        }
                    }
                    
                    // 无论如何都设置环境变量，作为备份方式
                    env_vars.insert("APP_API_RESULT".to_string(), result_json);
                } else {
                    println!("API结果序列化失败");
                    env_vars.insert("APP_API_RESULT".to_string(), "{\"error\":\"API 结果序列化失败\"}".to_string());
                }
            },
            Err(e) => {
                // API 调用失败，返回错误信息
                println!("API调用失败: {} - {}", name, e);
                env_vars.insert("APP_API_RESULT".to_string(), 
                    format!("{{\"error\":\"API 调用失败: {}\"}}", e));
            }
        }
    } else {
        // 没有 API 调用，设置空结果
        env_vars.insert("APP_API_RESULT".to_string(), "{}".to_string());
    }
    
    // 执行 Node.js 脚本
    let output = match Command::new(&node_path)
        .arg(&js_file)
        .envs(&env_vars)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output() {
        Ok(output) => output,
        Err(e) => {
            return Err(format!("执行 Node.js 失败: {}", e));
        }
    };
    
    // 解析输出
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    
    if !output.status.success() {
        return Err(format!("Node.js 执行错误: {}", stderr));
    }
    
    println!("Node.js 输出: {}", stdout);
    println!("stderr: {}", stderr);
    
    // 尝试解析 JSON 输出
    let result: serde_json::Result<serde_json::Value> = serde_json::from_str(&stdout);
    match result {
        Ok(value) => {
            println!("JSON 解析成功: {}", value);
            
            // 如果是已格式化的结果，用于插件方法调用
            if let Some(obj) = value.as_object() {
                if let Some(success) = obj.get("success") {
                    println!("JSON包含 success 字段: {}", success);
                    
                    // 返回已格式化的完整结果，而非仅result字段
                    // 这是为了确保插件返回的其他元数据字段也被保留
                    return Ok(value);
                }
            }
            
            // 如果不是标准格式，则直接返回原始值
            Ok(value)
        },
        Err(_) => {
            // 如果无法解析为 JSON，则返回原始输出
            if !stderr.is_empty() {
                Err(stderr)
            } else {
                Ok(Value::String(stdout))
            }
        }
    }
}

// 执行 JavaScript 代码
#[tauri::command]
pub fn execute_js(code: String) -> JsResult {
    // 将用户代码包装在函数中执行
    let wrapper_code = format!(r#"try {{
  const result = (function() {{ 
    {};
  }})();
  console.log(JSON.stringify({{ success: true, result }}));
}} catch (error) {{
  console.log(JSON.stringify({{ success: false, error: error.toString() }}));
}}
"#, code);
    
    // 使用内部函数执行
    match execute_plugin_js(wrapper_code, None, None) {
        Ok(result) => JsResult {
            success: true,
            result,
            error: None,
        },
        Err(err) => JsResult {
            success: false,
            result: Value::Null,
            error: Some(err),
        },
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


