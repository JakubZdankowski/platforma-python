import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { remarkHints } from './remarkHints';

export function MarkdownInstructions({ markdown }: { markdown: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkHints]} rehypePlugins={[rehypeSanitize]} skipHtml>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
