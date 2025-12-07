import { Conversation, Message } from "@/types/chat";
import styles from "./ChatCanvas.module.scss";

interface ChatCanvasProps {
  conversation?: Conversation;
  messages: Message[];
  draftMessage: string;
  onDraftChange: (value: string) => void;
  onSendMessage: () => void;
}

interface MessageBubbleProps {
  message: Message;
}

const EmptyState = () => (
  <div className={styles.emptyState}>
    <div className={styles.emptyIcon} aria-hidden>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V15C3 16.1046 3.89543 17 5 17H8V21L13 17H19C20.1046 17 21 16.1046 21 15Z" />
      </svg>
    </div>
    <p className={styles.emptyTitle}>这里暂时还没有消息</p>
    <p className={styles.emptySubtitle}>输入内容并按 ⌘ + Enter 发送</p>
  </div>
);

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const bubbleClassName = `${styles.messageBubble} ${
    message.role === "user" ? styles.messageBubbleUser : styles.messageBubbleAssistant
  }`;

  return (
    <div className={bubbleClassName}>
      <div className={styles.messageBody}>
        <p>{message.content}</p>
      </div>
      <span className={styles.timestamp}>{message.timestamp}</span>
    </div>
  );
};

const MessageComposer = ({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !disabled) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={styles.messageComposer}>
      <textarea
        className={styles.composerTextarea}
        value={value}
        placeholder="在这里输入消息，支持使用 / 调出命令"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.composerToolbar}>
        <div className={styles.composerActions}>
          <button type="button" className={styles.ghostButton} aria-label="上传文件">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V15" />
              <path d="M7 10L12 5L17 10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 5V16" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className={styles.ghostButton} aria-label="插入指令">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 5L3 12L8 19" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 5L21 12L16 19" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className={styles.ghostButton} aria-label="语音输入">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3C10.3431 3 9 4.34315 9 6V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V6C15 4.34315 13.6569 3 12 3Z" />
              <path d="M5 10V12C5 15.866 8.13401 19 12 19C15.866 19 19 15.866 19 12V10" />
              <path d="M12 19V22" />
            </svg>
          </button>
        </div>
        <button type="button" className={styles.sendButton} onClick={onSubmit} disabled={disabled}>
          发送
          <span className={styles.shortcutHint}>⌘ ↩</span>
        </button>
      </div>
    </div>
  );
};

const ChatCanvas = ({ conversation, messages, draftMessage, onDraftChange, onSendMessage }: ChatCanvasProps) => {
  const trimmedDraft = draftMessage.trim();
  const isDraftEmpty = trimmedDraft.length === 0;

  return (
    <section className={styles.chatCanvas}>
      <div className={styles.chatScroller}>
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>

      <MessageComposer
        value={draftMessage}
        onChange={onDraftChange}
        onSubmit={onSendMessage}
        disabled={isDraftEmpty || !conversation}
      />
    </section>
  );
};

export default ChatCanvas;
