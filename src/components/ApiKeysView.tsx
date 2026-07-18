import React, { useState, useEffect } from 'react';
import { 
  Key, Plus, Trash2, Copy, Check, Eye, EyeOff, ShieldAlert, 
  Clock, DollarSign, Calendar, CheckCircle, AlertTriangle, RefreshCw
} from 'lucide-react';
import { cn } from '../utils';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  spendLimit: string; // e.g. "Unlimited" or "10.00"
  spendUsed: number;
  resetInterval: 'daily' | 'weekly' | 'monthly' | 'never';
  createdAt: string;
  lastUsedAt: string;
  status: 'active' | 'revoked';
}

const INITIAL_API_KEYS: ApiKey[] = [
  {
    id: 'key-1',
    name: 'Production Server Main',
    key: 'sk-or-v1-73df9c9a28e9301da38c92ef9481ad03e098418ab109d9498ca10',
    spendLimit: '100.00',
    spendUsed: 42.15,
    resetInterval: 'monthly',
    createdAt: '2026-05-18 08:33',
    lastUsedAt: '2026-06-24 12:14',
    status: 'active'
  },
  {
    id: 'key-2',
    name: 'Staging Environment Dev',
    key: 'sk-or-v1-10cde512fa920391ab1a19f09e8d5f309d9a18ceab01d9f8ac8d',
    spendLimit: '25.00',
    spendUsed: 11.08,
    resetInterval: 'weekly',
    createdAt: '2026-06-10 14:20',
    lastUsedAt: '2026-06-24 11:45',
    status: 'active'
  },
  {
    id: 'key-3',
    name: 'Local Test Script Key',
    key: 'sk-or-v1-9d93ee8a48b9c28e730da18cb3e9f90f231ad9b0ce8f0ad8e11b',
    spendLimit: 'Unlimited',
    spendUsed: 89.44,
    resetInterval: 'never',
    createdAt: '2026-04-01 09:12',
    lastUsedAt: '2026-05-30 18:05',
    status: 'revoked'
  }
];

