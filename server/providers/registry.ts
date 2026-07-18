import { ProviderConfig, ChatMessage, ChatConfig } from './types';

function buildOpenAIRequest(messages: ChatMessage[], config: ChatConfig & { model: string }) {
  return {
    model: config.model,
    messages: [
      ...(config.systemInstruction ? [{ role: 'system', content: config.systemInstruction }] : []),
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ],
    temperature: config.temperature ?? 0.7,
    top_p: config.topP ?? 0.9,
    max_tokens: config.maxTokens ?? 4096,
  };
}

function parseOpenAIResponse(raw: any): string {
  return raw.choices?.[0]?.message?.content || 'Empty response received.';
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

function parseAnthropicResponse(raw: any): string {
  return raw.content?.[0]?.text || 'Empty response received.';
}

function buildCohereRequest(messages: ChatMessage[], config: ChatConfig & { model: string }) {
  const lastMsg = messages[messages.length - 1];
  const chatHistory = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
    message: m.content,
  }));
  return {
    model: config.model,
    message: lastMsg?.content || '',
    chatHistory,
    preamble: config.systemInstruction || undefined,
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 4096,
  };
}

function parseCohereResponse(raw: any): string {
  return raw.text || raw.generation?.text || 'Empty response received.';
}

function buildGeminiRequest(messages: ChatMessage[], config: ChatConfig & { model: string }) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  return {
    contents,
    systemInstruction: config.systemInstruction ? { parts: [{ text: config.systemInstruction }] } : undefined,
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      topP: config.topP ?? 0.9,
      topK: config.topK ?? 40,
      maxOutputTokens: config.maxTokens ?? 4096,
    },
  };
}

function parseGeminiResponse(raw: any): string {
  return raw.candidates?.[0]?.content?.parts?.[0]?.text || 'Empty response received.';
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    authStyle: 'bearer',
    envKey: 'OPENROUTER_API_KEY',
    buildRequest: buildOpenAIRequest,
    parseResponse: parseOpenAIResponse,
    modelPrefixes: [],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    authStyle: 'bearer',
    envKey: 'OPENAI_API_KEY',
    buildRequest: buildOpenAIRequest,
    parseResponse: parseOpenAIResponse,
    modelPrefixes: ['gpt-', 'o1-', 'o3-'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    authStyle: 'x-api-key',
    envKey: 'ANTHROPIC_API_KEY',
    buildRequest: buildAnthropicRequest,
    parseResponse: parseAnthropicResponse,
    modelPrefixes: ['claude-'],
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    authStyle: 'bearer',
    envKey: 'GROQ_API_KEY',
    buildRequest: buildOpenAIRequest,
    parseResponse: parseOpenAIResponse,
    modelPrefixes: ['llama-', 'mixtral-', 'gemma-'],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    authStyle: 'bearer',
    envKey: 'MISTRAL_API_KEY',
    buildRequest: buildOpenAIRequest,
    parseResponse: parseOpenAIResponse,
    modelPrefixes: ['mistral-', 'open-mistral-', 'codestral-'],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai/v1/chat',
    authStyle: 'bearer',
    envKey: 'COHERE_API_KEY',
    buildRequest: buildCohereRequest,
    parseResponse: parseCohereResponse,
    modelPrefixes: ['command-', 'c4ai-', 'cohere-', 'north-'],
  },
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    authStyle: 'bearer',
    envKey: 'TOGETHER_API_KEY',
    buildRequest: buildOpenAIRequest,
    parseResponse: parseOpenAIResponse,
    modelPrefixes: ['together-', 'meta-llama-', 'microsoft-', 'deepseek-ai-'],
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1/chat/completions',
    authStyle: 'bearer',
    envKey: 'FIREWORKS_API_KEY',
    buildRequest: buildOpenAIRequest,
    parseResponse: parseOpenAIResponse,
    modelPrefixes: ['accounts/fireworks-'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    authStyle: 'bearer',
    envKey: 'DEEPSEEK_API_KEY',
    buildRequest: buildOpenAIRequest,
    parseResponse: parseOpenAIResponse,
    modelPrefixes: ['deepseek-'],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai/chat/completions',
    authStyle: 'bearer',
    envKey: 'PERPLEXITY_API_KEY',
    buildRequest: buildOpenAIRequest,
    parseResponse: parseOpenAIResponse,
    modelPrefixes: ['sonar-', 'perplexity-'],
  },
  {
    id: 'xai',
    name: 'xAI',
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    authStyle: 'bearer',
    envKey: 'XAI_API_KEY',
    buildRequest: buildOpenAIRequest,
    parseResponse: parseOpenAIResponse,
    modelPrefixes: ['grok-'],
  },
  {
    id: 'google-gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    authStyle: 'bearer',
    envKey: 'GEMINI_API_KEY',
    buildRequest: buildGeminiRequest,
    parseResponse: parseGeminiResponse,
    modelPrefixes: ['gemini-'],
  },
  {
    id: 'replicate',
    name: 'Replicate',
    baseUrl: 'https://api.replicate.com/v1/models',
    authStyle: 'bearer',
    envKey: 'REPLICATE_API_KEY',
    buildRequest(_messages, _config) {
      return {};
    },
    parseResponse(_raw: any): string {
      return 'Empty response received.';
    },
    modelPrefixes: ['replicate-'],
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Inference',
    baseUrl: 'https://api-inference.huggingface.co/models',
    authStyle: 'bearer',
    envKey: 'HUGGINGFACE_API_KEY',
    buildRequest(_messages, _config) {
      return {};
    },
    parseResponse(_raw: any): string {
      return 'Empty response received.';
    },
    modelPrefixes: ['huggingface-'],
  },
];

