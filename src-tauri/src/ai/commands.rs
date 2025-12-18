use crate::ai::chromadb::{ChromaClient, AddDocumentsRequest, QueryRequest};
use crate::ai::chromadb_server::ChromaServer;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, State};

type ChromaServerState = Arc<tokio::sync::Mutex<Option<Arc<ChromaServer>>>>;

fn get_client(base_url: Option<String>) -> ChromaClient {
    ChromaClient::new(base_url)
}

async fn get_embedded_base_url(server_state: &State<'_, ChromaServerState>) -> Option<String> {
    server_state
        .lock()
        .await
        .as_ref()
        .map(|server| server.base_url())
}

#[tauri::command]
pub async fn chroma_start_server(
    app: AppHandle,
    server_state: State<'_, ChromaServerState>,
) -> Result<String, String> {
    let mut state = server_state.lock().await;
    if state.is_none() {
        let server = Arc::new(ChromaServer::new(&app, 8000)?);
        server.start()?;
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
        *state = Some(server.clone());
        Ok(server.base_url())
    } else {
        Ok(state.as_ref().unwrap().base_url())
    }
}

#[tauri::command]
pub async fn chroma_stop_server(
    server_state: State<'_, ChromaServerState>,
) -> Result<(), String> {
    let mut state = server_state.lock().await;
    if let Some(server) = state.take() {
        server.stop()?;
    }
    Ok(())
}

#[tauri::command]
pub async fn chroma_create_collection(
    name: String,
    base_url: Option<String>,
    server_state: State<'_, ChromaServerState>,
) -> Result<serde_json::Value, String> {
    let embedded_url = get_embedded_base_url(&server_state).await;
    let url = base_url.or(embedded_url);
    let client = get_client(url);
    let collection = client.create_collection(&name).await?;
    Ok(serde_json::json!({
        "name": collection.name,
        "id": collection.id
    }))
}

#[tauri::command]
pub async fn chroma_add_documents(
    collection_name: String,
    ids: Vec<String>,
    documents: Vec<String>,
    metadatas: Option<Vec<HashMap<String, String>>>,
    embeddings: Option<Vec<Vec<f32>>>,
    base_url: Option<String>,
    server_state: State<'_, ChromaServerState>,
) -> Result<(), String> {
    let embedded_url = get_embedded_base_url(&server_state).await;
    let url = base_url.or(embedded_url);
    let client = get_client(url);
    let request = AddDocumentsRequest {
        ids,
        documents,
        metadatas,
        embeddings,
    };
    client.add_documents(&collection_name, request).await
}

#[tauri::command]
pub async fn chroma_query(
    collection_name: String,
    query_texts: Option<Vec<String>>,
    query_embeddings: Option<Vec<Vec<f32>>>,
    n_results: Option<usize>,
    where_metadata: Option<HashMap<String, Value>>,
    base_url: Option<String>,
    server_state: State<'_, ChromaServerState>,
) -> Result<serde_json::Value, String> {
    let embedded_url = get_embedded_base_url(&server_state).await;
    let url = base_url.or(embedded_url);
    let client = get_client(url);
    let request = QueryRequest {
        query_texts,
        query_embeddings,
        n_results,
        where_metadata,
    };
    let result = client.query(&collection_name, request).await?;
    Ok(serde_json::json!({
        "ids": result.ids,
        "documents": result.documents,
        "metadatas": result.metadatas,
        "distances": result.distances
    }))
}

#[tauri::command]
pub async fn chroma_delete_collection(
    collection_name: String,
    base_url: Option<String>,
    server_state: State<'_, ChromaServerState>,
) -> Result<(), String> {
    let embedded_url = get_embedded_base_url(&server_state).await;
    let url = base_url.or(embedded_url);
    let client = get_client(url);
    client.delete_collection(&collection_name).await
}

