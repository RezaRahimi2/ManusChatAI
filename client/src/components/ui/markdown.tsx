import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Markdown renderer with syntax highlighting and GitHub flavored markdown
 */
export default function Markdown({ 
  children, 
  className 
}: MarkdownProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props: any) {
            const { className, children, inline } = props;
            const match = /language-(\w+)/.exec(className || '');
            const language = match && match[1] ? match[1] : '';
            
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                className="rounded-md text-sm"
                showLineNumbers={true}
                customStyle={{
                  margin: '1.5em 0',
                  borderRadius: '0.375rem',
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={cn("bg-muted px-1.5 py-0.5 rounded-sm text-sm font-mono", className)} {...props}>
                {children}
              </code>
            );
          },
          // Enhance links
          a: ({ href, children, ...props }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
              {...props}
            >
              {children}
            </a>
          ),
          // Add rounded style to images
          img: ({ src, alt, ...props }) => (
            <img 
              src={src} 
              alt={alt || ''} 
              className="rounded-md" 
              {...props} 
            />
          ),
          // Style tables
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="border-collapse table-auto w-full text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          // Style table headers
          th: ({ children, ...props }) => (
            <th 
              className="border-b border-muted-foreground/20 px-4 py-2 text-left font-medium" 
              {...props}
            >
              {children}
            </th>
          ),
          // Style table cells
          td: ({ children, ...props }) => (
            <td 
              className="border-b border-muted-foreground/10 px-4 py-2" 
              {...props}
            >
              {children}
            </td>
          ),
          // Enhance blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote 
              className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground" 
              {...props}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}