Wyślij zmiany na GitHub i zaktualizuj dev log w Obsidian. Postępuj dokładnie według poniższych kroków:

## Krok 1 — wykonaj push

```bash
git push
```

## Krok 2 — zaktualizuj dev log

Odczytaj plik `/Users/maciejgierlik/Documents/Obsidian/Pulse/Dev log/` dla bieżącego miesiąca (format nazwy: `YYYY-MM.md`, np. `2026-03.md`).

Sprawdź ostatnie commity wysłane na GitHub (`git log --oneline origin/main..HEAD` przed pushem lub `git log --oneline -5` po pushem).

Jeśli wpis na dzisiejszą datę już istnieje — dopisz do niego. Jeśli nie istnieje — dodaj nowy wpis NA GÓRZE (po nagłówku miesiąca), w formacie:

```markdown
## YYYY-MM-DD
**Zrobione:**
- [lista zmian z commitów]

**Commit:** `[hash]`

**Następne:** [zapytaj użytkownika co planuje zrobić następnym razem, jeśli nie podał]

---
```

## Krok 3 — podsumowanie

Wyświetl użytkownikowi:
- lista wysłanych commitów
- co zostało dopisane do dev logu
