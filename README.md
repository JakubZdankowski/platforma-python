# Kurs programowania w języku Python

Proste środowisko do nauki Pythona w przeglądarce, przeznaczone docelowo do lekcji z dziećmi w wieku około 9–12 lat.

Obecny zakres: M1–M3 oraz **krok A — lekcje i autosave** i **krok B — dashboard i podgląd pracy klasy** z [planu MVP](docs/mvp-plan.md). Pozostała publikacja na GitHub Pages i hostowanym Supabase (C).

- Pod `/` działa playground bez logowania z dwoma przykładowymi ćwiczeniami: „Pierwszy program” (konsola) i „Narysuj kwadrat” (Turtle). Ma instrukcję Markdown, edytor CodeMirror, Uruchom/Zatrzymaj, stdout, stderr, błędy Pythona i rysunek żółwia. Kod wykonuje się wyłącznie w przeglądarce, w Web Workerze.
- Nauczyciel loguje się e-mailem pod `/login`. Tworzy klasy i zmienia ich nazwy, zakłada konta uczniów z wygenerowanym hasłem, resetuje hasła oraz dodaje uczniów do klas i usuwa z nich.
- Ze strony klasy nauczyciel otwiera „Podgląd pracy klasy” (`/teacher/classes/:id/live`): bieżące ćwiczenie każdego ucznia, szacowaną aktywność, ostatni wynik i kod tylko do odczytu. Zmiany docierają przez Supabase Realtime po autosave.
- Uczeń loguje się pod `/join` kodem klasy, nazwą użytkownika i hasłem, bez adresu e-mail. Widzi swoje klasy i przypisane lekcje. Ćwiczenia pod `/student/exercises/:id` zapisują kod i ostatni wynik uruchomienia na jego koncie.
- Backend to Supabase: Postgres z RLS, Auth i jedna Edge Function.

## Uruchomienie lokalne

Wymagania: Node.js 22.12+ (zalecany Node 24 LTS), pnpm 11.19.0 oraz aktualny Chrome lub Edge. Testy automatyczne wykonano na Chromium; działanie na fizycznym Chromebooku pozostaje do sprawdzenia.

Jeśli pnpm nie jest zainstalowany, można zainstalować przypiętą wersję za pomocą npm dostarczanego ze standardową instalacją Node.js:

```powershell
npm install --global pnpm@11.19.0
```

W katalogu projektu:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Otwórz adres wypisany przez Vite, domyślnie `http://127.0.0.1:5173`.

`dev` i `build` automatycznie kopiują pliki Pyodide z zainstalowanego pakietu do `public/pyodide/`. Instalacja zależności wymaga internetu. Podczas używania aplikacji interpreter i biblioteka standardowa są pobierane z tego samego serwera co aplikacja, bez zewnętrznego CDN. Wygenerowane pliki runtime’u nie są commitowane.

Bez Supabase działa tylko playground pod `/`. Strony logowania pokazują wtedy, że backend nie jest skonfigurowany.

## Supabase lokalnie

Wymagania: Docker Desktop (na Windows z WSL2), uruchomiony. Supabase CLI jest zależnością deweloperską projektu, więc nie trzeba go instalować osobno.

```powershell
pnpm db:start          # pierwszy start pobiera obrazy Dockera (kilka minut)
pnpm exec supabase status
```

Skopiuj `.env.example` do `.env` i wpisz `API URL` oraz `Publishable key` z `supabase status`. Potem uruchom `pnpm dev`.

- `pnpm db:reset` odtwarza bazę: uruchamia od nowa migracje z `supabase/migrations/` i seed z `supabase/seed.sql`. Stosuj to po zmianie migracji lub żeby wrócić do danych startowych.
- `pnpm db:types` generuje `src/database/database.types.ts` z lokalnej bazy po zmianie schematu.
- `pnpm db:stop` zatrzymuje kontenery (dane zostają).
- Supabase Studio: `http://127.0.0.1:54323`.
- Edge Function `teacher-students` jest serwowana automatycznie przez `db:start`.

### Dane deweloperskie (seed)

Wyłącznie do lokalnego developmentu:

| Konto | Logowanie |
| --- | --- |
| Nauczyciel | `/login`: `teacher@example.test` / `teacher-dev-password` |
| Uczniowie klasy „Python 101” | `/join`: kod `PYTHON25`, użytkownik `ania`, `kuba` lub `ola`, hasło `<użytkownik>-dev-pass` (np. `ania-dev-pass`) |

