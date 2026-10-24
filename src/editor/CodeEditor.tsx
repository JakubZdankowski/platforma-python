import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, indentUnit, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { tags } from '@lezer/highlight';
import { indentGuides } from './indentGuides';

interface Props {
  value: string;
  onChange?: (value: string) => void;
  onRun?: () => void;
  label: string;
  helpId: string;
  readOnly?: boolean;
}

const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: 'var(--font-code)', backgroundColor: 'var(--surface-editor)', color: 'var(--code-text)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono)', lineHeight: '1.7' },
  '.cm-content': { padding: '20px 0', minHeight: '100%' },
  '.cm-line': { padding: '0 20px 0 12px' },
  '.cm-line.cm-indent-guides': {
    backgroundImage: 'repeating-linear-gradient(to right, rgba(163, 177, 198, 0.16) 0, rgba(163, 177, 198, 0.16) 1px, transparent 1px, transparent 4ch)',
    backgroundSize: 'var(--indent-guide-width) 100%',
    backgroundPosition: '12px 0',
    backgroundRepeat: 'no-repeat',
  },
  '.cm-gutters': { backgroundColor: 'var(--code-gutter)', color: 'var(--code-muted)', border: 'none', paddingLeft: '12px' },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '30px', paddingRight: '12px' },
  // drawSelection paints behind the line, so its tint must remain translucent.
  '.cm-activeLine': { backgroundColor: 'rgba(130, 169, 235, 0.06)' },
  '.cm-activeLineGutter': { backgroundColor: '#1b3856' },
  '.cm-cursor': { borderLeftColor: '#7fd6ff' },
  '.cm-selectionBackground': { backgroundColor: '#2b4263' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': { backgroundColor: '#3b6397' },
  '.cm-content ::selection, .cm-content::selection': { color: '#f4f7fc' },
  '&.cm-focused .cm-matchingBracket': { backgroundColor: '#30445f', color: '#eef3fa' },
}, { dark: true });

const highlighting = HighlightStyle.define([
  { tag: tags.keyword, color: '#ffcf6b' },
  { tag: [tags.string, tags.special(tags.string)], color: '#b5e8a6' },
  { tag: tags.number, color: '#ffb88a' },
  { tag: tags.comment, color: '#8aa7c4', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#7fd6ff' },
  { tag: tags.operator, color: '#ecf5ff' },
]);

export function CodeEditor({ value, onChange, onRun, label, helpId, readOnly = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onRun });
  const initial = useRef({ value, label, helpId, readOnly });
  const accessibility = useRef(new Compartment());
  const editing = useRef(new Compartment());
  const syncing = useRef(false);

  useEffect(() => { callbacks.current = { onChange, onRun }; }, [onChange, onRun]);

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initial.current.value,
        extensions: [
          lineNumbers(), highlightActiveLineGutter(), history(), drawSelection(),
          indentOnInput(), bracketMatching(), python(), highlightActiveLine(),
          indentUnit.of('    '), EditorState.tabSize.of(4),
          indentGuides,
          syntaxHighlighting(highlighting), editorTheme,
          editing.current.of([EditorState.readOnly.of(initial.current.readOnly), EditorView.editable.of(!initial.current.readOnly)]),
          accessibility.current.of(EditorView.contentAttributes.of({
            'aria-label': initial.current.label,
            'aria-describedby': initial.current.helpId,
            'aria-multiline': 'true',
            'aria-readonly': String(initial.current.readOnly),
            tabindex: '0',
            spellcheck: 'false',
          })),
          keymap.of([
            { key: 'Ctrl-Enter', run: (view) => { if (!view.state.readOnly) callbacks.current.onRun?.(); return true; } },
            { key: 'Meta-Enter', run: (view) => { if (!view.state.readOnly) callbacks.current.onRun?.(); return true; } },
            indentWithTab, ...defaultKeymap, ...historyKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.state.readOnly && !syncing.current) callbacks.current.onChange?.(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => { view.current = null; editor.destroy(); };
  }, []);

  useEffect(() => {
    const editor = view.current;
    if (editor && value !== editor.state.doc.toString()) {
      syncing.current = true;
      try { editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } }); }
      finally { syncing.current = false; }
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: accessibility.current.reconfigure(EditorView.contentAttributes.of({
      'aria-label': label, 'aria-describedby': helpId, 'aria-multiline': 'true', 'aria-readonly': String(readOnly), tabindex: '0', spellcheck: 'false',
    })) });
    view.current?.dispatch({ effects: editing.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]) });
  }, [label, helpId, readOnly]);

  return <div className="code-editor" ref={host} />;
}
