import { invoke } from '@tauri-apps/api/core';

export interface ChromaCollection {
  name: string;
  id: string;
}

export interface ChromaQueryResult {
  ids: string[][];
  documents: string[][];
  metadatas: Array<Array<Record<string, string>>>;
  distances: number[][];
}

export class ChromaService {
  private baseUrl?: string;
  private useEmbedded: boolean;

  constructor(baseUrl?: string, useEmbedded = true) {
    this.baseUrl = baseUrl;
    this.useEmbedded = useEmbedded;
  }

  async startServer(): Promise<string> {
    if (!this.useEmbedded) {
      throw new Error('服务器模式需要手动启动 ChromaDB');
    }
    const url = await invoke<string>('chroma_start_server');
    this.baseUrl = url;
    return url;
  }

  async stopServer(): Promise<void> {
    if (!this.useEmbedded) {
      return;
    }
    await invoke('chroma_stop_server');
    this.baseUrl = undefined;
  }

  async createCollection(name: string): Promise<ChromaCollection> {
    if (this.useEmbedded && !this.baseUrl) {
      await this.startServer();
    }
    return await invoke('chroma_create_collection', {
      name,
      baseUrl: this.baseUrl,
    });
  }

  async addDocuments(
    collectionName: string,
    ids: string[],
    documents: string[],
    metadatas?: Array<Record<string, string>>,
    embeddings?: number[][]
  ): Promise<void> {
    if (this.useEmbedded && !this.baseUrl) {
      await this.startServer();
    }
    return await invoke('chroma_add_documents', {
      collectionName,
      ids,
      documents,
      metadatas,
      embeddings,
      baseUrl: this.baseUrl,
    });
  }

  async query(
    collectionName: string,
    options: {
      queryTexts?: string[];
      queryEmbeddings?: number[][];
      nResults?: number;
      whereMetadata?: Record<string, unknown>;
    }
  ): Promise<ChromaQueryResult> {
    if (this.useEmbedded && !this.baseUrl) {
      await this.startServer();
    }
    return await invoke('chroma_query', {
      collectionName,
      queryTexts: options.queryTexts,
      queryEmbeddings: options.queryEmbeddings,
      nResults: options.nResults,
      whereMetadata: options.whereMetadata,
      baseUrl: this.baseUrl,
    });
  }

  async deleteCollection(collectionName: string): Promise<void> {
    if (this.useEmbedded && !this.baseUrl) {
      await this.startServer();
    }
    return await invoke('chroma_delete_collection', {
      collectionName,
      baseUrl: this.baseUrl,
    });
  }
}

