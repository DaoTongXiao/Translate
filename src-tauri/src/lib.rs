mod ai;
mod database;
mod translate;

use std::sync::Arc;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Manager;
use translate::excel::process_excel;
use translate::image::convert_to_ico;

type ChromaServerState = Arc<tokio::sync::Mutex<Option<Arc<ai::chromadb_server::ChromaServer>>>>;

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
        if let Some(parent) = std::path::PathBuf::from(&path).parent() {
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .expect("打开文件失败");
        }
    }
}

fn create_chinese_menu(app: &tauri::App) -> Result<Menu<tauri::Wry>, tauri::Error> {
    let handle = app.handle();

    // 应用菜单 (macOS)
    let app_menu = Submenu::with_items(
        handle,
        "Moro",
        true,
        &[
            &PredefinedMenuItem::about(handle, Some("关于 Moro"), None)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(handle, "settings", "设置", true, Some("Cmd+,"))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::services(handle, Some("服务"))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::hide(handle, Some("隐藏 Moro"))?,
            &PredefinedMenuItem::hide_others(handle, Some("隐藏其他"))?,
            &PredefinedMenuItem::show_all(handle, Some("显示全部"))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::quit(handle, Some("退出 Moro"))?,
        ],
    )?;

    // 编辑菜单
    let edit_menu = Submenu::with_items(
        handle,
        "编辑",
        true,
        &[
            &PredefinedMenuItem::undo(handle, Some("撤销"))?,
            &PredefinedMenuItem::redo(handle, Some("重做"))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::cut(handle, Some("剪切"))?,
            &PredefinedMenuItem::copy(handle, Some("复制"))?,
            &PredefinedMenuItem::paste(handle, Some("粘贴"))?,
            &PredefinedMenuItem::select_all(handle, Some("全选"))?,
        ],
    )?;

    // 窗口菜单
    let window_menu = Submenu::with_items(
        handle,
        "窗口",
        true,
        &[
            &PredefinedMenuItem::minimize(handle, Some("最小化"))?,
            &MenuItem::with_id(handle, "zoom", "缩放", true, None::<&str>)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::fullscreen(handle, Some("进入全屏幕"))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::close_window(handle, Some("关闭窗口"))?,
        ],
    )?;

    // 帮助菜单
    let help_menu = Submenu::with_items(
        handle,
        "帮助",
        true,
        &[&MenuItem::with_id(
            handle,
            "help",
            "Moro 帮助",
            true,
            Some("Cmd+?"),
        )?],
    )?;

    Menu::with_items(handle, &[&app_menu, &edit_menu, &window_menu, &help_menu])
}

#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = tauri::WebviewWindowBuilder::new(
            &app,
            "settings",
            tauri::WebviewUrl::App("#/settings".into()),
        )
        .title("偏好设置")
        .inner_size(800.0, 600.0)
        .center()
        .build();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化应用
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 设置中文菜单
            let menu = create_chinese_menu(app)?;
            app.set_menu(menu)?;

            // 初始化数据库
            database::init_db(app.handle()).expect("初始化数据库失败");

            // 初始化 ChromaDB 服务器状态
            app.manage::<ChromaServerState>(Arc::new(tokio::sync::Mutex::new(None)));

            Ok(())
        })
        .on_menu_event(|app, event| {
            // 处理菜单点击事件
            if event.id().as_ref() == "settings" {
                open_settings_window(app.app_handle().clone());
            }
        })
        .invoke_handler(tauri::generate_handler![
            process_excel,
            convert_to_ico,
            open_file,
            open_settings_window,
            ai::chroma_start_server,
            ai::chroma_stop_server,
            ai::chroma_create_collection,
            ai::chroma_add_documents,
            ai::chroma_query,
            ai::chroma_delete_collection,
            // Database commands
            database::create_conversation,
            database::save_message,
            database::get_history,
            database::get_conversation_list,
            database::delete_conversation,
            database::update_conversation_title,
            database::toggle_pin_conversation,
            // Provider & Model commands
            database::create_provider,
            database::get_providers,
            database::delete_provider,
            database::create_model,
            database::get_models_by_provider,
            database::get_all_models,
            database::delete_model,
            database::set_active_model,
            database::get_all_models,
            database::delete_model,
            database::set_active_model,
            database::get_active_model,
            // LLM
            ai::llm::chat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
