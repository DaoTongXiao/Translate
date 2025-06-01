mod excel;
pub mod image_converter;
pub mod javascript;
pub mod plugin_api;
pub mod plugins;

use excel::process_excel;
use image_converter::convert_to_ico;
use javascript::{execute_js, initialize_js};
use plugin_api::plugin_call_api;
use plugins::{initialize_plugins, get_plugins, execute_plugin_method, install_plugin, uninstall_plugin, plugin_api_call};
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Emitter};
use tauri::menu::{MenuBuilder, MenuEvent, SubmenuBuilder, MenuItemBuilder};

// 打开文件函数
#[tauri::command]
fn open_file(path: String) {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .expect("打开文件失败");
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .args(["--reveal", &path])
            .spawn()
            .expect("打开文件失败");
    }
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        if let Some(parent) = PathBuf::from(&path).parent() {
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .expect("打开文件失败");
        }
    }
}

// 创建菜单
fn create_menu(app: &tauri::App) -> tauri::Result<()> {
    // 创建新建菜单项（带快捷键 Ctrl+N）
    let new_item = MenuItemBuilder::new("新建")
        .id("new")
        .accelerator("CommandOrControl+N")
        .build(app)?;
        
    // 创建打开菜单项（带快捷键 Ctrl+O）
    let open_item = MenuItemBuilder::new("打开")
        .id("open")
        .accelerator("CommandOrControl+O")
        .build(app)?;
        
    // 创建保存菜单项（带快捷键 Ctrl+S）
    let save_item = MenuItemBuilder::new("保存")
        .id("save")
        .accelerator("CommandOrControl+S")
        .build(app)?;
        
    // 创建退出菜单项（带快捷键 Alt+F4）
    let exit_item = MenuItemBuilder::new("退出")
        .id("exit")
        .accelerator("Alt+F4")
        .build(app)?;

    // 创建文件子菜单
    let file_menu = SubmenuBuilder::new(app, "文件")
        .item(&new_item)
        .item(&open_item)
        .item(&save_item)
        .separator()
        .item(&exit_item)
        .build()?;

    // 创建撤销菜单项（带快捷键 Ctrl+Z）
    let undo_item = MenuItemBuilder::new("撤销")
        .id("undo")
        .accelerator("CommandOrControl+Z")
        .build(app)?;
        
    // 创建重做菜单项（带快捷键 Ctrl+Y）
    let redo_item = MenuItemBuilder::new("重做")
        .id("redo")
        .accelerator("CommandOrControl+Y")
        .build(app)?;
        
    // 创建剪切菜单项（带快捷键 Ctrl+X）
    let cut_item = MenuItemBuilder::new("剪切")
        .id("cut")
        .accelerator("CommandOrControl+X")
        .build(app)?;
        
    // 创建复制菜单项（带快捷键 Ctrl+C）
    let copy_item = MenuItemBuilder::new("复制")
        .id("copy")
        .accelerator("CommandOrControl+C")
        .build(app)?;
        
    // 创建粘贴菜单项（带快捷键 Ctrl+V）
    let paste_item = MenuItemBuilder::new("粘贴")
        .id("paste")
        .accelerator("CommandOrControl+V")
        .build(app)?;

    // 创建编辑子菜单
    let edit_menu = SubmenuBuilder::new(app, "编辑")
        .item(&undo_item)
        .item(&redo_item)
        .separator()
        .item(&cut_item)
        .item(&copy_item)
        .item(&paste_item)
        .build()?;

    // 创建图片转换菜单项
    let image_converter_item = MenuItemBuilder::new("图片转换")
        .id("image_converter")
        .accelerator("CommandOrControl+I")
        .build(app)?;
        
    // 创建Excel处理菜单项
    let excel_processor_item = MenuItemBuilder::new("Excel处理")
        .id("excel_processor")
        .accelerator("CommandOrControl+E")
        .build(app)?;

    // 创建 JavaScript 执行菜单项
    let js_executor_item = MenuItemBuilder::new("执行JavaScript")
        .id("js_executor")
        .accelerator("CommandOrControl+J")
        .build(app)?;

    // 创建工具子菜单
    let tools_menu = SubmenuBuilder::new(app, "工具")
        .item(&image_converter_item)
        .item(&excel_processor_item)
        .item(&js_executor_item)
        .build()?;

    // 创建关于菜单项
    let about_item = MenuItemBuilder::new("关于")
        .id("about")
        .accelerator("F1")
        .build(app)?;

    // 创建帮助子菜单
    let help_menu = SubmenuBuilder::new(app, "帮助")
        .item(&about_item)
        .build()?;

    // 创建主菜单并添加子菜单
    let menu = MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &tools_menu, &help_menu])
        .build()?;

    // 设置菜单
    app.set_menu(menu)?;
    
    Ok(())
}

// 处理菜单事件
fn handle_menu_event(app: &AppHandle, event: MenuEvent) {
    // 使用 MenuId 的 0 字段获取字符串值
    match event.id().0.as_str() {
        "new" => println!("新建文件"),
        "open" => println!("打开文件"),
        "save" => println!("保存文件"),
        "exit" => {
            if let Some(window) = app.get_webview_window("main") {
                window.close().unwrap();
            }
        }
        "image_converter" => {
            if let Some(window) = app.get_webview_window("main") {
                window.emit("switch-tool", "image").unwrap();
            }
        }
        "excel_processor" => {
            if let Some(window) = app.get_webview_window("main") {
                window.emit("switch-tool", "excel").unwrap();
            }
        }
        "js_executor" => {
            if let Some(window) = app.get_webview_window("main") {
                window.emit("switch-tool", "javascript").unwrap();
            }
        }
        "about" => println!("关于"),
        _ => {}
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化 JavaScript 环境
    initialize_js();
    
    // 初始化应用
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 创建菜单
            create_menu(app)?;
            
            // 初始化插件系统
            let app_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
            if let Err(e) = initialize_plugins(&app_dir) {
                eprintln!("初始化插件系统失败: {}", e);
            }
            
            // 初始化插件 API
            plugin_api::initialize_plugin_api(app.handle().clone());
            
            Ok(())
        })
        .on_menu_event(handle_menu_event)
        .invoke_handler(tauri::generate_handler![
            process_excel, 
            convert_to_ico, 
            open_file, 
            execute_js,
            get_plugins,
            execute_plugin_method,
            install_plugin,
            uninstall_plugin,
            plugin_api_call,
            plugin_call_api
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
