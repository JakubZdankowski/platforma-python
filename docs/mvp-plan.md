# MVP plan (after Milestone 3)

This plan overrides the milestone order in [product-spec.md](product-spec.md) §35 for the MVP. The spec remains the long-term target; items listed under "Post-MVP backlog" are deferred, not dropped.

## Implementation status — 2026-10-07

- **Step A is complete:** lesson/exercise schema and RLS, Markdown sync, class assignments, student lesson navigation, autosave with retry and reset, and latest run results. Migration applied to local Supabase.
- **Step B is complete:** class dashboard, timestamp-based activity, latest run, read-only CodeMirror, Postgres Changes, saved-state fallback and reconnect resync. The subscription waits for Postgres Changes readiness before reporting live; existing RLS and the step A publication are reused.
- Verified for B: typecheck and production build; 80 Vitest tests plus 4 content-parser tests; `pnpm check:db` (24 permission tests including Realtime privacy, 10 account/lesson/live E2E scenarios); 26 playground/Turtle regression scenarios. Playwright suites share an output directory and must run sequentially.
- **Step C is complete (2026-10-08):** GitHub Pages deployment is green; hosted migrations, Auth configuration and teacher-students function are deployed. Sky Mentor account and course-example are provisioned. Real-URL acceptance passed: teacher/student login, student creation, Python, Turtle, persistence after refresh, teacher live view and logout. Operational instructions: [deployment.md](deployment.md).
- Before C: the start page now offers student and teacher login. Anonymous practice has been removed from the app; all lesson exercises require a student session. Runtime regression tests use an isolated development-only fixture excluded from production builds.
- Verified for C: 80 Vitest and 4 parser tests, production build and base-path/404 checks, 27 browser regression scenarios (resize scenarios rerun after updating their fixture URLs), and the production acceptance scenario.

## Context

Milestones 1–3 are done (playground, Turtle, Supabase auth and classes). The spec still lists five milestones: M4 lessons, M5 persistence, M6 dashboard, M7 live watching, M8 authoring. Kuba wants a shippable MVP for a real class and wants to save time and tokens.

Decisions already made:
- Lessons are written by Kuba as **Markdown files**, so the in-app editor (M8) is cut from the MVP.
- The live view can lag **1–3 s** behind the student, using Postgres Changes on autosaved work instead of keystroke Broadcast and Presence.
- The app is hosted on **GitHub Pages**.

Result: **5 remaining milestones become 3 steps**: A = M4+M5, B = M6+M7, C = deploy. That is roughly 40–50% less work than the original plan.

## Step A — Lessons, exercises and autosave (M4 + M5 merged)

M4 says "independent copies of starter code", which is exactly `student_work`, so splitting it from M5 would mean building the same screen twice.

**Database** (new migration, same patterns as `supabase/migrations/20261006120000_auth_and_classes.sql`):
- `lessons` (teacher_id, slug, title, position), `exercises` (lesson_id, slug, title, position, instructions_markdown, starter_code, runtime_type), `assignments` (class_id, lesson_id).
- `student_work` (student_id, exercise_id unique; code, status, last_edited_at, last_run_at, last_run_success, last_error_type, last_error_summary).
  - The latest run result is stored on this row, which replaces the `execution_events` table for the MVP.
- RLS:
  - a student reads lessons and exercises assigned to their classes, and reads and writes only their own `student_work`;
  - a teacher reads their own content and the work of their students.
  - Reuse the `private.*` helper pattern.
- **Solutions are not stored in the DB.** Students therefore can't receive them, and no extra table or RLS is needed. They stay in the content files.
  - Note: with a public repo (required for free GitHub Pages), content files must **not** be in it. Keep `course/` in a separate private repo or a git-ignored folder.

**Content sync:**
- `scripts/sync-content.mjs` (`pnpm content:sync <dir>`) reads `lesson.md` and `exercise-NN.md` files: a small frontmatter for title and runtime, the instructions body, and a fenced `python starter` block.
- It upserts by slug using the secret key, following the same pattern as `scripts/create-teacher.mjs`.
- No new dependency: a tiny hand-written frontmatter parser.

**Teacher UI:** on `src/teacher/ClassPage.tsx`, a list of the teacher's lessons with "Assign / Unassign" checkboxes. Nothing else.

**Student UI:**
- `/student` lists the assigned lessons and their exercises (in `src/student/StudentHomePage.tsx`).
- `/student/exercises/:id` reuses `src/student/ExercisePage.tsx`:
  - refactor it to take `exercise`, `code`, `onChange` and the save status as props, instead of the local `sampleExercises` state;
  - the playground at `/` keeps working by passing the sample data.
