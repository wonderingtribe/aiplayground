import ReactMarkdown from 'react-markdown';
import { cn } from '../utils';

interface ResponseViewProps {
  content: string;
  isStreaming?: boolean;
}

export function ResponseView({ content, isStreaming }: ResponseViewProps) {
  return (
    <div className={cn(
      "prose prose-invert max-w-none font-sans text-sm leading-relaxed",
      "markdown-body",
      isStreaming && "after:content-['▋'] after:ml-1 after:animate-pulse"
    )}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
