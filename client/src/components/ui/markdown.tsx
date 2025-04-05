import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={`font-mono text-sm px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded ${className}`} {...props}>
              {children}
            </code>
          );
        },
        // Apply styling to other markdown elements
        h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
        h4: ({ children }) => <h4 className="text-base font-medium mt-3 mb-1">{children}</h4>,
        p: ({ children }) => <p className="mb-4">{children}</p>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="list-disc pl-5 mb-4">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-4">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-neutral-300 dark:border-neutral-600 pl-4 py-2 mb-4 italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-neutral-50 dark:bg-neutral-800">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">{children}</tbody>,
        tr: ({ children }) => <tr>{children}</tr>,
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">{children}</th>
        ),
        td: ({ children }) => <td className="px-3 py-2 text-sm">{children}</td>,
        hr: () => <hr className="my-6 border-neutral-200 dark:border-neutral-700" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