Seed nie tworzy lekcji. Przykładowe treści można zaimportować z `course-example/` (instrukcja poniżej).

### Hostowany projekt Supabase

1. Utwórz projekt i połącz repozytorium: `pnpm exec supabase link --project-ref <ref>`.
2. Wyślij migracje: `pnpm exec supabase db push`. Nie uruchamiaj `seed.sql` na produkcji, bo zawiera hasła deweloperskie.
3. Wdróż funkcję: `pnpm exec supabase functions deploy teacher-students`.
4. W panelu Authentication wyłącz publiczną rejestrację i podnieś limit logowań na IP (cała klasa loguje się zza jednego adresu szkolnego), tak jak w `supabase/config.toml`.
5. Utwórz nauczyciela. Klucz secret / service_role podaj tylko w bieżącej powłoce, nigdy w `.env` dla Vite:

   ```powershell
   $env:SUPABASE_URL = "https://<ref>.supabase.co"
   $env:SUPABASE_SECRET_KEY = "<secret key>"
   pnpm teacher:create nauczyciel@szkola.example "Pani Anna"
   ```

6. Do builda produkcyjnego ustaw `VITE_SUPABASE_URL` i `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Lekcje z Markdown

Ustaw `SUPABASE_URL`, `SUPABASE_SECRET_KEY` i `SUPABASE_TEACHER_ID` (UUID nauczyciela z `profiles`, dostępny w Supabase Studio). Klucz serwisowy pozostaje tylko w powłoce. Następnie:

```powershell
pnpm content:sync course-example
# albo własny katalog course/ lub ścieżka do prywatnego repozytorium
pnpm content:sync course
```

Katalog kursu zawiera podkatalogi lekcji, np. `01-pierwsza-lekcja/`. Każdy ma `lesson.md` z frontmatter `title` oraz pliki `exercise-01.md`, `exercise-02.md` itd. Frontmatter ćwiczenia ma `title` i `runtime: python-console` albo `python-turtle`. Treść poniżej to instrukcja Markdown; blok ogrodzony oznaczony `python starter` dostarcza kod początkowy i jest usuwany z instrukcji. Opcjonalne bloki `python solution` są usuwane i **nigdy nie trafiają do bazy**. Umieszczaj rozwiązania wyłącznie w takich blokach albo osobnych prywatnych plikach, nigdy w instrukcji.

Slug lekcji pochodzi z nazwy katalogu, slug ćwiczenia z nazwy pliku. Kolejność lekcji wynika z nazw katalogów, ćwiczeń z numerów plików. Ponowny import aktualizuje te same rekordy i zachowuje kod uczniów; zmiana slugu tworzy nowy rekord. Import nie usuwa treści, które zniknęły z plików, i nie jest transakcją całego kursu — po błędzie można go ponowić.

Własny `course/` jest ignorowany przez Git. Przy publicznym repozytorium rzeczywiste materiały i rozwiązania trzymaj w ignorowanym katalogu lub prywatnym repozytorium. `course-example/` zawiera tylko publiczne przykłady bez rozwiązań. Po imporcie zaznacz lekcję na stronie klasy nauczyciela. Uczeń zobaczy ją pod `/student`.

## Konfiguracja i przykładowe dane

Zmienne środowiskowe opisuje `.env.example`: tylko URL projektu i klucz publishable, bezpieczne dla przeglądarki. Klucza secret / service_role nie wolno umieszczać w zmiennych `VITE_*` ani commitować.

Treść przykładowych ćwiczeń playgroundu i kod początkowy znajdują się w `src/exercises/sampleExercise.ts`. Pole `runtimeType` (`python-console` lub `python-turtle`) decyduje, czy ćwiczenie ma panel rysunku. Lekcje i ćwiczenia w bazie importuje skrypt `content:sync`.

Interfejs i treść ćwiczeń są po polsku. Przełącznik języka został usunięty.

## Obsługa

- **Uruchom** lub **Ctrl+Enter / Cmd+Enter** wykonuje aktualną kopię kodu. Wynik poprzedniego wykonania jest czyszczony.
- **Zatrzymaj** przerywa także nieskończoną pętlę lub oczekiwanie na załadowanie interpretera. Następne uruchomienie tworzy nowy worker.
- Edycja jest możliwa podczas wykonania. Zmiany będą użyte dopiero przy kolejnym uruchomieniu.
- Ciemny interfejs pokazuje zadanie po lewej, edytor pośrodku i konsolę po prawej. Przycisk w nagłówku zadania zwija instrukcję, powiększając edytor. Na mniejszych ekranach panele układają się w rzędach.
- Uchwyt między edytorem a prawą kolumną (rysunek / konsola) zmienia ich szerokość: zwężenie jednej strony poszerza drugą, a rysunek żółwia rośnie razem z kolumną, na ile pozwala wysokość ekranu. Działa myszą, dotykiem i strzałkami; podwójne kliknięcie lub Enter przywraca domyślny podział. Na węższych ekranach, gdzie panele są ułożone w rzędach, uchwytu nie ma.
- Tab wcina kod. Escape, a następnie Tab pozwala opuścić edytor klawiaturą.
- Strzałki „Poprzednie zadanie” / „Następne zadanie” nad panelami przełączają przykładowe ćwiczenia, a przycisk między nimi pokazuje nazwę bieżącego. Każde ćwiczenie zachowuje własny kod. W trakcie wykonania przełączanie jest zablokowane.
- W ćwiczeniu Turtle funkcje takie jak `forward(100)` i `left(90)` działają bez importu. Żółw rysuje stopniowo w panelu „Rysunek” nad konsolą. Suwak „Tempo” zmienia szybkość, „Pomiń animację” od razu pokazuje gotowy rysunek, a „Zatrzymaj” przerywa program i czyści ekran żółwia. Konsola pokazuje tekst dopiero wtedy, gdy żółw dojdzie do miejsca, w którym go wypisano. Lista poleceń, układ współrzędnych i ograniczenia: [docs/turtle.md](docs/turtle.md).
- W playgroundzie kod pozostaje w pamięci karty. W przypisanych ćwiczeniach zapisuje się 1,5 s po zakończeniu pisania, przed uruchomieniem i zmianą ćwiczenia oraz przy ukryciu lub opuszczaniu strony. Wskaźnik pokazuje zapis lub ponawianie po błędzie. Przycisk resetu wymaga potwierdzenia i przywraca kod początkowy.

Konta:

- **Nauczyciel** (`/login`, potem `/teacher`) widzi listę klas z kodami i liczbą uczniów i może utworzyć klasę. Na stronie klasy może:
  - przypisać lub odpiąć lekcje zaimportowane z Markdown;
  - otworzyć podgląd pracy klasy, a klikając imię ucznia — jego kod;
  - zmienić jej nazwę;
  - dodać ucznia (imię i nazwa użytkownika podpowiadana z imienia, np. „Łucja” → `lucja`);
  - ustawić uczniowi nowe hasło;
  - usunąć ucznia z klasy (konto zostaje);
  - dodać ucznia z innej swojej klasy.

  Wygenerowane hasło (8 znaków bez łatwych do pomylenia) jest pokazywane raz, razem z kodem klasy i nazwą użytkownika.
  Podgląd pokazuje „pisze” przez 30 s od edycji, „aktywny” przez 2 min od edycji lub uruchomienia, a potem „bezczynny X min”. Samo otwarcie startera to „nie zaczął”. To oszacowanie z zapisanych danych, bez Presence. Bieżące ćwiczenie wynika z ostatniej edycji, a ostatnie uruchomienie w tabeli z najnowszego wyniku ucznia, również z innego ćwiczenia. Po rozłączeniu pozostaje ostatnio pobrany kod; powrót połączenia pobiera aktualny stan. Podgląd nie pozwala edytować ani uruchamiać kodu ucznia.
- **Uczeń** (`/join`, potem `/student`) wpisuje kod klasy, nazwę użytkownika i hasło. Wielkość liter w kodzie i nazwie nie ma znaczenia. Błędne dane dają jeden komunikat, który nie zdradza, co było źle. Główny nagłówek pokazuje, kto jest zalogowany, i ma przycisk „Wyloguj się”. Na wspólnych komputerach uczeń powinien się wylogować.

## Architektura

```text
src/
  app/           aplikacja, routing, leniwie ładowana część z kontami (AccountApp), style
  auth/          sesja i profil (AuthProvider), strażnik ról, logowanie ucznia i nauczyciela
  classes/       zapytania o klasy i członkostwa, wywołania funkcji teacher-students
  teacher/       klasy, konta uczniów, dashboard i podgląd kodu przez Realtime
  database/      klient Supabase i typy bazy
  lessons/       odczyt dostępnych lekcji i ćwiczeń
  exercises/     typ ćwiczenia i lokalny przykład
  student/       strona ćwiczenia, przełącznik przykładowych ćwiczeń, strona startowa ucznia, ćwiczenia z bazy i autosave
  editor/        CodeMirror 6, ładowany jako osobny moduł
  markdown/      Markdown + GFM + sanitizacja
  runtime/       PythonRunner, protokół, worker, wrapper Pythona, moduł turtle.py i most Turtle
  turtle/        TurtleEngine (stan), renderer canvas, panel rysunku
  output/        konsola i komunikaty wykonania
  i18n/          etykiety polskie i typy komunikatów
