# Custom Python Classroom Platform

Build a web application for teaching beginner Python to children, initially ages approximately 9–12.

The application is **not intended to be a general-purpose cloud IDE or full LMS**. It is a focused classroom coding environment where:

- a teacher creates classes, lessons and programming exercises;
- every student has their own private copy of each exercise;
- students write and run Python directly in the browser;
- student work is automatically saved;
- the teacher can monitor students' code live;
- the teacher can see who is active, who has run their program, and who is encountering errors;
- exercises can contain Markdown instructions, starter code and hidden solutions;
- the initial programming curriculum uses Python and Turtle graphics heavily;
- students do not need email addresses.

Build this incrementally, prioritizing a small reliable MVP over feature breadth.

---

# 1. Core principles

The system should follow these principles:

1. Simple enough for a 9-year-old to use.
2. No student email address required.
3. Each student works in their own private workspace.
4. The teacher can see student work live.
5. Python runs primarily in the student's browser.
6. Do not execute arbitrary student Python on the application server.
7. Course content should be easy for the teacher to edit.
8. Markdown should be the primary format for lesson/exercise instructions.
9. The interface should avoid unnecessary IDE complexity.
10. Polish characters must render correctly everywhere.
11. The system should work well on standard Windows laptops and Chromebooks using a modern browser.
12. A lesson should be usable even if advanced realtime features temporarily fail.
13. Security and student privacy are more important than convenience.
14. Do not build features merely because a normal IDE has them.
15. Keep components modular so Turtle, standard Python and future runtimes can use the same lesson system.

---

# 2. Preferred technology stack

Use the following stack unless there is a strong technical reason not to.

## Frontend

- React
- TypeScript
- Vite
- React Router
- CodeMirror 6 for the code editor
- standard CSS / CSS Modules or a lightweight styling approach
- Markdown renderer with sanitization

Avoid large UI frameworks unless they clearly reduce complexity.

The UI should be custom and deliberately simple rather than resembling VS Code.

## Backend

Use Supabase for:

- PostgreSQL database
- authentication/session management
- Row Level Security
- Realtime Broadcast / Presence
- server-side functions only where necessary

Do not create a separate Node/Express or Python backend unless there is a concrete need.

## Python runtime

Use Pyodide.

Pyodide must:

- run inside a Web Worker;
- never run on the main UI thread;
- capture stdout;
- capture stderr/exceptions;
- return structured execution results to React;
- support stopping/restarting execution;
- have execution timeout protection.

Do not run arbitrary student Python on the web server.

## Turtle

Standard desktop `turtle` cannot be assumed to work directly in the browser.

Implement a small educational Turtle compatibility layer that connects Python commands to a browser canvas or SVG renderer.

Only implement the subset required by the course initially.

---

# 3. User roles

Implement two roles initially:

## Teacher

A teacher can:

- create and rename classes;
- create student accounts;
- reset student passwords;
- add/remove students from a class;
- create lessons;
- create exercises;
- assign lessons/exercises to classes;
- see all students in their class;
- see student progress;
- open an individual student's current work;
- watch that student's code update live;
- see the student's latest execution result;
- see when the student last edited/run the code;
- see whether the student is online;
- see solutions.

## Student

A student can:

- log in without an email address;
- see only classes they belong to;
- see assigned lessons;
- open an exercise;
- read instructions;
- edit their own code;
- run their own code;
- see output;
- see Turtle graphics where applicable;
- automatically save progress;
- reset their code to the exercise starter code after confirmation.

A student must NOT be able to:

- access other students' code;
- access teacher dashboards;
- access exercise solutions;
- modify lesson content;
- alter another student's records;
- subscribe to another student's realtime channel.

---

# 4. Student authentication

Students must not need email addresses.

Desired student login flow:

1. Student opens `/join`.
2. Student enters a class/school code.
3. Student enters username.
4. Student enters password.
5. Student is authenticated.
6. Student sees their assigned class/course.

Example:

Class code:

`PYTHON25`

Username:

`kuba7`

Password:

teacher-generated password

