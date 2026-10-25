---
name: "Sky Blue — Pracownia Pythona"
description: "Spokojne, przyjazne i uporządkowane środowisko do nauki programowania."
colors:
  background: "#f3f7fc"
  surface: "#ffffff"
  surface-raised: "#f4f8fe"
  surface-editor: "#132b44"
  surface-hover: "#eef5ff"
  surface-selected: "#e8f1fd"
  border: "#d7e3f2"
  border-control: "#6b829e"
  text: "#18314c"
  text-muted: "#52667e"
  text-subtle: "#5e7188"
  accent: "#1756aa"
  accent-hover: "#12468d"
  on-accent: "#ffffff"
  success: "#237b52"
  success-fill: "#268358"
  success-hover: "#237b52"
  danger: "#c4372a"
  danger-surface: "#fff4f2"
  danger-border: "#e8b4ad"
  warning: "#80520b"
  warning-surface: "#fff7e6"
  warning-border: "#e7c383"
  nav-background: "#0d2c4e"
  nav-text: "#ecf5ff"
  nav-muted: "#c8dbf1"
  nav-hover: "#1d4678"
  nav-border: "#3c5a80"
  code-text: "#ecf5ff"
  code-muted: "#9db6d3"
  code-toolbar: "#243d59"
  code-gutter: "#0f2236"
  focus: "#e39318"
typography:
  title:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.7px"
  section:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 650
  body:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  control:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.4
  meta:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif"
    fontSize: "12px"
  code:
    fontFamily: "Consolas, \"Liberation Mono\", monospace"
    fontSize: "16px"
    lineHeight: 1.7
rounded:
  control: "9px"
  panel: "14px"
  pill: "999px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-6: "24px"
  space-8: "32px"
  space-12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-run:
    backgroundColor: "{colors.success-fill}"
    textColor: "{colors.on-accent}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px"
  field:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  nav-student:
    backgroundColor: "{colors.nav-background}"
    textColor: "{colors.nav-muted}"
    rounded: "{rounded.panel}"
    padding: "12px 15px"
  exercise-chip:
    backgroundColor: "{colors.surface-selected}"
    textColor: "{colors.accent}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
  code-heading:
    backgroundColor: "{colors.code-toolbar}"
    textColor: "{colors.code-text}"
    padding: "8px 16px"
---

# Design System: Sky Blue — Pracownia Pythona

## Overview

**Creative North Star: "Pracownia Pythona"**

Pracownia Pythona to spokojne, przyjazne i uporządkowane miejsce do nauki oraz eksperymentów. Jasne tło i białe powierzchnie porządkują zadania oraz materiały. Granat pracowni wyznacza obszary narzędziowe, a ciemne pole kodu i konsoli pozwala łatwo rozpoznać miejsce pracy programu.

Proste, zaokrąglone kontrolki i wyraźny fokus wspierają samodzielną obsługę. Obramowania organizują panele, a delikatne cienie oddzielają je od tła. Dokument opisuje istniejącą implementację na branchu codex/simulator-visual-style oraz język stylu potwierdzony przez właściciela produktu; nie stanowi nowego projektu graficznego.

**Key Characteristics:**
- Błękit Sky Blue jako akcent interakcji.
- Granat pracowni w nawigacji, edytorze i konsoli.
- Jasne tło, czytelne panele i subtelna głębia.
- Proste i przyjazne kontrolki z widocznym fokusem.

