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

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  icon: string;
  createdAt: string;
}

export interface Model {
  id: string;
  providerId: string;
  name: string;
  modelKey: string;
  isActive: boolean;
  createdAt: string;
}
