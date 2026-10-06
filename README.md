# Kurs programowania w języku Python

Proste środowisko do nauki Pythona w przeglądarce, przeznaczone docelowo do lekcji z dziećmi w wieku około 9–12 lat.

Obecny zakres: **Milestone 1 — Local coding playground**, **Milestone 2 — Turtle** i **Milestone 3 — Authentication and classes** z [specyfikacji](docs/product-spec.md).

- Pod `/` działa playground bez logowania z dwoma przykładowymi ćwiczeniami: „Pierwszy program” (konsola) i „Narysuj kwadrat” (Turtle). Ma instrukcję Markdown, edytor CodeMirror, Uruchom/Zatrzymaj, stdout, stderr, błędy Pythona i rysunek żółwia. Kod wykonuje się wyłącznie w przeglądarce, w Web Workerze.
- Nauczyciel loguje się e-mailem pod `/login`. Tworzy klasy i zmienia ich nazwy, zakłada konta uczniów z wygenerowanym hasłem, resetuje hasła oraz dodaje uczniów do klas i usuwa z nich.
- Uczeń loguje się pod `/join` kodem klasy, nazwą użytkownika i hasłem, bez adresu e-mail. Widzi tylko swoje klasy. Lekcje pojawią się w Milestone 4.
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

Lekcja „Turtle — podstawy” z seedu w specyfikacji należy do Milestone 4.

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

## Konfiguracja i przykładowe dane

Zmienne środowiskowe opisuje `.env.example`: tylko URL projektu i klucz publishable, bezpieczne dla przeglądarki. Klucza secret / service_role nie wolno umieszczać w zmiennych `VITE_*` ani commitować.

Treść przykładowych ćwiczeń playgroundu i kod początkowy znajdują się w `src/exercises/sampleExercise.ts`. Pole `runtimeType` (`python-console` lub `python-turtle`) decyduje, czy ćwiczenie ma panel rysunku. Lekcje i ćwiczenia w bazie to zakres Milestone 4.

Interfejs domyślnie używa polskiego. Selektor pozwala przełączyć etykiety na angielski bez utraty kodu. Treść ćwiczenia jest niezależna od języka interfejsu i pozostaje po polsku.

## Obsługa

- **Uruchom** lub **Ctrl+Enter / Cmd+Enter** wykonuje aktualną kopię kodu. Wynik poprzedniego wykonania jest czyszczony.
- **Zatrzymaj** przerywa także nieskończoną pętlę lub oczekiwanie na załadowanie interpretera. Następne uruchomienie tworzy nowy worker.
- Edycja jest możliwa podczas wykonania. Zmiany będą użyte dopiero przy kolejnym uruchomieniu.
- Ciemny interfejs pokazuje zadanie po lewej, edytor pośrodku i konsolę po prawej. Przycisk w nagłówku zadania zwija instrukcję, powiększając edytor. Na mniejszych ekranach panele układają się w rzędach.
- Uchwyt między edytorem a prawą kolumną (rysunek / konsola) zmienia ich szerokość: zwężenie jednej strony poszerza drugą, a rysunek żółwia rośnie razem z kolumną, na ile pozwala wysokość ekranu. Działa myszą, dotykiem i strzałkami; podwójne kliknięcie lub Enter przywraca domyślny podział. Na węższych ekranach, gdzie panele są ułożone w rzędach, uchwytu nie ma.
- Tab wcina kod. Escape, a następnie Tab pozwala opuścić edytor klawiaturą.
- Strzałki „Poprzednie zadanie” / „Następne zadanie” nad panelami przełączają przykładowe ćwiczenia, a przycisk między nimi pokazuje nazwę bieżącego. Każde ćwiczenie zachowuje własny kod. W trakcie wykonania przełączanie jest zablokowane.
- W ćwiczeniu Turtle funkcje takie jak `forward(100)` i `left(90)` działają bez importu. Żółw rysuje stopniowo w panelu „Rysunek” nad konsolą. Suwak „Tempo” zmienia szybkość, „Pomiń animację” od razu pokazuje gotowy rysunek, a „Zatrzymaj” przerywa program i czyści ekran żółwia. Konsola pokazuje tekst dopiero wtedy, gdy żółw dojdzie do miejsca, w którym go wypisano. Lista poleceń, układ współrzędnych i ograniczenia: [docs/turtle.md](docs/turtle.md).
- Kod jest przechowywany w pamięci bieżącej karty. Odświeżenie lub zamknięcie karty przywraca starter code. Automatyczny zapis jest zakresem Milestone 5.

Konta:

- **Nauczyciel** (`/login`, potem `/teacher`) widzi listę klas z kodami i liczbą uczniów i może utworzyć klasę. Na stronie klasy może:
  - zmienić jej nazwę;
  - dodać ucznia (imię i nazwa użytkownika podpowiadana z imienia, np. „Łucja” → `lucja`);
  - ustawić uczniowi nowe hasło;
  - usunąć ucznia z klasy (konto zostaje);
  - dodać ucznia z innej swojej klasy.

  Wygenerowane hasło (8 znaków bez łatwych do pomylenia) jest pokazywane raz, razem z kodem klasy i nazwą użytkownika.
