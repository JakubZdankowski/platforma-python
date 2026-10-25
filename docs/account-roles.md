# Role kont i publikacja materiałów

| Operacja | Administrator | Nauczyciel | Uczeń |
| --- | --- | --- | --- |
| Tworzenie, edycja, usuwanie kont nauczycieli i uczniów | Tak | Nie | Nie |
| Wygenerowanie nowego hasła ucznia | Tak | Tylko uczniowie przypisanych grup | Nie |
| Przypisywanie uczniów i nauczycieli do grup | Tak | Nie | Nie |
| Użytkownicy i statystyki całej platformy | Tak | Nie | Nie |
| Podgląd grup, uczniów i zapisanego kodu na żywo | Wszystkie grupy | Przypisane grupy | Własny kod |
| Edytor lekcji Markdown, wiele ćwiczeń, kod początkowy, konsola i Turtle | Tak | Własne szkice | Nie |
| Przypisywanie i odpinanie istniejących modułów od grup | Wszystkie grupy | Tylko przypisane grupy | Nie |
| Zatwierdzanie i udostępnianie lekcji w modułach | Tak | Zgłoszenie do zatwierdzenia | Odczyt przypisanych materiałów |

Administrator i nauczyciel logują się e-mailem pod `/login`. Panel administratora jest pod `/admin`; panel nauczyciela pod `/teacher`. Uczeń nadal loguje się pod `/join` nazwą użytkownika i hasłem. Jedna grupa może mieć wielu nauczycieli. Twórca konta ucznia nie decyduje o dostępie nauczyciela: decydują przypisania do grup.

## Grupy i moduły

Grupa to uczniowie uczący się razem w danym terminie. Administrator określa jej nazwę, dzień tygodnia i godzinę (czas polski), uczniów i nauczycieli. Istniejące grupy bez terminu pokazują „Termin nieustalony”.

Moduł to uporządkowany zbiór lekcji, niezależny od nazwy, składu i terminu grupy. Ten sam moduł można przypisać do wielu grup, a grupa może realizować wiele modułów. Przypisania administrator zmienia w „Modułach grupy” lub w edytorze modułu. Przypisany nauczyciel może dodawać istniejące moduły i odpinać je na dashboardzie swojej grupy; nie edytuje zawartości modułu. Nauczyciel przegląda przypisane moduły i ich lekcje w Materiałach. Uczeń nadal widzi moduły, do których ma dostęp.

Zmiana nazwy/terminu grupy nie zmienia modułu. Odpięcie modułu lub usunięcie grupy zachowuje lekcje i zapisane prace. Indywidualny dostęp pozostaje niezależny od członkostwa w grupie.

## Materiały

Edytor korzysta z układu **Pracownia**: lista ćwiczeń po lewej, instrukcja Markdown i podgląd ucznia obok siebie, kod początkowy poniżej. Na wąskich ekranach panele układają się pionowo. Wybór projektu i archiwum wariantów opisuje [lesson-authoring-design.md](lesson-authoring-design.md).

W **Materiałach** utwórz lekcję, wpisz instrukcje w Markdown, kod początkowy i rodzaj środowiska. Pasek formatowania wstawia nagłówki, pogrubienie, listy, kod i wskazówki; obok działa sanitizowany podgląd. Można dodać kilka ćwiczeń. Zapis całej lekcji odbywa się w jednej transakcji.

Nauczyciel zapisuje szkic i wysyła go do zatwierdzenia. Zgłoszony materiał jest zablokowany do edycji. Administrator może go poprawić, zatwierdzić lub zwrócić do szkicu. Zatwierdzone materiały nauczyciel może skopiować do nowego szkicu, zachowując działającą wersję dla uczniów.

Zatwierdzenie nie przydziela lekcji automatycznie. Administrator dodaje ją do modułu w **Modułach**, a następnie udostępnia moduł grupie albo uczniowi. Szkice i zgłoszenia nigdy nie są widoczne uczniom, również gdy ich identyfikator jest znany. Kod uczniów pozostaje tylko do odczytu dla administratora i nauczyciela. Podgląd na żywo korzysta z istniejącego autosave i Realtime.

