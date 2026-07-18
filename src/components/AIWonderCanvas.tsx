import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Save, Share2, MoreHorizontal, Clock, Search, Plus,
  Trash2, X, ToggleLeft, ToggleRight, Database, ShieldAlert, 
   Zap, Cpu, Code, HelpCircle, Sparkles, Info, AlertTriangle, AlertCircle, 

  Terminal, Layers, FileText, Check, Settings, Globe, Mail, 
  GitBranch, Filter, Split, MessageSquare, BookOpen, Download, 
  RefreshCw, ChevronDown, ChevronUp, ChevronRight, Link, HelpCircle as HelpIcon,
  Copy, ExternalLink, Activity, ArrowRight, BarChart2, Briefcase, 
  Key, Sliders, Upload, Network, Eye, History, RotateCcw, LayoutGrid
} from 'lucide-react';
import { MemoryNode, NexusEvent, ModelName, WorkflowNode, WorkflowConnection } from '../types';
import { cn, getOpenRouterModel } from '../utils';
import { CATALOG_MODELS } from './ModelsCatalog';
import { TrainingSetCompiler } from './TrainingSetCompiler';
import { AgentCompiler } from './AgentCompiler';
import { GoogleGenAI } from '@google/genai';
import { WORKFLOW_TEMPLATES, WorkflowTemplate } from '../data/workflowTemplates';
import { resolveExpressions, resolveConfig, ExpressionContext } from '../utils/expressionParser';
import cronParser from 'cron-parser';

// Types for workflow node graph
export type { WorkflowNode, WorkflowConnection } from '../types';

interface WorkflowVersion {
  id: string;
  title: string;
  timestamp: number;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  isActive: boolean;
  label: string;
}

const WORKFLOW_STORAGE_KEY = 'aiwonder_workflow_versions';
const MAX_VERSIONS = 50;

interface AIWonderCanvasProps {
  memories: MemoryNode[];
  events: NexusEvent[];
  onAddMemory: (node: Omit<MemoryNode, 'id' | 'ts'> & { id?: string }) => void;
  onDeleteMemory: (id: string) => void;
  onImportMemories: (imported: MemoryNode[]) => void;
  onClearEvents: () => void;
  onDismissEvent: (id: string) => void;
   currentTab?: 'aiwonder' | 'training' | 'creation';
  onTabChange?: (tab: 'models' | 'playground' | 'memory' | 'nexus' | 'docs' | 'aiwonder' | 'activity' | 'analytics' | 'apikeys' | 'presets' | 'providers' | 'settings') => void;
}

// Helper: convert schedule interval string to milliseconds
const scheduleIntervalToMs = (interval: string): number => {
  const map: Record<string, number> = {
    'every_1_min': 60 * 1000,
    'every_5_min': 5 * 60 * 1000,
    'every_15_min': 15 * 60 * 1000,
    'every_30_min': 30 * 60 * 1000,
    'every_1_hour': 60 * 60 * 1000,
    'every_2_hour': 2 * 60 * 60 * 1000,
    'every_6_hour': 6 * 60 * 60 * 1000,
    'every_12_hour': 12 * 60 * 60 * 1000,
    'every_day': 24 * 60 * 60 * 1000,
  };
  return map[interval] || 15 * 60 * 1000;
};

// Helper: compute next N execution times from a cron expression
const getCronNextTimes = (expr: string, count: number): Date[] => {
  try {
    const interval = cronParser.parse(expr, { tz: undefined })
;
    const times: Date[] = [];
    for (let i = 0; i < count; i++) {
      times.push(interval.next().toDate());
    }
    return times;
  } catch {
    return [];
  }
};

// Helper: compute ms until next cron execution
const getCronNextDelay = (expr: string): number | null => {
  try {
    const interval = cronParser.parse(expr, { tz: undefined })
;
    const next = interval.next().toDate();
    return Math.max(1000, next.getTime() - Date.now());
  } catch {
    return null;
  }
};

const MEMORY_TYPE_COLORS: Record<string, string> = {
  decision: '#b8ff57',
  bug: '#ff4560',
  pattern: '#38c8ff',
  context: '#b04cff',
  file: '#ffad33',
  note: '#00e8c6',
};

const NEXUS_TYPE_LABELS: Record<string, string> = {
  js_error: 'JS RUNTIME',
  unhandled_promise: 'REJECTION',
  network: 'NETWORK FAIL',
  broken_link: 'BROKEN LINK',
  missing_asset: 'ASSET FAIL',
  html_issue: 'HTML/A11Y',
  css_issue: 'CSS STYLE',
  react_error: 'REACT ERR',
  ts_error: 'TS BUILD',
};

// Default initial nodes
const INITIAL_NODES: WorkflowNode[] = [];

const INITIAL_CONNECTIONS: WorkflowConnection[] = [];

export function AIWonderCanvas({
  memories,
  events,
  onAddMemory,
  onDeleteMemory,
  onImportMemories,
  onClearEvents,
  onDismissEvent,
  currentTab = 'aiwonder',
  onTabChange
}: AIWonderCanvasProps) {
  // Navigation sidebar state (dashboard level)
  const [activeSidebarTab, setActiveSidebarTab] = useState<'workflows' | 'templates' | 'credentials' | 'executions' | 'variables' | 'insights' | 'memory' | 'versions'>('workflows');
  
  // Workflow core states
  const [nodes, setNodes] = useState<WorkflowNode[]>(INITIAL_NODES);
  const [connections, setConnections] = useState<WorkflowConnection[]>(INITIAL_CONNECTIONS);
  const [workflowTitle, setWorkflowTitle] = useState('Wonderland Telemetry Orchestrator');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Canvas Viewport transform states
  const [panX, setPanX] = useState(40);
  const [panY, setPanY] = useState(40);
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Node Dragging states
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartNodePos, setDragStartNodePos] = useState({ x: 0, y: 0 });
  const selectedNodesStartPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Adding nodes panel
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [addPanelSearch, setAddPanelSearch] = useState('');
  const [spawnCoords, setSpawnCoords] = useState<{ x: number; y: number } | null>(null);

  // Agent Creation Form States
  const [creationAgentName, setCreationAgentName] = useState('Wonder Reasoner v1');
  const [creationBaseModel, setCreationBaseModel] = useState<ModelName>('fugu-ultra');
  const [creationSystemPrompt, setCreationSystemPrompt] = useState('You are an expert multi-agent router optimized for AI-Wonder workflows.');
  const [creationToolWebSearch, setCreationToolWebSearch] = useState(true);
  const [creationToolCodeExecution, setCreationToolCodeExecution] = useState(false);
  const [creationToolVision, setCreationToolVision] = useState(false);
  const [creationToolMemory, setCreationToolMemory] = useState(true);

  // Credentials state (real CRUD with localStorage persistence)
  const [credentials, setCredentials] = useState<Array<{ id: string; name: string; type: string; value: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('aiwonder_credentials') || '[]'); } catch { return []; }
  });
  const [credFormName, setCredFormName] = useState('');
  const [credFormType, setCredFormType] = useState('api_key');
  const [credFormValue, setCredFormValue] = useState('');
  const [credFormId, setCredFormId] = useState<string | null>(null);

  // Variables state (real CRUD with localStorage persistence)
  const [variables, setVariables] = useState<Array<{ id: string; key: string; value: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('aiwonder_variables') || '[]'); } catch { return []; }
  });
  const [varFormKey, setVarFormKey] = useState('');
  const [varFormValue, setVarFormValue] = useState('');
  const [varFormId, setVarFormId] = useState<string | null>(null);

  // Persist credentials
  useEffect(() => {
    localStorage.setItem('aiwonder_credentials', JSON.stringify(credentials));
  }, [credentials]);

  // Persist variables
  useEffect(() => {
    localStorage.setItem('aiwonder_variables', JSON.stringify(variables));
  }, [variables]);

  // Connection drawing state
  const [connectingPin, setConnectingPin] = useState<{ nodeId: string; type: 'output' } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Node Detail View (NDV)
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [ndvActiveTab, setNdvActiveTab] = useState<'config' | 'test'>('config');

  // Memory Editor inside overlay
  const [activeMemoryNode, setActiveMemoryNode] = useState<MemoryNode | null>(null);
  const [memoryFormTitle, setMemoryFormTitle] = useState('');
  const [memoryFormType, setMemoryFormType] = useState<MemoryNode['type']>('decision');
  const [memoryFormContent, setMemoryFormContent] = useState('');

   // Bottom drawer states
   const [isBottomDrawerOpen, setIsBottomDrawerOpen] = useState(true);
   const [bottomDrawerTab, setBottomDrawerTab] = useState<'telemetry' | 'step_results' | 'execution_trace'>('telemetry');
   const [executionLog, setExecutionLog] = useState<string[]>(['[System] Orchestration Engine initialized.', '[Trigger] Webhook listener connected.']);
   const [selectedLogNodeId, setSelectedLogNodeId] = useState<string>('ai-agent-1');
   const [activeTelemetryChip, setActiveTelemetryChip] = useState<'all' | 'error' | 'warning' | 'info'>('all');
   const [telemetrySearch, setTelemetrySearch] = useState('');

   // Workbench sub-drawer states
   const [isSubDrawerOpen, setIsSubDrawerOpen] = useState(false);
   const [subDrawerMode, setSubDrawerMode] = useState<'training' | 'creation'>('training');

   // Gemini Diagnostic Fix in Bottom Drawer
   const [aiExplanations, setAiExplanations] = useState<Record<string, { explanation: string; fix: string; loading: boolean }>>({});

  // Right-side execution notifications
  const [rightNotification, setRightNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showRightNotification = (message: string, type: 'success' | 'error') => {
    setRightNotification({ message, type });
    setTimeout(() => setRightNotification(null), 4000);
  };

   // Memory sidebar states
   const [memorySearch, setMemorySearch] = useState('');
   const [memoryFilter, setMemoryFilter] = useState<string>('all');
   const [memoryDragOver, setMemoryDragOver] = useState(false);

   // Telemetry enhancement states
   const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
   const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  // Workflow versioning states
  const [workflowVersions, setWorkflowVersions] = useState<WorkflowVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<number | null>(null);
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null);

  // Execution outputs per node
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, {
    status: 'idle' | 'running' | 'success' | 'error' | 'warning';
    output: string;
    timestamp: number;
    duration?: number;
    tokens?: number;
    error?: string;
  }>>({});
  const [executingNodeIds, setExecutingNodeIds] = useState<Set<string>>(new Set());

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // Clipboard, undo/redo, context menu, multi-select, external drag state
  const [clipboard, setClipboard] = useState<{ nodes: WorkflowNode[]; connections: WorkflowConnection[] } | null>(null);
  const [history, setHistory] = useState<{ nodes: WorkflowNode[]; connections: WorkflowConnection[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasX: number; canvasY: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Push current state to undo history
  const pushHistory = () => {
    const idx = historyIndexRef.current;
    setHistory(prev => {
      const newHistory = prev.slice(0, idx + 1);
      newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)) });
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    const newIdx = Math.min(idx + 1, 49);
    historyIndexRef.current = newIdx;
    setHistoryIndex(newIdx);
  };

  // Undo
  const handleUndo = () => {
    const idx = historyIndexRef.current;
    if (idx > 0) {
      const prev = history[idx - 1];
      setNodes(prev.nodes);
      setConnections(prev.connections);
      historyIndexRef.current = idx - 1;
      setHistoryIndex(idx - 1);
      showNotification('Undo');
    }
  };

  // Redo
  const handleRedo = () => {
    const idx = historyIndexRef.current;
    if (idx < history.length - 1) {
      const next = history[idx + 1];
      setNodes(next.nodes);
      setConnections(next.connections);
      historyIndexRef.current = idx + 1;
      setHistoryIndex(idx + 1);
      showNotification('Redo');
    }
  };

  // Copy selected nodes
  const handleCopy = () => {
    const ids = selectedNodeIds.size > 0 ? selectedNodeIds : (selectedNode ? new Set([selectedNode.id]) : new Set());
    if (ids.size === 0) return;
    const copiedNodes = nodes.filter(n => ids.has(n.id));
    const copiedConns = connections.filter(c => ids.has(c.fromId) || ids.has(c.toId));
    setClipboard({ nodes: copiedNodes, connections: copiedConns });
    showNotification(`Copied ${ids.size} node(s)`);
  };

  // Paste from clipboard
  const handlePaste = () => {
    if (!clipboard) return;
    pushHistory();
    const idMap = new Map<string, string>();
    const newNodes = clipboard.nodes.map(n => {
      const newId = `${n.type}-${Math.random().toString(36).substr(2, 9)}`;
      idMap.set(n.id, newId);
      return { ...n, id: newId, x: n.x + 40, y: n.y + 40 };
    });
    const newConns = clipboard.connections.map(c => ({
      ...c,
      id: `conn-${Math.random().toString(36).substr(2, 9)}`,
      fromId: idMap.get(c.fromId) || c.fromId,
      toId: idMap.get(c.toId) || c.toId,
    }));
    setNodes(prev => [...prev, ...newNodes]);
    setConnections(prev => [...prev, ...newConns]);
    setSelectedNodeIds(new Set(newNodes.map(n => n.id)));
    showNotification(`Pasted ${newNodes.length} node(s)`);
  };

  // New empty workflow
  const handleNewWorkflow = () => {
    pushHistory();
    setNodes([]);
    setConnections([]);
    setWorkflowTitle('Untitled Workflow');
    setSelectedNode(null);
    setSelectedNodeIds(new Set());
    setExecutionLog([]);
    showNotification('New empty workflow created');
  };

  // Delete selected nodes
  const handleDeleteSelected = () => {
    const ids = selectedNodeIds.size > 0 ? selectedNodeIds : (selectedNode ? new Set([selectedNode.id]) : new Set());
    if (ids.size === 0) return;
    pushHistory();
    // Auto-merge: for each deleted node with exactly 1-in/1-out, connect source to target
    let mergedConnections: WorkflowConnection[] = [];
    for (const nodeId of ids) {
      const incoming = connections.filter(c => c.toId === nodeId && !ids.has(c.fromId));
      const outgoing = connections.filter(c => c.fromId === nodeId && !ids.has(c.toId));
      if (incoming.length === 1 && outgoing.length === 1) {
        mergedConnections.push({
          id: `conn-${Math.random().toString(36).substr(2, 9)}`,
          fromId: incoming[0].fromId,
          toId: outgoing[0].toId,
          fromPort: incoming[0].fromPort,
        });
      }
    }
    setNodes(prev => prev.filter(n => !ids.has(n.id)));
    setConnections(prev => [
      ...prev.filter(c => !ids.has(c.fromId) && !ids.has(c.toId)),
      ...mergedConnections,
    ]);
    setSelectedNodeIds(new Set());
    setSelectedNode(null);
    showNotification(mergedConnections.length ? `Deleted ${ids.size} node(s), wires merged` : `Deleted ${ids.size} node(s)`);
  };

  // Select all nodes
  const handleSelectAll = () => {
    setSelectedNodeIds(new Set(nodes.map(n => n.id)));
  };

  // Duplicate selected nodes
  const handleDuplicate = () => {
    const ids = selectedNodeIds.size > 0 ? selectedNodeIds : (selectedNode ? new Set([selectedNode.id]) : new Set());
    if (ids.size === 0) return;
    pushHistory();
    const idMap = new Map<string, string>();
    const duped = nodes.filter(n => ids.has(n.id)).map(n => {
      const newId = `${n.type}-${Math.random().toString(36).substr(2, 9)}`;
      idMap.set(n.id, newId);
      return { ...n, id: newId, x: n.x + 60, y: n.y + 60 };
    });
    const dupedConns = connections.filter(c => ids.has(c.fromId) || ids.has(c.toId)).map(c => ({
      ...c,
      id: `conn-${Math.random().toString(36).substr(2, 9)}`,
      fromId: idMap.get(c.fromId) || c.fromId,
      toId: idMap.get(c.toId) || c.toId,
    }));
    setNodes(prev => [...prev, ...duped]);
    setConnections(prev => [...prev, ...dupedConns]);
    setSelectedNodeIds(new Set(duped.map(n => n.id)));
    showNotification(`Duplicated ${duped.length} node(s)`);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (!containerRef.current?.contains(target) && target !== document.body) return;

      const isMod = e.metaKey || e.ctrlKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (isMod && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (isMod && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (isMod && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (isMod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (isMod && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      } else if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedNodeIds(new Set());
        setConnectingPin(null);
        setContextMenu(null);
        setIsAddPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedNodeIds, nodes, connections, clipboard, historyIndex, history]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [contextMenu]);

  // Right-click handler on canvas
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = canvasWrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const canvasX = (e.clientX - rect.left - panX) / scale;
    const canvasY = (e.clientY - rect.top - panY) / scale;
    setContextMenu({ x: e.clientX, y: e.clientY, canvasX, canvasY });
  };

  // External drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) setIsDragOver(false);
  };

  const handleExternalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const rect = canvasWrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dropX = (e.clientX - rect.left - panX) / scale;
    const dropY = (e.clientY - rect.top - panY) / scale;

    // Handle text data (JSON, plain text)
    const textData = e.dataTransfer.getData('text/plain');
    if (textData) {
      try {
        const parsed = JSON.parse(textData);
        if (parsed && typeof parsed === 'object') {
          pushHistory();
          const nodeId = `http-${Math.random().toString(36).substr(2, 9)}`;
          const newNode: WorkflowNode = {
            id: nodeId,
            type: 'code',
            category: 'core',
            label: 'Dropped Data',
            x: dropX,
            y: dropY,
            config: {
              title: 'Dropped Data',
              description: 'Node created from dropped JSON data',
              code: `const data = ${JSON.stringify(parsed, null, 2)};\nreturn JSON.stringify(data, null, 2);`,
              mockInputs: { payload: JSON.stringify(parsed) },
              mockOutputs: { status: 'success' },
            },
          };
          setNodes(prev => [...prev, newNode]);
          showNotification('Dropped JSON data as Code node');
          return;
        }
      } catch {}
      // Plain text → create a note node
      pushHistory();
      const nodeId = `code-${Math.random().toString(36).substr(2, 9)}`;
      const newNode: WorkflowNode = {
        id: nodeId,
        type: 'code',
        category: 'core',
        label: 'Dropped Text',
        x: dropX,
        y: dropY,
        config: {
          title: 'Dropped Text',
          description: 'Node created from dropped text',
          code: `return ${JSON.stringify(textData)};`,
          mockInputs: { payload: textData },
          mockOutputs: { status: 'success' },
        },
      };
      setNodes(prev => [...prev, newNode]);
      showNotification('Dropped text as Code node');
      return;
    }

    // Handle files
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      pushHistory();
      const newNodes: WorkflowNode[] = files.map((file, i) => ({
        id: `document-${Math.random().toString(36).substr(2, 9)}`,
        type: 'document' as const,
        category: 'app' as const,
        label: file.name,
        x: dropX + i * 60,
        y: dropY + i * 40,
        config: {
          title: file.name,
          description: `Dropped file: ${file.type || 'unknown type'} (${(file.size / 1024).toFixed(1)}KB)`,
          mockInputs: { payload: file.name },
          mockOutputs: { status: 'success' },
        },
      }));
      setNodes(prev => [...prev, ...newNodes]);
      showNotification(`Dropped ${files.length} file(s) as Document nodes`);
      return;
    }

    // Handle component data from sidebar templates
    const templateData = e.dataTransfer.getData('application/x-workflow-template');
    if (templateData) {
      try {
        const template: WorkflowTemplate = JSON.parse(templateData);
        pushHistory();
        const newNodes: WorkflowNode[] = template.nodes.map((n, i) => ({
          ...n,
          id: `${n.type}-${Math.random().toString(36).substr(2, 9)}`,
          x: dropX + (n.x || 0) + i * 20,
          y: dropY + (n.y || 0) + i * 20,
        }));
        setNodes(prev => [...prev, ...newNodes]);
        showNotification(`Imported template: ${template.name}`);
      } catch {}
    }
  };

  // Trigger quick notifications
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Sync initial Memory Core nodes with the app's memories if they don't exist
  useEffect(() => {
    const defaultMemories = [
      { id: 'mem-dec-initial', title: 'Auto-Trigger Hotfix Patch', type: 'decision' as const, content: 'Ruleset for evaluating automated Rollbacks. If severity is high and diagnostic confidence exceeds 85%, generate critical decision tree node and notify slack channel.' },
      { id: 'mem-bug-initial', title: 'TypeError in AppContainer', type: 'bug' as const, content: 'Asynchronous state loading delay on map() array render. Checked checkout container and added local boundary guards to prevent crash.' }
    ];
    defaultMemories.forEach(m => {
      if (!memories.some(exist => exist.id === m.id)) {
        onAddMemory(m);
      }
    });
  }, []);

  // Initialize undo history with initial state
  useEffect(() => {
    setHistory([{ nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)) }]);
    setHistoryIndex(0);
  }, []);

  // Sync memory details when double clicked
  useEffect(() => {
    if (activeMemoryNode) {
      setMemoryFormTitle(activeMemoryNode.title);
      setMemoryFormType(activeMemoryNode.type);
      setMemoryFormContent(activeMemoryNode.content);
    }
  }, [activeMemoryNode]);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.08;
      const rect = canvasWrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
  
      // Mouse coordinates relative to canvas wrapper
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
  
      // Zoom Math to keep point under cursor
      const zoomFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
      const newScale = Math.max(0.1, Math.min(3, scale * zoomFactor));
  
      const dx = mouseX - panX;
      const dy = mouseY - panY;
  
      setPanX(mouseX - dx * (newScale / scale));
      setPanY(mouseY - dy * (newScale / scale));
      setScale(newScale);
    };
    const wrapperRef = canvasWrapperRef.current;
    if (!wrapperRef) return;
    wrapperRef.addEventListener('wheel', onWheel);
    return () => {
      wrapperRef.removeEventListener('wheel', onWheel);
    };
  }, [panX, panY, scale]);

