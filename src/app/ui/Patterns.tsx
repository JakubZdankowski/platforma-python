import type { ReactNode } from 'react';
export function PageHeading({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return <header className="page-heading"><div><h1>{title}</h1>{description && <p className="account-lead">{description}</p>}</div>{actions && <div className="ui-actions">{actions}</div>}</header>;
}
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'warning' | 'success' }) {
  return <div className={`ui-notice ui-notice-${tone}`} role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}>{children}</div>;
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="student-empty"><h2>{title}</h2>{children && <p>{children}</p>}</div>;
}
export function MaterialModule({ title, expanded, onToggle, id, children }: { title: string; expanded: boolean; onToggle: () => void; id: string; children: ReactNode }) {
  return <section className="material-module"><h2><button type="button" className="material-toggle" id={`module-${id}`} aria-expanded={expanded} aria-controls={`lessons-${id}`} onClick={onToggle}><span>{title}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span></button></h2><div id={`lessons-${id}`} role="region" aria-labelledby={`module-${id}`} hidden={!expanded}>{expanded && children}</div></section>;
}
