import { Button, Switch, Select } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import styles from "./Settings.module.scss";

const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.settingsPage}>
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate(-1)}
        className={styles.backButton}
      >
        返回
      </Button>
      
      <h1>设置</h1>

      <div className={styles.section}>
        <h2>通用</h2>
        <div className={styles.row}>
          <label>主题模式</label>
          <Select defaultValue="system" style={{ width: 120 }} options={[
            { value: 'light', label: '浅色' },
            { value: 'dark', label: '深色' },
            { value: 'system', label: '跟随系统' },
          ]} />
        </div>
        <div className={styles.row}>
          <label>开机自启动</label>
          <Switch defaultChecked />
        </div>
      </div>

      <div className={styles.section}>
        <h2>模型设置</h2>
        <div className={styles.row}>
          <label>默认模型</label>
          <Select defaultValue="gpt-4" style={{ width: 200 }} options={[
            { value: 'gpt-4', label: 'GPT-4' },
            { value: 'gpt-3.5', label: 'GPT-3.5 Turbo' },
            { value: 'local', label: 'Local LLM' },
          ]} />
        </div>
        <div className={styles.row}>
          <label>API Key</label>
          <Button type="link">配置 API Key</Button>
        </div>
      </div>

      <div className={styles.section}>
        <h2>关于</h2>
        <div className={styles.row}>
          <label>版本</label>
          <span>v0.1.0</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
