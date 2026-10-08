# Publikacja — krok C

- Repozytorium: https://github.com/JakubZdankowski/platforma-python
- Aplikacja: https://jakubzdankowski.github.io/platforma-python/
- Supabase: `vjsiqsqbecanaqhimshj`.

## Frontend

W GitHub Settings → Pages wybierz Source: **GitHub Actions**. Workflow
`.github/workflows/deploy.yml` publikuje po pushu do `main` lub `master` i może
być uruchomiony ręcznie. Uruchamia testy jednostkowe, buduje całą aplikację wraz
z Pyodide i wysyła artefakt do Pages. URL i publishable key w workflow są publiczne.
Nie dodawaj tam secret/service_role ani tokenu Supabase.

Vite korzysta z `VITE_APP_BASE_PATH` (lokalnie domyślnie `/`). Router i ścieżki
Pyodide korzystają z tej samej wartości. Build tworzy `404.html` oraz `.nojekyll`.
Pages zwraca dokument aplikacji dla bezpośrednich adresów z kodem HTTP 404;
aplikacja otwiera żądaną trasę. Pliki `.mjs` i `.wasm` muszą istnieć pod właściwą ścieżką.

## Backend

W osobnym PowerShellu w katalogu projektu:

```powershell
pnpm exec supabase login
pnpm exec supabase link --project-ref vjsiqsqbecanaqhimshj
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
pnpm exec supabase functions deploy teacher-students --project-ref vjsiqsqbecanaqhimshj
```

Nie uruchamiaj produkcyjnego `db reset` ani `db push --include-seed`.
Seed zawiera wyłącznie konta i dane lokalnego środowiska deweloperskiego.

W dashboardzie produkcyjnego projektu:

- Auth: wyłącz nowe rejestracje oraz logowanie anonimowe;
- Site URL: `https://jakubzdankowski.github.io/platforma-python/`;
- limit logowań: 300/h na IP, jak w konfiguracji lokalnej;
- minimalna długość hasła: 8;
- Data API włączone, automatyczne uprawnienia nowych tabel wyłączone;
- migracje włączają RLS i nadają wymagane uprawnienia.

## Nauczyciel i treści

Ustaw `SUPABASE_URL` i `SUPABASE_SECRET_KEY` wyłącznie w lokalnym środowisku.
Sekretów nie przesyłaj do czatu ani nie commituj. Następnie:

```powershell
pnpm teacher:create mentor@skyblue.education "Sky Mentor"
```

Zachowaj wygenerowane hasło. Z profilu nauczyciela skopiuj UUID do
`SUPABASE_TEACHER_ID`, a następnie:

```powershell
pnpm content:sync course-example
```

Klasy i uczniów utwórz w aplikacji i przypisz lekcję do klasy.

## Odbiór

Krok C jest zakończony dopiero po zielonym wdrożeniu i sprawdzeniu na publicznym
adresie: logowanie nauczyciela, utworzenie ucznia, logowanie ucznia, Python i Turtle,
zapis po odświeżeniu oraz podgląd pracy u nauczyciela. Sprawdź też otwarcie i
odświeżenie bezpośredniego adresu ćwiczenia.