- **Uczeń** (`/join`, potem `/student`) wpisuje kod klasy, nazwę użytkownika i hasło. Wielkość liter w kodzie i nazwie nie ma znaczenia. Błędne dane dają jeden komunikat, który nie zdradza, co było źle. Pasek pod nagłówkiem pokazuje, kto jest zalogowany, i ma przycisk „Wyloguj się”. Na wspólnych komputerach uczeń powinien się wylogować.

## Architektura

```text
src/
  app/           aplikacja, routing, leniwie ładowana część z kontami (AccountApp), style
  auth/          sesja i profil (AuthProvider), strażnik ról, logowanie ucznia i nauczyciela
  classes/       zapytania o klasy i członkostwa, wywołania funkcji teacher-students
  teacher/       lista klas, strona klasy, tworzenie uczniów i reset haseł
  database/      klient Supabase i typy bazy
  exercises/     typ ćwiczenia i lokalny przykład
  student/       strona ćwiczenia, przełącznik przykładowych ćwiczeń, strona startowa ucznia
  editor/        CodeMirror 6, ładowany jako osobny moduł
  markdown/      Markdown + GFM + sanitizacja
  runtime/       PythonRunner, protokół, worker, wrapper Pythona, moduł turtle.py i most Turtle
  turtle/        TurtleEngine (stan), renderer canvas, panel rysunku
  output/        konsola i komunikaty wykonania
  i18n/          etykiety polskie i angielskie
supabase/
  migrations/    schemat, RLS, wyzwalacze, funkcja logowania ucznia
  functions/     Edge Function teacher-students (konta uczniów)
  seed.sql       dane deweloperskie
  config.toml    lokalny stos Supabase (rejestracja wyłączona, limity logowania)
scripts/         przygotowanie plików Pyodide, tworzenie konta nauczyciela
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

Zakres testów:

- 17 testów uprawnień na prawdziwej bazie (`tests/db`). Sprawdzają, że:
  - kryterium akceptacji M3 jest spełnione: trzech uczniów loguje się osobno i każdy widzi tylko swój profil, klasę i członkostwo;
  - niezalogowany nie widzi niczego i nie założy sobie konta;
  - błędny kod, nazwa lub hasło dają ten sam błąd, a funkcja logowania nie zdradza istnienia kont;
  - uczeń nie utworzy klasy, nie zmieni nazwy, członkostwa ani roli i nie użyje funkcji nauczyciela;
  - nauczyciel widzi tylko swoje klasy i uczniów, nie doda cudzego ucznia, nie wybierze właściciela ani kodu klasy;
  - konto utworzone przez nauczyciela działa, a po resecie stare hasło i stare sesje przestają działać;
  - ta sama nazwa użytkownika może istnieć u dwóch nauczycieli;
  - konto bez roli (także z rolą w `user_metadata`) nie ma dostępu.
- 8 testów E2E kont (`tests/auth`): link z playgroundu, logowanie i wylogowanie ucznia, komunikat błędu, trzech uczniów w osobnych przeglądarkach, strażnicy tras, utworzenie ucznia przez nauczyciela i jego logowanie wygenerowanym hasłem, tworzenie i zmiana nazwy klasy, układ na telefonie.
- 27 testów jednostkowych M3:
  - Edge Function: autoryzacja, walidacja, normalizacja, cofnięcie utworzenia konta po błędzie, reset tylko dla własnych uczniów, rozkład znaków hasła, format adresu technicznego;
  - logowanie: normalizacja, mapowanie błędów Supabase, brak hasła w logach;
  - podpowiadanie nazw użytkownika z polskich imion.
- 47 testów jednostkowych M1–M2: limity szerokości przy zmianie podziału paneli, cykl życia workera, limity czasu i wyjścia, Stop/restart, awarie, stare komunikaty, równoległe żądania, sanitizacja i Unicode w Markdown, a także stan Turtle (forward/backward, obroty, goto, home, penup/pendown, kolor, grubość, okręgi i łuki, clear, widoczność, determinizm, podgląd częściowego polecenia, długość animacji), animacja w czasie i zmiana tempa, synchronizacja konsoli, Pomiń animację i Zatrzymaj, walidacja i paczkowanie poleceń w moście oraz przekazywanie, `turtleIndex` i limit poleceń w runnerze.
- 10 testów E2E Turtle: kwadrat z kryterium akceptacji sprawdzany pikselami canvasu, kolory, goto, okrąg i style importu, clear i czyszczenie między uruchomieniami, czytelne błędy argumentów, stopniowe rysowanie z konsolą czekającą na żółwia i statusem „Żółw rysuje…”, Pomiń animację, Zatrzymaj czyszczące ekran, Stop nieskończonej pętli rysującej, brak Turtle w ćwiczeniu konsolowym oraz układ 1366×768, 900×900 i 390×844.
- 4 testy E2E zmiany szerokości paneli: przeciąganie, limity, klawiatura, przywracanie domyślnego podziału, większy rysunek żółwia, zachowanie szerokości po zmianie ćwiczenia i brak uchwytu w układzie piętrowym.
- 12 testów E2E Milestone 1: przykładowy program, dokładne stdout/stderr z polskimi znakami, SyntaxError i ZeroDivisionError, świeża przestrzeń nazw, Stop i timeout nieskończonej pętli, zalew konsoli, błąd ładowania i retry, Stop podczas inicjalizacji, komunikat `input()`, skrót klawiaturowy, przełączanie języka oraz układ 1366×768 i 390×844.

Zrzuty widoków trafiają do `test-results/playground-desktop.png`, `playground-collapsed.png`, `playground-tablet.png`, `playground-mobile.png`, `turtle-desktop.png`, `turtle-mobile.png`, `resize-console.png`, `resize-turtle.png`, `student-home.png`, `teacher-class.png` i `join-mobile.png`. Test układu sprawdza również kolejność trzech kolumn, zwijanie instrukcji klawiaturą oraz zachowanie kodu. Przy błędzie Playwright zachowuje dodatkowo ślad wykonania i zrzut ekranu.

## Build i publikacja

```powershell
pnpm build
pnpm preview
```

Wynik znajduje się w `dist/`. Można opublikować go na statycznym hostingu przez HTTPS. Należy wysłać **cały katalog**, łącznie z `dist/pyodide/`, oraz serwować `.mjs` jako JavaScript, a `.wasm` jako `application/wasm`. Hosting nie może zamieniać odpowiedzi dla plików runtime’u na `index.html`.

Adresy `/join`, `/login`, `/student` i `/teacher/...` obsługuje routing w przeglądarce. Hosting musi więc zwracać `index.html` dla ścieżek, które **nie są istniejącymi plikami** (typowa reguła „SPA fallback”). Istniejące pliki, w tym `pyodide/`, muszą być serwowane bez zmian. Zmienne `VITE_SUPABASE_*` są wbudowywane w build, więc trzeba je ustawić przed `pnpm build`.

Pliki w `assets/` mają hashe. Pliki `pyodide/` zachowują nazwy, więc przy aktualizacji zależności muszą być wdrażane razem i ponownie walidowane przez cache; nie należy nadawać im bezwarunkowego wieloletniego cache. Obecna konfiguracja zakłada publikację w katalogu głównym domeny. Nie wymaga nagłówków dla SharedArrayBuffer, ponieważ Stop korzysta z zakończenia workera.

## Ograniczenia

- Brak lekcji w bazie, trwałego zapisu kodu, realtime i panelu monitorowania klasy (M4–M7). Uczeń po zalogowaniu widzi swoje klasy, a ćwiczenia ma na razie tylko w playgroundzie.
- Nauczyciel nie zmieni w aplikacji imienia ani nazwy użytkownika ucznia, nie usunie konta ucznia ani klasy i nie zmieni własnego hasła. Te operacje są dostępne w Supabase Studio lub przez administratora.
- Uczeń, którego nauczyciel ma kilka klas, może zalogować się kodem dowolnej klasy, do której należy.
- Reset hasła kończy wszystkie sesje ucznia. Wydany już token dostępu działa jednak do wygaśnięcia, najdłużej godzinę (`jwt_expiry`).
- Turtle obsługuje podzbiór poleceń z jednym żółwiem; `speed()` jest ignorowane, a duże rysunki nie są automatycznie przyspieszane. Szczegóły w [docs/turtle.md](docs/turtle.md).
- `input()` zwraca czytelny komunikat o braku obsługi. Interaktywne wejście wymaga osobnego kroku projektowego.
- Maksymalny czas programu to 10 sekund; inicjalizacji interpretera — 60 sekund. Stop i timeout usuwają stan interpretera, ale pozostawiają kod w edytorze.
- Wynik stdout i stderr jest ograniczony łącznie do 50 000 znaków. Przy Stop część jeszcze zbuforowanego wyjścia może nie zdążyć dotrzeć do UI.
- Nowa przestrzeń nazw usuwa zwykłe zmienne między uruchomieniami, ale nie resetuje wszystkich zaimportowanych modułów i wirtualnego systemu plików. Pełny reset następuje po odtworzeniu workera.
- Surowy HTML w Markdown jest pomijany; `<details>` nie jest jeszcze obsługiwane.
- Brak instalowania dodatkowych pakietów, gwarancji pełnego offline i trwałości po przeładowaniu strony.

Milestone 4 nie został rozpoczęty.
