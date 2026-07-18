import React, { useState, useEffect } from 'react';
import { 
  Globe, Search, CheckCircle, Shield, Calendar, DollarSign, 
  Activity, ArrowRight, Zap, Sliders, Play, Info, AlertCircle
} from 'lucide-react';
import { cn } from '../utils';

interface ProviderDetail {
  id: string;
  name: string;
  description: string;
  website: string;
  status: 'operational' | 'degraded' | 'offline';
  uptime: string;
  avgLatency: string;
}

const PROVIDERS: ProviderDetail[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'A leading research and deployment company behind GPT-4o, Dall-E, and advanced vision/image foundations.',
    website: 'https://openai.com',
    status: 'operational',
    uptime: '99.96%',
    avgLatency: '320ms'
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Pioneers in multimodal transformer architectures, providing state-of-the-art Gemini Reasoning and Flash models.',
    website: 'https://deepmind.google',
    status: 'operational',
    uptime: '99.98%',
    avgLatency: '240ms'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'An AI safety and research company, creators of the highly capable Claude Fable and Claude Sonnet families.',
    website: 'https://anthropic.com',
    status: 'operational',
    uptime: '99.97%',
    avgLatency: '410ms'
  },
  {
    id: 'sakana',
    name: 'Sakana AI',
    description: 'A Tokyo-based laboratory focused on nature-inspired swarm architectures and evolutionary model merges.',
    website: 'https://sakana.ai',
    status: 'operational',
    uptime: '100.0%',
    avgLatency: '180ms'
  },
  {
    id: 'sourceful',
    name: 'Sourceful',
    description: 'Unified text-to-image and image-to-image families utilizing multi-step reasoning planning engines.',
    website: 'https://sourceful.io',
    status: 'operational',
    uptime: '99.94%',
    avgLatency: '820ms'
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    description: 'Host of the MAI family and enterprise-grade models via Azure AI Studio and Azure Foundry pipelines.',
    website: 'https://azure.microsoft.com',
    status: 'operational',
    uptime: '99.95%',
    avgLatency: '350ms'
  },
  {
    id: 'xai',
    name: 'xAI',
    description: 'Grok reasoning engines featuring high-fidelity real-world grounding and photorealistic visual synthesis.',
    website: 'https://x.ai',
    status: 'operational',
    uptime: '99.91%',
    avgLatency: '460ms'
  },
  {
    id: 'cohere',
    name: 'Cohere',
    description: 'Enterprise NLP, embeddings, agentic coding models (North Mini), and search grounding APIs.',
    website: 'https://cohere.com',
    status: 'operational',
    uptime: '99.97%',
    avgLatency: '290ms'
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'A conversational search engine and developer API host providing state-of-the-art text and grounding embedding pipelines.',
    website: 'https://perplexity.ai',
    status: 'operational',
    uptime: '99.95%',
    avgLatency: '210ms'
  },
  {
    id: 'nvidia',
    name: 'NVIDIA',
    description: 'Global leader in AI hardware and software architectures, offering high-fidelity microservice models via NIM endpoints.',
    website: 'https://nvidia.com',
    status: 'operational',
    uptime: '99.99%',
    avgLatency: '150ms'
  }
];

interface ProviderModel {
  providerId: string;
  name: string;
  tokens: string;
  description: string;
  releaseDate: string;
  contextSize: string;
  inputCost: string;
  outputCost: string;
  features?: string[];
}

