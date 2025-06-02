/**
 * JS转TXX插件 - 读取JavaScript文件并转换为TXX格式
 */

// 转换JS代码为TXX格式
function convertJsToTxx(jsCode) {
  // 这里实现一个简单的转换逻辑，您可以根据需要扩展
  // 例如：添加行号、转换特定语法、添加注释等
  
  // 对每一行代码加入行号和分隔符
  const lines = jsCode.split('\n');
  const txxLines = lines.map((line, index) => {
    return `${index + 1}:TXX: ${line}`;
  });
  
  // 添加TXX头部和尾部
  const txxHeader = '/* TXX FORMAT - JavaScript Transform */\n';
  const txxFooter = '\n/* END OF TXX FORMAT */\n';
  
  // 组合成完整的TXX内容
  return txxHeader + txxLines.join('\n') + txxFooter;
}

// 插件导出对象
const plugin = {
  /**
   * 运行插件 - 处理JS文件
   * @param {Object} args - 传入的参数，包含filePath
   * @returns {Object} 处理结果
   */
  run: function(args = {}) {
    try {
      console.log('开始处理JS文件...');
      console.log('提供的参数:', JSON.stringify(args));
      
      // 从参数中获取文件路径
      // 兼容多种可能的参数格式
      const filePath = args.filePath || args.file_path || (args.args && args.args.filePath);
      console.log('处理的文件路径:', filePath);
      
      if (!filePath) {
        return {
          success: false,
          message: '未提供文件路径'
        };
      }
      
      // 调用应用API读取文件内容
      let fileContent;
      try {
        // 直接调用readFile API
        const apiResponse = global.appApi.callApi('readFile', {
          path: filePath
        });
        
        console.log('读取文件响应:', JSON.stringify(apiResponse));
        console.log('响应类型:', typeof apiResponse);
        
        // 处理不同的响应格式
        if (!apiResponse) {
          throw new Error('文件读取响应为空');
        }
        
        // 如果是字符串，直接使用
        if (typeof apiResponse === 'string') {
          fileContent = apiResponse;
        }
        // 如果是对象，尝试从各种可能的属性中提取内容
        else if (typeof apiResponse === 'object') {
          // 尝试多种可能的属性名
          fileContent = apiResponse.content || apiResponse.data || apiResponse.text || apiResponse.value;
          
          // 如果对象有success属性且为false，返回错误
          if (apiResponse.success === false) {
            throw new Error(apiResponse.message || apiResponse.error || '读取文件失败');
          }
          
          // 如果无法从对象中提取内容，尝试使用JSON.stringify
          if (!fileContent && Object.keys(apiResponse).length > 0) {
            console.log('尝试使用整个响应对象作为内容');
            // 这可能不是预期的行为，但是一种备选方案
            fileContent = JSON.stringify(apiResponse, null, 2);
          }
        }
        
        // 最终检查我们是否有内容
        if (!fileContent) {
          console.error('无法从响应中提取文件内容:', apiResponse);
          throw new Error('无法从响应中获取文件内容');
        }
        
        console.log('成功读取文件内容，长度:', fileContent.length);
      } catch (readError) {
        console.error('读取文件错误:', readError);
        throw new Error('读取文件失败: ' + readError.message);
      }
      
      // 转换为TXX格式
      const txxContent = convertJsToTxx(fileContent);
      
      // 显示通知
      try {
        global.appApi.callApi('showNotification', {
          title: 'JS文件处理完成',
          message: `成功转换文件: ${filePath}`
        });
      } catch (notifyError) {
        console.log('显示通知失败:', notifyError);
        // 通知失败不影响主要功能，继续执行
      }
      
      // 返回结果 - 使用简化格式，将内容直接放在外层
      return {
        success: true,
        originalFile: filePath,
        content: txxContent, // 内容直接在外层，方便提取
        stats: {
          originalLines: fileContent.split('\n').length,
          convertedLines: txxContent.split('\n').length
        },
        message: `成功处理JS文件: ${filePath}`
      };
    } catch (error) {
      console.error('插件执行失败:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },
  
  /**
   * 保存结果到指定路径
   * @param {Object} args - 传入的参数，包含 result 和 outputPath
   * @returns {Object} 保存结果
   */
  saveResult: function(args = {}) {
    try {
      console.log('插件收到saveResult调用，参数:', JSON.stringify(args));
      
      // 检查参数格式
      if (!args) {
        throw new Error('参数不能为空');
      }
      
      // 兼容多种参数结构
      let content, outputPath, stats;
      
      // 情况一：{ content, outputPath, stats }
      if (args.content !== undefined && args.outputPath) {
        content = args.content;
        outputPath = args.outputPath;
        stats = args.stats || {};
      } 
      // 情况二：{ params: { content, outputPath, stats } }
      else if (args.params && args.params.content !== undefined && args.params.outputPath) {
        content = args.params.content;
        outputPath = args.params.outputPath;
        stats = args.params.stats || {};
      }
      // 情况三：内容直接作为第一个参数，路径作为第二个参数
      else if (typeof args === 'string' && arguments.length > 1 && typeof arguments[1] === 'string') {
        content = args;
        outputPath = arguments[1];
        stats = arguments[2] || {};
      }
      else {
        throw new Error('参数格式不正确，无法识别内容和输出路径');
      }
      
      // 确保有内容和路径
      if (!content) {
        throw new Error('没有提供要保存的内容');
      }
      
      if (!outputPath) {
        throw new Error('没有提供输出路径');
      }
      
      // 路径格式转换和调试
      console.log('原始输出路径:', outputPath);
      // 确保正斜杠的一致性
      const normalizedPath = outputPath.replace(/\\/g, '/');
      console.log('标准化路径:', normalizedPath);
      
      // 准备要保存的内容
      let contentToSave = content;
      if (typeof content !== 'string') {
        // 如果内容不是字符串，尝试转换
        try {
          contentToSave = JSON.stringify(content, null, 2);
        } catch (e) {
          contentToSave = String(content);
        }
      }
      
      console.log('将结果保存到:', outputPath);
      console.log('要保存的内容长度:', contentToSave.length);
      
      // 确保文件扩展名正确
      if (!outputPath.toLowerCase().endsWith('.txt')) {
        console.log('添加.txt扩展名');
        outputPath = outputPath + '.txt';
      }
      
      const fs = require('fs');
      const path = require('path');
      
      // 第一种方法: 直接尝试写入指定路径
      try {
        console.log('方法1: 直接写入指定路径:', outputPath);
        fs.writeFileSync(outputPath, contentToSave);
        console.log('直接写入成功!');
        
        // 检查文件是否真的被创建
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log('验证文件已创建, 大小:', stats.size);
          return {
            success: true,
            message: `结果已成功保存到: ${outputPath}`,
            outputPath
          };
        } else {
          console.error('写入操作没有报错，但文件不存在!');
        }
      } catch (err1) {
        console.error('方法1失败:', err1);
      }
      
      // 第二种方法: 尝试使用用户目录
      try {
        // 获取用户目录
        const homeDir = process.env.USERPROFILE || process.env.HOME;
        const backupPath = path.join(homeDir, 'converted_file.txt');
        console.log('方法2: 尝试写入用户目录:', backupPath);
        
        fs.writeFileSync(backupPath, contentToSave);
        console.log('备用方案写入成功!');
        
        return {
          success: true,
          message: `原始路径写入失败，已将结果保存到: ${backupPath}`,
          outputPath: backupPath
        };
      } catch (err2) {
        console.error('方法2失败:', err2);
      }
      
      // 第三种方法: 尝试使用当前工作目录
      try {
        const currentDir = process.cwd();
        const workingDirPath = path.join(currentDir, 'converted_output.txt');
        console.log('方法3: 尝试写入当前工作目录:', workingDirPath);
        
        fs.writeFileSync(workingDirPath, contentToSave);
        console.log('工作目录写入成功!');
        
        return {
          success: true,
          message: `原始路径写入失败，已将结果保存到: ${workingDirPath}`,
          outputPath: workingDirPath
        };
      } catch (err3) {
        console.error('方法3失败:', err3);
      }
      
      // 第四种方法: 使用API调用
      try {
        console.log('方法4: 尝试使用API写入:', outputPath);
        const writeResponse = global.appApi.callApi('writeFile', {
          path: outputPath,
          content: contentToSave
        });
        
        console.log('写入文件响应:', typeof writeResponse === 'object' ? JSON.stringify(writeResponse) : writeResponse);
        
        if (writeResponse === true || (typeof writeResponse === 'object' && writeResponse.success !== false)) {
          return {
            success: true,
            message: `已通过API将结果保存到: ${outputPath}`,
            outputPath
          };
        }
      } catch (err4) {
        console.error('方法4失败:', err4);
      }
      
      // 如果所有方法都失败，返回错误
      throw new Error('所有保存文件尝试均失败，请检查文件路径和权限');
    } catch (error) {
      console.error('保存结果失败:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },
  
  /**
   * 获取系统信息
   */
  getSystemInfo: function() {
    try {
      // 调用应用 API 获取系统信息
      const result = global.appApi.callApi("getSystemInfo", {});
      return {
        success: true,
        info: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  },
  
  /**
   * 显示通知
   */
  showNotification: function(args) {
    try {
      const title = args?.title || "演示插件通知";
      const message = args?.message || "这是一条来自插件的通知";
      
      // 调用应用 API 显示通知
      const result = global.appApi.callApi("showNotification", {
        title: title,
        message: message
      });
      
      return {
        success: true,
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  },
  
  /**
   * 转换图片
   */
  convertImage: function(args) {
    try {
      if (!args || !args.path) {
        throw new Error("需要提供图片路径");
      }
      
      const format = args.format || "png";
      
      // 调用应用 API 转换图片
      const result = global.appApi.callApi("convertImage", {
        sourcePath: args.path,
        targetFormat: format
      });
      
      return {
        success: true,
        convertedPath: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  },
  
  /**
   * 获取剪贴板内容
   */
  getClipboardText: function() {
    try {
      // 调用应用 API 获取剪贴板内容
      const result = global.appApi.callApi("getClipboardText", {});
      
      return {
        success: true,
        text: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  },
  
  /**
   * 设置剪贴板内容
   */
  setClipboardText: function(args) {
    try {
      if (!args || !args.text) {
        throw new Error("需要提供要设置的文本");
      }
      
      // 调用应用 API 设置剪贴板内容
      const result = global.appApi.callApi("setClipboardText", {
        text: args.text
      });
      
      return {
        success: true,
        result: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  },
  
  /**
   * 将处理后的结果转换为字符串，用于调试显示
   */
  resultToString: function(result) {
    if (!result || !result.stats) return "无处理结果";
    
    return `转换完成:\n- 原始行数: ${result.stats.originalLines}\n- 转换后行数: ${result.stats.convertedLines}`;
  }
};

// 导出插件对象
module.exports = plugin;
