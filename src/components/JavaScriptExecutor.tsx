import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import '../App.css';

interface ExecutionResult {
  success: boolean;
  result: any;
  error?: string;
}

const JavaScriptExecutor: React.FC = () => {
  const [code, setCode] = useState<string>('// 在此处输入 JavaScript 代码\nconsole.log("Hello, World!");\n\n// 返回值将显示在结果区域\nreturn { message: "你好，世界！", data: [1, 2, 3] };');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const executeCode = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      // 调用新的 JavaScript 执行命令
      const response = await invoke<ExecutionResult>('execute_js', { code });
      
      if (response.success) {
        setResult(JSON.stringify(response.result, null, 2));
      } else {
        setIsError(true);
        setResult(response.error || '执行出错');
      }
    } catch (error) {
      setIsError(true);
      setResult(`执行出错: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 清除代码和结果
  const clearResult = () => {
    setResult('');
    setIsError(false);
  };

  const clearCode = () => {
    setCode('// 在此处输入 JavaScript 代码');
    setResult('');
    setIsError(false);
  };

  return (
    <div className="container">
      <h2>JavaScript 执行工具</h2>
      
      <div className="tool-section">
        <div className="code-editor-container">
          <h3>代码编辑器</h3>
          <textarea
            className="code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={15}
            spellCheck={false}
          />
        </div>

        <div className="button-group">
          <button 
            className="primary-button" 
            onClick={executeCode}
            disabled={isLoading}
          >
            {isLoading ? '执行中...' : '执行代码'}
          </button>
          <button 
            className="secondary-button" 
            onClick={clearResult}
            disabled={isLoading}
          >
            清除结果
          </button>
          <button 
            className="secondary-button" 
            onClick={clearCode}
          >
            清空代码
          </button>
        </div>

        <div className="result-container">
          <h3>执行结果</h3>
          <pre className={`result-display ${isError ? 'error' : ''}`}>
            {result || '执行结果将显示在这里'}
          </pre>
        </div>
      </div>

      <div className="feature-list">
        <h3>功能特点</h3>
        <ul>
          <li>✓ 执行任意 JavaScript 代码</li>
          <li>✓ 支持 JSON 格式化输出</li>
          <li>✓ 支持 V8 JavaScript 引擎</li>
          <li>✓ 错误处理与显示</li>
        </ul>
      </div>
    </div>
  );
};

export default JavaScriptExecutor;
