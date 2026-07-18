import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Plus, Trash2, Edit2, Sliders, Play, Check, 
  HelpCircle, RefreshCw, Layers, Terminal, Copy, Cpu
} from 'lucide-react';
import { CATALOG_MODELS } from './ModelsCatalog';
import { ModelName } from '../types';
import { cn } from '../utils';

interface Preset {
  id: string;
  name: string;
  model: ModelName;
  temperature: number;
  systemPrompt: string;
  providerRules: string; // e.g. "Primary: Sakana -> Fallback: Anthropic"
}

const INITIAL_PRESETS: Preset[] = [
  {
    id: 'pr-1',
    name: 'Fugu Multi-Agent Agentic Cascade',
    model: 'fugu-ultra',
    temperature: 0.65,
    systemPrompt: 'You are the orchestrating Fugu Ultra router. When receiving complex user programming prompts, recursively subdivide the task, prompt the sandboxed coding agent, analyze its terminal errors, and return a completed layout.',
    providerRules: 'Primary: Sakana -> Fallback: Anthropic -> Fallback 2: Google'
  },
  {
    id: 'pr-2',
    name: 'Strict System-Level Coder',
    model: 'north-mini-code',
    temperature: 0.1,
    systemPrompt: 'You are a senior systems programmer. Return exclusively syntactically flawless TypeScript, with type-safety checks enforced. Do not include introductory text or markdown conversational commentary.',
    providerRules: 'Primary: Cohere -> Fallback: OpenAI'
  },
  {
    id: 'pr-3',
    name: 'Creative Imagery Prompt Planner',
    model: 'claude-fable-latest',
    temperature: 1.15,
    systemPrompt: 'Generate incredibly rich, atmospheric visual prompts for image generation models. Utilize descriptive nouns, photographic lighting parameters (e.g. volumetric rays, anamorphic glare, 35mm film grain), and exact focus descriptors.',
    providerRules: 'Primary: Anthropic -> Fallback: Google'
  }
];

