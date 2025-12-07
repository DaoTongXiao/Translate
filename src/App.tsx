import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";

import ChatPage from "@/pages/chat";
import SettingsPage from "@/pages/settings";
import "@/styles/global.scss";

function App() {
  return (
    <ConfigProvider>
      <Router>
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
