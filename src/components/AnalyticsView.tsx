import { BarChart3, DollarSign, Cpu, Activity, Zap, Clock } from 'lucide-react';
import { useRealtimeUsage } from '../hooks/useRealtimeUsage';

export function AnalyticsView() {
  const { usage, loading } = useRealtimeUsage();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#08080c]">
        <div className="text-[10px] font-mono text-[#555] animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  const formatCost = (n: number) => {
    if (n < 0.001) return '$0.0000';
    return '$' + n.toFixed(4);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080c] p-6 lg:p-8 space-y-6 scrollbar-thin">
      <div className="flex items-center justify-between border-b border-[#1f2235]/40 pb-4">
        <div>
          <div className="text-[10px] text-[#b8ff57] bg-[#b8ff57]/10 px-2 py-0.5 rounded w-max uppercase tracking-widest font-mono font-bold mb-2 border border-[#b8ff57]/20">
            Real-Time Analytics
          </div>
          <h2 className="text-xl font-serif italic font-bold text-[#E4E3E0] tracking-tight">Usage & Cost Dashboard</h2>
        </div>
        <div className="flex items-center gap-2 text-[8px] font-mono text-[#555]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#b8ff57] animate-pulse" />
          Live
        </div>
      </div>

      {usage.totalCalls === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#555]">
          <BarChart3 className="w-10 h-10 mb-4 opacity-30" />
          <p className="text-xs font-mono">No usage data yet. Start chatting to see analytics.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0c0d12] border border-[#1f2235]/60 p-4 rounded">
              <div className="flex items-center gap-2 text-[#5b5eff] mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-[8px] font-mono uppercase tracking-wider font-bold">Total Calls</span>
              </div>
              <span className="text-2xl font-bold text-white font-mono">{usage.totalCalls}</span>
            </div>
            <div className="bg-[#0c0d12] border border-[#1f2235]/60 p-4 rounded">
              <div className="flex items-center gap-2 text-[#b8ff57] mb-2">
                <Cpu className="w-4 h-4" />
                <span className="text-[8px] font-mono uppercase tracking-wider font-bold">Total Tokens</span>
              </div>
              <span className="text-2xl font-bold text-white font-mono">{usage.totalTokens.toLocaleString()}</span>
            </div>
            <div className="bg-[#0c0d12] border border-[#1f2235]/60 p-4 rounded">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-[8px] font-mono uppercase tracking-wider font-bold">Total Cost</span>
              </div>
              <span className="text-2xl font-bold text-white font-mono">{formatCost(usage.totalCost)}</span>
            </div>
            <div className="bg-[#0c0d12] border border-[#1f2235]/60 p-4 rounded">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Zap className="w-4 h-4" />
                <span className="text-[8px] font-mono uppercase tracking-wider font-bold">Avg Tokens/Call</span>
              </div>
              <span className="text-2xl font-bold text-white font-mono">
                {Math.round(usage.totalTokens / usage.totalCalls).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0c0d12] border border-[#1f2235]/60 p-4 rounded">
              <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#808eb5] font-bold mb-4">Per-Model Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(usage.modelBreakdown).map(([model, data]) => (
                  <div key={model} className="flex items-center justify-between text-[10px] font-mono border-b border-[#1f2235]/30 pb-2">
                    <span className="text-[#E4E3E0] truncate max-w-[200px]">{model}</span>
                    <div className="flex items-center gap-4 text-[#888]">
                      <span title="Calls">{data.calls} calls</span>
                      <span title="Tokens">{data.tokens.toLocaleString()}t</span>
                      <span title="Cost" className="text-amber-500">{formatCost(data.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0c0d12] border border-[#1f2235]/60 p-4 rounded">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#808eb5] font-bold">Recent Activity</h3>
                <Clock className="w-3 h-3 text-[#555]" />
              </div>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {usage.recentLogs.slice(0, 20).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-[9px] font-mono border-b border-[#1f2235]/20 py-1.5">
                    <span className="text-[#E4E3E0] truncate max-w-[180px]">{log.model}</span>
                    <div className="flex items-center gap-3 text-[#888]">
                      <span>{log.total_tokens}t</span>
                      {log.cost > 0 && <span className="text-amber-500">{formatCost(log.cost)}</span>}
                      <span className={log.status === 'success' ? 'text-[#b8ff57]' : 'text-red-400'}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