The internal authentication implementation can use Supabase Auth or an abstraction around it, but the user-facing experience must not expose fake email addresses or require students to understand email-based authentication.

Passwords must never be stored in plaintext.

Teacher authentication can use normal email/password authentication.

---

# 5. Database model

Design proper migrations.

At minimum implement entities equivalent to:

## profiles

- id
- role: `teacher | student`
- display_name
- username where appropriate
- created_at
- updated_at

## classes

- id
- teacher_id
- name
- join_code
- created_at

## class_members

- id
- class_id
- student_id
- joined_at

## courses

Optional in the first implementation if classes directly contain lessons.

If implemented:

- id
- teacher_id
- title
- description

## lessons

- id
- course_id or class_id as appropriate
- title
- description
- position
- published
- created_at
- updated_at

## exercises

- id
- lesson_id
- title
- position
- instructions_markdown
- starter_code
- solution_code
- runtime_type
- turtle_enabled
- created_at
- updated_at

Possible `runtime_type` values initially:

- `python-console`
- `python-turtle`

## assignments

Use an assignment relationship if lessons/exercises must be explicitly assigned to particular classes.

Suggested fields:

- id
- class_id
- lesson_id
- available_from nullable
- created_at

## student_work

One record per student/exercise.

- id
- student_id
- exercise_id
- code
- status
- started_at
- last_edited_at
- last_run_at
- completed_at nullable
- created_at
- updated_at

The `(student_id, exercise_id)` combination must be unique.

Possible status values:

- `not_started`
- `in_progress`
- `completed`

Do not automatically determine "completed" solely because a program runs without an exception unless such behaviour is explicitly introduced later.

## execution_events

Store lightweight execution telemetry.

Fields:

- id
- student_id
- exercise_id
- executed_at
- success boolean
- error_type nullable
- duration_ms
- optional shortened error summary

Do NOT store a complete code snapshot on every execution unless needed later.

---

# 6. Row Level Security

Treat RLS as mandatory, not optional.

Enable RLS on every table containing user/class/student data.

Create explicit policies.

## Students

Students may:

- read their own profile;
- read classes they belong to;
- read published lessons assigned to their classes;
- read exercise instructions;
- read starter code;
- never read solution code;
- read/write only their own `student_work`;
- create execution events only for themselves.

## Teachers

Teachers may:

- read/write their own classes;
- read/write lessons/exercises they own;
- see members of their classes;
- read student work only for students enrolled in their classes;
- read execution events for their students;
- read solutions for their own exercises.

Never trust role information supplied by the browser.

Verify authorization server-side/database-side.

---

# 7. Realtime architecture

Use realtime for transient classroom state.

Do NOT write every keystroke directly to PostgreSQL.

Use two mechanisms:

## A. Realtime Broadcast

Used for:

- live code updates;
- current student activity;
- current exercise;
- run started;
- run finished;
- latest error/status where useful.

Example conceptual channel:

`student-work:<studentWorkId>`

The student publishes code updates.

The authorized teacher subscribes.

Channels containing student work must be private and authorization-controlled.

Do not expose class-wide student code through a public channel.

## B. Database persistence

Persist code separately using debounced saves.

Suggested behaviour:

- student types;
- realtime changes appear immediately for teacher;
- after approximately 1–3 seconds without typing, save current code;
- also save before running code;
- also save when navigating away where possible;
- periodically save dirty work as an additional safeguard.

The database record remains the durable source of truth.

Realtime messages are transient.

---

# 8. Presence

Use realtime presence or equivalent lightweight state to determine:

- online/offline;
- current exercise;
- currently typing;
- currently executing code.

Teacher dashboard should distinguish approximately:

- online/active;
- online/idle;
- offline.

Do not implement invasive activity tracking.

Do not attempt to monitor unrelated browser activity.

---

# 9. Python execution

Create a reusable Python runtime service.

Suggested architecture:

`PythonRunner`

↓

Web Worker

↓

Pyodide

The UI must remain responsive during Python execution.

The runtime API should conceptually support:

```ts
run(code, options)
stop()
restart()
```

Execution result should resemble:

```ts
interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  errorType?: string;
  errorMessage?: string;
  durationMs: number;
}
```

