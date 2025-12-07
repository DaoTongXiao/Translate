
import { Button, Tooltip } from "antd";
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined,
  ReloadOutlined,
  HistoryOutlined,
  SettingOutlined,
  LayoutOutlined
} from "@ant-design/icons";
import styles from "./AppHeader.module.scss";
import { Conversation } from "@/types/chat";

interface AppHeaderProps {
  onRefresh: () => void;
  onOpenHistory: () => void;
  onOpenPreferences: () => void;
  isLeftSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
  conversation?: Conversation;
}

const AppHeader = ({ 
  onRefresh, 
  onOpenHistory, 
  onOpenPreferences,
  isLeftSidebarOpen,
  toggleLeftSidebar,
  isRightSidebarOpen,
  toggleRightSidebar,
  conversation
}: AppHeaderProps) => {

  return (
    <header className={styles.appHeader}>
      <div className={`${styles.section} ${styles.left}`}>
        <Tooltip title={isLeftSidebarOpen ? "收起侧边栏" : "展开侧边栏"}>
          <Button 
            type="text" 
            icon={isLeftSidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />} 
            onClick={toggleLeftSidebar}
            className={styles.toggleButton}
          />
        </Tooltip>

        {/* 模型信息和会话标题 */}
        <div className={styles.modelInfo}>
          <p className={styles.modelTitle}>OpenAI · GPT-4.1</p>
          <p className={styles.modelSubtitle}>{conversation ? conversation.title : "空白对话"}</p>
        </div>
        <span className={styles.statusPill}>
          <span className={styles.statusIndicator} aria-hidden />
          已连接
        </span>
      </div>

      <div className={`${styles.section} ${styles.center}`} />

      <div className={`${styles.section} ${styles.right}`}>
        <Tooltip title="刷新当前会话">
          <Button type="text" icon={<ReloadOutlined />} onClick={onRefresh} />
        </Tooltip>
        
        <Tooltip title="查看历史记录">
          <Button type="text" icon={<HistoryOutlined />} onClick={onOpenHistory} />
        </Tooltip>
        
        <Tooltip title="打开偏好设置">
          <Button type="text" icon={<SettingOutlined />} onClick={onOpenPreferences} />
        </Tooltip>

        <div className={styles.divider} />

        <Tooltip title={isRightSidebarOpen ? "收起助手面板" : "展开助手面板"}>
          <Button 
             type="text"
             icon={<LayoutOutlined style={{ transform: isRightSidebarOpen ? 'none' : 'rotate(180deg)' }} />}
             onClick={toggleRightSidebar}
          />
        </Tooltip>
      </div>
    </header>
  );
};

export default AppHeader;