export const MODEL_ROUTES: Record<string, string> = {
  'gemini-3-flash-preview': 'google/gemini-3-flash-preview',
  'gemini-3.1-pro-preview': 'google/gemini-3.1-pro-preview-1',
  'gemini-2.5-flash-image': 'google/gemini-2.5-flash-image-001',
  'gemini-3.1-flash-image-preview': 'google/gemini-3.1-flash-image',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'claude-3-5-sonnet-20241022': 'anthropic/claude-3.5-sonnet',
  'claude-3-5-haiku-20241022': 'anthropic/claude-3.5-haiku',
  'llama-3.3-70b-versatile': 'groq/llama-3.3-70b-versatile',
  'fugu-ultra': 'sakana/fugu-ultra',
  'happyhorse-1.1': 'alibaba/happyhorse-1.1',
  'gpt-image-2': 'openai/gpt-image-2',
  'gpt-image-1-mini': 'openai/gpt-image-1-mini',
  'gpt-image-1': 'openai/gpt-image-1',
  'happyhorse-1.0': 'alibaba/happyhorse-1.0',
  'nano-banana-2': 'google/nano-banana-2',
  'nano-banana-pro': 'google/nano-banana-pro',
  'north-mini-code': 'cohere/north-mini-code',
  'glm-5.2': 'z-ai/glm-5.2',
  'fusion': 'openrouter/fusion',
  'kimi-k2.7-code': 'moonshot/kimi-k2.7-code',
  'llama-nemotron-rerank-vl-1b-v2': 'nvidia/llama-nemotron-rerank-vl-1b-v2',
  'claude-fable-latest': 'anthropic/claude-fable-latest',
  'claude-fable-5': 'anthropic/claude-fable-5',
  'nex-n2-pro': 'nexus/nex-n2-pro',
  'riverflow-v2.5-pro': 'sourceful/riverflow-v2.5-pro',
  'riverflow-v2.5-fast': 'sourceful/riverflow-v2.5-fast',
  'nemotron-3.5-content-safety': 'nvidia/nemotron-3.5-content-safety',
  'nemotron-3-ultra': 'nvidia/nemotron-3-ultra',
  'qwen3.7-plus': 'qwen/qwen3.7-plus',
  'mai-voice-2': 'microsoft/mai-voice-2',
  'llama-4-scout': 'meta/llama-4-scout',
  'llama-4-maverick': 'meta/llama-4-maverick',
  'mistral-large-3': 'mistral/mistral-large-3',
  'mistral-small-3': 'mistral/mistral-small-3',
  'deepseek-v3': 'deepseek/deepseek-v3',
  'deepseek-r1': 'deepseek/deepseek-r1',
  'grok-3': 'xai/grok-3',
  'amazon-nova-pro': 'amazon/nova-pro',
  'jamba-2': 'ai21/jamba-2',
  'reka-core': 'reka/reka-core',
  'palmyra-x': 'writer/palmyra-x',
  'stable-diffusion-4': 'stability/stable-diffusion-4',
  'midjourney-7': 'midjourney/midjourney-7',
  'ideogram-3': 'ideogram/ideogram-3',
  'recraft-v3': 'recraft/recraft-v3',
  'runway-gen4': 'runway/gen-4',
  'pika-3': 'pika/pika-3',
  'kling-2': 'kuaishou/kling-2',
  'sora-2': 'openai/sora-2',
  'eleven-turbo-v3': 'elevenlabs/eleven-turbo-v3',
  'openai-tts-1': 'openai/tts-1',
  'cartesia-sonic': 'cartesia/sonic',
  'text-embedding-3': 'openai/text-embedding-3',
  'cohere-embed-v4': 'cohere/embed-v4',
  'google-embedding-2': 'google/text-embedding-2',
  'whisper-large-v4': 'openai/whisper-large-v4',
  'deepgram-nova-3': 'deepgram/nova-3',
  'audio-gen-2': '',
};

