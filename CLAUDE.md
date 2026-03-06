# CLAUDE.md — Siła Native (React Native)

## Reguły pracy

- **Przed nietrywialną zmianą** — przedstaw plan i zapytaj o zgodę
- **Przy prostych, jednoznacznych poleceniach** — działaj od razu bez pytania
- Testy: `npx expo start --tunnel` → Expo Go na telefonie
- PWA (`/Users/maciejgierlik/Documents/Aplikacje/sila/index.html`) działa niezależnie

---

## Opis projektu

**Siła Native** — przepisanie PWA na React Native (Expo).
Cel: natywna aplikacja iOS (+ Android) dostępna w App Store.

- Expo SDK 54
- Nawigacja: React Navigation v7 (bottom tabs)
- Dane: AsyncStorage (odpowiednik localStorage z PWA)
- Język UI: polski
- Design: "Obsidian Glass" — ciemne tło `#080808`, akcent `#818cf8`

---

## Uruchomienie lokalne

```bash
cd /Users/maciejgierlik/Documents/Aplikacje/sila-native
npx expo start --tunnel
```

Następnie zeskanuj QR kod w aplikacji **Expo Go** na telefonie.

---

## Struktura projektu

```
App.js                    # Nawigacja (bottom tabs)
screens/
  StartScreen.js          # Dodaj serię + PR ✅
  HistoryScreen.js        # Historia rekordów (do zbudowania)
  PlanScreen.js           # Planowanie treningu (do zbudowania)
  ExercisesScreen.js      # Lista ćwiczeń (do zbudowania)
  ProfileScreen.js        # Profil + waga ciała (do zbudowania)
src/
  storage.js              # AsyncStorage helpers ✅
  utils.js                # Logika biznesowa (1RM, effectiveWeight) ✅
```

---

## Design System — Obsidian Glass

```javascript
const C = {
  bg:      '#080808',
  card:    'rgba(255,255,255,0.05)',
  border:  'rgba(255,255,255,0.09)',
  txt:     '#f1f5f9',
  muted:   '#64748b',
  accent:  '#818cf8',   // indigo
  accent2: '#a78bfa',   // violet
  danger:  '#f87171',
};
```

---

## Logika biznesowa (src/utils.js)

| Funkcja | Opis |
|---|---|
| `estimate1RM(weight, reps)` | Wzór Brzycki: `weight × (36 / (37 - reps))` |
| `effectiveWeight(record, bwExercises, bodyWeight)` | BW + dodatkowe dla ćwiczeń z masą ciała |
| `round1(x)` | Zaokrąglenie do 1 miejsca po przecinku |
| `todayPL()` | Dzisiejsza data w formacie polskim |
| `generateId()` | `Date.now()` |

---

## AsyncStorage — klucze (src/storage.js)

| Klucz | Zawartość |
|---|---|
| `sila_exercises` | Lista ćwiczeń (JSON array) |
| `sila_records` | Wszystkie rekordy (JSON array) |
| `sila_last_ex` | Ostatnio wybrane ćwiczenie |
| `sila_body_weight_kg` | Aktualna waga ciała |
| `sila_body_weight_history` | Historia pomiarów wagi (JSON array) |
| `sila_bw_exercises` | Ćwiczenia z masą ciała (JSON array) |

---

## Co zostało zbudowane (StartScreen ✅)

- Wybór ćwiczenia — modal bottom sheet z FlatList
- Pola: ciężar (kg) + powtórzenia
- Live kalkulacja 1RM podczas wpisywania
- Hint BW dla ćwiczeń z wagą ciała (Pull Up, Dips, itp.)
- Zapis serii do AsyncStorage
- Wyświetlanie aktualnego rekordu (PR) dla wybranego ćwiczenia
- Toast po zapisaniu serii

---

## TODO — kolejne ekrany

### HistoryScreen — Historia rekordów
- [ ] Tabela wszystkich serii posortowana po dacie malejąco
- [ ] Filtr po ćwiczeniu (dropdown)
- [ ] Filtr po zakresie dat
- [ ] Możliwość usunięcia wpisu (tap w wiersz → expand → usuń)
- [ ] Widok "Top Serie" — najlepsze serie per ćwiczenie (1 wiersz na ćwiczenie)
- [ ] Wykres 1RM w czasie dla wybranego ćwiczenia

### ExercisesScreen — Lista ćwiczeń
- [ ] Lista wszystkich ćwiczeń alfabetycznie
- [ ] Dodawanie nowego ćwiczenia
- [ ] Usuwanie ćwiczenia
- [ ] Oznaczanie ćwiczenia jako BW (masa ciała)

### ProfileScreen — Profil
- [ ] Aktualna waga ciała (edytowalny input)
- [ ] Historia pomiarów wagi (lista lub wykres)
- [ ] Eksport / import danych (JSON)

### PlanScreen — Plan treningu
- [ ] (Do ustalenia z użytkownikiem)

### App-wide
- [ ] Ikony w tab barze (Ionicons lub MaterialIcons przez @expo/vector-icons)
- [ ] Ekran ładowania / splash screen
- [ ] Obsługa pustego stanu (brak rekordów)

---

## Droga do App Store

### Wymagania
- Apple Developer Account — $99/rok (https://developer.apple.com)
- Mac z Xcode (już zainstalowane: xcode-select version 2416)
- Node v24, npm v11 (już zainstalowane)

### Kroki (po ukończeniu funkcji)
1. `npx expo build:ios` lub `eas build --platform ios` (Expo Application Services)
2. TestFlight — testy beta
3. App Store Connect — wypełnienie metadanych, screenshots
4. Review przez Apple (1–3 dni)

### Zalecane
- Użyć **EAS Build** (Expo Application Services) — buduje w chmurze, nie wymaga lokalnego Xcode
- ```bash
  npm install -g eas-cli
  eas login
  eas build --platform ios
  ```

---

## Znane quirks

- Expo Go nie obsługuje SDK 55+ — projekt na SDK 54
- Na fizycznym urządzeniu w innej sieci: `--tunnel` (ngrok)
- AsyncStorage jest asynchroniczny — wszystkie odczyty w `useEffect` z `async/await`
- BW exercises: waga efektywna = `bodyWeight + extraWeight`, wyświetlana jako `"75 + 10 kg"`
