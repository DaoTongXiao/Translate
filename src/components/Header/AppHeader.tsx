import { Conversation } from "@/types/chat";
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

interface AppHeaderProps {
  activeConversation?: Conversation;
  onRefresh: () => void;
  onOpenHistory: () => void;
  onOpenPreferences: () => void;
  isLeftSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  isRightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
}

const AppHeader = ({ 
  activeConversation, 
  onRefresh, 
  onOpenHistory, 
  onOpenPreferences,
  isLeftSidebarOpen,
  toggleLeftSidebar,
  isRightSidebarOpen,
  toggleRightSidebar
}: AppHeaderProps) => {
  const conversationTitle = activeConversation?.title ?? "等待会话";
  const conversationSummary = activeConversation?.summary ?? "选择或新建会话以开始协作";

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
        
        <span className={styles.brandIcon} aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 7V13L15 15" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <p className={styles.brandTitle}>OpenAI · GPT-4.1</p>
          <p className={styles.brandSubtitle}>OpenRouter 工作区</p>
        </div>
      </div>

      <div className={`${styles.section} ${styles.center}`}>
        <span className={styles.statusPill}>
          <span className={styles.statusIndicator} aria-hidden />
          已连接
        </span>
        <div className={styles.statusContext}>
          <p className={styles.statusTitle}>{conversationTitle}</p>
          <p className={styles.statusSubtitle}>{conversationSummary}</p>
        </div>
      </div>

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
