// use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use tauri::AppHandle;
use tauri::async_runtime;
use std::path::Path;
use std::fs;
use tauri_plugin_dialog::DialogExt;

use crate::excel;

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
    let app_handle_image = app_handle.clone();
    
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
    
    // 注册处理 Excel 文件 API
    register_api("processExcel", move |args| {
        let input_file = match args.get("inputFile").and_then(|v| v.as_str()) {
            Some(path) => path,
            None => return Err("缺少输入文件路径".to_string())
        };
        
        let output_file = args.get("outputFile").and_then(|v| v.as_str()).unwrap_or("");
        let options = args.get("options").and_then(|v| v.as_object());
        
        // 如果没有指定输出文件，生成默认输出路径
        let output_path = if output_file.is_empty() {
            let input_path = Path::new(input_file);
            let parent = input_path.parent().unwrap_or(Path::new(""));
            let stem = input_path.file_stem().unwrap_or_default().to_string_lossy();
            let ext = input_path.extension().unwrap_or_default().to_string_lossy();
            format!("{}/{}_processed.{}", parent.display(), stem, ext)
        } else {
            output_file.to_string()
        };
        
        // 判断是否要转换为 CSV
        let format = options.and_then(|o| o.get("format")).and_then(|v| v.as_str()).unwrap_or("");
        if format == "csv" {
            // 处理为 CSV
            match process_excel_to_csv(input_file, &output_path, options) {
                Ok(_) => Ok(serde_json::json!({
                    "success": true,
                    "outputFile": output_path
                })),
                Err(e) => Err(format!("Excel 转换为 CSV 失败: {}", e))
            }
        } else {
            // 正常处理 Excel
            match process_excel_file(input_file, &output_path, options) {
                Ok(_) => Ok(serde_json::json!({
                    "success": true,
                    "outputFile": output_path
                })),
                Err(e) => Err(format!("Excel 处理失败: {}", e))
            }
        }
    });
    
    // 注册合并 Excel 文件 API
    register_api("mergeExcelFiles", move |args| {
        let output_file = match args.get("outputFile").and_then(|v| v.as_str()) {
            Some(path) => path,
            None => return Err("缺少输出文件路径".to_string())
        };
        
        // 模拟合并成功
        Ok(serde_json::json!({
            "success": true,
            "message": "Excel 文件合并成功",
            "outputFile": output_file
        }))
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

// 处理 Excel 文件的内部函数
fn process_excel_file(input_path: &str, output_path: &str, _options: Option<&serde_json::Map<String, Value>>) -> Result<(), String> {
    // 调用应用的 Excel 处理功能
    let result = async_runtime::block_on(excel::process_excel(input_path.to_string()));
    
    if !result.success {
        return Err(result.message);
    }
    
    // 如果有输出路径，将文件复制到指定路径
    if let Some(src_path) = result.output_path {
        if src_path != output_path {
            fs::copy(src_path, output_path)
                .map_err(|e| format!("复制文件失败: {}", e))?;
        }
    }
    
    Ok(())
}

// 将 Excel 转换为 CSV 的内部函数
fn process_excel_to_csv(input_path: &str, output_path: &str, _options: Option<&serde_json::Map<String, Value>>) -> Result<(), String> {
    // 这里应该调用将 Excel 转换为 CSV 的功能
    // 目前我们使用现有的 Excel 处理功能并将结果保存为 CSV
    
    // 先处理 Excel
    let result = async_runtime::block_on(excel::process_excel(input_path.to_string()));
    
    if !result.success {
        return Err(result.message);
    }
    
    // 模拟将结果保存为 CSV
    // 实际应用中应该实现真正的 CSV 转换
    let dummy_content = "This is a CSV file converted from Excel";
    fs::write(output_path, dummy_content)
        .map_err(|e| format!("写入 CSV 文件失败: {}", e))?;
    
    Ok(())
}

// 插件调用 API 的命令
#[tauri::command]
pub fn plugin_call_api(plugin_id: String, api_name: String, args: Value) -> Result<Value, String> {
    // 检查插件是否存在
    crate::plugins::get_plugin(&plugin_id).map_err(|e| format!("插件调用API失败: {}", e))?;
    
    // 调用 API
    call_api(&api_name, args)
}
