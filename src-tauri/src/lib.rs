mod translate;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use translate::excel::process_excel;
use translate::image::convert_to_ico;

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
            &MenuItem::with_id(handle, "settings", "偏好设置...", true, Some("Cmd+,"))?,
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            process_excel,
            convert_to_ico,
            open_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
