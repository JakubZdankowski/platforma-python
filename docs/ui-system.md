# Wspólny styl UI

Domyślne wartości są w `src/app/ui/tokens.css`. `styles.css` importuje je zarówno dla aplikacji, jak i fixture’ów testowych. Warsztat `/ui` odczytuje domyślne wartości z rzeczywistego CSS; zapisany wariant działa wyłącznie wewnątrz jego podglądu.

- Treść i kod: 16 px; kontrolki i tabele: 14 px; metadane: 12 px; nagłówki sekcji: 20 px; tytuły stron: 28 px. Nagłówki paneli roboczych: 14 px.
- Odstępy: 4, 8, 12, 16, 24, 32, 48 px. Wymiary paneli, siatek, logo, uchwytów i canvasu wynikają z ich funkcji, nie ze skali odstępów.
- Kontrolki: minimum 40 px; wariant kompaktowy: 32 px; na urządzeniach dotykowych pola aktywacji: minimum 44 px.
- Promienie: kontrolki 6 px, powierzchnie 8 px. Okrągłe wskaźniki oraz rysunek zachowują własną geometrię.
- Płaskie granatowe powierzchnie, niebieski akcent; cień tylko dla menu nakładanych. Kolory komunikatów zawsze uzupełnia tekst.

## Komponenty

`Button` zachowuje natywne atrybuty przycisku, ref i dotychczasową semantykę formularza. `ButtonLink` używa routera i pozostaje linkiem. Oba przyjmują `variant="primary|secondary|quiet|danger"` i `size="default|compact"`. Domyślny wariant to `secondary`. Wybór zadania ma wariant secondary i `aria-pressed`; główny zapis ma primary.

`unstyled` jest przeznaczone wyłącznie dla wyspecjalizowanych kontrolek: wiersza wyboru ucznia, list ćwiczeń i paska paneli. Ich wygląd i stany określają wspólne reguły tych kontrolek. Nie stosować go do zwykłych akcji formularza.

`PageHeading`, `Notice`, `EmptyState` i `MaterialModule` definiują wspólne wzorce. Moduł w warsztacie i panelu ucznia używa tego samego komponentu, wraz z ukrywaniem treści, `aria-expanded` i powiązaniem regionu. Pola formularzy używają `.field`, grupy akcji `.ui-actions`; ikony pochodzą z `Icon` i własnych SVG.

## Weryfikacja

- `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`.
- `pnpm exec playwright test tests/ui-consistency.spec.ts`: klawiatura, kontrast tokenów, linki przyciskowe, dotyk, powiększenie 200% i warsztat przy 390, 768, 1280, 1440 px.
- `pnpm exec playwright test --config playwright.auth.config.ts ui-audit.spec.ts`: wszystkie aktywne widoki trzech ról przy tych szerokościach, długie tytuły i zrzuty do `test-results/ui-audit/`. Test tworzy i usuwa własnego nauczyciela, grupę, moduł oraz lekcję. Wymaga lokalnego Supabase i kont ucznia Ania oraz administratora z seeda.
- Pozostałe testy kont sprawdzają autosave, wykonanie kodu, zapis materiałów i podgląd tylko do odczytu. Testy zależne od nauczyciela z seeda wymagają zgodności jego hasła z `SEED.teacher`.

Zestawy Playwright uruchamiać kolejno, ponieważ czyszczą wspólny katalog wyników. Testy kontrastu obejmują domyślną paletę; własne warianty warsztatu wymagają osobnej oceny. Automatyczne sprawdzenia uzupełnić wizualnym przeglądem zrzutów.
