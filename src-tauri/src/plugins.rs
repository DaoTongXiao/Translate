use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use once_cell::sync::Lazy;
// use tauri::AppHandle;

use crate::plugin_api;

// 插件信息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub name: String,
    pub id: String,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    pub version: String,
    pub description: String,
    pub main: String,
    pub author: Option<String>,
}

// 插件状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginStatus {
    pub loaded: bool,
    pub error: Option<String>,
}

// 插件注册表
static PLUGINS: Lazy<Mutex<HashMap<String, (PluginInfo, PluginStatus)>>> = 
    Lazy::new(|| Mutex::new(HashMap::new()));

// 插件目录
static PLUGIN_DIR: Lazy<Mutex<Option<PathBuf>>> = Lazy::new(|| Mutex::new(None));

// 初始化插件系统
pub fn initialize_plugins(app_dir: &Path) -> Result<(), String> {
    // 创建插件目录
    let plugins_dir = app_dir.join("plugins");
    if !plugins_dir.exists() {
        fs::create_dir_all(&plugins_dir)
            .map_err(|e| format!("创建插件目录失败: {}", e))?;
    }
    
    // 保存插件目录路径
    let mut plugin_dir = PLUGIN_DIR.lock().unwrap();
    *plugin_dir = Some(plugins_dir.clone());
    
    // 扫描并加载插件
    scan_plugins(&plugins_dir)?;
    
    Ok(())
}

// 扫描插件目录
fn scan_plugins(plugins_dir: &Path) -> Result<(), String> {
    // 读取插件目录
    let entries = fs::read_dir(plugins_dir)
        .map_err(|e| format!("读取插件目录失败: {}", e))?;
    
    // 遍历目录中的所有项
    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        
        // 检查是否是目录
        if path.is_dir() {
            // 检查是否存在 package.json
            let package_json = path.join("package.json");
            if package_json.exists() {
                // 读取 package.json
                let content = fs::read_to_string(&package_json)
                    .map_err(|e| format!("读取 package.json 失败: {}", e))?;
                
                // 解析 package.json
                let mut plugin_info: PluginInfo = serde_json::from_str(&content)
                    .map_err(|e| format!("解析 package.json 失败: {}", e))?;
                
                // 检查必要字段
                if plugin_info.name.is_empty() || plugin_info.main.is_empty() {
                    continue;
                }
                
                // 如果没有指定 id，使用 name 作为 id
                if plugin_info.id.is_empty() {
                    plugin_info.id = plugin_info.name.clone();
                }
                
                // 注册插件
                register_plugin(plugin_info, path);
            }
        }
    }
    
    Ok(())
}

// 注册插件
fn register_plugin(info: PluginInfo, path: PathBuf) {
    let plugin_id = info.id.clone();
    let status = PluginStatus {
        loaded: false,
        error: None,
    };
    
    // 添加到插件注册表
    let mut plugins = PLUGINS.lock().unwrap();
    plugins.insert(plugin_id, (info, status));
    
    println!("已注册插件: {:?}", path);
}

// 获取所有插件信息
#[tauri::command]
pub fn get_plugins() -> Vec<(PluginInfo, PluginStatus)> {
    let plugins = PLUGINS.lock().unwrap();
    plugins.iter().map(|(_, v)| (v.0.clone(), v.1.clone())).collect()
}

// 获取单个插件信息
pub fn get_plugin(plugin_id: &str) -> Result<(PluginInfo, PluginStatus), String> {
    let plugins = PLUGINS.lock().unwrap();
    if let Some(plugin) = plugins.get(plugin_id) {
        Ok((plugin.0.clone(), plugin.1.clone()))
    } else {
        Err(format!("插件 {} 不存在", plugin_id))
    }
}

// 插件调用 API
#[tauri::command]
pub fn plugin_api_call(plugin_id: String, api_name: String, args: Value) -> Result<Value, String> {
    // 检查插件是否存在
    let plugins = PLUGINS.lock().unwrap();
    if !plugins.contains_key(&plugin_id) {
        return Err(format!("插件 {} 不存在", plugin_id));
    }
    
    // 调用 API
    println!("插件 {} 调用 API: {}", plugin_id, api_name);
    plugin_api::call_api(&api_name, args)
}

