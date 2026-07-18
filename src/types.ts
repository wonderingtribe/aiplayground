export type ModelName = 
  | 'gemini-3-flash-preview'
  | 'gemini-3.1-pro-preview'
  | 'gemini-2.5-flash-image'
  | 'gemini-3.1-flash-image-preview'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-haiku-20241022'
  | 'llama-3.3-70b-versatile'
  | 'fugu-ultra'
  | 'happyhorse-1.1'
  | 'gpt-image-2'
  | 'gpt-image-1-mini'
  | 'gpt-image-1'
  | 'happyhorse-1.0'
  | 'nano-banana-2'
  | 'nano-banana-pro'
  | 'north-mini-code'
  | 'glm-5.2'
  | 'fusion'
  | 'kimi-k2.7-code'
  | 'llama-nemotron-rerank-vl-1b-v2'
  | 'claude-fable-latest'
  | 'claude-fable-5'
  | 'nex-n2-pro'
  | 'riverflow-v2.5-pro'
  | 'riverflow-v2.5-fast'
  | 'nemotron-3.5-content-safety'
  | 'nemotron-3-ultra'
  | 'qwen3.7-plus'
  | 'mai-voice-2'
  | 'llama-4-scout'
  | 'llama-4-maverick'
  | 'mistral-large-3'
  | 'mistral-small-3'
  | 'deepseek-v3'
  | 'deepseek-r1'
  | 'grok-3'
  | 'amazon-nova-pro'
  | 'jamba-2'
  | 'reka-core'
  | 'palmyra-x'
  | 'stable-diffusion-4'
  | 'midjourney-7'
  | 'ideogram-3'
  | 'recraft-v3'
  | 'runway-gen4'
  | 'pika-3'
  | 'kling-2'
  | 'sora-2'
  | 'eleven-turbo-v3'
  | 'openai-tts-1'
  | 'cartesia-sonic'
  | 'text-embedding-3'
  | 'cohere-embed-v4'
  | 'google-embedding-2'
  | 'whisper-large-v4'
  | 'deepgram-nova-3'
  | 'audio-gen-2';

export interface TrainingExample {
  id: string;
  user: string;
  model: string;
}

export interface AIModule {
  id: string;
  name: string;
  config: PlaygroundConfig;
  training: TrainingExample[];
}

export interface PlaygroundConfig {
  model: ModelName;
  systemInstruction: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens?: number;
  showRobot?: boolean;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface MemoryNode {
  id: string;
  title: string;
  content: string;
  type: 'decision' | 'bug' | 'pattern' | 'context' | 'file' | 'note';
  ts: number;
}

export interface NexusEvent {
  id: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  source?: string;
  line?: number;
  col?: number;
  stack?: string;
  timestamp: number;
}

export interface WorkflowNode {
  id: string;
  type: string;
  category: 'trigger' | 'app' | 'core' | 'ai' | 'dream_maker' | 'storage';
  label: string;
  x: number;
  y: number;
  config: {
    title?: string;
    description?: string;
    code?: string;
    webhookUrl?: string;
    scheduleInterval?: string;
    scheduleEnabled?: boolean;
    cronExpression?: string;
    model?: ModelName;
    systemPrompt?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    promptTemplate?: string;
    httpMethod?: string;
    httpUrl?: string;
    httpHeaders?: string;
    httpBody?: string;
    conditionOperator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'regex';
    conditionLeft?: string;
    conditionRight?: string;
    switchCases?: { value: string; label: string }[];
    switchOperator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'regex';
    retryCount?: number;
    retryDelay?: number;
    continueOnError?: boolean;
    mockInputs?: Record<string, string>;
    mockOutputs?: Record<string, any>;
    useInTrainingSet?: boolean;
    loopItems?: string;
    loopVarName?: string;
    whileCondition?: string;
    whileMaxIterations?: number;
    mergeMode?: 'array' | 'object';
    splitMode?: 'first' | 'all';
    buffer?: string;
    query?: string;
  };
  memoryId?: string;
  useInTrainingSet?: boolean;
}

export interface WorkflowConnection {
  id: string;
  fromId: string;
  toId: string;
  isTrainingEdge?: boolean;
  fromPort?: string;
}

export interface Session {
  user: {
    id: string;
    email?: string;
  };
  access_token: string;
}