const PROVIDER_IMAGE_MODELS: ProviderModel[] = [
  // OpenAI
  {
    providerId: 'openai',
    name: 'OpenAI: GPT Image 2',
    tokens: '382K tokens',
    description: "OpenAI's latest image generation model. Supports high-fidelity image generation and editing via the dedicated Images API.",
    releaseDate: 'Jun 23, 2026',
    contextSize: '400K context',
    inputCost: '$8/M input tokens',
    outputCost: '$8/M output tokens',
    features: ['High-fidelity textures', 'Transparent backgrounds', 'Multi-step canvas editing']
  },
  {
    providerId: 'openai',
    name: 'OpenAI: GPT Image 1 Mini',
    tokens: '57K tokens',
    description: "A cost-efficient variant of GPT Image 1 for high-quality image generation at reduced latency and cost via OpenAI's dedicated Images API.",
    releaseDate: 'Jun 23, 2026',
    contextSize: '400K context',
    inputCost: '$2.50/M input tokens',
    outputCost: '$2.50/M output tokens',
    features: ['Low latency', 'Cost-effective exploration', 'Compact footprint']
  },
  {
    providerId: 'openai',
    name: 'OpenAI: GPT Image 1',
    tokens: '61K tokens',
    description: "OpenAI's GPT Image 1 generates and edits images via the dedicated Images API. Features accurate text rendering, transparent backgrounds, and up to 16 reference images for edits.",
    releaseDate: 'Jun 23, 2026',
    contextSize: '400K context',
    inputCost: '$10/M input tokens',
    outputCost: '$10/M output tokens',
    features: ['Multi-image reference edits', 'Custom font layering', 'Accurate layout adherence']
  },
  
  // Google
  {
    providerId: 'google',
    name: 'Google: Nano Banana 2 (Gemini 3.1 Flash Image)',
    tokens: '858M tokens',
    description: "Gemini 3.1 Flash Image, a.k.a. 'Nano Banana 2,' is Google’s latest state of the art image generation and editing model, delivering Pro-level visual quality at Flash speed. It combines advanced contextual understanding with fast, cost-efficient inference, making complex image generation and iterative edits significantly more accessible. Aspect ratios can be controlled with the image_config API Parameter.",
    releaseDate: 'Jun 17, 2026',
    contextSize: '131K context',
    inputCost: '$0.50/M input tokens',
    outputCost: '$3/M output tokens',
    features: ['Flash inference speed', 'Pro-level aesthetic grades', 'Aspect ratio config']
  },
  {
    providerId: 'google',
    name: 'Google: Nano Banana Pro (Gemini 3 Pro Image)',
    tokens: '586M tokens',
    description: "Nano Banana Pro is Google’s most advanced image-generation and editing model, built on Gemini 3 Pro. It extends the original Nano Banana with significantly improved multimodal reasoning, real-world grounding, and high-fidelity visual synthesis. The model generates context-rich graphics, from infographics and diagrams to cinematic composites, and can incorporate real-time information via Search grounding. It offers industry-leading text rendering in images (including long passages and multilingual layouts), consistent multi-image blending, and accurate identity preservation across up to five subjects. Nano Banana Pro adds fine-grained creative controls such as localized edits, lighting and focus adjustments, camera transformations, and support for 2K/4K outputs and flexible aspect ratios.",
    releaseDate: 'Jun 17, 2026',
    contextSize: '66K context',
    inputCost: '$2/M input tokens',
    outputCost: '$12/M output tokens',
    features: ['4K resolution support', 'Multilingual inline text', 'Subject identity locking', 'Realtime search grounding']
  },

  // Sourceful
  {
    providerId: 'sourceful',
    name: 'Sourceful: Riverflow V2.5 Pro',
    tokens: '30.4M tokens',
    description: "Riverflow V2.5 Pro is the most powerful variant of Sourceful's Riverflow 2.5 lineup, best for top-tier control and quality-sensitive outputs. The Riverflow 2.5 series is a unified text-to-image and image-to-image family that treats generation as a production workflow, using an integrated reasoning model to plan multi-step edits and judge candidates before accepting a result. Riverflow 2.5 combines their reasoning with a mix of closed and open image diffusion models to provide greater accuracy and steerability. Reasoning effort is controllable via the reasoning parameter (low/medium/high/xhigh) - higher levels do more editing passes and apply a stricter internal judge, with xhigh suited to batch runs that need high repeatability. It generates at 1K, 2K, and 4K resolution and accepts up to 10 input images for editing. Pricing is dynamic: cost is finalized per job at completion based on billable processing.",
    releaseDate: 'Jun 4, 2026',
    contextSize: '33K context',
    inputCost: 'from $0.13/image (dynamic)',
    outputCost: 'Included',
    features: ['Controllable reasoning loops', 'Custom scoring (scoring_prompt)', 'Custom brand font rendering', 'Up to 10 edit input assets']
  },
  {
    providerId: 'sourceful',
    name: 'Sourceful: Riverflow V2.5 Fast',
    tokens: '40.4M tokens',
    description: "Riverflow V2.5 Fast is the speed-optimized variant of Sourceful's Riverflow 2.5 lineup, best for production deployments and latency-critical workflows. The Riverflow 2.5 series is a unified text-to-image and image-to-image family that treats generation as a production workflow, using an integrated reasoning model to plan multi-step edits and judge candidates before accepting a result. Reasoning effort is controllable via the reasoning parameter (low/medium/high) - higher levels do more editing passes and apply a stricter internal judge, while lower levels return faster for early exploration. It generates at 1K and 2K resolution (no 4K) and accepts up to 4 input images for editing. Pricing is dynamic: cost is finalized per job at completion based on billable processing.",
    releaseDate: 'Jun 4, 2026',
    contextSize: '33K context',
    inputCost: 'from $0.019/image (dynamic)',
    outputCost: 'Included',
    features: ['Low latency generation', 'Dynamic job completion cost', 'Custom background control']
  },

  // Microsoft
  {
    providerId: 'microsoft',
    name: 'Microsoft: MAI-Image-2.5',
    tokens: '68.5M tokens',
    description: "Microsoft's MAI-Image-2.5 is a high-quality image generation model available via Azure AI Foundry. It produces photorealistic and artistic images from text prompts with support for various aspect ratios.",
    releaseDate: 'Jun 2, 2026',
    contextSize: '4K context',
    inputCost: '$5/M tokens',
    outputCost: 'Included',
    features: ['Photorealistic outputs', 'Azure AI Foundry integrated', 'Artistic style embeddings']
  },

  // xAI
  {
    providerId: 'xai',
    name: 'xAI: Grok Imagine Image Quality',
    tokens: '1.32B tokens',
    description: "Grok Imagine Image Quality is xAI's fast, high-fidelity image generation and editing model. It accepts text prompts and optional reference images, producing photorealistic outputs at 1K or 2K across a range of aspect ratios, including flexible adjustment of reference images. The model emphasizes realistic detail — natural lighting and physics, accurate textures, and consistent rendering of named entities such as brands, public figures, and specific locations. It supports clean multilingual text rendering inside images, making it the top choice for posters, packaging, ads, menus, and social graphics. When given reference images, it preserves identity and structure for product placement, brand-aligned variations, and character continuity across scenes.",
    releaseDate: 'May 18, 2026',
    contextSize: '66K context',
    inputCost: 'from $0.05/image',
    outputCost: 'Included',
    features: ['Named figure continuity', 'Natural lighting physics', 'High-density brand rendering', 'Multilingual graphic design text']
  }
];

