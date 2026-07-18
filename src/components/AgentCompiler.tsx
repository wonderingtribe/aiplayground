import React from 'react';
import { Sparkles, Cpu } from 'lucide-react';
import { ModelName, WorkflowNode } from '../types';
import { CATALOG_MODELS } from './ModelsCatalog';

interface AgentCompilerProps {
  creationAgentName: string;
  setCreationAgentName: (val: string) => void;
  creationBaseModel: ModelName;
  setCreationBaseModel: (val: ModelName) => void;
  creationSystemPrompt: string;
  setCreationSystemPrompt: (val: string) => void;
  creationToolWebSearch: boolean;
  setCreationToolWebSearch: (val: boolean) => void;
  creationToolCodeExecution: boolean;
  setCreationToolCodeExecution: (val: boolean) => void;
  creationToolVision: boolean;
  setCreationToolVision: (val: boolean) => void;
  creationToolMemory: boolean;
  setCreationToolMemory: (val: boolean) => void;
  nodes: WorkflowNode[];
  onSpawnAgent: () => void;
}

export function AgentCompiler({
  creationAgentName, setCreationAgentName,
  creationBaseModel, setCreationBaseModel,
  creationSystemPrompt, setCreationSystemPrompt,
  creationToolWebSearch, setCreationToolWebSearch,
  creationToolCodeExecution, setCreationToolCodeExecution,
  creationToolVision, setCreationToolVision,
  creationToolMemory, setCreationToolMemory,
  nodes,
  onSpawnAgent
}: AgentCompilerProps) {
  const trainingSources = nodes.filter(n => n.category === 'dream_maker' && n.config.useInTrainingSet);

  return (
    <>
      <div className="p-4 border-b border-[#1f2235]/40 bg-[#0d0f19] flex items-center gap-2 shrink-0">
        <Sparkles className="w-4 h-4 text-[#b04cff]" />
        <span className="text-xs font-bold tracking-wider text-[#e8eaf6] uppercase">Agent Compiler</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        <div className="text-[10px] text-[#5e6686] uppercase tracking-wider mb-2 leading-relaxed">
          // Compile and instantiate a new autonomous routing agent node directly onto the active workspace.
        </div>

        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">Agent Identifier Name</label>
            <input
              type="text"
              value={creationAgentName}
              onChange={(e) => setCreationAgentName(e.target.value)}
              className="w-full bg-[#0c0e17] border border-[#1f2235] rounded px-3 py-1.5 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b04cff] transition-colors"
              placeholder="e.g., Fugu Reasoner Node"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">Base Model Engine</label>
            <select
              value={creationBaseModel}
              onChange={(e) => setCreationBaseModel(e.target.value as ModelName)}
              className="w-full bg-[#0c0e17] border border-[#1f2235] rounded px-2.5 py-1.5 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b04cff] transition-colors cursor-pointer"
            >
              {CATALOG_MODELS.filter(m => m.modality === 'Text').map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.contextSize})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">Base System Instructions</label>
            <textarea
              value={creationSystemPrompt}
              onChange={(e) => setCreationSystemPrompt(e.target.value)}
              rows={4}
              className="w-full bg-[#0c0e17] border border-[#1f2235] rounded p-2.5 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b04cff] transition-colors resize-none scrollbar-thin leading-normal"
              placeholder="Provide clear system constraints and agentic instructions..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">System Tool Integrations</label>
            <div className="border border-[#1f2235]/40 bg-[#0d0e17]/50 rounded p-2.5 space-y-2">
              {[
                { label: 'Web Search Grounding', checked: creationToolWebSearch, setter: setCreationToolWebSearch },
                { label: 'Code Sandbox Execution', checked: creationToolCodeExecution, setter: setCreationToolCodeExecution },
                { label: 'Vision Pipeline', checked: creationToolVision, setter: setCreationToolVision },
                { label: 'Episodic Memory Recall', checked: creationToolMemory, setter: setCreationToolMemory },
              ].map((tool, idx) => (
                <label key={idx} className="flex items-center gap-2 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={tool.checked}
                    onChange={(e) => tool.setter(e.target.checked)}
                    className="rounded border-[#1f2235] bg-[#0c0e17] text-[#b04cff] focus:ring-0 w-3 h-3 cursor-pointer"
                  />
                  <span className="text-[9px] text-[#808eb5] group-hover:text-[#b04cff] transition-colors">
                    {tool.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">Active Training Sources</label>
            <div className="border border-[#1f2235]/40 bg-[#0d0e17]/50 rounded p-2.5 text-[9px] text-[#4c5475] space-y-1.5 font-mono">
              {trainingSources.length === 0 ? (
                <div className="text-[#4c5475] italic">// No active training sources selected in Training set. It will compile without custom cognitive overrides.</div>
              ) : (
                <>
                  <div className="text-[#b8ff57] font-bold uppercase tracking-widest">
                    Ingesting {trainingSources.length} Knowledge Sources:
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    {trainingSources.map(n => (
                      <li key={n.id} className="truncate text-slate-300">
                        {n.config.title || n.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#1f2235]/40 bg-[#0d0f19] shrink-0">
        <button
          onClick={onSpawnAgent}
          className="w-full bg-[#b04cff] hover:bg-[#a133ff] text-white py-2 rounded font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(176,76,255,0.25)] hover:scale-[1.01]"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Compile & Spawn Agent</span>
        </button>
      </div>
    </>
  );
}
