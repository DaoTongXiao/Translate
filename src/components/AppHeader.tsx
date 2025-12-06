import { Conversation } from "../types/chat";
import styles from "./AppHeader.module.scss";

interface AppHeaderProps {
  activeConversation?: Conversation;
  onRefresh: () => void;
  onOpenHistory: () => void;
  onOpenPreferences: () => void;
}

const AppHeader = ({ activeConversation, onRefresh, onOpenHistory, onOpenPreferences }: AppHeaderProps) => {
  const conversationTitle = activeConversation?.title ?? "等待会话";
  const conversationSummary = activeConversation?.summary ?? "选择或新建会话以开始协作";

  return (
    <header className={styles.appHeader}>
      <div className={`${styles.section} ${styles.left}`}>
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
        <button type="button" className={styles.iconButton} aria-label="刷新当前会话" onClick={onRefresh}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12C3 7.58172 6.58172 4 11 4C12.8363 4 14.5416 4.6512 15.864 5.75736" strokeLinecap="round" />
            <path d="M21 12C21 16.4183 17.4183 20 13 20C11.1637 20 9.45845 19.3488 8.13604 18.2426" strokeLinecap="round" />
            <path d="M7 6L11 2L7 6Z" />
            <path d="M17 18L13 22L17 18Z" />
          </svg>
        </button>
        <button type="button" className={styles.iconButton} aria-label="查看历史记录" onClick={onOpenHistory}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5H21" strokeLinecap="round" />
            <path d="M3 12H21" strokeLinecap="round" />
            <path d="M3 19H15" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" className={styles.iconButton} aria-label="打开偏好设置" onClick={onOpenPreferences}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15A1.65 1.65 0 0 0 21 13.35V10.65A1.65 1.65 0 0 0 19.4 9L17.55 8.35A1.65 1.65 0 0 1 16.5 6.9L16.1 5.05A1.65 1.65 0 0 0 14.45 3.9H9.55A1.65 1.65 0 0 0 7.9 5.05L7.5 6.9A1.65 1.65 0 0 1 6.45 8.35L4.6 9A1.65 1.65 0 0 0 3 10.65V13.35A1.65 1.65 0 0 0 4.6 15L6.45 15.65A1.65 1.65 0 0 1 7.5 17.1L7.9 18.95A1.65 1.65 0 0 0 9.55 20.1H14.45A1.65 1.65 0 0 0 16.1 18.95L16.5 17.1A1.65 1.65 0 0 1 17.55 15.65Z" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
