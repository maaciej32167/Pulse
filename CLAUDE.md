# CLAUDE.md — Siła Native (React Native)

## Reguły pracy

- **Przed nietrywialną zmianą** — przedstaw plan i zapytaj o zgodę
- **Przy prostych, jednoznacznych poleceniach** — działaj od razu bez pytania
- Testy: `npx expo start --tunnel` → Expo Go na telefonie
- PWA (`/Users/maciejgierlik/Documents/Aplikacje/sila/index.html`) działa niezależnie

## Git — kontrola wersji

Projekt ma git (`/Users/maciejgierlik/Documents/Aplikacje/Pulse`).
Commity **tylko na wyraźne polecenie użytkownika** — np. "zapisz", "zrób commit".

```bash
cd /Users/maciejgierlik/Documents/Aplikacje/Pulse
git add -A
git commit -m "Opis zmiany"
```

Żeby wrócić do ostatniego commita (odrzucić wszystkie niezapisane zmiany):
```bash
git checkout .
```

---

## Wizja produktu

**Pulse** — Strava + RPG + siłownia. Trening jako gra społeczna: każdy kg na sztandze to XP dla postaci, każdy trening to post na feedzie znajomych.

Cel: natywna aplikacja iOS (+ Android) dostępna w App Store.

- Expo SDK 54
- Nawigacja: React Navigation v7
- Dane: AsyncStorage → docelowo baza danych w chmurze
- Język UI: polski
- Design: "Obsidian Glass" — ciemne tło `#0A0A0C`

---

## Docelowa nawigacja (Bottom Tab Bar)

```
[ Feed ] [ Discover ] [ + Log ] [ Ranks ] [ Profil ]
```

Centralny przycisk **+ Log** — zawsze dostępny, jeden tap do dodania treningu.

| Tab | Opis |
|---|---|
| **Feed** | Aktywności znajomych — treningi, PR-y, check-iny, achievementy |
| **Discover** | Wyszukiwanie ludzi i siłowni; mapa siłowni w okolicy |
| **+ Log** | Nowy trening → check-in → logowanie serii → podsumowanie + publikacja |
| **Ranks** | Rankingi: wolumen, streak, siła (IPF), XP, PR score — znajomi / siłownia / miasto / global |
| **Profil** | Stats, rekordy, miejsca, achievementy, posty |

---

## System RPG

- **XP** za każdy trening, bonus za PR, mnożnik za streak tygodniowy
- **Klasy postaci**: Powerlifter (siła max), Bodybuilder (wolumen), Athlete (balans), Warrior (funkcjonalny)
- **Statystyki postaci**: Strength, Endurance, Consistency, Power
- **Achievementy**: First Blood, Century Club, Iron Streak, Volume Monster, Giant Killer itp.

---

## Model biznesowy

Ćwiczący — **darmowo**. Przychód z siłowni i trenerów:

| Warstwa | Płaci | Dostaje |
|---|---|---|
| Siłownia | Abonament (Basic/Pro) | Profil, check-iny, grafik zajęć, statystyki, promocja |
| Trener | Prowizja / abonament | Profil, kalendarz, rezerwacje, opinie |
| Ćwiczący | Nic | Tracking, RPG, social feed |

---

## Mapa rozwoju (Fazy)

| Faza | Elementy | Status |
|---|---|---|
| **1 – Fundament** | Śledzenie treningów, progres, wykresy, RPG/postać, profil publiczny | Częściowo gotowe |
| **2 – Social** | Znajomi, feed, hype/komentarze, udostępnianie, check-in | Discover UI gotowe (mock) |
| **3 – Rywalizacja** | Leaderboardy, wyzwania 1v1, guildy, rankingi sezonowe | Do zbudowania |
| **4 – B2B** | Profile siłowni i trenerów, rezerwacje, zajęcia grupowe, dashboard | GymScreen UI gotowe (mock) |
| **5 – Platforma** | AI Coach, monetyzacja, video, integracje zewnętrzne | Przyszłość |

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
App.js                    # Nawigacja (Stack)
screens/
  HomeScreen.js           # Ekran główny — orbita menu z animacjami ✅
  StartScreen.js          # Dodaj serię + PR ✅
  HistoryScreen.js        # Historia rekordów (do zbudowania)
  PlanScreen.js           # Planowanie treningu (do zbudowania)
  ExercisesScreen.js      # Lista ćwiczeń (do zbudowania)
  ProfileScreen.js        # Profil + waga ciała (do zbudowania)
  DiscoverScreen.js       # Wyszukiwanie siłowni i użytkowników ✅
  GymScreen.js            # Profil siłowni: teraz tutaj, stali bywalcy, statystyki ✅
components/
  ScreenHeader.js         # Wspólny nagłówek ekranu ✅
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

## TODO — najbliższe kroki (Faza 1)

### Profil użytkownika
- [ ] Waga ciała — edytowalny input + historia pomiarów
- [ ] Statystyki: treningi, wolumen, PR w tym roku
- [ ] Zakładka REKORDY — tabela PR z datami, wykres progresu per ćwiczenie
- [ ] Zakładka STATS — wykresy wolumenu tygodniowego/miesięcznego
- [ ] Poziom RPG i klasa postaci (pasek XP)

### System RPG (podstawy)
- [ ] Obliczanie XP za trening
- [ ] Pasek XP i poziom na profilu
- [ ] Achievementy (pierwsze 5)

### Ćwiczenia
- [ ] Lista alfabetyczna z wyszukiwarką
- [ ] Dodawanie / usuwanie ćwiczenia
- [ ] Oznaczanie jako BW (masa ciała)

### Historia
- [ ] Wykres 1RM w czasie dla wybranego ćwiczenia

### App-wide
- [ ] Ekran ładowania / splash screen
- [ ] Obsługa pustego stanu (brak rekordów)

### Check-in / Check-out
- [ ] **Automatyczny check-out po zakończeniu treningu** — do rozważenia: po zapisaniu podsumowania treningu w StartScreen → auto check-out z siłowni (jeśli użytkownik był zameldowany)

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
