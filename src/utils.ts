import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Maps internal model IDs to OpenRouter's provider/model format.
 * null means the model has no direct OpenRouter route (will use Gemini fallback).
 */
export const MODEL_ROUTES: Record<string, string | null> = {
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
  'audio-gen-2': null,
};

export function getOpenRouterModel(id: string): string | null {
  return MODEL_ROUTES[id] || null;
}
