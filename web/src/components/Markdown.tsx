import { memo } from 'react';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';

/**
 * Markdown renderer for assistant replies.
 *
 * Safety: raw HTML is *not* enabled (no rehype-raw), so model output is rendered
 * as text/structured markdown only — never as executable markup.
 */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          a: ({ node: _node, ...rest }) => (
            <a {...rest} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

/** Default export so the renderer can be code-split with React.lazy(). */
export default Markdown;
