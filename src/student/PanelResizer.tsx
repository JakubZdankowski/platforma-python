import { useEffect, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

export const MIN_OUTPUT_WIDTH = 260;
export const MIN_EDITOR_WIDTH = 320;
const KEYBOARD_STEP = 24;

interface Props {
  label: string;
  editorRef: RefObject<HTMLElement | null>;
  outputRef: RefObject<HTMLElement | null>;
  /** New width of the output column in CSS pixels, or null for the default width. */
  onResize: (width: number | null) => void;
}

/** Width the output column may take from the space it shares with the editor. */
export function clampOutputWidth(width: number, sharedWidth: number): number {
  return Math.round(Math.min(Math.max(width, MIN_OUTPUT_WIDTH), Math.max(MIN_OUTPUT_WIDTH, sharedWidth - MIN_EDITOR_WIDTH)));
}

/**
 * Drag handle between the editor and the output column. Narrowing one widens the other.
 * Keyboard: arrows resize, Enter or double-click restores the default.
 */
export function PanelResizer({ label, editorRef, outputRef, onResize }: Props) {
  const [dragging, setDragging] = useState(false);
  const [editorShare, setEditorShare] = useState<number>();

  const widths = () => {
    const editor = editorRef.current?.getBoundingClientRect().width ?? 0;
    const output = outputRef.current?.getBoundingClientRect().width ?? 0;
    return { output, shared: editor + output };
  };

  useEffect(() => {
    const editor = editorRef.current;
    const output = outputRef.current;
    if (!editor || !output) return;
    const measure = () => {
      const { output: outputWidth, shared } = widths();
      if (shared > 0) setEditorShare(Math.round(((shared - outputWidth) / shared) * 100));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(editor);
    observer.observe(output);
    return () => observer.disconnect();
  }, [editorRef, outputRef]);

  useEffect(() => {
    document.body.classList.toggle('is-resizing', dragging);
    return () => document.body.classList.remove('is-resizing');
  }, [dragging]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const start = widths();
    handle.setPointerCapture(event.pointerId);
    setDragging(true);
    const move = (moveEvent: globalThis.PointerEvent) => {
      // The output column is on the right: moving the handle left widens it.
      onResize(clampOutputWidth(start.output - (moveEvent.clientX - startX), start.shared));
    };
    const end = () => {
      setDragging(false);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const { output, shared } = widths();
    if (event.key === 'ArrowLeft') onResize(clampOutputWidth(output + KEYBOARD_STEP, shared));
    else if (event.key === 'ArrowRight') onResize(clampOutputWidth(output - KEYBOARD_STEP, shared));
    else if (event.key === 'Enter') onResize(null);
    else return;
    event.preventDefault();
  };

  return (
    <div
      className={`panel-resizer${dragging ? ' is-dragging' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={editorShare}
      tabIndex={0}
      title={label}
      onPointerDown={startDrag}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onResize(null)}
    />
  );
}
