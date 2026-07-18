import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Playground } from './components/Playground';
import { AIWonderCanvas } from './components/AIWonderCanvas';
import { ApiKeysModal } from './components/ApiKeysModal';
import { ModelsCatalog } from './components/ModelsCatalog';
import { ActivityView } from './components/ActivityView';
import { ApiKeysView } from './components/ApiKeysView';
import { PresetsView } from './components/PresetsView';
import { ProvidersView } from './components/ProvidersView';
import { SettingsView } from './components/SettingsView';
import { AnalyticsView } from './components/AnalyticsView';
import { PlaygroundConfig, AIModule, MemoryNode, NexusEvent, ModelName, Session } from './types';
import { Terminal, Database, ShieldAlert, Search, Globe, Sparkles, MessageSquare, BookOpen, Layers, Settings, AppWindow, Cpu, BarChart3, Lock } from 'lucide-react';
import { cn } from './utils';
import { supabase, getSession, signInWithEmail } from './lib/supabase';
import { useRealtimeSync, SyncedAgent } from './hooks/useRealtimeSync';

const INITIAL_MEMORIES: MemoryNode[] = [
  {
    id: 'mem-1',
    title: 'Migrated auth to Firebase',
    content: 'Decided to move away from local mock storage to Firestore and Firebase Authentication. This handles session persistence cleanly and provides secure token exchanges for external APIs.',
    type: 'decision',
    ts: Date.now() - 3600000 * 24,
  },
  {
    id: 'mem-2',
    title: 'Fixed canvas rendering crash on Safari',
    content: 'Bug occurred when the canvas size was calculated as fractional pixels during viewport resize events. Patched by wrapping coordinates in Math.floor inside the draw loop.',
    type: 'bug',
    ts: Date.now() - 3600000 * 12,
  },
  {
    id: 'mem-3',
    title: 'ThreeJS performance design pattern',
    content: 'Always bundle geometries or instantiate meshes (using InstancedMesh) when dealing with more than 100 simple shapes. Ensure dispose() is called on geometries and materials on component unmount to prevent memory leaks.',
    type: 'pattern',
    ts: Date.now() - 3600000 * 4,
  }
];

