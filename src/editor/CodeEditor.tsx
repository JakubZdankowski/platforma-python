import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { tags } from '@lezer/highlight';

interface Props {
  value: string;
  onChange?: (value: string) => void;
  onRun?: () => void;
  label: string;
  helpId: string;
  readOnly?: boolean;
}

const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '16px', backgroundColor: 'var(--surface-editor)', color: 'var(--text)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { overflow: 'auto', fontFamily: 'Consolas, "Liberation Mono", monospace', lineHeight: '1.7' },
  '.cm-content': { padding: '20px 0', minHeight: '100%' },
  '.cm-line': { padding: '0 20px 0 12px' },
  '.cm-gutters': { backgroundColor: 'var(--surface-editor)', color: 'var(--text-subtle)', border: 'none', paddingLeft: '12px' },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '30px', paddingRight: '12px' },
  // drawSelection paints behind the line, so its tint must remain translucent.
  '.cm-activeLine': { backgroundColor: 'rgba(130, 169, 235, 0.06)' },
  '.cm-activeLineGutter': { backgroundColor: '#18253a' },
  '.cm-cursor': { borderLeftColor: '#a8c7f4' },
  '.cm-selectionBackground': { backgroundColor: '#2b4263' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': { backgroundColor: '#3b6397' },
  '.cm-content ::selection, .cm-content::selection': { color: '#f4f7fc' },
  '&.cm-focused .cm-matchingBracket': { backgroundColor: '#30445f', color: '#eef3fa' },
}, { dark: true });

const highlighting = HighlightStyle.define([
  { tag: tags.keyword, color: '#c4b5e7' },
  { tag: [tags.string, tags.special(tags.string)], color: '#abd2b2' },
  { tag: tags.number, color: '#ddbe91' },
  { tag: tags.comment, color: '#94a3b8', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#a8c7f4' },
  { tag: tags.operator, color: '#bdc7d8' },
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
