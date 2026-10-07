import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExercise, readCourse } from './content-parser.mjs';

const document = (body) => `---\ntitle: "Zażółć gęślą jaźń"\nruntime: python-console\n---\n${body}`;
test('extracts starter and removes solutions without damaging ordinary fenced code', () => {
  const parsed = parseExercise(document('## Zadanie\n```python\nprint("example")\n```\n```python starter\nprint("start")\n```\n```python solution\nSECRET_SOLUTION\n```'), 'exercise-01.md');
  assert.equal(parsed.starter_code, 'print("start")\n');
  assert.equal(parsed.title, 'Zażółć gęślą jaźń');
  assert.equal(parsed.instructions_markdown, '## Zadanie\n```python\nprint("example")\n```');
  assert.ok(!JSON.stringify(parsed).includes('SECRET_SOLUTION'));
});
test('rejects malformed content before import', () => {
  assert.throws(() => parseExercise(document('```python starter\nx\n'), 'exercise-01.md'), /unclosed/);
  assert.throws(() => parseExercise(document('instructions only'), 'exercise-01.md'), /starter/);
  assert.throws(() => parseExercise(document('```python starter\nx\n```\n```python starter\ny\n```'), 'exercise-01.md'), /duplicate/);
});
test('supports CRLF and longer fences; nested examples remain instructions', () => {
  const parsed = parseExercise(document('````markdown\n```python solution\nexample\n```\n````\n~~~python starter\nx = 1\n~~~').replaceAll('\n', '\r\n'), 'exercise-01.md');
  assert.equal(parsed.starter_code, 'x = 1\n');
  assert.ok(parsed.instructions_markdown.includes('example'));
});
test('loads the public sample course in lesson/exercise order', async () => {
  const lessons = await readCourse('course-example');
  assert.equal(lessons.length, 1);
  assert.deepEqual(lessons[0].exercises.map((e) => e.runtime_type), ['python-console', 'python-turtle']);
});
