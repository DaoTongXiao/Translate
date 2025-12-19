use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)] // field might be missing in older records
    pub is_pinned: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub icon: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Model {
    pub id: String,
    pub provider_id: String,
    pub name: String,
    pub model_key: String,
    pub is_active: bool,
    pub created_at: String,
}

const DB_NAME: &str = "chat_history.db";

fn get_db_path<R: Runtime>(app_handle: &AppHandle<R>) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }

    Ok(app_dir.join(DB_NAME))
}

pub fn init_db<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), String> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            is_pinned BOOLEAN DEFAULT 0
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            base_url TEXT NOT NULL,
            api_key TEXT NOT NULL,
            icon TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS models (
            id TEXT PRIMARY KEY,
            provider_id TEXT NOT NULL,
            name TEXT NOT NULL,
            model_key TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(provider_id) REFERENCES providers(id) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn create_conversation<R: Runtime>(app: AppHandle<R>, title: String) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO conversations (id, title, summary, created_at, updated_at, is_pinned) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, title, "", now, now, false],
    )
    .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub fn save_message<R: Runtime>(
    app: AppHandle<R>,
    conversation_id: String,
    role: String,
    content: String,
) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, conversation_id, role, content, now],
    )
    .map_err(|e| e.to_string())?;

    // Update conversation timestamp
    conn.execute(
        "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
        params![now, conversation_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub fn get_history<R: Runtime>(
    app: AppHandle<R>,
    conversation_id: String,
) -> Result<Vec<Message>, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, conversation_id, role, content, timestamp FROM messages WHERE conversation_id = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let message_iter = stmt
        .query_map(params![conversation_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut messages = Vec::new();
    for message in message_iter {
        messages.push(message.map_err(|e| e.to_string())?);
    }

    Ok(messages)
}

#[tauri::command]
pub fn get_conversation_list<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Conversation>, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, title, summary, created_at, updated_at, is_pinned FROM conversations ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let conversation_iter = stmt
        .query_map([], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                summary: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                is_pinned: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut conversations = Vec::new();
    for conversation in conversation_iter {
        conversations.push(conversation.map_err(|e| e.to_string())?);
    }

    Ok(conversations)
}

#[tauri::command]
pub fn delete_conversation<R: Runtime>(
    app: AppHandle<R>,
    conversation_id: String,
) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM conversations WHERE id = ?1",
        params![conversation_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_conversation_title<R: Runtime>(
    app: AppHandle<R>,
    conversation_id: String,
    title: String,
) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE conversations SET title = ?1 WHERE id = ?2",
        params![title, conversation_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn toggle_pin_conversation<R: Runtime>(
    app: AppHandle<R>,
    conversation_id: String,
) -> Result<bool, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // First get current state
    let is_pinned: bool = conn
        .query_row(
            "SELECT is_pinned FROM conversations WHERE id = ?1",
            params![conversation_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let new_state = !is_pinned;

    conn.execute(
        "UPDATE conversations SET is_pinned = ?1 WHERE id = ?2",
        params![new_state, conversation_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(new_state)
}

// --- Providers and Models Commands ---

#[tauri::command]
pub fn create_provider<R: Runtime>(
    app: AppHandle<R>,
    name: String,
    base_url: String,
    api_key: String,
    icon: String,
) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO providers (id, name, base_url, api_key, icon, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, name, base_url, api_key, icon, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub fn get_providers<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Provider>, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, base_url, api_key, icon, created_at FROM providers ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(Provider {
                id: row.get(0)?,
                name: row.get(1)?,
                base_url: row.get(2)?,
                api_key: row.get(3)?,
                icon: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for item in iter {
        result.push(item.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn delete_provider<R: Runtime>(app: AppHandle<R>, provider_id: String) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM providers WHERE id = ?1", params![provider_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_model<R: Runtime>(
    app: AppHandle<R>,
    provider_id: String,
    name: String,
    model_key: String,
) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO models (id, provider_id, name, model_key, is_active, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, provider_id, name, model_key, false, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub fn get_models_by_provider<R: Runtime>(
    app: AppHandle<R>,
    provider_id: String,
) -> Result<Vec<Model>, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, provider_id, name, model_key, is_active, created_at FROM models WHERE provider_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map(params![provider_id], |row| {
            Ok(Model {
                id: row.get(0)?,
                provider_id: row.get(1)?,
                name: row.get(2)?,
                model_key: row.get(3)?,
                is_active: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for item in iter {
        result.push(item.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn get_all_models<R: Runtime>(app: AppHandle<R>) -> Result<Vec<Model>, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, provider_id, name, model_key, is_active, created_at FROM models ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(Model {
                id: row.get(0)?,
                provider_id: row.get(1)?,
                name: row.get(2)?,
                model_key: row.get(3)?,
                is_active: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for item in iter {
        result.push(item.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
pub fn delete_model<R: Runtime>(app: AppHandle<R>, model_id: String) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM models WHERE id = ?1", params![model_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_active_model<R: Runtime>(app: AppHandle<R>, model_id: String) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Transaction to ensure only one active
    conn.execute("UPDATE models SET is_active = 0", [])
        .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE models SET is_active = 1 WHERE id = ?1",
        params![model_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_active_model<R: Runtime>(app: AppHandle<R>) -> Result<Option<Model>, String> {
    let db_path = get_db_path(&app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, provider_id, name, model_key, is_active, created_at FROM models WHERE is_active = 1 LIMIT 1")
        .map_err(|e| e.to_string())?;

    let mut iter = stmt
        .query_map([], |row| {
            Ok(Model {
                id: row.get(0)?,
                provider_id: row.get(1)?,
                name: row.get(2)?,
                model_key: row.get(3)?,
                is_active: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    if let Some(result) = iter.next() {
        Ok(Some(result.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ModelWithProvider {
    pub model_id: String,
    pub model_name: String,
    pub model_key: String,
    pub provider_url: String,
    pub provider_key: String,
}

pub fn get_model_with_provider<R: Runtime>(
    app: &AppHandle<R>,
    model_id: &str,
) -> Result<ModelWithProvider, String> {
    let db_path = get_db_path(app)?;
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT m.id, m.name, m.model_key, p.base_url, p.api_key 
         FROM models m 
         JOIN providers p ON m.provider_id = p.id 
         WHERE m.id = ?1",
        params![model_id],
        |row| {
            Ok(ModelWithProvider {
                model_id: row.get(0)?,
                model_name: row.get(1)?,
                model_key: row.get(2)?,
                provider_url: row.get(3)?,
                provider_key: row.get(4)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}
