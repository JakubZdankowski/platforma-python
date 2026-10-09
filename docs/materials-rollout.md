# Materiały i niezależne konta uczniów

Małe kroki wdrożenia (backend przed interfejsem):

1. Globalnie unikalne loginy, nowe logowanie bez kodu grupy i tworzenie kont bez grupy. Stare logowanie pozostaje zgodne.
2. Moduły, uporządkowane lekcje, dostęp przez grupę lub indywidualnie; migracja istniejących klas i testy RLS.
3. Panel nauczyciela: osobna lista uczniów, wewnętrzne grupy i zarządzanie modułami/przypisaniami.
4. Panel ucznia: Pulpit / Materiały / Pomoc, moduły rozwijane na pełną szerokość; logowanie bez kodu grupy.
5. Testy migracji i przeglądarkowe, publikacja, kontrola na publicznym adresie.

## Raport przed migracją — 2026-10-09

Produkcja: 2 konta uczniów, 0 powtarzających się loginów, 1 klasa, 1 przypisanie lekcji, 3 rekordy zapisanej pracy. Nie ma potrzeby zmiany loginów ani haseł.

Identyfikatory kont, lekcji, ćwiczeń i zapisanej pracy pozostają bez zmian. Grupy zachowują członkostwa. Każda istniejąca klasa otrzyma odpowiadający moduł z dotychczas przypisanymi lekcjami. Moduł zostanie udostępniony tej samej grupie. Lekcja może należeć do kilku modułów; kod jest wspólny dla tego samego ćwiczenia.

Nowe tabele muszą stosować zarówno RLS własności/dostępu, jak i wymóg aktualnej sesji. Cofnięcie jednego przypisania nie odbiera uprawnień uzyskanych inną drogą. Cofnięcie wszystkich nie usuwa zapisanej pracy.

Zgodność: stare RPC logowania pozostaje przez okres przejściowy; stare przypisania lekcji są synchronizowane z modułami migracyjnymi. Nowy interfejs nie używa tych przypisań. Po końcowej migracji grup cofnięcie frontendu do wersji sprzed modułów wymaga również przywrócenia wcześniejszych polityk odczytu grup; nie należy usuwać nowych tabel ani zapisanej pracy.

## Punkty kontrolne

- Migracje `100000` i `110000` oraz funkcja kont uczniów zostały wdrożone przed zmianą UI. Kontrola produkcji: 2 uczniów, 1 moduł, 1 lekcja w module, 1 przypisanie grupowe, 3 zapisane prace, 0 brakujących mapowań.
- Lokalnie: 85 testów jednostkowych i 4 testy parsera, 27 testów bazy, 16 scenariuszy kont i edytora oraz 3 testy strony startowej i materiałów. Produkcyjny build i TypeScript przechodzą.
- Test przeglądarkowy `materials.spec.ts`: konto bez grupy → logowanie → pusty pulpit → indywidualny moduł → ćwiczenie → zapis → powrót do rozwiniętego modułu → cofnięcie dostępu bez utraty pracy.
- Migrację `120000` wdrażać po publikacji interfejsu modułów. Odbiera uczniom odczyt wewnętrznych grup i członkostw; dostęp do materiałów przez grupę pozostaje aktywny.

## Sprawdzenie na żywo

1. Uczeń: `/join`, dotychczasowy login i hasło, bez kodu klasy. Pulpit i Materiały nie pokazują nazw grup. Wiersz modułu zawiera tylko nazwę i strzałkę; kliknięcie rozwija lekcje.
2. Nauczyciel: Uczniowie → nowe konto, bez wymogu grupy. Materiały → nowy moduł → lekcje → udostępnienie grupie lub indywidualnie.
3. Uczeń: odświeżenie pokazuje przypisany moduł. Powrót z zadania zachowuje otwarty moduł, a kod pozostaje zapisany.
4. Nauczyciel: odpięcie jednej drogi dostępu nie odbiera drugiej. Usunięcie wszystkich przypisań ukrywa materiały, ale nie kasuje pracy.

Automatyczny odczytowy test publicznej strony (dedykowane konto wdrożeniowe, bez zmian treści):

```powershell
node --env-file=.env.production.account.local scripts/check-materials-production.mjs
```

Logowanie testowe kończy wcześniejszą sesję tego samego konta. Skrypt nie używa kont zwykłych uczniów i nie wypisuje danych logowania.
