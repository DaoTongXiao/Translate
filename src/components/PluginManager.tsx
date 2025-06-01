import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import './PluginManager.css';

// 插件信息接口
interface PluginInfo {
  id: string;
  name: string;
  display_name?: string;
  version: string;
  description: string;
  main: string;
  author?: string;
}

// 插件状态接口
interface PluginStatus {
  loaded: boolean;
  error?: string;
}

// 插件项组件
const PluginItem: React.FC<{
  plugin: PluginInfo;
  status: PluginStatus;
  onExecute: (pluginId: string, method: string, args?: any) => void;
  onUninstall: (pluginId: string) => void;
}> = ({ plugin, status, onExecute, onUninstall }) => {
  const [method, setMethod] = useState('run');
  const [args, setArgs] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`plugin-item ${status.loaded ? 'loaded' : 'error'}`}>
      <div className="plugin-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="plugin-title">
          <h3>{plugin.display_name || plugin.name} <span className="plugin-version">v{plugin.version}</span></h3>
          {plugin.author && <p className="plugin-author">作者: {plugin.author}</p>}
        </div>
        <div className="plugin-actions">
          <button 
            className="execute-btn"
            onClick={(e) => {
              e.stopPropagation();
              onExecute(plugin.id, method);
            }}
          >
            执行
          </button>
          <button 
            className="uninstall-btn"
            onClick={(e) => {
              e.stopPropagation();
              onUninstall(plugin.id);
            }}
          >
            卸载
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="plugin-content" style={{ display: isExpanded ? 'block' : 'none' }}>
          <p className="plugin-description">{plugin.description}</p>
          
          <div className="plugin-method">
            <div className="method-row">
              <label>方法名称:</label>
              <input 
                type="text" 
                value={method} 
                onChange={(e) => setMethod(e.target.value)} 
                placeholder="方法名称"
              />
            </div>
            
            <div className="method-row">
              <label>参数(JSON):</label>
              <textarea 
                value={args} 
                onChange={(e) => setArgs(e.target.value)} 
                placeholder={"{\"参数\": \"值\"}"}
              />
            </div>
            
            <div className="button-group">
              <button 
                onClick={() => {
                  try {
                    const parsedArgs = args ? JSON.parse(args) : {};
                    onExecute(plugin.id, method, parsedArgs);
                  } catch (err) {
                    alert(`参数 JSON 格式错误: ${err}`);
                  }
                }}
              >
                执行方法
              </button>
              
              <button 
                onClick={() => {
                  try {
                    const parsedArgs = args ? JSON.parse(args) : {};
                    // 调用 API
                    onExecute(plugin.id, `appApi_${method}`, parsedArgs);
                  } catch (err) {
                    alert(`参数 JSON 格式错误: ${err}`);
                  }
                }}
              >
                调用 API
              </button>
            </div>
          </div>
        </div>
      )}
      
      {status.error && (
        <div className="plugin-error">
          <p>错误: {status.error}</p>
        </div>
      )}
    </div>
  );
};

// 插件管理器组件
const PluginManager: React.FC = () => {
  const [plugins, setPlugins] = useState<[PluginInfo, PluginStatus][]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载插件列表
  const loadPlugins = async () => {
    try {
      setLoading(true);
      const pluginList = await invoke<[PluginInfo, PluginStatus][]>('get_plugins');
      setPlugins(pluginList);
      setError(null);
    } catch (err) {
      setError(`加载插件失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // 安装插件
  const installPlugin = async () => {
    try {
      // 打开文件对话框选择插件目录
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择插件目录'
      });
      
      if (selected) {
        const pluginPath = selected as string;
        const newPlugin = await invoke<PluginInfo>('install_plugin', { pluginPath });
        
        // 重新加载插件列表
        await loadPlugins();
        
        setError(null);
        setResult(`插件 ${newPlugin.name} 安装成功`);
      }
    } catch (err) {
      setError(`安装插件失败: ${err}`);
      setResult(null);
    }
  };

  // 卸载插件
  const uninstallPlugin = async (pluginId: string) => {
    try {
      await invoke('uninstall_plugin', { pluginId });
      
      // 重新加载插件列表
      await loadPlugins();
      
      setError(null);
      setResult(`插件 ${pluginId} 卸载成功`);
    } catch (err) {
      setError(`卸载插件失败: ${err}`);
      setResult(null);
    }
  };

  // 执行插件方法
  const executePluginMethod = async (pluginId: string, method: string, args: any = {}) => {
    try {
      // 检查是否是 API 调用
      if (method.startsWith('appApi_')) {
        // 从方法名中提取 API 名称
        const apiName = method.substring(7); // 去掉 'appApi_' 前缀
        
        // 调用插件 API
        const result = await invoke('plugin_api_call', { 
          apiName, 
          apiArgs: args 
        });
        
        setResult(result);
        setError(null);
      } else {
        // 常规插件方法调用
        const result = await invoke('execute_plugin_method', { 
          pluginId, 
          method, 
          args 
        });
        
        setResult(result);
        setError(null);
      }
    } catch (err) {
      setError(`执行插件方法失败: ${err}`);
      setResult(null);
    }
  };

  // 组件挂载时加载插件
  useEffect(() => {
    loadPlugins();
  }, []);

  return (
    <div className="plugin-manager">
      <div className="plugin-manager-header">
        <h2>插件管理</h2>
        <button className="install-btn" onClick={installPlugin}>安装插件</button>
        <button className="refresh-btn" onClick={loadPlugins}>刷新</button>
      </div>
      
      {loading ? (
        <div className="loading">加载插件中...</div>
      ) : (
        <div className="plugin-list">
          {plugins.length === 0 ? (
            <div className="no-plugins">
              <p>没有安装任何插件</p>
              <p>点击"安装插件"按钮添加新插件</p>
            </div>
          ) : (
            plugins.map(([info, status]) => (
              <PluginItem 
                key={info.id}
                plugin={info}
                status={status}
                onExecute={executePluginMethod}
                onUninstall={uninstallPlugin}
              />
            ))
          )}
        </div>
      )}
      
      {(result || error) && (
        <div className="result-panel">
          <h3>执行结果</h3>
          {error && <div className="error-message">{error}</div>}
          {result && (
            <div className="result-content">
              <pre>{typeof result === 'object' ? JSON.stringify(result, null, 2) : result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PluginManager;
