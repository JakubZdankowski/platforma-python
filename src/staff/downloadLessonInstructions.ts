import { downloadFile } from '../app/downloadFile';

export type LessonInstructionsFormat = 'md' | 'html';

interface InstructionsSection {
  title: string;
  markdown: string;
}

function escapeMarkdownHeading(title: string) {
  return title.replace(/[\r\n]+/g, ' ').replace(/[\\`*_[\]<>#~&]/g, '\\$&');
}

export async function downloadLessonInstructions(
  title: string,
  exercises: readonly InstructionsSection[],
  format: LessonInstructionsFormat,
) {
  const lessonTitle = title.trim() || 'Lekcja bez tytułu';
  const filenameTitle = lessonTitle.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-');
  const filename = `Instrukcje - ${filenameTitle}.${format}`;
  const sections = exercises.map((exercise, index) => ({
    title: exercise.title.trim() || `Ćwiczenie ${index + 1}`,
    markdown: exercise.markdown,
  }));

  if (format === 'md') {
    const heading = `# ${escapeMarkdownHeading(lessonTitle)}`;
    const instructions = sections.map(section => `## ${escapeMarkdownHeading(section.title)}\n\n${section.markdown}`);
    const content = `${heading}\n\n${instructions.join('\n\n---\n\n')}\n`;
    downloadFile(content, filename, 'text/markdown;charset=utf-8');
    return;
  }

  const { renderLessonInstructionsHtml } = await import('./renderLessonInstructionsHtml');
  downloadFile(renderLessonInstructionsHtml(lessonTitle, sections), filename, 'text/html;charset=utf-8');
}
