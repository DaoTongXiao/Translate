use calamine::{open_workbook, Reader, Xlsx};
use rust_xlsxwriter::{Workbook};
use scraper::Html;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::command;
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessResult {
    success: bool,
    message: String,
    output_path: Option<String>,
}

fn convert_to_date_string(cell: &str) -> String {
    if let Ok(days) = cell.parse::<f64>() {
        // Excel 日期系统从 1900-01-01 开始，但有一个 1900 年 2 月 29 日的错误
        // 我们需要调整计算方式
        if days >= 60.0 {
            // 60 及以上的值需要减 1（因为 Excel 错误地认为 1900 年是闰年）
            let adjusted_days = days - 1.0;
            if let Some(base_date) = NaiveDate::from_ymd_opt(1900, 1, 1) {
                if let Some(date) = base_date.checked_add_days(chrono::Days::new(adjusted_days as u64)) {
                    // 判断是否有时间部分
                    let fractional_part = days - days.floor();
                    if fractional_part > 0.0 {
                        let seconds = (fractional_part * 86400.0) as u32;
                        let hours = seconds / 3600;
                        let minutes = (seconds % 3600) / 60;
                        let secs = seconds % 60;
                        if let Some(time) = NaiveTime::from_hms_opt(hours, minutes, secs) {
                            let datetime = NaiveDateTime::new(date, time);
                            return datetime.format("%Y-%m-%d %H:%M:%S").to_string();
                        }
                    }
                    return date.format("%Y-%m-%d").to_string();
                }
            }
        } else if days > 0.0 {
            // 1-59 之间的值直接计算
            if let Some(base_date) = NaiveDate::from_ymd_opt(1900, 1, 1) {
                if let Some(date) = base_date.checked_add_days(chrono::Days::new(days as u64 - 1)) {
                    return date.format("%Y-%m-%d").to_string();
                }
            }
        }
    }
    cell.to_string() // 如果不是数字或计算失败，返回原始字符串
}

#[command]
pub async fn process_excel(input_path: String) -> ProcessResult {
    let path = Path::new(&input_path);

    // 检查文件是否存在
    if !path.exists() {
        return ProcessResult {
            success: false,
            message: String::from("文件不存在"),
            output_path: None,
        };
    }

    // 尝试打开 Excel 文件
    let mut workbook: Xlsx<_> = match open_workbook(path) {
        Ok(wb) => wb,
        Err(e) => {
            return ProcessResult {
                success: false,
                message: format!("无法打开 Excel 文件: {}", e),
                output_path: None,
            };
        }
    };

    // 获取第一个工作表
    if let Some(Ok(range)) = workbook.worksheet_range_at(0) {
        let mut processed_data: Vec<Vec<String>> = Vec::new();

        // 处理每一行
        for (row_idx, row) in range.rows().enumerate() {
            let mut processed_row: Vec<String> = Vec::new();
            for (col_idx, cell) in row.iter().enumerate() {
                let cell_str = cell.to_string();
                let processed_text = convert_html_to_text(&cell_str);

                // 分析单元格值是否可能是日期
                let is_date = is_likely_date_value(&processed_text, cell);

                // 只对可能是日期的值进行转换
                let processed_cell = if is_date {
                    convert_to_date_string(&processed_text)
                } else {
                    processed_text
                };

                processed_row.push(processed_cell);
            }
            processed_data.push(processed_row);
        }

        // 构建输出文件路径
        let output_path = path.with_file_name(format!(
            "{}-processed.xlsx",
            path.file_stem().unwrap().to_string_lossy()
        ));

        // 创建新的工作簿并保存
        let mut workbook = Workbook::new();
        let sheet = workbook.add_worksheet();

        for (row_idx, row) in processed_data.iter().enumerate() {
            for (col_idx, cell) in row.iter().enumerate() {
                sheet.write_string(row_idx as u32, col_idx as u16, cell).unwrap();
            }
        }

        match workbook.save(output_path.to_str().unwrap()) {
            Ok(_) => ProcessResult {
                success: true,
                message: String::from("处理成功"),
                output_path: Some(output_path.to_string_lossy().into_owned()),
            },
            Err(e) => ProcessResult {
                success: false,
                message: format!("保存文件失败: {}", e),
                output_path: None,
            },
        }
    } else {
        ProcessResult {
            success: false,
            message: String::from("无法读取工作表"),
            output_path: None,
        }
    }
}

