import { useMemo, useState } from "react";
import styles from "./ChatPage.module.scss";
import Sidebar from "@/components/Sidebar/Sidebar";
import ChatCanvas from "@/components/ChatCanvas/ChatCanvas";
import AssistantPanel from "@/components/AssistantPanel/AssistantPanel";
import AppHeader from "@/components/Header/AppHeader";
import { AssistantSettings, Conversation, Message } from "@/types/chat";

const baseConversations: Conversation[] = [
  {
    id: "default",
    title: "默认会话",
    summary: "空白对话",
    updatedAt: "刚刚",
    isPinned: true,
  },
  {
    id: "strategy",
    title: "产品策略讨论",
    summary: "聚焦企业级模型定价方案",
    updatedAt: "昨天",
  },
  {
    id: "translate",
    title: "技术文档翻译",
    summary: "将 API 文档翻译为中文",
    updatedAt: "周三",
  },
  {
    id: "meeting",
    title: "例会纪要生成",
    summary: "根据会议录音快速生成要点",
    updatedAt: "周一",
  },
];

const seededMessages: Record<string, Message[]> = {
  strategy: [
    {
      id: "msg-strategy-1",
      role: "assistant",
      content: "今天需要聚焦企业定价策略，我会帮你梳理风险与机会。",
      timestamp: "09:12",
    },
    {
      id: "msg-strategy-2",
      role: "user",
      content: "请列一个 3 层结构的讨论纲要。",
      timestamp: "09:15",
    },
  ],
  translate: [
    {
      id: "msg-translate-1",
      role: "assistant",
      content: "我会以术语表为依据，保持专有名词一致。",
      timestamp: "22:01",
    },
  ],
  meeting: [],
  default: [],
};

const defaultSettings: AssistantSettings = {
  identifier: "default",
  personaEmoji: "🤖",
  systemPrompt: "",
  temperature: 0.2,
  maxOutputTokens: 1024,
  responseTone: "balanced",
  replyLanguage: "默认",
  autoCitation: true,
  streamingEnabled: true,
  safeModeEnabled: true,
  knowledgeContext: "默认",
};

const formatTime = () =>
  new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(new Date());

function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(baseConversations);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>(seededMessages);
  const [selectedConversationId, setSelectedConversationId] = useState<string>(baseConversations[0]?.id ?? "");
  const [searchTerm, setSearchTerm] = useState("");
  const [composerDraft, setComposerDraft] = useState("");
  const [settings, setSettings] = useState<AssistantSettings>(defaultSettings);
  
  // Sidebar visibility state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

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

  const handleCreateConversation = () => {
    const newId = `chat-${Date.now()}`;
    const newConversation: Conversation = {
      id: newId,
      title: "新建会话",
      summary: "空白对话",
      updatedAt: "刚刚",
    };

    setConversations((previous) => [newConversation, ...previous]);
    setMessagesByConversation((previous) => ({ ...previous, [newId]: [] }));
    setSelectedConversationId(newId);
    setComposerDraft("");
  };

  const handleSendMessage = () => {
    if (!selectedConversation || composerDraft.trim().length === 0) {
      return;
    }

    const trimmed = composerDraft.trim();
    const timestamp = formatTime();
    const message: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp,
    };

    const assistantEcho: Message = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: `${settings.personaEmoji} 已记录你的输入，随时可以继续`,
      timestamp,
    };

    setMessagesByConversation((previous) => {
      const history = previous[selectedConversation.id] ?? [];
      return {
        ...previous,
        [selectedConversation.id]: [...history, message, assistantEcho],
      };
    });

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === selectedConversation.id
          ? {
              ...conversation,
              summary: trimmed.slice(0, 24) || conversation.summary,
              updatedAt: "刚刚",
            }
          : conversation
      )
    );

    setComposerDraft("");
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
    console.info("[App] 打开历史记录");
  };

  const handleOpenPreferences = () => {
    console.info("[App] 打开偏好设置");
  };

  const activeMessages = selectedConversation
    ? messagesByConversation[selectedConversation.id] ?? []
    : [];

  return (
    <div className={styles.appLayout}>
        {/* 左侧边栏 - 独立占满全高 */}
        <div className={`${styles.sidebarContainer} ${!isLeftSidebarOpen ? styles.collapsed : ""}`}>
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
            conversation={selectedConversation}
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

            <div className={`${styles.assistantPanelContainer} ${!isRightSidebarOpen ? styles.collapsed : ""}`}>
               <AssistantPanel settings={settings} onChange={handleSettingsUpdate} />
            </div>
          </div>
        </div>
      </div>
  );
}

export default ChatPage;
