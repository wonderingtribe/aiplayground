import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Check, X, ShieldAlert, Copy, Sparkles, Plus, Trash2, Globe, Wifi } from 'lucide-react';
import { cn } from '../utils';
import { ProviderConfig } from '../lib/providers/types';
import { loadCustomProviders, saveCustomProviders } from '../lib/providers/registry';

function generateMasterKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [8, 4, 4, 4, 12];
  return 'wl-' + segments.map(len =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  ).join('-');
}

function getOrCreateMasterKey(): string {
  let key = localStorage.getItem('wonderland_master_key');
  if (!key) {
    key = generateMasterKey();
    localStorage.setItem('wonderland_master_key', key);
  }
  return key;
}

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_CUSTOM_PROVIDER: Omit<ProviderConfig, 'id'> = {
  name: '',
  baseUrl: '',
  apiKey: '',
  authStyle: 'bearer',
  responseFormat: 'openai',
  customResponsePath: '',
  supportedModels: [],
};

export function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const [masterKey, setMasterKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);

  const [customProviders, setCustomProviders] = useState<ProviderConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ProviderConfig, 'id'>>({ ...DEFAULT_CUSTOM_PROVIDER });
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMasterKey(getOrCreateMasterKey());
      setCustomProviders(loadCustomProviders());
      setShowAddForm(false);
      setEditingId(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setForm({ ...DEFAULT_CUSTOM_PROVIDER });
    setError('');
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSaveCustom = () => {
    if (!form.name.trim()) { setError('Provider name is required.'); return; }
    if (!form.baseUrl.trim()) { setError('Base URL is required.'); return; }
    if (!form.apiKey.trim()) { setError('API key is required.'); return; }
    if (form.supportedModels.length === 0) { setError('At least one model name is required.'); return; }

    const models = form.supportedModels.map(m => m.trim()).filter(Boolean);
    if (models.length === 0) { setError('At least one model name is required.'); return; }

    if (editingId) {
      const updated = customProviders.map(p =>
        p.id === editingId ? { ...p, ...form, supportedModels: models } : p
      );
      setCustomProviders(updated);
      saveCustomProviders(updated);
    } else {
      const newProvider: ProviderConfig = {
        ...form,
        id: 'custom-' + Math.random().toString(36).substring(2, 9),
        supportedModels: models,
      };
      const updated = [...customProviders, newProvider];
      setCustomProviders(updated);
      saveCustomProviders(updated);
    }

    resetForm();
  };

  const handleEdit = (provider: ProviderConfig) => {
    setForm({
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      authStyle: provider.authStyle,
      responseFormat: provider.responseFormat,
      customResponsePath: provider.customResponsePath || '',
      supportedModels: provider.supportedModels,
    });
    setEditingId(provider.id);
    setShowAddForm(true);
    setError('');
  };

  const handleDelete = (id: string) => {
    const updated = customProviders.filter(p => p.id !== id);
    setCustomProviders(updated);
    saveCustomProviders(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#141414] border border-[#2a2a2a] max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#555] hover:text-[#E4E3E0] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Wonderland Key Section */}
        <div className="flex items-center gap-2 text-[#E4E3E0] mb-2">
          <Key className="w-5 h-5 text-[#b8ff57]" />
          <h3 className="font-serif italic text-sm uppercase tracking-wider">Your Wonderland Key</h3>
        </div>
        <p className="text-[10px] text-[#555] font-mono uppercase tracking-widest mb-5">
          One key for all built-in AI providers. Send this with every API request to authenticate.
        </p>

        <div className="bg-[#0a0a0a] border border-[#b8ff57]/30 p-4 mb-6 rounded-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#b8ff57]" />
              <span className="text-[9px] font-mono text-[#b8ff57] uppercase tracking-widest font-bold">Master Key</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(masterKey);
                setKeyCopied(true);
                setTimeout(() => setKeyCopied(false), 2000);
              }}
              className="flex items-center gap-1 text-[9px] font-mono text-[#888] hover:text-[#b8ff57] transition-colors"
            >
              {keyCopied ? <Check className="w-3 h-3 text-[#b8ff57]" /> : <Copy className="w-3 h-3" />}
              <span>{keyCopied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
          <div className="font-mono text-xs text-[#E4E3E0] bg-[#0c0d12] border border-[#1f2235] px-3 py-2.5 tracking-wider select-all break-all">
            {masterKey}
          </div>
          <p className="text-[8px] text-[#555] font-mono mt-2 leading-relaxed">
            This key identifies you across all built-in AI providers. Requests are proxied through our server using enterprise-managed credentials.
          </p>
        </div>

        {/* Custom Providers Section */}
        <div className="border-t border-[#1f2235] pt-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#5b5eff]" />
              <span className="text-[9px] font-mono text-[#5b5eff] uppercase tracking-widest font-bold">Custom Providers</span>
            </div>
            <button
              onClick={() => { resetForm(); setShowAddForm(true); }}
              className="flex items-center gap-1 text-[9px] font-mono text-[#b8ff57] hover:underline"
            >
              <Plus className="w-3 h-3" />
              <span>ADD PROVIDER</span>
            </button>
          </div>
          <p className="text-[8px] text-[#555] font-mono mb-4">
            Add your own AI provider endpoints with custom API keys and response formats. These connect directly from your browser.
          </p>

          {showAddForm && (
            <div className="bg-[#0c0d12] border border-[#1f2235] p-4 mb-4 rounded-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-[#b8ff57] uppercase tracking-widest font-bold">
                  {editingId ? 'Edit Custom Provider' : 'New Custom Provider'}
                </span>
                <button onClick={resetForm} className="text-[9px] text-[#555] hover:text-[#E4E3E0]">CANCEL</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-mono text-[#888] uppercase tracking-wider">Provider Name</label>
                  <input
                    type="text"
                    placeholder="e.g., My Local LLM"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-1.5 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-mono text-[#888] uppercase tracking-wider">Auth Style</label>
                  <select
                    value={form.authStyle}
                    onChange={(e) => setForm(f => ({ ...f, authStyle: e.target.value as 'bearer' | 'x-api-key' }))}
                    className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-1.5 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57]"
                  >
                    <option value="bearer">Bearer Token</option>
                    <option value="x-api-key">X-API-Key Header</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-mono text-[#888] uppercase tracking-wider">Base URL</label>
                <input
                  type="text"
                  placeholder="https://api.example.com/v1/chat/completions"
                  value={form.baseUrl}
                  onChange={(e) => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                  className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-1.5 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-mono text-[#888] uppercase tracking-wider">API Key</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={form.apiKey}
                  onChange={(e) => setForm(f => ({ ...f, apiKey: e.target.value }))}
                  className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-1.5 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-mono text-[#888] uppercase tracking-wider">Response Format</label>
                  <select
                    value={form.responseFormat}
                    onChange={(e) => setForm(f => ({ ...f, responseFormat: e.target.value as ProviderConfig['responseFormat'] }))}
                    className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-1.5 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57]"
                  >
                    <option value="openai">OpenAI-compatible</option>
                    <option value="anthropic">Anthropic-compatible</option>
                    <option value="custom">Custom JSONPath</option>
                  </select>
                </div>
                {form.responseFormat === 'custom' && (
                  <div className="space-y-1">
                    <label className="text-[8px] font-mono text-[#888] uppercase tracking-wider">Response JSONPath</label>
                    <input
                      type="text"
                      placeholder="choices[0].message.content"
                      value={form.customResponsePath}
                      onChange={(e) => setForm(f => ({ ...f, customResponsePath: e.target.value }))}
                      className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-1.5 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57]"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-mono text-[#888] uppercase tracking-wider">Model Names (comma-separated)</label>
                <input
                  type="text"
                  placeholder="my-model-v1, my-model-v2"
                  value={form.supportedModels.join(', ')}
                  onChange={(e) => setForm(f => ({ ...f, supportedModels: e.target.value.split(',').map(m => m.trim()) }))}
                  className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-1.5 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57]"
                />
              </div>

              {error && <p className="text-[9px] font-mono text-red-400">{error}</p>}

              <button
                onClick={handleSaveCustom}
                className="w-full bg-[#b8ff57] hover:bg-[#a5e64e] border border-black/10 text-black font-extrabold py-2 rounded-sm text-[10px] uppercase tracking-widest transition-all"
              >
                {editingId ? 'Update Provider' : 'Add Provider'}
              </button>
            </div>
          )}

          {/* Custom Providers List */}
          <div className="space-y-2">
            {customProviders.length === 0 && !showAddForm && (
              <p className="text-[10px] text-[#555] font-mono text-center py-4 border border-dashed border-[#1f2235] rounded-sm">
                No custom providers configured yet.
              </p>
            )}
            {customProviders.map((p) => {
              const isRevealed = showKey[p.id];
              return (
                <div key={p.id} className="bg-[#0c0d12] border border-[#1f2235] p-3 rounded-sm flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Wifi className="w-3 h-3 text-[#5b5eff]" />
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      <span className={cn(
                        "text-[8px] font-mono px-1 py-0.5 border uppercase",
                        p.authStyle === 'bearer' ? "border-[#b8ff57]/30 text-[#b8ff57]" : "border-[#5b5eff]/30 text-[#5b5eff]"
                      )}>
                        {p.authStyle === 'bearer' ? 'Bearer' : 'X-API-Key'}
                      </span>
                    </div>
                    <p className="text-[9px] font-mono text-[#555] truncate">{p.baseUrl}</p>
                    <p className="text-[8px] font-mono text-[#444] mt-0.5">
                      Models: {p.supportedModels.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setShowKey(s => ({ ...s, [p.id]: !s[p.id] }))}
                      className="p-1 text-[#555] hover:text-[#888]"
                    >
                      {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleEdit(p)}
                      className="p-1 text-[#555] hover:text-[#b8ff57]"
                    >
                      <Key className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1 text-[#555] hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex gap-3 p-3 border border-[#2a2a2a] bg-[#0d0d0d] rounded-sm items-start">
          <ShieldAlert className="w-4 h-4 text-[#ffc147] shrink-0 mt-0.5" />
          <p className="text-[9px] text-[#555] font-mono leading-relaxed uppercase">
            Built-in providers (OpenAI, Anthropic, Groq, Mistral, etc.) are routed through the Wonderland proxy with server-managed keys. Custom providers connect directly from your browser using your own endpoint and key.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#E4E3E0] text-[#141414] text-xs font-mono py-2.5 font-bold transition-all uppercase tracking-wider mt-6 hover:bg-white"
        >
          DONE
        </button>
      </div>
    </div>
  );
}
