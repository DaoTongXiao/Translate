use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use tauri::AppHandle;
use std::path::Path;
use std::fs;
use tauri_plugin_dialog::DialogExt;

// 注册的 API 函数集合
static API_REGISTRY: Lazy<Mutex<HashMap<String, Box<dyn Fn(Value) -> Result<Value, String> + Send + Sync>>>> = 
    Lazy::new(|| Mutex::new(HashMap::new()));

// 注册 API 函数
pub fn register_api<F>(name: &str, handler: F)
where
    F: Fn(Value) -> Result<Value, String> + Send + Sync + 'static,
{
    let mut registry = API_REGISTRY.lock().unwrap();
    registry.insert(name.to_string(), Box::new(handler));
}

// 调用 API 函数
pub fn call_api(name: &str, args: Value) -> Result<Value, String> {
    let registry = API_REGISTRY.lock().unwrap();
    
    if let Some(handler) = registry.get(name) {
        handler(args)
    } else {
        Err(format!("API 函数 '{}' 未注册", name))
    }
}

// 初始化插件 API
pub fn initialize_plugin_api(app_handle: AppHandle) {
    // 在函数开始就克隆 app_handle
    let app_handle_file = app_handle.clone();
    let app_handle_notification = app_handle.clone();
    let app_handle_fs = app_handle.clone();
    
    // 注册文件对话框 API
    register_api("openFileDialog", move |args| {
        let title = args.get("title").and_then(|v| v.as_str()).unwrap_or("选择文件");
        let filters = args.get("filters").and_then(|v| v.as_array()).map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .collect::<Vec<_>>()
        }).unwrap_or_default();
        
        let save_mode = args.get("save").and_then(|v| v.as_bool()).unwrap_or(false);
        
        // 使用 Tauri 的对话框插件
        let app_handle_clone = app_handle_file.clone();
        let (sender, receiver) = std::sync::mpsc::channel();
        
        if save_mode {
            // 保存文件对话框
            let sender_clone = sender.clone();
            let dialog = app_handle_clone.dialog();
            dialog.file()
                .set_title(title)
                .save_file(move |file_path| {
                    let _ = sender_clone.send(file_path);
                });
        } else {
            // 打开文件对话框
            let mut dialog_builder = app_handle_clone.dialog().file();
            
            // 设置标题
            dialog_builder = dialog_builder.set_title(title);
            
            // 设置文件过滤器
            if !filters.is_empty() {
                let extensions: Vec<&str> = filters.iter()
                    .map(|ext| ext.trim_start_matches("."))
                    .collect();
                
                if !extensions.is_empty() {
                    dialog_builder = dialog_builder.add_filter("文件", &extensions);
                }
            }
            
            let sender_clone = sender.clone();
            dialog_builder.pick_file(move |file_path| {
                let _ = sender_clone.send(file_path);
            });
        }
        
        // 等待用户选择文件
        let result = receiver.recv().unwrap_or(None);
        
        match result {
            Some(path) => Ok(Value::String(path.to_string())),
            None => Ok(Value::Null),
        }
    });
    
    // 注册文件夹选择对话框 API
    let app_handle_folder = app_handle.clone();
    register_api("openFolderDialog", move |args| {
        let title = args.get("title").and_then(|v| v.as_str()).unwrap_or("选择文件夹");
        
        // 使用 Tauri 的文件对话框，设置为文件夹选择模式
        let app_handle_clone = app_handle_folder.clone();
        let (sender, receiver) = std::sync::mpsc::channel();
        
        // 创建文件对话框并配置为文件夹选择模式
        let dialog_builder = app_handle_clone.dialog().file();
        
        // 设置标题
        let dialog_builder = dialog_builder.set_title(title);
        
        // 调用pick_folder方法选择文件夹
        let sender_clone = sender.clone();
        dialog_builder.pick_folder(move |folder_path| {
            let _ = sender_clone.send(folder_path);
        });
        
        // 等待用户选择文件夹
        let result = receiver.recv().unwrap_or(None);
        
        match result {
            Some(path) => Ok(Value::String(path.to_string())),
            None => Ok(Value::Null),
        }
    });
    
    // 注册消息通知 API
    register_api("showNotification", move |args| {
        let title = args.get("title").and_then(|v| v.as_str()).unwrap_or("通知");
        let message = args.get("message").and_then(|v| v.as_str()).unwrap_or("");
        
        // 使用 Tauri 的消息对话框 API
        let app_handle_clone = app_handle_notification.clone();
        app_handle_clone.dialog().message(message)
            .title(title)
            .show(|_| {});
        
        Ok(Value::Bool(true))
    });
    
    // 注册文件读取 API
    register_api("readFile", move |args| {
        let file_path = args.get("path").and_then(|v| v.as_str());
        
        if let Some(path) = file_path {
            match fs::read_to_string(path) {
                Ok(content) => Ok(Value::String(content)),
                Err(e) => Err(format!("读取文件失败: {}", e))
            }
        } else {
            Err("未指定文件路径".to_string())
        }
    });
    
    // 注册文件写入 API
    register_api("writeFile", move |args| {
        let file_path = args.get("path").and_then(|v| v.as_str());
        let content = args.get("content").and_then(|v| v.as_str()).unwrap_or("");
        
        if let Some(path) = file_path {
            match fs::write(path, content) {
                Ok(_) => Ok(Value::Bool(true)),
                Err(e) => Err(format!("写入文件失败: {}", e))
            }
        } else {
            Err("未指定文件路径".to_string())
        }
    });
    
    // 注册获取文件信息 API
    register_api("getFileInfo", move |args| {
        let file_path = args.get("path").and_then(|v| v.as_str());
        
        if let Some(path) = file_path {
            let path_obj = Path::new(path);
            if !path_obj.exists() {
                return Err(format!("文件不存在: {}", path));
            }
            
            let metadata = match fs::metadata(path) {
                Ok(meta) => meta,
                Err(e) => return Err(format!("获取文件信息失败: {}", e))
            };
            
            let file_name = path_obj.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
                
            let extension = path_obj.extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_default();
                
            let info = serde_json::json!({
                "name": file_name,
                "path": path,
                "size": metadata.len(),
                "isDirectory": metadata.is_dir(),
                "isFile": metadata.is_file(),
                "extension": extension,
                "lastModified": metadata.modified().ok().map(|t| t.duration_since(std::time::SystemTime::UNIX_EPOCH).unwrap_or_default().as_secs())
            });
            
            Ok(info)
        } else {
            Err("未指定文件路径".to_string())
        }
    });

    // 注册获取剪贴板内容 API
    register_api("getClipboardText", move |_| {
        // 模拟实现，实际应该调用系统剪贴板 API
        Ok(Value::String("模拟剪贴板内容".to_string()))
    });
    
    // 注册设置剪贴板内容 API
    register_api("setClipboardText", move |args| {
        let text = args.get("text").and_then(|v| v.as_str()).unwrap_or("");
        println!("设置剪贴板内容: {}", text);
        
        Ok(Value::Bool(true))
    });
    
    // 注册获取系统信息 API
    register_api("getSystemInfo", move |_| {
        let info = serde_json::json!({
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "version": env!("CARGO_PKG_VERSION"),
            "timestamp": chrono::Local::now().to_rfc3339(),
        });
        
        Ok(info)
    });
}

