import { useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import { listen } from "@tauri-apps/api/event";
import ChatPage from "@/pages/chat";
import SettingsPage from "@/pages/settings";
import "@/styles/global.scss";

// 导航监听组件，用于处理来自 Tauri 菜单的导航事件
function NavigationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    // 监听来自 Tauri 后端的设置导航事件
    const unlisten = listen("navigate-to-settings", () => {
      navigate("/settings");
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <ConfigProvider>
      <Router>
        <NavigationListener />
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
