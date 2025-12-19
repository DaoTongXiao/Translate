import { invoke } from "@tauri-apps/api/core";
import { Conversation, Message, Provider, Model } from "../types/chat";

export async function createConversation(title: string): Promise<string> {
  return await invoke("create_conversation", { title });
}

export async function saveMessage(
  conversationId: string,
  role: string,
  content: string
): Promise<string> {
  return await invoke("save_message", {
    conversationId,
    role,
    content,
  });
}

export async function getHistory(conversationId: string): Promise<Message[]> {
  const messages = await invoke<Message[]>("get_history", { conversationId });
  return messages.map((msg) => ({
    ...msg,
    // Ensure timestamp is properly handled if needed, though string is fine for now
  }));
}

export async function getConversationList(): Promise<Conversation[]> {
  return await invoke("get_conversation_list");
}

export async function deleteConversation(conversationId: string): Promise<void> {
  return await invoke("delete_conversation", { conversationId });
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  return await invoke("update_conversation_title", {
    conversationId,
    title,
  });
}

export async function togglePinConversation(
  conversationId: string
): Promise<boolean> {
  return await invoke("toggle_pin_conversation", { conversationId });
}

// --- Provider & Model wrappers ---
// Note: Backend returns snake_case keys, we might need to map them if struct usage in TS expects camelCase.
// Rust Serde default is the field name. In database.rs I used standard structs.
// Tauri serialization usually preserves field names.
// However, in Rust code:
// pub struct Provider { pub base_url: String, pub api_key: String ... }
// This will resolve to snake_case in JSON: { "base_url": "...", "api_key": "..." }
// While my TS interface uses camelCase: { baseUrl: string, apiKey: string }
// I should either rename struct fields in Rust with #[serde(rename="camelCase")] OR map them here.
// For simplicity and consistency with typical JS projects, I will map them here.

// Internal interfaces for raw backend responses (snake_case)
interface RawProvider {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  icon: string;
  created_at: string;
}

interface RawModel {
  id: string;
  provider_id: string;
  name: string;
  model_key: string;
  is_active: boolean;
  created_at: string;
}

export async function createProvider(
  name: string,
  baseUrl: string,
  apiKey: string,
  icon: string
): Promise<string> {
  return await invoke("create_provider", { name, baseUrl, apiKey, icon });
}

export async function getProviders(): Promise<Provider[]> {
  const raw = await invoke<RawProvider[]>("get_providers");
  return raw.map((p) => ({
    id: p.id,
    name: p.name,
    baseUrl: p.base_url,
    apiKey: p.api_key,
    icon: p.icon,
    createdAt: p.created_at,
  }));
}

export async function deleteProvider(providerId: string): Promise<void> {
  return await invoke("delete_provider", { providerId });
}

export async function createModel(
  providerId: string,
  name: string,
  modelKey: string
): Promise<string> {
  return await invoke("create_model", { providerId, name, modelKey });
}

export async function getModelsByProvider(
  providerId: string
): Promise<Model[]> {
  const raw = await invoke<RawModel[]>("get_models_by_provider", { providerId });
  return raw.map((m) => ({
    id: m.id,
    providerId: m.provider_id,
    name: m.name,
    modelKey: m.model_key,
    isActive: m.is_active,
    createdAt: m.created_at,
  }));
}

export async function getAllModels(): Promise<Model[]> {
  const raw = await invoke<RawModel[]>("get_all_models");
  return raw.map((m) => ({
    id: m.id,
    providerId: m.provider_id,
    name: m.name,
    modelKey: m.model_key,
    isActive: m.is_active,
    createdAt: m.created_at,
  }));
}

export async function deleteModel(modelId: string): Promise<void> {
  return await invoke("delete_model", { modelId });
}

export async function setActiveModel(modelId: string): Promise<void> {
  return await invoke("set_active_model", { modelId });
}

export async function getActiveModel(): Promise<Model | null> {
  const raw = await invoke<RawModel | null>("get_active_model");
  if (!raw) return null;
  return {
    id: raw.id,
    providerId: raw.provider_id,
    name: raw.name,
    modelKey: raw.model_key,
    isActive: raw.is_active,
    createdAt: raw.created_at,
  };
}

export async function chat(
  conversationId: string,
  modelId: string,
  messages: Message[]
): Promise<void> {
  return await invoke("chat", { conversationId, modelId, messages });
}