const PROVIDER_EMBEDDING_MODELS: ProviderModel[] = [
  // Google
  {
    providerId: 'google',
    name: 'Google: Gemini Embedding 2',
    tokens: '6.71B tokens',
    description: "Gemini Embedding 2 is Google's first multimodal embedding model. We currently support mapping text and images into a unified vector space for semantic search and retrieval-augmented generation (RAG). It supports input context up to 8,192 tokens and flexible output dimensions from 128 to 3,072 (recommended: 768, 1536, or 3,072). Designed for cross-modal similarity — you can embed a text query and retrieve the most relevant images, or vice versa — making it well-suited for multimodal search, recommendation, and document understanding pipelines.",
    releaseDate: 'May 20, 2026',
    contextSize: '8K context',
    inputCost: '$0.20/M tokens',
    outputCost: 'Included',
    features: ['Multimodal vector mapping', 'Semantic search & RAG', 'Flexible output (128 - 3072 dims)', 'Cross-modal image retrieval']
  },
  {
    providerId: 'google',
    name: 'Google: Gemini Embedding 2 Preview',
    tokens: '1.78B tokens',
    description: "Gemini Embedding 2 Preview is Google's first multimodal embedding model. We currently support mapping text and images into a unified vector space for semantic search and retrieval-augmented generation (RAG). It supports input context up to 8,192 tokens and flexible output dimensions from 128 to 3,072 (recommended: 768, 1536, or 3,072). Designed for cross-modal similarity — you can embed a text query and retrieve the most relevant images, or vice versa — making it well-suited for multimodal search, recommendation, and document understanding pipelines.",
    releaseDate: 'Apr 17, 2026',
    contextSize: '8K context',
    inputCost: '$0.20/M tokens',
    outputCost: 'Included',
    features: ['Multimodal vector mapping', 'RAG development target', 'Experimental cross-modal queries']
  },
  // Perplexity
  {
    providerId: 'perplexity',
    name: 'Perplexity: Embed V1 4B',
    tokens: '3.96B tokens',
    description: "pplx-embed-v1-4B is one of Perplexity's state-of-the-art text embedding models built for real-world, web-scale retrieval. pplx-embed-v1 is optimized for standard dense text retrieval with the 4B parameter model maximizing retrieval quality.",
    releaseDate: 'Mar 15, 2026',
    contextSize: '32K context',
    inputCost: '$0.03/M tokens',
    outputCost: 'Included',
    features: ['Dense text retrieval optimized', 'Web-scale index search', 'High-quality dense vectorization']
  },
  {
    providerId: 'perplexity',
    name: 'Perplexity: Embed V1 0.6B',
    tokens: '31.2B tokens',
    description: "pplx-embed-v1-0.6B is one of Perplexity's state-of-the-art text embedding models built for real-world, web-scale retrieval. pplx-embed-v1 is optimized for standard dense text retrieval with the 0.6B parameter model targeting lightweight, low-latency embedding generation.",
    releaseDate: 'Mar 15, 2026',
    contextSize: '32K context',
    inputCost: '$0.004/M tokens',
    outputCost: 'Included',
    features: ['Lightweight signature', 'Low latency execution', 'High-throughput text retrieval']
  },
  // NVIDIA
  {
    providerId: 'nvidia',
    name: 'NVIDIA: Llama Nemotron Embed VL 1B V2 (free)',
    tokens: '3.75B tokens',
    description: "The Llama Nemotron Embed VL 1B V2 embedding model is optimized for multimodal question-answering retrieval. The model can embed 'documents' in the form of image, text, or image and text combined. Documents can be retrieved given a user query in text form. The model supports images containing text, tables, charts, and infographics.",
    releaseDate: 'Feb 25, 2026',
    contextSize: '131K context',
    inputCost: '$0/M input tokens',
    outputCost: '$0/M output tokens',
    features: ['Multimodal QA retrieval', 'Structured image analysis (tables, charts)', 'Zero-cost NIM execution']
  }
];

