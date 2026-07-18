import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, Terminal, Copy, Check, Code, MessageSquare } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Message, AIModule } from '../types';
import { ResponseView } from './ResponseView';
import { RobotScene } from './RobotScene';
import { cn } from '../utils';
import { isCustomModel, getCustomProviderForModel, callCustomProvider } from '../lib/providers/registry';
import { logUsage } from '../lib/usageTracker';

interface PlaygroundProps {
  module: AIModule;
}

export function Playground({ module }: PlaygroundProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number} | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const contentRef = useRef('');
  const lastUpdateRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup all pending timeouts on unmount
  useEffect(() => {
    const refs = timeoutsRef;
    return () => { refs.current.forEach(clearTimeout); refs.current = []; };
  }, []);

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(t => t !== id);
      fn();
    }, ms);
    timeoutsRef.current.push(id);
  }, []);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const config = module.config;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status !== 429 && res.status !== 503) return res;
      if (attempt === maxRetries) return res;
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`Rate-limited (${res.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    }
    return new Response(null, { status: 503 });
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Construct few-shot prompt if training examples exist
      let prompt = input;
      if (module.training.length > 0) {
        const trainingText = module.training
          .filter(ex => ex.user && ex.model)
          .map(ex => `User: ${ex.user}\nModel: ${ex.model}`)
          .join('\n\n');
        prompt = `${trainingText}\n\nUser: ${input}\nModel:`;
      }

      const isImgModel = config.model.includes('image') || config.model.includes('happyhorse') || config.model.includes('banana') || config.model.includes('riverflow');
      let finalModelResponse = '';
      let streamMsgAdded = false;

      const customProvider = isCustomModel(config.model) ? getCustomProviderForModel(config.model) : undefined;

      if (customProvider) {
        try {
          const result = await callCustomProvider(
            customProvider,
            [
              ...(config.systemInstruction ? [{ role: 'system' as const, content: config.systemInstruction }] : []),
              ...messages.map(m => ({ role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.content })),
              { role: 'user' as const, content: prompt }
            ],
            {
              systemInstruction: config.systemInstruction,
              temperature: config.temperature,
              topP: config.topP,
              maxTokens: config.maxOutputTokens,
            }
          );
          finalModelResponse = result.content;
        } catch (err: any) {
          console.warn("Custom provider call failed.", err);
        }
      } else if (!isImgModel) {
        const wonderlandKey = localStorage.getItem('wonderland_master_key');
        let accumulated = '';

        try {
          abortControllerRef.current = new AbortController();
          setIsStreaming(true);

          const res = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: config.model,
              messages: [
                ...(config.systemInstruction ? [{ role: 'system', content: config.systemInstruction }] : []),
                ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
                { role: 'user', content: prompt }
              ],
              config: {
                temperature: config.temperature,
                topP: config.topP,
                maxTokens: config.maxOutputTokens,
              },
              wonderlandKey,
            }),
            signal: abortControllerRef.current.signal,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error || `HTTP ${res.status}`);
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          setMessages(prev => [...prev, { role: 'model', content: '', timestamp: Date.now() }]);
          streamMsgAdded = true;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                accumulated += delta;

                if (parsed.usage) {
                  setUsageInfo({
                    prompt_tokens: parsed.usage.prompt_tokens,
                    completion_tokens: parsed.usage.completion_tokens,
                    total_tokens: parsed.usage.total_tokens,
                  });
                  logUsage({
                    model: config.model,
                    promptTokens: parsed.usage.prompt_tokens || 0,
                    completionTokens: parsed.usage.completion_tokens || 0,
                    totalTokens: parsed.usage.total_tokens || 0,
                    status: 'success',
                  });
                }

                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'model') {
                    updated[updated.length - 1] = { ...last, content: accumulated };
                  }
                  return updated;
                });
              } catch {}
            }
          }

          finalModelResponse = accumulated;
          setIsSpeaking(true);
          safeTimeout(() => setIsSpeaking(false), 3000);
        } catch (err: any) {
          if (err.name === 'AbortError') {
            finalModelResponse = accumulated || ' ';
          } else {
            console.warn("Streaming failed, falling back to non-streaming.", err);
          }
        } finally {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }

        if (!finalModelResponse) {
          try {
            const res = await fetchWithRetry('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: config.model,
                messages: [
                  ...(config.systemInstruction ? [{ role: 'system', content: config.systemInstruction }] : []),
                  ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
                  { role: 'user', content: prompt }
                ],
                config: {
                  temperature: config.temperature,
                  topP: config.topP,
                  maxTokens: config.maxOutputTokens,
                },
                wonderlandKey,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              finalModelResponse = data.content;
              if (data.tokens || data.cost) {
                setUsageInfo({ total_tokens: data.tokens, cost: data.cost });
                logUsage({
                  model: config.model,
                  promptTokens: data.prompt_tokens || 0,
                  completionTokens: data.completion_tokens || 0,
                  totalTokens: data.tokens || 0,
                  cost: data.cost,
                  status: 'success',
                });
              }
            } else {
              const errData = await res.json().catch(() => ({}));
              console.warn(`Proxy API error (${res.status}): ${errData?.error || 'Unknown'}, falling through to Gemini.`);
            }
          } catch (err: any) {
            console.warn("Proxy call failed, falling through to Gemini.", err);
          }
        }
      }

      if (!finalModelResponse && !isImgModel) {
        const ai = new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY as any) });
        
        if (isImgModel) {
          const geminiModel = (config.model.startsWith('gemini-') && !config.model.includes('banana')) ? config.model : 'imagen-3.0-generate-002';
          const response = await ai.models.generateContent({
            model: geminiModel,
            contents: { parts: [{ text: prompt }] },
            config: {
              imageConfig: { aspectRatio: "1:1" }
            }
          });

          let imageUrl = '';
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }

          setMessages(prev => [...prev, {
            role: 'model',
            content: imageUrl ? `![Generated Image](${imageUrl})` : "Failed to generate image.",
            timestamp: Date.now(),
          }]);
        } else {
          const response = await ai.models.generateContent({
            model: config.model.startsWith('gemini-') ? config.model : 'gemini-3-flash-preview',
            contents: prompt,
            config: {
              systemInstruction: config.systemInstruction,
              temperature: config.temperature,
              topP: config.topP,
              topK: config.topK,
            },
          });

          let resultText = response.text || "No response received.";

          setMessages(prev => [...prev, {
            role: 'model',
            content: resultText,
            timestamp: Date.now(),
          }]);

          setIsSpeaking(true);
          safeTimeout(() => setIsSpeaking(false), 3000);
        }
      } else if (finalModelResponse && !streamMsgAdded) {
        setMessages(prev => [...prev, {
          role: 'model',
          content: finalModelResponse,
          timestamp: Date.now(),
        }]);

        setIsSpeaking(true);
        safeTimeout(() => setIsSpeaking(false), 3000);
      }
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: "Error: " + (error instanceof Error ? error.message : "Unknown error"),
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyEmbedCode = () => {
    const embedCode = `<iframe src="${window.location.origin}" width="100%" height="600px" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    safeTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] relative overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-[#2a2a2a] flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-[#E4E3E0]" />
          <div className="flex flex-col">
            <h1 className="font-serif italic text-xs text-[#E4E3E0] uppercase tracking-widest leading-none mb-1">{module.name}</h1>
            <span className="text-[9px] font-mono text-[#555] uppercase tracking-tighter">{config.model}</span>
          </div>
        </div>
        
        <button 
          onClick={copyEmbedCode}
          className="flex items-center gap-2 px-2 py-1 border border-[#2a2a2a] text-[9px] font-mono text-[#888] hover:text-[#E4E3E0] hover:border-[#E4E3E0] transition-all"
        >
          {copied ? <Check className="w-3 h-3" /> : <Code className="w-3 h-3" />}
          {copied ? 'COPIED!' : 'EMBED'}
        </button>
      </header>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {config.showRobot && (
          <div className="w-full h-[300px] border border-[#2a2a2a] mb-6 bg-[#141414] overflow-hidden group relative shrink-0">
            <RobotScene isThinking={isLoading} isSpeaking={isSpeaking} />
          </div>
        )}

        {messages.length === 0 && !config.showRobot && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
            <div className="w-12 h-12 border border-[#E4E3E0] rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-[#E4E3E0]" />
            </div>
            <p className="font-serif italic text-sm text-[#E4E3E0]">Ready for input</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isLastModelStreaming = isStreaming && msg.role === 'model' && idx === messages.length - 1;
          return (
          <div 
            key={idx} 
            className={cn(
              "flex flex-col gap-2 max-w-full",
              msg.role === 'user' ? "items-end" : "items-start"
            )}
          >
            <div className="flex items-center gap-2 px-1">
              <span className="text-[8px] font-mono text-[#444] uppercase tracking-widest">
                {msg.role === 'user' ? 'Input' : 'Response'}
              </span>
              {msg.role === 'model' && msg.content && usageInfo && !isStreaming && idx === messages.length - 1 && (
                <span className="text-[8px] font-mono text-[#555]">
                  ↑ {usageInfo.prompt_tokens ?? '?'} · ↓ {usageInfo.completion_tokens ?? '?'} · {usageInfo.total_tokens ?? '?'}t{usageInfo.cost ? ` · $${usageInfo.cost.toFixed(6)}` : ''}
                </span>
              )}
            </div>
            <div className={cn(
              "p-3 border transition-all duration-300 w-fit max-w-[90%]",
              msg.role === 'user' 
                ? "bg-[#141414] border-[#2a2a2a] text-[#E4E3E0]" 
                : "bg-transparent border-[#2a2a2a] text-[#E4E3E0]"
            )}>
              {msg.role === 'user' ? (
                <p className="text-xs font-sans whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <ResponseView content={msg.content} isStreaming={isLastModelStreaming} />
              )}
            </div>
          </div>
          );
        })}
        {isLoading && (
          <div className="flex flex-col gap-2 items-start animate-pulse">
             <span className="text-[8px] font-mono text-[#444] uppercase tracking-widest px-1">Processing...</span>
             <div className="p-3 border border-[#2a2a2a] w-24 h-10 bg-transparent"></div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-[#2a2a2a] bg-[#0a0a0a] shrink-0">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Enter prompt..."
            className="w-full bg-[#141414] border border-[#2a2a2a] p-3 pr-12 text-xs text-[#E4E3E0] font-sans focus:outline-none focus:border-[#E4E3E0] transition-all min-h-[60px] max-h-[150px] resize-none"
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="absolute right-3 bottom-3 p-1.5 bg-red-500 text-white hover:bg-red-400 transition-all"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 p-1.5 bg-[#E4E3E0] text-[#141414] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
