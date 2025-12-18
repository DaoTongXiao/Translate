use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChromaCollection {
    pub name: String,
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddDocumentsRequest {
    pub ids: Vec<String>,
    pub documents: Vec<String>,
    pub metadatas: Option<Vec<HashMap<String, String>>>,
    pub embeddings: Option<Vec<Vec<f32>>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryRequest {
    pub query_texts: Option<Vec<String>>,
    pub query_embeddings: Option<Vec<Vec<f32>>>,
    pub n_results: Option<usize>,
    pub where_metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub ids: Vec<Vec<String>>,
    pub documents: Vec<Vec<String>>,
    pub metadatas: Vec<Vec<HashMap<String, String>>>,
    pub distances: Vec<Vec<f32>>,
}

pub struct ChromaClient {
    base_url: String,
    client: Arc<reqwest::Client>,
}

impl ChromaClient {
    pub fn new(base_url: Option<String>) -> Self {
        let url = base_url.unwrap_or_else(|| "http://localhost:8000".to_string());
        Self {
            base_url: url,
            client: Arc::new(reqwest::Client::new()),
        }
    }

    pub async fn create_collection(&self, name: &str) -> Result<ChromaCollection, String> {
        let url = format!("{}/api/v1/collections", self.base_url);
        let payload = json!({
            "name": name,
            "get_or_create": true
        });

        let response = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("请求失败: {}", e))?;

        if response.status().is_success() {
            let collection: ChromaCollection = response
                .json()
                .await
                .map_err(|e| format!("解析响应失败: {}", e))?;
            Ok(collection)
        } else {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            Err(format!("创建集合失败: {} - {}", status, text))
        }
    }

    pub async fn add_documents(
        &self,
        collection_name: &str,
        request: AddDocumentsRequest,
    ) -> Result<(), String> {
        let url = format!("{}/api/v1/collections/{}/add", self.base_url, collection_name);
        let payload = json!({
            "ids": request.ids,
            "documents": request.documents,
            "metadatas": request.metadatas,
            "embeddings": request.embeddings
        });

        let response = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("请求失败: {}", e))?;

        if response.status().is_success() {
            Ok(())
        } else {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            Err(format!("添加文档失败: {} - {}", status, text))
        }
    }

    pub async fn query(
        &self,
        collection_name: &str,
        request: QueryRequest,
    ) -> Result<QueryResult, String> {
        let url = format!("{}/api/v1/collections/{}/query", self.base_url, collection_name);
        let mut payload = serde_json::Map::new();
        
        if let Some(query_texts) = request.query_texts {
            payload.insert("query_texts".to_string(), json!(query_texts));
        }
        if let Some(query_embeddings) = request.query_embeddings {
            payload.insert("query_embeddings".to_string(), json!(query_embeddings));
        }
        if let Some(n_results) = request.n_results {
            payload.insert("n_results".to_string(), json!(n_results));
        }
        if let Some(where_metadata) = request.where_metadata {
            payload.insert("where".to_string(), json!(where_metadata));
        }

        let response = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("请求失败: {}", e))?;

        if response.status().is_success() {
            let result: QueryResult = response
                .json()
                .await
                .map_err(|e| format!("解析响应失败: {}", e))?;
            Ok(result)
        } else {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            Err(format!("查询失败: {} - {}", status, text))
        }
    }

    pub async fn delete_collection(&self, collection_name: &str) -> Result<(), String> {
        let url = format!("{}/api/v1/collections/{}", self.base_url, collection_name);
        let response = self
            .client
            .delete(&url)
            .send()
            .await
            .map_err(|e| format!("请求失败: {}", e))?;

        if response.status().is_success() {
            Ok(())
        } else {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            Err(format!("删除集合失败: {} - {}", status, text))
        }
    }
}