supabase/
  migrations/    schemat, RLS, wyzwalacze, funkcja logowania ucznia
  functions/     Edge Function teacher-students (konta uczniów)
  seed.sql       dane deweloperskie
  config.toml    lokalny stos Supabase (rejestracja wyłączona, limity logowania)
scripts/         przygotowanie Pyodide, tworzenie nauczyciela, import Markdown
tests/           testy Playwright playgroundu; tests/db i tests/auth — testy z lokalnym Supabase
docs/            specyfikacja i decyzje architektoniczne
```

Stan kodu należy do React. `PythonRunner` zarządza workerem niezależnie od UI. Pyodide inicjalizuje się przy pierwszym uruchomieniu; zwykłe kolejne uruchomienia korzystają z tego samego interpretera i nowej przestrzeni nazw programu. Uprawnienia egzekwuje baza (RLS) i Edge Function. Role w przeglądarce służą tylko nawigacji. Szczegóły, diagramy oraz granice bezpieczeństwa: [docs/architecture.md](docs/architecture.md). Tabele, logowanie bez e-maila i RLS: [docs/database.md](docs/database.md).

## Zależności

| Zależność | Zastosowanie |
| --- | --- |
| React, React DOM | Interfejs i stan kodu ucznia |
| TypeScript, Vite, plugin React | Kontrola typów, lokalny serwer i build |
| Pakiety CodeMirror, Lezer highlight | Edycja Pythona, kolorowanie składni, historia zmian, wcięcia |
| react-markdown, remark-gfm, rehype-sanitize | Markdown, tabele GFM oraz sanitizacja wyjścia |
| Pyodide | Python i WebAssembly w workerze |
| Vitest | Testy cyklu życia runnera, bufora wyjścia, Markdown, silnika i mostu Turtle |
| Playwright | Testy interfejsu z rzeczywistym Pyodide w Chromium |
| @supabase/supabase-js | Logowanie, zapytania do bazy z RLS i wywołanie Edge Function (M3) |
| React Router | Osobne adresy `/join`, `/login`, `/student`, `/teacher` wymagane przez specyfikację (M3) |
| supabase (CLI, dev) | Lokalny stos Supabase, migracje, seed, generowanie typów (M3) |

Wersje bezpośrednie są przypięte w `package.json`, a cały graf zależności w `pnpm-lock.yaml`. Nie ma frameworka UI ani globalnego magazynu stanu. Milestone 2 nie dodał zależności: Turtle to własny kod, a rysowanie korzysta z Canvas 2D przeglądarki. Milestone 3 dodał trzy zależności z tabeli powyżej, zgodnie ze stosem ze specyfikacji.

## Testy i sprawdzenia

Pierwsze przygotowanie przeglądarki testowej:

```powershell
pnpm exec playwright install chromium
```

Pełna weryfikacja:

```powershell
pnpm check
```

Oddzielne kroki:

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Testy E2E wymagają wcześniejszego buildu. Playwright sam uruchamia serwer pod `http://127.0.0.1:4173` i zamyka go po testach. W CI instalacja Chromium na Linuksie może wymagać `pnpm exec playwright install --with-deps chromium`.