- Autosave hook `useStudentWork`:
  - load the saved code, or create the row from the starter code;
  - save 1.5 s after typing stops, immediately before Run, and on `visibilitychange`/`pagehide`;
  - retry on failure;
  - status shown as "Zapisywanie…" / "Zapisano" / "Nie zapisano — ponawiam…".
- Reset button with `window.confirm`.
- Previous/next exercise navigation, reusing `SampleExercisePicker`.
- After each run, write the `last_run_*` fields.

**Deferred:**
- the courses table;
- `available_from`;
- completion status and teacher override (only `not_started` / `in_progress`);
- `<details>`;
- localStorage backup;
- the seed lesson in the DB (use a sample file in `course-example/` instead).

## Step B — Teacher dashboard and live watching (M6 + M7 merged)

- `/teacher/classes/:id/live` shows a table with one row per student:
  - current exercise (from the most recent `last_edited_at`);
  - activity derived from timestamps: "pisze" (<30 s), "aktywny" (<2 min), "bezczynny X min", or "nie zaczął";
  - last run (✓ or the error type).
- Live updates come from a Supabase Postgres Changes subscription on `student_work`. RLS filters it, so no new authorization code is needed.
- Clicking a student opens a **read-only** CodeMirror view (reuse `src/editor/CodeEditor.tsx` with a `readOnly` prop) that follows the same subscription, plus a status line: "Na żywo" when connected, "Połączenie utracone — ostatnia zapisana wersja" when not.
- Enable `student_work` in the `supabase_realtime` publication (inside the migration).

**Deferred:**
- Presence and true online/offline;
- per-keystroke Broadcast;
- "take control" mode;
- execution history.

## Step C — Deploy to GitHub Pages and hosted Supabase

GitHub Pages is feasible. Required changes:
- `vite.config.ts`: `base: '/<repo>/'`, taken from an env var so that local builds stay at `/`.
  - `PythonRunner` already uses `import.meta.env.BASE_URL` for Pyodide (`src/runtime/PythonRunner.ts:86`).
- `src/app/App.tsx`: `<BrowserRouter basename={import.meta.env.BASE_URL}>`.
- SPA fallback: the build copies `dist/index.html` to `dist/404.html`, so GitHub Pages serves the app on deep links like `/join`. Also add an empty `dist/.nojekyll`.
- `.github/workflows/deploy.yml`:
  - runs `pnpm install`, `pnpm build` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (both public by design, stored as repo variables), then `actions/deploy-pages`;
  - runs unit tests only.
- Hosted Supabase:
  - `supabase link`, `db push`, `functions deploy teacher-students`;
  - disable sign-up and raise the sign-in rate limit in the dashboard;
  - add the Pages URL to the auth site URL;
  - create the teacher with `pnpm teacher:create`, then `content:sync` against prod.
- Smoke test on the real URL: teacher sign-in, create a student, student sign-in, run a Turtle exercise, autosave survives a refresh.

## Token and time savers for every step

- **Tests:**
  - keep the DB permission tests (child privacy) and one E2E happy path per step;
  - skip multi-viewport screenshot tests;
  - run the 2-minute Pyodide E2E suite once at the end of a step, not after every change.
- **Docs:** short README and `docs/database.md` updates; stop listing every test in the README.
- **Sessions:** one session per step with `/clear` between them, and point to the relevant spec sections (§14–17 for A, §18–19 for B) instead of re-reading the whole spec.
- **UI language:** Polish only, following the approved UX change. Do not restore the language selector. The legacy English dictionary remains as message type scaffolding.

## Post-MVP backlog (refine later)

- M8 in-app lesson editor;
- Presence and keystroke-level live view;
- `execution_events` history;
- completion status and teacher override;
- teacher viewing solutions in the app;
- `<details>` in Markdown;
- `input()`;
- localStorage backup;
- teacher renaming or deleting students;
- "take control".

## Verification per step

- A:
  - `pnpm check`, plus `pnpm check:db` with new tests: a student can't read another student's work or unassigned lessons; a teacher reads only their own students' work;
  - E2E: student opens the exercise, edits, refreshes, and the code remains; reset restores the starter code.
- B: `pnpm check:db`, plus E2E with two browsers: the student types and the teacher's read-only view updates within about 3 s.
- C: GitHub Actions deploy is green, and the manual smoke test on the Pages URL passes.
