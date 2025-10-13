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
    // 新增字段：是否需要文件选择
    #[serde(rename = "requiresFileSelection")]
    pub requires_file_selection: Option<bool>,
    // 文件过滤器
    #[serde(rename = "fileFilters")]
    pub file_filters: Option<Vec<String>>,
    // 新增字段：是否需要选择输出文件
    #[serde(rename = "requiresOutputFileSelection")]
    pub requires_output_file_selection: Option<bool>,
    // 输出文件过滤器
    #[serde(rename = "outputFileFilters")]
    pub output_file_filters: Option<Vec<String>>,
    // 默认输出文件名
    #[serde(rename = "defaultOutputFileName")]
    pub default_output_file_name: Option<String>,
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
    // 将插件状态设置为已加载
    let status = PluginStatus {
        loaded: true, // 修改为 true，因为我们认为插件已经成功加载
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
    
    // 准备直接实现的基本 API函数实现
    let node_api_functions = format!(
        r#"
        // 这里实现常用的Node.js API函数
        const fs = require('fs');
        const path = require('path');
        
        // 实现基本的API函数
        const nodeApiImpl = {{
            // 读取文件API
            readFile: function(args) {{
                try {{
                    if (!args || !args.path) throw new Error('未指定文件路径');
                    console.log('直接读取文件:', args.path);
                    return fs.readFileSync(args.path, args.encoding || 'utf8');
                }} catch (err) {{
                    console.error('读取文件失败:', err.message);
                    throw new Error(`读取文件失败: ${{err.message}}`);
                }}
            }},
            
            // 写入文件API
            writeFile: function(args) {{
                try {{
                    if (!args || !args.path) throw new Error('未指定文件路径');
                    if (args.content === undefined) throw new Error('未指定文件内容');
                    
                    // 规范化路径
                    const filePath = path.normalize(args.path);
                    console.log('写入文件路径:', filePath);
                    console.log('内容长度:', args.content.length);
                    
                    // 创建父目录
                    try {{
                        const dirPath = path.dirname(filePath);
                        if (!fs.existsSync(dirPath)) {{
                            console.log('创建目录:', dirPath);
                            fs.mkdirSync(dirPath, {{ recursive: true }});
                        }}
                    }} catch (dirErr) {{
                        console.error('创建目录失败:', dirErr);
                        // 继续尝试写入
                    }}
                    
                    // 添加.txt扩展名如果没有扩展名
                    let targetPath = filePath;
                    if (!path.extname(filePath)) {{
                        targetPath = `${{filePath}}.txt`;
                        console.log('添加.txt扩展名:', targetPath);
                    }}
                    
                    // 写入文件
                    fs.writeFileSync(targetPath, args.content);
                    
                    // 验证文件是否被成功创建
                    if (fs.existsSync(targetPath)) {{
                        const stats = fs.statSync(targetPath);
                        console.log('文件写入成功:', targetPath, '大小:', stats.size);
                        
                        return {{
                            success: true,
                            outputPath: targetPath,
                            size: stats.size
                        }};
                    }} else {{
                        throw new Error(`写入操作没有报错，但文件不存在: ${{targetPath}}`);
                    }}
                }} catch (err) {{
                    console.error('写入文件失败:', err);
                    
                    // 尝试备用路径
                    try {{
                        const userHome = process.env.USERPROFILE || process.env.HOME;
                        const backupPath = path.join(userHome, 'plugin_output.txt');
                        console.log('尝试备用路径:', backupPath);
                        
                        fs.writeFileSync(backupPath, args.content);
                        
                        if (fs.existsSync(backupPath)) {{
                            console.log('备用路径写入成功:', backupPath);
                            return {{
                                success: true,
                                outputPath: backupPath,
                                size: fs.statSync(backupPath).size,
                                message: '原始路径失败，使用备用路径'
                            }};
                        }}
                    }} catch (backupErr) {{
                        console.error('备用路径也失败:', backupErr);
                    }}
                    
                    throw new Error(`写入文件失败: ${{err.message}}`);
                }}
            }},
        }};
        "#
    );
    
    // 创建执行代码，包含原生读写文件API和插件执行逻辑
    let code = format!(
        r#"
        try {{
            {}
            
            // 定义插件API桥接函数
            global.appApi = {{
                callApi: function(apiName, apiArgs) {{
                    console.log('调用API:', apiName, '参数:', JSON.stringify(apiArgs));
                    
                    // 先检查是否有原生实现
                    if (apiName === 'readFile' || apiName === 'writeFile') {{
                        try {{
                            console.log('使用原生实现调用:', apiName);
                            const result = nodeApiImpl[apiName](apiArgs);
                            console.log('原生调用结果:', typeof result === 'string' ? `字符串(长度${{result.length}})` : result);
                            return result;
                        }} catch (err) {{
                            console.error('原生调用失败:', err);
                            return {{ success: false, error: err.message }};
                        }}
                    }}
                    
                    // 检查环境变量中的API结果
                    try {{
                        // 先检查是否有临时文件存储API结果
                        const resultFilePath = process.env.APP_API_RESULT_FILE;
                        if (resultFilePath) {{
                            console.log('从临时文件读取API结果:', resultFilePath);
                            try {{
                                const fileContent = fs.readFileSync(resultFilePath, 'utf8');
                                const parsedResult = JSON.parse(fileContent);
                                console.log('从文件读取的API结果类型:', typeof parsedResult);
                                return parsedResult;
                            }} catch (fileErr) {{
                                console.error('从文件读取API结果失败:', fileErr);
                            }}
                        }}
                        
                        // 回退到环境变量
                        const apiResult = process.env.APP_API_RESULT;
                        if (apiResult) {{
                            try {{
                                const parsedResult = JSON.parse(apiResult);
                                return parsedResult;
                            }} catch (jsonErr) {{
                                console.error('API结果解析失败:', jsonErr);
                                return {{ success: false, error: 'API结果解析失败' }};
                            }}
                        }}
                    }} catch (err) {{
                        console.error('获取API结果失败:', err);
                    }}
                    
                    // 如果所有方法都失败，返回默认空对象
                    console.log('未找到API结果或未实现的API:', apiName);
                    return {{ success: false, error: '未找到API结果或API调用失败' }};
                }}
            }};
            
            // 加载插件
            const plugin = require('{}');
            if (typeof plugin.{} !== 'function') {{
                throw new Error('方法 {} 不存在或不是函数');
            }}
            
            // 执行插件方法
            const result = plugin.{}({});
            
            // 检查结果类型
            if (result && typeof result === 'object' && 'success' in result) {{
                // 如果结果已经包含 success 字段，直接使用
                console.log('插件返回了标准格式结果:', JSON.stringify(result));
                console.log(JSON.stringify(result));
            }} else {{
                // 否则包装成标准格式
                console.log('将插件结果包装为标准格式:', JSON.stringify(result));
                console.log(JSON.stringify({{ success: true, result }}));
            }}
        }} catch (error) {{
            console.log(JSON.stringify({{ success: false, error: error.toString() }}));
        }}
        "#,
        node_api_functions,
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
