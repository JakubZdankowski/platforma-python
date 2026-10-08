# Stan aplikacji — 2026-10-08

Kroki A, B i C MVP są zakończone. Aplikacja działa na GitHub Pages z produkcyjnym Supabase. Przeniesienie na cyberFolks i własną domenę jest odłożone do zakończenia testów. Ten dokument opisuje stan po ostatnich poprawkach UI.

## Gotowe

- Logowanie nauczyciela i ucznia; tworzenie klas, kont uczniów i resetowanie haseł. Ćwiczenia wymagają logowania.
- Import lekcji i ćwiczeń Markdown, szablony w `course-template`, przypisywanie lekcji do klas.
- Edytor Python, uruchamianie w przeglądarce, konsola i Turtle z dynamicznym rozmiarem pola rysowania.
- Automatyczny zapis z ponawianiem, przywracanie kodu początkowego, nawigacja między ćwiczeniami i wynik ostatniego uruchomienia.
- Podgląd kodu uczniów na żywo, tylko do odczytu, z boczną listą umożliwiającą przełączanie bez przewijania całej strony. Aktywność jest szacowana z zapisów, nie jest statusem obecności.
- Zwarty układ ekranów, rozwijane podpowiedzi i potwierdzenie odpięcia lekcji od klasy.
- Otwarty ekran sprawdza dostęp do ćwiczenia co 5 sekund oraz po powrocie do karty i odzyskaniu sieci. Po cofnięciu dostępu zachowuje kod do skopiowania/pobrania i przełącza edytor w tryb tylko do odczytu; ponowne przypisanie przywraca edycję.
- Komunikaty utraty sieci i błędów zapisu, ostrzeżenie przeglądarki przy zamykaniu lub odświeżaniu z niezapisanymi zmianami oraz pobieranie aktualnego kodu jako `.py`, także bez sieci.
- RLS oraz testy uprawnień i izolacji danych, testy jednostkowe i przeglądarkowe. Wdrożenie i scenariusz odbioru na publicznym adresie przeszły; nie stanowi to pełnego audytu bezpieczeństwa ani testu obciążenia całej klasy.

## Kolejność dalszych prac

1. Pilotaż z 3–4 uczniami: równoczesne logowanie, zapis, podgląd, zmiana ćwiczeń i uruchamianie Python/Turtle na docelowych komputerach.
2. Test utraty sieci, odświeżenia i zamknięcia karty, ponownego połączenia oraz odpięcia lekcji podczas pracy. Naprawy wynikające z pilotażu.
3. Ocena zabezpieczeń pracy podczas pilotażu. Rozważenie lokalnej kopii wymaga uwzględnienia wspólnych komputerów i czyszczenia danych.
4. Kopie zapasowe i próbne odtworzenie; ustalenie retencji danych, zasad usuwania kont i prac, informacji o prywatności i obsługi incydentów.
5. Pilotaż z pełną klasą, sprawdzenie limitów usług i czasu startu Pyodide.
6. Po odbiorze: własny adres i hosting cyberFolks, HTTPS, konfiguracja tras i Auth oraz ponowny test funkcjonalny.

## Ryzyka i ograniczenia

- Odpięcie lekcji nie usuwa zapisanej pracy. Otwarta karta wykrywa cofnięcie dostępu przy najbliższym udanym sprawdzeniu. Kod pozostaje na ekranie, ale niezapisane zmiany można utracić po zamknięciu karty mimo ostrzeżenia. Ostrzeżenie przeglądarki nie gwarantuje ochrony przy awarii, wymuszonym zamknięciu ani na wszystkich urządzeniach mobilnych; pobranie `.py` jest kopią awaryjną.
- Dane obejmują identyfikatory i nazwy uczniów, kod, znaczniki czasu i wynik ostatniego uruchomienia. Podgląd nauczyciela wymaga przejrzystej informacji dla uczestników. Preferowane są minimalne dane, np. imię lub pseudonim zamiast pełnego nazwiska.
- Przed użyciem z rzeczywistymi uczniami należy ustalić administratora danych, podstawę przetwarzania, obowiązek informacyjny, retencję oraz warunki powierzenia i transferów danych u dostawców. Nie przeprowadzono weryfikacji prawnej zgodności z RODO.
- Przejęcie konta nauczyciela daje dostęp do prac jego uczniów. Potrzebne są bezpieczne hasła, wylogowanie na wspólnych komputerach i ochrona kont administracyjnych GitHub/Supabase.
- Publiczny publishable key jest przeznaczony do frontendu; ochronę danych zapewniają uprawnienia i RLS. Secret/service_role omija te zabezpieczenia i musi pozostać poza repozytorium i aplikacją przeglądarkową.
- Repozytorium jest publiczne. Rzeczywiste dane, kopie bazy, hasła i prywatne rozwiązania lekcji nie mogą trafiać do commitów; usunięcie z bieżącego pliku nie usuwa historii Git.
- Zapis i podgląd zależą od sieci i Supabase. Nie zweryfikowano tu planu usług, regionu danych ani konfiguracji kopii zapasowych. Git przechowuje kod aplikacji, nie zastępuje kopii danych uczniów.
- Python działa w przeglądarce z limitem czasu i możliwością zatrzymania. To nie jest audytowana izolacja dla dowolnego wrogiego kodu; należy zweryfikować granice dostępu środowiska do sieci i danych sesji przed dopuszczeniem takiego scenariusza.

Źródła operacyjne: [kopie Supabase](https://supabase.com/docs/guides/platform/backups), [checklista produkcyjna](https://supabase.com/docs/guides/deployment/going-into-prod). Źródło dotyczące ról administratora i podmiotu przetwarzającego: [Komisja Europejska](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en).
