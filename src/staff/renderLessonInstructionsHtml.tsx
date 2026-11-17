import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownInstructions } from '../markdown/MarkdownInstructions';

const styles = `
  body { max-width: 72ch; margin: 2rem auto; padding: 0 1rem; font: 1rem/1.6 system-ui, sans-serif; overflow-wrap: anywhere; }
  h1, h2, h3 { line-height: 1.25; }
  section + section { border-top: 1px solid #d7e3f2; margin-top: 2rem; }
  pre { overflow: auto; padding: 0.75rem; background: #f3f7fc; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; display: block; overflow: auto; }
  th, td { border: 1px solid #d7e3f2; padding: 0.25rem 0.5rem; }
  summary { cursor: pointer; }
`;

export function renderLessonInstructionsHtml(title: string, sections: readonly { title: string; markdown: string }[]) {
  const markup = renderToStaticMarkup(
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <style>{styles}</style>
      </head>
      <body>
        <main>
          <h1>{title}</h1>
          {sections.map((section, index) => <section key={index}>
            <h2>{section.title}</h2>
            <MarkdownInstructions markdown={section.markdown} />
          </section>)}
        </main>
      </body>
    </html>,
  );
  return `<!doctype html>\n${markup}`;
}
