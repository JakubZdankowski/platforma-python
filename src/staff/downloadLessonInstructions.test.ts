import { describe, expect, it, vi } from 'vitest';
import { downloadFile } from '../app/downloadFile';
import { downloadLessonInstructions } from './downloadLessonInstructions';

vi.mock('../app/downloadFile', () => ({ downloadFile: vi.fn() }));

const lessonTitle = 'Żółw / Python';
const exercises = [
  { title: 'Pierwsze ćwiczenie', markdown: 'Użyj **pętli**.\n\n```python\nprint("żółw")\n```' },
  { title: 'Drugie <ćwiczenie>', markdown: '### Podpowiedź\n\nUżyj `range()`.\n\n<script>alert(1)</script>' },
];

describe('downloadLessonInstructions', () => {
  it('combines the original Markdown for every exercise in order', async () => {
    await downloadLessonInstructions(lessonTitle, exercises, 'md');
    expect(downloadFile).toHaveBeenLastCalledWith(
      `# Żółw / Python\n\n## Pierwsze ćwiczenie\n\n${exercises[0]!.markdown}\n\n---\n\n## Drugie \\<ćwiczenie\\>\n\n${exercises[1]!.markdown}\n`,
      'Instrukcje - Żółw - Python.md',
      'text/markdown;charset=utf-8',
    );
  });

  it('downloads a complete HTML document with each exercise rendered safely', async () => {
    await downloadLessonInstructions(lessonTitle, exercises, 'html');
    const [content, filename, type] = vi.mocked(downloadFile).mock.lastCall!;
    expect(filename).toBe('Instrukcje - Żółw - Python.html');
    expect(type).toBe('text/html;charset=utf-8');
    expect(content).toMatch(/^<!doctype html>\n<html lang="pl">/);
    expect(content).toContain('<title>Żółw / Python</title>');
    expect(content).toContain('<strong>pętli</strong>');
    expect(content).toContain('<pre><code class="language-python">');
    expect(content).toContain('<h2>Drugie &lt;ćwiczenie&gt;</h2>');
    expect(content).toContain('<details><summary>Podpowiedź</summary>');
    expect(content).not.toContain('<script');
    expect(content).toMatch(/<\/body><\/html>$/);
  });
});
