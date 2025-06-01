/**
 * 示例翻译插件
 * 这个插件展示了如何创建一个简单的翻译功能插件
 */

// 简单的中英文词典
const dictionary = {
  "hello": "你好",
  "world": "世界",
  "good": "好的",
  "morning": "早上",
  "afternoon": "下午",
  "evening": "晚上",
  "welcome": "欢迎",
  "thank you": "谢谢",
  "goodbye": "再见",
  "computer": "电脑",
  "software": "软件",
  "program": "程序",
  "plugin": "插件",
  "system": "系统",
  "translate": "翻译"
};

/**
 * 运行插件的主函数
 * @returns {string} 插件信息
 */
function run() {
  return {
    name: "示例翻译插件",
    version: "1.0.0",
    description: "这是一个简单的翻译插件示例"
  };
}

/**
 * 英文翻译成中文
 * @param {Object} params - 参数对象
 * @param {string} params.text - 要翻译的英文文本
 * @returns {Object} 翻译结果
 */
function translateToChinese(params = {}) {
  const { text } = params;
  
  if (!text) {
    return { error: "请提供要翻译的文本" };
  }
  
  // 分词并翻译
  const words = text.toLowerCase().split(/\s+/);
  const translated = words.map(word => {
    return dictionary[word] || word;
  });
  
  return {
    original: text,
    translated: translated.join(' '),
    language: {
      source: "英文",
      target: "中文"
    }
  };
}

/**
 * 获取支持的单词列表
 * @returns {Array} 支持翻译的单词列表
 */
function getSupportedWords() {
  return Object.keys(dictionary);
}

/**
 * 添加新词到词典
 * @param {Object} params - 参数对象
 * @param {string} params.english - 英文单词
 * @param {string} params.chinese - 中文翻译
 * @returns {Object} 操作结果
 */
function addWord(params = {}) {
  const { english, chinese } = params;
  
  if (!english || !chinese) {
    return { error: "请同时提供英文单词和中文翻译" };
  }
  
  dictionary[english.toLowerCase()] = chinese;
  return { 
    success: true, 
    message: `成功添加单词: ${english} -> ${chinese}`,
    wordCount: Object.keys(dictionary).length
  };
}

/**
 * 调用系统通知 API
 * @param {Object} params - 参数对象
 * @param {string} params.title - 通知标题
 * @param {string} params.message - 通知内容
 * @returns {Object} 操作结果
 */
function showNotification(params = {}) {
  const { title = '插件通知', message = '这是一条来自插件的通知' } = params;
  
  try {
    // 调用应用 API
    const result = appApi.callApi('showNotification', { title, message });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 获取系统信息
 * @returns {Object} 系统信息
 */
function getSystemInfo() {
  try {
    // 调用应用 API
    const result = appApi.callApi('getSystemInfo', {});
    return { success: true, info: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 读取剪贴板文本
 * @returns {Object} 剪贴板文本
 */
function readClipboard() {
  try {
    // 调用应用 API
    const result = appApi.callApi('getClipboardText', {});
    return { success: true, text: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 写入剪贴板文本
 * @param {Object} params - 参数对象
 * @param {string} params.text - 要写入的文本
 * @returns {Object} 操作结果
 */
function writeClipboard(params = {}) {
  const { text = '' } = params;
  
  try {
    // 调用应用 API
    const result = appApi.callApi('setClipboardText', { text });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 打开文件选择对话框
 * @returns {Object} 选中的文件路径
 */
function openFileDialog() {
  try {
    // 调用应用 API
    const result = appApi.callApi('openFileDialog', {});
    return { success: true, path: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 导出插件函数
module.exports = {
  run,
  translateToChinese,
  getSupportedWords,
  addWord,
  // API 调用函数
  showNotification,
  getSystemInfo,
  readClipboard,
  writeClipboard,
  openFileDialog
};
