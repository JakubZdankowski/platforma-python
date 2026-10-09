import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { ExerciseListPicker } from '../student/SampleExercisePicker';
import './ui-lab.css';

const defaults = {
  '--background': '#0c1320', '--surface': '#111c2d', '--surface-raised': '#162235',
  '--surface-editor': '#0f1828', '--border': '#29384e', '--text': '#e2e8f0',
  '--text-muted': '#a3b1c6', '--accent': '#82a9eb', '--control-radius': '5px',
  '--button-size': '14px', '--exercise-list-size': '14px', '--exercise-list-padding': '7px',
};
type Tokens = typeof defaults;
const names = ['Tło strony', 'Tło paneli', 'Tło przycisków', 'Tło edytora', 'Obramowania', 'Tekst', 'Tekst pomocniczy', 'Akcent', 'Zaokrąglenie przycisków', 'Tekst przycisków', 'Tekst listy ćwiczeń', 'Odstęp pionowy wiersza'];
const storageKey = 'python-ui-lab-v1';
function initial(): Tokens {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key,
      typeof saved[key] === 'string' && (value.startsWith('#') ? /^#[\da-f]{6}$/i : /^\d{1,2}px$/).test(saved[key]) ? saved[key] : value])) as Tokens;
  } catch { return defaults; }
}
const exercises = ['Powitanie', 'Kwadrat', 'Dłuższa nazwa ćwiczenia: zmienne i obliczenia'].map((title, index) => ({ id: String(index), title, instructionsMarkdown: '', starterCode: '', runtimeType: 'python-console' as const }));