// 执行插件函数 - 通用的插件执行器
pub fn execute_plugin_function(plugin_id: &str, function_name: &str, args: Value) -> Result<Value, String> {
    // 获取插件信息
    let (plugin_info, _) = crate::plugins::get_plugin(plugin_id)?;
    
    // 构建函数调用代码
    let js_code = format!(
        "const plugin = require('./{}')\
        ;\
        if (typeof plugin.{} !== 'function') {{\
            throw new Error('Function {} not found in plugin');\
        }}\
        return plugin.{}({})",
        plugin_info.main,
        function_name,
        function_name,
        function_name,
        args.to_string()
    );
    
    // 执行插件的 JavaScript 代码
    let result = crate::javascript::execute_plugin_js(js_code, Some(plugin_id.to_string()), None)?;
    
    Ok(result)
}

// 获取插件导出的所有函数
pub fn get_plugin_exports(plugin_id: &str) -> Result<Vec<String>, String> {
    // 获取插件信息
    let (plugin_info, _) = crate::plugins::get_plugin(plugin_id)?;
    
    // 构建代码以获取插件导出的所有函数
    let js_code = format!(
        "const plugin = require('{}');\
        const exports = [];\
        for (const key in plugin) {{\
            if (typeof plugin[key] === 'function') {{\
                exports.push(key);\
            }}\
        }}\
        return exports;",
        plugin_info.main
    );
    
    // 执行 JavaScript 代码
    let result = crate::javascript::execute_plugin_js(js_code, Some(plugin_id.to_string()), None)?;
    
    // 解析结果为字符串数组
    let exports: Vec<String> = serde_json::from_value(result)
        .map_err(|e| format!("解析插件导出失败: {}", e))?;
    
    Ok(exports)
}

// 插件调用 API 的命令
#[tauri::command]
pub fn plugin_call_api(plugin_id: String, api_name: String, args: Value) -> Result<Value, String> {
    // 特殊处理：当plugin_id为"system"时，不检查插件是否存在
    // 这允许直接调用系统API而不需要特定插件
    if plugin_id != "system" {
        // 检查插件是否存在
        crate::plugins::get_plugin(&plugin_id).map_err(|e| format!("插件调用API失败: {}", e))?;
    }
    
    // 调用 API
    call_api(&api_name, args)
}

#[tauri::command]
pub fn plugin_execute_function(plugin_id: String, function_name: String, args: Value) -> Result<Value, String> {
    execute_plugin_function(&plugin_id, &function_name, args)
}

// 获取插件导出函数的命令
#[tauri::command]
pub fn plugin_get_exports(plugin_id: String) -> Result<Vec<String>, String> {
    get_plugin_exports(&plugin_id)
}

// 列出所有可用的 API 函数
#[tauri::command]
pub fn list_available_apis() -> Vec<String> {
    let registry = API_REGISTRY.lock().unwrap();
    registry.keys().cloned().collect()
}
