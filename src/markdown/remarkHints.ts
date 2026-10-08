interface MarkdownNode {
  type: string;
  depth?: number;
  value?: string;
  children?: MarkdownNode[];
  data?: { hName?: string; [key: string]: unknown };
}

function text(node: MarkdownNode): string {
  return node.value ?? node.children?.map(text).join('') ?? '';
}

/** Collapse hint sections until the next heading of the same or higher level. */
export function remarkHints() {
  return (tree: MarkdownNode) => {
    const nodes = tree.children;
    if (!nodes) return;
    const result: MarkdownNode[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      if (node.type !== 'heading' || !/^(?:mała\s+)?podpowiedź(?:\s+\d+)?$/iu.test(text(node).trim())) {
        result.push(node);
        continue;
      }
      const content: MarkdownNode[] = [];
      while (i + 1 < nodes.length) {
        const next = nodes[i + 1]!;
        if (next.type === 'heading' && next.depth! <= node.depth!) break;
        content.push(next);
        i++;
      }
      result.push({
        type: 'hint', data: { hName: 'details' },
        children: [{ ...node, data: { ...node.data, hName: 'summary' } }, ...content],
      });
    }
    tree.children = result;
  };
}