// 执行插件方法
#[tauri::command]
pub fn execute_plugin_method(plugin_id: String, method: String, args: Value) -> Result<Value, String> {
    // 获取插件信息
    let plugins = PLUGINS.lock().unwrap();
    let (info, _) = plugins.get(&plugin_id)
        .ok_or_else(|| format!("插件 {} 不存在", plugin_id))?;
    
    // 获取插件目录
    let plugin_dir_guard = PLUGIN_DIR.lock().unwrap();
    let plugin_dir = plugin_dir_guard.as_ref()
        .ok_or_else(|| "插件系统未初始化".to_string())?;
    
    // 构建插件路径
    let plugin_path = plugin_dir.join(&plugin_id);
    let main_file = plugin_path.join(&info.main);
    
    if !main_file.exists() {
        return Err(format!("插件主文件不存在: {:?}", main_file));
    }
    
    // 创建执行代码，包含 API 桥接
    let code = format!(
        r#"
        try {{
            // 定义 API 桥接函数
            global.appApi = {{
                callApi: function(apiName, apiArgs) {{
                    return JSON.parse(process.env.APP_API_RESULT || '{{}}');
                }}
            }};
            
            // 加载插件
            const plugin = require('{}');
            if (typeof plugin.{} !== 'function') {{
                throw new Error('方法 {} 不存在或不是函数');
            }}
            
            // 执行插件方法
            const result = plugin.{}({});
            console.log(JSON.stringify({{ success: true, result }}));
        }} catch (error) {{
            console.log(JSON.stringify({{ success: false, error: error.toString() }}));
        }}
        "#,
        main_file.to_string_lossy().replace('\\', "\\\\"),
        method,
        method,
        method,
        args.to_string()
    );
    
    // 检查是否是 API 相关方法
    if method.starts_with("appApi_") {
        // 从方法名中提取 API 名称
        let api_name = method.trim_start_matches("appApi_");
        
        // 直接调用 API
        return plugin_api::call_api(api_name, args);
    }
    
    // 执行插件代码
    let result = crate::javascript::execute_plugin_js(code, None, None)?;
    
    Ok(result)
}

// 安装插件
#[tauri::command]
pub fn install_plugin(plugin_path: String) -> Result<PluginInfo, String> {
    // 获取插件目录
    let plugin_dir_guard = PLUGIN_DIR.lock().unwrap();
    let plugin_dir = plugin_dir_guard.as_ref()
        .ok_or_else(|| "插件系统未初始化".to_string())?;
    
    // 检查插件路径是否存在
    let path = PathBuf::from(plugin_path);
    if !path.exists() {
        return Err("插件路径不存在".to_string());
    }
    
    // 读取 package.json
    let package_json = path.join("package.json");
    if !package_json.exists() {
        return Err("插件缺少 package.json".to_string());
    }
    
    // 解析 package.json
    let content = fs::read_to_string(&package_json)
        .map_err(|e| format!("读取 package.json 失败: {}", e))?;
    
    let mut plugin_info: PluginInfo = serde_json::from_str(&content)
        .map_err(|e| format!("解析 package.json 失败: {}", e))?;
    
    // 检查必要字段
    if plugin_info.name.is_empty() || plugin_info.main.is_empty() {
        return Err("插件名称或主文件未指定".to_string());
    }
    
    // 如果没有指定 id，使用 name 作为 id
    if plugin_info.id.is_empty() {
        plugin_info.id = plugin_info.name.clone();
    }
    
    // 检查插件是否已存在
    {
        let plugins = PLUGINS.lock().unwrap();
        if plugins.contains_key(&plugin_info.id) {
            return Err(format!("插件 {} 已存在", plugin_info.id));
        }
    }
    
    // 复制插件到插件目录
    let target_dir = plugin_dir.join(&plugin_info.id);
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir)
            .map_err(|e| format!("删除现有插件目录失败: {}", e))?;
    }
    
    // 创建目标目录
    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("创建插件目录失败: {}", e))?;
    
    // 复制文件
    copy_dir_all(&path, &target_dir)
        .map_err(|e| format!("复制插件文件失败: {}", e))?;
    
    // 注册插件
    register_plugin(plugin_info.clone(), target_dir);
    
    Ok(plugin_info)
}

// 卸载插件
#[tauri::command]
pub fn uninstall_plugin(plugin_id: String) -> Result<(), String> {
    // 获取插件目录
    let plugin_dir_guard = PLUGIN_DIR.lock().unwrap();
    let plugin_dir = plugin_dir_guard.as_ref()
        .ok_or_else(|| "插件系统未初始化".to_string())?;
    
    // 检查插件是否存在
    {
        let mut plugins = PLUGINS.lock().unwrap();
        if !plugins.contains_key(&plugin_id) {
            return Err(format!("插件 {} 不存在", plugin_id));
        }
        
        // 从注册表中移除
        plugins.remove(&plugin_id);
    }
    
    // 删除插件目录
    let target_dir = plugin_dir.join(&plugin_id);
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir)
            .map_err(|e| format!("删除插件目录失败: {}", e))?;
    }
    
    Ok(())
}

// 递归复制目录
fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        
        if ty.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    
    Ok(())
}
