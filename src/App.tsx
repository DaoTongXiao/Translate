import { useState, useEffect } from "react";
import './App.css';
import ImageConverter from './components/ImageConverter';
import ExcelProcessor from './components/ExcelProcessor';
import JavaScriptExecutor from './components/JavaScriptExecutor';
import { listen } from '@tauri-apps/api/event';

// 定义应用功能模块接口
interface AppModule {
  id: string;
  name: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

function App() {

  // 定义可用的功能模块
  const modules: AppModule[] = [
    {
      id: 'image',
      name: '图片转换',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      component: <ImageConverter />
    },
    {
      id: 'excel',
      name: 'Excel处理',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 16L12 12L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 12V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      component: <ExcelProcessor />
    },
    {
      id: 'javascript',
      name: 'JS执行器',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3H21V21H3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 16C9 17.6569 7.65685 19 6 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M15 10V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M15 10C15 8.34315 16.3431 7 18 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      component: <JavaScriptExecutor />
    }
    // 未来可以在这里添加更多功能模块
  ];

  const [activeTab, setActiveTab] = useState<string>(modules[0].id);

  // 监听来自Tauri菜单的事件
  useEffect(() => {
    const unlisten = listen('switch-tool', (event) => {
      const toolId = event.payload as string;
      if (modules.some(m => m.id === toolId)) {
        setActiveTab(toolId);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="var(--color-primary)" />
            <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="app-title">文件转换工具</h1>
      </header>
      
      <div className="app-layout">
        <div className="main-content">
          <div className="tab-container">
            {modules.map(module => (
              <div
                key={module.id}
                className={`tab ${activeTab === module.id ? 'active' : ''}`}
                onClick={() => setActiveTab(module.id)}
              >
                <span className="tab-icon">{module.icon}</span>
                <span className="tab-name">{module.name}</span>
              </div>
            ))}
          </div>

          <div className="content-container">
            {modules.find(m => m.id === activeTab)?.component}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