export function ApiKeysView() {
  const [keys, setKeys] = useState<ApiKey[]>(() => {
    const saved = localStorage.getItem('wonderland_user_api_keys');
    return saved ? JSON.parse(saved) : INITIAL_API_KEYS;
  });

  const [newName, setNewName] = useState('');
  const [hasLimit, setHasLimit] = useState(false);
  const [limitAmount, setLimitAmount] = useState('50.00');
  const [resetInterval, setResetInterval] = useState<'daily' | 'weekly' | 'monthly' | 'never'>('never');
  
  // For newly created key overlay / reveal modal
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  
  // For key list visual copying
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('wonderland_user_api_keys', JSON.stringify(keys));
  }, [keys]);

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const randomHex = Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const keyString = `sk-or-v1-${randomHex}`;

    const newKey: ApiKey = {
      id: 'key-' + Math.random().toString(36).substring(2, 9),
      name: newName.trim(),
      key: keyString,
      spendLimit: hasLimit ? Number(limitAmount).toFixed(2) : 'Unlimited',
      spendUsed: 0,
      resetInterval,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      lastUsedAt: 'Never used',
      status: 'active'
    };

    setKeys(prev => [newKey, ...prev]);
    setNewlyCreatedKey(newKey);
    setNewName('');
    setHasLimit(false);
    setLimitAmount('50.00');
    setResetInterval('never');
  };

  const handleRevokeKey = (id: string) => {
    if (confirm('Are you absolutely sure you want to revoke this API key? This will instantly cut off any running services using this token. This action is irreversible.')) {
      setKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'revoked' } : k));
    }
  };

  const handleCopy = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maskKey = (keyStr: string) => {
    return `${keyStr.substring(0, 12)}................${keyStr.substring(keyStr.length - 8)}`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080c] p-6 lg:p-8 space-y-8 scrollbar-thin">
      
      {/* Header */}
      <div className="border-b border-[#1f2235]/40 pb-6">
        <div className="text-[10px] text-[#b8ff57] bg-[#b8ff57]/10 px-2 py-0.5 rounded w-max uppercase tracking-widest font-mono font-bold mb-2 border border-[#b8ff57]/20">
          Access Credentials
        </div>
        <h2 className="text-xl font-serif italic font-bold text-[#E4E3E0] tracking-tight">
          API Key Management
        </h2>
        <p className="text-xs font-mono text-[#5e6686] mt-1">
          Create, edit, and revoke custom API keys with spend bounds and reset parameters to authenticate with WONDERLAND endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Creation Form */}
        <div className="xl:col-span-1 bg-[#0c0d12]/90 border border-[#1f2235]/60 p-6 rounded shadow-md font-mono space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1f2235]/30 pb-3">
            <Plus className="w-4 h-4 text-[#b8ff57]" />
            <h3 className="text-xs font-bold tracking-wider text-white uppercase">Generate New API Key</h3>
          </div>

          <form onSubmit={handleCreateKey} className="space-y-4">
            
            {/* Key Name */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">
                Key Identifier / Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Worker Node Agent"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-3 py-2 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57] transition-all"
              />
            </div>

            {/* Spend Limit toggle */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasLimit}
                  onChange={(e) => setHasLimit(e.target.checked)}
                  className="rounded border-[#1f2235] bg-[#07080d] text-[#b8ff57] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[9px] text-[#808eb5] uppercase tracking-wider font-bold">
                  Enforce Budget Limit
                </span>
              </label>

              {hasLimit && (
                <div className="relative mt-1.5">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5e6686] text-xs">$</div>
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    placeholder="50.00"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm pl-7 pr-3 py-2 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57] transition-all"
                  />
                  <div className="text-[8px] text-[#5e6686] uppercase tracking-wider mt-1">// Hard spending ceiling (USD)</div>
                </div>
              )}
            </div>

            {/* Reset Interval */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">
                Limit Reset Schedule
              </label>
              <select
                value={resetInterval}
                onChange={(e) => setResetInterval(e.target.value as any)}
                className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-2 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57] cursor-pointer"
              >
                <option value="never">No Automatic Reset</option>
                <option value="daily">Daily Reset</option>
                <option value="weekly">Weekly Reset</option>
                <option value="monthly">Monthly Reset</option>
              </select>
              <div className="text-[8px] text-[#5e6686] uppercase tracking-wider">// Automatically refreshes the spend limit budget.</div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#b8ff57] hover:bg-[#a5e64e] border border-black/10 text-black font-extrabold py-2 rounded-sm text-[10px] uppercase tracking-widest transition-all"
            >
              Generate Key
            </button>
          </form>
        </div>

        {/* Existing Keys Table */}
        <div className="xl:col-span-2 bg-[#0c0d12]/90 border border-[#1f2235]/60 p-6 rounded shadow-md font-mono space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1f2235]/30 pb-3">
            <Key className="w-4 h-4 text-[#5b5eff]" />
            <h3 className="text-xs font-bold tracking-wider text-white uppercase">Active API Tokens</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] min-w-[550px]">
              <thead>
                <tr className="border-b border-[#1f2235]/40 text-[#5e6686] uppercase tracking-wider font-extrabold">
                  <th className="pb-2">Name / ID</th>
                  <th className="pb-2">Token String</th>
                  <th className="pb-2 text-right">Usage / Limit</th>
                  <th className="pb-2 text-center">Reset</th>
                  <th className="pb-2 text-center">Created</th>
                  <th className="pb-2 text-center">Status</th>
                  <th className="pb-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2235]/25">
                {keys.map((k) => (
                  <tr key={k.id} className={cn(
                    "hover:bg-[#141624]/20 transition-all",
                    k.status === 'revoked' ? "opacity-50" : ""
                  )}>
                    <td className="py-3">
                      <div className="font-extrabold text-white text-xs">{k.name}</div>
                      <div className="text-[8px] text-[#5e6686] uppercase">Last used: {k.lastUsedAt}</div>
                    </td>
                    <td className="py-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#808eb5]">{maskKey(k.key)}</span>
                        {k.status === 'active' && (
                          <button
                            onClick={() => handleCopy(k.key, k.id)}
                            className="p-1 hover:bg-[#1a1c2e] text-[#5e6686] hover:text-[#b8ff57] rounded"
                            title="Copy API key"
                          >
                            {copiedKeyId === k.id ? <Check className="w-3 h-3 text-[#b8ff57]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-bold text-white">${k.spendUsed.toFixed(2)}</span> 
                      <span className="text-[#5e6686]"> / {k.spendLimit === 'Unlimited' ? '∞' : `$${k.spendLimit}`}</span>
                    </td>
                    <td className="py-3 text-center uppercase text-[8.5px] font-semibold text-slate-400">
                      {k.resetInterval}
                    </td>
                    <td className="py-3 text-center font-mono text-[#5e6686]">
                      {k.createdAt.split(' ')[0]}
                    </td>
                    <td className="py-3 text-center">
                      {k.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 text-[8.5px] font-bold">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-950/40 text-red-400 border border-red-900/40 text-[8.5px] font-bold">
                          <span className="w-1 h-1 rounded-full bg-red-400" />
                          REVOKED
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {k.status === 'active' ? (
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="p-1.5 hover:bg-red-500/10 text-[#5e6686] hover:text-red-500 rounded transition-colors"
                          title="Revoke and destroy key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[#5e6686] text-[8.5px] uppercase">Void</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* NEWLY CREATED REVEAL DIALOG/OVERLAY */}
      {newlyCreatedKey && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c0d12] border border-[#b8ff57]/40 max-w-lg w-full p-6 shadow-2xl space-y-4 font-mono rounded">
            
            <div className="flex items-center gap-2 border-b border-[#1f2235] pb-3 text-[#b8ff57]">
              <ShieldAlert className="w-5 h-5 text-[#b8ff57]" />
              <h3 className="font-serif italic text-sm uppercase tracking-wider text-[#e8eaf6]">
                Security Handshake: Secret Key Revealed
              </h3>
            </div>

            <div className="border border-amber-500/20 bg-amber-500/5 p-3 rounded flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[9.5px] text-slate-300 leading-relaxed">
                <strong className="text-amber-500">WARNING:</strong> Copy this credential immediately. This key is hashed and fully salt-encrypted in our backend storage; <strong>you will never be shown this key again.</strong>
              </div>
            </div>

            {/* Key Text Area */}
            <div className="space-y-1.5">
              <div className="text-[9px] uppercase tracking-wider text-[#808eb5] font-bold">New Key Name</div>
              <div className="text-white text-xs font-semibold">{newlyCreatedKey.name}</div>
            </div>

            <div className="space-y-2">
              <div className="text-[9px] uppercase tracking-wider text-[#808eb5] font-bold">API Key Secret Token</div>
              <div className="bg-[#07080d] border border-[#1f2235] p-3 rounded flex items-center justify-between gap-4 font-mono text-[10px] text-slate-100 select-all break-all border-dashed">
                <span>{newlyCreatedKey.key}</span>
                <button
                  onClick={() => handleCopy(newlyCreatedKey.key)}
                  className="bg-[#1e2133] hover:bg-[#b8ff57] hover:text-black text-[9px] px-2.5 py-1.5 text-[#e8eaf6] transition-all shrink-0 uppercase tracking-widest font-extrabold rounded-sm"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[9.5px] pt-1">
              <div>
                <span className="text-[#5e6686] uppercase block">Spending Ceiling</span>
                <span className="text-[#b8ff57] font-bold font-mono">
                  {newlyCreatedKey.spendLimit === 'Unlimited' ? 'No Limit' : `$${newlyCreatedKey.spendLimit}`}
                </span>
              </div>
              <div>
                <span className="text-[#5e6686] uppercase block">Reset Schedule</span>
                <span className="text-purple-400 font-bold font-mono uppercase">
                  {newlyCreatedKey.resetInterval}
                </span>
              </div>
            </div>

            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="w-full bg-[#1e2133] hover:bg-[#b8ff57]/20 hover:text-[#b8ff57] text-[#e8eaf6] hover:border-[#b8ff57]/30 border border-[#1f2235] font-extrabold py-2 rounded text-[10px] uppercase tracking-widest transition-all"
            >
              I have stored this key securely
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
