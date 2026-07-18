import { ProviderConfig, ChatMessage, ChatConfig } from './types';

const STORAGE_KEY = 'wonderland_custom_providers';

export function loadCustomProviders(): ProviderConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomProviders(providers: ProviderConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
}

export function addCustomProvider(provider: ProviderConfig): void {
  const providers = loadCustomProviders();
  providers.push(provider);
  saveCustomProviders(providers);
}

export function updateCustomProvider(id: string, updates: Partial<ProviderConfig>): void {
  const providers = loadCustomProviders();
  const idx = providers.findIndex(p => p.id === id);
  if (idx !== -1) {
    providers[idx] = { ...providers[idx], ...updates };
    saveCustomProviders(providers);
  }
}

export function removeCustomProvider(id: string): void {
  const providers = loadCustomProviders();
  saveCustomProviders(providers.filter(p => p.id !== id));
}

export function isCustomModel(modelId: string): boolean {
  const customProviders = loadCustomProviders();
  return customProviders.some(p => p.supportedModels.includes(modelId));
}

export function getCustomProviderForModel(modelId: string): ProviderConfig | undefined {
  const customProviders = loadCustomProviders();
  return customProviders.find(p => p.supportedModels.includes(modelId));
}

function parseOpenAIResponse(raw: any): string {
  return raw.choices?.[0]?.message?.content || '';
}

function parseAnthropicResponse(raw: any): string {
  return raw.content?.[0]?.text || '';
}

function parseCustomResponse(raw: any, path?: string): string {
  if (!path) return JSON.stringify(raw);
  const parts = path.split('.');
  let value: any = raw;
  for (const part of parts) {
    if (value == null) return '';
    const arrMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrMatch) {
      value = value[arrMatch[1]]?.[parseInt(arrMatch[2])];
    } else {
      value = value[part];
    }
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function buildOpenAIRequest(messages: ChatMessage[], config: ChatConfig & { model: string }) {
  return {
    model: config.model,
    messages: [
      ...(config.systemInstruction ? [{ role: 'system', content: config.systemInstruction }] : []),
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    temperature: config.temperature ?? 0.7,
    top_p: config.topP ?? 0.9,
    max_tokens: config.maxTokens ?? 4096,
  };
}

function buildAnthropicRequest(messages: ChatMessage[], config: ChatConfig & { model: string }) {
  return {
    model: config.model,
    system: config.systemInstruction || undefined,
    messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    max_tokens: config.maxTokens ?? 1024,
    temperature: config.temperature ?? 0.7,
    top_p: config.topP ?? 0.9,
  };
}

export async function callCustomProvider(
  provider: ProviderConfig,
  messages: ChatMessage[],
  config: ChatConfig,
): Promise<{ content: string; tokens?: number }> {
  const fullConfig = { ...config, model: provider.supportedModels[0] || 'custom' };

  let body: object;
  let parseFn: (raw: any) => string;

  if (provider.responseFormat === 'anthropic') {
    body = buildAnthropicRequest(messages, fullConfig);
    parseFn = parseAnthropicResponse;
  } else if (provider.responseFormat === 'custom') {
    body = buildOpenAIRequest(messages, fullConfig);
    parseFn = (raw) => parseCustomResponse(raw, provider.customResponsePath);
  } else {
    body = buildOpenAIRequest(messages, fullConfig);
    parseFn = parseOpenAIResponse;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (provider.authStyle === 'bearer') {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  } else {
    headers['x-api-key'] = `${provider.apiKey}`;
  }

  const res = await fetch(provider.baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Custom provider HTTP ${res.status}`);
  }

  const data = await res.json();
  return {
    content: parseFn(data),
    tokens: data.usage?.total_tokens,
  };
}