export default function UiLab() {
  const [tokens, setTokens] = useState(initial);
  const [selected, setSelected] = useState(1);
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState('');
  const css = `/* Ustawienia wyglądu platformy */\n:root {\n${Object.entries(tokens).map(([key, value]) => `  ${key}: ${value};`).join('\n')}\n}\n`;
  function update(next: Tokens) {
    setTokens(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setNotice('Wariant zapisany w tej przeglądarce.'); }
    catch { setNotice('Podgląd działa, ale przeglądarka nie pozwala zapisać wariantu. Pobierz CSS.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'platforma-ui.css'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <main className="ui-lab">
    <header className="ui-lab-header"><div><p className="eyebrow">WARSZTAT UI</p><h1>Komponenty i wygląd</h1><p>Zmieniaj wartości i oglądaj efekt. Twój wariant nie zmienia strony uczniów.</p></div><Link to="/">Wróć do platformy</Link></header>
    <div className="ui-lab-layout">
      <aside className="ui-lab-controls"><h2>Ustawienia CSS</h2>
        {Object.entries(tokens).map(([key, value], index) => <label className="ui-lab-control" key={key}><span>{names[index]}<code>{key}</code></span>
          {value.startsWith('#') ? <input aria-label={names[index]} type="color" value={value} onChange={(e) => update({ ...tokens, [key]: e.target.value })} /> : <input aria-label={names[index]} type="number" min={key.includes('size') ? 10 : 0} max={key.includes('size') ? 24 : 20} value={parseInt(value)} onChange={(e) => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) update({ ...tokens, [key]: `${Math.max(key.includes('size') ? 10 : 0, Math.min(key.includes('size') ? 24 : 20, n))}px` }); }} />}
        </label>)}
        <button className="button button-secondary" onClick={() => update(defaults)}>Przywróć ustawienia</button>
        <p role="status">{notice}</p>
        <details><summary>CSS do zastosowania w projekcie</summary><p>Pobierz wariant i przekaż go do wdrożenia. Możesz też edytować pokazane zmienne: kolory HEX i rozmiary w px.</p><textarea aria-label="Edytor zmiennych CSS" value={draft || css} onChange={(event) => setDraft(event.target.value)} rows={16} /><button className="button button-secondary" onClick={() => {
          const source = draft || css;
          const next = { ...tokens };
          for (const key of Object.keys(defaults) as (keyof Tokens)[]) {
            const match = source.match(new RegExp(`${key}\\s*:\\s*([^;]+);`));
            const value = match?.[1]?.trim();
            const numeric = Number.parseFloat(value ?? '');
            if (!value || (defaults[key].startsWith('#') ? !/^#[\da-f]{6}$/i.test(value) : !/^\d{1,2}px$/.test(value) || numeric < (key.includes('size') ? 10 : 0) || numeric > (key.includes('size') ? 24 : 20))) {
              setNotice(`Nieprawidłowa lub brakująca wartość: ${key}.`); return;
            }
            next[key] = value;
          }
          update(next); setDraft('');
        }}>Zastosuj CSS w podglądzie</button></details>
        <button className="button button-primary" onClick={download}>Pobierz CSS</button>
      </aside>
      <div className="ui-lab-canvas"><div className="ui-lab-toolbar"><h2>Podgląd komponentów</h2><label><input type="checkbox" checked={mobile} onChange={(e) => setMobile(e.target.checked)} /> Wąski ekran (390 px)</label></div>
        <p className="ui-lab-hint">Najedź kursorem, użyj Tab, kliknij listę i pola, aby zobaczyć stany interakcji. Przykłady używają danych demonstracyjnych.</p>
        <div className={`ui-lab-preview${mobile ? ' is-mobile' : ''}`} style={tokens as CSSProperties}>
          <section><h2>Przyciski</h2><p>Domyślny · wyłączony · najechanie · fokus klawiatury</p><div className="ui-lab-row">{['primary', 'secondary', 'quiet', 'stop'].map((variant) => <div key={variant}><button className={`button button-${variant}`}>{variant === 'primary' ? 'Uruchom' : variant === 'secondary' ? 'Zapisz' : variant === 'stop' ? 'Zatrzymaj' : 'Anuluj'}</button><button disabled className={`button button-${variant}`}>Niedostępny</button></div>)}</div></section>
          <section><h2>Lekcja i lista ćwiczeń</h2><p>Kliknij nazwę lekcji. Wybór zadania zmienia aktywny wiersz.</p><div className="ui-lab-lesson"><div className="panel-heading instructions-heading"><ExerciseListPicker exercises={exercises} selectedIndex={selected} disabled={false} title="Pierwsza lekcja" labels={{ navigation: 'Ćwiczenia lekcji', previous: 'Poprzednie', next: 'Następne', exercises: 'Ćwiczenia' }} onSelect={setSelected} /></div><div className="instructions-content"><span className="exercise-number">Ćwiczenie {selected + 1} · {exercises[selected]!.title}</span><p>Napisz swój pierwszy program w Pythonie.</p></div></div><p>Stan wyłączony</p><div className="panel-heading instructions-heading"><ExerciseListPicker exercises={exercises} selectedIndex={0} disabled title="Lekcja niedostępna podczas uruchamiania" labels={{ navigation: 'Niedostępne ćwiczenia', previous: '', next: '', exercises: '' }} onSelect={() => {}} /></div></section>
          <section><h2>Pola formularza</h2><div className="ui-lab-fields"><label className="field">Nazwa modułu<input placeholder="Np. Podstawy Pythona" /></label><label className="field">Wypełnione<input defaultValue="Pierwsza lekcja" /></label><label className="field">Wyłączone<input disabled value="Brak uprawnień" readOnly /></label><label className="field">Błąd<input aria-invalid="true" aria-describedby="lab-error" defaultValue="" /></label><p id="lab-error" className="form-error">Wpisz nazwę modułu.</p><label><input type="checkbox" defaultChecked /> Materiał udostępniony</label><label><input type="checkbox" disabled /> Opcja niedostępna</label></div></section>
          <section><h2>Materiały</h2><details className="material-module"><summary className="material-toggle">1. Podstawy Pythona</summary><div className="material-lessons"><div className="module-lesson-link"><span className="module-lesson-index">01</span><span className="module-lesson-title">Pierwsza lekcja<small>W trakcie</small></span><span>→</span></div></div></details><div className="student-empty">Nie masz jeszcze materiałów</div><p role="status">Ładowanie materiałów…</p><div className="form-error">Nie udało się pobrać materiałów.<button className="button button-secondary">Spróbuj ponownie</button></div></section>
          <section><h2>Edytor, konsola i zapis</h2><div className="ui-lab-fields"><div className="editor-panel"><div className="panel-heading"><h2>Twój kod</h2><span className="language-badge">Python</span></div><pre>print("Cześć!")</pre></div><div className="output-panel"><div className="panel-heading"><h2>Konsola</h2></div><pre>Cześć!</pre></div>{['Zapisano', 'Zapisywanie…', 'Nie zapisano — ponawiam…'].map((status) => <p key={status}>{status}</p>)}<div className="form-error">ZeroDivisionError: division by zero</div></div></section>
        </div>
      </div>
    </div>
  </main>;
}
