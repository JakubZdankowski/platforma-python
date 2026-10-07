# Python Classroom

Browser-based platform for teaching beginner Python to children.

## Source of truth

Full product specification:
docs/product-spec.md

MVP plan (overrides the spec's milestone order, see below):
docs/mvp-plan.md

Other docs:
- docs/architecture.md — application architecture
- docs/database.md — tables, student login without email, RLS
- docs/turtle.md — browser Turtle compatibility layer

Do not implement features from future milestones unless explicitly requested.

## Current state

Milestones 1, 2 and 3 are complete and accepted.

Milestone 1 — Local coding playground:
- React + TypeScript + Vite
- CodeMirror editor
- Markdown exercise instructions
- Pyodide running in a Web Worker
- Run / Stop
- stdout and Python error handling

Milestone 2 — Turtle:
- Browser Turtle compatibility layer: `src/runtime/turtle.py` emits validated
  commands, `src/runtime/turtleBridge.ts` rebuilds them, `src/turtle/TurtleEngine.ts`
  computes deterministic state, canvas renders a 400x400 logical area
  (y up, origin in the centre)
- Commands: forward, backward, left, right, goto, setheading, circle,
  penup, pendown, color, pensize, home, clear, hideturtle, showturtle
- Animation with speed slider, "Skip animation", Stop clears the drawing,
  console output synchronized with the drawing
- Second sample exercise ("Narysuj kwadrat") with previous/next navigation
- Resizable split between editor and drawing/console column

Milestone 3 — Authentication and classes:
- Supabase (local stack via Docker + Supabase CLI devDependency):
  migration in `supabase/migrations/`, dev seed in `supabase/seed.sql`
  (teacher@example.test, class PYTHON25, students ania/kuba/ola)
- Tables: profiles, classes, class_members; RLS on all, column grants,
  integrity triggers; profiles created from `app_metadata` only
- Student login at /join: class code + username + password; hidden
  `<username>.<teacherId>@students.invalid` auth email via
  `public.student_login_email()`
- Edge Function `supabase/functions/teacher-students` (logic in handler.ts):
  create student with generated password, reset password + revoke sessions
- UI: React Router; `/` stays the public playground, account area
  (`src/app/AccountApp.tsx`) is lazy-loaded: /join, /login, /student,
  /teacher, /teacher/classes/:id
- Public sign-up disabled; teachers via seed or `pnpm teacher:create`

Do not rebuild Milestones 1–3.

## MVP plan

The remaining spec milestones are regrouped into three steps
(details in docs/mvp-plan.md):
- Step A = M4 + M5: lessons, exercises, assignments, student_work with
  autosave, save indicator, reset
- Step B = M6 + M7: teacher dashboard + read-only live view via Postgres
  Changes on student_work (1–3 s latency is acceptable)
- Step C: deploy — GitHub Pages (Vite base path, 404.html SPA fallback)
  + hosted Supabase

MVP constraints:
- Lessons are authored as Markdown files and uploaded with
  `pnpm content:sync`; no in-app lesson editor (M8 deferred).
- Solutions are NOT stored in the database. Course content (`course/`)
  must never be committed to the public repo.
- No Presence or keystroke Broadcast; activity derives from timestamps.
- No execution_events table; latest run result lives on student_work.
- Other deferred items: see "Post-MVP backlog" in docs/mvp-plan.md.

Next: Step A — lessons, exercises and autosave (do not start without an
explicit request).

## Testing

- `pnpm check` — typecheck, unit tests, build, playground E2E (no Supabase needed)
- `pnpm check:db` — needs `pnpm db:start` (Docker running): resets the DB,
  runs `tests/db` permission tests and `tests/auth` browser tests
- After schema changes: `pnpm db:reset`, then `pnpm db:types`

## Development rules

- Work on one milestone at a time.
- Prefer the simplest robust implementation.
- Do not turn this into a general-purpose IDE.
- Keep Python execution in the browser.
- Keep runtime logic separate from UI components.
- Use TypeScript strictly.
- Do not add dependencies without a clear reason.
- Preserve existing working architecture unless there is a strong reason to change it.
- Run tests and type checking after changes.
- Do not change tests when they fail.
- Do not begin the next milestone automatically.

## Git

Milestone baselines:
- Milestone 1: tag `milestone-1`
- Milestone 2: commit `0718445` ("Complete Milestone 2: Turtle")
- Milestone 3: tag `milestone-3`
