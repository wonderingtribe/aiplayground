import { useEffect, useState } from 'react';
import { supabase, getSession } from '../lib/supabase';

export interface UsageSummary {
  totalTokens: number;
  totalCost: number;
  totalCalls: number;
  modelBreakdown: Record<string, { calls: number; tokens: number; cost: number }>;
  recentLogs: Array<{
    id: number;
    model: string;
    total_tokens: number;
    cost: number;
    status: string;
    created_at: string;
  }>;
}

export function useRealtimeUsage() {
  const [usage, setUsage] = useState<UsageSummary>({
    totalTokens: 0,
    totalCost: 0,
    totalCalls: 0,
    modelBreakdown: {},
    recentLogs: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const session = await getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data: logs } = await supabase
        .from('usage_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logs) processLogs(logs);

      channel = supabase
        .channel('usage-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'usage_logs',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            setUsage(prev => {
              const log = payload.new as any;
              const updated = { ...prev };
              updated.totalCalls += 1;
              updated.totalTokens += log.total_tokens || 0;
              updated.totalCost += log.cost || 0;
              updated.recentLogs.unshift({
                id: log.id,
                model: log.model,
                total_tokens: log.total_tokens,
                cost: log.cost,
                status: log.status,
                created_at: log.created_at,
              });
              if (updated.recentLogs.length > 100) updated.recentLogs.pop();
              const breakdown = { ...updated.modelBreakdown };
              const key = log.model;
              if (!breakdown[key]) breakdown[key] = { calls: 0, tokens: 0, cost: 0 };
              breakdown[key].calls += 1;
              breakdown[key].tokens += log.total_tokens || 0;
              breakdown[key].cost += log.cost || 0;
              updated.modelBreakdown = breakdown;
              return updated;
            });
          }
        )
        .subscribe();

      setLoading(false);
    }

    init();

    return () => {
      channel?.unsubscribe();
    };
  }, []);

  function processLogs(logs: any[]) {
    const summary: UsageSummary = {
      totalTokens: 0,
      totalCost: 0,
      totalCalls: logs.length,
      modelBreakdown: {},
      recentLogs: logs.map(l => ({
        id: l.id,
        model: l.model,
        total_tokens: l.total_tokens,
        cost: l.cost,
        status: l.status,
        created_at: l.created_at,
      })),
    };

    for (const log of logs) {
      summary.totalTokens += log.total_tokens || 0;
      summary.totalCost += log.cost || 0;
      const key = log.model;
      if (!summary.modelBreakdown[key]) {
        summary.modelBreakdown[key] = { calls: 0, tokens: 0, cost: 0 };
      }
      summary.modelBreakdown[key].calls += 1;
      summary.modelBreakdown[key].tokens += log.total_tokens || 0;
      summary.modelBreakdown[key].cost += log.cost || 0;
    }

    setUsage(summary);
  }

  return { usage, loading };
}
