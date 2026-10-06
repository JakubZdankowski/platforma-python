import type { Exercise } from './types';

export const sampleExercise: Exercise = {
  id: 'pierwszy-program',
  title: 'Pierwszy program',
  instructionsMarkdown: 'Uruchom program i sprawdź, co pojawi się w konsoli.\n\nNastępnie zmień tekst na własny.',
  starterCode: 'print("Hello!")\n',
  runtimeType: 'python-console',
};

export const turtleSampleExercise: Exercise = {
  id: 'kwadrat',
  title: 'Narysuj kwadrat',
  instructionsMarkdown: [
    'Żółw chodzi po ekranie i rysuje linię za sobą.',
    '- `forward(100)` — idź 100 kroków do przodu,\n- `left(90)` — obróć się w lewo o 90 stopni.',
    'Uruchom program i zobacz kwadrat. Potem zmień długość boku albo dodaj na początku `color("red")`.',
  ].join('\n\n'),
  starterCode: 'for i in range(4):\n    forward(100)\n    left(90)\n',
  runtimeType: 'python-turtle',
};

/** Local demo exercises until lessons are stored in the database. */
export const sampleExercises: readonly Exercise[] = [sampleExercise, turtleSampleExercise];
