import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Grid, List, ChevronRight, ChevronDown, Check, Zap, 
  Video, Image as ImageIcon, Headphones, FileText, ArrowUpDown, 
  Layers, BarChart2, Shield, Calendar, Tag, DollarSign, Brain, 
  Sparkles, Terminal, Info, Globe, HelpCircle, Activity, Key, Play
} from 'lucide-react';
import { ModelName } from '../types';
import { cn } from '../utils';
import { ProvidersView } from './ProvidersView';

export interface CatalogModel {
  id: ModelName;
  name: string;
  provider: string;
  description: string;
  modality: 'Text' | 'Image' | 'Video' | 'Audio' | 'Rerank' | 'Speech' | 'Embeddings' | 'Transcription';
  date: string;
  contextSize: string;
  inputPrice: string;
  outputPrice: string;
  tokenCount: string;
  contextLengthVal: number; // in tokens, for filtering
  inputPriceVal: number; // in $ per million tokens, for filtering
  series: string;
  toolCalling: boolean;
  zeroDataRetention: boolean;
  inRegionRouting: boolean;
  distillable: boolean;
  isNewest?: boolean;
}

export const CATALOG_MODELS: CatalogModel[] = [
  {
    id: 'fugu-ultra',
    name: 'Sakana: Fugu Ultra',
    provider: 'Sakana',
    description: "Fugu Ultra is the higher-performance model in Sakana AI's Fugu family. Rather than a single monolithic model, Fugu is a learned multi-agent orchestration system: a language model trained to route tasks across a swappable pool of underlying models and to recursively call instances of itself.",
    modality: 'Text',
    date: 'Jun 23, 2026',
    contextSize: '1M context',
    inputPrice: '$5/M input tokens',
    outputPrice: '$30/M output tokens',
    tokenCount: '132M tokens',
    contextLengthVal: 1000000,
    inputPriceVal: 5.0,
    series: 'Fugu',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: true,
    isNewest: true
  },
  {
    id: 'happyhorse-1.1',
    name: 'Alibaba: HappyHorse 1.1',
    provider: 'Alibaba',
    description: "HappyHorse 1.1 is a video generation model from Alibaba. It generates short videos from a text prompt, a single starting image, or a set of reference images, with output up to 1080p and durations of 3 to 15 seconds. Stronger prompt adherence and smoother motion.",
    modality: 'Video',
    date: 'Jun 23, 2026',
    contextSize: '1080p resolution',
    inputPrice: 'from $0.0988/sec',
    outputPrice: 'N/A',
    tokenCount: 'High fidelity',
    contextLengthVal: 1000,
    inputPriceVal: 9.88,
    series: 'HappyHorse',
    toolCalling: false,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: false,
    isNewest: true
  },
  {
    id: 'happyhorse-1.0',
    name: 'Alibaba: HappyHorse 1.0',
    provider: 'Alibaba',
    description: "HappyHorse 1.0 is a video generation model from Alibaba. It generates short videos from a text prompt, a single starting image, or a set of reference images, with output up to 1080p across a range of aspect ratios.",
    modality: 'Video',
    date: 'Jun 23, 2026',
    contextSize: '1080p resolution',
    inputPrice: 'from $0.0988/sec',
    outputPrice: 'N/A',
    tokenCount: 'Standard video',
    contextLengthVal: 1000,
    inputPriceVal: 9.88,
    series: 'HappyHorse',
    toolCalling: false,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: false
  },
  {
    id: 'gpt-image-2',
    name: 'OpenAI: GPT Image 2',
    provider: 'OpenAI',
    description: "OpenAI's latest image generation model. Supports high-fidelity image generation and editing via the dedicated Images API. Highly detailed rendering, text integration, and layout accuracy.",
    modality: 'Image',
    date: 'Jun 23, 2026',
    contextSize: '400K context',
    inputPrice: '$8/M input tokens',
    outputPrice: '$8/M output tokens',
    tokenCount: '247K tokens',
    contextLengthVal: 400000,
    inputPriceVal: 8.0,
    series: 'GPT',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false,
    isNewest: true
  },
  {
    id: 'gpt-image-1-mini',
    name: 'OpenAI: GPT Image 1 Mini',
    provider: 'OpenAI',
    description: "A cost-efficient variant of GPT Image 1 for high-quality image generation at reduced latency and cost via OpenAI's dedicated Images API. Ideal for real-time applications.",
    modality: 'Image',
    date: 'Jun 23, 2026',
    contextSize: '400K context',
    inputPrice: '$2.50/M input tokens',
    outputPrice: '$2.50/M output tokens',
    tokenCount: '36K tokens',
    contextLengthVal: 400000,
    inputPriceVal: 2.50,
    series: 'GPT',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: true,
    isNewest: true
  },
  {
    id: 'gpt-image-1',
    name: 'OpenAI: GPT Image 1',
    provider: 'OpenAI',
    description: "OpenAI's GPT Image 1 generates and edits images via the dedicated Images API. Features accurate text rendering, transparent backgrounds, and up to 16 reference images for edits.",
    modality: 'Image',
    date: 'Jun 23, 2026',
    contextSize: '400K context',
    inputPrice: '$10/M input tokens',
    outputPrice: '$10/M output tokens',
    tokenCount: '60K tokens',
    contextLengthVal: 400000,
    inputPriceVal: 10.0,
    series: 'GPT',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'nano-banana-2',
    name: 'Google: Nano Banana 2',
    provider: 'Google',
    description: "Gemini 3.1 Flash Image, a.k.a. 'Nano Banana 2,' is Google's latest state of the art image generation and editing model, delivering Pro-level visual quality at Flash speed with advanced contextual understanding.",
    modality: 'Image',
    date: 'Jun 17, 2026',
    contextSize: '131K context',
    inputPrice: '$0.50/M input tokens',
    outputPrice: '$3/M output tokens',
    tokenCount: '844M tokens',
    contextLengthVal: 131000,
    inputPriceVal: 0.50,
    series: 'Banana',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: true,
    isNewest: true
  },
  {
    id: 'nano-banana-pro',
    name: 'Google: Nano Banana Pro',
    provider: 'Google',
    description: "Nano Banana Pro is Google's most advanced image-generation and editing model, built on Gemini 3 Pro. It extends the original Nano Banana with significantly improved multimodal reasoning and high-fidelity text rendering.",
    modality: 'Image',
    date: 'Jun 17, 2026',
    contextSize: '66K context',
    inputPrice: '$2/M input tokens',
    outputPrice: '$12/M output tokens',
    tokenCount: '578M tokens',
    contextLengthVal: 66000,
    inputPriceVal: 2.0,
    series: 'Banana',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'north-mini-code',
    name: 'Cohere: North Mini Code (free)',
    provider: 'Cohere',
    description: "North Mini Code is Cohere's first agentic coding model and the debut of its North family. A sparse mixture-of-experts model optimized for code generation, software development, and complex terminal planning.",
    modality: 'Text',
    date: 'Jun 17, 2026',
    contextSize: '256K context',
    inputPrice: '$0/M input tokens',
    outputPrice: '$0/M output tokens',
    tokenCount: '29.8B tokens',
    contextLengthVal: 256000,
    inputPriceVal: 0.0,
    series: 'North',
    toolCalling: true,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: true
  },
  {
    id: 'glm-5.2',
    name: 'Z.ai: GLM 5.2',
    provider: 'Z.ai',
    description: "GLM 5.2 is a large-scale reasoning model from Z.ai. It supports text input and output with a 1M-token context window, and is suited for long-horizon agent workflows and project-level software development.",
    modality: 'Text',
    date: 'Jun 16, 2026',
    contextSize: '1.05M context',
    inputPrice: '$0.95/M input tokens',
    outputPrice: '$3/M output tokens',
    tokenCount: '1.9T tokens',
    contextLengthVal: 1050000,
    inputPriceVal: 0.95,
    series: 'GLM',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: false
  },
  {
    id: 'fusion',
    name: 'OpenRouter: Fusion',
    provider: 'OpenRouter',
    description: "Fusion turns your prompt into a small multi-model deliberation. A panel of expert models analyzes your prompt in parallel with web search and web fetch enabled, then a judge model synthesizes responses.",
    modality: 'Text',
    date: 'Jun 13, 2026',
    contextSize: '1M context',
    inputPrice: 'Dynamic',
    outputPrice: 'Dynamic',
    tokenCount: 'Expert Panel',
    contextLengthVal: 1000000,
    inputPriceVal: 4.5,
    series: 'Fusion',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'kimi-k2.7-code',
    name: 'MoonshotAI: Kimi K2.7 Code',
    provider: 'MoonshotAI',
    description: "MoonshotAI: Kimi K2.7 Code is a coding-focused model built to complete end-to-end programming tasks reliably over long contexts. Uses a native multimodal MoE structure that accepts text and image.",
    modality: 'Text',
    date: 'Jun 12, 2026',
    contextSize: '262K context',
    inputPrice: '$0.74/M input tokens',
    outputPrice: '$3.50/M output tokens',
    tokenCount: '226B tokens',
    contextLengthVal: 262000,
    inputPriceVal: 0.74,
    series: 'Kimi',
    toolCalling: true,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: true
  },
  {
    id: 'llama-nemotron-rerank-vl-1b-v2',
    name: 'NVIDIA: Llama Nemotron Rerank VL',
    provider: 'NVIDIA',
    description: "Llama Nemotron Rerank VL 1B V2 is a 1.7B multimodal reranking model from NVIDIA. It evaluates relevance of document images and text against queries, designed for rich vision RAG pipelines.",
    modality: 'Rerank',
    date: 'Jun 9, 2026',
    contextSize: '10K context',
    inputPrice: '$0/M input tokens',
    outputPrice: '$0/M output tokens',
    tokenCount: '2.51B tokens',
    contextLengthVal: 10000,
    inputPriceVal: 0.0,
    series: 'Nemotron',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: true
  },
  {
    id: 'claude-fable-latest',
    name: 'Anthropic: Claude Fable Latest',
    provider: 'Anthropic',
    description: "This model always redirects to the latest model in the Claude Fable family. High capacity for autonomous knowledge work, complex reasoning, and structured software generation.",
    modality: 'Text',
    date: 'Jun 9, 2026',
    contextSize: '1M context',
    inputPrice: '$10/M input tokens',
    outputPrice: '$50/M output tokens',
    tokenCount: 'Mythos Class',
    contextLengthVal: 1000000,
    inputPriceVal: 10.0,
    series: 'Claude',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'claude-fable-5',
    name: 'Anthropic: Claude Fable 5',
    provider: 'Anthropic',
    description: "Claude Fable 5 is a Mythos-class model from Anthropic, built for autonomous knowledge work and coding. It supports text, image, and file inputs, with deep reasoning and self-verification.",
    modality: 'Text',
    date: 'Jun 9, 2026',
    contextSize: '1M context',
    inputPrice: '$10/M input tokens',
    outputPrice: '$50/M output tokens',
    tokenCount: 'Mythos Class',
    contextLengthVal: 1000000,
    inputPriceVal: 10.0,
    series: 'Claude',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'nex-n2-pro',
    name: 'Nex AGI: Nex-N2-Pro',
    provider: 'Nex AGI',
    description: "Nex-N2-Pro is an agentic mixture-of-experts model with 17B active parameters out of 397B total. Built on Qwen architecture, it unifies planning, implementation, and debugging.",
    modality: 'Text',
    date: 'Jun 8, 2026',
    contextSize: '262K context',
    inputPrice: '$0.25/M input tokens',
    outputPrice: '$1/M output tokens',
    tokenCount: '289M tokens',
    contextLengthVal: 262000,
    inputPriceVal: 0.25,
    series: 'Nex',
    toolCalling: true,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: true
  },
  {
    id: 'riverflow-v2.5-pro',
    name: 'Sourceful: Riverflow V2.5 Pro',
    provider: 'Sourceful',
    description: "Riverflow V2.5 Pro is the most powerful variant of Sourceful's lineup.Treats generation as a production workflow, using an integrated reasoning model to plan multi-step edits.",
    modality: 'Image',
    date: 'Jun 4, 2026',
    contextSize: '33K context',
    inputPrice: 'from $0.13/image',
    outputPrice: 'Dynamic',
    tokenCount: '30.3M tokens',
    contextLengthVal: 33000,
    inputPriceVal: 4.5,
    series: 'Riverflow',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: false
  },
  {
    id: 'riverflow-v2.5-fast',
    name: 'Sourceful: Riverflow V2.5 Fast',
    provider: 'Sourceful',
    description: "Riverflow V2.5 Fast is the speed-optimized variant of Sourceful's Riverflow lineup. Best for high throughput production deployments and latency-critical visual assets.",
    modality: 'Image',
    date: 'Jun 4, 2026',
    contextSize: '33K context',
    inputPrice: 'from $0.019/image',
    outputPrice: 'Dynamic',
    tokenCount: '39.6M tokens',
    contextLengthVal: 33000,
    inputPriceVal: 1.5,
    series: 'Riverflow',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: true
  },
  {
    id: 'nemotron-3.5-content-safety',
    name: 'NVIDIA: Nemotron 3.5 Safety',
    provider: 'NVIDIA',
    description: "NVIDIA Nemotron 3.5 Content Safety is a compact 4B guardrail model. It moderates both inputs and outputs, delivering safe/unsafe classifications, category labels, and traces.",
    modality: 'Text',
    date: 'Jun 4, 2026',
    contextSize: '128K context',
    inputPrice: '$0/M input tokens',
    outputPrice: '$0/M output tokens',
    tokenCount: '1.22B tokens',
    contextLengthVal: 128000,
    inputPriceVal: 0.0,
    series: 'Nemotron',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: true
  },
  {
    id: 'nemotron-3-ultra',
    name: 'NVIDIA: Nemotron 3 Ultra',
    provider: 'NVIDIA',
    description: "NVIDIA Nemotron 3 Ultra is an open frontier-reasoning and orchestration model. Built on a hybrid Transformer-Mamba MoE structure, suited for high-throughput agent workflows.",
    modality: 'Text',
    date: 'Jun 4, 2026',
    contextSize: '1M context',
    inputPrice: '$0.50/M input tokens',
    outputPrice: '$2.20/M output tokens',
    tokenCount: '23.2B tokens',
    contextLengthVal: 1000000,
    inputPriceVal: 0.50,
    series: 'Nemotron',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'qwen3.7-plus',
    name: 'Qwen: Qwen3.7 Plus',
    provider: 'Qwen',
    description: "Qwen3.7-Plus is a flagship multimodal interactive agent. It perceives scenes, reads screens, GUI navigation, code generation, and complex interactive computer tasks.",
    modality: 'Text',
    date: 'Jun 3, 2026',
    contextSize: '1M context',
    inputPrice: '$0.32/M input tokens',
    outputPrice: '$1.28/M output tokens',
    tokenCount: '172B tokens',
    contextLengthVal: 1000000,
    inputPriceVal: 0.32,
    series: 'Qwen',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: true
  },
  {
    id: 'mai-voice-2',
    name: 'Microsoft: MAI-Voice-2',
    provider: 'Microsoft',
    description: "MAI-Voice-2 is a high-fidelity expressive text-to-speech model. Powered by Azure AI Speech, synthesizes natural sounding speech across 10+ languages with SSML styling.",
    modality: 'Speech',
    date: 'Jun 2, 2026',
    contextSize: 'Expressive SSML',
    inputPrice: '$22/M characters',
    outputPrice: 'N/A',
    tokenCount: '1.14M tokens',
    contextLengthVal: 50000,
    inputPriceVal: 22.0,
    series: 'Azure',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Google: Gemini 3 Flash',
    provider: 'Google',
    description: 'Fast, lightweight next-generation model from Google. High throughput and cost-efficient execution with rich multimodal capabilities.',
    modality: 'Text',
    date: 'May 2026',
    contextSize: '1M context',
    inputPrice: '$0.075/M input tokens',
    outputPrice: '$0.30/M output tokens',
    tokenCount: 'Flash Core',
    contextLengthVal: 1000000,
    inputPriceVal: 0.075,
    series: 'Gemini',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: true
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Google: Gemini 3.1 Pro',
    provider: 'Google',
    description: 'Google flagship reasoning model. Perfect for complex multi-step instructions, agent tasks, and software synthesis.',
    modality: 'Text',
    date: 'May 2026',
    contextSize: '2M context',
    inputPrice: '$1.25/M input tokens',
    outputPrice: '$5/M output tokens',
    tokenCount: 'Pro Core',
    contextLengthVal: 2000000,
    inputPriceVal: 1.25,
    series: 'Gemini',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'llama-4-scout',
    name: 'Meta: Llama 4 Scout',
    provider: 'Meta',
    description: 'Llama 4 Scout is a lightweight MoE model with 109B total / 17B active parameters. Built for fast, efficient text and image understanding with a 10M-token context window.',
    modality: 'Text',
    date: 'Jun 22, 2026',
    contextSize: '10M context',
    inputPrice: '$0.25/M input tokens',
    outputPrice: '$0.80/M output tokens',
    tokenCount: '10T+ tokens',
    contextLengthVal: 10000000,
    inputPriceVal: 0.25,
    series: 'Llama',
    toolCalling: true,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: true,
    isNewest: true
  },
  {
    id: 'llama-4-maverick',
    name: 'Meta: Llama 4 Maverick',
    provider: 'Meta',
    description: 'Llama 4 Maverick is a 400B MoE model (48B active) with industry-leading reasoning and multimodal capabilities. Excels at complex math, coding, and long-document analysis.',
    modality: 'Text',
    date: 'Jun 22, 2026',
    contextSize: '1M context',
    inputPrice: '$3/M input tokens',
    outputPrice: '$12/M output tokens',
    tokenCount: '10T+ tokens',
    contextLengthVal: 1000000,
    inputPriceVal: 3.0,
    series: 'Llama',
    toolCalling: true,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: false,
    isNewest: true
  },
  {
    id: 'mistral-large-3',
    name: 'Mistral: Mistral Large 3',
    provider: 'Mistral',
    description: "Mistral Large 3 is a state-of-the-art text model with 123B parameters. Delivers advanced reasoning, multilingual fluency, and native function calling on par with frontier models.",
    modality: 'Text',
    date: 'Jun 20, 2026',
    contextSize: '256K context',
    inputPrice: '$2/M input tokens',
    outputPrice: '$6/M output tokens',
    tokenCount: '12.5B tokens',
    contextLengthVal: 256000,
    inputPriceVal: 2.0,
    series: 'Mistral',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false,
    isNewest: true
  },
  {
    id: 'mistral-small-3',
    name: 'Mistral: Mistral Small 3',
    provider: 'Mistral',
    description: 'Mistral Small 3 is a cost-efficient 24B model optimized for low-latency inference. Ideal for classification, summarization, and lightweight agent tasks.',
    modality: 'Text',
    date: 'Jun 20, 2026',
    contextSize: '128K context',
    inputPrice: '$0.20/M input tokens',
    outputPrice: '$0.60/M output tokens',
    tokenCount: '4.2B tokens',
    contextLengthVal: 128000,
    inputPriceVal: 0.20,
    series: 'Mistral',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: true
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek: DeepSeek V3',
    provider: 'DeepSeek',
    description: 'DeepSeek V3 is a 671B MoE model (37B active) delivering GPT-4o-class intelligence at a fraction of the cost. State-of-the-art on reasoning, coding, and long-context benchmarks.',
    modality: 'Text',
    date: 'Jun 19, 2026',
    contextSize: '1M context',
    inputPrice: '$0.28/M input tokens',
    outputPrice: '$1.10/M output tokens',
    tokenCount: '18.2B tokens',
    contextLengthVal: 1000000,
    inputPriceVal: 0.28,
    series: 'DeepSeek',
    toolCalling: true,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: false,
    isNewest: true
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek: DeepSeek R1',
    provider: 'DeepSeek',
    description: 'DeepSeek R1 is a dedicated reasoning model that uses chain-of-thought and self-verification to solve advanced math, science, and logic problems with exceptional accuracy.',
    modality: 'Text',
    date: 'Jun 19, 2026',
    contextSize: '128K context',
    inputPrice: '$0.55/M input tokens',
    outputPrice: '$2.19/M output tokens',
    tokenCount: '8.4B tokens',
    contextLengthVal: 128000,
    inputPriceVal: 0.55,
    series: 'DeepSeek',
    toolCalling: true,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: false,
    isNewest: true
  },
  {
    id: 'grok-3',
    name: 'xAI: Grok 3',
    provider: 'xAI',
    description: 'Grok 3 is xAI\'s flagship reasoning model with real-time web knowledge. Combines deep mathematical reasoning with a humorous, direct communication style.',
    modality: 'Text',
    date: 'Jun 18, 2026',
    contextSize: '256K context',
    inputPrice: '$3/M input tokens',
    outputPrice: '$12/M output tokens',
    tokenCount: '15.7B tokens',
    contextLengthVal: 256000,
    inputPriceVal: 3.0,
    series: 'Grok',
    toolCalling: true,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: false,
    isNewest: true
  },
  {
    id: 'amazon-nova-pro',
    name: 'AWS: Amazon Nova Pro',
    provider: 'AWS',
    description: 'Amazon Nova Pro is a multimodal model excelling at complex reasoning, code generation, and long-document analysis. Deeply integrated with the AWS ecosystem.',
    modality: 'Text',
    date: 'Jun 16, 2026',
    contextSize: '512K context',
    inputPrice: '$0.80/M input tokens',
    outputPrice: '$3.20/M output tokens',
    tokenCount: '6.1B tokens',
    contextLengthVal: 512000,
    inputPriceVal: 0.80,
    series: 'Nova',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'jamba-2',
    name: 'AI21: Jamba 2',
    provider: 'AI21',
    description: "Jamba 2 is AI21's hybrid SSM-Transformer architecture model. Offers 256K context with efficient long-sequence processing at low latency.",
    modality: 'Text',
    date: 'Jun 14, 2026',
    contextSize: '256K context',
    inputPrice: '$0.50/M input tokens',
    outputPrice: '$1.50/M output tokens',
    tokenCount: '3.8B tokens',
    contextLengthVal: 256000,
    inputPriceVal: 0.50,
    series: 'Jamba',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: true
  },
  {
    id: 'reka-core',
    name: 'Reka: Reka Core',
    provider: 'Reka',
    description: 'Reka Core is a state-of-the-art multimodal model capable of understanding images, video, and audio alongside text. Built for enterprise-grade agent workflows.',
    modality: 'Text',
    date: 'Jun 12, 2026',
    contextSize: '128K context',
    inputPrice: '$0.40/M input tokens',
    outputPrice: '$1.60/M output tokens',
    tokenCount: '2.3B tokens',
    contextLengthVal: 128000,
    inputPriceVal: 0.40,
    series: 'Reka',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'palmyra-x',
    name: 'Writer: Palmyra X',
    provider: 'Writer',
    description: 'Palmyra X is Writer\'s most powerful enterprise LLM. Specializes in accurate, citation-grounded text generation for regulated industries.',
    modality: 'Text',
    date: 'Jun 10, 2026',
    contextSize: '128K context',
    inputPrice: '$1.50/M input tokens',
    outputPrice: '$4.50/M output tokens',
    tokenCount: '1.7B tokens',
    contextLengthVal: 128000,
    inputPriceVal: 1.50,
    series: 'Palmyra',
    toolCalling: true,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'stable-diffusion-4',
    name: 'Stability: Stable Diffusion 4',
    provider: 'Stability',
    description: 'Stable Diffusion 4 is Stability AI\'s latest image generation model. Delivers photorealistic outputs with superior prompt adherence, typography, and compositional control.',
    modality: 'Image',
    date: 'Jun 21, 2026',
    contextSize: '4K context',
    inputPrice: 'from $0.002/image',
    outputPrice: 'N/A',
    tokenCount: 'High fidelity',
    contextLengthVal: 4000,
    inputPriceVal: 1.0,
    series: 'Stable Diffusion',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: false,
    isNewest: true
  },
  {
    id: 'midjourney-7',
    name: 'Midjourney: Midjourney 7',
    provider: 'Midjourney',
    description: 'Midjourney 7 is the latest iteration with unparalleled aesthetic quality. Features consistent character rendering, fine-grained style control, and native 4K upscaling.',
    modality: 'Image',
    date: 'Jun 18, 2026',
    contextSize: '4K context',
    inputPrice: 'from $0.034/image',
    outputPrice: 'N/A',
    tokenCount: 'Artistic',
    contextLengthVal: 4000,
    inputPriceVal: 2.0,
    series: 'Midjourney',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: false,
    isNewest: true
  },
  {
    id: 'ideogram-3',
    name: 'Ideogram: Ideogram 3',
    provider: 'Ideogram',
    description: 'Ideogram 3 excels at text rendering and logo design. Generates high-quality images with accurate embedded text, making it ideal for graphic design and branding.',
    modality: 'Image',
    date: 'Jun 15, 2026',
    contextSize: '4K context',
    inputPrice: 'from $0.006/image',
    outputPrice: 'N/A',
    tokenCount: 'Design grade',
    contextLengthVal: 4000,
    inputPriceVal: 0.80,
    series: 'Ideogram',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: false
  },
  {
    id: 'recraft-v3',
    name: 'Recraft: Recraft V3',
    provider: 'Recraft',
    description: 'Recraft V3 is a vector-optimized image generation model. Outputs scalable SVG graphics, brand-accurate illustrations, and multi-style design assets.',
    modality: 'Image',
    date: 'Jun 13, 2026',
    contextSize: '4K context',
    inputPrice: 'from $0.003/image',
    outputPrice: 'N/A',
    tokenCount: 'Vector grade',
    contextLengthVal: 4000,
    inputPriceVal: 0.60,
    series: 'Recraft',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: false
  },
  {
    id: 'runway-gen4',
    name: 'Runway: Gen-4',
    provider: 'Runway',
    description: 'Runway Gen-4 is the latest video generation model with physics-aware motion, consistent character appearances across scenes, and native 4K output at 60fps.',
    modality: 'Video',
    date: 'Jun 20, 2026',
    contextSize: '4K resolution',
    inputPrice: 'from $0.15/sec',
    outputPrice: 'N/A',
    tokenCount: 'Cinematic',
    contextLengthVal: 1000,
    inputPriceVal: 10.0,
    series: 'Gen',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: false,
    isNewest: true
  },
  {
    id: 'pika-3',
    name: 'Pika: Pika 3',
    provider: 'Pika',
    description: 'Pika 3 is a creative-first video generation platform. Features real-time video editing, lip-sync for characters, and seamless style transfer from reference images.',
    modality: 'Video',
    date: 'Jun 17, 2026',
    contextSize: '1080p resolution',
    inputPrice: 'from $0.12/sec',
    outputPrice: 'N/A',
    tokenCount: 'Creative',
    contextLengthVal: 1000,
    inputPriceVal: 8.0,
    series: 'Pika',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: false
  },
  {
    id: 'kling-2',
    name: 'Kuaishou: Kling 2',
    provider: 'Kuaishou',
    description: 'Kling 2 is a high-quality text-to-video model supporting complex motion, multi-object scenes, and extended 2-minute video generation at 1080p.',
    modality: 'Video',
    date: 'Jun 14, 2026',
    contextSize: '1080p resolution',
    inputPrice: 'from $0.09/sec',
    outputPrice: 'N/A',
    tokenCount: 'Extended',
    contextLengthVal: 1000,
    inputPriceVal: 6.0,
    series: 'Kling',
    toolCalling: false,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: false
  },
  {
    id: 'sora-2',
    name: 'OpenAI: Sora 2',
    provider: 'OpenAI',
    description: 'Sora 2 is OpenAI\'s latest video generation model with photorealistic physics simulation, multi-shot storyboarding, and native audio track generation.',
    modality: 'Video',
    date: 'Jun 11, 2026',
    contextSize: '4K resolution',
    inputPrice: 'from $0.20/sec',
    outputPrice: 'N/A',
    tokenCount: 'Photorealistic',
    contextLengthVal: 1000,
    inputPriceVal: 14.0,
    series: 'Sora',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'eleven-turbo-v3',
    name: 'ElevenLabs: Eleven Turbo V3',
    provider: 'ElevenLabs',
    description: 'Eleven Turbo V3 is a high-speed text-to-speech model with ultra-low latency (~200ms). Supports voice cloning, emotion control, and 29+ languages.',
    modality: 'Speech',
    date: 'Jun 19, 2026',
    contextSize: 'Expressive SSML',
    inputPrice: '$0.30/M characters',
    outputPrice: 'N/A',
    tokenCount: 'Natural speech',
    contextLengthVal: 50000,
    inputPriceVal: 0.30,
    series: 'ElevenLabs',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: false,
    isNewest: true
  },
  {
    id: 'openai-tts-1',
    name: 'OpenAI: TTS-1 HD',
    provider: 'OpenAI',
    description: 'OpenAI TTS-1 HD delivers the highest quality neural text-to-speech with multiple natural voices, SSML support, and real-time streaming capabilities.',
    modality: 'Speech',
    date: 'Jun 15, 2026',
    contextSize: 'Expressive SSML',
    inputPrice: '$15/M characters',
    outputPrice: 'N/A',
    tokenCount: 'Studio quality',
    contextLengthVal: 50000,
    inputPriceVal: 15.0,
    series: 'OpenAI TTS',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'cartesia-sonic',
    name: 'Cartesia: Sonic',
    provider: 'Cartesia',
    description: 'Sonic is a real-time multimodal speech model with stateful voice chat. Features sub-100ms latency, emotional expressiveness, and real-time voice cloning.',
    modality: 'Speech',
    date: 'Jun 10, 2026',
    contextSize: 'Real-time',
    inputPrice: '$0.15/M characters',
    outputPrice: 'N/A',
    tokenCount: 'Real-time',
    contextLengthVal: 50000,
    inputPriceVal: 0.15,
    series: 'Sonic',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: false,
    distillable: false
  },
  {
    id: 'text-embedding-3',
    name: 'OpenAI: Text Embedding 3',
    provider: 'OpenAI',
    description: 'OpenAI\'s most capable embedding model. Generates 3072-dimensional vectors with state-of-the-art performance on semantic search, clustering, and RAG pipelines.',
    modality: 'Embeddings',
    date: 'Jun 16, 2026',
    contextSize: '8K context',
    inputPrice: '$0.13/M tokens',
    outputPrice: 'N/A',
    tokenCount: '4.9B tokens',
    contextLengthVal: 8191,
    inputPriceVal: 0.13,
    series: 'OpenAI Embed',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: true
  },
  {
    id: 'cohere-embed-v4',
    name: 'Cohere: Embed V4',
    provider: 'Cohere',
    description: 'Cohere Embed V4 is a multilingual embedding model supporting 100+ languages. Optimized for enterprise retrieval and classification with flexible vector dimensions.',
    modality: 'Embeddings',
    date: 'Jun 12, 2026',
    contextSize: '512 tokens',
    inputPrice: '$0.10/M tokens',
    outputPrice: 'N/A',
    tokenCount: '2.8B tokens',
    contextLengthVal: 512,
    inputPriceVal: 0.10,
    series: 'Cohere Embed',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: true
  },
  {
    id: 'google-embedding-2',
    name: 'Google: Text Embedding 2',
    provider: 'Google',
    description: 'Google\'s latest text embedding model with 768-dimensional output. Tightly integrated with Vertex AI Search and vector database workloads.',
    modality: 'Embeddings',
    date: 'Jun 8, 2026',
    contextSize: '2K context',
    inputPrice: '$0.06/M tokens',
    outputPrice: 'N/A',
    tokenCount: '1.5B tokens',
    contextLengthVal: 2048,
    inputPriceVal: 0.06,
    series: 'Google Embed',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: true
  },
  {
    id: 'whisper-large-v4',
    name: 'OpenAI: Whisper v4',
    provider: 'OpenAI',
    description: 'Whisper v4 is OpenAI\'s state-of-the-art speech-to-text model. Supports 99+ languages with diarization, custom vocabulary, and timestamp alignment.',
    modality: 'Transcription',
    date: 'Jun 14, 2026',
    contextSize: '25MB audio',
    inputPrice: '$0.006/minute',
    outputPrice: 'N/A',
    tokenCount: '3.2B tokens',
    contextLengthVal: 50000,
    inputPriceVal: 0.006,
    series: 'Whisper',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'deepgram-nova-3',
    name: 'Deepgram: Nova 3',
    provider: 'Deepgram',
    description: 'Nova 3 is Deepgram\'s fastest transcription model with <300ms end-to-end latency. Features real-time streaming, multilingual support, and intent detection.',
    modality: 'Transcription',
    date: 'Jun 10, 2026',
    contextSize: 'Real-time',
    inputPrice: '$0.004/minute',
    outputPrice: 'N/A',
    tokenCount: '1.1B tokens',
    contextLengthVal: 50000,
    inputPriceVal: 0.004,
    series: 'Nova',
    toolCalling: false,
    zeroDataRetention: true,
    inRegionRouting: true,
    distillable: false
  },
  {
    id: 'audio-gen-2',
    name: 'Meta: AudioGen 2',
    provider: 'Meta',
    description: 'AudioGen 2 is a text-to-audio generation model from Meta. Generates high-quality sound effects, ambient audio, and musical loops from natural language descriptions.',
    modality: 'Audio',
    date: 'Jun 11, 2026',
    contextSize: '30-second clip',
    inputPrice: 'from $0.01/sec',
    outputPrice: 'N/A',
    tokenCount: 'Generated audio',
    contextLengthVal: 1000,
    inputPriceVal: 1.0,
    series: 'AudioGen',
    toolCalling: false,
    zeroDataRetention: false,
    inRegionRouting: false,
    distillable: false
  }
];

