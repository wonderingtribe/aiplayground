import React, { useState, useEffect } from 'react';
import { 
  Settings, Shield, ShieldAlert, Cpu, ToggleLeft, Key, 
  HelpCircle, Check, RefreshCw, Eye, EyeOff, Save, Trash2
} from 'lucide-react';
import { CATALOG_MODELS } from './ModelsCatalog';
import { ModelName } from '../types';
import { cn } from '../utils';

interface UserSettings {
  defaultTextModel: ModelName;
  defaultImageModel: ModelName;
  defaultCodeModel: ModelName;
  zeroDataRetention: boolean;
  byokOpenAI: boolean;
  byokGoogle: boolean;
  byokAnthropic: boolean;
  byokDeepSeek: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultTextModel: 'fugu-ultra',
  defaultImageModel: 'gpt-image-2',
  defaultCodeModel: 'north-mini-code',
  zeroDataRetention: true,
  byokOpenAI: false,
  byokGoogle: false,
  byokAnthropic: false,
  byokDeepSeek: false,
};

export function SettingsView() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('wonderland_account_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [notif, setNotif] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('wonderland_account_settings', JSON.stringify(settings));
  }, [settings]);

  const saveSuccess = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 2500);
  };

  const handleToggle = (key: keyof UserSettings) => {
    setSettings(prev => {
      const val = !prev[key];
      return { ...prev, [key]: val };
    });
    saveSuccess('Settings changed and synced');
  };

  const handleSelectChange = (key: keyof UserSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    saveSuccess('Default routing model updated');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to restore default account preferences?')) {
      setSettings(DEFAULT_SETTINGS);
      saveSuccess('Settings reverted to enterprise defaults');
    }
  };

  const textModels = CATALOG_MODELS.filter(m => m.modality === 'Text');
  const imageModels = CATALOG_MODELS.filter(m => m.modality === 'Image');

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080c] p-6 lg:p-8 space-y-8 scrollbar-thin">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2235]/40 pb-6">
        <div>
          <div className="text-[10px] text-[#b8ff57] bg-[#b8ff57]/10 px-2 py-0.5 rounded w-max uppercase tracking-widest font-mono font-bold mb-2 border border-[#b8ff57]/20">
            Account Preferences
          </div>
          <h2 className="text-xl font-serif italic font-bold text-[#E4E3E0] tracking-tight">
            System & Privacy Configuration
          </h2>
          <p className="text-xs font-mono text-[#5e6686] mt-1">
            Fine-tune fallback model routing, configure direct key inputs (BYOK), and set zero-data-retention thresholds.
          </p>
        </div>

        {notif && (
          <div className="text-[9.5px] font-mono text-[#b8ff57] bg-[#b8ff57]/10 px-3 py-1.5 border border-[#b8ff57]/30 rounded">
            // {notif}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Preferences */}
        <div className="xl:col-span-2 space-y-6 font-mono">
          
          {/* Default model routing dropdowns */}
          <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-6 rounded shadow-md space-y-5">
            <div className="flex items-center gap-2 border-b border-[#1f2235]/30 pb-3">
              <Cpu className="w-4 h-4 text-[#5b5eff]" />
              <h3 className="text-xs font-bold tracking-wider text-white uppercase">Fallback Model Preferences</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Text Default */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">
                  Default Core Text Router
                </label>
                <select
                  value={settings.defaultTextModel}
                  onChange={(e) => handleSelectChange('defaultTextModel', e.target.value)}
                  className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-2 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57] cursor-pointer"
                >
                  {textModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Coding Default */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">
                  Default Software Developer Engine
                </label>
                <select
                  value={settings.defaultCodeModel}
                  onChange={(e) => handleSelectChange('defaultCodeModel', e.target.value)}
                  className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-2 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57] cursor-pointer"
                >
                  {textModels.filter(m => m.series.includes('Code') || m.id.includes('code') || m.id.includes('sonnet')).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                  <option value="fugu-ultra">Sakana: Fugu Ultra</option>
                  <option value="claude-fable-latest">Anthropic: Claude Fable Latest</option>
                </select>
              </div>

              {/* Image Default */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold">
                  Default Creative Image Synthesis Engine
                </label>
                <select
                  value={settings.defaultImageModel}
                  onChange={(e) => handleSelectChange('defaultImageModel', e.target.value)}
                  className="w-full bg-[#07080d] border border-[#1f2235] rounded-sm px-2.5 py-2 text-xs text-[#e8eaf6] focus:outline-none focus:border-[#b8ff57] cursor-pointer"
                >
                  {imageModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* BYOK Bring Your Own Key Toggles */}
          <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-6 rounded shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1f2235]/30 pb-3">
              <Key className="w-4 h-4 text-[#b8ff57]" />
              <h3 className="text-xs font-bold tracking-wider text-white uppercase">Bring-Your-Own-Key (BYOK) Routing</h3>
            </div>
            
            <p className="text-[10px] text-[#5e6686] uppercase tracking-wide leading-relaxed">
              // Toggle direct key bypass. When enabled, WONDERLAND routes your API requests using your custom credentials directly to the provider, bypassing platform balances.
            </p>

            <div className="space-y-3.5 pt-2">
              {[
                { key: 'byokOpenAI', label: 'Bypass with OpenAI Direct Key', provider: 'OpenAI' },
                { key: 'byokGoogle', label: 'Bypass with Google Cloud Direct Key', provider: 'Google' },
                { key: 'byokAnthropic', label: 'Bypass with Anthropic Direct Key', provider: 'Anthropic' },
                { key: 'byokDeepSeek', label: 'Bypass with DeepSeek Direct Key', provider: 'DeepSeek' },
              ].map((item, idx) => {
                const isActive = settings[item.key as keyof UserSettings];
                return (
                  <div key={idx} className="flex items-center justify-between p-3 border border-[#1f2235]/40 bg-[#07080d] rounded-sm">
                    <div className="space-y-0.5">
                      <div className="text-white text-xs font-bold">{item.label}</div>
                      <span className="text-[8px] text-[#5e6686] uppercase">Bypasses platform credits for {item.provider}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggle(item.key as keyof UserSettings)}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer",
                        isActive ? "bg-[#b8ff57]" : "bg-[#1f2235]"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 bg-black rounded-full shadow-md transform transition-transform duration-200",
                        isActive ? "translate-x-6" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: Security & Reset details */}
        <div className="xl:col-span-1 space-y-6 font-mono">
          
          {/* Zero Data Retention Card */}
          <div className="bg-[#0c0d12]/90 border border-purple-500/30 p-6 rounded shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-purple-500/20 pb-3 text-purple-400">
              <Shield className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold tracking-wider uppercase text-slate-100">Zero Data Retention</h3>
            </div>

            <p className="text-[10px] text-slate-300 leading-relaxed font-mono">
              Force strict zero-retention logging rules. When enabled, requests processed via WONDERLAND are strictly flagged as zero-retention, preventing companies (Google, OpenAI, Anthropic, Qwen, etc.) from logging or caching prompt data for telemetry or model-training passes.
            </p>

            <div className="flex items-center justify-between p-3 border border-purple-500/20 bg-purple-500/5 rounded-sm">
              <div>
                <span className="text-xs font-bold text-white uppercase block">Zero Retention</span>
                <span className="text-[8px] text-purple-400 uppercase font-semibold">Active enterprise wide</span>
              </div>

              <button
                type="button"
                onClick={() => handleToggle('zeroDataRetention')}
                className={cn(
                  "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer",
                  settings.zeroDataRetention ? "bg-purple-500" : "bg-[#1f2235]"
                )}
              >
                <div className={cn(
                  "w-4 h-4 bg-black rounded-full shadow-md transform transition-transform duration-200",
                  settings.zeroDataRetention ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>

          {/* Reset Box */}
          <div className="bg-[#0c0d12]/90 border border-red-500/20 p-6 rounded shadow-md space-y-3">
            <div className="text-[10px] uppercase text-red-400 font-bold tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>System Destruct</span>
            </div>
            <p className="text-[9px] text-[#5e6686] uppercase leading-relaxed">
              Resetting settings reverts all bypass toggles and sets model allocations back to defaults.
            </p>
            <button
              onClick={handleReset}
              className="w-full bg-red-950/20 hover:bg-red-950/60 text-red-400 border border-red-900/40 font-extrabold py-2 rounded-sm text-[10px] uppercase tracking-widest transition-all"
            >
              Reset Configuration
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
