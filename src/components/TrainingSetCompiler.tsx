import React from 'react';
import { Terminal, Download, X, Activity } from 'lucide-react';
import { WorkflowNode, MemoryNode } from '../types';

interface TrainingSetCompilerProps {
  nodes: WorkflowNode[];
  memories: MemoryNode[];
  onExcludeNode: (nodeId: string) => void;
  onExport: () => void;
  showNotification: (msg: string) => void;
}

export function TrainingSetCompiler({ 
  nodes, 
  memories, 
  onExcludeNode, 
  onExport, 
  showNotification 
}: TrainingSetCompilerProps) {
  const trainingNodes = nodes.filter(n => n.category === 'dream_maker' && n.config.useInTrainingSet);

  return (
    <>
      <div className="p-4 border-b border-[#1f2235]/40 bg-[#0d0f19] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#b8ff57]" />
          <span className="text-xs font-bold tracking-wider text-[#e8eaf6] uppercase">Training Set Compiler</span>
        </div>
        <span className="text-[10px] bg-[#b8ff57]/15 text-[#b8ff57] px-2 py-0.5 rounded-full font-bold border border-[#b8ff57]/20">
          {trainingNodes.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        <div className="text-[10px] text-[#5e6686] uppercase tracking-wider mb-2 leading-relaxed">
          // Select memory nodes on the left canvas to package them into an offline-first cognitive dataset.
        </div>

        <div className="space-y-2">
          {trainingNodes.length === 0 ? (
            <div className="border border-[#1f2235]/30 bg-[#0d0e17]/50 rounded p-6 text-center text-[#4c5475] space-y-2">
              <Activity className="w-6 h-6 mx-auto opacity-30 text-[#808eb5]" />
              <div className="text-[10px] uppercase tracking-widest font-bold">No sources selected</div>
              <p className="text-[9px] leading-relaxed text-[#4c5475]">
                Use the "Use in training set" checkbox on any Memory node (Decision, Bug, Pattern, Context, etc.) on the canvas to include it here.
              </p>
            </div>
          ) : (
            trainingNodes.map(node => {
              const matchingMem = memories.find(m => m.id === node.memoryId);
              return (
                <div 
                  key={node.id} 
                  className="border border-[#1f2235]/50 bg-[#0d0e17] rounded p-2.5 flex items-start justify-between gap-3 group hover:border-[#b8ff57]/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] bg-[#1a1c2e] border border-[#1f2235] text-[#b8ff57] px-1 py-0.2 rounded font-mono uppercase tracking-widest leading-none">
                        {node.type.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold truncate block leading-none">
                        {node.config.title || node.label}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#4c5475] font-mono leading-relaxed mt-1 line-clamp-2">
                      {matchingMem ? matchingMem.content : (node.config.description || 'No content parsed')}
                    </p>
                  </div>

                  <button
                    onClick={() => onExcludeNode(node.id)}
                    className="p-1 hover:bg-red-500/10 text-[#4c5475] hover:text-red-500 rounded transition-colors shrink-0"
                    title="Exclude from training set"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="p-4 border-t border-[#1f2235]/40 bg-[#0d0f19] shrink-0 space-y-2">
        <button
          onClick={onExport}
          disabled={trainingNodes.length === 0}
          className="w-full bg-[#b8ff57] hover:bg-[#a5e64e] disabled:bg-[#141624] disabled:text-[#4c5475] disabled:border-[#1f2235] border border-black/10 text-black py-2 rounded font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export JSONL Dataset</span>
        </button>
        <div className="text-[8px] text-center text-[#4c5475] tracking-widest leading-none mt-1 uppercase">
          Generated as application/x-jsonlines
        </div>
      </div>
    </>
  );
}
