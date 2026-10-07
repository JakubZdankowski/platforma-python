import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

// Deliberately small format: flat frontmatter, no YAML objects or dependencies.
function parseDocument(source, filename) {
  source = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/.exec(source);
  if (!match) throw new Error(`${filename}: expected frontmatter`);
  const metadata = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const field = /^([a-z_]+):\s*(.*?)\s*$/.exec(line);
    if (!field || Object.hasOwn(metadata, field[1])) throw new Error(`${filename}: invalid or duplicate frontmatter field`);
    metadata[field[1]] = field[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  if (!metadata.title?.trim() || metadata.title.length > 200) throw new Error(`${filename}: title required (1–200 characters)`);
  return { metadata, body: match[2] };
}

export function parseExercise(source, filename) {
  const { metadata, body } = parseDocument(source, filename);
  const runtime = metadata.runtime;
  if (!['python-console', 'python-turtle'].includes(runtime)) throw new Error(`${filename}: invalid runtime`);
  let starter;
  const instructions = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    if (!opening) { instructions.push(lines[i]); continue; }
    const info = opening[2].trim();
    const content = [];
    const closing = new RegExp(`^ {0,3}${opening[1][0]}{${opening[1].length},}\\s*$`);
    let end = i + 1;
    for (; end < lines.length && !closing.test(lines[end]); end++) content.push(lines[end]);
    if (end === lines.length) throw new Error(`${filename}: unclosed code fence`);
    if (info === 'python starter') {
      if (starter !== undefined) throw new Error(`${filename}: duplicate starter block`);
      starter = content.join('\n') + (content.length ? '\n' : '');
    } else if (info !== 'python solution') {
      instructions.push(lines[i], ...content, lines[end]);
    }
    i = end;
  }
  if (starter === undefined) throw new Error(`${filename}: python starter block required`);
  return { title: metadata.title, instructions_markdown: instructions.join('\n').trim(), starter_code: starter, runtime_type: runtime };
}

export async function readCourse(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  // Accept either a single lesson directory or a course with lesson subdirectories.
  const directories = entries.some((entry) => entry.name === 'lesson.md' && entry.isFile())
    ? [directory] : entries.filter((entry) => entry.isDirectory()).map((entry) => join(directory, entry.name)).sort();
  if (!directories.length) throw new Error('No lesson directories found');
  const lessons = [];
  for (const [position, path] of directories.entries()) {
    const slug = basename(path);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) throw new Error(`Invalid lesson directory slug: ${slug}`);
    const { metadata } = parseDocument(await readFile(join(path, 'lesson.md'), 'utf8'), join(path, 'lesson.md'));
    const filenames = (await readdir(path)).filter((name) => /^exercise-\d+\.md$/.test(name)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    if (!filenames.length) throw new Error(`${path}: no exercise-NN.md files`);
    const exercises = [];
    for (const [index, filename] of filenames.entries()) {
      exercises.push({ ...parseExercise(await readFile(join(path, filename), 'utf8'), filename), slug: filename.slice(0, -3), position: index });
    }
    lessons.push({ slug, title: metadata.title, position, exercises });
  }
  return lessons;
}
