use crate::database::{self, Message};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Runtime;

#[derive(Serialize, Deserialize, Debug)]
struct ChatRequestMessage {
    role: String,
    content: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatRequestMessage>,
    stream: bool,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct ChatResponseChoice {
    #[serde(default)]
    message: Option<ChatRequestMessage>,
    #[serde(default)]
    delta: ChatResponseDelta,
}

#[derive(Deserialize, Debug, Default)]
struct ChatResponseDelta {
    #[serde(default)]
    content: String,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct ChatResponse {
    choices: Vec<ChatResponseChoice>,
}

#[derive(Clone, Serialize)]
struct StreamPayload {
    id: String,
    chunk: String,
    done: bool,
}

#[tauri::command]
pub async fn chat<R: Runtime>(
    app: AppHandle<R>,
    conversation_id: String,
    model_id: String,
    messages: Vec<Message>,
) -> Result<(), String> {
    use futures_util::StreamExt;
    use tauri::Emitter;

    // 1. Get model & provider info
    let model_info = database::get_model_with_provider(&app, &model_id)?;

    // 2. Prepare request
    let client = reqwest::Client::new();
    let url = format!(
        "{}/chat/completions",
        model_info.provider_url.trim_end_matches('/')
    );

    let api_messages: Vec<ChatRequestMessage> = messages
        .into_iter()
        .map(|m| ChatRequestMessage {
            role: m.role,
            content: m.content,
        })
        .collect();

    let request_body = ChatRequest {
        model: model_info.model_key,
        messages: api_messages,
        stream: true,
    };

    // 3. Call API
    let res = client
        .post(&url)
        .header(
            "Authorization",
            format!("Bearer {}", model_info.provider_key),
        )
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("API Error: {}", res.status()));
    }

    let mut stream = res.bytes_stream();
    let event_name = format!("chat-stream://{}", conversation_id);

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk);

        for line in chunk_str.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            if line == "data: [DONE]" {
                app.emit(
                    &event_name,
                    StreamPayload {
                        id: conversation_id.clone(),
                        chunk: "".to_string(),
                        done: true,
                    },
                )
                .map_err(|e| e.to_string())?;
                break;
            }
            if line.starts_with("data: ") {
                let json_str = &line[6..];
                if let Ok(response) = serde_json::from_str::<ChatResponse>(json_str) {
                    if let Some(choice) = response.choices.first() {
                        // Some providers use `delta` instead of `message` for streaming
                        // But our struct is ChatResponse -> ChatResponseChoice -> message: ChatRequestMessage
                        // We need to adjust structs for streaming if they differ.
                        // Standard OpenAI stream: choices[0].delta.content
                        // Standard OpenAI non-stream: choices[0].message.content
                        // We should check if we need separate structs or optional fields.
                        // For now let's assume `message` field maps to `delta` in JSON or we change the struct.
                        // Let's modify the structs below.

                        let content = &choice.delta.content;
                        if !content.is_empty() {
                            app.emit(
                                &event_name,
                                StreamPayload {
                                    id: conversation_id.clone(),
                                    chunk: content.clone(),
                                    done: false,
                                },
                            )
                            .map_err(|e| e.to_string())?;
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
