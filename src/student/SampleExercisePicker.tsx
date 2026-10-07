import type { Exercise } from '../exercises/types';

interface Props {
  exercises: readonly Exercise[];
  selectedIndex: number;
  disabled: boolean;
  labels: { navigation: string; previous: string; next: string };
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
  return (
    <nav className="exercise-picker" aria-label={labels.navigation}>
      <button type="button" className="exercise-picker-button" disabled={disabled || selectedIndex <= 0} onClick={() => onSelect(selectedIndex - 1)}>
        {arrow('left')}<span className="exercise-picker-label">{labels.previous}</span>
      </button>
      {current && (
        <button type="button" className="exercise-picker-button exercise-picker-current" aria-current="step" disabled={disabled} onClick={() => onSelect(selectedIndex)}>
          {selectedIndex + 1}. {current.title}
        </button>
      )}
      <button type="button" className="exercise-picker-button" disabled={disabled || selectedIndex >= exercises.length - 1} onClick={() => onSelect(selectedIndex + 1)}>
        <span className="exercise-picker-label">{labels.next}</span>{arrow('right')}
      </button>
    </nav>
  );
}