fn convert_html_to_text(html_string: &str) -> String {
    // 检查是否包含 HTML 标签
    if !html_string.contains('<') && !html_string.contains('>') {
        return html_string.to_string();
    }

    let fragment = Html::parse_fragment(html_string);
    let text = fragment.root_element().text().collect::<Vec<_>>().join(" ");
    text.trim().to_string()
}

// 判断值是否可能是日期
fn is_likely_date_value(cell_str: &str, cell_value: &calamine::Data) -> bool {
    // 已经是日期字符串格式，不需要转换
    if NaiveDate::parse_from_str(cell_str, "%Y-%m-%d").is_ok() ||
       NaiveDateTime::parse_from_str(cell_str, "%Y-%m-%d %H:%M:%S").is_ok() {
        return true;
    }
    
    // 检查 calamine 的 Data 类型
    match cell_value {
        // 如果 calamine 已经将其识别为日期时间类型
        calamine::Data::DateTime(_) | calamine::Data::DateTimeIso(_) => {
            return true;
        },
        calamine::Data::Float(num) => {
            // 定义更严格的Excel日期有效范围
            const EXCEL_DATE_MIN: f64 = 1.0;       // 1900-01-01
            const EXCEL_DATE_MAX: f64 = 73050.0;   // 约2100-01-01
            
            // 整数部分应该有意义
            let int_part = num.floor();
            
            // 典型日期范围检查
            // 排除太小的数字，它们更可能是普通数值而非日期
            // 这里使用一个合理的下限，比如15000（约1941年）
            if int_part >= 15000.0 && int_part <= EXCEL_DATE_MAX {
                // 可能是日期
                return true;
            }
            
            // 通过分析数值特征来进一步判断
            // 1. 带小数部分的日期值（包含时间）通常小数部分有规律
            let frac_part = num - int_part;
            
            // 2. 如果是一个合理的日期（1900年至今）但不是很小的数
            if int_part >= EXCEL_DATE_MIN && int_part <= EXCEL_DATE_MAX && int_part >= 365.0 {
                // 小数部分如果表示时间，应该在0-0.99999之间
                // 常见时间对应的小数：0.25(6小时), 0.5(12小时), 0.75(18小时), 0.33333(8小时)等
                // 检查小数部分是否符合时间模式
                if frac_part > 0.0 {
                    let seconds = (frac_part * 86400.0) as u32;
                    let hours = seconds / 3600;
                    let minutes = (seconds % 3600) / 60;
                    
                    // 如果小数部分恰好对应整点、整半小时或整分钟，更可能是日期时间
                    if minutes % 5 == 0 || hours * 60 + minutes <= 10 || hours * 60 + minutes >= 23 * 60 {
                        return true;
                    }
                } 
                // 整数且处于更可能是日期的范围(Excel日期通常在36000-45000之间，约1998-2023年)
                else if int_part >= 36000.0 && int_part <= 45000.0 {
                    return true;
                }
            }
        },
        // 对于整数，使用更严格的判断
        calamine::Data::Int(num) => {
            let num_f64 = *num as f64;
            // 整数必须在一个更严格的范围内才可能是日期
            // 避免将小整数误判为日期
            if num_f64 >= 36000.0 && num_f64 <= 45000.0 {  // 约1998-2023年
                return true;
            }
        },
        // 对于字符串，已在前面检查过日期格式
        _ => {}
    }
    
    false
}