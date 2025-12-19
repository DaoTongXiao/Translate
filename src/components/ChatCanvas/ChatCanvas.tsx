import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Conversation, Message } from '@/types/chat';
import styles from './ChatCanvas.module.scss';

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
    <div className={styles.logoPlace}>
        <AIIcon size={40} />
    </div>
    <h3>How can I help you today?</h3>
  </div>
);

import MarkdownMessage from './MarkdownMessage';
import AIIcon from '@/components/icons/AIIcon';
import { UserOutlined, SendOutlined } from '@ant-design/icons';

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`${styles.messageRow} ${isUser ? styles.userRow : styles.assistantRow}`}>
       {/* Avatar */}
       <div className={`${styles.avatar} ${isUser ? styles.userAvatar : styles.assistantAvatar}`}>
          {isUser ? (
            <UserOutlined />
          ) : (
            <AIIcon size={20} />
          )}
       </div>

       {/* Content */}
       <div className={styles.messageContent}>
          {!isUser && <span className={styles.senderName}>AI Assistant</span>}
          <div className={`${styles.messageBubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
             {isUser ? (
                 <p style={{margin: 0}}>{message.content}</p>
             ) : (
                 <MarkdownMessage content={message.content} role="assistant" />
             )}
          </div>
          {/* <span className={styles.timestamp}>{message.timestamp}</span> */}
       </div>
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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用不需要的扩展，保持简洁的输入体验
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Placeholder.configure({
        placeholder: '在这里输入消息，支持使用 / 调出命令',
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: styles.composerTextarea,
      },
      handleKeyDown: (_view, event) => {
        // ⌘ + Enter 或 Ctrl + Enter 发送消息
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !disabled) {
          event.preventDefault();
          onSubmit();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // 获取纯文本内容同步到外部状态
      const text = editor.getText();
      onChange(text);
    },
  });

  // 当外部 value 变化时同步编辑器内容（例如发送后清空）
  useEffect(() => {
    if (editor && value === '' && editor.getText() !== '') {
      editor.commands.clearContent();
    }
  }, [editor, value]);

  return (
    <div className={styles.messageComposerWrapper}>
        <div className={styles.messageComposer}>
          <EditorContent editor={editor} />
          <div className={styles.composerToolbar}>
            <div className={styles.composerActions}>
              {/* Add back tool buttons if needed, simplified for Cherry look */}
              <button type="button" className={styles.ghostButton} aria-label="Attachments">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
            </div>
            <button type="button" className={styles.sendButton} onClick={onSubmit} disabled={disabled || !value.trim()}>
               <SendOutlined />
            </button>
          </div>
        </div>
    </div>
  );
};

const ChatCanvas = ({
  conversation,
  messages,
  draftMessage,
  onDraftChange,
  onSendMessage,
}: ChatCanvasProps) => {
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
