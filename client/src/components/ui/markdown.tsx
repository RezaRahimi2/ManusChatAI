import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const inline = !match;
            
            return !inline ? (
              <SyntaxHighlighter
                style={vscDarkPlus as any}
                language={match ? match[1] : ''}
                customStyle={{ 
                  borderRadius: '0.375rem',
                  margin: '1rem 0'
                }}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code 
                className="bg-neutral-100 dark:bg-neutral-900 px-1 py-0.5 rounded font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Custom table styling
          table: ({ children }: any) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </table>
            </div>
          ),
          // Custom link styling
          a: ({ children, href }: any) => (
            <a
              href={href}
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Custom blockquote styling
          blockquote: ({ children }: any) => (
            <blockquote
              className="border-l-4 border-neutral-300 dark:border-neutral-700 pl-4 py-1 my-4 text-neutral-600 dark:text-neutral-400"
            >
              {children}
            </blockquote>
          ),
          // Custom list styling
          ul: ({ children }: any) => (
            <ul className="list-disc pl-6 my-4">
              {children}
            </ul>
          ),
          ol: ({ children }: any) => (
            <ol className="list-decimal pl-6 my-4">
              {children}
            </ol>
          )
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default Markdown;