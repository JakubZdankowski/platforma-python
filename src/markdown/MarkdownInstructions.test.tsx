import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownInstructions } from './MarkdownInstructions';

describe('MarkdownInstructions', () => {
  it('renders Polish text, code, headings, lists and GFM tables', () => {
    const html = renderToStaticMarkup(<MarkdownInstructions markdown={'# Żółw\n\n**Ćwicz** `print()`\n\n- jeden\n\n| A | B |\n| - | - |\n| ą | ź |'} />);
    expect(html).toContain('<h1>Żółw</h1>');
    expect(html).toContain('<strong>Ćwicz</strong>');
    expect(html).toContain('<code>print()</code>');
    expect(html).toContain('<li>jeden</li>');
    expect(html).toContain('<table>');
  });

  it('removes executable HTML and dangerous link protocols', () => {
    const html = renderToStaticMarkup(<MarkdownInstructions markdown={'<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[link](javascript:alert%281%29)\n\n[docs](https://python.org)'} />);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="https://python.org"');
  });
});
