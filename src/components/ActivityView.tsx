import React, { useState } from 'react';
import { 
  BarChart2, Calendar, DollarSign, Activity, Cpu, 
  Layers, ChevronDown, Check, RefreshCw, ArrowUpDown, Clock
} from 'lucide-react';
import { cn } from '../utils';

interface UsageDataPoint {
  date: string;
  requests: number;
  spend: number;
  latency: number;
}

const SEVEN_DAYS_DATA: UsageDataPoint[] = [
  { date: 'Jun 18', requests: 1250, spend: 12.45, latency: 450 },
  { date: 'Jun 19', requests: 1840, spend: 18.90, latency: 490 },
  { date: 'Jun 20', requests: 1520, spend: 14.80, latency: 410 },
  { date: 'Jun 21', requests: 2150, spend: 22.40, latency: 510 },
  { date: 'Jun 22', requests: 2890, spend: 31.15, latency: 480 },
  { date: 'Jun 23', requests: 3420, spend: 38.64, latency: 430 },
  { date: 'Jun 24', requests: 1138, spend: 12.00, latency: 440 }, // today partial
];

const TWENTY_FOUR_HOURS_DATA: UsageDataPoint[] = [
  { date: '04:00', requests: 80, spend: 0.85, latency: 410 },
  { date: '08:00', requests: 150, spend: 1.62, latency: 440 },
  { date: '12:00', requests: 310, spend: 3.45, latency: 490 },
  { date: '16:00', requests: 280, spend: 2.90, latency: 470 },
  { date: '20:00', requests: 190, spend: 1.88, latency: 430 },
  { date: '00:00', requests: 128, spend: 1.30, latency: 450 },
];

const THIRTY_DAYS_DATA: UsageDataPoint[] = Array.from({ length: 30 }).map((_, idx) => {
  const dayNum = idx + 1;
  const requests = Math.floor(1000 + Math.random() * 2500);
  const spend = Number((requests * 0.01 + Math.random() * 5).toFixed(2));
  const latency = Math.floor(380 + Math.random() * 180);
  return {
    date: `May ${dayNum}`,
    requests,
    spend,
    latency
  };
});

const MODEL_SPEND = [
  { model: 'Sakana: Fugu Ultra', provider: 'Sakana', spend: 65.20, share: 43 },
  { model: 'OpenAI: GPT Image 2', provider: 'OpenAI', spend: 38.40, share: 25 },
  { model: 'Google: Nano Banana Pro', provider: 'Google', spend: 24.12, share: 16 },
  { model: 'Anthropic: Claude Fable Latest', provider: 'Anthropic', spend: 18.52, share: 12 },
  { model: 'Cohere: North Mini Code', provider: 'Cohere', spend: 6.10, share: 4 },
];

const APP_SPEND = [
  { app: 'Alice (Routing Sandbox)', spend: 62.10, share: 41 },
  { app: 'Simple Rick (Developer Assistant)', spend: 45.14, share: 30 },
  { app: 'Visual Dreammaker Canvas', spend: 35.10, share: 23 },
  { app: 'CLI Integration Endpoint', spend: 9.00, share: 6 },
];

const RECENT_REQUESTS_LOG = [
  { id: 'req-1', timestamp: '2026-06-24 12:15:33', model: 'Sakana: Fugu Ultra', tokensIn: 4522, tokensOut: 1104, cost: 0.0557, latency: 482, status: 200 },
  { id: 'req-2', timestamp: '2026-06-24 12:12:04', model: 'Google: Nano Banana Pro', tokensIn: 12052, tokensOut: 588, cost: 0.0311, latency: 744, status: 200 },
  { id: 'req-3', timestamp: '2026-06-24 12:09:41', model: 'OpenAI: GPT Image 2', tokensIn: 380, tokensOut: 0, cost: 0.0080, latency: 2100, status: 200 },
  { id: 'req-4', timestamp: '2026-06-24 11:58:12', model: 'Anthropic: Claude Fable Latest', tokensIn: 1240, tokensOut: 850, cost: 0.0549, latency: 1210, status: 200 },
  { id: 'req-5', timestamp: '2026-06-24 11:45:01', model: 'Cohere: North Mini Code', tokensIn: 25902, tokensOut: 1250, cost: 0.0000, latency: 512, status: 200 },
  { id: 'req-6', timestamp: '2026-06-24 11:32:19', model: 'Sakana: Fugu Ultra', tokensIn: 1255, tokensOut: 482, cost: 0.0207, latency: 390, status: 200 },
  { id: 'req-7', timestamp: '2026-06-24 11:21:40', model: 'Alibaba: HappyHorse 1.1', tokensIn: 1500, tokensOut: 0, cost: 0.2964, latency: 6810, status: 200 },
];

