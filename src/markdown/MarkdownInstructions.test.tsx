import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownInstructions } from './MarkdownInstructions';

describe('MarkdownInstructions', () => {
  it('collapses hints while leaving the next section and code examples outside', () => {
    const html = renderToStaticMarkup(<MarkdownInstructions markdown={'## Zadanie\n\nZrób zadanie.\n\n### Podpowiedź\n\nUżyj **pętli**.\n\n#### Dodatkowa wskazówka\n\n`range(4)`\n\n### Sprawdź wynik\n\nCztery boki.\n\n```python\n# Podpowiedź\nprint("przykład")\n```\n\n### Podpowiedź 2\n\nDruga wskazówka.'} />);
    expect(html).toContain('<details><summary>Podpowiedź</summary>');
    expect(html).toContain('<strong>pętli</strong>');
    expect(html).toMatch(/<\/details>\s*<h3>Sprawdź wynik<\/h3>/);
    expect(html).toContain('<details><summary>Podpowiedź 2</summary>');
    expect(html.match(/<details>/g)).toHaveLength(2);
    expect(html).not.toContain(' open');
  });

  it('renders Polish text, code, headings, lists and GFM tables', () => {
    const html = renderToStaticMarkup(<MarkdownInstructions markdown={'# Żółw\n\n**Ćwicz** `print()`\n\n- jeden\n\n| A | B |\n| - | - |\n| ą | ź |'} />);
    expect(html).toContain('<h1>Żółw</h1>');
    expect(html).toContain('<strong>Ćwicz</strong>');
    expect(html).toContain('<code>print()</code>');
    expect(html).toContain('<li>jeden</li>');
    expect(html).toContain('<table>');
  });

  it('renders HTML line breaks after tables and separators', () => {
    const html = renderToStaticMarkup(<MarkdownInstructions markdown={'| A | B |\n| --- | --- |\n| 1 | 2 |\n\n<br>\n\nPo tabeli.\n\n---\n\n<br />\n\nPo separatorze.\n\nTekst<br>drugi wiersz.'} />);
    expect(html).toMatch(/<\/table>\s*<br\/>\s*<p>Po tabeli\.<\/p>/);
    expect(html).toMatch(/<hr\/>\s*<br\/>\s*<p>Po separatorze\.<\/p>/);
    expect(html).toContain('<p>Tekst<br/>drugi wiersz.</p>');
  });

  it('renders a headerless HTML table and preserves literal HTML in code examples', () => {
    const html = renderToStaticMarkup(<MarkdownInstructions markdown={'<table><tr><td>print()</td><td>Wyświetla tekst</td></tr></table>\n\n`<br>`\n\n```html\n<br>\n```'} />);
    expect(html).toContain('<table><tbody><tr><td>print()</td><td>Wyświetla tekst</td></tr></tbody></table>');
    expect(html).not.toContain('<thead>');
    expect(html).toContain('<code>&lt;br&gt;</code>');
    expect(html).toContain('<pre><code class="language-html">&lt;br&gt;');
  });

  it('sanitizes raw HTML attributes, protocols and embedded active content', () => {
    const html = renderToStaticMarkup(<MarkdownInstructions markdown={'<div onclick="alert(1)" style="position:fixed"><strong>Bezpieczny tekst</strong><script>alert(1)</script><iframe src="https://example.com"></iframe><img src="javascript:alert(1)" onerror="alert(1)"><a href="javascript:alert(1)">Link</a></div>'} />);
    expect(html).toContain('<strong>Bezpieczny tekst</strong>');
    expect(html).not.toMatch(/<script|<iframe|onclick|onerror|style=|javascript:|alert\(1\)/);
  });

  it('removes executable HTML and dangerous link protocols', () => {
    const html = renderToStaticMarkup(<MarkdownInstructions markdown={'<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[link](javascript:alert%281%29)\n\n[docs](https://python.org)'} />);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="https://python.org"');
  });
});
