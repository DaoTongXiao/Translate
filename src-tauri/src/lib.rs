mod translate;

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
        if let Some(parent) = PathBuf::from(&path).parent() {
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .expect("打开文件失败");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化应用
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
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