Capture:

- `print()`;
- syntax errors;
- runtime exceptions;
- execution duration.

A user-friendly error panel should be separate from raw browser/dev errors.

Do not hide normal Python error messages from learners.

---

# 10. Infinite loops / stopping programs

Student programs can contain:

```python
while True:
    pass
```

Therefore execution must not be allowed to permanently freeze the UI.

Requirements:

- run Pyodide in a worker;
- provide a visible Stop button while code executes;
- implement a maximum runtime safeguard;
- if clean interruption becomes unreliable, terminate and recreate the worker;
- display a clear message if execution was stopped.

A worker restart must not lose the student's source code.

---

# 11. Python input()

Support simple beginner programs using:

```python
name = input("What is your name? ")
```

Do not rely on a blocking browser prompt as the final UX.

Create a mechanism where:

1. Python requests input.
2. Execution pauses or waits appropriately.
3. React displays an input control in the output/console panel.
4. Student enters a value.
5. Execution continues.

The exact Pyodide integration can be chosen during implementation, but the student experience should resemble a simple terminal.

---

# 12. Turtle compatibility layer

Implement browser Turtle as a separate module.

Do NOT try to reproduce every feature of Python's standard `turtle` library.

Initial required commands:

```python
forward(distance)
backward(distance)

left(angle)
right(angle)

goto(x, y)

penup()
pendown()

color(name)

pensize(width)

circle(radius)

setheading(angle)

home()

clear()

hideturtle()
showturtle()
```

Aliases can later be introduced if useful.

Coordinate system should behave like normal Turtle:

- `(0, 0)` = center;
- positive X = right;
- negative X = left;
- positive Y = up;
- negative Y = down.

The initial canvas should support a 400 × 400 logical coordinate area because existing course materials use this assumption.

The visible rendering can scale responsively, but logical coordinates must remain consistent.

---

# 13. Turtle implementation architecture

Python should emit structured drawing commands.

Example conceptual output:

```json
{
  "type": "forward",
  "distance": 100
}
```

or:

```json
{
  "type": "goto",
  "x": 50,
  "y": -70
}
```

JavaScript receives commands and updates the Turtle renderer.

Keep Python execution logic separate from rendering logic.

Suggested modules:

```text
runtime/
    pythonWorker
    PythonRunner
    turtleBridge

turtle/
    TurtleCanvas
    TurtleEngine
    turtleTypes
```

Turtle state should include at minimum:

- x
- y
- heading
- penDown
- penColor
- penWidth
- visible

The Turtle renderer must be deterministic.

---

# 14. Student exercise screen

This is the most important interface.

Desktop layout should approximately be:

```text
---------------------------------------------------
LESSON TITLE
---------------------------------------------------

Instructions                  Editor
-----------------------       -----------------------
Markdown text                 Python code
                             
Mini docs                    

                              [Run] [Stop]
---------------------------------------------------
Output / Turtle
---------------------------------------------------
```

Exact layout can vary responsively.

Essential elements:

- lesson title;
- exercise title;
- instructions rendered from Markdown;
- code editor;
- Run button;
- Stop button when running;
- Reset button;
- save indicator;
- previous/next exercise navigation;
- console output;
- Turtle canvas when enabled.

Avoid:

- file explorers for single-file exercises;
- terminal configuration;
- Git controls;
- debugger panels;
- IDE command palettes;
- package-manager UI.

---

# 15. Save indicator

Students should always understand whether their code is safe.

Show one of:

- `Saving…`
- `Saved`
- `Save failed`

Do not make students manually save routine exercise work.

If saving fails, preserve their code locally in memory and retry.

Consider temporary local browser backup as additional resilience, but the database remains authoritative.

---

# 16. Markdown instructions

Exercise instructions must support common Markdown including:

- headings;
- paragraphs;
- bold;
- italic;
- bullet lists;
- numbered lists;
- inline code;
- fenced code;
- links;
- tables;
- blockquotes;
- `<details>` / collapsible sections if safely supported.

Sanitize HTML.

Polish Unicode characters such as:

`ą ć ę ł ń ó ś ź ż`