Źródła: `src/app/ui/tokens.css`, `src/app/styles.css`, `src/app/ui/`, `src/editor/CodeEditor.tsx`, `src/student/ExercisePage.tsx`, `src/output/OutputPanel.tsx` oraz `src/staff/material-authoring.css`. Kontekst produktu określa `PRODUCT.md`. Format dokumentu: [DESIGN.md Format](https://raw.githubusercontent.com/google-labs-code/design.md/main/docs/spec.md).

Wartości w YAML są normatywnym zapisem tokenów pobranych z implementacji. Zmiana systemu wymaga uzgodnionej aktualizacji kodu i dokumentacji; ten zapis sam nie zmienia CSS aplikacji.

## Colors

Paleta łączy Błękit Sky Blue, granat pracowni i jasne tło. Role odpowiadają istniejącym zmiennym CSS o tych samych nazwach.

### Primary

- **Błękit Sky Blue** (`accent`, `accent-hover`): linki, wybór elementów i domyślna akcja główna.
- **Zieleń uruchamiania** (`success-fill`, `success-hover`): przycisk uruchomienia kodu; `success` jest tekstem informacji o powodzeniu.
- **Bursztyn fokusu** (`focus`): obrys aktywnej kontrolki podczas obsługi klawiaturą.
- **Komunikaty**: `danger*` dla błędów i zatrzymywania, `warning*` dla ostrzeżeń. Ich nazwy opisują funkcję, nie dodatkowe akcenty marki.

### Neutral

- **Jasne tło** (`background`), biała powierzchnia (`surface`) oraz chłodne powierzchnie pomocnicze (`surface-raised`, `surface-hover`, `surface-selected`) porządkują treści.
- **Granat pracowni** (`nav-background`) organizuje nawigację; `nav-hover`, `nav-border`, `nav-text`, `nav-muted` opisują jej stany.
- **Atramentowe pole kodu** (`surface-editor`) i głębszy margines numerów linii (`code-gutter`) są wspólne dla pracy z kodem i wynikiem.
- Nagłówki edytora i konsoli korzystają z `code-toolbar`, `code-text` oraz `code-muted`.
- `text`, `text-muted`, `text-subtle` są przeznaczone dla jasnych powierzchni. Nie przenosić ich bezpośrednio na ciemne tło; używać wariantów `code-*` lub `nav-*`.
- `border` oddziela powierzchnie, a mocniejszy `border-control` wskazuje granice pól i kontrolek.

**The Work Surface Rule.** Błękit wskazuje interakcje; ciemne powierzchnie wyznaczają kod, konsolę i nawigację. Zielone uruchamianie programu jest świadomym wyjątkiem od domyślnego błękitnego przycisku.

Kolory składni w obecnym CodeMirror: słowa kluczowe (`#ffcf6b`), napisy (`#b5e8a6`), liczby (`#ffb88a`), komentarze (`#8aa7c4`), funkcje (`#7fd6ff`), operatory (`#ecf5ff`). Nie są globalną paletą komunikatów.

## Typography

Tekst interfejsu używa systemowego stosu bezszeryfowego z frontmatter. Kod i wynik programu używają Consolas z ustalonymi zamiennikami. Nie ma odrębnego fontu reklamowego ani matematycznej skali typograficznej.

### Hierarchy

- `title`: standardowy tytuł strony; na stronie startowej obecne jest płynne powiększanie od 28 do 40 px. Nie traktować go jako stałej wielkości wszystkich nagłówków.
- `section`: nagłówki sekcji.
- `body`: główna treść i pola formularzy; Markdown może mieć lokalny interliniowy wariant 1.6.
- `control`: przyciski, etykiety i kompaktowe treści robocze.
- `meta`: pomocnicze opisy i metadane; nie zastępuje tekstu instrukcji.
- `code`: edytor oraz wynik Pythona. Zachowywać wcięcia i łamanie długiego wyjścia.

Nagłówki paneli są zwarte i wyraźniejsze niż treść; aktualna implementacja używa dla nich wagi 750. Cyfry czasu wykonania są tabularyczne. Rzeczywiste wyjątki wielkości i wag są lokalne dla strony, a nie nową uniwersalną skalą.

## Layout

Bazą jest skala odstępów `space-1` do `space-12`. Powiązane kontrolki używają małych odstępów; treść paneli i rozdzielenie sekcji większych. Istnieją także lokalne odstępy stron; dokument nie zamienia ich automatycznie na tokeny.

Główne powierzchnie robocze mają maksymalną szerokość 1800 px. Strona startowa ma węższy kontener (1080 px), zwykłe strony kont (960 px), a panel logowania (480 px z marginesem na małych ekranach). Widoki nauczyciela mogą wykorzystywać pełną szerokość.

### Exercise workspace

- Na dużym ekranie: pasek ikon i przylegające instrukcje po lewej, edytor z konsolą pod nim; Turtle, gdy aktywny, ma osobny podgląd z prawej.
- Pasek ikon zachowuje szerokość po rozwinięciu: 52 px standardowo i 58 px w zapisanym ćwiczeniu na dużym ekranie. Na małym ekranie 42 px lub 52 px przy sterowaniu dotykiem. Wspólna krawędź z instrukcjami jest prosta; zewnętrzne narożniki pozostają zaokrąglone.
- Podstawowe progi układu pracy: do 1100 px oraz do 720 px. Na węższych ekranach instrukcja znajduje się nad obszarem kodu, a rysunek może przejść pod niego.
- Konsola ma obecnie podstawę `clamp(200px, 30%, 280px)` i minimum 200 px. Wynik i aktywna linia odpowiedzi przewijają się razem; oczekiwanie na `input()` odsłania aktywne pole.
- Zmiana zadania otwiera instrukcję. Uczeń może ją ponownie zwinąć w bieżącym zadaniu.

### Other surfaces

Panele korzystają ze wspólnego nagłówka z logo, kontem i wylogowaniem. Uczeń ma ikonę pomocy bezpośrednio przed wylogowaniem i nie ma osobnego paska nawigacji; konto ma postać „Imię (uczeń)”. Lista modułów znajduje się na stronie głównej. Nauczyciel i administrator mają poziomą nawigację pod nagłówkiem. Materiały rozwijają moduły i lekcje. Redaktor materiałów ma własne progi 1250 i 760 px oraz zestawione pola i podgląd; nie przenosić do niego bez sprawdzenia reguł siatki ćwiczenia.

Układy pozostają elastyczne: kontrolki mogą przechodzić do następnego wiersza, a treść tabel przewijać się we własnym obszarze. Minimalna wysokość domyślnej kontrolki to 40 px, kompaktowej 32 px; obsługa dotykowa podnosi ważne cele do co najmniej 44 px.

## Elevation & Depth

Subtelna głębia: obramowania porządkują panele, delikatne cienie oddzielają je od tła. Zmiana odcienia powierzchni sygnalizuje hover lub wybór. Przezroczystość i rozmycie tła nie są materiałem obecnego systemu.

### Shadow Vocabulary

- **Panel:** `0 1px 2px rgb(13 44 78 / 5%)` — powierzchnie pracy i karty.
- **Lista nakładana:** `0 8px 24px rgb(13 44 78 / 16%)` — rozwinięta lista wyboru zadania.
- **Dialog:** `0 8px 32px rgb(13 44 78 / 20%)` — informacje o uczniu.

Obrys płótna Turtle jest technicznym wyjątkiem: `0 0 0 1px` w kolorze obramowania. Nie zmniejsza powierzchni rysowania i nie jest wzorcem cienia panelu.

**The Subtle Depth Rule.** Obramowania porządkują panele, a delikatny cień oddziela je od tła. Mocniejsza głębia służy nakładkom i dialogom.

## Shapes

Proste i przyjazne: miękkie narożniki kontrolek (`rounded.control`) i większe narożniki paneli (`rounded.panel`). Małe etykiety zadania mają kształt pigułki (`rounded.pill`). Nie zaokrąglać wewnętrznych krawędzi dwóch połączonych paneli.

Podstawowa linia podziału ma 1 px. Obecna implementacja zachowuje lokalne wyjątki promieni w istniejących widokach; nie należy udawać, że każdy element został już ujednolicony.

## Components

### Buttons

Domyślna akcja główna jest błękitna, uruchamianie programu zielone. Przyciski pomocnicze mają jasną powierzchnię i czytelną krawędź; na granatowym pasku przyjmują jasny tekst i obrys pasujący do tego tła. Wariant dyskretny jest przezroczysty. Wariant niebezpieczny używa semantyki błędu.

Hover zmienia wypełnienie lub obramowanie. Fokus: bursztynowy obrys 2 px z odsunięciem 2 px; pola mogą używać odsunięcia 1 px. Stan disabled ma mniejsze krycie (0.55) i wyłączoną akcję.

Przejścia przycisków trwają 120 ms z domyślną krzywą CSS `ease`. Istnieją też przejścia 150 ms dla wybranych linków i uchwytów. Preferencja ograniczonego ruchu wyłącza przejścia przycisków; nie oznacza to pełnego audytu wszystkich animacji.

### Fields

Jasne formularze używają powierzchni pomocniczej, tekstu głównego i wyraźnego obramowania. Etykieta pozostaje nad polem; błąd ma semantyczny kolor i dostępny komunikat. Pole odpowiedzi w konsoli wtapia się w tekst: przezroczyste tło, wspólny font i jasny kursor. Zachowuje dostępną nazwę dla czytnika ekranu.

### Navigation

Pozioma nawigacja ucznia, nauczyciela i administratora jest jasna, z błękitnymi etykietami. Wybrana pozycja ma błękitne wypełnienie i wyraźną ramkę.

### Panels, chips and materials

Panele są białe, z delikatną linią i cieniem. Etykieta aktualnego zadania to niewielka błękitna pigułka. Moduł materiałów rozwija lekcje przyciskiem z jawnym stanem i znakiem plus/minus. Karty nie zastępują treści: nazwa, opis oraz dostępna akcja muszą pozostać czytelne.

### Editor and console

W ćwiczeniu ucznia nagłówki kodu i konsoli mają to samo granatowe tło i jasny tekst. Akcje programu znajdują się w górnym pasku edytora. Reset jest ikoną odświeżania z nazwą dostępną i tooltipem; przed zastąpieniem kodu wymaga istniejącego potwierdzenia.

Pasek edytora nie zawiera etykiet „Zapisano”, „Python”, statusu gotowości ani pobierania kodu .py. Dotyczy to tego paska; awaryjne odzyskiwanie niezapisanej pracy po zakończeniu sesji pozostaje odrębną funkcją.

Pole `input()` znajduje się bezpośrednio za ostatnim tekstem stdout, z natywnym mrugającym kursorem. Po pojawieniu się otrzymuje fokus i jest odsłaniane także po długim wyjściu i zmianie rozmiaru widoku. Enter wysyła odpowiedź, która pozostaje w zapisie konsoli. Poprawny przebieg programu, błędy i oczekiwanie na dane są komunikowane w konsoli.

## Do's and Don'ts

### Do:
- Do używaj istniejących tokenów oraz wspólnych kontrolek zamiast tworzyć równoległą paletę.
- Do zachowuj czytelny kontrast, fokus klawiatury i nazwę dostępną dla każdej ikony akcji.
- Do utrzymuj wspólny styl nagłówków kodu i konsoli oraz jasne powierzchnie instrukcji.
- Do traktuj układ ćwiczenia opisany w sekcji Layout jako wzorzec tej powierzchni, a nie obowiązkowy szablon wszystkich stron.

### Don't:
- Don't przywracaj usuniętych opisów statusu ani pobierania .py do paska edytora bez nowej decyzji użytkownika.
- Don't pozostawiaj aktywnej linii input() poza widocznym obszarem konsoli.
- Don't zwiększaj szerokości paska ikon podczas rozwijania instrukcji.
- Don't zmieniaj potwierdzonej palety, fontów ani skali odstępów przy dodawaniu pojedynczego ekranu.

Rozszerzenia i przykłady do panelu Impeccable znajdują się w `.impeccable/design.json`. Syntetyczne rampy tonalne w tym pliku służą wyłącznie podglądowi palety; nie są nowymi kolorami aplikacji.