export function PresetsView() {
  const [presets, setPresets] = useState<Preset[]>(() => {
    const saved = localStorage.getItem('wonderland_user_presets');
    return saved ? JSON.parse(saved) : INITIAL_PRESETS;
  });

  const [name, setName] = useState('');
  const [model, setModel] = useState<ModelName>('fugu-ultra');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [providerRules, setProviderRules] = useState('Primary: Preferred Provider -> Fallback: Auto-Route');
  
  // Edit mode tracking
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('wonderland_user_presets', JSON.stringify(presets));
  }, [presets]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      // Edit existing
      setPresets(prev => prev.map(p => p.id === editingId ? {
        ...p,
        name: name.trim(),
        model,
        temperature,
        systemPrompt: systemPrompt.trim(),
        providerRules: providerRules.trim()
      } : p));
      showNotification('Preset updated successfully');
      setEditingId(null);
    } else {
      // Create new
      const newPreset: Preset = {
        id: 'preset-' + Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        model,
        temperature,
        systemPrompt: systemPrompt.trim(),
        providerRules: providerRules.trim()
      };
      setPresets(prev => [...prev, newPreset]);
      showNotification('Preset created successfully');
    }

    // Reset Form
    setName('');
    setModel('fugu-ultra');
    setTemperature(0.7);
    setSystemPrompt('');
    setProviderRules('Primary: Preferred Provider -> Fallback: Auto-Route');
  };

  const handleEditClick = (p: Preset) => {
    setEditingId(p.id);
    setName(p.name);
    setModel(p.model);
    setTemperature(p.temperature);
    setSystemPrompt(p.systemPrompt);
    setProviderRules(p.providerRules);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this named preset configuration?')) {
      setPresets(prev => prev.filter(p => p.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setName('');
        setModel('fugu-ultra');
        setTemperature(0.7);
        setSystemPrompt('');
        setProviderRules('Primary: Preferred Provider -> Fallback: Auto-Route');
      }
      showNotification('Preset deleted');
    }
  };

  const textModelsOnly = CATALOG_MODELS.filter(m => m.modality === 'Text' || m.modality === 'Image');

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080c] p-6 lg:p-8 space-y-8 scrollbar-thin">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2235]/40 pb-6">
        <div>
          <div className="text-[10px] text-[#b8ff57] bg-[#b8ff57]/10 px-2 py-0.5 rounded w-max uppercase tracking-widest font-mono font-bold mb-2 border border-[#b8ff57]/20">
            Named Parameters
          </div>
          <h2 className="text-xl font-serif italic font-bold text-[#E4E3E0] tracking-tight">
            Model Configuration Presets
          </h2>
          <p className="text-xs font-mono text-[#5e6686] mt-1">
            Formulate global named configurations (hyperparameters, providers, routing prioritizations) to invoke them inside Multi-Agent nodes without repetition.
          </p>
        </div>

        {notification && (
          <div className="text-[9.5px] font-mono text-[#b8ff57] bg-[#b8ff57]/10 px-3 py-1.5 border border-[#b8ff57]/30 rounded">
            // {notification}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Preset Form */}
        <div className="xl:col-span-1 bg-[#0c0d12]/90 border border-[#1f2235]/60 p-6 rounded shadow-md font-mono space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f2235]/30 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#b8ff57]" />
              <h3 className="text-xs font-bold tracking-wider text-white uppercase">
                {editingId ? 'Edit Named Preset' : 'Compile New Preset'}
              </h3>
            </div>
            {editingId && (
              <button 
                onClick={() => {
                  setEditingId(null);
                  setName('');
                  setModel('fugu-ultra');
                  setTemperature(0.7);
                  setSystemPrompt('');
                  setProviderRules('Primary: Preferred Provider -> Fallback: Auto-Route');
                }}
                className="text-[8.5px] text-amber-500 hover:underline uppercase"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSavePreset} className="space-y-4">
            
            {/* Preset Name */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">
                Preset Name / Label
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Ultra Code Refactoring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-3 py-2 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57] transition-all"
              />
            </div>

            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">
                Model Engine Target
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as ModelName)}
                className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-2 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57] cursor-pointer"
              >
                {textModelsOnly.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">
                  Temperature ({temperature.toFixed(2)})
                </label>
                <span className="text-[8.5px] text-[#5e6686] uppercase">
                  {temperature < 0.3 ? 'Deterministic' : temperature > 1.0 ? 'Highly Creative' : 'Balanced'}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-[#b8ff57] bg-[#07080d] h-1.5 rounded-full cursor-pointer border border-[#1f2235]"
              />
              <div className="flex justify-between text-[7.5px] text-[#5e6686]">
                <span>0.0 (COHERENT)</span>
                <span>1.0 (STANDARD)</span>
                <span>2.0 (RANDOM)</span>
              </div>
            </div>

            {/* System Instructions */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">
                System Prompt / Directives
              </label>
              <textarea
                rows={5}
                required
                placeholder="Declare precise behavioral bounds and guidelines..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm p-3 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57] transition-all resize-none scrollbar-thin leading-normal"
              />
            </div>

            {/* Routing Rules */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">
                Provider Fallback Priority Routing
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Primary: OpenAI -> Fallback: Anthropic"
                value={providerRules}
                onChange={(e) => setProviderRules(e.target.value)}
                className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-3 py-2 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57] transition-all"
              />
              <div className="text-[8px] text-[#5e6686] uppercase tracking-wider mt-1">// Enforce secondary and tertiary endpoints.</div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#b8ff57] hover:bg-[#a5e64e] border border-black/10 text-black font-extrabold py-2 rounded-sm text-[10px] uppercase tracking-widest transition-all"
            >
              {editingId ? 'Update Preset Configuration' : 'Save Parameter Preset'}
            </button>
          </form>
        </div>

        {/* Existing Presets List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-5 rounded shadow-md font-mono flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#5b5eff]" />
            <h3 className="text-xs font-bold tracking-wider text-white uppercase">Saved Parameters Repository</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presets.map((p) => {
              const matchingModel = CATALOG_MODELS.find(m => m.id === p.model);
              return (
                <div 
                  key={p.id} 
                  className={cn(
                    "bg-[#0c0d12]/90 border border-[#1f2235]/60 rounded p-5 space-y-4 font-mono hover:border-[#b8ff57]/40 transition-all flex flex-col justify-between",
                    editingId === p.id ? "ring-2 ring-[#b8ff57] border-transparent" : ""
                  )}
                >
                  <div className="space-y-3">
                    {/* Upper title */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-extrabold text-white tracking-tight">{p.name}</h4>
                        <span className="text-[8px] text-[#5e6686] uppercase">PRESET ID: {p.id}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="p-1 hover:bg-[#1a1c2e] text-[#808eb5] hover:text-[#b8ff57] rounded transition-colors"
                          title="Modify configuration"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeletePreset(p.id, e)}
                          className="p-1 hover:bg-red-500/10 text-[#808eb5] hover:text-red-500 rounded transition-colors"
                          title="Remove preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Meta Specs */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-b border-[#1f2235]/30 py-2 text-[9px]">
                      <div className="bg-[#1a1c2e] text-[#5b5eff] px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                        <Cpu className="w-2.5 h-2.5" />
                        <span>{matchingModel ? matchingModel.name.split(':')[1]?.trim() || matchingModel.name : p.model}</span>
                      </div>
                      <div className="bg-[#141d1a] text-[#b8ff57] px-2 py-0.5 rounded font-bold">
                        TEMP: {p.temperature.toFixed(2)}
                      </div>
                    </div>

                    {/* System prompt preview */}
                    <div className="space-y-1">
                      <span className="text-[8.5px] uppercase tracking-wider text-[#5e6686] block font-bold">// SYSTEM PROMPT DIRECTIVE:</span>
                      <p className="text-[10px] text-slate-300 leading-normal line-clamp-3 bg-[#07080d] p-2.5 border border-[#1f2235]/40 rounded-sm">
                        {p.systemPrompt}
                      </p>
                    </div>
                  </div>

                  {/* Routing Rules footer */}
                  <div className="pt-3 border-t border-[#1f2235]/25 text-[8.5px] text-[#808eb5] flex items-center justify-between">
                    <span className="uppercase font-bold tracking-wider font-mono">Routing Logic</span>
                    <span className="text-white truncate max-w-[200px]" title={p.providerRules}>{p.providerRules}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