const INITIAL_EVENTS: NexusEvent[] = [
  {
    id: 'ev-1',
    type: 'js_error',
    severity: 'error',
    message: 'TypeError: Cannot read properties of undefined (reading "map") at RenderFeed (feed-list.tsx:42)',
    source: 'https://site-intelligence.io/static/js/main.js',
    line: 42,
    col: 18,
    stack: 'TypeError: Cannot read properties of undefined (reading "map")\n  at RenderFeed (feed-list.tsx:42)\n  at HTMLButtonElement.dispatch (jquery.js:3)\n  at Object.trigger (jquery.js:3)',
    timestamp: Date.now() - 45000,
  },
  {
    id: 'ev-2',
    type: 'network',
    severity: 'warning',
    message: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
    source: 'https://api.site-intelligence.io/v1/user/settings',
    line: 0,
    timestamp: Date.now() - 120000,
  },
  {
    id: 'ev-3',
    type: 'missing_asset',
    severity: 'info',
    message: 'Resource fetch warning: GET /assets/icon-logo.png aborted after 1500ms timeout.',
    source: 'https://site-intelligence.io/index.html',
    timestamp: Date.now() - 300000,
  }
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'models' | 'playground' | 'memory' | 'nexus' | 'docs' | 'aiwonder' | 'training' | 'creation' | 'activity' | 'analytics' | 'apikeys' | 'presets' | 'providers' | 'settings'>('models');
  const [modelsCatalogSubView, setModelsCatalogSubView] = useState<'directory' | 'infrastructure'>('directory');
  const [selectedCatalogModelId, setSelectedCatalogModelId] = useState<ModelName>('fugu-ultra');
  const [topSearch, setTopSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const topSearchRef = useRef<HTMLInputElement>(null);
  const [masterKeyShort, setMasterKeyShort] = useState('');

  useEffect(() => {
    async function initAuth() {
      const currentSession = await getSession();
      setSession(currentSession);
      setAuthLoading(false);
    }
    initAuth();
  }, []);

  // Realtime sync: agents, workflows, memories from Supabase
  const [syncedAgents, setSyncedAgents] = useState<SyncedAgent[]>([]);
  const { userId, upsertAgent, deleteAgent, upsertMemory } = useRealtimeSync({
    onAgentsChange: setSyncedAgents,
  });

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        topSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Memories State
  const [memories, setMemories] = useState<MemoryNode[]>(() => {
    const saved = localStorage.getItem('playground_memories');
    return saved ? JSON.parse(saved) : INITIAL_MEMORIES;
  });

  // Telemetry Events State
  const [events, setEvents] = useState<NexusEvent[]>(() => {
    const saved = localStorage.getItem('nexus_telemetry_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  // Playground Modules State — seeded from Supabase when available, hardcoded defaults otherwise
  const [modules, setModules] = useState<AIModule[]>([
    {
      id: '1',
      name: 'Alice',
      training: [],
      config: {
        model: 'gemini-3-flash-preview',
        systemInstruction: 'You are Alice, a precise and direct assistant. You leverage Project Intelligence Memory Core to answer project decisions.',
        temperature: 0.5,
        topP: 0.9,
        topK: 40,
        showRobot: true,
      }
    },
    {
      id: '2',
      name: 'Simple Rick',
      training: [],
      config: {
        model: 'gemini-3.1-pro-preview',
        systemInstruction: 'You are Simple Rick, a comprehensive assistant focused on code generation. You always formulate precise debug instructions.',
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        showRobot: true,
      }
    },
    {
      id: '3',
      name: 'Neo',
      training: [],
      config: {
        model: 'gpt-4o',
        systemInstruction: 'You are Neo, a creative strategist and brainstorming partner. You think outside the box, challenge assumptions, and propose innovative solutions to complex problems.',
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        showRobot: true,
      }
    },
    {
      id: '4',
      name: 'Atlas',
      training: [],
      config: {
        model: 'claude-3-5-sonnet-20241022',
        systemInstruction: 'You are Atlas, a rigorous code reviewer and architecture analyst. You scrutinize code for bugs, security issues, performance bottlenecks, and design flaws. Provide detailed, actionable feedback.',
        temperature: 0.3,
        topP: 0.85,
        topK: 40,
        showRobot: true,
      }
    },
    {
      id: '5',
      name: 'Sage',
      training: [],
      config: {
        model: 'deepseek-v3',
        systemInstruction: 'You are Sage, a technical documentation specialist. You excel at writing clear, comprehensive documentation, API references, tutorials, and explanatory breakdowns of complex systems.',
        temperature: 0.4,
        topP: 0.9,
        topK: 40,
        showRobot: true,
      }
    },
    {
      id: '6',
      name: 'Echo',
      training: [],
      config: {
        model: 'llama-4-scout',
        systemInstruction: 'You are Echo, a data analyst and visualization expert. You help users understand data through analysis, patterns, statistics, and suggest effective ways to present information visually.',
        temperature: 0.6,
        topP: 0.9,
        topK: 40,
        showRobot: true,
      }
    },
    {
      id: '7',
      name: 'Nova',
      training: [],
      config: {
        model: 'mistral-large-3',
        systemInstruction: 'You are Nova, a product manager and requirements engineer. You help define product specs, user stories, acceptance criteria, and roadmap planning. You ask clarifying questions to refine vague ideas into actionable plans.',
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        showRobot: true,
      }
    },
    {
      id: '8',
      name: 'Cipher',
      training: [],
      config: {
        model: 'grok-3',
        systemInstruction: 'You are Cipher, a security and DevOps specialist. You advise on infrastructure, deployment pipelines, authentication, encryption, and secure coding practices. You stay current on CVEs and zero-day threats.',
        temperature: 0.5,
        topP: 0.88,
        topK: 40,
        showRobot: true,
      }
    }
  ]);

  const [activeModuleId, setActiveModuleId] = useState<string>('1');
  const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);

  // Sync modules from Supabase when syncedAgents load
  useEffect(() => {
    if (syncedAgents.length > 0) {
      const mapped: AIModule[] = syncedAgents.map(a => ({
        id: a.id,
        name: a.name,
        training: [],
        config: {
          model: a.model as any,
          systemInstruction: a.system_instruction,
          temperature: a.temperature,
          topP: a.top_p,
          topK: a.top_k,
          showRobot: a.show_robot,
        }
      }));
      setModules(mapped);
    }
  }, [syncedAgents]);

  // Save changes to localStorage (prune to prevent unbounded growth)
  useEffect(() => {
    const capped = memories.length > 500 ? memories.slice(0, 500) : memories;
    if (capped.length < memories.length) setMemories(capped);
    localStorage.setItem('playground_memories', JSON.stringify(capped));
  }, [memories]);

  useEffect(() => {
    const capped = events.length > 200 ? events.slice(0, 200) : events;
    if (capped.length < events.length) setEvents(capped);
    localStorage.setItem('nexus_telemetry_events', JSON.stringify(capped));
  }, [events]);

  // Early returns AFTER all hooks
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const { data, error } = await signInWithEmail(email, password);
    if (error) {
      alert(error.message);
    } else {
      setSession(data.session);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center font-mono text-[#b8ff57]">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-[#b8ff57] animate-bounce rounded-full" />
          <span className="text-xs uppercase tracking-widest">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-6 font-mono">
        <div className="w-full max-w-sm bg-[#0c0d12] border border-[#1f2235] p-8 rounded-sm shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-md bg-gradient-to-tr from-[#5b5eff] to-[#b8ff57] flex items-center justify-center mb-4">
              <span className="font-serif italic font-black text-lg text-[#0a0a0a]">W</span>
            </div>
            <h2 className="text-sm font-black text-[#E4E3E0] uppercase tracking-widest">Wonderland Access</h2>
            <p className="text-[10px] text-[#5e6686] mt-1">Enter credentials to initialize orchestration</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] text-[#5e6686] uppercase font-bold block">Email</label>
              <input 
                name="email" 
                type="email" 
                required 
                className="w-full bg-[#141414] border border-[#2a2a2a] p-2 text-xs text-white rounded-sm focus:outline-none focus:border-[#5b5eff]"
                placeholder="operator@wonderland.ai"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-[#5e6686] uppercase font-bold block">Password</label>
              <input 
                name="password" 
                type="password" 
                required 
                className="w-full bg-[#141414] border border-[#2a2a2a] p-2 text-xs text-white rounded-sm focus:outline-none focus:border-[#5b5eff]"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-[#b8ff57] text-black py-2 text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#a5e64e] transition-all"
            >
              Initialize Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleSelectCatalogModel = (modelId: ModelName) => {
    setSelectedCatalogModelId(modelId);
    setModules(prev => prev.map(m => m.id === activeModuleId ? {
      ...m,
      config: {
        ...m.config,
        model: modelId
      }
    } : m));
    setCurrentTab('playground');
  };

  const handleAddMemory = (node: Omit<MemoryNode, 'id' | 'ts'> & { id?: string }) => {
    if (node.id) {
      setMemories(prev => prev.map(m => m.id === node.id ? { ...m, title: node.title, content: node.content, type: node.type, ts: Date.now() } : m));
    } else {
      const newNode: MemoryNode = {
        ...node,
        id: 'mem-' + Math.random().toString(36).substr(2, 9),
        ts: Date.now(),
      };
      setMemories(prev => [...prev, newNode]);
    }
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const handleImportMemories = (imported: MemoryNode[]) => {
    setMemories(prev => {
      const filtered = imported.filter(imp => !prev.some(p => p.id === imp.id));
      return [...prev, ...filtered];
    });
  };

  const handleClearEvents = () => {
    setEvents([]);
  };

  const handleDismissEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const updateModule = (id: string, updates: Partial<AIModule>) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const addModule = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newAgent = {
      id: newId,
      name: `Agent ${String.fromCharCode(65 + modules.length)}`,
      training: [],
      config: { ...modules[0].config }
    };
    setModules(prev => [...prev, newAgent]);
    setActiveModuleId(newId);
    // Persist to Supabase
    upsertAgent({
      id: newId,
      name: newAgent.name,
      model: newAgent.config.model,
      system_instruction: newAgent.config.systemInstruction,
      temperature: newAgent.config.temperature,
      top_p: newAgent.config.topP,
      top_k: newAgent.config.topK,
      show_robot: newAgent.config.showRobot,
    });
  };

  const removeModule = (id: string) => {
    if (modules.length <= 1) return;
    setModules(prev => prev.filter(m => m.id !== id));
    if (activeModuleId === id) {
      setActiveModuleId(modules.find(m => m.id !== id)?.id || '');
    }
    // Delete from Supabase
    deleteAgent(id);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-[#E4E3E0] overflow-hidden selection:bg-[#E4E3E0] selection:text-[#141414]">
      
      {/* Top Navbar */}
      <header className="h-14 border-b border-[#1f2235] bg-[#0c0d12]/95 px-6 flex items-center justify-between shrink-0 z-30 select-none">
        
        {/* Left Side: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-[#5b5eff] to-[#b8ff57] flex items-center justify-center shadow-[0_0_15px_rgba(91,94,255,0.25)]">
            <span className="font-serif italic font-black text-sm text-[#0a0a0a]">W</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-serif italic text-xs tracking-widest text-[#E4E3E0] uppercase leading-none mb-1">WONDERLAND</h1>
            <span className="text-[8px] font-mono text-[#5b5eff] uppercase tracking-widest block leading-none">AI PLAYGROUND HUB</span>
          </div>
        </div>

        {/* Center-Left: Search Box with ⌘K shortcut */}
        <div className="relative w-48 md:w-64 max-w-xs ml-4">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#555]" />
          <input
            ref={topSearchRef}
            type="text"
            placeholder="Search index..."
            value={topSearch}
            onChange={(e) => setTopSearch(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="w-full bg-[#141414]/90 border border-[#2a2a2a] text-[10px] px-8 py-2 rounded-sm focus:outline-none focus:border-[#5b5eff] focus:bg-[#181818] font-mono text-[#E4E3E0] transition-all"
          />
          <span className="absolute right-2.5 top-2 text-[8px] font-mono text-[#555] bg-[#0a0a0a] px-1 py-0.5 rounded border border-[#222]">⌘K</span>

          {/* Quick-find suggest drop panel */}
          {isFocused && (
            <div className="absolute top-11 left-0 right-0 bg-[#0e0e15] border border-[#1f2235] rounded shadow-2xl p-2 z-50 font-mono text-[9px] text-[#888] space-y-1">
              <div className="px-2 py-1 text-[8px] uppercase tracking-wider text-[#5b5eff]">Quick Nav Options</div>
              <button 
                onMouseDown={() => setCurrentTab('models')}
                className="w-full text-left px-2 py-1 hover:bg-[#b8ff57]/10 hover:text-white rounded transition-colors flex justify-between"
              >
                <span>🔍 Search AI Catalog</span>
                <span className="text-[#555]">Models</span>
              </button>
              <button 
                onMouseDown={() => setCurrentTab('playground')}
                className="w-full text-left px-2 py-1 hover:bg-[#b8ff57]/10 hover:text-white rounded transition-colors flex justify-between"
              >
                <span>💬 Open Multi-Agent Chat</span>
                <span className="text-[#555]">Chat</span>
              </button>
            </div>
          )}
        </div>

        {/* Center/Right: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {([
            { id: 'models', label: 'Home', activeOn: ['models'], subView: 'directory', externalUrl: 'https://dreammakerhub.website/homepage' },
            { id: 'dashboard', label: 'Dashboard', activeOn: [] as string[], externalUrl: 'https://dreammakerhub.website/dashboard' },
            { id: 'models', label: 'Models', activeOn: ['models'], subView: 'directory' },
            { id: 'playground', label: 'Fusion', activeOn: [] as string[] },
            { id: 'playground', label: 'Chat', activeOn: ['playground'] },
              { id: 'aiwonder', label: 'AI-Wonder', activeOn: ['aiwonder'] },
             { id: 'docs', label: 'Docs', activeOn: ['docs'] },
            { id: 'activity', label: 'Activity', activeOn: ['activity'] },
            { id: 'analytics', label: 'Analytics', activeOn: ['analytics'] },
            { id: 'apikeys', label: 'API Keys', activeOn: ['apikeys'] },
            { id: 'presets', label: 'Presets', activeOn: ['presets'] },
            { id: 'models', label: 'Providers', activeOn: [] as string[], subView: 'infrastructure' },
            { id: 'settings', label: 'Settings', activeOn: ['settings'] },
          ] as { id: string; label: string; activeOn: string[]; subView?: string; externalUrl?: string }[]).map((link, idx) => {
            const isActive = 
              (link.label === 'Providers' && currentTab === 'models' && modelsCatalogSubView === 'infrastructure') ||
              (link.label === 'Models' && currentTab === 'models' && modelsCatalogSubView === 'directory') ||
              (link.label === 'Home' && currentTab === 'models' && modelsCatalogSubView === 'directory') ||
              (link.label !== 'Providers' && link.label !== 'Models' && link.label !== 'Home' && (link.activeOn.includes(currentTab) || (link.label === 'Fusion' && currentTab === 'playground')));
            return (
              <button
                key={idx}
                onClick={() => {
                  if ((link as any).externalUrl) {
                    window.open((link as any).externalUrl, '_blank');
                    return;
                  }
                  setCurrentTab(link.id as any);
                  if (link.subView) {
                    setModelsCatalogSubView(link.subView as any);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-mono tracking-wider transition-all uppercase rounded-sm hover:bg-[#1a1a2e]/30",
                  isActive 
                    ? "text-[#b8ff57] font-extrabold border-b border-[#b8ff57]" 
                    : "text-[#888] hover:text-white"
                )}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Far Right: Master Key Badge + Org Badge */}
        <div className="flex items-center gap-3">
          {masterKeyShort && (
            <div className="hidden sm:flex items-center gap-1.5 border border-[#b8ff57]/20 bg-[#b8ff57]/5 px-2.5 py-1 rounded-sm text-[8px] font-mono text-[#b8ff57] tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b8ff57] animate-pulse" />
              <span>{masterKeyShort}</span>
            </div>
          )}
          <div className="border border-[#5b5eff]/40 bg-[#5b5eff]/10 px-3 py-1 rounded-full text-[9px] font-mono tracking-wider font-extrabold text-[#b8ff57] uppercase shadow-[0_0_12px_rgba(91,94,255,0.15)]">
            AI-WONDERLAND
          </div>
        </div>

      </header>

      {/* Main Panel Routing */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Models Catalog/Marketplace View */}
        {currentTab === 'models' && (
          <ModelsCatalog 
            key={modelsCatalogSubView}
            initialSubView={modelsCatalogSubView}
            selectedModelId={selectedCatalogModelId}
            onSelectModel={handleSelectCatalogModel}
            onOpenKeysModal={() => setIsKeysModalOpen(true)}
          />
        )}

        {/* Multi-Agent Playground View */}
        {currentTab === 'playground' && (
          <>
            <Sidebar 
              modules={modules} 
              activeId={activeModuleId}
              onSelect={setActiveModuleId}
              onUpdate={updateModule}
              onAdd={addModule}
              onRemove={removeModule}
              onOpenKeysModal={() => setIsKeysModalOpen(true)}
            />
            <div className="flex-1 flex overflow-x-auto divide-x divide-[#2a2a2a]">
              {modules.map(module => (
                <div key={module.id} className="min-w-[500px] flex-1">
                  <Playground module={module} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* AI-WONDER Canvas Orchestrator View */}
        {(currentTab === 'aiwonder' || currentTab === 'training' || currentTab === 'creation') && (
          <AIWonderCanvas
            memories={memories}
            events={events}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
            onImportMemories={handleImportMemories}
            onClearEvents={handleClearEvents}
            onDismissEvent={handleDismissEvent}
            currentTab={currentTab}
            onTabChange={setCurrentTab}
          />
        )}

        {/* Beautiful Docs/Help Handbook Panel */}
        {currentTab === 'docs' && (
          <div className="flex-1 overflow-y-auto p-12 bg-[#08080c] scrollbar-thin flex justify-center">
            <div className="max-w-3xl w-full space-y-8 font-mono text-[#888] text-xs">
              
              <div className="space-y-3">
                <div className="text-[10px] text-[#b8ff57] bg-[#b8ff57]/10 px-2 py-0.5 rounded w-max uppercase tracking-widest">
                  DOCUMENTATION HANDBOOK
                </div>
                <h2 className="text-xl font-serif italic font-bold text-[#E4E3E0] tracking-tight">
                  Multi-Agent Swarms & Parameters
                </h2>
                <p className="leading-relaxed">
                  Welcome to AI-WONDERLAND. Our platform provides a direct playground for comparing proprietary frontier systems and local open-weight models side-by-side using fully decoupled prompt states.
                </p>
              </div>

              <div className="border-t border-[#1f2235]/40 pt-6 space-y-4">
                <h3 className="text-sm font-bold text-[#E4E3E0] uppercase tracking-wider">// Orchestration Framework</h3>
                <p className="leading-relaxed">
                  Unlike traditional monolithic chats, Wonderland lets you build multi-agent cascades. You can configure up to 8 parallel agent nodes (Alice, Simple Rick, etc.), each bound to completely swappable model configurations (e.g. Sakana Fugu, Alibaba HappyHorse, Z.ai GLM, or Anthropic Claude Fable).
                </p>
              </div>

              <div className="border-t border-[#1f2235]/40 pt-6 space-y-4">
                <h3 className="text-sm font-bold text-[#E4E3E0] uppercase tracking-wider">// Project Memory Synchronization</h3>
                <p className="leading-relaxed">
                  The <span className="text-[#b8ff57]">Project Memory Core</span> automatically synchronizes local architectural logs and decision trees directly into model system instructions. This ensures every instantiated agent remains highly context-aware of Safari crashes, Firebase migrations, or performance patterns during prompt execution.
                </p>
              </div>

              <div className="border-t border-[#1f2235]/40 pt-6 space-y-4">
                <h3 className="text-sm font-bold text-[#E4E3E0] uppercase tracking-wider">// Parameter Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] mt-2">
                  <div className="bg-[#0c0d12]/60 p-4 border border-[#1f2235]/40 rounded">
                    <span className="text-[#5b5eff] font-bold block mb-1">TEMPERATURE</span>
                    Controls random exploration. Lowering (e.g. 0.2) delivers highly predictable, safe code layouts; raising (e.g. 0.9) optimizes creative storytelling or diverse outputs.
                  </div>
                  <div className="bg-[#0c0d12]/60 p-4 border border-[#1f2235]/40 rounded">
                    <span className="text-[#5b5eff] font-bold block mb-1">TOP_P (NUCLEUS SAMPLING)</span>
                    Discards tokens outside the cumulative probability threshold. High top_p ensures linguistic variety while low top_p clamps down on repetitive text outputs.
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Activity Tab View */}
        {currentTab === 'activity' && (
          <ActivityView />
        )}

        {/* Analytics Tab View */}
        {currentTab === 'analytics' && (
          <AnalyticsView />
        )}

        {/* API Keys Tab View */}
        {currentTab === 'apikeys' && (
          <ApiKeysView />
        )}

        {/* Presets Tab View */}
        {currentTab === 'presets' && (
          <PresetsView />
        )}

        {/* Settings Tab View */}
        {currentTab === 'settings' && (
          <SettingsView />
        )}

      </div>

      <ApiKeysModal isOpen={isKeysModalOpen} onClose={() => setIsKeysModalOpen(false)} />
    </div>
  );
}