export function ActivityView() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const activeData = timeRange === '24h' 
    ? TWENTY_FOUR_HOURS_DATA 
    : timeRange === '7d' 
      ? SEVEN_DAYS_DATA 
      : THIRTY_DAYS_DATA;

  const totalRequests = activeData.reduce((acc, curr) => acc + curr.requests, 0);
  const totalCost = Number(activeData.reduce((acc, curr) => acc + curr.spend, 0).toFixed(2));
  const avgLatency = Math.round(activeData.reduce((acc, curr) => acc + curr.latency, 0) / activeData.length);
  const discountSavings = timeRange === '24h' ? 12.8 : timeRange === '7d' ? 24.5 : 19.2;

  // Chart Dimensions
  const width = 800;
  const height = 260;
  const paddingLeft = 60;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxRequests = Math.max(...activeData.map(d => d.requests)) * 1.15 || 100;
  const minRequests = 0;

  const points = activeData.map((d, i) => {
    const x = paddingLeft + (i / (activeData.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.requests - minRequests) / (maxRequests - minRequests)) * chartHeight;
    return { x, y, ...d };
  });

  const areaPath = points.length > 0 
    ? `M ${points[0].x} ${paddingTop + chartHeight} ` + 
      points.map(p => `L ${p.x} ${p.y}`).join(' ') + 
      ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`
    : '';

  const linePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080c] p-6 lg:p-8 space-y-8 scrollbar-thin">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f2235]/40 pb-6">
        <div>
          <div className="text-[10px] text-[#b8ff57] bg-[#b8ff57]/10 px-2 py-0.5 rounded w-max uppercase tracking-widest font-mono font-bold mb-2 border border-[#b8ff57]/20">
            Realtime Analytics
          </div>
          <h2 className="text-xl font-serif italic font-bold text-[#E4E3E0] tracking-tight">
            Activity & Spend Metrics
          </h2>
          <p className="text-xs font-mono text-[#5e6686] mt-1">
            Analyze request volume, network latencies, and cross-provider budget allocation.
          </p>
        </div>

        {/* Time-range Selector */}
        <div className="flex items-center gap-1.5 bg-[#0c0d12]/90 border border-[#1f2235] p-1 rounded font-mono">
          {(['24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setTimeRange(r);
                setHoveredPointIndex(null);
              }}
              className={cn(
                "px-3 py-1.5 text-[9px] uppercase tracking-wider font-extrabold rounded-sm transition-all",
                timeRange === r 
                  ? "bg-[#b8ff57]/20 text-[#b8ff57] border border-[#b8ff57]/35" 
                  : "text-[#5e6686] hover:text-white"
              )}
            >
              {r === '24h' ? 'Last 24h' : r === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Requests */}
        <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-4 rounded shadow-md relative overflow-hidden group hover:border-[#5b5eff]/50 transition-all font-mono">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all text-[#5b5eff]">
            <Activity className="w-12 h-12" />
          </div>
          <div className="text-[9px] tracking-widest text-[#5e6686] uppercase font-bold">// TOTAL API CALLS</div>
          <div className="text-2xl font-serif italic text-white font-extrabold mt-2 tracking-tight">
            {totalRequests.toLocaleString()}
          </div>
          <div className="text-[8px] text-[#5b5eff] uppercase tracking-widest mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry online</span>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-4 rounded shadow-md relative overflow-hidden group hover:border-[#b8ff57]/50 transition-all font-mono">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all text-[#b8ff57]">
            <DollarSign className="w-12 h-12" />
          </div>
          <div className="text-[9px] tracking-widest text-[#5e6686] uppercase font-bold">// ACCUMULATED SPEND</div>
          <div className="text-2xl font-serif italic text-[#b8ff57] font-extrabold mt-2 tracking-tight">
            ${totalCost.toFixed(2)}
          </div>
          <div className="text-[8px] text-[#b8ff57] uppercase tracking-widest mt-1.5">
            Avg. ${(totalCost / (totalRequests || 1)).toFixed(5)} per call
          </div>
        </div>

        {/* Avg Latency */}
        <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-4 rounded shadow-md relative overflow-hidden group hover:border-amber-500/50 transition-all font-mono">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all text-amber-500">
            <Clock className="w-12 h-12" />
          </div>
          <div className="text-[9px] tracking-widest text-[#5e6686] uppercase font-bold">// MEAN ROUNDTRIP TIME</div>
          <div className="text-2xl font-serif italic text-white font-extrabold mt-2 tracking-tight">
            {avgLatency} <span className="text-xs">ms</span>
          </div>
          <div className="text-[8px] text-amber-500 uppercase tracking-widest mt-1.5">
            Optimal routing active
          </div>
        </div>

        {/* Savings */}
        <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-4 rounded shadow-md relative overflow-hidden group hover:border-purple-500/50 transition-all font-mono">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all text-purple-500">
            <Layers className="w-12 h-12" />
          </div>
          <div className="text-[9px] tracking-widest text-[#5e6686] uppercase font-bold">// COGNITIVE SAVINGS RATE</div>
          <div className="text-2xl font-serif italic text-purple-400 font-extrabold mt-2 tracking-tight">
            {discountSavings}%
          </div>
          <div className="text-[8px] text-purple-400 uppercase tracking-widest mt-1.5">
            Via Cascade & Prefetch
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Section */}
      <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-6 rounded shadow-md font-mono relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#5b5eff]" />
            <h3 className="text-xs font-extrabold tracking-wider text-white uppercase">Request Load & Network Volume Over Time</h3>
          </div>
          <span className="text-[9px] text-[#5e6686] uppercase">// Hover nodes for details</span>
        </div>

        {/* Interactive SVG Area Chart */}
        <div className="relative w-full overflow-x-auto select-none scrollbar-none">
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-auto min-w-[700px] overflow-visible"
            onMouseLeave={() => setHoveredPointIndex(null)}
          >
            {/* Definitions for beautiful gradients */}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b5eff" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#5b5eff" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#5b5eff" />
                <stop offset="50%" stopColor="#b8ff57" />
                <stop offset="100%" stopColor="#5b5eff" />
              </linearGradient>
            </defs>

            {/* Grid horizontal guidelines */}
            {Array.from({ length: 5 }).map((_, idx) => {
              const yVal = paddingTop + (chartHeight / 4) * idx;
              const requestsVal = Math.round(maxRequests - ((maxRequests - minRequests) / 4) * idx);
              return (
                <g key={idx} className="opacity-30">
                  <line 
                    x1={paddingLeft} 
                    y1={yVal} 
                    x2={width - paddingRight} 
                    y2={yVal} 
                    stroke="#1f2235" 
                    strokeWidth="1" 
                    strokeDasharray="4 4"
                  />
                  <text 
                    x={paddingLeft - 10} 
                    y={yVal + 3} 
                    fill="#5e6686" 
                    fontSize="8" 
                    textAnchor="end"
                  >
                    {requestsVal}
                  </text>
                </g>
              );
            })}

            {/* Vertical guidelines */}
            {points.map((p, i) => (
              <line
                key={i}
                x1={p.x}
                y1={paddingTop}
                x2={p.x}
                y2={paddingTop + chartHeight}
                stroke="#1f2235"
                strokeWidth="1"
                className="opacity-10"
              />
            ))}

            {/* Area under the curve */}
            <path 
              d={areaPath} 
              fill="url(#areaGradient)" 
            />

            {/* Curve path itself */}
            <path 
              d={linePath} 
              fill="none" 
              stroke="url(#lineGlow)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />

            {/* Interactive Data Dots */}
            {points.map((p, i) => {
              const isHovered = hoveredPointIndex === i;
              return (
                <g key={i}>
                  {/* Invisible broad mouse-target circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="12"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPointIndex(i)}
                  />
                  {/* Visual anchor dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 4}
                    fill={isHovered ? '#b8ff57' : '#0c0d12'}
                    stroke={isHovered ? '#0a0a0a' : '#5b5eff'}
                    strokeWidth="2"
                    className="transition-all duration-150 pointer-events-none"
                  />
                </g>
              );
            })}

            {/* X-Axis labels */}
            {points.map((p, i) => (
              <text
                key={i}
                x={p.x}
                y={paddingTop + chartHeight + 16}
                fill="#5e6686"
                fontSize="8.5"
                textAnchor="middle"
              >
                {p.date}
              </text>
            ))}
          </svg>

          {/* Render HTML Floating Tooltip overlay inside the container */}
          {hoveredPointIndex !== null && (() => {
            const pt = points[hoveredPointIndex];
            return (
              <div 
                className="absolute bg-[#0a0c14] border border-[#b8ff57]/40 shadow-[0_0_15px_rgba(184,255,87,0.15)] rounded px-3 py-2 font-mono text-[9px] pointer-events-none z-10 space-y-1"
                style={{
                  left: `${pt.x - 40}px`,
                  top: `${pt.y - 65}px`,
                }}
              >
                <div className="font-extrabold text-white text-[10px]">{pt.date}</div>
                <div className="flex items-center gap-1">
                  <span className="text-[#5b5eff] font-bold">Calls:</span>
                  <span className="text-slate-300 font-extrabold">{pt.requests.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#b8ff57] font-bold">Est Spend:</span>
                  <span className="text-slate-300 font-extrabold">${pt.spend.toFixed(2)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Grid of Spend Allocations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Spend by Model */}
        <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-5 rounded shadow-md font-mono space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1f2235]/30 pb-3">
            <Cpu className="w-4 h-4 text-[#b8ff57]" />
            <h3 className="text-xs font-bold tracking-wider text-white uppercase">Spend Allocation by Model Engine</h3>
          </div>

          <div className="space-y-3.5">
            {MODEL_SPEND.map((m, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b8ff57]" />
                    <span className="text-slate-300">{m.model}</span>
                  </div>
                  <div className="text-[#5e6686]">
                    <span className="text-white font-extrabold">${m.spend.toFixed(2)}</span> ({m.share}%)
                  </div>
                </div>
                {/* Horizontal Progress bar */}
                <div className="w-full bg-[#141624] h-2 rounded-sm overflow-hidden border border-[#1f2235]/30">
                  <div 
                    className="bg-gradient-to-r from-[#5b5eff] to-[#b8ff57] h-full transition-all duration-500"
                    style={{ width: `${m.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spend by App */}
        <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-5 rounded shadow-md font-mono space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1f2235]/30 pb-3">
            <Layers className="w-4 h-4 text-[#5b5eff]" />
            <h3 className="text-xs font-bold tracking-wider text-white uppercase">Spend Allocation by Sandbox App</h3>
          </div>

          <div className="space-y-3.5">
            {APP_SPEND.map((a, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5b5eff]" />
                    <span className="text-slate-300">{a.app}</span>
                  </div>
                  <div className="text-[#5e6686]">
                    <span className="text-white font-extrabold">${a.spend.toFixed(2)}</span> ({a.share}%)
                  </div>
                </div>
                {/* Horizontal Progress bar */}
                <div className="w-full bg-[#141624] h-2 rounded-sm overflow-hidden border border-[#1f2235]/30">
                  <div 
                    className="bg-gradient-to-r from-[#b04cff] to-[#5b5eff] h-full transition-all duration-500"
                    style={{ width: `${a.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Live Transaction logs table */}
      <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-5 rounded shadow-md font-mono space-y-4">
        <div className="flex items-center justify-between border-b border-[#1f2235]/30 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#b8ff57]" />
            <h3 className="text-xs font-bold tracking-wider text-white uppercase">Recent Endpoint Executions</h3>
          </div>
          <span className="text-[8.5px] bg-[#1a1c2e] border border-[#1f2235] text-[#b8ff57] px-2 py-0.5 rounded uppercase tracking-wider">
            Live Stream Connected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-[#1f2235]/40 text-[#5e6686] uppercase tracking-wider">
                <th className="pb-2 font-extrabold">Timestamp</th>
                <th className="pb-2 font-extrabold">Model Engine</th>
                <th className="pb-2 font-extrabold text-right">Prompt Tokens</th>
                <th className="pb-2 font-extrabold text-right">Completion</th>
                <th className="pb-2 font-extrabold text-right">Latency</th>
                <th className="pb-2 font-extrabold text-right">Cost</th>
                <th className="pb-2 font-extrabold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2235]/25">
              {RECENT_REQUESTS_LOG.map((row) => (
                <tr key={row.id} className="text-slate-300 hover:bg-[#141624]/20 transition-all">
                  <td className="py-2.5 font-mono text-[#5e6686]">{row.timestamp}</td>
                  <td className="py-2.5 font-bold text-slate-100">{row.model}</td>
                  <td className="py-2.5 text-right font-mono text-slate-400">{row.tokensIn.toLocaleString()}</td>
                  <td className="py-2.5 text-right font-mono text-slate-400">{row.tokensOut.toLocaleString()}</td>
                  <td className="py-2.5 text-right font-mono text-amber-500/95">{row.latency}ms</td>
                  <td className="py-2.5 text-right font-mono text-[#b8ff57] font-semibold">
                    {row.cost === 0 ? 'FREE' : `$${row.cost.toFixed(4)}`}
                  </td>
                  <td className="py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 text-[8.5px] font-bold">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      {row.status} OK
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