export function ProvidersView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProvider, setExpandedProvider] = useState<string | null>('openai');
  const [activeCategoryTab, setActiveCategoryTab] = useState<'image' | 'embeddings'>('image');

  const filteredProviders = PROVIDERS.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (expandedProvider) {
      const p = PROVIDERS.find(prov => prov.id === expandedProvider);
      if (p) {
        const hasImages = PROVIDER_IMAGE_MODELS.some(m => m.providerId === p.id);
        const hasEmbeddings = PROVIDER_EMBEDDING_MODELS.some(m => m.providerId === p.id);
        if (!hasImages && hasEmbeddings) {
          setActiveCategoryTab('embeddings');
        } else {
          setActiveCategoryTab('image');
        }
      }
    }
  }, [expandedProvider]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080c] p-6 lg:p-8 space-y-8 scrollbar-thin">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f2235]/40 pb-6">
        <div>
          <div className="text-[10px] text-[#b8ff57] bg-[#b8ff57]/10 px-2 py-0.5 rounded w-max uppercase tracking-widest font-mono font-bold mb-2 border border-[#b8ff57]/20">
            Infrastructure Grid
          </div>
          <h2 className="text-xl font-serif italic font-bold text-[#E4E3E0] tracking-tight">
            AI Service Providers
          </h2>
          <p className="text-xs font-mono text-[#5e6686] mt-1">
            Status indexes of underlying AI corporations, network performance logs, and their specialized multimodal image-generation & embedding pipelines.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-72 font-mono">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#5e6686]" />
          <input
            type="text"
            placeholder="Filter providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0c0d12] border border-[#1f2235] text-[10px] px-8 py-2 rounded focus:outline-none focus:border-[#b8ff57] text-[#E4E3E0]"
          />
        </div>
      </div>

      {/* Grid of Providers */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Providers list */}
        <div className="xl:col-span-1 space-y-3 font-mono">
          <div className="text-[9px] uppercase tracking-wider text-[#808eb5] block font-bold mb-2">// Active Host Registry</div>
          
          {filteredProviders.map((p) => {
            const isSelected = expandedProvider === p.id;
            const imageModelCount = PROVIDER_IMAGE_MODELS.filter(m => m.providerId === p.id).length;
            const embeddingModelCount = PROVIDER_EMBEDDING_MODELS.filter(m => m.providerId === p.id).length;
            const totalModelCount = imageModelCount + embeddingModelCount;
            
            return (
              <div
                key={p.id}
                onClick={() => setExpandedProvider(p.id)}
                className={cn(
                  "border p-4 rounded cursor-pointer transition-all flex flex-col justify-between h-28 hover:scale-[1.01]",
                  isSelected 
                    ? "bg-[#0c0d12]/90 border-[#b8ff57] shadow-[0_0_15px_rgba(184,255,87,0.1)]" 
                    : "bg-[#0c0d12]/50 border-[#1f2235]/60 hover:border-[#1f2235]"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-white font-extrabold text-sm tracking-tight">{p.name}</span>
                    <span className="text-[8px] text-[#5e6686] block uppercase mt-0.5">{p.website}</span>
                  </div>
 
                  <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-[#b8ff57]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b8ff57] animate-pulse" />
                    {p.uptime}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-[#1f2235]/30 pt-2 text-[9px] text-[#808eb5]">
                  <span>Latency: <strong className="text-[#5b5eff]">{p.avgLatency}</strong></span>
                  {totalModelCount > 0 && (
                    <span className="text-amber-500 font-bold uppercase tracking-wider text-[8px]">
                      {imageModelCount} IMAGE / {embeddingModelCount} EMBED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed model view for selected Provider */}
        <div className="xl:col-span-2 space-y-4 font-mono">
          {expandedProvider ? (() => {
            const p = PROVIDERS.find(prov => prov.id === expandedProvider);
            if (!p) return null;
            const imageModels = PROVIDER_IMAGE_MODELS.filter(m => m.providerId === p.id);
            const embeddingModels = PROVIDER_EMBEDDING_MODELS.filter(m => m.providerId === p.id);
            const totalCount = imageModels.length + embeddingModels.length;

            return (
              <div className="bg-[#0c0d12]/90 border border-[#1f2235]/60 p-6 rounded shadow-md space-y-6">
                
                {/* Header detail */}
                <div className="border-b border-[#1f2235]/40 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-white tracking-tight">{p.name} Infrastructure Portal</h3>
                    <p className="text-xs text-slate-300 leading-normal max-w-xl">{p.description}</p>
                  </div>
                  
                  <div className="shrink-0 bg-[#07080d] border border-[#1f2235] p-2.5 rounded text-[9.5px] space-y-1">
                    <div className="flex justify-between gap-4"><span className="text-[#5e6686]">STATUS:</span> <span className="text-emerald-400 font-bold">OPERATIONAL</span></div>
                    <div className="flex justify-between gap-4"><span className="text-[#5e6686]">UPTIME:</span> <span className="text-[#b8ff57] font-bold">{p.uptime}</span></div>
                  </div>
                </div>

                {/* Category tabs */}
                <div className="flex border-b border-[#1f2235]/30 gap-6">
                  <button
                    onClick={() => setActiveCategoryTab('image')}
                    className={cn(
                      "text-[10px] font-mono uppercase pb-2.5 px-1 border-b-2 transition-all font-bold tracking-wider",
                      activeCategoryTab === 'image'
                        ? "border-amber-500 text-amber-500"
                        : "border-transparent text-[#808eb5] hover:text-slate-300"
                    )}
                  >
                    Image Models ({imageModels.length})
                  </button>
                  <button
                    onClick={() => setActiveCategoryTab('embeddings')}
                    className={cn(
                      "text-[10px] font-mono uppercase pb-2.5 px-1 border-b-2 transition-all font-bold tracking-wider",
                      activeCategoryTab === 'embeddings'
                        ? "border-[#b8ff57] text-[#b8ff57]"
                        : "border-transparent text-[#808eb5] hover:text-slate-300"
                    )}
                  >
                    Embedding Models ({embeddingModels.length})
                  </button>
                </div>

                {/* Associated Models rendering under tabs */}
                <div className="space-y-6">
                  {activeCategoryTab === 'image' ? (
                    imageModels.length === 0 ? (
                      <div className="border border-[#1f2235]/40 bg-[#07080d] p-8 text-center rounded text-slate-500 text-xs font-mono">
                        <AlertCircle className="w-8 h-8 mx-auto text-[#5e6686] mb-2 opacity-50" />
                        No active specialized image models cached in this provider's grid.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-[10px] uppercase tracking-wider text-[#808eb5] font-bold border-b border-[#1f2235]/30 pb-1">// Active Specialized Image Models</div>
                        <div className="space-y-4">
                          {imageModels.map((m, idx) => (
                            <div key={idx} className="border border-[#1f2235]/50 bg-[#07080d]/60 rounded p-5 space-y-4 hover:border-amber-500/30 transition-colors">
                              
                              {/* Upper specs */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f2235]/30 pb-3">
                                <div>
                                  <h4 className="text-white font-extrabold text-xs">{m.name}</h4>
                                  <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded-sm mt-1 inline-block uppercase font-bold tracking-widest">
                                    {m.tokens}
                                  </span>
                                </div>
                                
                                <div className="text-right text-[9px] font-bold">
                                  <div className="text-[#b8ff57]">{m.inputCost}</div>
                                  {m.outputCost !== 'Included' && <div className="text-[#5e6686] text-[8px]">{m.outputCost}</div>}
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-[10px] text-slate-300 leading-relaxed">
                                {m.description}
                              </p>

                              {/* Key parameters */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[9.5px] bg-[#07080d] p-3 border border-[#1f2235]/40 rounded-sm">
                                <div>
                                  <span className="text-[#5e6686] uppercase block">Context Envelope</span>
                                  <span className="text-white font-bold">{m.contextSize}</span>
                                </div>
                                <div>
                                  <span className="text-[#5e6686] uppercase block">Release Sync</span>
                                  <span className="text-purple-400 font-bold">{m.releaseDate}</span>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                  <span className="text-[#5e6686] uppercase block">API Reference</span>
                                  <span className="text-[#5b5eff] font-bold">image_config</span>
                                </div>
                              </div>

                              {/* Bullet points */}
                              {m.features && (
                                <div className="space-y-1.5">
                                  <span className="text-[8px] uppercase tracking-wider text-[#5e6686] block font-bold">// Engine Capabilities:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {m.features.map((f, fIdx) => (
                                      <span key={fIdx} className="bg-[#141624] border border-[#1f2235] text-slate-300 text-[8.5px] px-2 py-0.5 rounded">
                                        ✓ {f}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ) : (
                    embeddingModels.length === 0 ? (
                      <div className="border border-[#1f2235]/40 bg-[#07080d] p-8 text-center rounded text-slate-500 text-xs font-mono">
                        <AlertCircle className="w-8 h-8 mx-auto text-[#5e6686] mb-2 opacity-50" />
                        No active specialized embedding models cached in this provider's grid.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-[10px] uppercase tracking-wider text-[#808eb5] font-bold border-b border-[#1f2235]/30 pb-1">// Active Specialized Embedding Models</div>
                        <div className="space-y-4">
                          {embeddingModels.map((m, idx) => (
                            <div key={idx} className="border border-[#1f2235]/50 bg-[#07080d]/60 rounded p-5 space-y-4 hover:border-[#b8ff57]/30 transition-colors">
                              
                              {/* Upper specs */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f2235]/30 pb-3">
                                <div>
                                  <h4 className="text-white font-extrabold text-xs">{m.name}</h4>
                                  <span className="text-[8px] bg-[#b8ff57]/10 text-[#b8ff57] border border-[#b8ff57]/20 px-1 rounded-sm mt-1 inline-block uppercase font-bold tracking-widest">
                                    {m.tokens}
                                  </span>
                                </div>
                                
                                <div className="text-right text-[9px] font-bold">
                                  <div className="text-[#b8ff57]">{m.inputCost}</div>
                                  {m.outputCost !== 'Included' && <div className="text-[#5e6686] text-[8px]">{m.outputCost}</div>}
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-[10px] text-slate-300 leading-relaxed">
                                {m.description}
                              </p>

                              {/* Key parameters */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[9.5px] bg-[#07080d] p-3 border border-[#1f2235]/40 rounded-sm">
                                <div>
                                  <span className="text-[#5e6686] uppercase block">Context Envelope</span>
                                  <span className="text-white font-bold">{m.contextSize}</span>
                                </div>
                                <div>
                                  <span className="text-[#5e6686] uppercase block">Release Sync</span>
                                  <span className="text-purple-400 font-bold">{m.releaseDate}</span>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                  <span className="text-[#5e6686] uppercase block">API Reference</span>
                                  <span className="text-[#5b5eff] font-bold">vector_config</span>
                                </div>
                              </div>

                              {/* Bullet points */}
                              {m.features && (
                                <div className="space-y-1.5">
                                  <span className="text-[8px] uppercase tracking-wider text-[#5e6686] block font-bold">// Engine Capabilities:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {m.features.map((f, fIdx) => (
                                      <span key={fIdx} className="bg-[#141624] border border-[#1f2235] text-slate-300 text-[8.5px] px-2 py-0.5 rounded">
                                        ✓ {f}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>

              </div>
            );
          })() : (
            <div className="bg-[#0c0d12]/50 border border-[#1f2235]/40 p-12 text-center rounded text-[#5e6686]">
              Select an AI company on the left to inspect detailed infrastructure status and specialized image model weights.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