`pnpm check` nie wymaga Supabase. Testy kont i uprawnień potrzebują lokalnego stosu (`pnpm db:start`):

```powershell
pnpm check:db          # db:reset + test:db + test:e2e:auth
```

`test:e2e:auth` sam pobiera klucze z `supabase status` i uruchamia serwer deweloperski pod `http://127.0.0.1:5174`, więc `.env` nie jest potrzebny. Testy sprzątają po sobie utworzone konta.

Testy jednostkowe obejmują runtime, Turtle, Markdown, konta, autosave, parser treści i granice aktywności dashboardu. Testy bazy sprawdzają izolację danych, przypisania i prywatność zdarzeń Realtime. E2E obejmują playground, konta, trwały zapis oraz podgląd w dwóch przeglądarkach: aktualizacja w ciągu 3 s, tylko do odczytu, ostatni wynik i odzyskanie zmian po rozłączeniu. Zestawy Playwright uruchamiaj kolejno, ponieważ współdzielą katalog wyników.

## Build i publikacja

```powershell
pnpm build
pnpm preview
```

Wynik znajduje się w `dist/`. Można opublikować go na statycznym hostingu przez HTTPS. Należy wysłać **cały katalog**, łącznie z `dist/pyodide/`, oraz serwować `.mjs` jako JavaScript, a `.wasm` jako `application/wasm`. Hosting nie może zamieniać odpowiedzi dla plików runtime’u na `index.html`.

