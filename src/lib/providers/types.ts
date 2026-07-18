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
  apiKey: string;
  responseFormat: 'openai' | 'anthropic' | 'custom';
  customResponsePath?: string;
  supportedModels: string[];
}
