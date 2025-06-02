import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
  // 添加新字段：是否需要文件选择
  // 使用与后端匹配的字段名
  requires_file_selection?: boolean;
  // 文件过滤器
  file_filters?: string[];
  // 新增字段：是否需要选择输出文件
  requires_output_file_selection?: boolean;
  // 输出文件过滤器
  output_file_filters?: string[];
  // 默认输出文件名
  default_output_file_name?: string;
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
      // 使用后端 API 打开目录选择对话框
      const apiArgs = {
        title: '选择插件目录',
        directory: true
      };
      
      // 使用特殊的系统插件ID "system"，因为这是通用API而不是特定插件的API
      const selected = await invoke('plugin_call_api', {
        pluginId: "system",
        apiName: 'openFolderDialog',  // 使用文件夹选择对话框
        args: apiArgs
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
      setResult({ status: `正在执行${method}...请稍候` });

      // 查找当前插件
      const pluginEntry = plugins.find(([p]) => p.id === pluginId);
      if (!pluginEntry) {
        throw new Error(`插件不存在: ${pluginId}`);
      }
      
      const [currentPlugin, status] = pluginEntry;
      if (!status.loaded) {
        throw new Error(`插件未加载成功: ${currentPlugin.name}`);
      }
      
      // 调试输出当前插件的元数据
      console.log('执行插件前的插件信息:', currentPlugin);
      console.log('是否需要文件选择:', currentPlugin.requires_file_selection);
      console.log('文件过滤器:', currentPlugin.file_filters);

      // 检查是否是 API 调用
      if (method.startsWith('appApi_')) {
        // 从方法名中提取 API 名称
        const apiName = method.substring(7); // 去掉 'appApi_' 前缀
        
        // 调用插件 API
        const result = await invoke('plugin_call_api', { 
          pluginId,
          apiName, 
          args 
        });
        
        setResult(result);
        setError(null);
      } else {
        // 判断插件是否需要文件选择
        // 打印插件元数据进行深度调试
        console.log('插件元数据详情:', JSON.stringify(currentPlugin, null, 2));
        
        // 兼容两种命名风格: snake_case和camelCase
        // 使用类型断言避免TypeScript的错误
        const pluginData = currentPlugin as any;
        const needsFileSelection = 
          pluginData.requires_file_selection || // snake_case (前端使用)
          pluginData.requiresFileSelection ||  // camelCase (package.json中使用)
          currentPlugin.id === 'excel-processor' || // 特殊处理Excel插件
          currentPlugin.id === 'demo-plugin';      // 特殊处理demo插件
        
        console.log('插件是否需要文件选择:', needsFileSelection);
        
        if (method === 'run' && needsFileSelection) {
          setResult({ status: '正在选择文件...' });
          
          // 设置文件过滤器，兼容两种命名风格
          const filters = pluginData.file_filters || pluginData.fileFilters || [];          
          console.log('使用的文件过滤器:', filters);
          
          try {
            // 打开文件选择对话框
            // 通过调用后端 API 来打开文件选择对话框
            console.log('正在打开文件选择对话框...');
            console.log('当前插件:', currentPlugin);
            console.log('插件过滤器:', filters);
            
            // 在这里主动强制设置 requires_file_selection 为 true
            console.log('强制启用文件选择');
            
            // 使用 plugin_call_api 来调用 openFileDialog API
            const apiArgs = {
              title: `选择要用 ${currentPlugin.display_name || currentPlugin.name} 处理的文件`,
              filters: filters
            };
            
            const selectedFilePath = await invoke('plugin_call_api', {
              pluginId: "system",
              apiName: 'openFileDialog',
              args: apiArgs
            });
            
            if (selectedFilePath) {
              // 将文件路径作为参数传递给插件
              // 打印插件元数据以进行调试
              console.log('当前插件元数据:', JSON.stringify(currentPlugin, null, 2));
              console.log('是否需要输出文件选择:', currentPlugin.requires_output_file_selection);
              console.log('插件ID:', currentPlugin.id);
              
              // 首先检查插件是否需要选择输出文件
              // 兼容两种命名风格
              const needsOutputFileSelection = 
                pluginData.requires_output_file_selection || // snake_case
                pluginData.requiresOutputFileSelection ||  // camelCase
                currentPlugin.id === 'excel-processor' || 
                currentPlugin.id === 'demo-plugin';
                
              console.log('插件是否需要输出文件选择:', needsOutputFileSelection);
              
              if (method === 'run' && needsOutputFileSelection) {
                console.log('将显示输出文件选择对话框');
                // 先执行插件处理，但不传输出路径
                setResult({ status: '正在处理文件...' });
                // 使用直接的参数格式，而非嵌套的args对象
                console.log('传递给插件的文件路径:', selectedFilePath);
                const processResult = await invoke('execute_plugin_method', { 
                  pluginId, 
                  method, 
                  args: { filePath: selectedFilePath, ...args } 
                });
                
                // 检查处理结果
                // 对processResult进行类型断言
                const typedResult = processResult as { 
                  success: boolean; 
                  result?: any; 
                  message?: string; 
                  content?: string; // 附加字段
                  stats?: any; // 附加字段
                  data?: string; // 添加data属性支持
                };
                console.log('插件处理结果:', typedResult);
                
                // 强制执行保存对话框，无论结果如何
                // 这是临时的调试修改
                if (true) { // 始终为true，强制执行
                  // 处理成功，打开保存对话框
                  setResult({ status: '正在选择保存位置...' });
                  // 验证输出文件过滤器，兼容两种命名风格
                  const outputFilters = pluginData.output_file_filters || pluginData.outputFileFilters || [];
                  const defaultFileName = pluginData.default_output_file_name || pluginData.defaultOutputFileName || 'output.txt';
                  
                  console.log('输出文件过滤器:', outputFilters);
                  console.log('默认输出文件名:', defaultFileName);
                  
                  const saveApiArgs = {
                    title: `保存 ${currentPlugin.display_name || currentPlugin.name} 处理结果`,
                    defaultName: defaultFileName,
                    filters: outputFilters
                  };
                  
                  try {
                    // 打开保存对话框
                    console.log('调用saveFileDialog API:', saveApiArgs);
                    const outputFilePath = await invoke('plugin_call_api', {
                      pluginId: "system",
                      apiName: 'saveFileDialog',
                      args: saveApiArgs
                    });
                    
                    console.log('保存对话框返回结果:', outputFilePath);
                    console.log('返回路径类型:', typeof outputFilePath);
                    
                    if (outputFilePath) {
                      // 规范化路径格式，确保使用正斜杠
                      const normalizedPath = String(outputFilePath).replace(/\\/g, '/');
                      console.log('标准化路径:', normalizedPath);
                      
                      // 检查路径是否有效
                      if (!normalizedPath || normalizedPath === 'null' || normalizedPath === 'undefined') {
                        setError('获取到无效的输出路径');
                        return;
                      }
                      
                      // 提取所需的字段，使用更正确的参数结构
                      let contentToSave = '';
                      let stats = {};
                      console.log('对象类型资料:', 
                        {
                          '\u5b8c整结果类型': typeof typedResult,
                          '\u5b58在result属性': typedResult.hasOwnProperty('result'),
                          'result类型': typedResult.result ? typeof typedResult.result : 'undefined',
                          '\u5b58在content属性': typedResult.hasOwnProperty('content'),
                          '结果对象键列表': Object.keys(typedResult)
                        }
                      );
                      
                      // 打印所有属性路径以调试
                      console.log('可能的内容属性值:', {
                        'typedResult.result?.content': typedResult.result?.content,
                        'typedResult.content': typedResult.content,
                        'typedResult.data': typedResult.data,
                        'typedResult.result?.data': typedResult.result?.data,
                        'typedResult.result': typedResult.result
                      });

                      // 尝试从多种可能的路径提取内容
                      if (typedResult.result?.content) {
                        contentToSave = typedResult.result.content;
                        stats = typedResult.result.stats || {};
                        console.log('从 result.content 提取内容成功');
                      } else if (typedResult.content) {
                        contentToSave = typedResult.content;
                        stats = typedResult.stats || {};
                        console.log('从 content 提取内容成功');
                      } else if (typedResult.data) {
                        contentToSave = typedResult.data;
                        stats = {};
                        console.log('从 data 提取内容成功');
                      } else if (typedResult.result?.data) {
                        contentToSave = typedResult.result.data;
                        stats = typedResult.result.stats || {};
                        console.log('从 result.data 提取内容成功');
                      } else if (typedResult.result && typeof typedResult.result === 'string') {
                        contentToSave = typedResult.result;
                        stats = {};
                        console.log('从 result字符串提取内容成功');
                      } else if (typeof typedResult === 'string') {
                        contentToSave = typedResult;
                        stats = {};
                        console.log('从字符串结果提取内容成功');
                      } else if (typedResult.result) {
                        // 尝试将整个result对象转为JSON字符串
                        contentToSave = JSON.stringify(typedResult.result, null, 2);
                        stats = {};
                        console.log('将整个result对象转为JSON');
                      }
                      
                      // 检查内容是否存在
                      if (!contentToSave) {
                        console.error('没有找到要保存的内容');
                        console.log('完整的结果对象:', typedResult);
                        setError('没有找到要保存的内容');
                        return;
                      }
                      
                      console.log('要保存的内容长度:', contentToSave.length);
                      
                      // 使用清晰的参数结构
                      const saveParams = {
                        content: contentToSave,
                        stats: stats,
                        outputPath: normalizedPath,  // 使用标准化的路径
                      };
                      
                      console.log('传递给saveResult的参数:', saveParams);
                      const finalResult = await invoke('execute_plugin_method', { 
                        pluginId, 
                        method: 'saveResult', 
                        args: saveParams
                      });
                      
                      setResult(finalResult);
                    } else {
                      // 用户取消保存
                      setResult({ success: false, message: '未选择保存位置' });
                    }
                  } catch (saveErr) {
                    setError(`保存文件失败: ${saveErr}`);
                    setResult(processResult); // 仍然显示处理结果
                  }
                } else {
                  // 处理失败，直接显示错误
                  setResult(processResult);
                }
              } else {
                // 不需要输出文件选择，正常执行插件
                console.log('直接执行插件，传递文件路径:', selectedFilePath);
                const result = await invoke('execute_plugin_method', { 
                  pluginId, 
                  method, 
                  args: { filePath: selectedFilePath, ...args } 
                });
                
                setResult(result);
              }
              setError(null);
            } else {
              // 用户取消选择
              setResult({ success: false, message: '未选择文件' });
              setError(null);
            }
          } catch (fileErr) {
            setError(`文件选择失败: ${fileErr}`);
            setResult(null);
          }
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
