import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { remarkHints } from './remarkHints';

export function MarkdownInstructions({ markdown }: { markdown: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkHints]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
