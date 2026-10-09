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

Zgodność: stare RPC logowania pozostaje przez okres przejściowy; stare przypisania lekcji są synchronizowane z modułami migracyjnymi. Wycofanie frontendu nie wymaga kasowania nowych tabel ani przywracania bazy.
