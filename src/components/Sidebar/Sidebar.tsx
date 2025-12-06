import { Conversation } from "@/types/chat";
import styles from "./Sidebar.module.scss";

interface SidebarProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
}

interface SidebarConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
}

const SidebarConversationItem = ({ conversation, isActive, onSelect }: SidebarConversationItemProps) => {
  return (
    <button
      type="button"
      className={`${styles.conversationItem} ${isActive ? styles.conversationItemActive : ""}`}
      onClick={() => onSelect(conversation.id)}
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
  );
};

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
        <button type="button" className={styles.ghostButton} aria-label="折叠菜单">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18L15 12L9 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21L16.65 16.65" strokeLinecap="round" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="搜索"
          />
        </div>
        <button type="button" className={styles.ghostButton} aria-label="筛选">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6H20L14 13V18L10 20V13L4 6Z" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <button type="button" className={styles.newChatButton} onClick={onCreateConversation}>
        <span aria-hidden>＋</span>
        <span>New Chat</span>
      </button>

      <div className={styles.conversationList} role="list">
        {hasConversation ? (
          conversations.map((conversation) => (
            <SidebarConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === selectedConversationId}
              onSelect={onSelectConversation}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>没有匹配的会话</p>
            <span>尝试调整搜索关键字</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