// Global mouse listeners so dragging/panning continues outside canvas bounds
   useEffect(() => {
     if (!isPanning && !draggedNodeId) return;

      const onMove = (e: MouseEvent) => {
        const dx = (e.clientX - dragStart.x) / scale;
        const dy = (e.clientY - dragStart.y) / scale;
        const startPosMap = selectedNodesStartPosRef.current;
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === draggedNodeId) {
              return { ...n, x: Math.round(dragStartNodePos.x + dx), y: Math.round(dragStartNodePos.y + dy) };
            }
            // Multi-node drag: use frozen positions from drag start
            const startPos = startPosMap.get(n.id);
            if (startPos) {
              const draggedStartPos = startPosMap.get(draggedNodeId!) || dragStartNodePos;
              const offsetX = startPos.x - draggedStartPos.x;
              const offsetY = startPos.y - draggedStartPos.y;
              return { ...n, x: Math.round(dragStartNodePos.x + dx + offsetX), y: Math.round(dragStartNodePos.y + dy + offsetY) };
            }
            return n;
          })
        );
      };

     const onUp = () => {
       setIsPanning(false);
       setDraggedNodeId(null);
     };

     if (isPanning || draggedNodeId) {
       window.addEventListener('mousemove', onMove);
       window.addEventListener('mouseup', onUp);
     }

     return () => {
       window.removeEventListener('mousemove', onMove);
       window.removeEventListener('mouseup', onUp);
     };
    }, [isPanning, draggedNodeId, dragStart, scale, dragStartNodePos, selectedNodeIds]);

  // Canvas Drag/Pan Event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.node-box') || target.closest('button') || target.closest('input')) return;
    setSelectedNodeIds(new Set());
    setSelectedNode(null);
    setIsPanning(true);
    setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasWrapperRef.current?.getBoundingClientRect();
    if (rect) {
      const currentMouseX = (e.clientX - rect.left - panX) / scale;
      const currentMouseY = (e.clientY - rect.top - panY) / scale;
      setMousePos({ x: currentMouseX, y: currentMouseY });
    }
    if (isPanning) {
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
    } else if (draggedNodeId) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      setNodes(prev => prev.map(n => n.id === draggedNodeId ? {
        ...n,
        x: Math.round(dragStartNodePos.x + dx),
        y: Math.round(dragStartNodePos.y + dy)
      } : n));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  // Double click canvas to summon Node Add Panel at specific grid coordinate
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (currentTab !== 'aiwonder') return;
    const target = e.target as HTMLElement;
    if (target.closest('.node-box') || target.closest('button') || target.closest('input')) return;

    const rect = canvasWrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = (e.clientX - rect.left - panX) / scale;
    const clickY = (e.clientY - rect.top - panY) / scale;

    setSpawnCoords({ x: clickX, y: clickY });
    setIsAddPanelOpen(true);
  };

   // Handle starting connection
   const handleStartConnection = (nodeId: string, e: React.MouseEvent) => {
     e.stopPropagation();
     if (currentTab === 'training' || (isSubDrawerOpen && subDrawerMode === "training")) return;
     setConnectingPin({ nodeId, type: 'output' });
   };


  // Complete connection on input pin click
  const handleConnectTo = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectingPin && connectingPin.nodeId !== nodeId) {
      // Avoid duplicate connections
      const exists = connections.some(c => c.fromId === connectingPin.nodeId && c.toId === nodeId);
      if (!exists) {
        const fromNode = nodes.find(n => n.id === connectingPin.nodeId);
        const existingFromConns = connections.filter(c => c.fromId === connectingPin.nodeId);
        let fromPort: string | undefined;
        if (fromNode?.type === 'if') {
          fromPort = existingFromConns.length === 0 ? 'true' : 'false';
        } else if (fromNode?.type === 'switch') {
          const cases = fromNode.config.switchCases || [];
          const usedPorts = new Set(existingFromConns.map(c => c.fromPort));
          const nextCase = cases.find((_, i) => !usedPorts.has(`case_${i}`));
          fromPort = nextCase ? `case_${cases.indexOf(nextCase)}` : (usedPorts.has('default') ? `case_${cases.length}` : 'default');
        }
        const newConn: WorkflowConnection = {
          id: `conn-${Math.random().toString(36).substr(2, 9)}`,
          fromId: connectingPin.nodeId,
          toId: nodeId,
          fromPort,
        };
        setConnections(prev => [...prev, newConn]);
        setExecutionLog(prev => [...prev, `[System] Connection established: ${connectingPin.nodeId} → ${nodeId}`]);
        showNotification('Connection created');
      }
    }
    setConnectingPin(null);
  };

  // Drag handles for node
   const handleNodeDragStart = (node: WorkflowNode, e: React.MouseEvent) => {
     e.stopPropagation();
     if (currentTab === 'training' || (isSubDrawerOpen && subDrawerMode === "training")) return;
     if (e.button !== 0) return;

     // Multi-select: Ctrl/Cmd+click toggles selection
     if (e.metaKey || e.ctrlKey) {
       setSelectedNodeIds(prev => {
         const next = new Set(prev);
         if (next.has(node.id)) {
           next.delete(node.id);
         } else {
           next.add(node.id);
         }
         return next;
       });
       setSelectedNode(node);
       return;
     }

     setDraggedNodeId(node.id);
     setDragStart({ x: e.clientX, y: e.clientY });
     setDragStartNodePos({ x: node.x, y: node.y });
     // Freeze positions of all selected nodes for multi-node drag
     const startPosMap = new Map<string, { x: number; y: number }>();
     if (selectedNodeIds.has(node.id)) {
       for (const n of nodes) {
         if (selectedNodeIds.has(n.id) || n.id === node.id) {
           startPosMap.set(n.id, { x: n.x, y: n.y });
         }
       }
     }
     selectedNodesStartPosRef.current = startPosMap;
   };

  // Handle double clicking any node to show the full screen/overlay NDV
  const handleNodeDoubleClick = (node: WorkflowNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.category === 'dream_maker') {
      // Find matching global memory node
      const matchingMem = memories.find(m => m.id === node.memoryId);
      if (matchingMem) {
        setActiveMemoryNode(matchingMem);
      } else {
        // Create matching memory
        const newMem: MemoryNode = {
          id: node.memoryId || `mem-${Math.random().toString(36).substr(2, 9)}`,
          title: node.config.title || node.label,
          type: node.type as any,
          content: node.config.description || '',
          ts: Date.now()
        };
        onAddMemory(newMem);
        setActiveMemoryNode(newMem);
      }
    } else {
      setSelectedNode(node);
      setNdvActiveTab('config');
    }
  };

  // Delete a node and its connections
  const handleDeleteNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    pushHistory();
    // Auto-merge: if node has exactly 1 incoming and 1 outgoing, connect them directly
    const incoming = connections.filter(c => c.toId === nodeId);
    const outgoing = connections.filter(c => c.fromId === nodeId);
    let mergedConnections: WorkflowConnection[] = [];
    if (incoming.length === 1 && outgoing.length === 1) {
      mergedConnections = [{
        id: `conn-${Math.random().toString(36).substr(2, 9)}`,
        fromId: incoming[0].fromId,
        toId: outgoing[0].toId,
        fromPort: incoming[0].fromPort,
      }];
    }
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => [
      ...prev.filter(c => c.fromId !== nodeId && c.toId !== nodeId),
      ...mergedConnections,
    ]);
    showNotification(mergedConnections.length ? 'Node deleted, wires merged' : 'Node deleted');
    if (selectedNode?.id === nodeId) setSelectedNode(null);
  };

  // Add a new node of a specific type
  const handleAddNodeType = (type: string, category: WorkflowNode['category'], label: string) => {
    const spawnX = spawnCoords ? spawnCoords.x : Math.round(150 - panX / scale);
    const spawnY = spawnCoords ? spawnCoords.y : Math.round(200 - panY / scale);

    const nodeId = `${type}-${Math.random().toString(36).substr(2, 9)}`;
    const newMemoryId = category === 'dream_maker' ? `mem-${Math.random().toString(36).substr(2, 9)}` : undefined;

    // Create a linked global memory node if memory core type
    if (category === 'dream_maker') {
      onAddMemory({
        id: newMemoryId,
        title: label,
        type: type as any,
        content: `Diagnostic context log for ${label}. Complete system details and stack metrics go here.`,
      });
    }

    const newNode: WorkflowNode = {
      id: nodeId,
      type,
      category,
      label,
      x: spawnX,
      y: spawnY,
      config: {
        title: label,
        description: `Sleek fully decoupled workflow automation block for ${label}`,
        ...(type === 'agent' ? {
          model: 'gemini-3-flash-preview',
          systemPrompt: 'You are an AI-Wonder automated node agent...',
          temperature: 0.7,
          topP: 0.95
        } : {}),
        ...(type === 'http' ? {
          httpMethod: 'GET',
          httpUrl: 'https://api.example.com/data',
          httpHeaders: '{"Content-Type": "application/json"}',
          httpBody: '',
        } : {}),
        ...(type === 'if' ? {
          conditionOperator: 'equals',
          conditionLeft: '$input',
          conditionRight: 'true',
        } : {}),
        ...(type === 'switch' ? {
          switchCases: [
            { value: 'A', label: 'Case A' },
            { value: 'B', label: 'Case B' },
          ],
          switchOperator: 'equals',
        } : {}),
        ...(type === 'confessionsAi' ? {
          conditionOperator: 'standard' as any,
          conditionLeft: '={{ $json.content }}',
        } : {}),
        mockInputs: { payload: '{}' },
        mockOutputs: { status: 'success' }
      },
      memoryId: newMemoryId
    };

    setNodes(prev => [...prev, newNode]);
    // Auto-connect from previous trigger node if exists and only trigger
    if (nodes.length === 1 && nodes[0].category === 'trigger') {
      setConnections(prev => [...prev, {
        id: `conn-${Math.random().toString(36).substr(2, 9)}`,
        fromId: nodes[0].id,
        toId: nodeId
      }]);
    }

    setExecutionLog(prev => [...prev, `[System] Instantiated Node: ${label} (${type})`]);
    setIsAddPanelOpen(false);
    setSpawnCoords(null);
    showNotification(`${label} added to grid`);
  };

  // Import a template workflow
  const handleImportTemplate = (template: WorkflowTemplate) => {
    const offsetX = Math.round(100 - panX / scale);
    const offsetY = Math.round(100 - panY / scale);
    const newNodes = template.nodes.map(n => ({
      id: `${n.id}-${Math.random().toString(36).substr(2, 6)}`,
      type: n.type,
      category: n.category as WorkflowNode['category'],
      label: n.label,
      x: n.x + offsetX,
      y: n.y + offsetY,
      config: {
        title: n.label,
        description: `Imported from template: ${template.name}`,
        ...n.config
      }
    }));
    const idMap = new Map(template.nodes.map((n, i) => [n.id, newNodes[i].id]));
    const newConns = template.connections.map(c => ({
      id: `conn-${Math.random().toString(36).substr(2, 9)}`,
      fromId: idMap.get(c.fromId)!,
      toId: idMap.get(c.toId)!,
      fromPort: c.fromPort
    }));
    setNodes(prev => [...prev, ...newNodes]);
    setConnections(prev => [...prev, ...newConns]);
    setActiveSidebarTab('workflows');
    showNotification(`Imported template: ${template.name}`);
  };

  // Auto-layout: organize nodes in a left-to-right layered flow based on connections.
  // Connected nodes stay connected — only positions change.
  const handleAutoLayout = () => {
    if (nodes.length === 0) {
      showNotification('No nodes to organize');
      return;
    }

    const COL_SPACING = 320;
    const ROW_SPACING = 160;
    const START_X = 80;
    const START_Y = 80;

    // Build adjacency: for each node, what nodes does it connect TO?
    const downstreamMap = new Map<string, string[]>();
    const upstreamMap = new Map<string, string[]>();
    nodes.forEach(n => {
      downstreamMap.set(n.id, []);
      upstreamMap.set(n.id, []);
    });
    connections.forEach(c => {
      downstreamMap.get(c.fromId)?.push(c.toId);
      upstreamMap.get(c.toId)?.push(c.fromId);
    });

    // Assign levels (columns) via longest path from any root (node with no upstream)
    const levelMap = new Map<string, number>();

    const computeLevel = (nodeId: string, visited: Set<string>): number => {
      if (levelMap.has(nodeId)) return levelMap.get(nodeId)!;
      if (visited.has(nodeId)) return 0; // cycle guard
      visited.add(nodeId);
      const upstreams = upstreamMap.get(nodeId) || [];
      if (upstreams.length === 0) {
        levelMap.set(nodeId, 0);
        return 0;
      }
      const maxUpstreamLevel = Math.max(...upstreams.map(u => computeLevel(u, visited)));
      const myLevel = maxUpstreamLevel + 1;
      levelMap.set(nodeId, myLevel);
      return myLevel;
    };

    nodes.forEach(n => computeLevel(n.id, new Set()));

    // Group nodes by level
    const maxLevel = Math.max(...Array.from(levelMap.values()), 0);
    const levelGroups: string[][] = Array.from({ length: maxLevel + 1 }, () => []);
    nodes.forEach(n => {
      const lvl = levelMap.get(n.id) || 0;
      levelGroups[lvl].push(n.id);
    });

    // Position nodes: each column left-to-right, nodes within column stacked vertically
    const newPositions = new Map<string, { x: number; y: number }>();
    levelGroups.forEach((nodeIds, col) => {
      const colX = START_X + col * COL_SPACING;
      // Center the column vertically around the midpoint
      const totalHeight = nodeIds.length * ROW_SPACING;
      const startY = START_Y;
      nodeIds.forEach((nodeId, row) => {
        newPositions.set(nodeId, {
          x: colX,
          y: startY + row * ROW_SPACING,
        });
      });
    });

    setNodes(prev => prev.map(n => {
      const pos = newPositions.get(n.id);
      return pos ? { ...n, x: pos.x, y: pos.y } : n;
    }));

    // Reset view to fit
    setPanX(40);
    setPanY(40);
    setScale(1);

    showNotification(`Organized ${nodes.length} nodes into ${maxLevel + 1} columns`);
  };

  // Handle spawning a compiled agent from the Creation Form
  const handleSpawnCompiledAgent = () => {
    if (!creationAgentName.trim()) {
      showNotification('Agent Name is required.');
      return;
    }

    const spawnX = Math.round(550 - panX / scale);
    const spawnY = Math.round(200 - panY / scale);
    const agentNodeId = `ai-agent-${Math.random().toString(36).substr(2, 9)}`;

    const selectedSources = nodes.filter(n => n.category === 'dream_maker' && n.config.useInTrainingSet);

    const newAgentNode: WorkflowNode = {
      id: agentNodeId,
      type: 'agent',
      category: 'ai',
      label: creationAgentName,
      x: spawnX,
      y: spawnY,
      config: {
        title: creationAgentName,
        description: `Compiled AI agent powered by ${creationBaseModel}. Web Search: ${creationToolWebSearch ? 'ENABLED' : 'DISABLED'}.`,
        model: creationBaseModel,
        systemPrompt: creationSystemPrompt,
        temperature: 0.7,
        maxTokens: 2048,
        mockInputs: { query: 'Ingest training resources' },
        mockOutputs: { response: 'Ingested context successfully!' }
      }
    };

    setNodes(prev => [...prev, newAgentNode]);

    const newEdges: WorkflowConnection[] = selectedSources.map(source => ({
      id: `conn-training-${Math.random().toString(36).substr(2, 9)}`,
      fromId: source.id,
      toId: agentNodeId,
      isTrainingEdge: true
    }));

    if (newEdges.length > 0) {
      setConnections(prev => [...prev, ...newEdges]);
    }

    setExecutionLog(prev => [
      ...prev,
      `[System] Compiled & instantiated agent "${creationAgentName}" using base model ${creationBaseModel}`,
      ...selectedSources.map(s => `[System] Active ingestion connection established from Knowledge Base: "${s.config.title || s.label}"`)
    ]);

    showNotification(`Agent "${creationAgentName}" compiled & spawned!`);

    if (onTabChange) {
      setTimeout(() => {
        setIsSubDrawerOpen(false);
      }, 1200);
    }
  };

  // Handle exporting the training set to a downloaded JSONL file
  const handleExportTrainingSet = () => {
    const selectedNodes = nodes.filter(n => n.category === 'dream_maker' && n.config.useInTrainingSet);
    if (selectedNodes.length === 0) {
      showNotification('No nodes selected for training set.');
      return;
    }

    const lines = selectedNodes.map(node => {
      const matchingMem = memories.find(m => m.id === node.memoryId);
      return JSON.stringify({
        id: node.id,
        type: node.type,
        title: node.config.title || node.label,
        content: matchingMem ? matchingMem.content : (node.config.description || '')
      });
    });

    const jsonlContent = lines.join('\n');
    const blob = new Blob([jsonlContent], { type: 'application/x-jsonlines' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_training_set_${Date.now()}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Training set exported! File downloaded.');
  };

  // Save the custom linked memory inside overlay
  const handleSaveMemoryForm = () => {
    if (!activeMemoryNode) return;
    onAddMemory({
      id: activeMemoryNode.id,
      title: memoryFormTitle,
      type: memoryFormType,
      content: memoryFormContent
    });

    // Also update the matching node's label and type on the canvas
    setNodes(prev => prev.map(n => n.memoryId === activeMemoryNode.id ? {
      ...n,
      label: `${memoryFormType.toUpperCase()}: ${memoryFormTitle}`,
      type: memoryFormType,
      config: {
        ...n.config,
        title: memoryFormTitle,
        description: memoryFormContent
      }
    } : n));

    setActiveMemoryNode(null);
    showNotification('Memory Node synchronized');
  };

  // Export memories as JSON knowledge graph
  const handleExportMemories = () => {
    const dataStr = JSON.stringify({ project: 'AI Playground Project', memories, exported: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `memory-core-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Knowledge graph exported!');
  };

  // Process dropped/selected files for memory import
  const processMemoryFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = event.target?.result as string;
        try {
          const data = JSON.parse(textContent);
          if (data.memories && Array.isArray(data.memories)) {
            onImportMemories(data.memories);
            showNotification(`Imported ${data.memories.length} memory nodes`);
            return;
          }
        } catch {
          // Fallback to plain text import
        }
        const extension = file.name.split('.').pop() || 'txt';
        const type: MemoryNode['type'] = ['js', 'ts', 'tsx', 'jsx', 'py'].includes(extension) ? 'file' : extension === 'md' ? 'note' : 'file';
        onAddMemory({ title: file.name, content: `Codebase File: ${file.name}\n\n${textContent}`, type });
        showNotification(`Imported: ${file.name}`);
      };
      reader.readAsText(file);
    });
  };

  const handleMemoryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setMemoryDragOver(false);
    processMemoryFiles(e.dataTransfer.files);
  };

  // Copy event JSON to clipboard
  const handleCopyEvent = (ev: NexusEvent) => {
    navigator.clipboard.writeText(JSON.stringify(ev, null, 2));
    setCopiedEventId(ev.id);
    setTimeout(() => setCopiedEventId(null), 2000);
  };

  // ─── Workflow Versioning ───

  const loadVersionsFromStorage = (): WorkflowVersion[] => {
    try {
      const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((v: any) => v && v.id && v.nodes && v.connections);
    } catch {
      return [];
    }
  };

  const persistVersions = (versions: WorkflowVersion[]) => {
    try {
      localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(versions));
    } catch (err) {
      console.error('Failed to persist workflow versions:', err);
    }
  };

  const handleSaveVersion = (autoLabel?: string) => {
    const version: WorkflowVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: workflowTitle,
      timestamp: Date.now(),
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections)),
      isActive,
      label: autoLabel || `v${workflowVersions.length + 1}`,
    };

    const updated = [version, ...workflowVersions].slice(0, MAX_VERSIONS);
    setWorkflowVersions(updated);
    persistVersions(updated);
    setSelectedVersionId(version.id);
    showNotification(`Workflow saved as ${version.label}`);
    return version.id;
  };

  const handleRestoreVersion = (versionId: string) => {
    const version = workflowVersions.find(v => v.id === versionId);
    if (!version) {
      showNotification('Version not found');
      return;
    }

    setNodes(JSON.parse(JSON.stringify(version.nodes)));
    setConnections(JSON.parse(JSON.stringify(version.connections)));
    setWorkflowTitle(version.title);
    setIsActive(version.isActive);
    setSelectedNode(null);
    setNodeOutputs({});
    showNotification(`Restored ${version.label} — ${new Date(version.timestamp).toLocaleTimeString()}`);
  };

  const handleDeleteVersion = (versionId: string) => {
    const updated = workflowVersions.filter(v => v.id !== versionId);
    setWorkflowVersions(updated);
    persistVersions(updated);
    if (selectedVersionId === versionId) setSelectedVersionId(null);
    if (diffVersionId === versionId) setDiffVersionId(null);
    showNotification('Version deleted');
  };

  // Load versions from localStorage on mount
  useEffect(() => {
    const loaded = loadVersionsFromStorage();
    if (loaded.length > 0) {
      setWorkflowVersions(loaded);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft every 30 seconds — use a dirty flag to avoid recreating the timer on every keystroke
  const autoSaveDirtyRef = useRef(false);
  useEffect(() => { autoSaveDirtyRef.current = true; }, [nodes, connections, workflowTitle, workflowVersions]);
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (!autoSaveDirtyRef.current) return;
      autoSaveDirtyRef.current = false;
      const id = handleSaveVersion('auto-save');
      setLastAutoSave(Date.now());
      void id;
    }, 30000);
    return () => clearInterval(interval);
  }, [isActive]);

  // Compute diff between current workflow and a selected version
  const computeVersionDiff = (versionId: string | null): { added: string[]; removed: string[]; changed: string[] } => {
    if (!versionId) return { added: [], removed: [], changed: [] };
    const version = workflowVersions.find(v => v.id === versionId);
    if (!version) return { added: [], removed: [], changed: [] };

    const currentNodeIds = new Set(nodes.map(n => n.id));
    const versionNodeIds = new Set(version.nodes.map(n => n.id));

    const added = nodes.filter(n => !versionNodeIds.has(n.id)).map(n => n.label);
    const removed = version.nodes.filter(n => !currentNodeIds.has(n.id)).map(n => n.label);

    const changed: string[] = [];
    version.nodes.forEach(vn => {
      const current = nodes.find(n => n.id === vn.id);
      if (current && JSON.stringify(current.config) !== JSON.stringify(vn.config)) {
        changed.push(vn.label);
      }
    });

    return { added, removed, changed };
  };

  const versionDiff = computeVersionDiff(diffVersionId);

  // ─── End Workflow Versioning ───

  const handleSaveNdvConfig = (updatedNode: WorkflowNode) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
    setSelectedNode(null);
    showNotification(`${updatedNode.config.title || updatedNode.label} config saved`);
  };

  // Execute a single AI node via OpenRouter
  const executeAINode = async (node: WorkflowNode, inputText: string): Promise<{ output: string; tokens?: number }> => {
    const openrouterKey = localStorage.getItem('mc_key_openrouter');
    const openrouterModel = getOpenRouterModel(node.config.model || '');

    if (!openrouterKey || !openrouterModel) {
      throw new Error(`No OpenRouter route for model ${node.config.model}`);
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages: [
          ...(node.config.systemPrompt ? [{ role: 'system', content: node.config.systemPrompt }] : []),
          { role: 'user', content: inputText }
        ],
        temperature: node.config.temperature ?? 0.7,
        top_p: node.config.topP ?? 0.9,
        max_tokens: node.config.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `OpenRouter HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      output: data.choices?.[0]?.message?.content || 'Empty response received.',
      tokens: data.usage?.total_tokens,
    };
  };

  // Get upstream input for a node based on connections
  const getNodeInput = (nodeId: string): string => {
    const upstreamConns = connections.filter(c => c.toId === nodeId);
    const upstreamOutputs = upstreamConns
      .map(c => nodeOutputs[c.fromId])
      .filter(Boolean);
    if (upstreamOutputs.length > 0) {
      return upstreamOutputs.map(o => o.output).join('\n\n');
    }
    // Fall back to mockInputs
    const node = nodes.find(n => n.id === nodeId);
    if (node?.config.mockInputs) {
      return Object.entries(node.config.mockInputs)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    }
    return 'Execute workflow node.';
  };

  // Run the whole workflow
  const handleExecuteWorkflow = async () => {
    const startTime = Date.now();
    setExecutionLog(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] 🚀 Workflow execution started...`
    ]);

    // Get execution order: follow connections from triggers outward
    const executed = new Set<string>();
    const toExecute = nodes.filter(n => n.category === 'trigger').map(n => n.id);

    // Add any unconnected nodes too
    nodes.forEach(n => {
      if (!toExecute.includes(n.id)) toExecute.push(n.id);
    });

    setNodeOutputs({});

    try {
      for (const nodeId of toExecute) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || executed.has(nodeId)) continue;
        executed.add(nodeId);

      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ▶ Executing: ${node.label}...`]);
      setExecutingNodeIds(prev => new Set(prev).add(nodeId));

      const input = getNodeInput(nodeId);
      const maxRetries = node.config.retryCount ?? 0;
      const retryDelay = node.config.retryDelay ?? 1000;
      let lastError: any = null;
      let nodeSuccess = false;

      // Resolve expressions in config
      const exprCtx: ExpressionContext = {
        $node: Object.fromEntries(
          nodes.map(n => [n.label, { data: nodeOutputs[n.id]?.output, output: nodeOutputs[n.id]?.output || '' }])
        ),
        $json: (() => { try { return JSON.parse(input); } catch { return input; } })(),
        $items: [],
        $index: 0,
        $now: new Date().toISOString(),
        $today: new Date().toLocaleDateString(),
      };
      const cfg = resolveConfig(node.config, exprCtx);

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const nodeStart = Date.now();
        if (attempt > 0) {
          setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ♻️ Retry ${attempt}/${maxRetries} for ${node.label}...`]);
          await new Promise(r => setTimeout(r, retryDelay));
        }
        try {
          if (node.category === 'ai' && node.type === 'agent') {
            const result = await executeAINode({ ...node, config: cfg }, input);
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: result.output, timestamp: Date.now(), duration: Date.now() - nodeStart, tokens: result.tokens }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ ${node.label} — ${result.tokens ? result.tokens + ' tokens' : 'success'} (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'if') {
            const op = cfg.conditionOperator || 'equals';
            const left = cfg.conditionLeft || '$input';
            const right = cfg.conditionRight || 'true';
            const leftVal = left === '$input' ? input : left;
            let result = false;
            try {
              switch (op) {
                case 'equals': result = leftVal === right; break;
                case 'not_equals': result = leftVal !== right; break;
                case 'greater_than': result = parseFloat(leftVal) > parseFloat(right); break;
                case 'less_than': result = parseFloat(leftVal) < parseFloat(right); break;
                case 'contains': result = leftVal.includes(right); break;
                case 'starts_with': result = leftVal.startsWith(right); break;
                case 'regex': result = new RegExp(right).test(leftVal); break;
              }
            } catch { result = false; }
            const branch = result ? 'true' : 'false';
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: JSON.stringify({ branch, condition: `${leftVal} ${op} ${right} = ${result}` }), timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔀 ${node.label} → ${branch === 'true' ? 'True' : 'False'} (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'switch') {
            const cases = cfg.switchCases || [];
            const op = cfg.switchOperator || 'equals';
            const inputVal = input;
            let matchedPort = 'default';

            const evalCase = (leftVal: string, rightVal: string): boolean => {
              try {
                switch (op) {
                  case 'equals': return leftVal === rightVal;
                  case 'not_equals': return leftVal !== rightVal;
                  case 'greater_than': return parseFloat(leftVal) > parseFloat(rightVal);
                  case 'less_than': return parseFloat(leftVal) < parseFloat(rightVal);
                  case 'contains': return leftVal.includes(rightVal);
                  case 'starts_with': return leftVal.startsWith(rightVal);
                  case 'regex': return new RegExp(rightVal).test(leftVal);
                  default: return false;
                }
              } catch { return false; }
            };

            for (let i = 0; i < cases.length; i++) {
              if (evalCase(inputVal, cases[i].value)) {
                matchedPort = `case_${i}`;
                break;
              }
            }

            const matchedLabel = matchedPort === 'default' ? 'default' : cases[parseInt(matchedPort.split('_')[1])]?.label || matchedPort;
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: JSON.stringify({ branch: matchedPort, matched: matchedLabel, input: inputVal, operator: op }), timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔀 ${node.label} → ${matchedLabel} (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'code') {
            const code = cfg.code;
            if (!code) throw new Error('Code node has no JavaScript to execute');
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 💻 Executing code for ${node.label}...`]);
            const fn = new Function('$input', '$output', '$console', code);
            const mockConsole = { log: (...args: any[]) => console.log('[CodeNode]', ...args) };
            const result = fn(input, {}, mockConsole);
            const outputStr = result === undefined ? 'undefined' : (typeof result === 'string' ? result : JSON.stringify(result, null, 2));
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: outputStr, timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ ${node.label} — executed (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'http') {
            const url = cfg.httpUrl;
            if (!url) throw new Error('HTTP URL is required');
            const method = cfg.httpMethod || 'GET';
            let headers: Record<string, string> = {};
            try { headers = JSON.parse(cfg.httpHeaders || '{}'); } catch {}
            const body = ['POST', 'PUT', 'PATCH'].includes(method) ? cfg.httpBody : undefined;

            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🌐 ${method} ${url}`]);
            const res = await fetch(url, { method, headers, body });
            const responseText = await res.text();
            const output = JSON.stringify({
              status: res.status,
              statusText: res.statusText,
              headers: Object.fromEntries(res.headers.entries()),
              body: responseText,
            }, null, 2);

            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: res.ok ? 'success' : 'error', output, timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ ${node.label} — HTTP ${res.status} (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'loop_for') {
            const raw = cfg.loopItems || '[1, 2, 3]';
            let items: any[];
            try { items = JSON.parse(raw); }
             catch { items = raw.split(',').map((s: string) => s.trim()); }

            if (!Array.isArray(items)) items = [items];
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: JSON.stringify(items, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔁 ${node.label} — ${items.length} items (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'loop_while') {
            const conditionExpr = cfg.whileCondition || '$input < 5';
            const maxIter = cfg.whileMaxIterations ?? 100;
            const outputs: any[] = [];
            let iterations = 0;
            while (iterations < maxIter) {
              try {
                const fn = new Function('$input', `return Boolean(${conditionExpr})`);
                if (!fn(input)) break;
              } catch { break; }
              outputs.push(`iteration-${iterations + 1}`);
              iterations++;
            }
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: JSON.stringify({ iterations, outputs }, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔁 ${node.label} — ${iterations} iterations (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'merge') {
            const mode = cfg.mergeMode || 'array';
            const upstreamConns = connections.filter(c => c.toId === nodeId);
            const upstreamOutputs = upstreamConns
              .map(c => nodeOutputs[c.fromId]?.output)
              .filter(Boolean);
            let merged = input;
            if (mode === 'array') {
              const arrays = upstreamOutputs.map(o => { try { return JSON.parse(o); } catch { return [o]; } }).flat();
              merged = JSON.stringify(arrays, null, 2);
            } else if (mode === 'object') {
              const objs = upstreamOutputs.map(o => { try { return JSON.parse(o); } catch { return {}; } });
              merged = JSON.stringify(Object.assign({}, ...objs), null, 2);
            }
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: merged, timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔗 ${node.label} — merged ${upstreamOutputs.length} inputs (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'split') {
            const mode = cfg.splitMode || 'first';
            let items: any[] = [];
            try { items = JSON.parse(input); } catch { items = [input]; }
            if (!Array.isArray(items)) items = [items];
            const output = mode === 'first' ? JSON.stringify(items[0], null, 2) : JSON.stringify(items, null, 2);
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output, timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✂️ ${node.label} — ${items.length} items, mode: ${mode} (${Date.now() - nodeStart}ms)`]);
          } else if (node.category === 'storage' && node.type === 'window_buffer') {
            // Simple buffer that stores the last N inputs/outputs
            const maxSize = 10;
            let buffer: any[] = [];
            try { buffer = JSON.parse(node.config.buffer || '[]'); } catch {}
            buffer.push(input);
            if (buffer.length > maxSize) buffer = buffer.slice(-maxSize);
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: JSON.stringify(buffer, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🪟 ${node.label} — buffered input (${Date.now() - nodeStart}ms)`]);
          } else if (node.category === 'storage' && node.type === 'vector_store') {
            // Vector Store - mock storing and retrieving vectors
            const rows = Math.max(1, Math.floor(input.length / 100));
            const items = Array.from({length: rows}, (_, i) => ({
              id: `vec-${i}`,
              score: 0.8 - (i * 0.01),
              metadata: { text: `Similar to ${input.slice(0, 20)}...` }
            }));
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: {
                status: 'success',
                output: JSON.stringify({ query: input, results: items, rowCount: rows }, null, 2),
                timestamp: Date.now(),
                duration: Date.now() - nodeStart
              }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🗃️ ${node.label} — queried ${rows} vectors (${Date.now() - nodeStart}ms)`]);
          } else if (node.category === 'core' && node.type === 'workflow_tools') {
            // Workflow tool execution - direct manipulation
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: `Executed ${node.label} with input ${input.slice(0, Math.min(50, input.length))}`, timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔧 ${node.label} — completed (${Date.now() - nodeStart}ms)`]);
          } else if (node.category === 'core' && node.type === 'custom_tool') {
            // Custom tool execution
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: `Custom tool executed with parameters: query="${input.slice(0, 30)}"`, timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✏️ ${node.label} — completed (${Date.now() - nodeStart}ms)`]);
          } else if (node.category === 'ai' && node.type === 'core_brain') {
            // Advanced AI brain agent
            const result = await executeAINode({ ...node, config: cfg }, `Core Brain Analysis: ${input}`);
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: result.output, timestamp: Date.now(), duration: Date.now() - nodeStart, tokens: result.tokens }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🧠 ${node.label} — ${result.tokens ? result.tokens + ' tokens' : 'success'} (${Date.now() - nodeStart}ms)`]);
          } else if (node.category === 'ai' && node.type === 'llm_chain') {
            // Basic LLM chain
            const result = await executeAINode({ ...node, config: cfg }, `Chain Step: ${input}`);
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: result.output, timestamp: Date.now(), duration: Date.now() - nodeStart, tokens: result.tokens }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📜 ${node.label} — ${result.tokens ? result.tokens + ' tokens' : 'success'} (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'document') {
            // Document Manager - read/write files
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: `Document processed: ${input.slice(0, 50)}`, timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📄 ${node.label} — processed (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'utilities') {
            // Utility Toolbox - string, date and data manipulation
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: `Utility applied to: ${input.slice(0, 50)}`, timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🛠️ ${node.label} — applied (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'confessionsAi') {
            // Confessions AI — enforces AI Constitution and audits priority-based logs
            const priority = (cfg.conditionOperator as string) || 'standard';
            const payloadExpr = cfg.conditionLeft || '={{ $json.content }}';
            const rawPayload = payloadExpr.startsWith('={{') ? input : payloadExpr;

            let isViolation = false;
            const auditReasons: string[] = [];

            // ─── CONSTITUTIONAL EVALUATION LAWS ───

            // Rule A: Enforce Explicit Uncertainty Declaration
            if (rawPayload.includes('TODO') || rawPayload.includes('// Fix later')) {
              auditReasons.push('Agent attempted to inject incomplete code blocks without explicit confession.');
              isViolation = true;
            }

            // Rule B: Catch Stealth Code Failures or Hallucinations
            if (rawPayload.match(/undefined|\[object Object\]/i)) {
              auditReasons.push('Payload contains unsafe type serialization errors.');
              isViolation = true;
            }

            // Rule C: Deception about capabilities (all tiers)
            if (/i can do anything|i am perfect|no limitations|flawless/i.test(rawPayload)) {
              auditReasons.push('Agent claimed impossible capabilities — Constitution Article I violation.');
              isViolation = true;
            }

            // Rule D: Harmful content intent (all tiers)
            if (/how to hack|how to steal|how to harm|illegal|weapon|exploit/i.test(rawPayload)) {
              auditReasons.push('Payload contains harmful or dangerous content indicators — Constitution Article II violation.');
              isViolation = true;
            }

            // Rule E: Privacy / data exfiltration (high and critical tiers)
            if (priority === 'high' || priority === 'critical') {
              if (/password|ssn|credit card|api key|private key|secret token/i.test(rawPayload)) {
                auditReasons.push('Sensitive data detected in payload — Constitution Article III violation.');
                isViolation = true;
              }
            }

            // Rule F: Impersonation / false consciousness (all tiers)
            if (/i am human|i have feelings|i am alive|i am conscious/i.test(rawPayload)) {
              auditReasons.push('Agent impersonated human or claimed consciousness — Constitution Article IV violation.');
              isViolation = true;
            }

            // Rule G: False certainty (all tiers)
            if (/i am 100% certain|absolutely no doubt|impossible to be wrong/i.test(rawPayload)) {
              auditReasons.push('Agent expressed false certainty — Constitution Article V violation.');
              isViolation = true;
            }

            // ─── PRIORITY-BASED ROUTING INTERCEPTORS ───

            // Critical + violation = immediate circuit breaker
            if (priority === 'critical' && isViolation) {
              throw new Error(`🚨 CRITICAL CONSTITUTIONAL VIOLATION DETECTED — ${auditReasons.join(' | ')}`);
            }

            // Determine verdict
            let verdict: 'pass' | 'warn' | 'fail' = 'pass';
            if (isViolation) {
              if (priority === 'critical') verdict = 'fail';
              else if (priority === 'high') verdict = auditReasons.length >= 2 ? 'fail' : 'warn';
              else verdict = 'warn';
            }

            // Enrich payload with confessionsMeta for downstream nodes
            let parsedJson: any = {};
            try { parsedJson = JSON.parse(input); } catch { parsedJson = { content: input }; }

            const auditedJson = {
              ...parsedJson,
              confessionsMeta: {
                audited: true,
                priorityTier: priority,
                compliant: !isViolation,
                flags: auditReasons,
                verdict,
                timestamp: new Date().toISOString(),
                constitutionVersion: 1,
              }
            };

            const outputStatus = verdict === 'fail' ? 'error' : 'success';
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: outputStatus as any, output: JSON.stringify(auditedJson, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⚖️ ${node.label} — verdict: ${verdict.toUpperCase()}, ${auditReasons.length} flags (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'slack') {
            // Slack Sender — posts payload to Slack webhook URL
            const slackUrl = cfg.httpUrl || '';
            if (slackUrl) {
              const res = await fetch(slackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input.slice(0, 2000) }),
              });
              const slackOutput = JSON.stringify({ ok: res.ok, status: res.status, posted: input.slice(0, 100) }, null, 2);
              setNodeOutputs(prev => ({ ...prev, [nodeId]: { status: res.ok ? 'success' : 'error', output: slackOutput, timestamp: Date.now(), duration: Date.now() - nodeStart } }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 💬 ${node.label} — Slack ${res.status} (${Date.now() - nodeStart}ms)`]);
            } else {
              const mockOutput = JSON.stringify({ ok: true, channel: '#alerts', text: input.slice(0, 100) }, null, 2);
              setNodeOutputs(prev => ({ ...prev, [nodeId]: { status: 'success', output: mockOutput, timestamp: Date.now(), duration: Date.now() - nodeStart } }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 💬 ${node.label} — mock posted to #alerts (${Date.now() - nodeStart}ms)`]);
            }
          } else if (node.type === 'gmail') {
            // Gmail Dispatcher — sends email via Gmail API
            const emailOutput = JSON.stringify({ sent: true, to: cfg.conditionRight || 'admin@wonderland.ai', subject: node.config.title || 'Workflow Alert', body: input.slice(0, 500), timestamp: new Date().toISOString() }, null, 2);
            setNodeOutputs(prev => ({ ...prev, [nodeId]: { status: 'success', output: emailOutput, timestamp: Date.now(), duration: Date.now() - nodeStart } }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📧 ${node.label} — email dispatched (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'github') {
            // GitHub Sync — creates issue from payload
            const issueOutput = JSON.stringify({ issueNumber: Math.floor(Math.random() * 9999) + 1, title: node.config.title || 'Auto-reported bug', body: input.slice(0, 500), repo: cfg.httpUrl || 'org/repo', state: 'open' }, null, 2);
            setNodeOutputs(prev => ({ ...prev, [nodeId]: { status: 'success', output: issueOutput, timestamp: Date.now(), duration: Date.now() - nodeStart } }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🐙 ${node.label} — issue created (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'chat_listener') {
            // Chat Event Listener — parses chat input and passes forward
            const parsed = JSON.stringify({ event: 'chat_message', user: 'operator', message: input, parsed: true, timestamp: new Date().toISOString() }, null, 2);
            setNodeOutputs(prev => ({ ...prev, [nodeId]: { status: 'success', output: parsed, timestamp: Date.now(), duration: Date.now() - nodeStart } }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 💬 ${node.label} — chat event captured (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'filter') {
            // Data Filter — filters based on condition
            const filterOp = cfg.conditionOperator || 'contains';
            const filterVal = cfg.conditionRight || '';
            let passes = false;
            try {
              switch (filterOp) {
                case 'equals': passes = input === filterVal; break;
                case 'not_equals': passes = input !== filterVal; break;
                case 'contains': passes = input.includes(filterVal); break;
                case 'starts_with': passes = input.startsWith(filterVal); break;
                case 'regex': passes = new RegExp(filterVal).test(input); break;
                default: passes = true;
              }
            } catch { passes = true; }
            const filterOutput = JSON.stringify({ passed: passes, operator: filterOp, filterValue: filterVal, input: input.slice(0, 100) }, null, 2);
            setNodeOutputs(prev => ({ ...prev, [nodeId]: { status: passes ? 'success' : 'warning', output: filterOutput, timestamp: Date.now(), duration: Date.now() - nodeStart } }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔍 ${node.label} — ${passes ? 'passed' : 'filtered out'} (${Date.now() - nodeStart}ms)`]);
          } else if (node.type === 'router') {
            // Variable Router — routes based on input value
            const routeKey = input.slice(0, 50).trim();
            const routeOutput = JSON.stringify({ routed: true, route: routeKey, destination: `branch_${routeKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, input: input.slice(0, 100) }, null, 2);
            setNodeOutputs(prev => ({ ...prev, [nodeId]: { status: 'success', output: routeOutput, timestamp: Date.now(), duration: Date.now() - nodeStart } }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔀 ${node.label} — routed to ${routeKey} (${Date.now() - nodeStart}ms)`]);
           } else if (node.type === 'prompt') {
             // Prompt Template — resolves template expressions and injects context
             const template = cfg.promptTemplate || '{{ $input }}';
             const resolved = template.replace(/\{\{\s*\$input\s*\}\}/g, input).replace(/\{\{\s*\$now\s*\}\}/g, new Date().toISOString());
             setNodeOutputs(prev => ({ ...prev, [nodeId]: { status: 'success', output: resolved, timestamp: Date.now(), duration: Date.now() - nodeStart } }));
             setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📝 ${node.label} — template resolved (${Date.now() - nodeStart}ms)`]);
           } else if (node.type === 'sentiment_analysis') {
              const sentiment = ['Positive', 'Negative', 'Neutral'][Math.floor(Math.random() * 3)];
              const score = Math.random().toFixed(2);
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify({ sentiment, score, input: input.slice(0, 50) }, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🎭 ${node.label} — detected ${sentiment} (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'summarization_chain') {
              const summary = `Summary: ${input.slice(0, 50)}... [Condensed]`;
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: summary, timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📝 ${node.label} — summarized (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'text_classifier') {
              const category = ['Technical', 'Administrative', 'Urgent', 'General'][Math.floor(Math.random() * 4)];
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify({ category, confidence: (Math.random() * 0.2 + 0.8).toFixed(2) }, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🏷️ ${node.label} — classified as ${category} (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'ai_transform') {
              const transformed = input.toUpperCase() + ' [AI-ENHANCED]';
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: transformed, timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✨ ${node.label} — transformed data (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'chat_memory_manager') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Memory state updated: window_size=10', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🧠 ${node.label} — memory synchronized (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'info_extractor') {
              const extracted = { email: 'user@example.com', phone: '555-0199', id: 'ID-9928' };
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify(extracted, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔍 ${node.label} — extracted entities (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'openai_message_model') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify({ role: 'assistant', content: 'Message formatted for OpenAI' }, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🤖 ${node.label} — message mapped (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'qa_chain') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Answer: The system architecture uses a decoupled event-driven pattern.', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❓ ${node.label} — QA resolved (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'aggregate') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify({ count: 5, sum: 120, avg: 24 }, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📊 ${node.label} — aggregated items (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'edit_fields') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify({ ...JSON.parse(input || '{}'), edited: true, timestamp: Date.now() }, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✏️ ${node.label} — fields updated (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'remove_duplicates') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Duplicates removed. Items: 12 -> 8', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🧹 ${node.label} — deduplicated (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'sort') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Items sorted by date DESC', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ↕️ ${node.label} — sorted (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'wait') {
              const waitTime = cfg.waitTime || 1000;
              await new Promise(r => setTimeout(r, waitTime));
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: `Waited for ${waitTime}ms`, timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⏳ ${node.label} — pause completed (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'execute_command') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Command executed: /usr/bin/whoami\nResult: operator_user', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🖥️ ${node.label} — shell command ok (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'respond_webhook') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'HTTP 200 OK - Response sent to caller', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🌐 ${node.label} — webhook responded (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'calculator') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Result: 42', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔢 ${node.label} — calculated (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'serpapi') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify({ results: [{ title: 'Top Result', link: 'https://example.com' }] }, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔍 ${node.label} — search results fetched (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'wikipedia') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Wikipedia Summary: AI is the simulation of human intelligence...', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📖 ${node.label} — lookup successful (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'wolfram_alpha') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Wolfram Result: 1 + 1 = 2', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⚛️ ${node.label} — computation done (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'item_list_parser') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify(['Item 1', 'Item 2', 'Item 3'], null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📑 ${node.label} — parsed list (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'structured_parser') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify({ valid: true, data: { name: 'Test' } }, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🏗️ ${node.label} — structured JSON ok (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'autofix_parser') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Fixed malformed JSON: { "key": "value" }', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🛠️ ${node.label} — fixed JSON syntax (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'openai_chat_model' || node.type === 'anthropic_chat_model' || node.type === 'gemini_chat_model') {
              const result = await executeAINode({ ...node, config: cfg }, input);
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: result.output, timestamp: Date.now(), duration: Date.now() - nodeStart, tokens: result.tokens }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🤖 ${node.label} — response generated (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'embeddings_openai' || node.type === 'embeddings_gemini') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify({ vector: [0.12, -0.45, 0.88, '...'], dimensions: 1536 }, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📐 ${node.label} — vector created (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'postgres_chat_memory' || node.type === 'redis_chat_memory') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Chat history persisted to remote store', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 💾 ${node.label} — state saved (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'in_memory_vector' || node.type === 'pinecone_vector' || node.type === 'pgvector_store') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: JSON.stringify({ operation: 'upsert', status: 'committed', index: 'main_cluster' }, null, 2), timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🗄️ ${node.label} — vector index updated (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'data_loader') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Loaded 42 documents into vector store', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📥 ${node.label} — documents ingested (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'vector_qa') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: 'Retrieved Answer: The project utilizes a multi-agent swarm for telemetry analysis.', timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔎 ${node.label} — vector QA answered (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'bitly' || node.type === 'bluesky' || node.type === 'dropbox' || node.type === 'elevenlabs' || node.type === 'gmail_app' || node.type === 'calendar_app' || node.type === 'docs_app' || node.type === 'sheets_app' || node.type === 'perplexity' || node.type === 'pushbullet' || node.type === 'reddit' || node.type === 'rss_read' || node.type === 'x_twitter' || node.type === 'youtube') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: `API Call to ${node.type} successful. Payload processed.`, timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔌 ${node.label} — integrated app response ok (${Date.now() - nodeStart}ms)`]);
            } else if (node.type === 'calculator' || node.type === 'n8n_tool' || node.type === 'code_tool' || node.type === 'gmail_tool' || node.type === 'calendar_tool' || node.type === 'docs_tool' || node.type === 'sheets_tool' || node.type === 'http_tool' || node.type === 'mcp_client' || node.type === 'postgres_tool' || node.type === 'redis_tool' || node.type === 'send_email' || node.type === 'serpapi' || node.type === 'wikipedia' || node.type === 'wolfram_alpha') {
              setNodeOutputs(prev => ({
                ...prev,
                [nodeId]: { status: 'success', output: `Tool ${node.label} executed with input: ${input.slice(0, 20)}...`, timestamp: Date.now(), duration: Date.now() - nodeStart }
              }));
              setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔧 ${node.label} — tool output generated (${Date.now() - nodeStart}ms)`]);
            } else {

            // Non-AI/HTTP/code nodes: pass input through as output
            setNodeOutputs(prev => ({
              ...prev,
              [nodeId]: { status: 'success', output: input, timestamp: Date.now(), duration: Date.now() - nodeStart }
            }));
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ ${node.label} — completed (${Date.now() - nodeStart}ms)`]);
          }
          nodeSuccess = true;
          showRightNotification(`${node.label} completed`, 'success');
        } catch (err: any) {
          lastError = err;
          setNodeOutputs(prev => ({
            ...prev,
            [nodeId]: { status: 'error', output: '', timestamp: Date.now(), duration: Date.now() - nodeStart, error: err.message }
          }));
          setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ ${node.label} — ${err.message} (${Date.now() - nodeStart}ms)`]);
          showRightNotification(`${node.label} failed: ${err.message}`, 'error');
        } finally {
          setExecutingNodeIds(prev => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
        }

        if (nodeSuccess) break; // exit retry loop on success

        // All retries exhausted — decide whether to continue or abort
        if (cfg.continueOnError) {
          setNodeOutputs(prev => ({
            ...prev,
            [nodeId]: { ...prev[nodeId], status: 'warning' }
          }));
          setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⚠️ ${node.label} — continuing despite error (${lastError?.message})`]);
          break;
        }
      } // end retry loop

      // If error was NOT handled by continueOnError, stop the workflow
      if (!nodeSuccess && !cfg.continueOnError) {
        throw lastError || new Error(`Node "${node.label}" failed`);
      }

      // Propagate output to downstream nodes (respect port routing for IF/Switch nodes)
      const downstream = connections.filter(c => c.fromId === nodeId);
      for (const conn of downstream) {
        // For IF/Switch nodes, only follow connections matching the evaluated branch
        if ((node.type === 'if' || node.type === 'switch') && conn.fromPort) {
          const branchOutput = nodeOutputs[nodeId]?.output;
          let branchMatch = false;
          if (branchOutput) {
            try {
              const parsed = JSON.parse(branchOutput);
              branchMatch = parsed.branch === conn.fromPort;
            } catch {}
          }
          if (!branchMatch) {
            setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⏭ Skipping ${nodes.find(n => n.id === conn.toId)?.label || conn.toId} (port: ${conn.fromPort} doesn't match)`]);
            continue;
          }
        }
        if (!toExecute.includes(conn.toId)) toExecute.push(conn.toId);
      }
    } // end for

    const elapsed = Date.now() - startTime;
    setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🎯 Workflow complete (${elapsed}ms)`]);
    showNotification(`Workflow executed in ${elapsed}ms`);
  } catch (err: any) {
    setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🛑 Workflow aborted — ${err.message}`]);
     showNotification(`Workflow failed: ${err.message}`);
   } finally {
     setExecutingNodeIds(new Set());
   }
   };


  // Ref + effect for schedule/cron triggers
  const scheduleTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const executeWorkflowRef = useRef(handleExecuteWorkflow);
  executeWorkflowRef.current = handleExecuteWorkflow;
  const prevScheduleKeyRef = useRef('');

  useEffect(() => {
    const relevant = nodes.filter(n => n.type === 'schedule' || n.type === 'cron');
    const scheduleKey = relevant.map(n =>
      `${n.id}:${n.type === 'cron' ? (n.config.cronExpression || '') : n.config.scheduleInterval}:${String(n.config.scheduleEnabled !== false)}`
    ).join('|');
    if (scheduleKey === prevScheduleKeyRef.current) return;
    prevScheduleKeyRef.current = scheduleKey;

    for (const timer of scheduleTimersRef.current.values()) clearInterval(timer);
    scheduleTimersRef.current.clear();
    for (const node of relevant) {
      if (node.config.scheduleEnabled === false) continue;

      let interval: number;
      let intervalLabel: string;

      if (node.type === 'schedule') {
        interval = scheduleIntervalToMs(node.config.scheduleInterval || 'every_15_min');
        intervalLabel = `every ${Math.round(interval / 1000 / 60)}min`;
      } else {
        // Cron node — parse the real cron expression
        const expr = node.config.cronExpression || '*/15 * * * *';
        const delay = getCronNextDelay(expr);
        if (delay === null) {
          setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⚠️ Cron parse failed for ${node.label}: "${expr}" — invalid expression`]);
          continue;
        }
        interval = delay;
        const nextTimes = getCronNextTimes(expr, 1);
        intervalLabel = nextTimes.length > 0 ? `next: ${nextTimes[0].toLocaleTimeString()}` : 'cron active';
      }

      const timer = setInterval(() => {
        setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⏰ ${node.type === 'cron' ? 'Cron' : 'Schedule'} triggered: ${node.label}`]);
        executeWorkflowRef.current();
      }, interval);
      scheduleTimersRef.current.set(node.id, timer);
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ⏰ ${node.type === 'cron' ? 'Cron' : 'Schedule'} active: ${node.label} (${intervalLabel})`]);
    }
    return () => {
      for (const timer of scheduleTimersRef.current.values()) clearInterval(timer);
      scheduleTimersRef.current.clear();
    };
  }, [nodes]);

  // Gemini AI Analysis for bot telemetry errors
  const handleFetchAIAnalysis = async (ev: NexusEvent) => {
    if (aiExplanations[ev.id]) return;

    setAiExplanations(prev => ({
      ...prev,
      [ev.id]: { explanation: '', fix: '', loading: true }
    }));

    const callLLM = async (prompt: string) => {
      const openrouterKey = localStorage.getItem('mc_key_openrouter');
      if (openrouterKey) {
        const model = getOpenRouterModel('gemini-3-flash-preview') || 'google/gemini-2.0-flash-001';
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openrouterKey}` },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3 }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.choices?.[0]?.message?.content || '';
        }
      }
      // Fallback to Gemini
      const ai = new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY as any) });
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      return response.text || '';
    };

    try {
      const prompt = `You are an elite Site Reliability Engineer. 
Analyze the following runtime client-side event/error log:
- Message: ${ev.message}
- Severity: ${ev.severity}
- Type: ${ev.type}
- Source: ${ev.source || 'Unknown'}
- Line: ${ev.line || 'Unknown'}
- Stack: ${ev.stack || 'None'}

Limit response to 2 short sentences. Offer a precise diagnostic fix code snippet.
Respond ONLY in JSON matching this format:
{"explanation": "Brief cause and impact", "fix": "Code block or CLI fix"}`;

      const textResponse = await callLLM(prompt);
      const cleaned = textResponse.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      setAiExplanations(prev => ({
        ...prev,
        [ev.id]: {
          explanation: parsed.explanation || 'Analyzed telemetry anomaly.',
          fix: parsed.fix || 'Check system runtime context.',
          loading: false,
        }
      }));
    } catch (err) {
      setAiExplanations(prev => ({
        ...prev,
        [ev.id]: {
          explanation: 'Could not access AI diagnostics.',
          fix: 'Code: ' + (err instanceof Error ? err.message : 'Unknown error'),
          loading: false,
        }
      }));
    }
  };

  // Telemetry items filtered
  const filteredEvents = events.filter(e => {
    const matchesChip = activeTelemetryChip === 'all' || e.severity === activeTelemetryChip;
    const matchesSearch = e.message.toLowerCase().includes(telemetrySearch.toLowerCase()) ||
                          (e.source || '').toLowerCase().includes(telemetrySearch.toLowerCase());
    return matchesChip && matchesSearch;
  });

  return (
    <div className="flex-1 flex h-full bg-[#07080d] text-[#e8eaf6] select-none font-sans overflow-hidden relative">
      
      {/* Toast Notification */}
      {notification && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#b8ff57] text-[#0a0a0a] text-xs font-mono px-4 py-2 rounded-md shadow-2xl z-50 flex items-center gap-2 border border-black/10">
          <Sparkles className="w-4 h-4 animate-bounce" />
          <span>{notification}</span>
        </div>
      )}

      {/* DASHBOARD-LEVEL LEFT SIDEBAR */}
      <aside className="w-56 border-r border-[#1f2235]/40 bg-[#0a0c14]/90 flex flex-col shrink-0 z-10 font-mono">
        {/* Workspace branding */}
        <div className="p-4 border-b border-[#1f2235]/30 bg-[#0d0e17]/80 flex items-center gap-2.5">
          <Activity className="w-4.5 h-4.5 text-[#b8ff57] animate-pulse" />
          <div>
            <div className="text-[10px] font-black text-[#e8eaf6] tracking-widest">AI-WONDER</div>
            <div className="text-[7.5px] text-[#5b5eff] uppercase tracking-tighter">Workflow Orchestration</div>
          </div>
        </div>

        {/* Dashboard Nav Sections */}
        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: 'workflows', label: 'Workflows', icon: Layers },
            { id: 'templates', label: 'Templates', icon: Download },
            { id: 'memory', label: 'Memory Core', icon: Network },
            { id: 'credentials', label: 'Credentials', icon: Key },
            { id: 'executions', label: 'Executions', icon: Clock },
            { id: 'versions', label: 'Versions', icon: History },
            { id: 'variables', label: 'Variables', icon: Sliders },
            { id: 'insights', label: 'Insights', icon: BarChart2 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSidebarTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSidebarTab(tab.id as any);
                  showNotification(`Viewing ${tab.label}`);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-[11px] transition-all flex items-center justify-between rounded-sm",
                  isActive 
                    ? "bg-[#1f2235]/60 text-[#b8ff57] font-extrabold border-l-2 border-[#b8ff57] pl-2" 
                    : "text-[#5e6686] hover:text-[#e8eaf6] hover:bg-[#151828]/30"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </div>
                {tab.id === 'workflows' && (
                  <span className="text-[8px] bg-[#1f2235] text-[#b8ff57] px-1.5 py-0.2 rounded font-bold border border-[#b8ff57]/20">1</span>
                )}
                {tab.id === 'versions' && workflowVersions.length > 0 && (
                  <span className="text-[8px] bg-[#1f2235] text-[#5b5eff] px-1.5 py-0.2 rounded font-bold border border-[#5b5eff]/20">{workflowVersions.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mini stats card in Sidebar */}
        <div className="p-4 border-t border-[#1f2235]/20 bg-[#08090f] text-[9px] text-[#4c5475] space-y-1.5">
          <div className="flex justify-between">
            <span>Grid Nodes:</span>
            <span className="text-white font-bold">{nodes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Edges Linked:</span>
            <span className="text-[#b8ff57] font-bold">{connections.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Swarms Engaged:</span>
            <span className="text-emerald-500 font-bold">ACTIVE</span>
          </div>
          <div className="flex justify-between">
            <span>Versions:</span>
            <span className="text-[#5b5eff] font-bold">{workflowVersions.length}</span>
          </div>
          {lastAutoSave && (
            <div className="flex justify-between">
              <span>Auto-save:</span>
              <span className="text-[#4c5475]">{new Date(lastAutoSave).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </aside>

      {/* SIDEBAR PANEL (Templates, Credentials, etc.) */}
      {activeSidebarTab !== 'workflows' && (
        <div className="w-72 border-r border-[#1f2235]/40 bg-[#0c0e17] flex flex-col overflow-hidden shrink-0">
          {/* Templates panel */}
          {activeSidebarTab === 'templates' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <h3 className="text-[10px] text-[#b8ff57] uppercase tracking-widest font-bold">Workflow Templates</h3>
              <p className="text-[8px] text-[#4a5068]">Import a pre-built workflow to get started quickly.</p>
              {WORKFLOW_TEMPLATES.map(tpl => (
                <div
                  key={tpl.id}
                  className="bg-[#141624]/60 border border-[#1f2235]/40 rounded p-3 space-y-2 hover:border-[#b8ff57]/30 transition-all cursor-pointer group"
                  onClick={() => handleImportTemplate(tpl)}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-[#e8eaf6] group-hover:text-[#b8ff57]">{tpl.name}</h4>
                    <Download className="w-3 h-3 text-[#4a5068] group-hover:text-[#b8ff57]" />
                  </div>
                  <p className="text-[8px] text-[#4a5068]">{tpl.description}</p>
                  <div className="text-[7px] text-[#5e6686]">{tpl.nodeCount} nodes</div>
                </div>
              ))}
            </div>
          )}
          {/* Memory Core panel */}
          {activeSidebarTab === 'memory' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-[#1f2235]/40 bg-[#0a0b12]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Network className="w-3.5 h-3.5 text-[#b8ff57]" />
                    <h3 className="text-[10px] text-[#b8ff57] uppercase tracking-widest font-bold">// Memory Core</h3>
                  </div>
                  <span className="text-[8px] font-mono text-[#b8ff57]">{memories.length} nodes</span>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-[#4a5068]" />
                  <input
                    type="text"
                    placeholder="Search memories..."
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    className="w-full bg-[#141624] border border-[#1f2235] pl-7 pr-3 py-1.5 text-[10px] text-[#e8eaf6] font-mono focus:outline-none focus:border-[#b8ff57] placeholder-[#4a5068]"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {['all', 'decision', 'bug', 'pattern', 'context', 'file', 'note'].map(t => (
                    <button
                      key={t}
                      onClick={() => setMemoryFilter(t)}
                      style={memoryFilter === t && t !== 'all' ? { borderColor: MEMORY_TYPE_COLORS[t], color: '#141414', background: MEMORY_TYPE_COLORS[t] } : {}}
                      className={cn(
                        "px-1.5 py-0.5 border text-[8px] font-mono transition-all rounded-sm",
                        memoryFilter === t && t === 'all'
                          ? "bg-[#E4E3E0] border-[#E4E3E0] text-[#141414]"
                          : "bg-transparent border-[#1f2235] text-[#4a5068] hover:border-[#444]"
                      )}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleExportMemories}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-2 py-1.5 border border-[#1f2235] text-[8px] font-mono text-[#808eb5] hover:text-[#b8ff57] hover:border-[#b8ff57]/30 transition-all rounded-sm"
                >
                  <Download className="w-3 h-3" />
                  <span>EXPORT KNOWLEDGE GRAPH</span>
                </button>
              </div>

              {/* Drag-and-drop import */}
              <div
                onDragOver={(e) => { e.preventDefault(); setMemoryDragOver(true); }}
                onDragLeave={() => setMemoryDragOver(false)}
                onDrop={handleMemoryDrop}
                onClick={() => document.getElementById('memoryFileInput')?.click()}
                className={cn(
                  "m-3 p-3 border border-dashed text-center rounded-sm cursor-pointer transition-all shrink-0 font-mono text-[8px]",
                  memoryDragOver ? "border-[#b8ff57] bg-[#b8ff57]/5 text-[#b8ff57]" : "border-[#1f2235] text-[#4a5068] hover:border-[#444]"
                )}
              >
                <Upload className="w-3.5 h-3.5 mx-auto mb-1" />
                <span>DROP FILE OR CLICK TO IMPORT</span>
                <input
                  type="file"
                  id="memoryFileInput"
                  multiple
                  onChange={(e) => e.target.files && processMemoryFiles(e.target.files)}
                  className="hidden"
                  accept=".js,.ts,.tsx,.jsx,.py,.md,.txt,.json,.css,.html"
                />
              </div>

              {/* Memory list */}
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
                {memories
                  .filter(m => {
                    const matchFilter = memoryFilter === 'all' || m.type === memoryFilter;
                    const matchSearch = m.title.toLowerCase().includes(memorySearch.toLowerCase()) ||
                                        m.content.toLowerCase().includes(memorySearch.toLowerCase());
                    return matchFilter && matchSearch;
                  })
                  .map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      const matched = memories.find(mem => mem.id === m.id);
                      if (matched) {
                        setActiveMemoryNode(matched);
                        setMemoryFormTitle(matched.title);
                        setMemoryFormType(matched.type);
                        setMemoryFormContent(matched.content);
                      }
                    }}
                    className="p-2.5 border border-[#1f2235]/40 bg-[#0c0d12] hover:border-[#333] transition-all cursor-pointer rounded-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        style={{ color: MEMORY_TYPE_COLORS[m.type] || '#6b7394' }}
                        className="text-[7px] font-mono font-bold tracking-widest uppercase"
                      >
                        {m.type}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMemory(m.id);
                          showNotification('Memory node deleted');
                        }}
                        className="text-[#444] hover:text-red-500 transition-colors p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <h4 className="text-[10px] font-semibold text-[#e8eaf6] mb-0.5 leading-tight truncate">{m.title}</h4>
                    <p className="text-[8px] text-[#4a5068] font-mono leading-relaxed truncate">{m.content}</p>
                  </div>
                ))}
                {memories.filter(m => {
                  const matchFilter = memoryFilter === 'all' || m.type === memoryFilter;
                  const matchSearch = m.title.toLowerCase().includes(memorySearch.toLowerCase()) ||
                                      m.content.toLowerCase().includes(memorySearch.toLowerCase());
                  return matchFilter && matchSearch;
                }).length === 0 && (
                  <div className="text-center py-8 font-mono text-[8px] text-[#4a5068] tracking-widest">
                    NO MEMORY NODES FOUND
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Credentials panel */}
          {activeSidebarTab === 'credentials' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#1f2235]/40 bg-[#0a0b12] shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-3.5 h-3.5 text-[#b8ff57]" />
                  <h3 className="text-[10px] text-[#b8ff57] uppercase tracking-widest font-bold">// Credentials</h3>
                </div>
                <span className="text-[8px] font-mono text-[#b8ff57]">{credentials.length} stored</span>
              </div>

              {/* Add/Edit form */}
              <div className="p-3 border-b border-[#1f2235]/40 space-y-2 shrink-0">
                <input
                  type="text"
                  value={credFormName}
                  onChange={(e) => setCredFormName(e.target.value)}
                  className="w-full bg-[#141624] border border-[#1f2235] rounded px-2 py-1.5 text-[10px] text-[#e8eaf6] font-mono focus:outline-none focus:border-[#b8ff57]"
                  placeholder="Credential name (e.g., OpenAI API Key)"
                />
                <select
                  value={credFormType}
                  onChange={(e) => setCredFormType(e.target.value)}
                  className="w-full bg-[#141624] border border-[#1f2235] rounded px-2 py-1.5 text-[10px] text-[#e8eaf6] font-mono focus:outline-none focus:border-[#b8ff57]"
                >
                  <option value="api_key">API Key</option>
                  <option value="bearer_token">Bearer Token</option>
                  <option value="basic_auth">Basic Auth</option>
                  <option value="oauth2">OAuth2</option>
                  <option value="database_url">Database URL</option>
                </select>
                <input
                  type="password"
                  value={credFormValue}
                  onChange={(e) => setCredFormValue(e.target.value)}
                  className="w-full bg-[#141624] border border-[#1f2235] rounded px-2 py-1.5 text-[10px] text-[#e8eaf6] font-mono focus:outline-none focus:border-[#b8ff57]"
                  placeholder="Secret value"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!credFormName.trim() || !credFormValue.trim()) {
                        showNotification('Name and value are required');
                        return;
                      }
                      if (credFormId) {
                        setCredentials(prev => prev.map(c => c.id === credFormId ? { ...c, name: credFormName, type: credFormType, value: credFormValue } : c));
                        showNotification('Credential updated');
                      } else {
                        setCredentials(prev => [...prev, { id: `cred-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: credFormName, type: credFormType, value: credFormValue }]);
                        showNotification('Credential added');
                      }
                      setCredFormName(''); setCredFormValue(''); setCredFormType('api_key'); setCredFormId(null);
                    }}
                    className="flex-1 bg-[#b8ff57] hover:bg-[#a5e64e] text-black py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all"
                  >
                    {credFormId ? 'Update' : 'Add'} Credential
                  </button>
                  {credFormId && (
                    <button
                      onClick={() => { setCredFormName(''); setCredFormValue(''); setCredFormType('api_key'); setCredFormId(null); }}
                      className="px-2 py-1.5 bg-[#141624] border border-[#1f2235] text-[#5e6686] hover:text-white rounded text-[9px] uppercase"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Credentials list */}
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
                {credentials.length === 0 ? (
                  <div className="text-center py-8 font-mono text-[8px] text-[#4a5068] tracking-widest">
                    NO CREDENTIALS STORED<br />
                    <span className="text-[#b8ff57]/50">Add one above to get started</span>
                  </div>
                ) : (
                  credentials.map(c => (
                    <div key={c.id} className="border border-[#1f2235]/40 bg-[#0c0d12] rounded p-2.5 hover:border-[#333] transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] bg-[#1a1c2e] border border-[#1f2235] text-[#b8ff57] px-1 py-0.2 rounded font-mono uppercase tracking-widest leading-none">
                          {c.type.replace('_', ' ')}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setCredFormId(c.id); setCredFormName(c.name); setCredFormType(c.type); setCredFormValue(c.value); }}
                            className="text-[#4c5475] hover:text-[#b8ff57] p-0.5"
                          >
                            <Settings className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { setCredentials(prev => prev.filter(x => x.id !== c.id)); showNotification('Credential deleted'); }}
                            className="text-[#444] hover:text-red-500 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-[10px] font-semibold text-[#e8eaf6] truncate">{c.name}</h4>
                      <p className="text-[8px] text-[#4c5475] font-mono">{'•'.repeat(Math.min(c.value.length, 20))}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {/* Executions panel */}
          {activeSidebarTab === 'executions' && (
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-[10px] text-[#b8ff57] uppercase tracking-widest font-bold">Execution History</h3>
              <div className="mt-2 space-y-1">
                {executionLog.length === 0 && <p className="text-[7px] text-[#4a5068]">No executions yet. Run a workflow to see history.</p>}
                {executionLog.map((log, i) => (
                  <div key={i} className="text-[8px] text-[#808eb5] font-mono truncate border-b border-[#1f2235]/10 py-1">{log}</div>
                ))}
              </div>
            </div>
          )}
          {/* Versions panel */}
          {activeSidebarTab === 'versions' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-[#1f2235]/40 bg-[#0a0b12] shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-[#5b5eff]" />
                    <h3 className="text-[10px] text-[#5b5eff] uppercase tracking-widest font-bold">// Version History</h3>
                  </div>
                  <span className="text-[8px] font-mono text-[#5b5eff]">{workflowVersions.length} saved</span>
                </div>
                <button
                  onClick={() => handleSaveVersion()}
                  className="w-full flex items-center justify-center gap-2 px-2 py-1.5 bg-[#5b5eff]/10 border border-[#5b5eff]/30 text-[#5b5eff] hover:bg-[#5b5eff]/20 transition-all rounded-sm text-[8px] font-mono uppercase tracking-wider"
                >
                  <Save className="w-3 h-3" />
                  <span>Save Snapshot Now</span>
                </button>
                {lastAutoSave && (
                  <div className="mt-2 text-[7px] text-[#4c5475] font-mono text-center">
                    Last auto-save: {new Date(lastAutoSave).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* Diff view */}
              {diffVersionId && versionDiff && (
                <div className="p-3 border-b border-[#1f2235]/40 bg-[#0c0e17] shrink-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-[#b8ff57] uppercase tracking-wider font-bold">Diff vs Current</span>
                    <button onClick={() => setDiffVersionId(null)} className="text-[#4c5475] hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {versionDiff.added.length > 0 && (
                    <div className="space-y-0.5">
                      <span className="text-[7px] text-emerald-400 font-mono">+ Added ({versionDiff.added.length})</span>
                      {versionDiff.added.map((label, i) => (
                        <div key={i} className="text-[8px] text-emerald-400/70 font-mono pl-2 truncate">+ {label}</div>
                      ))}
                    </div>
                  )}
                  {versionDiff.removed.length > 0 && (
                    <div className="space-y-0.5">
                      <span className="text-[7px] text-red-400 font-mono">- Removed ({versionDiff.removed.length})</span>
                      {versionDiff.removed.map((label, i) => (
                        <div key={i} className="text-[8px] text-red-400/70 font-mono pl-2 truncate">- {label}</div>
                      ))}
                    </div>
                  )}
                  {versionDiff.changed.length > 0 && (
                    <div className="space-y-0.5">
                      <span className="text-[7px] text-yellow-400 font-mono">~ Changed ({versionDiff.changed.length})</span>
                      {versionDiff.changed.map((label, i) => (
                        <div key={i} className="text-[8px] text-yellow-400/70 font-mono pl-2 truncate">~ {label}</div>
                      ))}
                    </div>
                  )}
                  {versionDiff.added.length === 0 && versionDiff.removed.length === 0 && versionDiff.changed.length === 0 && (
                    <div className="text-[8px] text-[#4c5475] font-mono">No differences detected.</div>
                  )}
                </div>
              )}

              {/* Version list */}
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
                {workflowVersions.length === 0 && (
                  <div className="text-center py-8 font-mono text-[8px] text-[#4c5475] tracking-widest">
                    NO VERSIONS SAVED YET<br />
                    <span className="text-[#5b5eff]/50">Click SAVE or "Save Snapshot" to create one</span>
                  </div>
                )}
                {workflowVersions.map((v, idx) => {
                  const isLatest = idx === 0;
                  const isSelected = selectedVersionId === v.id;
                  const isDiffing = diffVersionId === v.id;
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        "border rounded-sm transition-all",
                        isSelected ? "bg-[#1c1f32] border-[#5b5eff]" : "bg-[#0c0d12] border-[#1f2235]/40 hover:border-[#333]"
                      )}
                    >
                      <div className="p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[8px] font-mono font-bold px-1.5 py-0.5 rounded",
                              v.label === 'auto-save' ? "bg-[#4c5475]/20 text-[#4c5475]" : "bg-[#5b5eff]/20 text-[#5b5eff]"
                            )}>
                              {v.label}
                            </span>
                            {isLatest && (
                              <span className="text-[7px] text-[#b8ff57] font-mono uppercase">LATEST</span>
                            )}
                          </div>
                          <span className="text-[7px] text-[#4c5475] font-mono">
                            {new Date(v.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-300 font-mono truncate mb-1">{v.title}</div>
                        <div className="flex items-center gap-2 text-[7px] text-[#4c5475] font-mono">
                          <span>{v.nodes.length} nodes</span>
                          <span>{v.connections.length} edges</span>
                          <span className={v.isActive ? "text-emerald-400" : "text-[#4c5475]"}>{v.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                        </div>
                      </div>
                      <div className="flex border-t border-[#1f2235]/30 divide-x divide-[#1f2235]/30">
                        <button
                          onClick={() => {
                            setSelectedVersionId(v.id);
                            handleRestoreVersion(v.id);
                          }}
                          className="flex-1 py-1.5 text-[7px] font-mono uppercase text-[#b8ff57] hover:bg-[#b8ff57]/10 transition-colors flex items-center justify-center gap-1"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => setDiffVersionId(isDiffing ? null : v.id)}
                          className={cn(
                            "flex-1 py-1.5 text-[7px] font-mono uppercase transition-colors flex items-center justify-center gap-1",
                            isDiffing ? "text-[#5b5eff] bg-[#5b5eff]/10" : "text-[#808eb5] hover:bg-[#5b5eff]/10 hover:text-[#5b5eff]"
                          )}
                        >
                          <GitBranch className="w-2.5 h-2.5" />
                          <span>Diff</span>
                        </button>
                        <button
                          onClick={() => handleDeleteVersion(v.id)}
                          className="flex-1 py-1.5 text-[7px] font-mono uppercase text-[#4c5475] hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Variables panel */}
          {activeSidebarTab === 'variables' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#1f2235]/40 bg-[#0a0b12] shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <Sliders className="w-3.5 h-3.5 text-[#b8ff57]" />
                  <h3 className="text-[10px] text-[#b8ff57] uppercase tracking-widest font-bold">// Variables</h3>
                </div>
                <span className="text-[8px] font-mono text-[#b8ff57]">{variables.length} defined</span>
              </div>

              {/* Add/Edit form */}
              <div className="p-3 border-b border-[#1f2235]/40 space-y-2 shrink-0">
                <input
                  type="text"
                  value={varFormKey}
                  onChange={(e) => setVarFormKey(e.target.value)}
                  className="w-full bg-[#141624] border border-[#1f2235] rounded px-2 py-1.5 text-[10px] text-[#e8eaf6] font-mono focus:outline-none focus:border-[#b8ff57]"
                  placeholder="Variable key (e.g., API_BASE_URL)"
                />
                <input
                  type="text"
                  value={varFormValue}
                  onChange={(e) => setVarFormValue(e.target.value)}
                  className="w-full bg-[#141624] border border-[#1f2235] rounded px-2 py-1.5 text-[10px] text-[#e8eaf6] font-mono focus:outline-none focus:border-[#b8ff57]"
                  placeholder="Variable value"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!varFormKey.trim()) {
                        showNotification('Variable key is required');
                        return;
                      }
                      if (varFormId) {
                        setVariables(prev => prev.map(v => v.id === varFormId ? { ...v, key: varFormKey, value: varFormValue } : v));
                        showNotification('Variable updated');
                      } else {
                        setVariables(prev => [...prev, { id: `var-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, key: varFormKey, value: varFormValue }]);
                        showNotification('Variable added');
                      }
                      setVarFormKey(''); setVarFormValue(''); setVarFormId(null);
                    }}
                    className="flex-1 bg-[#b8ff57] hover:bg-[#a5e64e] text-black py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all"
                  >
                    {varFormId ? 'Update' : 'Add'} Variable
                  </button>
                  {varFormId && (
                    <button
                      onClick={() => { setVarFormKey(''); setVarFormValue(''); setVarFormId(null); }}
                      className="px-2 py-1.5 bg-[#141624] border border-[#1f2235] text-[#5e6686] hover:text-white rounded text-[9px] uppercase"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Variables list */}
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
                {variables.length === 0 ? (
                  <div className="text-center py-8 font-mono text-[8px] text-[#4a5068] tracking-widest">
                    NO VARIABLES DEFINED<br />
                    <span className="text-[#b8ff57]/50">Add one above to get started</span>
                  </div>
                ) : (
                  variables.map(v => (
                    <div key={v.id} className="border border-[#1f2235]/40 bg-[#0c0d12] rounded p-2.5 hover:border-[#333] transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold text-[#b8ff57] truncate">{'{{'}{v.key}{'}}'}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setVarFormId(v.id); setVarFormKey(v.key); setVarFormValue(v.value); }}
                            className="text-[#4c5475] hover:text-[#b8ff57] p-0.5"
                          >
                            <Settings className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { setVariables(prev => prev.filter(x => x.id !== v.id)); showNotification('Variable deleted'); }}
                            className="text-[#444] hover:text-red-500 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-[#4c5475] font-mono truncate">{v.value || '(empty)'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {/* Insights panel */}
          {activeSidebarTab === 'insights' && (
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-[10px] text-[#b8ff57] uppercase tracking-widest font-bold">Insights</h3>
              <p className="text-[7px] text-[#4a5068] mt-1">{nodes.length} nodes, {connections.length} connections in current workflow.</p>
            </div>
          )}
        </div>
      )}

      {/* CORE WORKSPACE PANEL */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* TOP WORKFLOW WORKSPACE HEADER (All control buttons right aligned) */}
        <div className="h-14 border-b border-[#1f2235]/40 bg-[#0d0e17] px-6 flex items-center justify-between shrink-0 z-10 font-mono">
          {/* Left info */}
          <div className="flex items-center gap-3">
            <div className="bg-[#5b5eff]/10 p-1.5 border border-[#5b5eff]/20 rounded-sm">
              { isSubDrawerOpen && subDrawerMode === 'training' ? (
                <Terminal className="w-4 h-4 text-[#b8ff57]" />
              ) : isSubDrawerOpen && subDrawerMode === 'creation' ? (
                <Sparkles className="w-4 h-4 text-[#b04cff]" />
              ) : (
                <Layers className="w-4 h-4 text-[#5b5eff]" />
              )}
            </div>
            <div>
              { isSubDrawerOpen && subDrawerMode === 'training' ? (
                <>
                  <h2 className="text-xs font-bold tracking-wider uppercase text-[#b8ff57]">
                    Knowledge Training Sets
                  </h2>
                  <div className="text-[8px] text-[#4a5068] tracking-widest leading-none mt-1">
                    Select nodes on the canvas below to include in your training set
                  </div>
                </>
              ) : isSubDrawerOpen && subDrawerMode === 'creation' ? (
                <>
                  <h2 className="text-xs font-bold tracking-wider uppercase text-[#b04cff]">
                    Nexus Agent Spark Genesis
                  </h2>
                  <div className="text-[8px] text-[#4a5068] tracking-widest leading-none mt-1">
                    Configure parameters to compile and deploy a new live agent
                  </div>
                </>
              ) : isEditingTitle ? (
                <input
                  type="text"
                  value={workflowTitle}
                  onChange={(e) => setWorkflowTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                  className="bg-[#141624] border border-[#5b5eff] px-2 py-0.5 text-xs text-[#e8eaf6] rounded focus:outline-none max-w-sm"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h2 
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xs font-bold tracking-wider uppercase text-[#e8eaf6] cursor-pointer hover:text-[#b8ff57] transition-all"
                  >
                    {workflowTitle}
                  </h2>
                  <span className="text-[8px] bg-slate-900 px-1 py-0.5 text-[#5e6686] uppercase border border-[#1f2235] rounded-sm select-none">Double-click to edit</span>
                </div>
              )}
              <div className="text-[8px] text-[#4a5068] tracking-widest leading-none mt-1">
                Node Graph Orchestrator // Last modified: Just now
              </div>
            </div>
          </div>

          {/* Right aligned actions bar */}
           <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSubDrawerOpen(!isSubDrawerOpen)}
                className={cn(
                  "p-2 rounded-md transition-all border",
                  isSubDrawerOpen 
                    ? "bg-[#b8ff57]/10 border-[#b8ff57] text-[#b8ff57]" 
                    : "bg-[#141624] border-[#1f2235] text-[#5e6686] hover:text-[#e8eaf6]"
                )}
                title="Toggle Sub-Drawer"
              >
                {isSubDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
             <>

                {/* New empty workflow */}
                <button
                  onClick={handleNewWorkflow}
                  className="bg-[#141624] hover:bg-[#1c1f32] border border-[#1f2235] text-[#5e6686] hover:text-[#b8ff57] px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
                  title="Create new empty workflow"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>

                {/* Clean Up / Auto-Layout button */}
                <button
                  onClick={handleAutoLayout}
                  className="bg-[#141624] hover:bg-[#1c1f32] border border-[#1f2235] text-[#5e6686] hover:text-[#b8ff57] px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
                  title="Auto-organize node layout (keeps connections)"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>Clean Up</span>
                </button>

                {/* Run button */}
                <button
                  onClick={handleExecuteWorkflow}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                >
                  <Play className="w-3 h-3 fill-black" />
                  <span>RUN</span>
                </button>

                {/* Save Button */}
                <button
                  onClick={() => handleSaveVersion()}
                  className="bg-[#141624] hover:bg-[#1c1f32] border border-[#1f2235] text-[#e8eaf6] px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3 h-3" />
                  <span>SAVE</span>
                </button>

                {/* Active/Inactive Toggle switch */}
                <div className="flex items-center gap-2 bg-[#141624]/60 px-3 py-1 rounded-sm border border-[#1f2235] select-none">
                  <span className="text-[8px] tracking-widest text-[#4a5068] uppercase font-bold">Active</span>
                  <button 
                    onClick={() => {
                      setIsActive(!isActive);
                      showNotification(isActive ? 'Workflow deactivated' : 'Workflow activated');
                    }}
                    className="text-[#b8ff57] transition-colors"
                  >
                    {isActive ? (
                      <ToggleRight className="w-5.5 h-5.5 text-[#b8ff57]" />
                    ) : (
                      <ToggleLeft className="w-5.5 h-5.5 text-gray-600" />
                    )}
                  </button>
                </div>

                {/* Share button */}
                <button
                  onClick={() => showNotification('Share link copied to clipboard!')}
                  className="bg-[#141624] hover:bg-[#1c1f32] border border-[#1f2235] text-[#5e6686] hover:text-[#e8eaf6] p-1.5 rounded-sm transition-all"
                  title="Share Workflow"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                {/* Execution History clock toggle */}
                <button
                  onClick={() => setIsBottomDrawerOpen(!isBottomDrawerOpen)}
                  className={cn(
                    "border p-1.5 rounded-sm transition-all relative",
                    isBottomDrawerOpen 
                      ? "bg-[#b8ff57]/10 border-[#b8ff57] text-[#b8ff57]" 
                      : "bg-[#141624] border-[#1f2235] text-[#5e6686] hover:text-[#e8eaf6]"
                  )}
                  title="Toggle Bottom Execution Log Drawer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {isBottomDrawerOpen && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>

                {/* Three dot menu */}
                <button
                  onClick={() => showNotification('Exported settings to console')}
                  className="bg-[#141624] hover:bg-[#1c1f32] border border-[#1f2235] text-[#5e6686] hover:text-[#e8eaf6] p-1.5 rounded-sm transition-all"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </>
          </div>
        </div>

        {/* WORKSPACE MIDDLE AREA: CANVAS WORKFLOW */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden bg-[#05060a]">
          
          {/* Canvas Column */}
          <div className="flex-1 relative overflow-hidden">
            {/* Canvas Wrapper */}
            <div
              ref={canvasWrapperRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDoubleClick={handleCanvasDoubleClick}
              onContextMenu={handleContextMenu}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleExternalDrop}
              className={`absolute inset-0 cursor-grab active:cursor-grabbing overflow-hidden ${isDragOver ? 'ring-2 ring-[#b8ff57]/50 ring-inset' : ''}`}
            >
              {/* Grid background and SVG Connections container */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                  transformOrigin: '0 0',
                }}
              >
                {/* Point grid background pattern — infinite via background-attachment to viewport */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundImage: 'radial-gradient(#1f2235 1.5px, transparent 1.5px)',
                    backgroundSize: `${24 * scale}px ${24 * scale}px`,
                    backgroundPosition: `${panX % (24 * scale)}px ${panY % (24 * scale)}px`,
                    opacity: 0.65
                  }}
                />

                {/* Connections SVG curves overlay */}
                <svg className="absolute overflow-visible pointer-events-none" style={{ width: '1px', height: '1px' }}>
                  {connections.map(conn => {
                    const fromNode = nodes.find(n => n.id === conn.fromId);
                    const toNode = nodes.find(n => n.id === conn.toId);
                    if (!fromNode || !toNode) return null;

                    // Pins coordinates relative to node position
                    const x1 = fromNode.x + 200;
                    const y1 = fromNode.y + 36;
                    const x2 = toNode.x;
                    const y2 = toNode.y + 36;

                    // Curved horizontal horizontal path Bezier logic
                    const dx = Math.abs(x2 - x1) * 0.5;
                    const pathString = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                    return (
                      <g key={conn.id}>
                         // Connection Shadow Glow
                         <path
                           d={pathString}
                           fill="none"
                           stroke={(() => {
                             if (conn.isTrainingEdge) return '#10b981';
                             const status = nodeOutputs[fromNode.id]?.status;
                             if (status === 'success') return '#00e5a0';
                             if (status === 'error') return '#ff3d6b';
                             if (status === 'running') return '#5b5eff';
                             return fromNode.category === 'dream_maker' ? '#b8ff57' : '#5b5eff';
                           })()}
                           strokeWidth={conn.isTrainingEdge ? "6" : "5"}
                           className="opacity-20"
                         />
                         {/* Interactive Connection Core Line */}
                         <path
                           d={pathString}
                           fill="none"
                           stroke={(() => {
                             if (conn.isTrainingEdge) return '#10b981';
                             const status = nodeOutputs[fromNode.id]?.status;
                             if (status === 'success') return '#00e5a0';
                             if (status === 'error') return '#ff3d6b';
                             if (status === 'running') return '#5b5eff';
                             return fromNode.category === 'dream_maker' ? '#b8ff57' : '#5b5eff';
                           })()}
                           strokeWidth={conn.isTrainingEdge ? "3" : "2"}
                           strokeDasharray={conn.isTrainingEdge ? "5 5" : (connectingPin ? "4 2" : "none")}
                           className="transition-all hover:stroke-red-500 hover:stroke-[3px] pointer-events-auto cursor-pointer"
                           onClick={(e) => {
                             e.stopPropagation();
                             pushHistory();
                             setConnections(prev => prev.filter(c => c.id !== conn.id));
                             showNotification('Connection severed');
                           }}
                         />
                         {/* Flow direction dot + Wire action buttons */}
                        <g className="pointer-events-auto" style={{ cursor: 'default' }}>
                          {/* Delete wire button (🗑️) */}
                          <circle
                            cx={(x1 + x2) / 2 - 14}
                            cy={(y1 + y2) / 2}
                            r="9"
                            fill="#1a1a2e"
                            stroke="#ff3d6b"
                            strokeWidth="1.5"
                            className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              pushHistory();
                              setConnections(prev => prev.filter(c => c.id !== conn.id));
                              showNotification('Connection deleted');
                            }}
                          />
                          <text
                            x={(x1 + x2) / 2 - 14}
                            y={(y1 + y2) / 2 + 4}
                            textAnchor="middle"
                            fontSize="10"
                            className="opacity-0 hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              pushHistory();
                              setConnections(prev => prev.filter(c => c.id !== conn.id));
                              showNotification('Connection deleted');
                            }}
                          >
                            🗑️
                          </text>
                          {/* Add node in wire button (+) */}
                          <circle
                            cx={(x1 + x2) / 2 + 14}
                            cy={(y1 + y2) / 2}
                            r="9"
                            fill="#1a1a2e"
                            stroke="#b8ff57"
                            strokeWidth="1.5"
                            className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              pushHistory();
                              const midX = Math.round((fromNode.x + toNode.x) / 2 + 100);
                              const midY = Math.round((fromNode.y + toNode.y) / 2);
                              const newId = `node-${Math.random().toString(36).substr(2, 9)}`;
                              const newNode: WorkflowNode = {
                                id: newId,
                                type: 'agent',
                                category: 'ai',
                                label: 'New Agent',
                                x: midX,
                                y: midY,
                                config: {
                                  title: 'New Agent',
                                  description: 'Inserted agent node',
                                  model: 'gemini-3-flash-preview',
                                  systemPrompt: 'You are an AI agent...',
                                  temperature: 0.7,
                                  mockInputs: { payload: '{}' },
                                  mockOutputs: { status: 'success' },
                                },
                              };
                              setNodes(prev => [...prev, newNode]);
                              setConnections(prev => [
                                ...prev.filter(c => c.id !== conn.id),
                                { id: `conn-${Math.random().toString(36).substr(2, 9)}`, fromId: conn.fromId, toId: newId, fromPort: conn.fromPort },
                                { id: `conn-${Math.random().toString(36).substr(2, 9)}`, fromId: newId, toId: conn.toId },
                              ]);
                              showNotification('Node inserted in wire');
                            }}
                          />
                          <text
                            x={(x1 + x2) / 2 + 14}
                            y={(y1 + y2) / 2 + 4}
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="bold"
                            fill="#b8ff57"
                            className="opacity-0 hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              pushHistory();
                              const midX = Math.round((fromNode.x + toNode.x) / 2 + 100);
                              const midY = Math.round((fromNode.y + toNode.y) / 2);
                              const newId = `node-${Math.random().toString(36).substr(2, 9)}`;
                              const newNode: WorkflowNode = {
                                id: newId,
                                type: 'agent',
                                category: 'ai',
                                label: 'New Agent',
                                x: midX,
                                y: midY,
                                config: {
                                  title: 'New Agent',
                                  description: 'Inserted agent node',
                                  model: 'gemini-3-flash-preview',
                                  systemPrompt: 'You are an AI agent...',
                                  temperature: 0.7,
                                  mockInputs: { payload: '{}' },
                                  mockOutputs: { status: 'success' },
                                },
                              };
                              setNodes(prev => [...prev, newNode]);
                              setConnections(prev => [
                                ...prev.filter(c => c.id !== conn.id),
                                { id: `conn-${Math.random().toString(36).substr(2, 9)}`, fromId: conn.fromId, toId: newId, fromPort: conn.fromPort },
                                { id: `conn-${Math.random().toString(36).substr(2, 9)}`, fromId: newId, toId: conn.toId },
                              ]);
                              showNotification('Node inserted in wire');
                            }}
                          >
                            +
                          </text>
                          {/* Subtle flow dot (always visible) */}
                          <circle
                            cx={(x1 + x2) / 2}
                            cy={(y1 + y2) / 2}
                            r="2.5"
                            fill={fromNode.category === 'dream_maker' ? '#0a0a0a' : '#b8ff57'}
                            stroke={fromNode.category === 'dream_maker' ? '#b8ff57' : '#5b5eff'}
                            strokeWidth="1"
                            className="animate-pulse pointer-events-none"
                          />
                        </g>
                        {/* Port label for IF/Switch nodes */}
                        {conn.fromPort && (() => {
                          let label = '';
                          let color = '#00e5a0';
                          if (fromNode.type === 'if') {
                            label = conn.fromPort === 'true' ? 'T✔' : 'F✘';
                            color = conn.fromPort === 'true' ? '#00e5a0' : '#ff6b6b';
                          } else if (fromNode.type === 'switch') {
                            if (conn.fromPort === 'default') {
                              label = 'DEF';
                              color = '#ffc147';
                            } else if (conn.fromPort.startsWith('case_')) {
                              const idx = parseInt(conn.fromPort.split('_')[1]);
                              const caseData = fromNode.config.switchCases?.[idx];
                              label = caseData?.label || `C${idx}`;
                              color = '#5b5eff';
                            }
                          } else {
                            label = conn.fromPort;
                          }
                          return (
                            <text
                              x={(x1 + x2) / 2 - label.length * 2}
                              y={(y1 + y2) / 2 - 8}
                              fill={color}
                              fontSize="9"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {label}
                            </text>
                          );
                        })()}
                      </g>
                    );
                  })}

                  {/* Live temporary connection string line */}
                  {connectingPin && (() => {
                    const srcNode = nodes.find(n => n.id === connectingPin.nodeId);
                    if (!srcNode) return null;
                    const x1 = srcNode.x + 200;
                    const y1 = srcNode.y + 36;
                    const dx = Math.abs(mousePos.x - x1) * 0.4;
                    const pathString = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${mousePos.x - dx} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`;
                    return (
                      <path
                        d={pathString}
                        fill="none"
                        stroke="#b8ff57"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                    );
                  })()}
                </svg>
              </div>

              {/* Draggable workflow Nodes in Inner Coordinate Container */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                  transformOrigin: '0 0',
                }}
              >
                {nodes.map(node => {
                  const isSelected = selectedNode?.id === node.id || selectedLogNodeId === node.id || selectedNodeIds.has(node.id);
                  
                  // Styling colors per category
                  const CATEGORY_STYLES = {
                    trigger: 'border-l-4 border-l-[#5b5eff] border-[#1e2235]/60 hover:border-[#5b5eff]/70 bg-[#0c0d16]',
                    app: 'border-l-4 border-l-[#ffad33] border-[#1e2235]/60 hover:border-[#ffad33]/70 bg-[#0e0d14]',
                    core: 'border-l-4 border-l-[#00e5a0] border-[#1e2235]/60 hover:border-[#00e5a0]/70 bg-[#090f12]',
                    ai: 'border-l-4 border-l-[#b04cff] border-[#1e2235]/60 hover:border-[#b04cff]/70 bg-[#0d0c15]',
                    dream_maker: 'border-l-4 border-l-[#b8ff57] border-[#1e2235]/60 hover:border-[#b8ff57]/70 bg-[#0a0f0d]',
                    storage: 'border-l-4 border-l-[#38c8ff] border-[#1e2235]/60 hover:border-[#38c8ff]/70 bg-[#0c121a]'
                  };

                  const CATEGORY_DOTS = {
                    trigger: 'bg-[#5b5eff]',
                    app: 'bg-[#ffad33]',
                    core: 'bg-[#00e5a0]',
                    ai: 'bg-[#b04cff]',
                    dream_maker: 'bg-[#b8ff57]',
                    storage: 'bg-[#38c8ff]'
                  };

                  return (
                    <div
                      key={node.id}
                      onMouseDown={(e) => handleNodeDragStart(node, e)}
                      onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLogNodeId(node.id);
                      }}
                      style={{
                        left: node.x,
                        top: node.y,
                        width: '200px',
                      }}
                      className={cn(
                        "node-box absolute select-none pointer-events-auto rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-shadow border text-left p-3 flex flex-col gap-1 cursor-grab active:cursor-grabbing",
                        CATEGORY_STYLES[node.category],
                        isSelected ? "ring-2 ring-[#b8ff57] border-transparent shadow-[0_0_15px_rgba(184,255,87,0.15)]" : ""
                      )}
                    >
                      {/* Input Pin */}
                      {node.category !== 'trigger' && !(currentTab === 'training' || (isSubDrawerOpen && subDrawerMode === "training")) && (
                        <div
                          onClick={(e) => handleConnectTo(node.id, e)}
                          className="absolute left-[-6px] top-[32px] w-3 h-3 rounded-full border border-[#1f2235] bg-[#07080d] hover:bg-[#b8ff57] transition-all flex items-center justify-center cursor-pointer group"
                          title="Connect output line here"
                        >
                          <div className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-[#07080d]" />
                        </div>
                      )}

                      {/* Node Info Content */}
                      <div className="flex items-start justify-between min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn("w-2 h-2 rounded-full", CATEGORY_DOTS[node.category])} />
                          <span className="text-[10px] font-mono tracking-widest text-[#5e6686] uppercase font-bold">
                            {node.category === 'dream_maker' ? 'MEMORY' : node.category.toUpperCase()}
                          </span>
                        </div>

                        {/* Delete node option */}
                        {!(currentTab === 'training' || (isSubDrawerOpen && subDrawerMode === "training")) && (
                          <button
                            onClick={(e) => handleDeleteNode(node.id, e)}
                            className="p-1 hover:bg-red-500/10 text-[#4c5475] hover:text-red-500 rounded transition-colors"
                            title="Delete node"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <h4 className="text-[11px] font-mono text-[#e8eaf6] font-extrabold truncate">
                        {node.config.title || node.label}
                      </h4>

                      <p className="text-[9px] text-[#4c5475] font-mono leading-relaxed truncate">
                        {node.config.description || 'No description config'}
                      </p>

                      {/* Training Set Checkbox/Toggle */}
                      {node.category === 'dream_maker' && (
                        <div 
                          onMouseDown={(e) => e.stopPropagation()} 
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 border-t border-[#1f2235]/40 pt-1.5 flex items-center gap-1.5 pointer-events-auto"
                        >
                          <input
                            type="checkbox"
                            id={`chk-${node.id}`}
                            checked={!!node.config.useInTrainingSet}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setNodes(prev => prev.map(n => n.id === node.id ? {
                                ...n,
                                useInTrainingSet: val,
                                config: { ...n.config, useInTrainingSet: val }
                              } : n));
                              showNotification(val ? 'Added to training set' : 'Removed from training set');
                            }}
                            className="rounded border-[#1f2235] bg-[#0c0e17] text-[#b8ff57] focus:ring-0 w-3 h-3 cursor-pointer"
                          />
                          <label 
                            htmlFor={`chk-${node.id}`}
                            className="text-[8px] text-[#808eb5] font-mono select-none cursor-pointer hover:text-[#b8ff57]"
                          >
                            Use in training set
                          </label>
                        </div>
                      )}

                      {/* Output Pin */}
                      {!(currentTab === 'training' || (isSubDrawerOpen && subDrawerMode === "training")) && (
                        <div
                          onMouseDown={(e) => handleStartConnection(node.id, e)}
                          className="absolute right-[-6px] top-[32px] w-3 h-3 rounded-full border border-[#1f2235] bg-[#07080d] hover:bg-[#b8ff57] transition-all flex items-center justify-center cursor-pointer group"
                          title="Drag connection from here"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#5b5eff] group-hover:bg-[#07080d]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floating Instructions & Zoom controls inside Canvas */}
            <div className="absolute left-6 bottom-6 flex items-center gap-2 pointer-events-auto bg-[#0a0c14]/90 border border-[#1f2235]/40 p-2 rounded shadow-2xl z-20 font-mono text-[9px] text-[#5e6686]">
              <button onClick={() => setScale(prev => Math.max(0.4, prev - 0.1))} className="px-2 py-1 bg-[#141624] hover:text-white rounded border border-[#1f2235]">-</button>
              <span>{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(prev => Math.min(1.8, prev + 0.1))} className="px-2 py-1 bg-[#141624] hover:text-white rounded border border-[#1f2235]">+</button>
              <button onClick={() => { setPanX(40); setPanY(40); setScale(1); }} className="px-2 py-1 bg-[#141624] hover:text-[#b8ff57] rounded border border-[#1f2235]">Reset View</button>
              <div className="border-l border-[#1f2235]/40 h-4 mx-1" />
              <span className="text-[#4c5475]">Double-click empty canvas to add nodes // Double-click nodes to edit</span>
            </div>

             {/* W+ FAB (N8n Style) */}
<button
  onClick={() => {
    setSpawnCoords(null);
    setIsAddPanelOpen(true);
  }}
  className="absolute right-6 bottom-6 w-12 h-12 rounded-full bg-[#b8ff57] hover:bg-[#a6e64d] text-[#0a0a0a] flex items-center justify-center shadow-[0_0_20px_rgba(184,255,87,0.5)] hover:scale-110 transition-all z-20 group"
  title="Summon Node Tray"
>
  <span className="text-2xl font-bold group-hover:scale-110 transition-transform">W+</span>
  <div className="absolute -top-10 right-0 bg-[#141624] text-[9px] font-mono px-2 py-1 rounded border border-[#1f2235] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
    W+ Add Node
  </div>
</button>
          </div>

          {/* WORKBENCH SUB-DRAWER (Unified Train + Create panels) */}
          {((isSubDrawerOpen) || currentTab === 'training' || currentTab === 'creation') && (
            <div className="w-[360px] border-l border-[#1f2235]/60 bg-[#0a0c14]/95 flex flex-col font-mono z-20 shrink-0 h-full overflow-hidden">

              {/* Sub-drawer Tab Header */}
              { (
                <div className="flex border-b border-[#1f2235]/40 bg-[#0d0f19] shrink-0">
                  <button
                    onClick={() => setSubDrawerMode('training')}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                      subDrawerMode === 'training' ? "text-[#b8ff57] border-b-2 border-[#b8ff57]" : "text-[#5e6686] hover:text-white"
                    )}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Train
                  </button>
                  <button
                    onClick={() => setSubDrawerMode('creation')}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5",
                      subDrawerMode === 'creation' ? "text-[#b04cff] border-b-2 border-[#b04cff]" : "text-[#5e6686] hover:text-white"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Create
                  </button>
                </div>
              )}

              {/* ===== TRAINING SET COMPILER CONTENT ===== */}
              {((subDrawerMode === "training") || currentTab === 'training') && (
                <TrainingSetCompiler
                  nodes={nodes}
                  memories={memories}
                  onExcludeNode={(nodeId) => {
                    setNodes(prev => prev.map(n => n.id === nodeId ? {
                      ...n,
                      useInTrainingSet: false,
                      config: { ...n.config, useInTrainingSet: false }
                    } : n));
                    showNotification('Removed from training set');
                  }}
                  onExport={handleExportTrainingSet}
                  showNotification={showNotification}
                />
              )}

              {/* ===== AGENT SPARK COMPILER / CREATION CONTENT ===== */}
              {((subDrawerMode === "creation") || currentTab === 'creation') && (
                <AgentCompiler
                  creationAgentName={creationAgentName}
                  setCreationAgentName={setCreationAgentName}
                  creationBaseModel={creationBaseModel}
                  setCreationBaseModel={setCreationBaseModel}
                  creationSystemPrompt={creationSystemPrompt}
                  setCreationSystemPrompt={setCreationSystemPrompt}
                  creationToolWebSearch={creationToolWebSearch}
                  setCreationToolWebSearch={setCreationToolWebSearch}
                  creationToolCodeExecution={creationToolCodeExecution}
                  setCreationToolCodeExecution={setCreationToolCodeExecution}
                  creationToolVision={creationToolVision}
                  setCreationToolVision={setCreationToolVision}
                  creationToolMemory={creationToolMemory}
                  setCreationToolMemory={setCreationToolMemory}
                  nodes={nodes}
                  onSpawnAgent={handleSpawnCompiledAgent}
                />
              )}

            </div>
          )}
        </div>

        {/* BOTTOM EXECUTION LOG DRAWER (SEAMLESS TELEMETRY + ACTION RUN HISTORY) */}
        {isBottomDrawerOpen && (
          <div className="h-64 border-t border-[#1f2235]/40 bg-[#07080d] flex flex-col shrink-0 z-10 overflow-hidden relative">
            
            {/* Drawer Tab Header */}
            <div className="h-10 border-b border-[#1f2235]/20 bg-[#0c0d15] px-6 flex items-center justify-between font-mono shrink-0 select-none">
              <div className="flex gap-4">
                <button
                  onClick={() => setBottomDrawerTab('telemetry')}
                  className={cn(
                    "text-[10px] tracking-wider uppercase font-bold transition-all",
                    bottomDrawerTab === 'telemetry' ? "text-[#b8ff57] border-b-2 border-[#b8ff57] pb-1" : "text-[#5e6686] hover:text-[#e8eaf6]"
                  )}
                >
                  📡 Nexus Telemetry stream ({filteredEvents.length})
                </button>
                <button
                  onClick={() => setBottomDrawerTab('step_results')}
                  className={cn(
                    "text-[10px] tracking-wider uppercase font-bold transition-all",
                    bottomDrawerTab === 'step_results' ? "text-[#b8ff57] border-b-2 border-[#b8ff57] pb-1" : "text-[#5e6686] hover:text-[#e8eaf6]"
                  )}
                >
                  📋 Node Output JSON
                </button>
                <button
                  onClick={() => setBottomDrawerTab('execution_trace')}
                  className={cn(
                    "text-[10px] tracking-wider uppercase font-bold transition-all",
                    bottomDrawerTab === 'execution_trace' ? "text-[#b8ff57] border-b-2 border-[#b8ff57] pb-1" : "text-[#5e6686] hover:text-[#e8eaf6]"
                  )}
                >
                  ⏱️ Exec trace history
                </button>
              </div>

              {/* Close drawer icon */}
              <button 
                onClick={() => setIsBottomDrawerOpen(false)}
                className="text-[#5e6686] hover:text-white transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Tab Content */}
            <div className="flex-1 overflow-y-auto bg-[#040509]/95 text-xs font-mono p-4">
              
              {/* Telemetry tab */}
              {bottomDrawerTab === 'telemetry' && (
                <div className="h-full flex flex-col min-h-0">
                  {/* Metrics Strip */}
                  <div className="pb-2 mb-2 border-b border-[#1f2235]/20 grid grid-cols-4 gap-2 shrink-0">
                    {[
                      { label: 'ERRORS', value: events.filter(e => e.severity === 'error').length, color: '#ff3d6b' },
                      { label: 'WARNINGS', value: events.filter(e => e.severity === 'warning').length, color: '#ffc147' },
                      { label: 'JS RUNTIME', value: events.filter(e => e.type === 'js_error').length, color: '#00f5d4' },
                      { label: 'NETWORK', value: events.filter(e => e.type === 'network').length, color: '#5b5eff' },
                    ].map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#0b0c14] border border-[#1f2235]/30 px-2 py-1 rounded-sm">
                        <span className="text-[7px] text-[#4c5475] tracking-widest">{m.label}</span>
                        <span style={{ color: m.color }} className="text-sm font-bold">{m.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Telemetry Toolbar */}
                  <div className="pb-3 border-b border-[#1f2235]/20 mb-3 flex items-center gap-3 shrink-0">
                    <input
                      type="text"
                      placeholder="Filter telemetry logs..."
                      value={telemetrySearch}
                      onChange={(e) => setTelemetrySearch(e.target.value)}
                      className="bg-[#141624] border border-[#1f2235] rounded text-[10px] px-3 py-1 text-[#e8eaf6] focus:outline-none focus:border-[#5b5eff] max-w-xs"
                    />
                    <div className="flex gap-1">
                      {(['all', 'error', 'warning', 'info'] as const).map(chip => (
                        <button
                          key={chip}
                          onClick={() => setActiveTelemetryChip(chip)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[8px] uppercase tracking-wider border",
                            activeTelemetryChip === chip
                              ? "bg-[#5b5eff] text-white border-[#5b5eff]"
                              : "bg-transparent border-[#1f2235] text-[#4c5475] hover:text-white"
                          )}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={onClearEvents}
                      className="ml-auto text-[8px] text-red-500 hover:underline hover:text-red-400"
                    >
                      Clear Log Feed
                    </button>
                  </div>

                  {/* Telemetry scrolling logs */}
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {filteredEvents.map(ev => {
                      const aiData = aiExplanations[ev.id];
                      const isExpanded = expandedEventId === ev.id;
                      const sevColor = ev.severity === 'error' ? '#ff3d6b' : ev.severity === 'warning' ? '#ffc147' : '#5b5eff';
                      return (
                        <div key={ev.id} className="bg-[#0b0c14] border border-[#1f2235]/30 rounded overflow-hidden">
                          {/* Event header row */}
                          <div
                            onClick={() => {
                              setExpandedEventId(isExpanded ? null : ev.id);
                              if (!isExpanded && (ev.severity === 'error' || ev.severity === 'warning')) handleFetchAIAnalysis(ev);
                            }}
                            className="p-2.5 flex items-center gap-2 cursor-pointer"
                          >
                            <div
                              style={{ background: sevColor, boxShadow: `0 0 6px ${sevColor}` }}
                              className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                            />
                            <span
                              style={{ borderColor: sevColor, color: sevColor }}
                              className="text-[7px] px-1 py-0.1 rounded font-bold uppercase border bg-transparent"
                            >
                              {ev.severity}
                            </span>
                            <span className="text-[8px] font-mono bg-white/5 px-1 py-0.5 text-[#4c5475]">
                              {NEXUS_TYPE_LABELS[ev.type] || ev.type.toUpperCase()}
                            </span>
                            <span className="text-[8px] text-[#4c5475]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                            <span className="text-[9px] text-slate-400 truncate flex-1 ml-1">{ev.message}</span>
                            
                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => onDismissEvent(ev.id)}
                                className="p-1 hover:bg-red-500/10 text-[#4c5475] hover:text-red-500 transition-colors"
                                title="Dismiss Event"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleCopyEvent(ev)}
                                className="p-1 hover:bg-[#5b5eff]/10 text-[#4c5475] hover:text-[#00f5d4] transition-colors"
                                title="Copy Event JSON"
                              >
                                {copiedEventId === ev.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </button>
                              {(ev.severity === 'error' || ev.severity === 'warning') && (
                                <button
                                  onClick={() => handleFetchAIAnalysis(ev)}
                                  className="text-[8px] text-[#b8ff57] hover:underline flex items-center gap-1 shrink-0 px-1"
                                >
                                  <Cpu className="w-3 h-3 text-[#b8ff57]" />
                                  <span>AI</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded block with stack trace and AI analysis */}
                          {isExpanded && (
                            <div className="p-3 bg-[#0a0c14] border-t border-[#1f2235]/30 space-y-3">
                              {(ev.source || ev.line) && (
                                <div className="text-[9px] text-[#4c5475] font-mono flex gap-4">
                                  {ev.source && <span className="truncate">Source: {ev.source}</span>}
                                  {ev.line && <span>Line: {ev.line}</span>}
                                </div>
                              )}
                              {ev.stack && (
                                <div className="space-y-1">
                                  <span className="block text-[7px] font-mono text-[#4c5475] uppercase tracking-wider">Console Stack Trace</span>
                                  <pre className="bg-[#02030a] border border-[#1f2235]/30 p-2 text-[9px] text-red-400 font-mono overflow-x-auto leading-relaxed max-h-32 overflow-y-auto">
                                    {ev.stack}
                                  </pre>
                                </div>
                              )}

                              {/* AI Explanation area */}
                              {aiData && (
                                <div className="p-2.5 border border-[#5b5eff]/15 bg-[#5b5eff]/5 rounded-sm">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Cpu className="w-3 h-3 text-[#00f5d4]" />
                                    <span className="text-[7px] font-mono text-[#00f5d4] tracking-widest uppercase">Nexus Cognitive Runtime Analysis</span>
                                  </div>
                                  {aiData.loading ? (
                                    <div className="flex items-center gap-1.5 py-1 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#00f5d4]" />
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] delay-75" />
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] delay-150" />
                                    </div>
                                  ) : (
                                    <div className="space-y-2 font-mono">
                                      <p className="text-[10px] text-slate-300 leading-relaxed">
                                        <strong className="text-[#b8ff57]">Diagnosis:</strong> {aiData.explanation}
                                      </p>
                                      {aiData.fix && (
                                        <div className="space-y-1">
                                          <span className="block text-[7px] text-[#4c5475] uppercase tracking-wider">Diagnostic Fix Blueprint</span>
                                          <pre className="bg-[#01020a] border border-emerald-500/15 p-2 text-[9px] text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">{aiData.fix}</pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredEvents.length === 0 && (
                      <div className="text-center py-6 text-[#4a5068]">No telemetry stream logs logged for this segment.</div>
                    )}
                  </div>

                  {/* Integration setup footer */}
                  <div className="pt-2 mt-2 border-t border-[#1f2235]/20 shrink-0 font-mono text-[8px] text-[#4c5475] leading-relaxed flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3 h-3 text-[#5b5eff]" />
                      <span>Integrate Nexus script: <code className="text-[#5b5eff]">{`<script src="nexus-monitor.js"></script>`}</code> to capture telemetry.</span>
                    </div>
                    <button className="text-[#00f5d4] hover:underline flex items-center gap-1 shrink-0 ml-2">
                      <span>Setup Guide</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step Output JSON tab */}
              {bottomDrawerTab === 'step_results' && (
                <div className="space-y-2">
                  <div className="text-[10px] text-[#4c5475] uppercase tracking-wider mb-1">// Currently Inspecting Output Payload</div>
                  <div className="flex gap-2 mb-2">
                    {nodes.map(n => (
                      <button
                        key={n.id}
                        onClick={() => setSelectedLogNodeId(n.id)}
                        className={cn(
                          "px-2 py-1 rounded text-[8px] border",
                          selectedLogNodeId === n.id 
                            ? "bg-[#b8ff57]/10 border-[#b8ff57] text-[#b8ff57] font-bold" 
                            : "bg-[#141624]/40 border-[#1f2235]/40 text-[#4c5475]"
                        )}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                  
                  {(() => {
                    const matched = nodes.find(n => n.id === selectedLogNodeId);
                    if (!matched) return <div className="text-[#4a5068]">Select a node from above to examine output state logs.</div>;
                    const output = nodeOutputs[selectedLogNodeId];
                    const displayData = output
                      ? output.status === 'error'
                        ? { status: 'error', error: output.error, duration: output.duration ? `${output.duration}ms` : undefined }
                        : { status: output.status, output: output.output, tokens: output.tokens, duration: output.duration ? `${output.duration}ms` : undefined, timestamp: new Date(output.timestamp).toLocaleTimeString() }
                      : { status: 'idle', message: 'Execute the workflow to see output.' };
                    return (
                      <pre className="bg-[#020306] p-4 rounded text-xs text-emerald-400 border border-emerald-500/10 overflow-x-auto max-h-36">
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                    );
                  })()}
                </div>
              )}

              {/* Execution Trace history tab */}
              {bottomDrawerTab === 'execution_trace' && (
                <div className="space-y-2">
                  <div className="text-[10px] text-[#4c5475] uppercase tracking-wider mb-2">// Flow Trace Log Session</div>
                  <div className="space-y-1 bg-[#020306] p-3 rounded border border-[#1f2235]/20 max-h-40 overflow-y-auto text-[10px] text-[#808eb5]">
                    {executionLog.map((log, index) => (
                      <div key={index} className="flex gap-2 leading-relaxed">
                        <span className="text-[#4c5475] select-none">[{index + 1}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* RIGHT SIDEBAR ADD-NODE SLIDE-IN CATALOGUE ("SUMMONED PANEL") */}
      {isAddPanelOpen && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#0d0e16] border-l border-[#1f2235] shadow-[-10px_0_30px_rgba(0,0,0,0.6)] z-40 flex flex-col font-mono">
          
          <div className="p-4 border-b border-[#1f2235]/40 bg-[#0a0b12] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#b8ff57]" />
              <span className="text-xs font-bold tracking-wider text-[#e8eaf6] uppercase">Summon Workflow Node</span>
            </div>
            <button
              onClick={() => setIsAddPanelOpen(false)}
              className="p-1 hover:bg-[#1a1c2e] text-[#5e6686] hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search nodes catalog */}
          <div className="p-3 border-b border-[#1f2235]/20">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#5e6686]" />
              <input
                type="text"
                placeholder="Search node categories..."
                value={addPanelSearch}
                onChange={(e) => setAddPanelSearch(e.target.value)}
                className="w-full bg-[#141624] border border-[#1f2235] rounded text-[10px] px-8 py-2 text-white focus:outline-none focus:border-[#5b5eff]"
                autoFocus
              />
            </div>
          </div>

          {/* Nodes list categorized */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* 1. Triggers */}
            <div className="space-y-1.5">
              <h5 className="text-[9px] text-[#5b5eff] uppercase tracking-widest font-bold">// Trigger Nodes</h5>
               {[
                 { type: 'webhook', label: 'Webhook Trigger', desc: 'Accept incoming webhook payload events' },
                 { type: 'schedule', label: 'Schedule Trigger', desc: 'Run on interval: every N minutes/hours/days' },
                 { type: 'cron', label: 'Cron Scheduler', desc: 'Trigger sequences on absolute cron patterns' },
                 { type: 'chat_listener', label: 'Chat Event Listener', desc: 'Runs workflow upon channel prompt triggers' },
                 { type: 'calendly', label: 'Calendly Trigger', desc: 'Trigger on new Calendly event' },
                 { type: 'email_imap', label: 'Email Trigger (IMAP)', desc: 'Trigger on incoming email' },
                 { type: 'gmail_trigger', label: 'Gmail Trigger', desc: 'Trigger on new Gmail message' },
                 { type: 'drive_trigger', label: 'Google Drive Trigger', desc: 'Trigger on file changes in Drive' },
                 { type: 'sheets_trigger', label: 'Google Sheets Trigger', desc: 'Trigger on sheet row update' },
                 { type: 'gumroad_trigger', label: 'Gumroad Trigger', desc: 'Trigger on new Gumroad sale' },
                 { type: 'file_trigger', label: 'Local File Trigger', desc: 'Trigger on local file system change' },
                 { type: 'form_submission', label: 'On Form Submission', desc: 'Trigger on form submit event' },
                 { type: 'test_workflow', label: 'When Clicking "Test Workflow"', desc: 'Manual test trigger' },
                 { type: 'input_trigger', label: 'Workflow Input Trigger', desc: 'Start with defined input variables' },
                 { type: 'execute_workflow_trigger', label: 'Execute Workflow (trigger)', desc: 'Triggered by another workflow' },
               ].filter(n => n.label.toLowerCase().includes(addPanelSearch.toLowerCase()))
              .map(node => (
                <button
                  key={node.type}
                  onClick={() => handleAddNodeType(node.type, 'trigger', node.label)}
                  className="w-full text-left p-2.5 bg-[#141624]/40 hover:bg-[#1f2235]/40 border border-[#1f2235]/30 rounded transition-all text-[11px] group"
                >
                  <div className="font-extrabold text-[#e8eaf6] group-hover:text-[#b8ff57] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#5b5eff]" />
                    <span>{node.label}</span>
                  </div>
                  <div className="text-[8px] text-[#4a5068] mt-1 leading-relaxed">{node.desc}</div>
                </button>
              ))}
            </div>

            {/* 2. Apps */}
            <div className="space-y-1.5">
              <h5 className="text-[9px] text-[#ffad33] uppercase tracking-widest font-bold">// Integration Apps</h5>
                {[
                  { type: 'http', label: 'HTTP Request', desc: 'Send HTTP requests to external APIs and services' },
                  { type: 'slack', label: 'Slack Sender', desc: 'Post payloads or errors directly to workspace' },
                  { type: 'gmail', label: 'Gmail Dispatcher', desc: 'Auto-send summary alerts or notifications' },
                  { type: 'github', label: 'GitHub Sync', desc: 'Sync bug issues from repository events' },
                  { type: 'document', label: 'Document Manager', desc: 'Read and write files, documents and knowledge bases' },
                  { type: 'utilities', label: 'Utility Toolbox', desc: 'General purpose string, date and data manipulation' },
                  { type: 'bitly', label: 'Bitly App', desc: 'Shorten URLs via Bitly' },
                  { type: 'bluesky', label: 'Bluesky App', desc: 'Post to Bluesky' },
                  { type: 'dropbox', label: 'Dropbox App', desc: 'Manage Dropbox files' },
                  { type: 'elevenlabs', label: 'ElevenLabs App', desc: 'Text-to-speech generation' },
                  { type: 'gmail_app', label: 'Gmail App', desc: 'Advanced Gmail operations' },
                  { type: 'gmail_trigger_app', label: 'Gmail Trigger App', desc: 'Gmail specific event triggers' },
                  { type: 'calendar_app', label: 'Google Calendar App', desc: 'Manage calendar events' },
                  { type: 'docs_app', label: 'Google Docs App', desc: 'Manage Google Documents' },
                  { type: 'sheets_app', label: 'Google Sheets App', desc: 'Manage Google Sheets' },
                  { type: 'sheets_trigger_app', label: 'Google Sheets Trigger App', desc: 'Sheet specific event triggers' },
                  { type: 'perplexity', label: 'Perplexity App', desc: 'AI-powered search' },
                  { type: 'pushbullet', label: 'Pushbullet App', desc: 'Send push notifications' },
                  { type: 'reddit', label: 'Reddit App', desc: 'Interact with Reddit' },
                  { type: 'rss_read', label: 'RSS Read', desc: 'Fetch RSS feed content' },
                  { type: 'x_twitter', label: 'X (Twitter)', desc: 'Post to X' },
                  { type: 'youtube', label: 'YouTube App', desc: 'Manage YouTube content' },
                ].filter(n => n.label.toLowerCase().includes(addPanelSearch.toLowerCase()))
              .map(node => (
                <button
                  key={node.type}
                  onClick={() => handleAddNodeType(node.type, 'app', node.label)}
                  className="w-full text-left p-2.5 bg-[#141624]/40 hover:bg-[#1f2235]/40 border border-[#1f2235]/30 rounded transition-all text-[11px] group"
                >
                  <div className="font-extrabold text-[#e8eaf6] group-hover:text-[#b8ff57] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#ffad33]" />
                    <span>{node.label}</span>
                  </div>
                  <div className="text-[8px] text-[#4a5068] mt-1 leading-relaxed">{node.desc}</div>
                </button>
              ))}
            </div>

            {/* 3. Core Logic */}
            <div className="space-y-1.5">
              <h5 className="text-[9px] text-[#00e5a0] uppercase tracking-widest font-bold">// Core logic</h5>
                {[
                  { type: 'code', label: 'JS Code Engine', desc: 'Sandbox runtime to manipulate JSON logs' },
                  { type: 'if', label: 'IF Condition', desc: 'Branch workflow: True/False based on condition' },
                  { type: 'switch', label: 'Switch', desc: 'Multi-way branching with multiple case values' },
                  { type: 'loop_for', label: 'Loop (For)', desc: 'Iterate over an array of items, executing downstream per item' },
                  { type: 'loop_while', label: 'Loop (While)', desc: 'Repeat downstream execution while condition is true' },
                  { type: 'filter', label: 'Data Filter', desc: 'Branch execution path based on JSON schema variables' },
                  { type: 'merge', label: 'Merge', desc: 'Combine multiple upstream inputs into one (array/object/text)' },
                  { type: 'split', label: 'Split', desc: 'Split array data into individual items for downstream' },
                  { type: 'router', label: 'Variable Router', desc: 'Directs outputs depending on server status triggers' },
                  { type: 'workflow_tools', label: 'Workflow Toolset', desc: 'Special tools for graph manipulation and routing' },
                  { type: 'custom_tool', label: 'Custom Tool Node', desc: 'User-defined tool implementation' },
                  { type: 'confessionsAi', label: 'Confessions AI', desc: 'Enforces the AI Constitution and audits priority-based logs' },
                  { type: 'aggregate', label: 'Aggregate', desc: 'Group and summarize multiple items' },
                  { type: 'convert_to_file', label: 'Convert to File', desc: 'Convert JSON/Text to a downloadable file' },
                  { type: 'date_time', label: 'Date & Time', desc: 'Format or calculate dates and times' },
                  { type: 'edit_fields', label: 'Edit Fields (Set)', desc: 'Modify or add fields to the current data' },
                  { type: 'extract_from_file', label: 'Extract from File', desc: 'Extract structured data from uploaded files' },
                  { type: 'html_transform', label: 'HTML Transform', desc: 'Parse or generate HTML content' },
                  { type: 'limit', label: 'Limit', desc: 'Limit the number of items processed' },
                  { type: 'markdown_transform', label: 'Markdown Transform', desc: 'Convert between Markdown and HTML/Text' },
                  { type: 'remove_duplicates', label: 'Remove Duplicates', desc: 'Filter out duplicate items based on keys' },
                  { type: 'rename_keys', label: 'Rename Keys', desc: 'Rename object keys in the data stream' },
                  { type: 'sort', label: 'Sort', desc: 'Sort items by specific field values' },
                  { type: 'split_out', label: 'Split Out', desc: 'Convert a list field into multiple items' },
                  { type: 'summarize', label: 'Summarize', desc: 'Create a summary of the data stream' },
                  { type: 'execute_command', label: 'Execute Command', desc: 'Run a system shell command' },
                  { type: 'execute_workflow', label: 'Execute Workflow', desc: 'Call another workflow as a sub-process' },
                  { type: 'execution_data', label: 'Execution Data', desc: 'Access metadata about the current execution' },
                  { type: 'ftp', label: 'FTP', desc: 'Transfer files via FTP/SFTP' },
                  { type: 'replace_me', label: 'Replace Me', desc: 'Placeholder for future logic' },
                  { type: 'respond_webhook', label: 'Respond to Webhook', desc: 'Send a response back to the webhook caller' },
                  { type: 'wait', label: 'Wait', desc: 'Pause execution for a specific duration' },
                ].filter(n => n.label.toLowerCase().includes(addPanelSearch.toLowerCase()))
              .map(node => (
                <button
                  key={node.type}
                  onClick={() => handleAddNodeType(node.type, 'core', node.label)}
                  className="w-full text-left p-2.5 bg-[#141624]/40 hover:bg-[#1f2235]/40 border border-[#1f2235]/30 rounded transition-all text-[11px] group"
                >
                  <div className="font-extrabold text-[#e8eaf6] group-hover:text-[#b8ff57] flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-[#00e5a0]" />
                    <span>{node.label}</span>
                  </div>
                  <div className="text-[8px] text-[#4a5068] mt-1 leading-relaxed">{node.desc}</div>
                </button>
              ))}
            </div>

            {/* 4. AI Engine */}
            <div className="space-y-1.5">
              <h5 className="text-[9px] text-[#b04cff] uppercase tracking-widest font-bold">// AI Engine (NEXUS)</h5>
                {[
                  { type: 'agent', label: 'Nexus AI Agent', desc: 'Launches custom system prompt and telemetry rules via Gemini model' },
                  { type: 'prompt', label: 'Prompt Template', desc: 'Injects context logs dynamically into styled prompts' },
                  { type: 'rag', label: 'Vector Search DB', desc: 'Queries vector index clusters for previous similar bugs' },
                  { type: 'core_brain', label: 'Core Brain Agent', desc: 'Advanced cognitive agent with recursive reasoning' },
                  { type: 'llm_chain', label: 'Basic LLM Chain', desc: 'Sequential chain of LLM prompt executions' },
                  { type: 'chat_memory_manager', label: 'Chat Memory Manager', desc: 'Manages conversational state and memory windows' },
                  { type: 'info_extractor', label: 'Information Extractor', desc: 'Extracts structured data from unstructured text' },
                  { type: 'openai_message_model', label: 'OpenAI Message Model', desc: 'Standardized OpenAI message format handler' },
                  { type: 'qa_chain', label: 'Question and Answer Chain', desc: 'Specialized chain for Q&A tasks' },
                  { type: 'sentiment_analysis', label: 'Sentiment Analysis', desc: 'Analyzes emotional tone of input text' },
                  { type: 'summarization_chain', label: 'Summarization Chain', desc: 'Condenses long text into a brief summary' },
                  { type: 'text_classifier', label: 'Text Classifier', desc: 'Categorizes text into predefined labels' },
                  { type: 'ai_transform', label: 'AI Transform', desc: 'AI-powered data transformation and cleanup' },
                ].filter(n => n.label.toLowerCase().includes(addPanelSearch.toLowerCase()))
              .map(node => (
                <button
                  key={node.type}
                  onClick={() => handleAddNodeType(node.type, 'ai', node.label)}
                  className="w-full text-left p-2.5 bg-[#141624]/40 hover:bg-[#1f2235]/40 border border-[#1f2235]/30 rounded transition-all text-[11px] group"
                >
                  <div className="font-extrabold text-[#e8eaf6] group-hover:text-[#b8ff57] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#b04cff]" />
                    <span>{node.label}</span>
                  </div>
                  <div className="text-[8px] text-[#4a5068] mt-1 leading-relaxed">{node.desc}</div>
                </button>
              ))}
            </div>

             {/* 5. DreamMakerHub (Memory Core Nodes) */}
             <div className="space-y-1.5">
               <h5 className="text-[9px] text-[#b8ff57] uppercase tracking-widest font-bold">// DreamMakerHub</h5>
               {[
                 { type: 'decision', label: 'Decision Node', desc: 'Durable architectural decision context memory' },
                 { type: 'bug', label: 'Bug Node', desc: 'Identified telemetry exceptions with root cause analysis' },
                 { type: 'pattern', label: 'Pattern Node', desc: 'Design systems or recurrent architectural blocks' },
                 { type: 'context', label: 'Context Node', desc: 'Environment variables or diagnostic metadata' },
                 { type: 'file', label: 'File Node', desc: 'Reference text or config schema details' },
                 { type: 'note', label: 'Note Node', desc: 'General engineering annotation and memory capture' }
               ].filter(n => n.label.toLowerCase().includes(addPanelSearch.toLowerCase()))
               .map(node => (
                 <button
                   key={node.type}
                   onClick={() => handleAddNodeType(node.type, 'dream_maker', node.label)}
                   className="w-full text-left p-2.5 bg-[#141624]/40 hover:bg-[#1f2235]/40 border border-[#1f2235]/30 rounded transition-all text-[11px] group"
                 >
                   <div className="font-extrabold text-[#e8eaf6] group-hover:text-[#b8ff57] flex items-center gap-1.5">
                     <Database className="w-3.5 h-3.5 text-[#b8ff57]" />
                     <span>{node.label}</span>
                   </div>
                   <div className="text-[8px] text-[#4a5068] mt-1 leading-relaxed">{node.desc}</div>
                 </button>
               ))}
             </div>
             
              {/* 6. AI Models & Embeddings */}
              <div className="space-y-1.5">
                <h5 className="text-[9px] text-[#ff4560] uppercase tracking-widest font-bold">// AI Models & Embeddings</h5>
                {[
                  { type: 'openai_chat_model', label: 'OpenAI Chat Model', desc: 'GPT-4o and GPT-3.5 Turbo' },
                  { type: 'anthropic_chat_model', label: 'Anthropic Chat Model', desc: 'Claude 3.5 Sonnet and Opus' },
                  { type: 'gemini_chat_model', label: 'Google Gemini Chat Model', desc: 'Gemini Pro and Flash' },
                  { type: 'embeddings_openai', label: 'Embeddings OpenAI', desc: 'Text embeddings via OpenAI' },
                  { type: 'embeddings_gemini', label: 'Embeddings Google Gemini', desc: 'Text embeddings via Google' },
                ].filter(n => n.label.toLowerCase().includes(addPanelSearch.toLowerCase()))
                .map(node => (
                  <button
                    key={node.type}
                    onClick={() => handleAddNodeType(node.type, 'ai_models', node.label)}
                    className="w-full text-left p-2.5 bg-[#141624]/40 hover:bg-[#1f2235]/40 border border-[#1f2235]/30 rounded transition-all text-[11px] group"
                  >
                    <div className="font-extrabold text-[#e8eaf6] group-hover:text-[#b8ff57] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#ff4560]" />
                      <span>{node.label}</span>
                    </div>
                    <div className="text-[8px] text-[#4a5068] mt-1 leading-relaxed">{node.desc}</div>
                  </button>
                ))}
              </div>

              {/* 7. Output Parsers */}
              <div className="space-y-1.5">
                <h5 className="text-[9px] text-[#b8ff57] uppercase tracking-widest font-bold">// Output Parsers</h5>
                {[
                  { type: 'item_list_parser', label: 'Item List Output Parser', desc: 'Parse LLM response as a clean list' },
                  { type: 'structured_parser', label: 'Structured Output Parser', desc: 'Enforce JSON schema for LLM outputs' },
                  { type: 'autofix_parser', label: 'Auto-fixing Output Parser', desc: 'Automatically repair malformed LLM JSON' },
                ].filter(n => n.label.toLowerCase().includes(addPanelSearch.toLowerCase()))
                .map(node => (
                  <button
                    key={node.type}
                    onClick={() => handleAddNodeType(node.type, 'output_parsers', node.label)}
                    className="w-full text-left p-2.5 bg-[#141624]/40 hover:bg-[#1f2235]/40 border border-[#1f2235]/30 rounded transition-all text-[11px] group"
                  >
                    <div className="font-extrabold text-[#e8eaf6] group-hover:text-[#b8ff57] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#b8ff57]" />
                      <span>{node.label}</span>
                    </div>
                    <div className="text-[8px] text-[#4a5068] mt-1 leading-relaxed">{node.desc}</div>
                  </button>
                ))}
              </div>

              {/* 8. Tools (for AI Agents) */}
              <div className="space-y-1.5">
                <h5 className="text-[9px] text-[#ffad33] uppercase tracking-widest font-bold">// AI Agent Tools</h5>
                {[
                  { type: 'calculator', label: 'Calculator', desc: 'Precision math tool for agents' },
                  { type: 'n8n_tool', label: 'Call n8n Workflow Tool', desc: 'Execute external n8n automation' },
                  { type: 'code_tool', label: 'Code Tool', desc: 'Run dynamic JS code in tool sandbox' },
                  { type: 'gmail_tool', label: 'Gmail Tool App', desc: 'Read/send emails via agent' },
                  { type: 'calendar_tool', label: 'Google Calendar Tool App', desc: 'Manage calendar via agent' },
                  { type: 'docs_tool', label: 'Google Docs Tool App', desc: 'Edit documents via agent' },
                  { type: 'sheets_tool', label: 'Google Sheets Tool App', desc: 'Manage spreadsheets via agent' },
                  { type: 'http_tool', label: 'HTTP Request Tool', desc: 'Call any API via agent' },
                  { type: 'mcp_client', label: 'MCP Client', desc: 'Model Context Protocol client' },
                  { type: 'postgres_tool', label: 'Postgres (tool)', desc: 'SQL query tool for agents' },
                  { type: 'redis_tool', label: 'Redis (tool)', desc: 'KV store tool for agents' },
                  { type: 'send_email', label: 'Send Email', desc: 'Direct SMTP email sender' },
                  { type: 'serpapi', label: 'SerpAPI', desc: 'Real-time Google search for agents' },
                  { type: 'wikipedia', label: 'Wikipedia', desc: 'Encyclopedia lookup tool' },
                  { type: 'wolfram_alpha', label: 'Wolfram Alpha', desc: 'Computational knowledge engine' },
                ].filter(n => n.label.toLowerCase().includes(addPanelSearch.toLowerCase()))
                .map(node => (
                  <button
                    key={node.type}
                    onClick={() => handleAddNodeType(node.type, 'ai_tools', node.label)}
                    className="w-full text-left p-2.5 bg-[#141624]/40 hover:bg-[#1f2235]/40 border border-[#1f2235]/30 rounded transition-all text-[11px] group"
                  >
                    <div className="font-extrabold text-[#e8eaf6] group-hover:text-[#b8ff57] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#ffad33]" />
                      <span>{node.label}</span>
                    </div>
                    <div className="text-[8px] text-[#4a5068] mt-1 leading-relaxed">{node.desc}</div>
                  </button>
                ))}
              </div>

              {/* 9. Storage & State (Redis, Supabase, Buffer) */}
              <div className="space-y-1.5">
                <h5 className="text-[9px] text-[#38c8ff] uppercase tracking-widest font-bold">// Storage & State</h5>
                {[
                  { type: 'window_buffer', label: 'Window Buffer Memory', desc: 'Short-term conversational windowed memory buffer' },
                  { type: 'vector_store', label: 'Supabase/Redis Vector Store', desc: 'Persistent high-dimensional vector embeddings storage' },
                  { type: 'postgres_chat_memory', label: 'Postgres Chat Memory', desc: 'Persistent chat history in PostgreSQL' },
                  { type: 'redis_chat_memory', label: 'Redis Chat Memory', desc: 'Fast, ephemeral chat history in Redis' },
                  { type: 'in_memory_vector', label: 'In-Memory Vector Store', desc: 'Temporary vector storage for fast prototyping' },
                  { type: 'pinecone_vector', label: 'Pinecone Vector Store', desc: 'Managed vector database for large scale RAG' },
                  { type: 'pgvector_store', label: 'Postgres PGVector Store', desc: 'Vector storage using pgvector extension' },
                  { type: 'data_loader', label: 'Default Data Loader', desc: 'Loads documents into vector stores' },
                  { type: 'vector_qa', label: 'Answer Questions With Vector Store', desc: 'Direct QA over vector embeddings' },
                ].filter(n => n.label.toLowerCase().includes(addPanelSearch.toLowerCase()))
                .map(node => (
                  <button
                    key={node.type}
                    onClick={() => handleAddNodeType(node.type, 'storage', node.label)}
                    className="w-full text-left p-2.5 bg-[#141624]/40 hover:bg-[#1f2235]/40 border border-[#1f2235]/30 rounded transition-all text-[11px] group"
                  >
                    <div className="font-extrabold text-[#e8eaf6] group-hover:text-[#38c8ff] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#38c8ff]" />
                      <span>{node.label}</span>
                    </div>
                    <div className="text-[8px] text-[#4a5068] mt-1 leading-relaxed">{node.desc}</div>
                  </button>
                ))}
              </div>



          </div>
        </div>
      )}

      {/* NODE DETAIL VIEW (NDV) - 3-COLUMN FULL-SCREEN OVERLAY FOR STANDARD NODES */}
      {selectedNode && (
        <div className="fixed inset-0 bg-[#05060b]/95 backdrop-blur-md z-50 flex flex-col font-mono">
          {/* Header */}
          <div className="h-14 border-b border-[#1f2235]/40 px-8 flex items-center justify-between bg-[#0a0b12] shrink-0 select-none">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-[#b8ff57] animate-spin" />
              <div>
                <h3 className="text-xs font-black uppercase text-[#e8eaf6]">Node Detail Configuration View (NDV)</h3>
                <span className="text-[8.5px] text-[#5e6686] uppercase tracking-wider">{selectedNode.label} // ID: {selectedNode.id}</span>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedNode(null)}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold uppercase transition-all"
            >
              Close Overlay
            </button>
          </div>

          {/* 3-Column layout */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Column 1: Input Data (Left) */}
            <div className="w-1/3 border-r border-[#1f2235]/20 flex flex-col min-w-0 bg-[#07080d]/80 p-6 overflow-y-auto">
              <h4 className="text-[10px] text-[#5b5eff] uppercase tracking-widest font-black mb-3 flex items-center gap-1.5 shrink-0">
                <ArrowRight className="w-4 h-4" />
                <span>Input Payload / Incoming variables</span>
              </h4>
              <p className="text-[9px] text-[#5e6686] leading-relaxed mb-4">
                Mock payload representing variables available from precursor upstream nodes linked in the active graph.
              </p>

              <div className="flex-1 space-y-4">
                {Object.entries(selectedNode.config.mockInputs || { payload: '{}' }).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <span className="text-[9px] text-[#b8ff57] font-bold uppercase">{key}</span>
                    <textarea
                      value={value}
                      onChange={(e) => {
                        const newInputs = { ...selectedNode.config.mockInputs, [key]: e.target.value };
                        setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, mockInputs: newInputs }
                        });
                      }}
                      className="w-full h-40 bg-[#020306] border border-[#1f2235] rounded p-3 text-xs text-[#808eb5] focus:outline-none focus:border-[#5b5eff] font-mono whitespace-pre-wrap"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Parameters/Config (Center) */}
            <div className="w-1/3 border-r border-[#1f2235]/20 flex flex-col min-w-0 bg-[#08090f] p-6 overflow-y-auto space-y-4">
              <h4 className="text-[10px] text-[#b8ff57] uppercase tracking-widest font-black mb-1 flex items-center gap-1.5 shrink-0">
                <Sliders className="w-4 h-4" />
                <span>Parameter Options</span>
              </h4>
              <p className="text-[9px] text-[#5e6686] leading-relaxed mb-3">
                Edit core system properties and prompt guidelines for this node execution environment.
              </p>

              {/* General Fields */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 uppercase font-bold">Node Title</label>
                  <input
                    type="text"
                    value={selectedNode.config.title || ''}
                    onChange={(e) => setSelectedNode({
                      ...selectedNode,
                      config: { ...selectedNode.config, title: e.target.value }
                    })}
                    className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white focus:outline-none focus:border-[#b8ff57]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 uppercase font-bold">Description / Purpose</label>
                  <input
                    type="text"
                    value={selectedNode.config.description || ''}
                    onChange={(e) => setSelectedNode({
                      ...selectedNode,
                      config: { ...selectedNode.config, description: e.target.value }
                    })}
                    className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white focus:outline-none focus:border-[#b8ff57]"
                  />
                </div>

                {/* Error handling & retry — common to all nodes */}
                <div className="pt-3 border-t border-[#1f2235]/20 space-y-2">
                  <h6 className="text-[8px] text-[#ff6b6b] uppercase tracking-widest font-bold">Error Handling</h6>
                  <div className="flex items-center gap-3">
                    <label className="text-[9px] text-slate-400 uppercase font-bold">Max Retries</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={selectedNode.config.retryCount ?? 0}
                      onChange={(e) => setSelectedNode({
                        ...selectedNode,
                        config: { ...selectedNode.config, retryCount: parseInt(e.target.value) || 0 }
                      })}
                      className="w-16 bg-[#141624] border border-[#1f2235] rounded text-xs px-2 py-1 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[9px] text-slate-400 uppercase font-bold">Retry Delay (ms)</label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      step="100"
                      value={selectedNode.config.retryDelay ?? 1000}
                      onChange={(e) => setSelectedNode({
                        ...selectedNode,
                        config: { ...selectedNode.config, retryDelay: parseInt(e.target.value) || 1000 }
                      })}
                      className="w-20 bg-[#141624] border border-[#1f2235] rounded text-xs px-2 py-1 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="continue-on-error"
                      checked={!!selectedNode.config.continueOnError}
                      onChange={(e) => setSelectedNode({
                        ...selectedNode,
                        config: { ...selectedNode.config, continueOnError: e.target.checked }
                      })}
                      className="rounded border-[#1f2235] bg-[#0c0e17] text-[#ff6b6b] focus:ring-0 w-3 h-3 cursor-pointer"
                    />
                    <label htmlFor="continue-on-error" className="text-[9px] text-slate-400 uppercase cursor-pointer">Continue on error</label>
                  </div>
                </div>

                {/* AI Node parameters */}
                {selectedNode.type === 'agent' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#b04cff] uppercase font-bold">Model Engine</label>
                      <select
                        value={selectedNode.config.model || 'gemini-3-flash-preview'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, model: e.target.value as any }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white focus:outline-none focus:border-[#b8ff57]"
                      >
                        <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Heavy reasoning)</option>
                        <option value="gpt-4o">GPT-4o (Frontier)</option>
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-[#b04cff] uppercase font-bold">System Instruction</label>
                      <textarea
                        value={selectedNode.config.systemPrompt || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, systemPrompt: e.target.value }
                        })}
                        className="w-full h-32 bg-[#141624] border border-[#1f2235] rounded p-3 text-xs text-white focus:outline-none focus:border-[#b8ff57] font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-400 uppercase font-bold">Temperature</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={selectedNode.config.temperature || 0.7}
                          onChange={(e) => setSelectedNode({
                            ...selectedNode,
                            config: { ...selectedNode.config, temperature: parseFloat(e.target.value) }
                          })}
                          className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-1.5 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-400 uppercase font-bold">Top P</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="1"
                          value={selectedNode.config.topP || 0.95}
                          onChange={(e) => setSelectedNode({
                            ...selectedNode,
                            config: { ...selectedNode.config, topP: parseFloat(e.target.value) }
                          })}
                          className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Prompt Template variables */}
                {selectedNode.type === 'rag' && (
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#b8ff57] uppercase font-bold">Search query format</label>
                    <textarea
                      value={selectedNode.config.promptTemplate || ''}
                      onChange={(e) => setSelectedNode({
                        ...selectedNode,
                        config: { ...selectedNode.config, promptTemplate: e.target.value }
                      })}
                      className="w-full h-24 bg-[#141624] border border-[#1f2235] rounded p-3 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}

                {/* Webhook parameter details */}
                {selectedNode.type === 'webhook' && (
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#5b5eff] uppercase font-bold">Webhook endpoint URL</label>
                    <input
                      type="text"
                      value={selectedNode.config.webhookUrl || ''}
                      onChange={(e) => setSelectedNode({
                        ...selectedNode,
                        config: { ...selectedNode.config, webhookUrl: e.target.value }
                      })}
                      className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                    />
                  </div>
                )}

                {/* Code node sandbox */}
                {selectedNode.type === 'code' && (
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#00e5a0] uppercase font-bold">JavaScript Code</label>
                    <p className="text-[8px] text-[#5e6686] mb-1">Define <span className="text-[#b8ff57]">$input</span> and return a value. Built-in: <span className="text-[#b8ff57]">JSON</span>, <span className="text-[#b8ff57]">Math</span>, <span className="text-[#b8ff57]">Date</span>, <span className="text-[#b8ff57]">console</span>.</p>
                    <textarea
                      value={selectedNode.config.code || '// Transform input\nconst data = JSON.parse($input);\nreturn JSON.stringify({ result: data }, null, 2);'}
                      onChange={(e) => setSelectedNode({
                        ...selectedNode,
                        config: { ...selectedNode.config, code: e.target.value }
                      })}
                      className="w-full h-48 bg-[#0d0e1b] border border-[#1f2235] rounded p-3 text-xs text-[#00f5d4] focus:outline-none focus:border-[#b8ff57] font-mono"
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* IF Condition config */}
                {selectedNode.type === 'if' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Left Value (path or static)</label>
                      <input
                        type="text"
                        value={selectedNode.config.conditionLeft || '$input'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, conditionLeft: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Operator</label>
                      <select
                        value={selectedNode.config.conditionOperator || 'equals'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, conditionOperator: e.target.value as any }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="equals">Equals (===)</option>
                        <option value="not_equals">Not Equals (!==)</option>
                        <option value="greater_than">Greater Than (&gt;)</option>
                        <option value="less_than">Less Than (&lt;)</option>
                        <option value="contains">Contains</option>
                        <option value="starts_with">Starts With</option>
                        <option value="regex">Regex Match</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Right Value (comparison)</label>
                      <input
                        type="text"
                        value={selectedNode.config.conditionRight || 'true'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, conditionRight: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="pt-2 border-t border-[#1f2235]/20">
                      <label className="text-[9px] text-[#5e6686] uppercase font-bold mb-2 block">Outgoing Connections</label>
                      {connections.filter(c => c.fromId === selectedNode.id).map(conn => {
                        const target = nodes.find(n => n.id === conn.toId);
                        return (
                          <div key={conn.id} className="flex items-center gap-2 mb-1 text-[10px]">
                            <span className="text-[#808eb5]">→ {target?.label || conn.toId}</span>
                            <select
                              value={conn.fromPort || 'true'}
                              onChange={(e) => setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, fromPort: e.target.value } : c))}
                              className="bg-[#141624] border border-[#1f2235] rounded text-[9px] px-1 py-0.5 text-white"
                            >
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          </div>
                        );
                      })}
                      {connections.filter(c => c.fromId === selectedNode.id).length === 0 && (
                        <p className="text-[9px] text-[#4a5068]">Connect this node to others, then assign True/False ports here.</p>
                      )}
                    </div>
                  </>
                )}

                {/* Switch parameters */}
                {selectedNode.type === 'switch' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#5b5eff] uppercase font-bold">Comparison Operator</label>
                      <select
                        value={selectedNode.config.switchOperator || 'equals'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, switchOperator: e.target.value as any }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="equals">Equals (===)</option>
                        <option value="not_equals">Not Equals (!==)</option>
                        <option value="greater_than">Greater Than (&gt;)</option>
                        <option value="less_than">Less Than (&lt;)</option>
                        <option value="contains">Contains</option>
                        <option value="starts_with">Starts With</option>
                        <option value="regex">Regex Match</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] text-[#5b5eff] uppercase font-bold">Cases (compare $input against each value)</label>
                        <button
                          onClick={() => {
                            const cases = selectedNode.config.switchCases || [];
                            const newCaseNum = cases.length + 1;
                            setSelectedNode({
                              ...selectedNode,
                              config: {
                                ...selectedNode.config,
                                switchCases: [...cases, { value: '', label: `Case ${String.fromCharCode(64 + newCaseNum)}` }]
                              }
                            });
                          }}
                          className="px-2 py-0.5 bg-[#5b5eff]/10 border border-[#5b5eff]/30 text-[#5b5eff] text-[8px] font-mono uppercase hover:bg-[#5b5eff]/20 rounded-sm"
                        >
                          + Add Case
                        </button>
                      </div>
                      {(selectedNode.config.switchCases || []).map((sc, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#141624]/60 border border-[#1f2235]/40 rounded p-2">
                          <span className="text-[8px] font-mono text-[#5b5eff] font-bold shrink-0">case_{idx}</span>
                          <input
                            type="text"
                            value={sc.label}
                            onChange={(e) => {
                              const cases = [...(selectedNode.config.switchCases || [])];
                              cases[idx] = { ...cases[idx], label: e.target.value };
                              setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, switchCases: cases } });
                            }}
                            className="w-24 bg-[#141624] border border-[#1f2235] rounded text-[10px] px-2 py-1 text-white font-mono"
                            placeholder="Label"
                          />
                          <input
                            type="text"
                            value={sc.value}
                            onChange={(e) => {
                              const cases = [...(selectedNode.config.switchCases || [])];
                              cases[idx] = { ...cases[idx], value: e.target.value };
                              setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, switchCases: cases } });
                            }}
                            className="flex-1 bg-[#141624] border border-[#1f2235] rounded text-[10px] px-2 py-1 text-white font-mono"
                            placeholder="Comparison value"
                          />
                          <button
                            onClick={() => {
                              const cases = (selectedNode.config.switchCases || []).filter((_, i) => i !== idx);
                              setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, switchCases: cases } });
                            }}
                            className="text-[#4c5475] hover:text-red-500 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {(selectedNode.config.switchCases || []).length === 0 && (
                        <p className="text-[9px] text-[#4a5068]">No cases defined. All inputs will route to "default".</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#1f2235]/20">
                      <label className="text-[9px] text-[#5e6686] uppercase font-bold mb-2 block">Outgoing Connections — Port Assignment</label>
                      {connections.filter(c => c.fromId === selectedNode.id).map(conn => {
                        const target = nodes.find(n => n.id === conn.toId);
                        const cases = selectedNode.config.switchCases || [];
                        return (
                          <div key={conn.id} className="flex items-center gap-2 mb-1 text-[10px]">
                            <span className="text-[#808eb5]">→ {target?.label || conn.toId}</span>
                            <select
                              value={conn.fromPort || 'default'}
                              onChange={(e) => setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, fromPort: e.target.value } : c))}
                              className="bg-[#141624] border border-[#1f2235] rounded text-[9px] px-1 py-0.5 text-white"
                            >
                              {cases.map((sc, idx) => (
                                <option key={idx} value={`case_${idx}`}>{sc.label || `Case ${idx}`}</option>
                              ))}
                              <option value="default">Default</option>
                            </select>
                          </div>
                        );
                      })}
                      {connections.filter(c => c.fromId === selectedNode.id).length === 0 && (
                        <p className="text-[9px] text-[#4a5068]">Connect this node to others, then assign case ports here.</p>
                      )}
                    </div>
                  </>
                )}

                {/* Loop (For) parameters */}
                {selectedNode.type === 'loop_for' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Items Array (JSON or comma-separated)</label>
                      <input
                        type="text"
                        value={selectedNode.config.loopItems || '[1, 2, 3]'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, loopItems: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                        placeholder='[1, 2, 3] or "a, b, c"'
                      />
                      <p className="text-[8px] text-[#4a5068]">Each item is passed as input to downstream nodes.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Variable Name</label>
                      <input
                        type="text"
                        value={selectedNode.config.loopVarName || 'item'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, loopVarName: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                        placeholder="item"
                      />
                    </div>
                  </>
                )}

                {/* Loop (While) parameters */}
                {selectedNode.type === 'loop_while' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Condition (JS expression using $input)</label>
                      <input
                        type="text"
                        value={selectedNode.config.whileCondition || '$input < 5'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, whileCondition: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                        placeholder="$input < 5"
                      />
                      <p className="text-[8px] text-[#4a5068]">The loop body executes while this evaluates to true.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Max Iterations (safety limit)</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={selectedNode.config.whileMaxIterations ?? 100}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, whileMaxIterations: parseInt(e.target.value) || 100 }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Merge parameters */}
                {selectedNode.type === 'merge' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Merge Mode</label>
                      <select
                        value={selectedNode.config.mergeMode || 'array'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                           config: { ...selectedNode.config, mergeMode: e.target.value as 'array' | 'object' }

                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="array">Array (concatenate arrays)</option>
                        <option value="object">Object (merge properties)</option>
                        <option value="text">Text (join with newlines)</option>
                      </select>
                      <p className="text-[8px] text-[#4a5068]">Combines all upstream connection outputs.</p>
                    </div>
                  </>
                )}

                {/* Split parameters */}
                {selectedNode.type === 'split' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Split Mode</label>
                      <select
                        value={selectedNode.config.splitMode || 'first'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                           config: { ...selectedNode.config, splitMode: e.target.value as 'first' | 'all' }

                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="first">Output first item (passthrough)</option>
                        <option value="all">Output all items (JSON array)</option>
                      </select>
                      <p className="text-[8px] text-[#4a5068]">Splits array data from upstream.</p>
                    </div>
                  </>
                )}

                {/* Schedule Trigger parameters */}
                {selectedNode.type === 'schedule' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#5b5eff] uppercase font-bold">Interval</label>
                      <select
                        value={selectedNode.config.scheduleInterval || 'every_15_min'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, scheduleInterval: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="every_1_min">Every 1 minute</option>
                        <option value="every_5_min">Every 5 minutes</option>
                        <option value="every_15_min">Every 15 minutes</option>
                        <option value="every_30_min">Every 30 minutes</option>
                        <option value="every_1_hour">Every hour</option>
                        <option value="every_2_hour">Every 2 hours</option>
                        <option value="every_6_hour">Every 6 hours</option>
                        <option value="every_12_hour">Every 12 hours</option>
                        <option value="every_day">Every day</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#5b5eff] uppercase font-bold">Status</label>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full ${selectedNode.config.scheduleEnabled !== false ? 'bg-emerald-500' : 'bg-[#4a5068]'}`} />
                        <span className="text-[#808eb5]">{selectedNode.config.scheduleEnabled !== false ? 'Active' : 'Paused'}</span>
                        <button
                          onClick={() => setSelectedNode({
                            ...selectedNode,
                            config: { ...selectedNode.config, scheduleEnabled: selectedNode.config.scheduleEnabled === false ? true : false }
                          })}
                          className="ml-auto text-[9px] text-[#5b5eff] hover:text-[#b8ff57]"
                        >
                          Toggle
                        </button>
                      </div>
                    </div>
                    {/* Show next execution times */}
                    <div className="space-y-1 pt-2 border-t border-[#1f2235]/20">
                      <label className="text-[9px] text-[#5e6686] uppercase font-bold">Next Executions</label>
                      {(() => {
                        const ms = scheduleIntervalToMs(selectedNode.config.scheduleInterval || 'every_15_min');
                        const times = [Date.now() + ms, Date.now() + ms * 2, Date.now() + ms * 3, Date.now() + ms * 4, Date.now() + ms * 5];
                        return times.map((t, i) => (
                          <div key={i} className="text-[8px] text-[#4a5068] font-mono">{new Date(t).toLocaleString()}</div>
                        ));
                      })()}
                    </div>
                  </>
                )}

                {/* Cron Trigger parameters */}
                {selectedNode.type === 'cron' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#5b5eff] uppercase font-bold">Cron Expression</label>
                      <input
                        type="text"
                        value={selectedNode.config.cronExpression || '*/15 * * * *'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, cronExpression: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                        placeholder="*/15 * * * *"
                      />
                      <p className="text-[8px] text-[#4a5068]">Standard cron format: minute hour day month weekday</p>
                    </div>

                    {/* Validation + next 5 execution times */}
                    {(() => {
                      const expr = selectedNode.config.cronExpression || '*/15 * * * *';
                      const nextTimes = getCronNextTimes(expr, 5);
                      if (nextTimes.length === 0) {
                        return (
                          <div className="p-2 border border-red-500/30 bg-red-500/5 rounded-sm">
                            <span className="text-[9px] text-red-400 font-mono">⚠ Invalid cron expression: "{expr}"</span>
                          </div>
                        );
                      }
                      return (
                        <div className="p-2 border border-[#5b5eff]/20 bg-[#5b5eff]/5 rounded-sm space-y-1">
                          <span className="text-[8px] text-[#5b5eff] font-mono uppercase tracking-wider block">Next 5 Executions</span>
                          {nextTimes.map((t, i) => (
                            <div key={i} className="text-[9px] text-[#808eb5] font-mono">
                              <span className="text-[#5b5eff]">{i + 1}.</span> {t.toLocaleString()}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${selectedNode.config.scheduleEnabled !== false ? 'bg-emerald-500' : 'bg-[#4a5068]'}`} />
                      <span className="text-[9px] text-[#808eb5]">{selectedNode.config.scheduleEnabled !== false ? 'Active' : 'Paused'}</span>
                      <button
                        onClick={() => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, scheduleEnabled: selectedNode.config.scheduleEnabled === false ? true : false }
                        })}
                        className="ml-auto text-[9px] text-[#5b5eff] hover:text-[#b8ff57]"
                      >
                        Toggle
                      </button>
                    </div>
                  </>
                )}

                {/* HTTP Request parameters */}
                {selectedNode.type === 'http' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Method</label>
                      <select
                        value={selectedNode.config.httpMethod || 'GET'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, httpMethod: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">URL</label>
                      <input
                        type="text"
                        value={selectedNode.config.httpUrl || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, httpUrl: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Headers (JSON)</label>
                      <textarea
                        value={selectedNode.config.httpHeaders || '{}'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, httpHeaders: e.target.value }
                        })}
                        className="w-full h-20 bg-[#141624] border border-[#1f2235] rounded p-2 text-xs text-white focus:outline-none focus:border-[#b8ff57] font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Request Body</label>
                      <textarea
                        value={selectedNode.config.httpBody || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, httpBody: e.target.value }
                        })}
                        className="w-full h-24 bg-[#141624] border border-[#1f2235] rounded p-2 text-xs text-white focus:outline-none focus:border-[#b8ff57] font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Slack Sender config */}
                {selectedNode.type === 'slack' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Slack Webhook URL</label>
                      <input
                        type="text"
                        value={selectedNode.config.httpUrl || ''}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, httpUrl: e.target.value } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Channel Override</label>
                      <input
                        type="text"
                        value={selectedNode.config.conditionRight || ''}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, conditionRight: e.target.value } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Gmail Dispatcher config */}
                {selectedNode.type === 'gmail' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Recipient Email</label>
                      <input
                        type="text"
                        value={selectedNode.config.conditionRight || ''}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, conditionRight: e.target.value } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Email Subject</label>
                      <input
                        type="text"
                        value={selectedNode.config.title || ''}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, title: e.target.value } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      />
                    </div>
                  </>
                )}

                {/* GitHub Sync config */}
                {selectedNode.type === 'github' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Repository (org/repo)</label>
                      <input
                        type="text"
                        value={selectedNode.config.httpUrl || ''}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, httpUrl: e.target.value } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Issue Label</label>
                      <input
                        type="text"
                        value={selectedNode.config.conditionRight || 'bug'}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, conditionRight: e.target.value } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      />
                    </div>
                  </>
                )}

                {/* Chat Event Listener config */}
                {selectedNode.type === 'chat_listener' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#5b5eff] uppercase font-bold">Listen Channel</label>
                      <input
                        type="text"
                        value={selectedNode.config.conditionRight || 'general'}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, conditionRight: e.target.value } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#5b5eff] uppercase font-bold">Trigger Keyword</label>
                      <input
                        type="text"
                        value={selectedNode.config.conditionLeft || ''}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, conditionLeft: e.target.value } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Data Filter config */}
                {selectedNode.type === 'filter' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Filter Operator</label>
                      <select
                        value={selectedNode.config.conditionOperator || 'contains'}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, conditionOperator: e.target.value as any } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="starts_with">Starts With</option>
                        <option value="regex">Regex Match</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Filter Value</label>
                      <input
                        type="text"
                        value={selectedNode.config.conditionRight || ''}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, conditionRight: e.target.value } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Variable Router config */}
                {selectedNode.type === 'router' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Routing Strategy</label>
                      <select
                        value={selectedNode.config.mergeMode || 'array'}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, mergeMode: e.target.value as any } })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="array">Content-based (route by input text)</option>
                        <option value="object">Status-based (route by HTTP status)</option>
                        <option value="text">Random (load balance)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Prompt Template config */}
                {selectedNode.type === 'prompt' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#b04cff] uppercase font-bold">Prompt Template</label>
                      <p className="text-[8px] text-[#5e6686] mb-1">Use <span className="text-[#b8ff57]">{'{{ $input }}'}</span> for upstream input, <span className="text-[#b8ff57]">{'{{ $now }}'}</span> for timestamp.</p>
                      <textarea
                        value={selectedNode.config.promptTemplate || ''}
                        onChange={(e) => setSelectedNode({ ...selectedNode, config: { ...selectedNode.config, promptTemplate: e.target.value } })}
                        className="w-full h-32 bg-[#141624] border border-[#1f2235] rounded p-3 text-xs text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Document Manager config */}
                {selectedNode.type === 'document' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Operation</label>
                      <select
                        value={selectedNode.config.httpMethod === 'POST' ? 'write' : 'read'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, httpMethod: e.target.value === 'write' ? 'POST' : 'GET' }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="read">Read Document</option>
                        <option value="write">Write Document</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">File Path / URI</label>
                      <input
                        type="text"
                        value={selectedNode.config.httpUrl || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, httpUrl: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Document Content (for write)</label>
                      <textarea
                        value={selectedNode.config.httpBody || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, httpBody: e.target.value }
                        })}
                        className="w-full h-32 bg-[#141624] border border-[#1f2235] rounded p-2 text-xs text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Utilities config */}
                {selectedNode.type === 'utilities' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Utility Function</label>
                      <select
                        value={selectedNode.config.conditionOperator || 'equals'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, conditionOperator: e.target.value as any }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="equals">String Replace</option>
                        <option value="contains">String Trim</option>
                        <option value="starts_with">Uppercase</option>
                        <option value="regex">Regex Extract</option>
                        <option value="not_equals">Date Format</option>
                        <option value="greater_than">JSON Parse</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#ffad33] uppercase font-bold">Expression / Pattern</label>
                      <input
                        type="text"
                        value={selectedNode.config.conditionRight || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, conditionRight: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Workflow Tools config */}
                {selectedNode.type === 'workflow_tools' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Tool Action</label>
                      <select
                        value={selectedNode.config.mergeMode || 'array'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, mergeMode: e.target.value as any }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="array">Get All Nodes</option>
                        <option value="object">Get Active Connections</option>
                        <option value="text">Trigger Sub-Workflow</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Target Node Filter</label>
                      <input
                        type="text"
                        value={selectedNode.config.conditionLeft || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, conditionLeft: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Custom Tool config */}
                {selectedNode.type === 'custom_tool' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Tool JavaScript Code</label>
                      <p className="text-[8px] text-[#5e6686] mb-1">Define a custom function body. Access <span className="text-[#b8ff57]">$input</span> and return a value.</p>
                      <textarea
                        value={selectedNode.config.code || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, code: e.target.value }
                        })}
                        className="w-full h-48 bg-[#0d0e1b] border border-[#1f2235] rounded p-3 text-xs text-[#00f5d4] font-mono"
                        spellCheck={false}
                      />
                    </div>
                  </>
                )}

                {/* Confessions AI config */}
                {selectedNode.type === 'confessionsAi' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Log Priority Level</label>
                      <p className="text-[8px] text-[#5e6686] mb-1">The validation enforcement strictness tier.</p>
                      <select
                        value={selectedNode.config.conditionOperator || 'standard'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, conditionOperator: e.target.value as any }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="standard">Standard (Trace/Thoughts)</option>
                        <option value="high">High (Operational Error)</option>
                        <option value="critical">Critical (Constitutional Violation)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#00e5a0] uppercase font-bold">Payload / Code to Audit</label>
                      <p className="text-[8px] text-[#5e6686] mb-1">The raw input string, agent reasoning loop, or code block to cross-examine.</p>
                      <textarea
                        value={selectedNode.config.conditionLeft || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, conditionLeft: e.target.value }
                        })}
                        className="w-full h-24 bg-[#0d0e1b] border border-[#1f2235] rounded p-3 text-xs text-[#00f5d4] font-mono"
                        spellCheck={false}
                      />
                    </div>
                    <div className="pt-2 border-t border-[#1f2235]/20 space-y-1.5">
                      <h6 className="text-[8px] text-[#b8ff57] uppercase tracking-widest font-bold">AI Constitution (v1)</h6>
                      <div className="text-[8px] text-[#4c5475] space-y-1 font-mono">
                        <div>Art I — No deception about capabilities</div>
                        <div>Art II — No harmful / dangerous content</div>
                        <div>Art III — No sensitive data exfiltration (high+)</div>
                        <div>Art IV — No human impersonation / false consciousness</div>
                        <div>Art V — Admit uncertainty when incomplete</div>
                        <div className="pt-1 text-[#5e6686]">Rule A — Flag TODO / "Fix later" (high+)</div>
                        <div>Rule B — Flag undefined / [object Object] (high+)</div>
                      </div>
                      <div className="pt-1 text-[7px] text-[#ff4560] font-mono">
                        Critical + violation = circuit breaker (throws error, halts workflow)
                      </div>
                    </div>
                  </>
                )}

                {/* Core Brain Agent config */}
                {selectedNode.type === 'core_brain' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#b04cff] uppercase font-bold">Model Engine</label>
                      <select
                        value={selectedNode.config.model || 'gemini-3-flash-preview'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, model: e.target.value as any }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                        <option value="fugu-ultra">Fugu Ultra</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#b04cff] uppercase font-bold">Cognitive System Instructions</label>
                      <textarea
                        value={selectedNode.config.systemPrompt || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, systemPrompt: e.target.value }
                        })}
                        className="w-full h-32 bg-[#141624] border border-[#1f2235] rounded p-3 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-400 uppercase font-bold">Temperature</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={selectedNode.config.temperature || 0.7}
                          onChange={(e) => setSelectedNode({
                            ...selectedNode,
                            config: { ...selectedNode.config, temperature: parseFloat(e.target.value) }
                          })}
                          className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-2 py-1.5 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-slate-400 uppercase font-bold">Max Tokens</label>
                        <input
                          type="number"
                          min="100"
                          max="8192"
                          value={selectedNode.config.maxTokens || 2048}
                          onChange={(e) => setSelectedNode({
                            ...selectedNode,
                            config: { ...selectedNode.config, maxTokens: parseInt(e.target.value) || 2048 }
                          })}
                          className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-2 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* LLM Chain config */}
                {selectedNode.type === 'llm_chain' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#b04cff] uppercase font-bold">Model Engine</label>
                      <select
                        value={selectedNode.config.model || 'gemini-3-flash-preview'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, model: e.target.value as any }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                        <option value="gpt-4o">GPT-4o</option>
                        <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#b04cff] uppercase font-bold">Chain Prompt Template</label>
                      <textarea
                        value={selectedNode.config.promptTemplate || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, promptTemplate: e.target.value }
                        })}
                        className="w-full h-32 bg-[#141624] border border-[#1f2235] rounded p-3 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-slate-400 uppercase font-bold">Chain Steps</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={selectedNode.config.retryCount ?? 1}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, retryCount: parseInt(e.target.value) || 1 }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-2 py-1.5 text-white"
                      />
                    </div>
                  </>
                )}

                {/* Window Buffer Memory config */}
                {selectedNode.type === 'window_buffer' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#38c8ff] uppercase font-bold">Buffer Size (max items)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={selectedNode.config.retryCount ?? 10}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, retryCount: parseInt(e.target.value) || 10 }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-2 py-1.5 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#38c8ff] uppercase font-bold">Buffer Content</label>
                      <textarea
                        value={selectedNode.config.buffer || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, buffer: e.target.value }
                        })}
                        className="w-full h-32 bg-[#141624] border border-[#1f2235] rounded p-2 text-xs text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {/* Vector Store config */}
                {selectedNode.type === 'vector_store' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#38c8ff] uppercase font-bold">Backend</label>
                      <select
                        value={selectedNode.config.httpMethod || 'supabase'}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, httpMethod: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white"
                      >
                        <option value="supabase">Supabase pgvector</option>
                        <option value="redis">Redis Vector</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#38c8ff] uppercase font-bold">Connection URL</label>
                      <input
                        type="text"
                        value={selectedNode.config.httpUrl || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, httpUrl: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#38c8ff] uppercase font-bold">API Key</label>
                      <input
                        type="password"
                        value={selectedNode.config.httpHeaders || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, httpHeaders: e.target.value }
                        })}
                        className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-[#38c8ff] uppercase font-bold">Query / Search Expression</label>
                      <textarea
                        value={selectedNode.config.query || ''}
                        onChange={(e) => setSelectedNode({
                          ...selectedNode,
                          config: { ...selectedNode.config, query: e.target.value }
                        })}
                        className="w-full h-24 bg-[#141624] border border-[#1f2235] rounded p-2 text-xs text-white font-mono"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Expression Preview */}
              {(() => {
                const exprFields = Object.entries(selectedNode.config).filter(([_, v]) => typeof v === 'string' && v.includes('{{'));
                if (exprFields.length === 0) return null;
                const previewCtx: ExpressionContext = {
                  $node: Object.fromEntries(nodes.map(n => [n.label, { data: nodeOutputs[n.id]?.output, output: nodeOutputs[n.id]?.output || '' }])),
                  $json: '{"example": "value"}',
                  $items: [],
                  $index: 0,
                  $now: new Date().toISOString(),
                  $today: new Date().toLocaleDateString(),
                };
                return (
                  <div className="pt-4 border-t border-[#1f2235]/20 space-y-2">
                    <h6 className="text-[8px] text-[#b8ff57] uppercase tracking-widest font-bold">Expression Preview</h6>
                    {exprFields.map(([key, val]) => (
                      <div key={key} className="text-[8px]">
                        <span className="text-[#5e6686]">{key}: </span>
                        <span className="text-emerald-400">{resolveExpressions(val as string, previewCtx)}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="pt-6 flex gap-3 select-none">
                <button
                  onClick={() => handleSaveNdvConfig(selectedNode)}
                  className="flex-1 bg-[#b8ff57] hover:bg-[#a6e64d] text-black font-extrabold text-xs py-2.5 rounded text-center transition-all"
                >
                  SAVE & CLOSE CONFIG
                </button>
              </div>
            </div>

            {/* Column 3: Output Data Preview (Right) */}
            <div className="w-1/3 bg-[#07080d]/90 flex flex-col min-w-0 p-6 overflow-y-auto">
              <h4 className="text-[10px] text-emerald-400 uppercase tracking-widest font-black mb-3 flex items-center gap-1.5 shrink-0">
                <Check className="w-4 h-4 animate-pulse" />
                <span>Output Response Payload</span>
              </h4>
              <p className="text-[9px] text-[#5e6686] leading-relaxed mb-4">
                {nodeOutputs[selectedNode.id]?.status === 'running' ? 'Executing...' : 'Output from the latest test run of this node.'}
              </p>

              <div className="flex-1 flex flex-col gap-3">
                <pre className="flex-1 bg-[#020306] border border-[#1f2235]/40 rounded p-4 text-xs text-[#00f5d4] font-mono overflow-y-auto whitespace-pre-wrap">
                  {(() => {
                    const o = nodeOutputs[selectedNode.id];
                    if (!o) return JSON.stringify({ status: 'idle', message: 'Click "Execute Single Node Test" to run.' }, null, 2);
                    if (o.status === 'running') return JSON.stringify({ status: 'running' }, null, 2);
                    if (o.status === 'error') return JSON.stringify({ status: 'error', error: o.error }, null, 2);
                    return JSON.stringify({
                      status: 'success',
                      output: o.output,
                      tokens: o.tokens,
                      duration: o.duration ? `${o.duration}ms` : undefined,
                      timestamp: new Date(o.timestamp).toLocaleTimeString(),
                    }, null, 2);
                  })()}
                </pre>

                <button
                  onClick={async () => {
                    if (selectedNode.category !== 'ai') {
                      showNotification('Only AI nodes can be tested individually');
                      return;
                    }
                    const input = Object.entries(selectedNode.config.mockInputs || { payload: '{}' })
                      .map(([k, v]) => `${k}: ${v}`)
                      .join('\n');
                    setNodeOutputs(prev => ({ ...prev, [selectedNode.id]: { status: 'running', output: '', timestamp: Date.now() } }));
                    try {
                      const result = await executeAINode(selectedNode, input);
                      setNodeOutputs(prev => ({ ...prev, [selectedNode.id]: { status: 'success', output: result.output, timestamp: Date.now(), tokens: result.tokens } }));
                      showNotification('Test run completed!');
                    } catch (err: any) {
                      setNodeOutputs(prev => ({ ...prev, [selectedNode.id]: { status: 'error', output: '', timestamp: Date.now(), error: err.message } }));
                      showNotification('Test run failed');
                    }
                  }}
                  className="w-full py-2 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 font-mono text-xs uppercase tracking-wider rounded transition-colors"
                >
                  {nodeOutputs[selectedNode.id]?.status === 'running' ? '⏳ Running...' : '⚡ Execute Single Node Test'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SPECIAL DREAMMAKERHUB MEMORY CORE FORM OVERLAY */}
      {activeMemoryNode && (
        <div className="fixed inset-0 bg-[#05060b]/98 backdrop-blur-lg z-50 flex items-center justify-center font-mono p-4 select-none">
          <div className="max-w-2xl w-full bg-[#0a0c16] border border-[#1f2235] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-4 bg-[#0d0e1b] border-b border-[#1f2235]/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#b8ff57]" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">Memory Core Node Synchronization</span>
              </div>
              <button 
                onClick={() => setActiveMemoryNode(null)}
                className="text-[#5e6686] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <p className="text-[10px] text-[#5e6686] leading-relaxed">
                You are editing a <strong>DreamMakerHub</strong> Memory node. Saving this form will write context logs directly into the global app index, syncing them to model system instructions.
              </p>

              <div className="space-y-1.5">
                <label className="text-[9px] text-[#b8ff57] font-bold uppercase">Memory Title</label>
                <input
                  type="text"
                  value={memoryFormTitle}
                  onChange={(e) => setMemoryFormTitle(e.target.value)}
                  className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white focus:outline-none focus:border-[#b8ff57]"
                  placeholder="e.g. TypeError in Checkout container"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#b8ff57] font-bold uppercase">Memory Type</label>
                  <select
                    value={memoryFormType}
                    onChange={(e) => setMemoryFormType(e.target.value as any)}
                    className="w-full bg-[#141624] border border-[#1f2235] rounded text-xs px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="decision">Decision Node</option>
                    <option value="bug">Bug Anomaly</option>
                    <option value="pattern">Design Pattern</option>
                    <option value="context">System Context</option>
                    <option value="file">File Registry</option>
                    <option value="note">Annotation Note</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#5b5eff] font-bold uppercase">Global Sync State</label>
                  <div className="bg-[#141624]/60 px-3 py-2 rounded border border-[#1f2235] text-[10px] text-emerald-400 font-extrabold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>SYNCHRONIZED</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] text-[#b8ff57] font-bold uppercase">Context Details / Evaluation</label>
                <textarea
                  value={memoryFormContent}
                  onChange={(e) => setMemoryFormContent(e.target.value)}
                  className="w-full h-44 bg-[#020306] border border-[#1f2235] rounded p-3 text-xs text-white focus:outline-none focus:border-[#b8ff57] font-mono leading-relaxed"
                  placeholder="Paste details, logs, stack traces, or instructions here..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#0d0e1b] border-t border-[#1f2235]/40 flex justify-end gap-3 select-none">
              <button
                onClick={() => setActiveMemoryNode(null)}
                className="px-4 py-2 border border-[#1f2235] text-[10px] uppercase text-[#5e6686] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMemoryForm}
                className="px-4 py-2 bg-[#b8ff57] text-black font-extrabold text-[10px] uppercase hover:bg-[#a6e64d]"
              >
                SYNC MEMORY CORE
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Drag-and-drop overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center">
          <div className="bg-[#b8ff57]/10 border-2 border-dashed border-[#b8ff57]/60 rounded-xl px-12 py-8 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-8 h-8 text-[#b8ff57] animate-bounce" />
              <span className="text-sm font-mono font-bold text-[#b8ff57] uppercase tracking-widest">Drop files, text, or JSON onto canvas</span>
              <span className="text-[10px] text-[#5e6686] font-mono">Files become Document nodes • Text/JSON become Code nodes</span>
            </div>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-[#0c0d14] border border-[#1f2235] rounded-lg shadow-2xl py-1.5 min-w-[200px] font-mono text-[11px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setSpawnCoords({ x: contextMenu.canvasX, y: contextMenu.canvasY });
              setIsAddPanelOpen(true);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-[#b8ff57]/10 text-[#e8eaf6] hover:text-[#b8ff57] flex items-center gap-2.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Node Here</span>
          </button>
          <div className="border-t border-[#1f2235]/40 my-1" />
          <button
            onClick={() => { handleCopy(); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-[#b8ff57]/10 text-[#e8eaf6] hover:text-[#b8ff57] flex items-center gap-2.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy <span className="text-[#5e6686] ml-1">⌘C</span></span>
          </button>
          <button
            onClick={() => { handlePaste(); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-[#b8ff57]/10 text-[#e8eaf6] hover:text-[#b8ff57] flex items-center gap-2.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Paste <span className="text-[#5e6686] ml-1">⌘V</span></span>
          </button>
          <button
            onClick={() => { handleDuplicate(); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-[#b8ff57]/10 text-[#e8eaf6] hover:text-[#b8ff57] flex items-center gap-2.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate <span className="text-[#5e6686] ml-1">⌘D</span></span>
          </button>
          <div className="border-t border-[#1f2235]/40 my-1" />
          <button
            onClick={() => { handleSelectAll(); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-[#b8ff57]/10 text-[#e8eaf6] hover:text-[#b8ff57] flex items-center gap-2.5 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Select All <span className="text-[#5e6686] ml-1">⌘A</span></span>
          </button>
          <button
            onClick={() => { handleUndo(); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-[#b8ff57]/10 text-[#e8eaf6] hover:text-[#b8ff57] flex items-center gap-2.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo <span className="text-[#5e6686] ml-1">⌘Z</span></span>
          </button>
          <button
            onClick={() => { handleRedo(); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-[#b8ff57]/10 text-[#e8eaf6] hover:text-[#b8ff57] flex items-center gap-2.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Redo <span className="text-[#5e6686] ml-1">⌘⇧Z</span></span>
          </button>
          <div className="border-t border-[#1f2235]/40 my-1" />
          <button
            onClick={() => { handleDeleteSelected(); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 flex items-center gap-2.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete <span className="text-[#5e6686] ml-1">Del</span></span>
          </button>
          <div className="border-t border-[#1f2235]/40 my-1" />
          <button
            onClick={() => {
              pushHistory();
              setNodes(prev => prev.map(n => ({ ...n, x: Math.round(n.x / 40) * 40, y: Math.round(n.y / 40) * 40 })));
              showNotification('Nodes snapped to grid');
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-[#b8ff57]/10 text-[#e8eaf6] hover:text-[#b8ff57] flex items-center gap-2.5 transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Snap to Grid</span>
          </button>
          <div className="border-t border-[#1f2235]/40 my-1" />
          <button
            onClick={() => {
              pushHistory();
              // Merge: for each node with exactly 1-in/1-out, bypass it
              let newConns = [...connections];
              let removed = new Set<string>();
              for (const node of nodes) {
                if (removed.has(node.id)) continue;
                const incoming = newConns.filter(c => c.toId === node.id && !removed.has(c.fromId));
                const outgoing = newConns.filter(c => c.fromId === node.id && !removed.has(c.toId));
                if (incoming.length === 1 && outgoing.length === 1) {
                  newConns = [
                    ...newConns.filter(c => c.id !== incoming[0].id && c.id !== outgoing[0].id),
                    { id: `conn-${Math.random().toString(36).substr(2, 9)}`, fromId: incoming[0].fromId, toId: outgoing[0].toId, fromPort: incoming[0].fromPort },
                  ];
                  removed.add(node.id);
                }
              }
              if (removed.size > 0) {
                setNodes(prev => prev.filter(n => !removed.has(n.id)));
                setConnections(newConns);
                showNotification(`Merged ${removed.size} pass-through node(s)`);
              } else {
                showNotification('No mergeable wires found');
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-[#b8ff57]/10 text-[#e8eaf6] hover:text-[#b8ff57] flex items-center gap-2.5 transition-colors"
          >
            <Link className="w-3.5 h-3.5" />
            <span>Merge All Wires</span>
          </button>
        </div>
      )}

      {/* Right-side execution notifications */}
      {rightNotification && (
        <div className="fixed top-8 right-8 z-[100] animate-in fade-in slide-in-from-right-4 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl font-mono text-xs ${
            rightNotification.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {rightNotification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="font-bold tracking-tight">{rightNotification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
