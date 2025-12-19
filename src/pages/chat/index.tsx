import { useMemo, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import styles from './ChatPage.module.scss';
import Sidebar from '@/components/Sidebar/Sidebar';
import ChatCanvas from '@/components/ChatCanvas/ChatCanvas';
import AssistantPanel from '@/components/AssistantPanel/AssistantPanel';
import AppHeader from '@/components/Header/AppHeader';
import { AssistantSettings, Conversation, Message } from '@/types/chat';
import * as db from '@/services/db';
import { listen } from '@tauri-apps/api/event';

interface StreamPayload {
  id: string;
  chunk: string;
  done: boolean;
}


const defaultSettings: AssistantSettings = {
  identifier: 'default',
  personaEmoji: '🤖',
  systemPrompt: '',
  temperature: 0.2,
  maxOutputTokens: 1024,
  responseTone: 'balanced',
  replyLanguage: '默认',
  autoCitation: true,
  streamingEnabled: true,
  safeModeEnabled: true,
  knowledgeContext: '默认',
};

const formatTime = () =>
  new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date());

function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>({});
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [composerDraft, setComposerDraft] = useState('');
  const [settings, setSettings] = useState<AssistantSettings>(defaultSettings);

  // Sidebar visibility state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);



  // Define data fetching functions with useCallback
  const loadConversations = useCallback(async () => {
    try {
      const list = await db.getConversationList();
      setConversations(list);
      // Select first conversation if none selected
      if (list.length > 0) {
        // Only auto-select if we really need to, e.g. on initial load.
        // But here we might want to check if selectedConversationId matches anything.
        // For now, let's keep it simple: if nothing selected, select first.
        setSelectedConversationId((prev) => (prev ? prev : list[0].id));
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  const loadHistory = useCallback(async (id: string) => {
    try {
      const history = await db.getHistory(id);
      setMessagesByConversation((prev) => ({ ...prev, [id]: history }));
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      await loadConversations();
    };
    fetchConversations();
  }, [loadConversations]);

  // Load history when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      const fetchHistory = async () => {
        await loadHistory(selectedConversationId);
      };
      fetchHistory();
    }
  }, [selectedConversationId, loadHistory]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId]
  );



  const filteredConversations = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      return (
        conversation.title.toLowerCase().includes(keyword) ||
        conversation.summary.toLowerCase().includes(keyword)
      );
    });
  }, [conversations, searchTerm]);

  const handleCreateConversation = async () => {
    const title = '新会话';
    try {
      const newId = await db.createConversation(title);
      const newConversation: Conversation = {
        id: newId,
        title,
        summary: '',
        updatedAt: '刚刚',
      };
      setConversations((prev) => [newConversation, ...prev]);
      setMessagesByConversation((prev) => ({ ...prev, [newId]: [] }));
      setSelectedConversationId(newId);
      setComposerDraft('');
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || composerDraft.trim().length === 0) {
      return;
    }

    const trimmed = composerDraft.trim();
    // Optimistic update
    const tempUserMsgId = `temp-${Date.now()}`;
    const timestamp = formatTime();
    
    const userMessage: Message = {
      id: tempUserMsgId,
      role: 'user',
      content: trimmed,
      timestamp,
    };

    setMessagesByConversation((prev) => {
      const history = prev[selectedConversationId] ?? [];
      return { ...prev, [selectedConversationId]: [...history, userMessage] };
    });
    setComposerDraft('');

    try {
      // Save user message
      await db.saveMessage(selectedConversationId, 'user', trimmed);
      
      // Get active model
      const activeModel = await db.getActiveModel();
      if (!activeModel) {
        // Fallback or error
        const errorMsg = "No active model selected. Please configure a model in Settings.";
        await db.saveMessage(selectedConversationId, 'assistant', errorMsg);
        await loadHistory(selectedConversationId);
        return;
      }

      // Call LLM with streaming events
      // We need to listen to events inside handleSendMessage or setup a listener.
      // Since db.chat is async and might not return until done if we awaited it fully (but we changed backend to return stream?)
      // Wait, backend `chat` is async and returns Result<(), String>.
      // It emits events during execution.
      // So we should:
      // 1. Setup listener.
      // 2. Call db.chat.
      // 3. Update UI as events come in.

      let currentMessageContent = '';
      
      const unlisten = await listen<StreamPayload>(`chat-stream://${selectedConversationId}`, (event) => {
        const { chunk, done } = event.payload;
        if (done) {
             // We can optionally unlisten here or after await chat returns.
             return;
        }
        currentMessageContent += chunk;
        
        // Update UI
        setMessagesByConversation((prev) => {
            const history = prev[selectedConversationId] ?? [];
            const lastMsg = history[history.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.id === 'temp-assistant') {
                // Update existing temp message
                const updatedMsg = { ...lastMsg, content: currentMessageContent };
                const newHistory = [...history];
                newHistory[newHistory.length - 1] = updatedMsg;
                return { ...prev, [selectedConversationId]: newHistory };
            } else {
                 // Should not happen if we add temp message before.
                 return prev;
            }
        });
      });

      // Add a placeholder assistant message to state so we can stream into it
      setMessagesByConversation((prev) => {
          const history = prev[selectedConversationId] ?? [];
          const tempAssistantMsg: Message = {
              id: 'temp-assistant',
              role: 'assistant',
              content: '...', // Initial placeholder
              timestamp: formatTime(),
          };
          return { ...prev, [selectedConversationId]: [...history, tempAssistantMsg] };
      });

      // Backend chat expects Vec<Message>. history includes the just-saved user message.
      const history = await db.getHistory(selectedConversationId);
      
      // We need to call chat. 
      // Note: `db.chat` in frontend wrapper returns Promise<string>. 
      // We should update `db.chat` signature in db.ts to return Promise<void> as it's streaming now.
      
      try {
        await db.chat(selectedConversationId, activeModel.id, history);
      } catch (err) {
         console.error("Chat error", err);
         // handle error
      } finally {
        unlisten();
      }
      
      // Save full AI response to DB
      // We need to save the final content.
      // `currentMessageContent` captured in closure might satisfy? 
      // Actually `currentMessageContent` is local var, updated in callback. 
      // wait, `currentMessageContent += chunk` inside callback updates the closure var? Yes if in same scope.
      
      if (currentMessageContent) {
          await db.saveMessage(selectedConversationId, 'assistant', currentMessageContent);
      }
      
      // Reload history
      await loadHistory(selectedConversationId);
      await loadConversations();
      
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMsg = `Error: ${error}`;
      // Optionally save error as assistant message
      await db.saveMessage(selectedConversationId, 'assistant', errorMsg);
      await loadHistory(selectedConversationId);
    }
  };

  const handleSettingsUpdate = (update: Partial<AssistantSettings>) => {
    setSettings((previous) => ({ ...previous, ...update }));
  };

  const handleRefreshConversation = () => {
    if (!selectedConversation) {
      return;
    }

    setMessagesByConversation((previous) => {
      const history = previous[selectedConversation.id] ?? [];
      return { ...previous, [selectedConversation.id]: [...history] };
    });
  };

  const handleOpenHistoryDrawer = () => {
    console.info('[App] 打开历史记录');
  };

  const handleOpenPreferences = () => {
    invoke('open_settings_window');
  };

  const activeMessages = selectedConversation
    ? (messagesByConversation[selectedConversation.id] ?? [])
    : [];

  const [activeModelName, setActiveModelName] = useState<string>('');

  const loadActiveModel = useCallback(async () => {
    try {
      const model = await db.getActiveModel();
      if (model) {
        // Need to fetch provider name too for full "Provider · Model" format?
        // Model struct has provider_id. We can fetch provider distinct or just show model name.
        // Let's just show model name for now, or fetch provider.
        // Actually, backend get_active_model returns Model struct.
        // We can create a db helper to get provider by id if needed.
        // For now, let's just display "Model Name" or "Provider Name · Model Name" if we have it.
        // Ideally we should get extended info.
        // But for speed, let's just use model.name. 
        // Or we can invoke get_providers and find the matching one.
        setActiveModelName(model.name);
      } else {
        setActiveModelName('');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const fetchModel = async () => {
      await loadActiveModel();
    };
    fetchModel();
  }, [loadActiveModel]);

  // Refresh active model when window gains focus or on interval? 
  // For now, just load on mount. 
  // Maybe explicit refresh when settings change?
  // We can expose loadActiveModel to handleOpenPreferences onClose? 
  // Or just rely on re-mount if navigating. 
  
  return (
    <div className={styles.appLayout}>
      {/* 左侧边栏 - 独立占满全高 */}
      <div className={`${styles.sidebarContainer} ${!isLeftSidebarOpen ? styles.collapsed : ''}`}>
        <Sidebar
          conversations={filteredConversations}
          selectedConversationId={selectedConversationId}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSelectConversation={setSelectedConversationId}
          onCreateConversation={handleCreateConversation}
        />
      </div>

      {/* 右侧区域 - 包含 header 和主内容 */}
      <div className={styles.rightSection}>
        <AppHeader
          onRefresh={handleRefreshConversation}
          onOpenHistory={handleOpenHistoryDrawer}
          onOpenPreferences={handleOpenPreferences}
          isLeftSidebarOpen={isLeftSidebarOpen}
          toggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          isRightSidebarOpen={isRightSidebarOpen}
          toggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
          activeModelName={activeModelName}
        />

        <div className={styles.appShell}>
          <div className={styles.mainContent}>
            <main className={styles.chatMain}>
              <ChatCanvas
                conversation={selectedConversation}
                messages={activeMessages}
                draftMessage={composerDraft}
                onDraftChange={setComposerDraft}
                onSendMessage={handleSendMessage}
              />
            </main>
          </div>

          <div
            className={`${styles.assistantPanelContainer} ${!isRightSidebarOpen ? styles.collapsed : ''}`}
          >
            <AssistantPanel settings={settings} onChange={handleSettingsUpdate} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
