# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Główni użytkownicy: dzieci i młodzież w wieku 9–16 lat, uczący się Pythona od podstaw. Wiek potwierdzony przez właściciela produktu; zastępuje wcześniejsze założenie 9–12 lat w starszej dokumentacji.
- Nauczyciel prowadzi zajęcia, przygotowuje materiały i pomaga uczniom na podstawie podglądu ich pracy.
- Administrator zarządza kontami, grupami, uprawnieniami i publikacją materiałów.

## Product Purpose

Platforma umożliwia prowadzenie zajęć z podstaw programowania w Pythonie. Głównym sposobem użycia są zajęcia prowadzone przez nauczyciela, zgodnie z potwierdzeniem właściciela produktu.

Uczeń otwiera przypisane ćwiczenie, czyta instrukcję, pisze kod i uruchamia go w przeglądarce. Widzi wynik, błąd albo efekt graficzny i może poprawić rozwiązanie. Jego praca zapisuje się na koncie. Nauczyciel może obserwować zapisany kod i ostatni wynik uruchomienia oraz udzielać pomocy.

Sukces produktu oznacza sprawne przejście od treści zadania do samodzielnej próby rozwiązania, bez instalowania środowiska Python i bez zbędnych czynności technicznych. Nie ustalono ilościowych mierników sukcesu.

## Operating Context

- Główny kontekst: lekcja z nauczycielem i uczniami pracującymi na własnych kontach.
- Aplikacja jest polskojęzyczna. Kod ucznia korzysta z rzeczywistej składni Pythona; polskie znaki muszą działać w instrukcjach, kodzie, wejściu i wyjściu.
- Uczeń loguje się nazwą użytkownika i hasłem, bez adresu e-mail. Nauczyciel i administrator logują się adresem e-mail i hasłem.
- Podstawowym urządzeniem zakładanym w dokumentacji jest laptop z nowoczesną przeglądarką. Interfejs jest też sprawdzany na wąskich ekranach; testy Chromium nie zastępują weryfikacji na fizycznym Chromebooku i telefonie.
- Środowisko deweloperskie: istniejąca aplikacja React, TypeScript i Vite. `pnpm dev` przygotowuje Pyodide i uruchamia lokalny podgląd. Bieżący podgląd eksperymentalny używa portu 4174; port nie stanowi wymagania produktu.

## Capabilities and Constraints

Stan funkcjonalny wynika z istniejącej implementacji i dokumentacji ról:

- Kod Pythona wykonuje się w przeglądarce, w Pyodide działającym w Web Workerze. Kod uczniów nie jest wykonywany na serwerze aplikacji.
- Ćwiczenia obsługują konsolę, `input()`, błędy Pythona, zatrzymywanie wykonania oraz edukacyjny podzbiór Turtle.
- Instrukcje są zapisywane w Markdown. Ćwiczenie ma kod początkowy oraz określony rodzaj środowiska.
- Kod ucznia i metadane ostatniego uruchomienia są zapisywane automatycznie. Poprawne wykonanie programu nie jest automatycznym potwierdzeniem rozwiązania zadania.
- Nauczyciel ma podgląd pracy uczniów przypisanych grup, tylko do odczytu. Podgląd aktualizuje się na podstawie autosave i Supabase Realtime; nie należy obiecywać transmisji każdego naciśnięcia klawisza.
- Administrator zarządza kontami oraz zatwierdza i udostępnia materiały. Nauczyciel tworzy własne szkice i zgłasza je do zatwierdzenia. Szczegóły uprawnień określa `docs/account-roles.md`.
- Terminologia z `GLOSSARY.md` obowiązuje także przy przyszłych zmianach: grupa to uczniowie uczący się razem w określonym terminie; moduł to uporządkowany zbiór lekcji; lekcja zawiera ćwiczenia. Grupa i moduł nie są synonimami.
- Dostęp do materiałów i kodu musi respektować role oraz przypisania. Ograniczenia dostępu są egzekwowane w bazie i funkcjach backendu, nie wyłącznie w interfejsie.
- Produkt pozostaje skupionym środowiskiem nauki, bez ambicji zastąpienia pełnego IDE lub rozbudowanego LMS.

Potwierdzony kierunek dalszego rozwoju: symulowanie ruchu wirtualnego robota w Pythonie jako ćwiczenie pętli i warunków, niezależne od sprzętu SPIKE. Jest to planowana funkcja, a nie działająca obecnie część platformy. Model świata robota, polecenia i zasady oceny zadań pozostają do ustalenia.

## Brand Commitments

- Istniejące nazewnictwo: „Sky Blue” w logo oraz „Kurs programowania w języku Python” w aplikacji. Nie ustalono nowej nazwy handlowej.
- Język interfejsu ma być prosty, konkretny i zrozumiały dla początkującego ucznia.
- Właściciel produktu wskazał `Spike_Symulator_v1.3.6.html` jako wiążący punkt odniesienia dla stylu wizualnego całej platformy. Nie oznacza to zależności produktu od SPIKE ani przejęcia jego konfiguracji sprzętowej. Receptury wizualne nie należą do tego dokumentu.

## Evidence on Hand

- Kod istniejącej platformy: `src/`, testy jednostkowe i scenariusze przeglądarkowe w `tests/`.
- Bieżące role i publikacja materiałów: `docs/account-roles.md`; terminologia: `GLOSSARY.md`.
- Dokumentacja architektury: `docs/architecture.md`; specyfikacja historyczna: `docs/product-spec.md`; instrukcje projektu: `CLAUDE.md`. Starsze dokumenty mogą zawierać wcześniejszy zakres wieku lub funkcji.
- Publiczne przykłady materiałów: `course-example/`. Prywatne materiały i rozwiązania nie są dowodem dostępnym do publikacji.
- Istniejący znak graficzny: `src/assets/blue-logo.png`.
- Referencyjny HTML dostarczony przez właściciela produktu znajduje się lokalnie poza repozytorium: `C:/Users/Kuba/Downloads/Spike_Symulator_v1.3.6.html`.
- Nie dostarczono potwierdzonych wyników edukacyjnych, opinii klientów, danych o skali użytkowania ani unikalnych przewag rynkowych. Nie należy ich wymyślać.

## Product Principles

1. Uczeń skupia się na rozumieniu programu i zadania, a obsługa środowiska wymaga minimum wiedzy technicznej.
2. Nauczyciel prowadzi proces nauki i ma dostęp do informacji potrzebnych do udzielenia pomocy.
3. Program daje czytelną informację zwrotną: wynik, pytanie o dane, błąd lub efekt graficzny.
4. Praca ucznia i prywatność danych mają pierwszeństwo przed wygodą wdrożenia nowych funkcji.
5. Nowe środowiska, w tym robot, wspierają naukę Pythona i korzystają ze wspólnego systemu lekcji.

## Accessibility & Inclusion

- Wiek 9–16 lat oznacza różny poziom samodzielności i doświadczenia; instrukcje oraz komunikaty nie powinny zakładać znajomości IDE.
- Zachowywać obsługę klawiatury, widoczny fokus i dostępne nazwy przycisków ikonowych.
- Istnieją testy kontrastu AA, wąskich ekranów, dotyku, powiększenia i widoczności formularza `input()`. Nie stanowią potwierdzenia pełnej zgodności produktu z WCAG.
- Konkretne potrzeby związane z technologiami asystującymi i formalny zakres zgodności pozostają nieustalone.