## Wdrożenie

1. Zastosuj migracje: `pnpm exec supabase db push` (lokalnie: `pnpm exec supabase migration up --local`). Migracja roli jest osobna, ponieważ Postgres wymaga zatwierdzenia nowej wartości enum przed jej użyciem.
2. Wdróż obie funkcje: `pnpm exec supabase functions deploy admin-accounts` i `pnpm exec supabase functions deploy teacher-students`. Druga pozwala administratorowi tworzyć konta i resetować hasła uczniów, a nauczycielowi resetować hasła wyłącznie uczniów przypisanych do jego grup. Wymagana jest bieżąca sesja; sprawdzenie uprawnień odbywa się po stronie serwera.
3. Utwórz pierwszego administratora: ustaw w powłoce `SUPABASE_URL` i `SUPABASE_SECRET_KEY`, następnie `pnpm admin:create admin@szkola.example "Administrator"`. Wygenerowane hasło pojawia się raz. Klucz serwisowy nigdy nie trafia do Vite ani przeglądarki.
4. Zbuduj i opublikuj frontend: `pnpm build`.

Dotychczasowe role pozostają bez zmian. Istniejący właściciele grup stają się przypisanymi nauczycielami. Istniejące lekcje otrzymują status zatwierdzony, więc uczniowie zachowują dostęp. Nowe lekcje domyślnie są szkicami. Import przez zaufany skrypt z kluczem serwisowym jawnie zatwierdza importowane treści.

Usunięcie konta nauczyciela przenosi jego grupy i materiały oraz powiązania twórcy kont uczniów do administratora; usuwa przypisania tego nauczyciela do grup. Usunięcie ucznia usuwa jego konto i prace, po potwierdzeniu w interfejsie. Zmiana loginu ucznia zachowuje identyfikator konta i zapisany kod. Reset hasła kończy poprzednie sesje.

W widoku grupy nauczyciel ma przy uczniu przycisk „Zresetuj hasło”. Po potwierdzeniu poprzednie hasło przestaje działać, a nowe jest widoczne tylko do ukrycia lub opuszczenia widoku. Hasło nie jest zapisywane w localStorage, sessionStorage ani jako jawny tekst w bazie. Obecnego hasła nie można odczytać.

Lokalny seed zawiera `admin@example.test` / `admin-dev-password`. To dane wyłącznie deweloperskie; seed nie służy do produkcji. Przy testach funkcji uruchom `pnpm exec supabase functions serve`.

Uprawnienia egzekwują RLS, granty kolumn, integralność bazy i funkcje sprawdzające bieżącą sesję. Role w interfejsie służą tylko nawigacji. Testy: `pnpm test:db`, `pnpm test:e2e:auth`, `pnpm check`.

## Przegląd ćwiczeń ucznia

W podglądzie pracy grupy administrator i przypisany nauczyciel mogą wybrać dowolne ćwiczenie dostępne danemu uczniowi. Lista obejmuje zatwierdzone lekcje z modułów udostępnionych indywidualnie i przez wszystkie grupy ucznia. Pokazuje status pracy; nierozpoczęte zadanie wyświetla kod początkowy, a pozostałe zapisany kod. Treść zadania można rozwinąć. Podgląd pozostaje tylko do odczytu.

Wybór konkretnego ćwiczenia pozostaje stały podczas aktualizacji kodu. Opcja „Podgląd na żywo” przywraca śledzenie ostatnio edytowanego ćwiczenia. Statusy w nawiasach mają kolory: ukończone — zielony, w trakcie — żółty, nierozpoczęte — szary. Zmiany dostępności są odświeżane również co 15 sekund.

Przed publikacją tej funkcji zastosuj migrację `20261011140000_student_exercise_preview.sql` poleceniem `pnpm exec supabase db push`, a następnie opublikuj frontend. Funkcja bazy sprawdza aktywną sesję i dostęp do grupy; nie wymaga aktualizacji Edge Functions.

Migracja `20261018150000_teacher_group_modules.sql` dodaje uprawnienia nauczyciela do przypisań modułów w jego grupach oraz katalog nazw i liczby lekcji, bez ujawniania innych grup ani uczniów.
