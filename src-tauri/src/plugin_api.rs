// use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use tauri::AppHandle;

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
pub fn initialize_plugin_api(_app_handle: AppHandle) {
    // 注册文件对话框 API
    register_api("openFileDialog", move |args| {
        let title = args.get("title").and_then(|v| v.as_str()).unwrap_or("选择文件");
        let _filters = args.get("filters").and_then(|v| v.as_array()).map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .collect::<Vec<_>>()
        }).unwrap_or_default();
        
        // 这里实际上应该调用 Tauri 的文件对话框 API
        // 但为了简化示例，我们返回一个模拟结果
        Ok(Value::String(format!("模拟文件路径: {}", title)))
    });
    
    // 注册消息通知 API
    register_api("showNotification", move |args| {
        let title = args.get("title").and_then(|v| v.as_str()).unwrap_or("通知");
        let message = args.get("message").and_then(|v| v.as_str()).unwrap_or("");
        
        println!("通知: {} - {}", title, message);
        
        Ok(Value::Bool(true))
    });
    
    // 注册图片转换 API
    register_api("convertImage", move |args| {
        let source_path = args.get("sourcePath").and_then(|v| v.as_str()).unwrap_or("");
        let target_format = args.get("targetFormat").and_then(|v| v.as_str()).unwrap_or("png");
        
        println!("转换图片: {} -> {}", source_path, target_format);
        
        Ok(Value::String(format!("{}.{}", source_path, target_format)))
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
}

// 插件调用 API 的命令
#[tauri::command]
pub fn plugin_call_api(plugin_id: String, api_name: String, args: Value) -> Result<Value, String> {
    println!("插件 {} 调用 API: {}", plugin_id, api_name);
    call_api(&api_name, args)
}
