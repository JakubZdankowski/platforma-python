import { Notice } from '../app/ui/Patterns';
import { Button } from '../app/ui/Button';
import { useRef } from 'react';
import { Link, useParams } from 'react-router';
import { MarkdownInstructions } from '../markdown/MarkdownInstructions';
import { publicationLabels } from './MaterialsPage';
import { useMaterialEditor } from './useMaterialEditor';
import './material-authoring.css';

export function MaterialEditorPage() {
  const { lessonId = 'new' } = useParams();
  return <MaterialEditor key={lessonId} lessonId={lessonId} />;
}
function MaterialEditor({ lessonId }: { lessonId: string }) {
  const { state, actions } = useMaterialEditor(lessonId);
  const { id, title, exercises, selected, status, admin, base, loading, busy, error, notice, dirty, editable } = state;
  const exercise = exercises[selected];
  const textarea = useRef<HTMLTextAreaElement>(null);
  function insert(before: string, after = '') {
    const input = textarea.current;
    if (!input || !exercise) return;
    const start = input.selectionStart, end = input.selectionEnd;
    actions.updateExercise({ markdown: exercise.markdown.slice(0, start) + before + exercise.markdown.slice(start, end) + after + exercise.markdown.slice(end) });
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + before.length, end + before.length); });
  }
  return <main className="account-page material-author authoring-workspace">
    <nav className="authoring-breadcrumb" aria-label="Ścieżka nawigacji"><Link to={`${base}/materials`}>Materiały</Link><span aria-hidden="true">/</span><span>Edytor lekcji</span></nav>
    <header className="authoring-header"><div><p className="authoring-eyebrow">PRACOWNIA NAUCZYCIELA</p><h1>{lessonId === 'new' ? 'Nowa lekcja' : title}</h1><p className="authoring-intro">Wszystko pod ręką. Pisz, sprawdzaj i układaj ćwiczenia.</p></div>
      {!loading && !error && <p className={`authoring-status authoring-status-${status}`}><span className="sr-only">Status: </span><strong>{publicationLabels[status]}</strong></p>}
    </header>
    {loading && <Notice>Wczytywanie…</Notice>}
    {error && <Notice tone="error">{error}<Button onClick={actions.retry}>Ponów</Button></Notice>}
    {!loading && !error && <>
      {!admin && status === 'pending' && <Notice>Materiał czeka na decyzję administratora. Edycja będzie dostępna po zwrocie do poprawy.</Notice>}
      {!admin && status === 'approved' && <Notice>Zatwierdzona lekcja jest dostępna do odczytu. Możesz utworzyć nową lekcję na jej podstawie.</Notice>}
      <fieldset disabled={busy} className="module-editor-fields authoring-fields"><legend className="sr-only">Edycja lekcji</legend>
        <div className="authoring-topbar">
          <label className="field authoring-lesson-title">Tytuł lekcji<input required maxLength={200} readOnly={!editable} value={title} onChange={event => actions.changeTitle(event.target.value)} /></label>
          <div className="authoring-actions">
            {editable && <><Button onClick={() => void actions.saveDraft()}>Zapisz szkic</Button><Button variant="primary" onClick={() => void (admin ? actions.approve() : actions.submitForApproval())}>{admin ? 'Zatwierdź i zapisz' : 'Wyślij do zatwierdzenia'}</Button></>}
            {admin && status === 'pending' && <Button onClick={() => void actions.saveDraft()}>Zwróć do poprawy</Button>}
            {!admin && status === 'approved' && <Button onClick={actions.copyToDraft}>Utwórz kopię do edycji</Button>}
          </div>
        </div>
        <div className="authoring-studio">
          <aside className="authoring-outline" aria-label="Ćwiczenia lekcji">
            <h2 className="authoring-section-label">ĆWICZENIA <span>{String(exercises.length).padStart(2, '0')}</span></h2>
            <div className="authoring-exercises">{exercises.map((item, index) => <Button unstyled type="button" key={item.id ?? index} className={`exercise-tab authoring-exercise${item.hidden ? ' is-hidden' : ''}`} onClick={() => actions.selectExercise(index)} aria-pressed={selected === index}>
              <span className="authoring-number">{index + 1}. </span><span className="authoring-exercise-text">{item.title}{item.hidden && <span className="exercise-hidden-label"> — Ukryte</span>}<span className="authoring-runtime" aria-hidden="true" data-label={item.runtime === 'python-turtle' ? 'Żółw' : 'Konsola'} /></span>
            </Button>)}</div>
            {editable && <Button variant="quiet" className="authoring-add" onClick={actions.addExercise}>+ Ćwiczenie</Button>}
          </aside>
          <div className="authoring-editor">{exercise ? <>
            <div className="authoring-exercise-controls"><span>Ćwiczenie {selected + 1} z {exercises.length}</span>
              {editable && <div className="authoring-exercise-actions" role="group" aria-label="Kolejność wybranego ćwiczenia">
                <Button size="compact" disabled={selected === 0} onClick={() => actions.moveExercise(-1)} aria-label="Przesuń wcześniej" title="Przesuń wcześniej">Wcześniej</Button>
                <Button size="compact" disabled={selected === exercises.length - 1} onClick={() => actions.moveExercise(1)} aria-label="Przesuń później" title="Przesuń później">Później</Button>
                <Button size="compact" onClick={actions.toggleHidden}>{exercise.hidden ? 'Pokaż uczniom' : 'Ukryj'}</Button><Button variant="quiet" size="compact" onClick={actions.removeExercise}>Usuń ćwiczenie</Button>
              </div>}
            </div>
            <div className="authoring-details">
              <label className="field">Tytuł ćwiczenia<input maxLength={200} readOnly={!editable} value={exercise.title} onChange={event => actions.updateExercise({ title: event.target.value })} /></label>
              <label className="field">Środowisko<select disabled={!editable} value={exercise.runtime} onChange={event => actions.updateExercise({ runtime: event.target.value })}><option value="python-console">Python — konsola</option><option value="python-turtle">Python — żółw</option></select></label>
            </div>
            <div className="authoring-split">
              <section className="authoring-write" aria-label="Redagowanie instrukcji"><h2 className="authoring-section-label">INSTRUKCJA <span>Markdown</span></h2>
                {editable && <div className="authoring-format" role="group" aria-label="Formatowanie Markdown"><Button size="compact" onClick={() => insert('## ')} aria-label="Nagłówek" title="Nagłówek">H₂</Button><Button size="compact" onClick={() => insert('**', '**')} aria-label="Pogrubienie" title="Pogrubienie"><b>B</b></Button><Button size="compact" onClick={() => insert('- ')}>Lista</Button><Button size="compact" onClick={() => insert('```python\n', '\n```')}>Kod</Button><Button size="compact" onClick={() => insert('> ')}>Wskazówka</Button></div>}
                <label className="field"><span className="sr-only">Instrukcja Markdown</span><textarea ref={textarea} readOnly={!editable} rows={18} value={exercise.markdown} onChange={event => actions.updateExercise({ markdown: event.target.value })} /></label>
              </section>
              <section className="authoring-preview" aria-label="Podgląd instrukcji"><h2 className="authoring-section-label">OKIEM UCZNIA <span>Podgląd na żywo</span></h2><MarkdownInstructions markdown={exercise.markdown} /></section>
            </div>
            <section className="authoring-code" aria-label="Przygotowanie kodu"><h2 className="authoring-section-label">KOD POCZĄTKOWY <span>Python</span></h2><p>Od tego kodu uczeń rozpocznie ćwiczenie.</p>
              <label className="field"><span className="sr-only">Kod początkowy ucznia</span><textarea rows={5} readOnly={!editable} value={exercise.code} onChange={event => actions.updateExercise({ code: event.target.value })} spellCheck={false} /></label>
            </section>
          </> : <div className="authoring-empty"><h2>Dodaj pierwsze ćwiczenie</h2><p>Wybierz „+ Ćwiczenie”, aby uzupełnić treść lekcji.</p></div>}</div>
        </div>
        {id && editable && <div className="authoring-danger"><Button variant="danger" size="compact" onClick={() => void actions.removeLesson()}>Usuń lekcję</Button></div>}
      </fieldset>
      <p className="authoring-feedback" role="status">{busy ? 'Zapisywanie…' : notice}{dirty && !busy && ' Niezapisane zmiany.'}</p>
    </>}
  </main>;
}