interface ModelsCatalogProps {
  onSelectModel: (modelId: ModelName) => void;
  selectedModelId: ModelName;
  onOpenKeysModal: () => void;
  initialSubView?: 'directory' | 'infrastructure';
}

export function ModelsCatalog({ onSelectModel, selectedModelId, onOpenKeysModal, initialSubView = 'directory' }: ModelsCatalogProps) {
  const [catalogSubView, setCatalogSubView] = useState<'directory' | 'infrastructure'>(initialSubView);
  const [activeModality, setActiveModality] = useState<string>('Text');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'context_high'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Sidebar states
  const [inputModalities, setInputModalities] = useState<Record<string, boolean>>({
    'Text': true,
    'Image': true,
    'File': false,
    'Audio': false,
    'Video': false
  });
  const [selectedSeries, setSelectedSeries] = useState<Record<string, boolean>>({
    'Fugu': true,
    'GPT': true,
    'Claude': true,
    'Gemini': true,
    'Llama': true,
    'Nemotron': false,
    'Riverflow': false,
    'HappyHorse': false,
    'Mistral': true,
    'DeepSeek': true,
    'Grok': true,
    'Nova': true,
    'Jamba': true,
    'Reka': true,
    'Palmyra': true,
    'Stable Diffusion': true,
    'Midjourney': true,
    'Ideogram': true,
    'Recraft': true,
    'Gen': true,
    'Pika': true,
    'Kling': true,
    'Sora': true,
    'ElevenLabs': true,
    'OpenAI TTS': true,
    'Sonic': true,
    'OpenAI Embed': true,
    'Cohere Embed': true,
    'Google Embed': true,
    'Whisper': true,
    'AudioGen': true
  });
  const [selectedProviders, setSelectedProviders] = useState<Record<string, boolean>>({
    'Sakana': true,
    'Google': true,
    'OpenAI': true,
    'Anthropic': true,
    'Alibaba': true,
    'Groq': true,
    'Cohere': true,
    'NVIDIA': true,
    'Z.ai': true,
    'Sourceful': true,
    'Microsoft': true,
    'Meta': true,
    'Mistral': true,
    'DeepSeek': true,
    'xAI': true,
    'AWS': true,
    'AI21': true,
    'Reka': true,
    'Writer': true,
    'Stability': true,
    'Midjourney': true,
    'Ideogram': true,
    'Recraft': true,
    'Runway': true,
    'Pika': true,
    'Kuaishou': true,
    'ElevenLabs': true,
    'Cartesia': true,
    'Deepgram': true
  });
  const [selectedParams, setSelectedParams] = useState<Record<string, boolean>>({
    'temperature': true,
    'top_p': true,
    'system_instruction': true,
    'tool_calling': false
  });

  const [contextSlider, setContextSlider] = useState<number>(2000000);
  const [pricingSlider, setPricingSlider] = useState<number>(15);
  const [showToolCallingOnly, setShowToolCallingOnly] = useState<boolean>(false);
  const [showZeroDataRetention, setShowZeroDataRetention] = useState<boolean>(false);
  const [showInRegionOnly, setShowInRegionOnly] = useState<boolean>(false);
  const [showDistillableOnly, setShowDistillableOnly] = useState<boolean>(false);

  // Accordion open/close states
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    modalities: true,
    context: true,
    pricing: true,
    series: true,
    categories: true,
    params: true,
    arena: true,
    providers: true,
    authors: false
  });

  // Global search reference to bind Cmd+K
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFilter = (section: string) => {
    setExpandedFilters(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredModels = CATALOG_MODELS.filter(m => {
    // Search term match
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Modality Tab filter
    const matchesModalityTab = m.modality === activeModality;

    // Sidebar filters
    const matchesProvider = selectedProviders[m.provider] !== false;
    const matchesSeries = selectedSeries[m.series] !== false;
    const matchesContext = m.contextLengthVal <= contextSlider;
    const matchesPrice = m.inputPriceVal <= pricingSlider;

    // Feature toggles
    const matchesToolCalling = !showToolCallingOnly || m.toolCalling;
    const matchesZeroData = !showZeroDataRetention || m.zeroDataRetention;
    const matchesInRegion = !showInRegionOnly || m.inRegionRouting;
    const matchesDistillable = !showDistillableOnly || m.distillable;

    return matchesSearch && matchesModalityTab && matchesProvider && matchesSeries && matchesContext && matchesPrice && matchesToolCalling && matchesZeroData && matchesInRegion && matchesDistillable;
  });

  // Sort
  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortBy === 'newest') {
      return a.isNewest ? -1 : 1;
    } else if (sortBy === 'price_low') {
      return a.inputPriceVal - b.inputPriceVal;
    } else if (sortBy === 'context_high') {
      return b.contextLengthVal - a.contextLengthVal;
    }
    return 0;
  });

  // Custom counts matching request
  const tabCounts = {
    Text: 339,
    Image: 37,
    Embeddings: 26,
    Audio: 4,
    Video: 16,
    Rerank: 4,
    Speech: 9,
    Transcription: 10
  };

  const getModalityIcon = (mod: string) => {
    switch (mod) {
      case 'Text': return <FileText className="w-3.5 h-3.5" />;
      case 'Image': return <ImageIcon className="w-3.5 h-3.5" />;
      case 'Video': return <Video className="w-3.5 h-3.5" />;
      case 'Audio': return <Headphones className="w-3.5 h-3.5" />;
      case 'Rerank': return <Layers className="w-3.5 h-3.5" />;
      case 'Speech': return <Sparkles className="w-3.5 h-3.5" />;
      case 'Embeddings': return <BarChart2 className="w-3.5 h-3.5" />;
      case 'Transcription': return <Terminal className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] text-[#E4E3E0] overflow-hidden">
      
      {/* Search Header Area */}
      <div className="px-8 py-5 border-b border-[#1f2235] bg-[#0c0d12] shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono text-[#b8ff57] bg-[#b8ff57]/10 px-2 py-0.5 uppercase tracking-widest rounded-sm">
                {catalogSubView === 'directory' ? "DIRECTORY" : "INFRASTRUCTURE"}
              </span>
              <span className="text-[10px] font-mono text-[#4a5068]">INTELLIGENCE CATALOG</span>
            </div>
            
            {/* Sub-view switcher tabs */}
            <div className="flex items-center gap-4 mt-1">
              <button
                onClick={() => setCatalogSubView('directory')}
                className={cn(
                  "text-2xl font-serif italic font-bold tracking-tight transition-all",
                  catalogSubView === 'directory' ? "text-[#E4E3E0]" : "text-[#4a5068] hover:text-[#888]"
                )}
              >
                Models
              </button>
              <span className="text-[#2a2a2a] text-xl font-serif font-bold italic select-none">/</span>
              <button
                onClick={() => setCatalogSubView('infrastructure')}
                className={cn(
                  "text-2xl font-serif italic font-bold tracking-tight transition-all",
                  catalogSubView === 'infrastructure' ? "text-[#E4E3E0]" : "text-[#4a5068] hover:text-[#888]"
                )}
              >
                Providers
              </button>
            </div>
          </div>

          {/* Search Models, compare buttons, dropdowns - ONLY shown if in directory sub-view */}
          {catalogSubView === 'directory' && (
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#555]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2a2a2a] text-xs px-9 py-2.5 rounded-sm focus:outline-none focus:border-[#b8ff57] font-mono text-[#E4E3E0]"
                />
                <span className="absolute right-3 top-2.5 text-[9px] font-mono text-[#555] bg-[#0a0a0a] px-1 py-0.5 rounded border border-[#222]">⌘K</span>
              </div>

              <div className="flex items-center gap-1 bg-[#141414] border border-[#2a2a2a] p-1 rounded-sm font-mono text-[11px]">
                <ArrowUpDown className="w-3 h-3 text-[#555] ml-1.5" />
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-[#888] focus:outline-none pr-3 py-1 cursor-pointer"
                >
                  <option value="newest" className="bg-[#141414]">Newest</option>
                  <option value="price_low" className="bg-[#141414]">Lowest Price</option>
                  <option value="context_high" className="bg-[#141414]">Highest Context</option>
                </select>
              </div>

              <button className="bg-[#1e1e2d] hover:bg-[#b8ff57] hover:text-[#0a0a0a] text-xs font-mono px-4 py-2.5 border border-[#2c2c3e] transition-all uppercase tracking-wider flex items-center gap-1.5 rounded-sm">
                <Layers className="w-3.5 h-3.5" />
                <span>Compare</span>
              </button>

              <div className="flex items-center gap-1 bg-[#141414] border border-[#2a2a2a] p-1 rounded-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={cn("p-1.5 transition-colors", viewMode === 'grid' ? "bg-[#b8ff57] text-[#0a0a0a]" : "text-[#555] hover:text-[#E4E3E0]")}
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn("p-1.5 transition-colors", viewMode === 'list' ? "bg-[#b8ff57] text-[#0a0a0a]" : "text-[#555] hover:text-[#E4E3E0]")}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modality Tabs - ONLY shown if in directory sub-view */}
        {catalogSubView === 'directory' && (
          <div className="flex items-center gap-2 mt-5 overflow-x-auto border-t border-[#1f2235]/40 pt-4 scrollbar-none">
            {Object.entries(tabCounts).map(([mod, count]) => {
              const isActive = activeModality === mod;
              return (
                <button
                  key={mod}
                  onClick={() => setActiveModality(mod)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-wider transition-all border shrink-0",
                    isActive 
                      ? "bg-[#b8ff57]/15 border-[#b8ff57] text-[#b8ff57] font-bold" 
                      : "bg-transparent border-[#1f2235] text-[#888] hover:text-[#E4E3E0] hover:border-[#444]"
                  )}
                >
                  {getModalityIcon(mod)}
                  <span>{mod}</span>
                  <span className={cn(
                    "text-[9px] font-mono px-1.5 py-0.5 rounded-full ml-1",
                    isActive ? "bg-[#b8ff57] text-[#0a0a0a] font-bold" : "bg-[#141414] text-[#555]"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main split work area */}
      <div className="flex-1 flex overflow-hidden">
        {catalogSubView === 'directory' ? (
          <>
            {/* Left sidebar filters panel */}
            <aside className="w-72 border-r border-[#1f2235] bg-[#0c0d12]/95 overflow-y-auto divide-y divide-[#1f2235]/40 select-none scrollbar-thin shrink-0">
          
          {/* Section: Input Modalities */}
          <div className="p-4">
            <button 
              onClick={() => toggleFilter('modalities')}
              className="w-full flex items-center justify-between text-left mb-2 text-[11px] font-serif italic text-[#888] uppercase tracking-widest"
            >
              <span>Input Modalities</span>
              {expandedFilters.modalities ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            
            {expandedFilters.modalities && (
              <div className="space-y-2 mt-3 font-mono text-[11px] text-[#888]">
                {Object.keys(inputModalities).map(key => (
                  <label key={key} className="flex items-center gap-2 hover:text-[#E4E3E0] cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={inputModalities[key]}
                      onChange={(e) => setInputModalities(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-[#2a2a2a] bg-[#141414] text-[#b8ff57] focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="uppercase">{key}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Section: Context Length */}
          <div className="p-4">
            <button 
              onClick={() => toggleFilter('context')}
              className="w-full flex items-center justify-between text-left mb-2 text-[11px] font-serif italic text-[#888] uppercase tracking-widest"
            >
              <span>Context Length</span>
              {expandedFilters.context ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-[#555]" />}
            </button>
            {expandedFilters.context && (
              <div className="space-y-3 mt-3">
                <div className="flex justify-between text-[10px] font-mono text-[#555]">
                  <span>10K</span>
                  <span className="text-[#b8ff57]">{contextSlider >= 1000000 ? `${(contextSlider/1000000).toFixed(1)}M` : `${contextSlider/1000}K`} tokens</span>
                  <span>2.0M</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="2000000"
                  step="10000"
                  value={contextSlider}
                  onChange={(e) => setContextSlider(Number(e.target.value))}
                  className="w-full accent-[#b8ff57] bg-[#1a1a1a] h-1 rounded-lg cursor-pointer"
                />
                <div className="flex flex-wrap gap-1">
                  {[32000, 128000, 1000000, 2000000].map(val => (
                    <button
                      key={val}
                      onClick={() => setContextSlider(val)}
                      className={cn(
                        "text-[9px] font-mono px-2 py-1 rounded border",
                        contextSlider === val 
                          ? "border-[#b8ff57] text-[#b8ff57] bg-[#b8ff57]/5" 
                          : "border-[#2a2a2a] text-[#555] hover:border-[#444]"
                      )}
                    >
                      {val >= 1000000 ? `${val/1000000}M` : `${val/1000}K`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Prompt Pricing */}
          <div className="p-4">
            <button 
              onClick={() => toggleFilter('pricing')}
              className="w-full flex items-center justify-between text-left mb-2 text-[11px] font-serif italic text-[#888] uppercase tracking-widest"
            >
              <span>Prompt Pricing</span>
              {expandedFilters.pricing ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-[#555]" />}
            </button>
            {expandedFilters.pricing && (
              <div className="space-y-3 mt-3">
                <div className="flex justify-between text-[10px] font-mono text-[#555]">
                  <span>Free</span>
                  <span className="text-[#b8ff57]">&lt; ${pricingSlider}/M</span>
                  <span>$25/M</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={pricingSlider}
                  onChange={(e) => setPricingSlider(Number(e.target.value))}
                  className="w-full accent-[#b8ff57] bg-[#1a1a1a] h-1 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Section: Series */}
          <div className="p-4">
            <button 
              onClick={() => toggleFilter('series')}
              className="w-full flex items-center justify-between text-left mb-2 text-[11px] font-serif italic text-[#888] uppercase tracking-widest"
            >
              <span>Series</span>
              {expandedFilters.series ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-[#555]" />}
            </button>
            {expandedFilters.series && (
              <div className="space-y-2 mt-3 font-mono text-[11px] text-[#888]">
                {Object.keys(selectedSeries).map(key => (
                  <label key={key} className="flex items-center gap-2 hover:text-[#E4E3E0] cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedSeries[key]}
                      onChange={(e) => setSelectedSeries(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-[#2a2a2a] bg-[#141414] text-[#b8ff57] focus:ring-0"
                    />
                    <span>{key}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Section: Categories */}
          <div className="p-4">
            <button 
              onClick={() => toggleFilter('categories')}
              className="w-full flex items-center justify-between text-left mb-2 text-[11px] font-serif italic text-[#888] uppercase tracking-widest"
            >
              <span>Categories</span>
              {expandedFilters.categories ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-[#555]" />}
            </button>
            {expandedFilters.categories && (
              <div className="space-y-2 mt-3 font-mono text-[11px] text-[#888]">
                {['Reasoning', 'Vision Multimodal', 'Image Generation', 'Fast Execution', 'Coding Assistants'].map(cat => (
                  <label key={cat} className="flex items-center gap-2 hover:text-[#E4E3E0] cursor-pointer">
                    <input 
                      type="checkbox"
                      defaultChecked={true}
                      className="rounded border-[#2a2a2a] bg-[#141414] text-[#b8ff57] focus:ring-0"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Section: Supported Parameters */}
          <div className="p-4">
            <button 
              onClick={() => toggleFilter('params')}
              className="w-full flex items-center justify-between text-left mb-2 text-[11px] font-serif italic text-[#888] uppercase tracking-widest"
            >
              <span>Supported Parameters</span>
              {expandedFilters.params ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-[#555]" />}
            </button>
            {expandedFilters.params && (
              <div className="space-y-2 mt-3 font-mono text-[11px] text-[#888]">
                {Object.keys(selectedParams).map(key => (
                  <label key={key} className="flex items-center gap-2 hover:text-[#E4E3E0] cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedParams[key]}
                      onChange={(e) => setSelectedParams(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-[#2a2a2a] bg-[#141414] text-[#b8ff57] focus:ring-0"
                    />
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible features checklist */}
          <div className="p-4 space-y-3">
            <div className="text-[10px] font-mono text-[#555] tracking-widest uppercase">Attributes</div>
            <div className="space-y-2 font-mono text-[11px] text-[#888]">
              <label className="flex items-center justify-between hover:text-[#E4E3E0] cursor-pointer">
                <span>Distillable</span>
                <input 
                  type="checkbox"
                  checked={showDistillableOnly}
                  onChange={(e) => setShowDistillableOnly(e.target.checked)}
                  className="rounded border-[#2a2a2a] bg-[#141414] text-[#b8ff57] focus:ring-0"
                />
              </label>
              <label className="flex items-center justify-between hover:text-[#E4E3E0] cursor-pointer">
                <span>Zero Data Retention</span>
                <input 
                  type="checkbox"
                  checked={showZeroDataRetention}
                  onChange={(e) => setShowZeroDataRetention(e.target.checked)}
                  className="rounded border-[#2a2a2a] bg-[#141414] text-[#b8ff57] focus:ring-0"
                />
              </label>
              <label className="flex items-center justify-between hover:text-[#E4E3E0] cursor-pointer">
                <span>In-Region Routing</span>
                <input 
                  type="checkbox"
                  checked={showInRegionOnly}
                  onChange={(e) => setShowInRegionOnly(e.target.checked)}
                  className="rounded border-[#2a2a2a] bg-[#141414] text-[#b8ff57] focus:ring-0"
                />
              </label>
              <label className="flex items-center justify-between hover:text-[#E4E3E0] cursor-pointer">
                <span>Tool Calling</span>
                <input 
                  type="checkbox"
                  checked={showToolCallingOnly}
                  onChange={(e) => setShowToolCallingOnly(e.target.checked)}
                  className="rounded border-[#2a2a2a] bg-[#141414] text-[#b8ff57] focus:ring-0"
                />
              </label>
              <label className="flex items-center justify-between hover:text-[#E4E3E0] cursor-pointer">
                <span className="text-[#555]">Inactive Models</span>
                <input 
                  type="checkbox"
                  disabled
                  className="rounded border-[#1a1a1a] bg-[#0c0d12] text-[#555] focus:ring-0 opacity-50"
                />
              </label>
            </div>
          </div>

          {/* Artificial Analysis / Design Arena (third-party benchmarks) */}
          <div className="p-4">
            <button 
              onClick={() => toggleFilter('arena')}
              className="w-full flex items-center justify-between text-left mb-2 text-[11px] font-serif italic text-[#888] uppercase tracking-widest"
            >
              <span>Artificial Analysis</span>
              {expandedFilters.arena ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-[#555]" />}
            </button>
            {expandedFilters.arena && (
              <div className="mt-3 space-y-2 font-mono text-[10px] text-[#555]">
                <div className="flex justify-between items-center bg-[#141414]/50 p-2 border border-[#2a2a2a]/20">
                  <span>Chatbot Arena Elo</span>
                  <span className="text-[#b8ff57]">1340+</span>
                </div>
                <div className="flex justify-between items-center bg-[#141414]/50 p-2 border border-[#2a2a2a]/20">
                  <span>MMLU-Pro Rating</span>
                  <span className="text-[#b8ff57]">88.5%</span>
                </div>
                <div className="flex justify-between items-center bg-[#141414]/50 p-2 border border-[#2a2a2a]/20">
                  <span>SWE-bench Success</span>
                  <span className="text-[#b8ff57]">42.1%</span>
                </div>
              </div>
            )}
          </div>

          {/* Section: Providers */}
          <div className="p-4">
            <button 
              onClick={() => toggleFilter('providers')}
              className="w-full flex items-center justify-between text-left mb-2 text-[11px] font-serif italic text-[#888] uppercase tracking-widest"
            >
              <span>Providers</span>
              {expandedFilters.providers ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-[#555]" />}
            </button>
            {expandedFilters.providers && (
              <div className="space-y-2 mt-3 font-mono text-[11px] text-[#888] max-h-48 overflow-y-auto pr-1">
                {Object.keys(selectedProviders).map(key => (
                  <label key={key} className="flex items-center gap-2 hover:text-[#E4E3E0] cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedProviders[key]}
                      onChange={(e) => setSelectedProviders(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-[#2a2a2a] bg-[#141414] text-[#b8ff57] focus:ring-0"
                    />
                    <span>{key}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Section: Model Authors */}
          <div className="p-4">
            <button 
              onClick={() => toggleFilter('authors')}
              className="w-full flex items-center justify-between text-left mb-2 text-[11px] font-serif italic text-[#888] uppercase tracking-widest"
            >
              <span>Model Authors</span>
              {expandedFilters.authors ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5 text-[#555]" />}
            </button>
            {expandedFilters.authors && (
              <div className="space-y-2 mt-3 font-mono text-[11px] text-[#888]">
                {['Independent', 'Large Lab', 'Open Source Group'].map(auth => (
                  <label key={auth} className="flex items-center gap-2 hover:text-[#E4E3E0] cursor-pointer">
                    <input 
                      type="checkbox"
                      defaultChecked={true}
                      className="rounded border-[#2a2a2a] bg-[#141414] text-[#b8ff57] focus:ring-0"
                    />
                    <span>{auth}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

        </aside>

        {/* Scrollable grid/list of model cards */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#08080c] scrollbar-thin">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-mono text-[#555] tracking-widest uppercase">
              // Found {sortedModels.length} models matching active parameters
            </div>
            {selectedModelId && (
              <div className="text-[10px] font-mono text-[#b8ff57] bg-[#b8ff57]/5 border border-[#b8ff57]/20 px-2 py-1 rounded-sm">
                Selected: {selectedModelId}
              </div>
            )}
          </div>

          {/* Cards Render */}
          <div className={cn(
            "grid gap-4 transition-all",
            viewMode === 'grid' 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1"
          )}>
            {sortedModels.map(model => {
              const isSelected = selectedModelId === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => onSelectModel(model.id)}
                  className={cn(
                    "relative bg-[#0c0d12]/90 hover:bg-[#11131c] transition-all duration-300 p-5 rounded-md cursor-pointer border flex flex-col justify-between group",
                    isSelected 
                      ? "border-[#5b5eff] shadow-[0_0_18px_rgba(91,94,255,0.15)]" 
                      : "border-[#1f2235]/60 hover:border-[#383d5a]"
                  )}
                >
                  {/* Token Count Indicator */}
                  <div className="absolute top-4 right-4 text-[9px] font-mono text-[#5b5eff] bg-[#5b5eff]/5 px-2 py-0.5 rounded border border-[#5b5eff]/10 uppercase tracking-widest">
                    {model.tokenCount}
                  </div>

                  <div>
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap max-w-[80%]">
                      <div className="w-5 h-5 rounded-sm bg-slate-900 border border-[#2a2a2a] flex items-center justify-center font-mono font-bold text-[10px] text-[#888]">
                        {model.provider.substring(0, 1)}
                      </div>
                      <h3 className="text-xs font-mono font-bold text-[#E4E3E0] group-hover:text-white transition-colors truncate">
                        {model.name}
                      </h3>
                      <span className="text-[9px] font-mono bg-white/5 border border-white/5 px-1.5 py-0.5 text-[#555] rounded flex items-center gap-1 shrink-0 uppercase">
                        {getModalityIcon(model.modality)}
                        <span>{model.modality}</span>
                      </span>
                    </div>

                    {/* Description Paragraph */}
                    <p className="text-[11px] font-mono text-[#888] leading-relaxed mb-4 line-clamp-3">
                      {model.description}
                    </p>
                  </div>

                  {/* Metadata Row */}
                  <div className="border-t border-[#1f2235]/30 pt-3 mt-3 flex items-center justify-between">
                    <div className="text-[9px] font-mono text-[#555] uppercase tracking-wider space-x-1 flex flex-wrap gap-1 items-center">
                      <span>by</span>
                      <span className="text-[#888]">{model.provider}</span>
                      <span>|</span>
                      <span>{model.date}</span>
                      <span>|</span>
                      <span className="text-[#5b5eff]">{model.contextSize}</span>
                    </div>

                    <div className="text-[9px] font-mono text-[#00e5a0] uppercase font-bold">
                      {model.inputPrice}
                    </div>
                  </div>

                  {/* Active Blue Selection Outline Accent */}
                  {isSelected && (
                    <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-[#5b5eff] rounded-l-md" />
                  )}
                </div>
              );
            })}

            {sortedModels.length === 0 && (
              <div className="col-span-full text-center py-24 font-mono text-xs text-[#555] uppercase tracking-widest border border-dashed border-[#1f2235] rounded-md p-10 bg-[#0c0d12]/20">
                <HelpCircle className="w-8 h-8 text-[#333] mx-auto mb-3" />
                No models found matching active parameters. Try expanding your search queries or resetting filters.
              </div>
            )}
          </div>

          {/* Quick interactive action bar for selected model */}
          {selectedModelId && (
            <div className="mt-8 bg-[#0c0d12] border border-[#1f2235] p-5 rounded-md flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#5b5eff] to-transparent" />
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#5b5eff]/10 rounded border border-[#5b5eff]/20 text-[#5b5eff]">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif italic text-xs uppercase tracking-wider text-[#E4E3E0]">Activate Model Parameter Control</h4>
                  <p className="text-[10px] font-mono text-[#555] leading-relaxed max-w-xl">
                    Configure your Multi-Agent Playground instances with <strong>{selectedModelId}</strong> directly. Click launch to initialize runtime prompts and parameters side-by-side.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={onOpenKeysModal}
                  className="px-4 py-2 border border-[#2a2a2a] hover:border-[#b8ff57] text-[10px] font-mono uppercase text-[#888] hover:text-white transition-all flex items-center gap-1.5 rounded-sm"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Setup Keys</span>
                </button>
                <button
                  onClick={() => onSelectModel(selectedModelId)}
                  className="px-4 py-2 bg-[#b8ff57] hover:bg-white text-[#0a0a0a] text-[10px] font-mono uppercase font-bold transition-all flex items-center gap-1.5 rounded-sm shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch in Chat</span>
                </button>
              </div>
            </div>
          )}

        </main>
          </>
        ) : (
          <ProvidersView />
        )}
      </div>

    </div>
  );
}
