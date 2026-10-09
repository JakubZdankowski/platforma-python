import { useEffect, useId, useRef, useState } from 'react';
import type { Exercise } from '../exercises/types';

interface Props {
  exercises: readonly Exercise[];
  selectedIndex: number;
  disabled: boolean;
  labels: { navigation: string; previous: string; next: string; exercises: string };
  onSelect: (index: number) => void;
}

const arrow = (direction: 'left' | 'right') => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d={direction === 'left' ? 'M10 3 5 8l5 5' : 'm6 3 5 5-5 5'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Previous/next navigation shared by the playground and assigned lessons. */
export function SampleExercisePicker({ exercises, selectedIndex, disabled, labels, onSelect }: Props) {
  const current = exercises[selectedIndex];
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  return (
    <nav className="exercise-picker" aria-label={labels.navigation}>
      <button type="button" className="exercise-picker-button" disabled={disabled || selectedIndex <= 0} onClick={() => onSelect(selectedIndex - 1)}>
        {arrow('left')}<span className="exercise-picker-label">{labels.previous}</span>
      </button>
      {current && (
        <div className="exercise-picker-dropdown" ref={container} onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }} onKeyDown={(event) => {
          if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
        }}>
          <button ref={trigger} type="button" className="exercise-picker-button exercise-picker-current" aria-expanded={open} aria-controls={listId} disabled={disabled} onClick={() => setOpen(!open)}>
            {labels.exercises} · {selectedIndex + 1}/{exercises.length}<span aria-hidden="true">⌄</span>
          </button>
          <ol id={listId} className="exercise-picker-list" hidden={!open} aria-label={labels.navigation}>
            {exercises.map((exercise, index) => <li key={exercise.id}>
              <button type="button" disabled={disabled} aria-current={index === selectedIndex ? 'step' : undefined} onClick={() => {
                setOpen(false); trigger.current?.focus(); onSelect(index);
              }}><span>{index + 1}.</span><span>{exercise.title}</span>{index === selectedIndex && <span aria-hidden="true">✓</span>}</button>
            </li>)}
          </ol>
        </div>
      )}
      <button type="button" className="exercise-picker-button" disabled={disabled || selectedIndex >= exercises.length - 1} onClick={() => onSelect(selectedIndex + 1)}>
        <span className="exercise-picker-label">{labels.next}</span>{arrow('right')}
      </button>
    </nav>
  );
}
