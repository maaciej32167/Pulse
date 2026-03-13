Wykonaj lokalny git commit. Postępuj dokładnie według poniższych kroków:

## Krok 1 — sprawdź zmiany

Uruchom równolegle:
- `git status` — lista zmienionych plików
- `git diff` — szczegóły zmian
- `git log --oneline -3` — ostatnie commity (dla kontekstu stylu)

## Krok 2 — sformułuj commit

Na podstawie zmian napisz krótki komunikat commita po polsku (max 72 znaki w pierwszej linii). Styl: "Czas przeszły, co zostało zrobione".

## Krok 3 — wykonaj commit

```bash
git add -A
git commit -m "<komunikat>"
```

Nie używaj `git push` — tylko lokalny commit.

## Krok 4 — podsumowanie

Wyświetl użytkownikowi:
- hash commita
- lista zmienionych plików
