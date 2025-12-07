import { Conversation } from "@/types/chat";
import { Input, Button } from "antd";
import { PlusOutlined, SearchOutlined, SettingOutlined } from "@ant-design/icons";
import { invoke } from "@tauri-apps/api/core";
import styles from "./Sidebar.module.scss";

interface SidebarProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
}

const Sidebar = ({
  conversations,
  selectedConversationId,
  searchTerm,
  onSearchTermChange,
  onSelectConversation,
  onCreateConversation,
}: SidebarProps) => {
  const hasConversation = conversations.length > 0;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topBar}>
        <div className={styles.titleGroup}>
          <span className={styles.appIcon} aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7V13L15 15" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className={styles.title}>对话</p>
            <p className={styles.subtitle}>快速切换会话</p>
          </div>
        </div>
      </div>

      <div className={styles.searchRow}>
        <Input
          prefix={<SearchOutlined className={styles.searchIcon} />}
          placeholder="搜索"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          variant="filled"
          className={styles.searchInput}
        />
      </div>

      <Button 
        type="primary" 
        block 
        icon={<PlusOutlined />} 
        onClick={onCreateConversation}
        className={styles.newChatButton}
      >
        New Chat
      </Button>

      <div className={styles.conversationList} role="list">
        {hasConversation ? (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={`${styles.conversationItem} ${conversation.id === selectedConversationId ? styles.conversationItemActive : ""}`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className={styles.conversationHeader}>
                <span className={styles.conversationTitle}>{conversation.title}</span>
                {conversation.isPinned && (
                  <span className={styles.conversationPin} aria-label="已置顶">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                       <path d="M17 3L21 7L14 14L10 14L10 10L17 3Z" />
                       <path d="M7 21L11 17" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
              </div>
              <p className={styles.conversationSummary}>{conversation.summary}</p>
              <span className={styles.conversationSubtitle}>{conversation.updatedAt}</span>
            </button>
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>没有匹配的会话</p>
            <span>尝试调整搜索关键字</span>
          </div>
        )}
      </div>


      <div className={styles.footer}>
        <div className={styles.settingsButton} onClick={() => invoke("open_settings_window")}>
            <SettingOutlined />
            <span>设置</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
