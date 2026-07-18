export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  systemInstruction?: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  authStyle: 'bearer' | 'x-api-key';
  envKey: string;
  buildRequest(messages: ChatMessage[], config: ChatConfig & { model: string }): object;
  parseResponse(rawJson: any): string;
  modelPrefixes: string[];
}
