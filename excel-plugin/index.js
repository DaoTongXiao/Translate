/**
 * Excel处理插件
 * 这个插件用于处理Excel文件，可以选择文件并输出处理结果
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 运行插件的主函数
 * @returns {object} 插件信息
 */
function run() {
  return {
    name: "Excel处理插件",
    version: "1.0.0",
    description: "一个用于处理Excel文件，可以选择文件并输出处理结果的插件"
  };
}

/**
 * 选择Excel文件并处理
 * @returns {object} 处理结果
 */
function processExcel() {
  try {
    // 调用应用API打开文件选择对话框
    const result = appApi.callApi('openFileDialog', {
      title: "选择Excel文件",
      filters: [".xlsx", ".xls"]
    });
    
    if (!result || typeof result !== 'string') {
      return { success: false, error: "未选择文件" };
    }
    
    // 获取选中的文件路径
    const filePath = result;
    
    // 调用应用API显示通知
    appApi.callApi('showNotification', {
      title: "Excel处理",
      message: `正在处理文件: ${path.basename(filePath)}`
    });
    
    // 处理Excel文件
    return processExcelFile(filePath);
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 处理Excel文件
 * @param {string} filePath - Excel文件路径
 * @returns {object} 处理结果
 */
function processExcelFile(filePath) {
  try {
    // 创建输出文件路径
    const outputDir = path.dirname(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(outputDir, `${fileName}_处理结果${path.extname(filePath)}`);
    
    // 调用应用API处理Excel文件
    const result = appApi.callApi('processExcel', {
      inputFile: filePath,
      outputFile: outputPath,
      options: {
        removeEmptyRows: true,
        formatDates: true,
        addSummary: true
      }
    });
    
    if (!result || !result.success) {
      return { 
        success: false, 
        error: result?.error || "处理Excel文件失败" 
      };
    }
    
    // 显示成功通知
    appApi.callApi('showNotification', {
      title: "Excel处理完成",
      message: `文件已处理并保存至: ${path.basename(outputPath)}`
    });
    
    return {
      success: true,
      inputFile: filePath,
      outputFile: outputPath,
      message: "Excel文件处理成功"
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 处理Excel并转换为CSV
 * @param {object} params - 参数对象
 * @param {string} params.filePath - 可选，Excel文件路径，如果未提供则会打开文件选择对话框
 * @returns {object} 处理结果
 */
function convertToCSV(params = {}) {
  try {
    let filePath = params.filePath;
    
    // 如果未提供文件路径，则打开文件选择对话框
    if (!filePath) {
      const result = appApi.callApi('openFileDialog', {
        title: "选择Excel文件",
        filters: [".xlsx", ".xls"]
      });
      
      if (!result || typeof result !== 'string') {
        return { success: false, error: "未选择文件" };
      }
      
      filePath = result;
    }
    
    // 创建输出文件路径
    const outputDir = path.dirname(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const outputPath = path.join(outputDir, `${fileName}.csv`);
    
    // 调用应用API处理Excel文件
    const result = appApi.callApi('processExcel', {
      inputFile: filePath,
      outputFile: outputPath,
      options: {
        format: 'csv',
        delimiter: ',',
        includeHeaders: true
      }
    });
    
    if (!result || !result.success) {
      return { 
        success: false, 
        error: result?.error || "转换为CSV失败" 
      };
    }
    
    // 显示成功通知
    appApi.callApi('showNotification', {
      title: "转换完成",
      message: `文件已转换为CSV并保存至: ${path.basename(outputPath)}`
    });
    
    return {
      success: true,
      inputFile: filePath,
      outputFile: outputPath,
      message: "Excel文件已成功转换为CSV"
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 合并多个Excel文件
 * @returns {object} 处理结果
 */
function mergeExcelFiles() {
  try {
    // 提示用户选择输出文件
    const outputResult = appApi.callApi('openFileDialog', {
      title: "选择合并后的输出文件",
      filters: [".xlsx"],
      save: true
    });
    
    if (!outputResult || typeof outputResult !== 'string') {
      return { success: false, error: "未选择输出文件" };
    }
    
    const outputPath = outputResult;
    
    // 调用应用API处理Excel文件
    const result = appApi.callApi('mergeExcelFiles', {
      outputFile: outputPath
    });
    
    if (!result || !result.success) {
      return { 
        success: false, 
        error: result?.error || "合并Excel文件失败" 
      };
    }
    
    // 显示成功通知
    appApi.callApi('showNotification', {
      title: "合并完成",
      message: `文件已合并并保存至: ${path.basename(outputPath)}`
    });
    
    return {
      success: true,
      outputFile: outputPath,
      message: "Excel文件合并成功"
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 导出插件函数
module.exports = {
  run,
  processExcel,
  convertToCSV,
  mergeExcelFiles
};
