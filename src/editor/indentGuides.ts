import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';

function guides(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const tabSize = view.state.tabSize;
  const columns = (text: string) => {
    let count = 0;
    for (const character of text) {
      if (character === ' ') count++;
      else if (character === '\t') count += tabSize - count % tabSize;
      else break;
    }
    return count;
  };
  for (const { from, to } of view.visibleRanges) {
    for (let position = doc.lineAt(from).from; position <= to;) {
      const line = doc.lineAt(position);
      let depth = columns(line.text);
      // Continue block guides across empty lines without extending them into dedented code.
      if (!line.text.trim()) {
        let before = line.number - 1, after = line.number + 1;
        while (before > 0 && !doc.line(before).text.trim()) before--;
        while (after <= doc.lines && !doc.line(after).text.trim()) after++;
        depth = before > 0 ? columns(doc.line(before).text) : 0;
        if (after <= doc.lines) depth = Math.min(depth, columns(doc.line(after).text));
      }
      const levels = Math.floor(depth / 4);
      if (levels) builder.add(line.from, line.from, Decoration.line({
        attributes: { class: 'cm-indent-guides', style: `--indent-guide-width: ${levels * 4}ch` },
      }));
      if (line.to === doc.length) break;
      position = line.to + 1;
    }
  }
  return builder.finish();
}

export const indentGuides = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = guides(view); }
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) this.decorations = guides(update.view);
  }
}, { decorations: plugin => plugin.decorations });
