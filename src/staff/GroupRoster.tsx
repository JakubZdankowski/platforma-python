import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';

type Person = { id: string; display_name: string; username: string | null };

export function GroupRoster({ title, people, members, admin, onToggle, actions }: {
  title: 'Uczniowie' | 'Nauczyciele';
  people: Person[];
  members: Set<string>;
  admin: boolean;
  onToggle: (person: Person, assigned: boolean) => void;
  actions?: (person: Person) => ReactNode;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const query = search.trim().toLocaleLowerCase('pl');
  const visible = people.filter(person =>
    (!query || `${person.display_name} ${person.username ?? ''}`.toLocaleLowerCase('pl').includes(query)) &&
    (filter === 'all' || members.has(person.id) === (filter === 'assigned')),
  ).sort((a, b) => Number(members.has(b.id)) - Number(members.has(a.id)));
  const count = people.filter(person => members.has(person.id)).length;

  return <section className="account-section group-roster">
    <h2>{title} <span className="group-count">{count}</span></h2>
    {admin && <p className="account-muted">Osoby w grupie są na początku listy. Zaznaczenie od razu zapisuje przypisanie.</p>}
    {admin && people.length > 0 && <div className="group-roster-filters">
      <label className="field">{`Szukaj: ${title.toLocaleLowerCase('pl')}`}<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Imię, nazwisko lub login" /></label>
      {admin && <label className="field">{`Pokaż: ${title.toLocaleLowerCase('pl')}`}<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Wszyscy</option><option value="assigned">W grupie</option><option value="unassigned">Poza grupą</option></select></label>}
    </div>}
    {!count && people.length > 0 && <p className="account-muted">{title === 'Uczniowie' ? 'Do tej grupy nie przypisano jeszcze uczniów.' : 'Do tej grupy nie przypisano jeszcze nauczycieli.'}{admin && ' Zaznacz osoby poniżej, aby je dodać.'}</p>}
    {!people.length ? <p>{admin ? <>Brak kont do przypisania. <Link to="/admin/students">Przejdź do kont i utwórz konto</Link>.</> : 'Do tej grupy nie przypisano jeszcze uczniów. Przypisania zmienia administrator.'}</p> : <>
      {admin && <p className="account-muted" role="status">Wyniki: {visible.length} z {people.length}</p>}
      {!visible.length && <p>Brak osób pasujących do wyszukiwania i wybranego filtra.</p>}
      <ul className="module-checklist">{visible.map(person => <li key={person.id}>
        {admin ? <label><input type="checkbox" checked={members.has(person.id)} onChange={event => onToggle(person, event.target.checked)} /><span>{person.display_name}{person.username && ` (${person.username})`}<small className="group-membership-label">{members.has(person.id) ? 'W grupie' : 'Poza grupą'}</small></span></label> : <span>{person.display_name}{person.username && ` (${person.username})`}</span>}
        {actions?.(person)}
      </li>)}</ul>
    </>}
  </section>;
}