must display correctly in all text styles and code-related UI.

---

# 17. Exercise content model

Each exercise should support:

### Title

Example:

`Kwadrat`

### Markdown instructions

Example:

```markdown
### Zadanie

Narysuj **kwadrat o boku 100 pikseli**.

<details>
<summary>Wskazówka</summary>

Użyj `forward()` oraz `left()`.

</details>
```

### Starter code

Example:

```python
forward(100)
```

### Solution

Example:

```python
forward(100)
left(90)
forward(100)
left(90)
forward(100)
left(90)
forward(100)
```

Solution must never be sent to student clients.

---

# 18. Teacher dashboard

Create a classroom dashboard optimized for live teaching.

Example:

```text
Python 101 — Monday

8 online / 10 students

Student      Exercise      Activity       Last run
---------------------------------------------------
Kuba         2.4           typing         ✓
Ania         2.5           active         ✓
Ola          2.3           active         SyntaxError
Tomek        2.4           idle 5 min     ✓
Maja         2.6           typing         NameError
```

The exact presentation can use cards or a table.

Teacher should be able to quickly answer:

- Who is online?
- What exercise is each student doing?
- Who hasn't started?
- Who has been inactive?
- Who has an error?
- Who has successfully run code recently?

Do not overwhelm the dashboard with full editor previews initially.

---

# 19. Student live viewer

Clicking a student should open a teacher view containing:

- student name;
- lesson;
- exercise;
- live code;
- latest saved code;
- latest stdout;
- latest error;
- latest execution time;
- last edit time;
- online status.

Initially this is **WATCH MODE ONLY**.

Teacher editor should be read-only.

Display clearly:

`Watching live`

when connected.

If realtime disconnects:

`Live connection lost — showing last saved version`

The teacher should never accidentally modify student code in MVP.

---

# 20. Teacher editing / collaboration

Do NOT implement simultaneous collaborative editing in MVP.

Design the code so it can later support:

### Phase 2 control mode

Teacher clicks:

`Take control`

Student editor becomes read-only.

Teacher can edit.

Teacher clicks:

`Return control`

Student receives control again.

Only one active editor writes at a time.

Do not implement CRDT/Yjs collaboration unless later explicitly requested.

---

# 21. Teacher lesson editor

Teacher should be able to create/edit:

- lesson title;
- lesson description;
- exercise order;
- exercise title;
- Markdown instructions;
- starter code;
- solution;
- runtime type;
- Turtle enabled.

Provide:

- Markdown editor;
- preview;
- code input;
- solution input.

Allow exercises to be reordered.

Autosave teacher content or provide explicit clear save behaviour.

---

# 22. Import from Markdown

Design for eventual course-as-files workflow.

A future lesson may be represented conceptually as:

```text
course/
  lesson-01/
    lesson.md
    exercise-01.md
    exercise-02.md
```

Do not need full import/export in the first milestone unless easy to implement.

However, keep exercise data structures compatible with Markdown-first authoring.

Avoid locking lesson content into complicated proprietary rich-text JSON.

---

# 23. Course navigation

Student view:

```text
Python 101

1. Turtle basics
   1.1 First movement      ✓
   1.2 Turns               ✓
   1.3 Square              →
   1.4 Challenge

2. Variables
   ...
```

Completed exercises can be manually or automatically marked depending on future course rules.

For MVP, simply record:

- not started;
- in progress;
- completed.

A teacher should be able to override completion state.

---

# 24. Error handling

Student-facing error states should be clear and nontechnical where appropriate.

Examples:

### Python error

Show normal Python traceback/error.

### Runtime failed

`Python could not start. Try again.`

### Save failed

`Your code hasn't been saved yet. Retrying…`

### Connection lost

`Connection lost. You can continue writing. We'll save your work when the connection returns.`

Avoid exposing:

- Supabase errors;
- SQL errors;
- internal stack traces;
- secrets;
- implementation details.

Log technical errors appropriately for development.

---

# 25. Offline / unstable internet resilience

Do not build a complete offline-first PWA initially.

However:

- editing should continue during a temporary connection interruption;
- code should remain in browser memory;
- reconnect should trigger another save;
- realtime failure must not prevent Python execution;
- student should not lose code simply because a WebSocket connection drops.

Consider localStorage/IndexedDB backup later.

---

# 26. Security requirements

Mandatory:

- never expose Supabase secret/service keys in frontend code;
- use only browser-safe publishable credentials client-side;
- RLS on all private tables;
- private realtime channels for student work;
- sanitize Markdown;
- validate all database inputs;
- do not trust frontend role checks;
- do not store plaintext passwords;
- do not allow arbitrary server-side Python execution;
- do not expose exercise solutions to student requests;
- do not make student work publicly accessible;
- avoid logging student passwords or full auth tokens.

Add basic rate limiting where appropriate.

---

# 27. Privacy requirements

This application is intended for children.

Minimize personal data.

Required student data should ideally be limited to:

- username;
- display name;
- class membership;
- programming work;
- exercise activity.

Do not collect:

- date of birth;
- address;
- phone number;
- student email unless later explicitly needed;
- unnecessary tracking/analytics.

Do not add third-party advertising or behavioural analytics.

---

# 28. Responsive design

Primary target:

- laptop;
- Chromebook;
- desktop.

Student coding interface should still function on tablets where practical.

Mobile phone support is secondary.

At approximately 1366×768 the student must be able to see:

- instructions;
- editor;
- Run button;
- relevant output

without excessive scrolling.

---

# 29. Accessibility

Implement reasonable accessibility from the beginning:

- proper HTML labels;
- keyboard-accessible controls;
- visible focus states;
- adequate contrast;
- semantic buttons;
- do not rely exclusively on colour for status;
- text should remain usable at browser zoom;
- editor font size should be comfortable for children.

Default code font should be approximately 15–17px.

---

# 30. Internationalization

Initial UI may be Polish.

Do not hardcode UI strings throughout components.

Create a simple translation structure such as:

```ts
translations/pl.ts
translations/en.ts
```

Initial languages:

- Polish
- English

Course content itself is stored independently and can contain either language.

---

# 31. Testing

Use automated tests for important logic.

At minimum test:

## Permissions

- student cannot retrieve another student's work;
- student cannot retrieve solutions;
- teacher can retrieve work only for students in their class;
- unauthenticated user cannot access classroom data.

## Persistence

- first opening creates student work from starter code;
- edits save;
- reopening restores saved code;
- reset restores starter code.

## Runtime

- `print("Hello")`;
- syntax error;
- runtime error;
- infinite loop stopping;
- repeated execution;
- worker restart.

## Turtle

Test coordinates/state for:

- forward;
- turns;
- goto;
- penup/pendown;
- color;
- circle if implemented.

Do not rely only on visual/manual testing.

---

# 32. Development environment

Provide:

- `.env.example`;
- database migration instructions;
- Supabase setup instructions;
- local development instructions;
- seed data.

A new developer should be able to clone the repository and get the application running locally without reverse-engineering configuration.

Never commit secrets.

---

# 33. Seed/demo data

Provide a development seed with:

Teacher:

`teacher@example.test`

Class:

`Python 101`

Students:

- `ania`
- `kuba`
- `ola`

Lesson:

`Turtle — podstawy`

Exercises:

1. Move forward
2. Turn
3. Draw a square

Include reasonable Polish sample instructions.

Seed passwords must only be development values.

---

# 34. Recommended folder architecture

Use feature-oriented structure approximately like:

```text
src/
  app/
    router/
    providers/

  auth/
    components/
    hooks/
    services/

  classes/
    components/
    services/

  lessons/
    components/
    services/

  exercises/
    components/
    services/

  editor/
    CodeEditor.tsx

  runtime/
    PythonRunner.ts
    python.worker.ts
    types.ts

  turtle/
    TurtleCanvas.tsx
    TurtleEngine.ts
    turtleBridge.ts
    types.ts

  realtime/
    studentWorkChannel.ts
    presence.ts

  student/
    StudentDashboard.tsx
    ExercisePage.tsx

  teacher/
    TeacherDashboard.tsx
    StudentLiveView.tsx
    LessonEditor.tsx

  database/
    supabase.ts
    types.ts

  i18n/
    pl.ts
    en.ts
```

