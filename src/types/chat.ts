export interface Conversation {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
  isPinned?: boolean;
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
}

export interface AssistantSettings {
  identifier: string;
  personaEmoji: string;
  systemPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  responseTone: 'concise' | 'balanced' | 'creative';
  replyLanguage: string;
  autoCitation: boolean;
  streamingEnabled: boolean;
  safeModeEnabled: boolean;
  knowledgeContext: string;
}
