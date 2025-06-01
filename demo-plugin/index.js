/**
 * 演示插件 - 展示如何使用应用 API
 */

// 插件导出对象
const plugin = {
  /**
   * 运行插件
   */
  run: function() {
    return "演示插件已启动！";
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
  }
};

// 导出插件对象
module.exports = plugin;
