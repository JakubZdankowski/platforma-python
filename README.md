# Kurs programowania w języku Python

Proste środowisko do nauki Pythona w przeglądarce, przeznaczone docelowo do lekcji z dziećmi w wieku około 9–12 lat.

Obecny zakres: **Milestone 1 — Local coding playground** i **Milestone 2 — Turtle** z [specyfikacji](docs/product-spec.md). Aplikacja udostępnia dwa przykładowe ćwiczenia: „Pierwszy program” (konsola) i „Narysuj kwadrat” (Turtle), instrukcję Markdown, edytor CodeMirror, Uruchom/Zatrzymaj, stdout, stderr i błędy Pythona oraz rysunek żółwia na canvasie. Kod wykonuje się wyłącznie w przeglądarce, w Web Workerze.

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

## Konfiguracja i przykładowe dane

M1 nie wymaga sekretów ani zmiennych środowiskowych. `.env.example` dokumentuje ten stan; nie trzeba kopiować go do `.env`.

Treść ćwiczeń i kod początkowy znajdują się w `src/exercises/sampleExercise.ts`. Pole `runtimeType` (`python-console` lub `python-turtle`) decyduje, czy ćwiczenie ma panel rysunku. To lokalne dane demonstracyjne. Supabase, migracje, użytkownicy oraz seed bazy zostaną dodane w późniejszych milestone’ach.

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

## Architektura

```text
src/
  app/           aplikacja i responsywne style
  exercises/     typ ćwiczenia i lokalny przykład
  student/       strona ćwiczenia i przełącznik przykładowych ćwiczeń
  editor/        CodeMirror 6, ładowany jako osobny moduł
  markdown/      Markdown + GFM + sanitizacja
  runtime/       PythonRunner, protokół, worker, wrapper Pythona, moduł turtle.py i most Turtle
  turtle/        TurtleEngine (stan), renderer canvas, panel rysunku
  output/        konsola i komunikaty wykonania
  i18n/          etykiety polskie i angielskie
scripts/         przygotowanie plików Pyodide
tests/           testy Playwright na buildzie produkcyjnym
docs/            specyfikacja i decyzje architektoniczne
```

Stan kodu należy do React. `PythonRunner` zarządza workerem niezależnie od UI. Pyodide inicjalizuje się przy pierwszym uruchomieniu; zwykłe kolejne uruchomienia korzystają z tego samego interpretera i nowej przestrzeni nazw programu. Szczegóły, diagram oraz granice bezpieczeństwa: [docs/architecture.md](docs/architecture.md).

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

Wersje bezpośrednie są przypięte w `package.json`, a cały graf zależności w `pnpm-lock.yaml`. Nie ma frameworka UI, globalnego magazynu stanu ani routingu dla pojedynczego ekranu. Milestone 2 nie dodał zależności: Turtle to własny kod, a rysowanie korzysta z Canvas 2D przeglądarki.

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

Zakres testów:

- 47 testów jednostkowych: limity szerokości przy zmianie podziału paneli, cykl życia workera, limity czasu i wyjścia, Stop/restart, awarie, stare komunikaty, równoległe żądania, sanitizacja i Unicode w Markdown, a także stan Turtle (forward/backward, obroty, goto, home, penup/pendown, kolor, grubość, okręgi i łuki, clear, widoczność, determinizm, podgląd częściowego polecenia, długość animacji), animacja w czasie i zmiana tempa, synchronizacja konsoli, Pomiń animację i Zatrzymaj, walidacja i paczkowanie poleceń w moście oraz przekazywanie, `turtleIndex` i limit poleceń w runnerze.
- 10 testów E2E Turtle: kwadrat z kryterium akceptacji sprawdzany pikselami canvasu, kolory, goto, okrąg i style importu, clear i czyszczenie między uruchomieniami, czytelne błędy argumentów, stopniowe rysowanie z konsolą czekającą na żółwia i statusem „Żółw rysuje…”, Pomiń animację, Zatrzymaj czyszczące ekran, Stop nieskończonej pętli rysującej, brak Turtle w ćwiczeniu konsolowym oraz układ 1366×768, 900×900 i 390×844.
- 4 testy E2E zmiany szerokości paneli: przeciąganie, limity, klawiatura, przywracanie domyślnego podziału, większy rysunek żółwia, zachowanie szerokości po zmianie ćwiczenia i brak uchwytu w układzie piętrowym.
- 12 testów E2E Milestone 1: przykładowy program, dokładne stdout/stderr z polskimi znakami, SyntaxError i ZeroDivisionError, świeża przestrzeń nazw, Stop i timeout nieskończonej pętli, zalew konsoli, błąd ładowania i retry, Stop podczas inicjalizacji, komunikat `input()`, skrót klawiaturowy, przełączanie języka oraz układ 1366×768 i 390×844.

Zrzuty widoków trafiają do `test-results/playground-desktop.png`, `playground-collapsed.png`, `playground-tablet.png`, `playground-mobile.png`, `turtle-desktop.png`, `turtle-mobile.png`, `resize-console.png` i `resize-turtle.png`. Test układu sprawdza również kolejność trzech kolumn, zwijanie instrukcji klawiaturą oraz zachowanie kodu. Przy błędzie Playwright zachowuje dodatkowo ślad wykonania i zrzut ekranu.

## Build i publikacja

```powershell
pnpm build
pnpm preview
```

Wynik znajduje się w `dist/`. Można opublikować go na statycznym hostingu przez HTTPS. Należy wysłać **cały katalog**, łącznie z `dist/pyodide/`, oraz serwować `.mjs` jako JavaScript, a `.wasm` jako `application/wasm`. Hosting nie może zamieniać odpowiedzi dla plików runtime’u na `index.html`.

Pliki w `assets/` mają hashe. Pliki `pyodide/` zachowują nazwy, więc przy aktualizacji zależności muszą być wdrażane razem i ponownie walidowane przez cache; nie należy nadawać im bezwarunkowego wieloletniego cache. Obecna konfiguracja zakłada publikację w katalogu głównym domeny. Nie wymaga nagłówków dla SharedArrayBuffer, ponieważ Stop korzysta z zakończenia workera.

## Ograniczenia

- Brak trwałego zapisu, logowania, bazy, realtime i widoku nauczyciela.
- Turtle obsługuje podzbiór poleceń z jednym żółwiem; `speed()` jest ignorowane, a duże rysunki nie są automatycznie przyspieszane. Szczegóły w [docs/turtle.md](docs/turtle.md).
- `input()` zwraca czytelny komunikat o braku obsługi. Interaktywne wejście wymaga osobnego kroku projektowego.
- Maksymalny czas programu to 10 sekund; inicjalizacji interpretera — 60 sekund. Stop i timeout usuwają stan interpretera, ale pozostawiają kod w edytorze.
- Wynik stdout i stderr jest ograniczony łącznie do 50 000 znaków. Przy Stop część jeszcze zbuforowanego wyjścia może nie zdążyć dotrzeć do UI.
- Nowa przestrzeń nazw usuwa zwykłe zmienne między uruchomieniami, ale nie resetuje wszystkich zaimportowanych modułów i wirtualnego systemu plików. Pełny reset następuje po odtworzeniu workera.
- Surowy HTML w Markdown jest pomijany; `<details>` nie jest jeszcze obsługiwane.
- Brak instalowania dodatkowych pakietów, gwarancji pełnego offline i trwałości po przeładowaniu strony.

Milestone 3 nie został rozpoczęty.