export function getProviderForModel(modelId: string): ProviderConfig | undefined {
  for (const provider of PROVIDERS) {
    for (const prefix of provider.modelPrefixes) {
      if (modelId.startsWith(prefix)) {
        return provider;
      }
    }
  }
  if (MODEL_ROUTES[modelId] !== undefined) {
    return PROVIDERS.find(p => p.id === 'openrouter');
  }
  return undefined;
}

function getApiKey(envKey: string): string | undefined {
  return process.env[envKey];
}

export async function callProviderStreaming(
  provider: ProviderConfig,
  messages: ChatMessage[],
  config: ChatConfig & { model: string },
): Promise<Response> {
  const apiKey = getApiKey(provider.envKey);
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider.name}. Set ${provider.envKey} env var.`);
  }

  const body = provider.buildRequest(messages, config) as Record<string, unknown>;
  body.stream = true;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider.authStyle === 'bearer') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider.authStyle === 'x-api-key') {
    headers['x-api-key'] = apiKey;
  }

  if (provider.id === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }

  const res = await fetch(provider.baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `${provider.name} HTTP ${res.status}`);
  }

  return res;
}

export async function callModelStreaming(
  modelId: string,
  messages: ChatMessage[],
  config: ChatConfig,
): Promise<Response> {
  const fullConfig = { ...config, model: modelId };

  const openrouterKey = getApiKey('OPENROUTER_API_KEY');
  const openrouterModel = MODEL_ROUTES[modelId];

  if (openrouterKey && openrouterModel) {
    try {
      const openrouterProvider = PROVIDERS.find(p => p.id === 'openrouter')!;
      const orBody = {
        ...openrouterProvider.buildRequest(messages, { ...config, model: modelId }),
        model: openrouterModel,
        stream: true,
      };

      const res = await fetch(openrouterProvider.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
        },
        body: JSON.stringify(orBody),
      });

      if (res.ok) return res;
    } catch {
      // fall through to direct provider
    }
  }

  const directProvider = getProviderForModel(modelId);
  if (directProvider && directProvider.id !== 'openrouter') {
    return callProviderStreaming(directProvider, messages, fullConfig);
  }

  throw new Error(`No provider available for streaming model "${modelId}".`);
}

export async function callProvider(
  provider: ProviderConfig,
  messages: ChatMessage[],
  config: ChatConfig & { model: string },
): Promise<{ content: string; tokens?: number; cost?: number }> {
  const apiKey = getApiKey(provider.envKey);
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider.name}. Set ${provider.envKey} env var.`);
  }

  const body = provider.buildRequest(messages, config);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider.authStyle === 'bearer') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider.authStyle === 'x-api-key') {
    headers['x-api-key'] = apiKey;
  }

  if (provider.id === 'anthropic') {
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }

  const url = provider.baseUrl;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `${provider.name} HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = provider.parseResponse(data);

  const tokens = data.usage?.total_tokens || data.usage?.totalTokens;
  const cost = data.usage?.cost;

  return { content, tokens, cost };
}

export async function callModel(
  modelId: string,
  messages: ChatMessage[],
  config: ChatConfig,
): Promise<{ content: string; tokens?: number; cost?: number }> {
  const fullConfig = { ...config, model: modelId };

  const openrouterKey = getApiKey('OPENROUTER_API_KEY');
  const openrouterModel = MODEL_ROUTES[modelId];

  if (openrouterKey && openrouterModel) {
    try {
      const openrouterProvider = PROVIDERS.find(p => p.id === 'openrouter')!;
      const orBody = {
        ...openrouterProvider.buildRequest(messages, { ...config, model: modelId }),
        model: openrouterModel,
      };

      const res = await fetch(openrouterProvider.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
        },
        body: JSON.stringify(orBody),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          content: openrouterProvider.parseResponse(data),
          tokens: data.usage?.total_tokens,
          cost: data.usage?.cost,
        };
      }
    } catch {
      // fall through to direct provider
    }
  }

  const directProvider = getProviderForModel(modelId);
  if (directProvider && directProvider.id !== 'openrouter') {
    return callProvider(directProvider, messages, fullConfig);
  }

  throw new Error(`No provider available for model "${modelId}". Check your server env vars.`);
}