Adresy `/join`, `/login`, `/student` i `/teacher/...` obsługuje routing w przeglądarce. Hosting musi więc zwracać `index.html` dla ścieżek, które **nie są istniejącymi plikami** (typowa reguła „SPA fallback”). Istniejące pliki, w tym `pyodide/`, muszą być serwowane bez zmian. Zmienne `VITE_SUPABASE_*` są wbudowywane w build, więc trzeba je ustawić przed `pnpm build`.

Pliki w `assets/` mają hashe. Pliki `pyodide/` zachowują nazwy, więc przy aktualizacji zależności muszą być wdrażane razem i ponownie walidowane przez cache; nie należy nadawać im bezwarunkowego wieloletniego cache. Obecna konfiguracja zakłada publikację w katalogu głównym domeny. Nie wymaga nagłówków dla SharedArrayBuffer, ponieważ Stop korzysta z zakończenia workera.

## Ograniczenia

- Podgląd pokazuje zapisany kod, z opóźnieniem autosave; bez rzeczywistego online/offline, historii wykonań, przejmowania sterowania i odtwarzania konsoli lub rysunku ucznia.
- Nauczyciel nie zmieni w aplikacji imienia ani nazwy użytkownika ucznia, nie usunie konta ucznia ani klasy i nie zmieni własnego hasła. Te operacje są dostępne w Supabase Studio lub przez administratora.
- Uczeń, którego nauczyciel ma kilka klas, może zalogować się kodem dowolnej klasy, do której należy.
- Reset hasła kończy wszystkie sesje ucznia. Wydany już token dostępu działa jednak do wygaśnięcia, najdłużej godzinę (`jwt_expiry`).
- Turtle obsługuje podzbiór poleceń z jednym żółwiem; `speed()` jest ignorowane, a duże rysunki nie są automatycznie przyspieszane. Szczegóły w [docs/turtle.md](docs/turtle.md).
- `input()` zwraca czytelny komunikat o braku obsługi. Interaktywne wejście wymaga osobnego kroku projektowego.
- Maksymalny czas programu to 10 sekund; inicjalizacji interpretera — 60 sekund. Stop i timeout usuwają stan interpretera, ale pozostawiają kod w edytorze.
- Wynik stdout i stderr jest ograniczony łącznie do 50 000 znaków. Przy Stop część jeszcze zbuforowanego wyjścia może nie zdążyć dotrzeć do UI.
- Nowa przestrzeń nazw usuwa zwykłe zmienne między uruchomieniami, ale nie resetuje wszystkich zaimportowanych modułów i wirtualnego systemu plików. Pełny reset następuje po odtworzeniu workera.
- Surowy HTML w Markdown jest pomijany; `<details>` nie jest jeszcze obsługiwane.
- Brak instalowania dodatkowych pakietów i gwarancji pełnego offline. Niezapisany kod pozostaje w pamięci; bez kopii localStorage zamknięcie karty podczas awarii sieci może go utracić. Zapis przy opuszczaniu strony jest best effort; małe żądania używają `keepalive`, a większe niż około 60 KB wymagają pozostawienia strony otwartej do potwierdzenia zapisu.

Kroki A i B są zaimplementowane. Publikacja na GitHub Pages pozostaje do realizacji.