Adjust if appropriate, but keep concerns separated.

Avoid giant components.

---

# 35. MVP milestones

Implement in this order.

## Milestone 1 — Local coding playground

No authentication yet.

Create:

- Markdown instructions;
- CodeMirror editor;
- Python Web Worker;
- Pyodide;
- Run;
- Stop;
- stdout;
- Python errors.

Acceptance:

A student can type:

```python
name = "Kuba"
print("Hello", name)
```

and see the result.

---

## Milestone 2 — Turtle

Implement:

- canvas;
- Turtle engine;
- Python-to-JavaScript bridge;
- basic Turtle commands.

Acceptance:

The following should draw a square:

```python
for i in range(4):
    forward(100)
    left(90)
```

---

## Milestone 3 — Authentication and classes

Implement:

- teacher authentication;
- student usernames;
- student passwords;
- class membership;
- student login.

Acceptance:

Three students can log in separately and cannot see each other's data.

---

## Milestone 4 — Lessons and exercises

Implement:

- lesson data;
- exercise data;
- starter code;
- solution;
- assignment;
- student navigation.

Acceptance:

Teacher assigns lesson.

Students see the lesson with independent copies of starter code.

---

## Milestone 5 — Automatic persistence

Implement:

- student_work;
- debounced saves;
- save indicator;
- restore previous work;
- reset starter code.

Acceptance:

Student refreshes browser and their code remains.

---

## Milestone 6 — Teacher dashboard

Implement:

- class student list;
- current exercise;
- last edit;
- last run;
- last error/success;
- online state.

Acceptance:

Teacher can monitor the entire class from one screen.

---

## Milestone 7 — Live code watching

Implement private realtime channels.

Acceptance:

Student types:

```python
forward(100)
```

Teacher watching that student sees the change within roughly a second without refreshing.

Teacher view is read-only.

---

## Milestone 8 — Teacher authoring

Implement:

- create lesson;
- create exercise;
- edit Markdown;
- starter code;
- solution;
- order exercises;
- publish/unpublish.

---

# 36. Explicitly out of scope for MVP

Do NOT implement unless required for one of the milestones:

- Git;
- GitHub integration;
- multiplayer collaborative editing;
- Yjs/CRDT;
- video calls;
- chat;
- AI tutor;
- AI code generation;
- automatic grading;
- plagiarism detection;
- achievements;
- gamification;
- badges;
- parent accounts;
- payment processing;
- school administration;
- attendance;
- grades;
- certificates;
- Pygame;
- arbitrary pip package installation;
- shell access;
- Linux terminal;
- Docker execution;
- server-side arbitrary Python;
- file explorer;
- multi-file Python projects;
- debugger;
- breakpoints;
- autocomplete powered by a language server;
- social features.

These can be considered later.

---

# 37. Future architecture considerations

Do not implement these yet, but avoid architectural decisions that would make them impossible.

Potential future features:

### Multi-file projects

For older students.

```text
main.py
player.py
settings.py
```

### Teacher take-control mode

Exclusive editing control.

### Python libraries

Selected Pyodide-compatible packages.

### Exercises with automated tests

Example:

```python
assert result == 10
```

but hidden teacher tests should not be shipped to the browser if they expose answers.

### Additional runtimes

- JavaScript
- HTML/CSS
- MicroPython-like simulations

### Assignment history

Code snapshots / version history.

### Teacher comments

Comments attached to an exercise submission.

### Course import/export

Markdown-based course repository.

---

# 38. UX philosophy

This is an educational environment, not a professional IDE.

When choosing between:

A. more features

and

B. less cognitive load

prefer B.

A 9-year-old beginning programming should immediately understand:

1. where the instructions are;
2. where to write code;
3. how to run it;
4. where the result appears;
5. how to move to the next task.

Avoid controls that do not serve those goals.

---

# 39. UI visual direction

Use a clean, calm interface.

Avoid:

- excessive gradients;
- childish cartoon UI;
- dense enterprise dashboards;
- tiny text;
- excessive cards;
- decorative animations;
- unnecessary icons.

The system is for children but should not look babyish.

Use generous spacing.

Editor should receive strong visual priority.

Errors should be clearly visible without appearing alarming.

---

# 40. Teacher dashboard philosophy

The teacher dashboard exists primarily for **situational awareness during a live lesson**.

Optimize for recognizing problems quickly.

Useful signals include:

`Typing`

`Running`

`Success`

`SyntaxError`

`NameError`

`Idle 4 min`

`Offline`

Prefer this over showing large quantities of analytics.

Do not turn the initial dashboard into a reporting system.

---

# 41. Performance targets

At minimum design for a single teacher with:

- 15–20 simultaneous students;
- each student broadcasting edits;
- each running Python independently;
- teacher dashboard connected simultaneously.

Browser-side Python execution means running student programs should generate no Python compute load on the application server.

Throttle/debounce realtime code broadcasts where sensible.

Do not transmit entire source code on every individual keystroke if that becomes unnecessarily expensive.

For MVP, sending a debounced full-source snapshot is acceptable if code files remain small.

---

# 42. Realtime consistency rules

Durable database state and transient realtime state must remain conceptually separate.

Rules:

1. PostgreSQL = saved source of truth.
2. Realtime = current live view.
3. Losing realtime must not lose student code.
4. Teacher opening a student first receives saved code.
5. Live updates then replace the displayed working copy.
6. Reconnecting should resynchronize with latest current/saved state.
7. Never overwrite newer student work with an older teacher-side copy.

---

# 43. Logging

Development logs should make troubleshooting possible.

Log events such as:

- authentication failures;
- unexpected save errors;
- realtime connection failures;
- Python worker crashes;
- worker restarts.

Do not log:

- passwords;
- auth tokens;
- unnecessary personal information.

---

# 44. Documentation

Maintain:

`README.md`

containing:

- project purpose;
- architecture;
- setup;
- environment variables;
- local development;
- tests;
- deployment.

Also create:

`docs/architecture.md`

with:

- system diagram;
- runtime architecture;
- realtime flow;
- security model.

And:

`docs/database.md`

with:

- tables;
- relationships;
- RLS summary.

And:

`docs/turtle.md`

with:

- supported Turtle commands;
- coordinate behaviour;
- known limitations.

---

# 45. Coding agent workflow

When implementing this project:

1. Read this specification first.
2. Inspect existing repository files before changing architecture.
3. Do not rewrite working systems unnecessarily.
4. Work one milestone at a time.
5. Keep the application runnable after each milestone.
6. Use TypeScript strictly.
7. Avoid `any` unless genuinely unavoidable.
8. Keep components small.
9. Separate UI, database access, runtime execution and realtime logic.
10. Add tests alongside important functionality.
11. Run tests and type checking before declaring a milestone complete.
12. Document significant architectural decisions.
13. Do not add dependencies without explaining why they are needed.
14. Prefer mature dependencies over custom implementations for generic problems.
15. Prefer custom code where the educational behaviour is application-specific, particularly the Turtle layer.

If information is missing but a reasonable implementation choice is possible, choose the simplest robust solution and document the assumption instead of blocking development.

---

# 46. First implementation task

Begin with **Milestone 1 only**.

Do not attempt to implement the whole platform in the first pass.

Create the initial React/TypeScript application with:

- simple exercise page;
- Markdown instructions panel;
- CodeMirror Python editor;
- Run button;
- Stop button;
- output panel;
- Pyodide running inside a Web Worker;
- stdout capture;
- Python exception capture;
- worker restart if necessary;
- clean responsive layout.

Include a sample exercise:

Title:

`Pierwszy program`

Instructions:

```markdown
Uruchom program i sprawdź, co pojawi się w konsoli.

Następnie zmień tekst na własny.
```

Starter code:

```python
print("Hello!")
```

At the end:

1. show the resulting file structure;
2. explain important architectural choices;
3. list commands required to run locally;
4. list tests performed;
5. identify any compromises or unfinished pieces;
6. stop before beginning Milestone 2.