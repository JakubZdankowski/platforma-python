# Szablony lekcji Markdown

Skopiuj katalog `01-nazwa-lekcji` do prywatnego katalogu `course/` w projekcie.
Zmień nazwę katalogu, tytuły, teksty w nawiasach kwadratowych i kod początkowy.
Usuń sekcje, których nie potrzebujesz. Nie importuj szablonu bez uzupełnienia.

```text
course/
  01-pierwsze-programy/
    lesson.md
    exercise-01.md
    exercise-02.md
  02-zmienne/
    lesson.md
    exercise-01.md
```

## Pliki i kolejność

- `lesson.md` zawiera nazwę lekcji w polu `title`. Treść poniżej metadanych
  nie jest obecnie importowana ani wyświetlana. Teorię wpisuj do ćwiczeń.
- Każde ćwiczenie ma osobny plik `exercise-NN.md`. Nie musisz używać obu wariantów:
  możesz mieć same ćwiczenia konsolowe, same Turtle albo dowolną mieszankę.
- Lekcje są sortowane alfabetycznie według nazw katalogów, dlatego używaj
  numerów `01-`, `02-`, `03-` itd. Nazwy katalogów: małe litery bez polskich
  znaków, cyfry, myślniki lub podkreślenia, np. `03-petle`.
- Ćwiczenia są sortowane według numerów w nazwach plików. Numer i nazwa
  ćwiczenia w aplikacji wynikają z kolejności oraz pola `title`.
- Zapisuj pliki w UTF-8. Tytuły i instrukcje mogą zawierać polskie znaki.

## Metadane na początku pliku

Metadane muszą zaczynać się od pierwszej linii i być otoczone `---`.

| Pole | Gdzie | Wartość |
| --- | --- | --- |
| `title` | Lekcja i ćwiczenie | Tytuł od 1 do 200 znaków, w jednej linii. |
| `runtime` | Tylko ćwiczenie | `python-console` lub `python-turtle`. |

Nie dodawaj komentarzy ani zagnieżdżonych struktur do metadanych.

## Instrukcje i bloki kodu

Treść ćwiczenia jest widoczna w lewym panelu. Możesz używać nagłówków,
pogrubień, list, tabel, cytatów oraz kodu w pojedynczych backtickach.
Zwykły blok `python` jest widocznym przykładem i nie wypełnia edytora.
Surowy HTML jest pomijany; nie stosuj `<details>` do ukrywania odpowiedzi.

Podpowiedzi oznaczaj nagłówkiem `### Podpowiedź` (możesz też użyć `##`,
`Mała podpowiedź` lub numerów, np. `### Podpowiedź 2`). Aplikacja automatycznie
ukrywa treść tej sekcji i rozwija ją po kliknięciu nagłówka. Podpowiedź kończy
się na kolejnym nagłówku tego samego lub wyższego poziomu albo na końcu pliku.
Przykład:

```markdown
### Podpowiedź

Użyj pętli, aby powtórzyć polecenie cztery razy.

### Sprawdź wynik

Rysunek powinien mieć cztery równe boki.
```

Każde ćwiczenie musi mieć dokładnie jeden blok `python starter`.
Jego zawartość trafia do edytora jako kod początkowy i nie pojawia się
w instrukcji. Możesz zostawić go pusty, jeśli uczeń ma pisać od zera:

````markdown
```python starter
```
````

Opcjonalne rozwiązanie zapisuj wyłącznie w prywatnym `course/`, w bloku:

````markdown
```python solution
# Tutaj wpisz rozwiązanie dla siebie.
```
````

Importer usuwa bloki `python solution`: nie trafiają ani do instrukcji,
ani do bazy danych. Rozwiązanie wpisane w zwykły blok `python` byłoby widoczne
dla ucznia. Usuwanie przy imporcie nie ukrywa pliku źródłowego opublikowanego
na GitHub — dlatego własny kurs trzymaj w ignorowanym przez Git `course/`.

## Aktualizowanie i import

Po pierwszym imporcie zachowuj nazwy katalogów i plików. Import rozpoznaje
lekcje i ćwiczenia po tych nazwach; zmiana nazwy tworzy nowy element.
Zmiana tytułu lub instrukcji aktualizuje istniejący element. Usunięcie pliku
z dysku nie usuwa ćwiczenia z bazy. Nowy kod początkowy nie zastępuje zapisanej
pracy ucznia.

Po ustawieniu produkcyjnych `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
i `SUPABASE_TEACHER_ID` w osobnym PowerShellu:

```powershell
pnpm content:sync course
```

Import nie przypisuje lekcji do klasy automatycznie. Zaloguj się jako nauczyciel,
otwórz klasę i zaznacz lekcję. Uczeń zobaczy jej ćwiczenia po odświeżeniu listy.

Przy dodawaniu ćwiczenia do istniejącej lekcji skopiuj odpowiedni wariant
szablonu i nadaj mu kolejny numer, np. `exercise-03.md`.
