import { useState } from 'react';
import { Settings, Sliders, MessageSquare, Info, ChevronRight, ChevronDown, Bot, Plus, Trash2, GraduationCap, X, Key, RotateCcw, Filter } from 'lucide-react';
import { PlaygroundConfig, ModelName, AIModule, TrainingExample } from '../types';
import { cn } from '../utils';

interface SidebarProps {
  modules: AIModule[];
  activeId: string;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<AIModule>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onOpenKeysModal: () => void;
}

const MODELS: { value: ModelName; label: string; desc: string; provider: string }[] = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', desc: 'Fast, lightweight', provider: 'Google' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', desc: 'Complex reasoning', provider: 'Google' },
  { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', desc: 'Image generation', provider: 'Google' },
  { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image', desc: 'High-quality images', provider: 'Google' },
  { value: 'gpt-4o', label: 'ChatGPT GPT-4o', desc: 'OpenAI Multimodal flagship', provider: 'OpenAI' },
  { value: 'gpt-4o-mini', label: 'ChatGPT GPT-4o Mini', desc: 'Fast, efficient assistant', provider: 'OpenAI' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', desc: 'Anthropic state-of-the-art', provider: 'Anthropic' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', desc: 'Fastest Claude model', provider: 'Anthropic' },
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', desc: 'Groq ultra-fast open source', provider: 'Groq' },
  { value: 'fugu-ultra', label: 'Fugu Ultra', desc: 'Sakana learned multi-agent orchestration for complex multi-step reasoning & coding (132M tokens)', provider: 'Sakana' },
  { value: 'happyhorse-1.1', label: 'HappyHorse 1.1', desc: 'Alibaba video generator up to 1080p, stronger prompt adherence, smoother motion (3-15s)', provider: 'Alibaba' },
  { value: 'happyhorse-1.0', label: 'HappyHorse 1.0', desc: 'Alibaba video generation across a range of aspect ratios from text prompts or reference images', provider: 'Alibaba' },
  { value: 'gpt-image-2', label: 'GPT Image 2', desc: 'OpenAI latest image generation and editing via dedicated high-fidelity Images API (247K tokens)', provider: 'OpenAI' },
  { value: 'gpt-image-1-mini', label: 'GPT Image 1 Mini', desc: 'OpenAI cost-efficient high-quality image generator at reduced latency and cost (36K tokens)', provider: 'OpenAI' },
  { value: 'gpt-image-1', label: 'GPT Image 1', desc: 'OpenAI image gen and edits, accurate text rendering, transparent backgrounds, reference images (60K tokens)', provider: 'OpenAI' },
  { value: 'nano-banana-2', label: 'Nano Banana 2', desc: 'Gemini 3.1 Flash Image. Pro-level visual quality at Flash speed, advanced context & aspect ratio control (844M tokens)', provider: 'Google' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro', desc: 'Gemini 3 Pro Image. Multimodal reasoning, real-world search grounding, consistent multi-image blending (578M)', provider: 'Google' },
  { value: 'north-mini-code', label: 'North Mini Code', desc: 'Cohere agentic coding MoE optimized for code generation, terminal tasks, and SWE-Agent harnesses (30B)', provider: 'Cohere' },
  { value: 'glm-5.2', label: 'GLM 5.2', desc: 'Z.ai large-scale reasoning model with 1M-token context for long-horizon agentic software engineering (1.9T)', provider: 'Z.ai' },
  { value: 'fusion', label: 'Fusion', desc: 'OpenRouter multi-model deliberation. Experts analyze prompt in parallel with web search and synthesize consensus', provider: 'OpenRouter' },
  { value: 'kimi-k2.7-code', label: 'Kimi K2.7 Code', desc: 'MoonshotAI end-to-end coding MoE model with native thinking mode and text/image inputs over 256K context', provider: 'MoonshotAI' },
  { value: 'llama-nemotron-rerank-vl-1b-v2', label: 'Llama Nemotron Rerank VL V2', desc: 'NVIDIA 1.7B multimodal reranking model for vision RAG pipelines (charts, tables, infographics)', provider: 'NVIDIA' },
  { value: 'claude-fable-latest', label: 'Claude Fable Latest', desc: 'Anthropic dynamic pointer always redirecting to the latest model in the Claude Fable family', provider: 'Anthropic' },
  { value: 'claude-fable-5', label: 'Claude Fable 5', desc: 'Anthropic Mythos-class autonomous knowledge work & coding agent with self-correcting verification loops', provider: 'Anthropic' },
  { value: 'nex-n2-pro', desc: 'Nex-N2-Pro', label: 'Nex-N2-Pro (Nex AGI)', provider: 'Nex AGI' },
  { value: 'riverflow-v2.5-pro', label: 'Riverflow V2.5 Pro', desc: 'Sourceful text-to-image with reasoning planning, multi-step edits, custom fonts, background controls', provider: 'Sourceful' },
  { value: 'riverflow-v2.5-fast', label: 'Riverflow V2.5 Fast', desc: 'Sourceful speed-optimized text-to-image pipeline, reasoning-steered candidate judging (no 4K)', provider: 'Sourceful' },
  { value: 'nemotron-3.5-content-safety', label: 'Nemotron 3.5 Safety', desc: 'NVIDIA 4B compact safety model moderating inputs/responses with category labels & reasoning trace', provider: 'NVIDIA' },
  { value: 'nemotron-3-ultra', label: 'Nemotron 3 Ultra', desc: 'NVIDIA 55B/550B hybrid Transformer-Mamba MoE for long-running high-throughput agent workflows', provider: 'NVIDIA' },
  { value: 'qwen3.7-plus', label: 'Qwen3.7 Plus', desc: 'Alibaba interactive hybrid agent, perceives scenes, reads screens, GUI navigation, code generation', provider: 'Qwen' },
  { value: 'mai-voice-2', label: 'MAI-Voice-2', desc: 'Microsoft Azure expressive text-to-speech with Ssml style support, speeds, and natural output', provider: 'Microsoft' },
];

const PROVIDERS = Array.from(new Set(MODELS.map(m => m.provider))).sort();

export function Sidebar({ modules, activeId, onSelect, onUpdate, onAdd, onRemove, onOpenKeysModal }: SidebarProps) {
  const activeModule = modules.find(m => m.id === activeId) || modules[0];
  const [providerFilter, setProviderFilter] = useState<string>('All');

  const updateConfig = (updates: Partial<PlaygroundConfig>) => {
    onUpdate(activeId, { config: { ...activeModule.config, ...updates } });
  };

  const resetAll = () => {
    onUpdate(activeId, {
      config: {
        model: MODELS[0].value,
        systemInstruction: '',
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        showRobot: false,
      },
      training: []
    });
    setProviderFilter('All');
  };

  const resetModelSelection = () => {
    updateConfig({ model: MODELS[0].value });
    setProviderFilter('All');
  };

  const resetParameters = () => {
    updateConfig({ temperature: 0.7, topP: 0.9, topK: 40 });
  };

  const resetSystemInstruction = () => {
    updateConfig({ systemInstruction: '' });
  };

  const resetTraining = () => {
    onUpdate(activeId, { training: [] });
  };

  const resetInteractiveMode = () => {
    updateConfig({ showRobot: false });
  };

  const addTrainingExample = () => {
    const newExample: TrainingExample = {
      id: Math.random().toString(36).substr(2, 9),
      user: '',
      model: '',
    };
    onUpdate(activeId, { training: [...activeModule.training, newExample] });
  };

  const updateTrainingExample = (id: string, updates: Partial<TrainingExample>) => {
    onUpdate(activeId, {
      training: activeModule.training.map(ex => ex.id === id ? { ...ex, ...updates } : ex)
    });
  };

  const removeTrainingExample = (id: string) => {
    onUpdate(activeId, {
      training: activeModule.training.filter(ex => ex.id !== id)
    });
  };

  return (
    <div className="w-80 h-full bg-[#141414] border-r border-[#2a2a2a] flex flex-col overflow-hidden">
      {/* Module Selector */}
      <div className="p-4 border-b border-[#2a2a2a] bg-[#0a0a0a]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif italic text-xs uppercase tracking-widest text-[#888]">Modules</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={resetAll}
              className="p-1 hover:bg-[#2a2a2a] text-[#888] hover:text-red-500 transition-all"
              title="Reset All"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={onAdd}
              className="p-1 hover:bg-[#2a2a2a] text-[#888] hover:text-[#E4E3E0] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {modules.map(m => (
            <div key={m.id} className="flex items-center group">
              <button
                onClick={() => onSelect(m.id)}
                className={cn(
                  "px-3 py-1 text-[10px] font-mono border transition-all",
                  activeId === m.id 
                    ? "bg-[#E4E3E0] border-[#E4E3E0] text-[#141414]" 
                    : "bg-transparent border-[#2a2a2a] text-[#555] hover:border-[#444]"
                )}
              >
                {m.name}
              </button>
              {modules.length > 1 && (
                <button 
                  onClick={() => onRemove(m.id)}
                  className="w-0 group-hover:w-5 overflow-hidden transition-all text-[#888] hover:text-red-500"
                >
                  <X className="w-3 h-3 ml-1" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          {/* Module Name */}
          <section>
            <label className="block text-[11px] font-serif italic text-[#888] uppercase mb-3">Module Name</label>
            <input
              type="text"
              value={activeModule.name}
              onChange={(e) => onUpdate(activeId, { name: e.target.value })}
              className="w-full bg-transparent border border-[#2a2a2a] p-2 text-xs text-[#E4E3E0] font-sans focus:outline-none focus:border-[#E4E3E0]"
            />
          </section>

          {/* Robot Mode */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[11px] font-serif italic text-[#888] uppercase mb-3 text-emerald-500">Interactive Mode</label>
              <button 
                onClick={resetInteractiveMode}
                className="p-1 hover:bg-[#2a2a2a] text-[#888] hover:text-[#E4E3E0] transition-all"
                title="Disable Robot Mode"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={() => updateConfig({ showRobot: !activeModule.config.showRobot })}
              className={cn(
                "w-full p-3 flex items-center justify-between border transition-all duration-200",
                activeModule.config.showRobot 
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" 
                  : "bg-transparent border-[#2a2a2a] text-[#888] hover:border-[#444]"
              )}
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                <span className="text-xs font-medium">3D Robot Interface</span>
              </div>
              <div className={cn(
                "w-2 h-2 rounded-full",
                activeModule.config.showRobot ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-[#333]"
              )} />
            </button>
          </section>

          {/* Model Selection */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-serif italic text-[#888] uppercase">Model Selection</label>
                <button 
                  onClick={resetModelSelection}
                  className="p-1 hover:bg-[#2a2a2a] text-[#888] hover:text-[#E4E3E0] transition-all"
                  title="Reset Model Selection"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <select
                    value={providerFilter}
                    onChange={(e) => setProviderFilter(e.target.value)}
                    className="bg-transparent border border-[#2a2a2a] text-[9px] font-mono text-[#888] px-1 py-0.5 rounded appearance-none focus:outline-none focus:border-[#E4E3E0] cursor-pointer"
                  >
                    <option value="All" className="bg-[#141414]">All Providers</option>
                    {PROVIDERS.map(p => (
                      <option key={p} value={p} className="bg-[#141414]">{p}</option>
                    ))}
                  </select>
                  <Filter className="w-2 h-2 absolute right-1.5 top-1.5 text-[#555] pointer-events-none" />
                </div>
                <button
                  onClick={onOpenKeysModal}
                  className="flex items-center gap-1 text-[9px] font-mono text-[#b8ff57] hover:underline cursor-pointer"
                >
                  <Key className="w-2.5 h-2.5" />
                  <span>API KEYS</span>
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 border-r border-[#1a1a1a] scrollbar-thin">
              {MODELS.filter(m => providerFilter === 'All' || m.provider === providerFilter).map((m) => (
                <button
                  key={m.value}
                  onClick={() => updateConfig({ model: m.value })}
                  className={cn(
                    "w-full p-3 text-left border transition-all duration-200",
                    activeModule.config.model === m.value 
                      ? "bg-[#E4E3E0] border-[#E4E3E0] text-[#141414]" 
                      : "bg-transparent border-[#2a2a2a] text-[#888] hover:border-[#444]"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium">{m.label}</span>
                    <span className={cn(
                      "text-[8px] font-mono px-1 py-0.5 border uppercase",
                      activeModule.config.model === m.value 
                        ? "border-[#141414]/30 text-[#141414]/80" 
                        : "border-[#2a2a2a] text-[#555]"
                    )}>
                      {m.provider}
                    </span>
                  </div>
                  <div className={cn("text-[10px] font-mono", activeModule.config.model === m.value ? "text-[#141414]/60" : "text-[#555]")}>
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* System Instruction */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[11px] font-serif italic text-[#888] uppercase">System Instruction</label>
              <button 
                onClick={resetSystemInstruction}
                className="p-1 hover:bg-[#2a2a2a] text-[#888] hover:text-[#E4E3E0] transition-all"
                title="Clear Instruction"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
            <textarea
              value={activeModule.config.systemInstruction}
              onChange={(e) => updateConfig({ systemInstruction: e.target.value })}
              placeholder="You are a helpful assistant..."
              className="w-full h-32 bg-transparent border border-[#2a2a2a] p-3 text-xs text-[#E4E3E0] font-sans focus:outline-none focus:border-[#E4E3E0] transition-colors resize-none"
            />
          </section>

          {/* Training / Few-Shot */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#888]">
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="text-[11px] font-serif italic uppercase">Training (Few-Shot)</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={resetTraining}
                  className="p-1 hover:bg-[#2a2a2a] text-[#888] hover:text-red-500 transition-all"
                  title="Reset Training"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button 
                  onClick={addTrainingExample}
                  className="p-1 hover:bg-[#2a2a2a] text-[#888] hover:text-[#E4E3E0] transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {activeModule.training.map((ex, idx) => (
                <div key={ex.id} className="p-3 border border-[#2a2a2a] bg-[#0a0a0a] space-y-3 relative group">
                  <button 
                    onClick={() => removeTrainingExample(ex.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#444] hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-[#444] uppercase">User Input</label>
                    <textarea
                      value={ex.user}
                      onChange={(e) => updateTrainingExample(ex.id, { user: e.target.value })}
                      className="w-full bg-transparent border-b border-[#2a2a2a] p-1 text-[11px] text-[#E4E3E0] focus:outline-none focus:border-[#E4E3E0] resize-none"
                      rows={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-[#444] uppercase">Model Response</label>
                    <textarea
                      value={ex.model}
                      onChange={(e) => updateTrainingExample(ex.id, { model: e.target.value })}
                      className="w-full bg-transparent border-b border-[#2a2a2a] p-1 text-[11px] text-[#E4E3E0] focus:outline-none focus:border-[#E4E3E0] resize-none"
                      rows={1}
                    />
                  </div>
                </div>
              ))}
              {activeModule.training.length === 0 && (
                <p className="text-[10px] text-[#444] font-mono italic text-center py-4 border border-dashed border-[#2a2a2a]">
                  No training examples added
                </p>
              )}
            </div>
          </section>

          {/* Parameters */}
          <section className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#888]">
                <Sliders className="w-3 h-3" />
                <span className="text-[11px] font-serif italic uppercase">Parameters</span>
              </div>
              <button 
                onClick={resetParameters}
                className="p-1 hover:bg-[#2a2a2a] text-[#888] hover:text-[#E4E3E0] transition-all"
                title="Reset Parameters"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {[
              { label: 'Temperature', key: 'temperature', min: 0, max: 2, step: 0.1 },
              { label: 'Top P', key: 'topP', min: 0, max: 1, step: 0.05 },
              { label: 'Top K', key: 'topK', min: 1, max: 100, step: 1 },
            ].map((param) => (
              <div key={param.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-[#666] uppercase">{param.label}</span>
                  <span className="text-[10px] font-mono text-[#E4E3E0]">{activeModule.config[param.key as keyof PlaygroundConfig]}</span>
                </div>
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={activeModule.config[param.key as keyof PlaygroundConfig] as number}
                  onChange={(e) => updateConfig({ [param.key]: parseFloat(e.target.value) })}
                  className="w-full accent-[#E4E3E0] h-1 bg-[#2a2a2a] rounded-none appearance-none cursor-pointer"
                />
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
