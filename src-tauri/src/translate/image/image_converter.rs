use std::fs::File;
use std::io::BufWriter;
use image::DynamicImage;
use base64::Engine;
use serde::{Serialize, Deserialize};
use ico::{IconDir, IconImage, IconDirEntry, ResourceType};

#[derive(Debug, Serialize)]
pub struct ConversionResult {
    success: bool,
    message: String,
    output_path: String,
}

#[derive(Debug, Deserialize)]
pub struct ImageData {
    path: Option<String>,
    base64: Option<String>,
    output_path: String,
    size: Option<u32>,
}

/// 将图片转换为.ico格式
/// 
/// 支持从文件路径或Base64编码的图片数据转换
#[tauri::command]
pub async fn convert_to_ico(image_data: ImageData) -> Result<ConversionResult, String> {
    // 默认图标大小
    let size = image_data.size.unwrap_or(32);
    
    // 加载图像
    let img = if let Some(ref path) = image_data.path {
        load_image_from_path(path)?
    } else if let Some(ref base64_str) = image_data.base64 {
        load_image_from_base64(base64_str)?
    } else {
        return Err("必须提供图片路径或Base64编码的图片数据".to_string());
    };
    
    // 创建圆角图像
    let rounded_img = create_rounded_image(&img, size)?;
    
    // 保存为 ICO 文件
    save_as_ico(&rounded_img, &image_data.output_path, size)?;
    
    Ok(ConversionResult {
        success: true,
        message: "图片成功转换为.ico格式".to_string(),
        output_path: image_data.output_path
    })
}

/// 从文件路径加载图片
fn load_image_from_path(path: &str) -> Result<DynamicImage, String> {
    match image::open(path) {
        Ok(img) => Ok(img),
        Err(e) => Err(format!("无法打开图片文件: {}", e))
    }
}

/// 从 Base64 字符串加载图片
fn load_image_from_base64(base64_str: &str) -> Result<DynamicImage, String> {
    // 如果字符串包含数据 URL 前缀，则删除它
    let base64_data = if base64_str.contains("base64,") {
        base64_str.split("base64,").nth(1).unwrap_or(base64_str)
    } else {
        base64_str
    };
    
    // 使用Engine特征解码Base64数据
    match base64::engine::general_purpose::STANDARD.decode(base64_data) {
        Ok(data) => {
            match image::load_from_memory(&data) {
                Ok(img) => Ok(img),
                Err(e) => Err(format!("无法解析图像数据: {}", e))
            }
        },
        Err(e) => Err(format!("无法解码 Base64 数据: {}", e))
    }
}

/// 将图像转换为 .ico 格式并保存到指定路径
fn save_as_ico(img: &DynamicImage, output_path: &str, size: u32) -> Result<(), String> {
    let resized = img.resize_exact(size, size, image::imageops::FilterType::Lanczos3);
    
    // 创建输出文件
    let file = File::create(output_path)
        .map_err(|e| format!("无法创建输出文件: {}", e))?;
    let buf_writer = BufWriter::new(file);
    
    // 创建 ICO 目录
    let mut icon_dir = IconDir::new(ResourceType::Icon);
    
    // 将图像转换为 ICO 格式
    let rgba = resized.to_rgba8();
    let icon_image = IconImage::from_rgba_data(
        rgba.width(), 
        rgba.height(), 
        rgba.into_raw()
    );
    
    // 创建 IconDirEntry 并添加到 ICO 目录
    let entry = IconDirEntry::encode(&icon_image)
        .map_err(|e| format!("无法创建 ICO 目录项: {}", e))?;
    icon_dir.add_entry(entry);
    
    // 写入 ICO 文件
    icon_dir.write(buf_writer)
        .map_err(|e| format!("无法写入 ICO 文件: {}", e))?;
    
    Ok(())
}

/// 创建带圆角的图像
fn create_rounded_image(img: &DynamicImage, size: u32) -> Result<DynamicImage, String> {
    use image::{Rgba, RgbaImage, GenericImageView, imageops};
    
    // 使用更高的分辨率处理以消除锯齿
    let high_res_factor = 3;
    let high_res_size = size * high_res_factor;
    
    // 创建一个高分辨率的纯白色背景图像
    let mut high_res = RgbaImage::new(high_res_size, high_res_size);
    
    // 圆角半径 - 使用图标大小的1/8
    let high_res_radius = high_res_size / 8;
    let radius_squared = (high_res_radius * high_res_radius) as f32;
    
    // 圆心坐标
    let top_left = (high_res_radius, high_res_radius);
    let top_right = (high_res_size - high_res_radius, high_res_radius);
    let bottom_left = (high_res_radius, high_res_size - high_res_radius);
    let bottom_right = (high_res_size - high_res_radius, high_res_size - high_res_radius);
    
    // 首先创建圆角矩形遮罩 - 使用纯白色背景
    for y in 0..high_res_size {
        for x in 0..high_res_size {
            // 默认设置为白色
            let mut pixel = Rgba([255, 255, 255, 255]);
            
            // 检查是否在四个角落区域
            let in_top_left = x < high_res_radius && y < high_res_radius;
            let in_top_right = x >= high_res_size - high_res_radius && y < high_res_radius;
            let in_bottom_left = x < high_res_radius && y >= high_res_size - high_res_radius;
            let in_bottom_right = x >= high_res_size - high_res_radius && y >= high_res_size - high_res_radius;
            
            if in_top_left || in_top_right || in_bottom_left || in_bottom_right {
                // 计算到相应圆角圆心的距离
                let (corner_x, corner_y) = if in_top_left {
                    top_left
                } else if in_top_right {
                    top_right
                } else if in_bottom_left {
                    bottom_left
                } else {
                    bottom_right
                };
                
                let dx = (x as i32 - corner_x as i32) as f32;
                let dy = (y as i32 - corner_y as i32) as f32;
                let distance_squared = dx * dx + dy * dy;
                
                // 如果距离大于半径，则设为透明
                if distance_squared > radius_squared {
                    pixel = Rgba([0, 0, 0, 0]);
                }
            }
            
            high_res.put_pixel(x, y, pixel);
        }
    }
    
    // 计算内容区域大小（60%的图像区域）
    let high_res_content_size = (high_res_size as f32 * 0.6) as u32;
    let high_res_padding = (high_res_size - high_res_content_size) / 2;
    
    // 缩放原图像到高分辨率内容区域
    let scaled_img = img.resize_exact(
        high_res_content_size, 
        high_res_content_size, 
        imageops::FilterType::Lanczos3
    );
    
    // 将缩放后的图像内容放在白色背景上
    for y in 0..high_res_content_size {
        for x in 0..high_res_content_size {
            let src_pixel = scaled_img.get_pixel(x, y);
            
            // 计算目标位置
            let target_x = x + high_res_padding;
            let target_y = y + high_res_padding;
            
            // 判断是否在图像范围内且目标像素不是透明的
            if target_x < high_res_size && target_y < high_res_size && high_res.get_pixel(target_x, target_y)[3] > 0 {
                high_res.put_pixel(target_x, target_y, src_pixel);
            }
        }
    }
    
    // 将高分辨率图像缩小到目标尺寸，使用高质量缩放算法消除锯齿
    let final_img = imageops::resize(&high_res, size, size, imageops::FilterType::Lanczos3);
    
    // 转换为DynamicImage并返回
    Ok(DynamicImage::ImageRgba8(final_img))
}
