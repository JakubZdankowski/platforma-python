import { useState } from 'react';
import { sampleExercises } from '../exercises/sampleExercise';
import type { Locale, Messages } from '../i18n/en';
import { ExercisePage } from './ExercisePage';

export function PlaygroundPage({ messages, locale }: { messages: Messages; locale: Locale }) {
  const [index, setIndex] = useState(0);
  const [codes, setCodes] = useState(() => sampleExercises.map((exercise) => exercise.starterCode));
  const exercise = sampleExercises[index]!;
  return <ExercisePage messages={messages} locale={locale} exercise={exercise} exercises={sampleExercises}
    exerciseIndex={index} code={codes[index]!} onSelect={setIndex}
    onChange={(code) => setCodes((previous) => previous.map((value, i) => i === index ? code : value))} />;
}
