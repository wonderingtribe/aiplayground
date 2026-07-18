import { supabase } from './supabase';

export interface UsageEvent {
  userId?: string;
  agentId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
  durationMs?: number;
  status: 'success' | 'error';
}

export async function logUsage(event: UsageEvent) {
  try {
    const { error } = await supabase.from('usage_logs').insert({
      user_id: event.userId,
      agent_id: event.agentId,
      model: event.model,
      prompt_tokens: event.promptTokens,
      completion_tokens: event.completionTokens,
      total_tokens: event.totalTokens,
      cost: event.cost ?? 0,
      duration_ms: event.durationMs,
      status: event.status,
    });
    if (error) console.warn('Failed to log usage:', error.message);
  } catch (err) {
    // Silently fail — usage tracking is non-critical
  }
}
