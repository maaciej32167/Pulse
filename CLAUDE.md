# CLAUDE.md — Siła Native (React Native)

## Ostatnie aktualizacje

> **Aktualizuj tę sekcję po każdym `git commit` / `git push`** — krótki opis co zostało zmienione.

| Data | Commit | Zmiany |
|---|---|---|
| 09.03.2026 | `40d7934` | Tygodnie Pn–Nd w stats i raporcie, domyślna metryka = CZAS, kafelki podsumowania kompaktowe |
| 09.03.2026 | `c80e0e5` | Workout: brak domyślnego ćwiczenia, top 2 rekordy ze złotym/srebrnym trofeum |
| 09.03.2026 | `680f502` | Raport: picker miesiąc/rok, tryb roczny, donut chart partii mięśniowych |
| 09.03.2026 | `4616747` | Struktura danych AsyncStorage v2, PR detection podczas treningu, spójność kolorów |
| 09.03.2026 | `34d3d63` | Edycja i usuwanie serii w treningu (z potwierdzeniem), `src/colors.js` |
| 09.03.2026 | `0cb7160` | Profil: pełny redesign (hero, Iron Path radar, 5 zakładek, zdjęcie, RPG) |

---

## Reguły pracy

- **Przed nietrywialną zmianą** — przedstaw plan i zapytaj o zgodę
- **Przy prostych, jednoznacznych poleceniach** — działaj od razu bez pytania
- Testy: `npx expo start --tunnel` → Expo Go na telefonie
- PWA (`/Users/maciejgierlik/Documents/Aplikacje/sila/index.html`) działa niezależnie

## Zasady struktury danych (AsyncStorage → Backend)

**Każda zmiana dotykająca danych musi przestrzegać tych zasad — backend przyjdzie i migracja musi być bezbolesna.**

- **ID** — zawsze UUID v4 (`generateUUID()` z `src/storage.js`), nigdy `Date.now()`
- **Daty** — przechowuj jako ISO 8601: `"2026-03-09"` (pole `isoDate`). Pole `date` to tylko string wyświetlany użytkownikowi, nie jest bazą do obliczeń
- **Klucze AsyncStorage** — prefix `pulse_` (nie `sila_`). Każdy nowy klucz dodawaj do `KEYS` w `src/storage.js`
- **Nowe pola w rekordach** — dodaj je też do funkcji `migrateRecord()` w `src/storage.js` z sensownym defaultem
- **Wersja schematu** — przy zmianie kształtu danych zwiększ `SCHEMA_VERSION` i napisz logikę migracji
- **Denormalizacja offline** — pola jak `gymName` mogą być duplikowane w rekordzie (backend zsynchronizuje); ważne żeby był `gymId` jako klucz obcy
- **Brak pól serwerowych lokalnie** — nie przechowuj `userId`, `createdAt`, `updatedAt` (te przyjdą z backendu); zostaw `userId: null` w profilu jako placeholder
- **Nigdy nie usuwaj pól** z istniejących rekordów — tylko dodawaj nowe z defaultem. Stare dane muszą być migrowane, nie kasowane

## Git — kontrola wersji

Projekt ma git (`/Users/maciejgierlik/Documents/Aplikacje/Pulse`).
GitHub: **https://github.com/maaciej32167/Pulse**

### Zasady
- **`git commit`** — tylko na wyraźne polecenie użytkownika, np. "zapisz", "zrób commit"
- **`git push`** — tylko na wyraźne polecenie użytkownika, np. "wyślij na GitHub", "git push"
- Są to **dwie osobne operacje** — commit zapisuje lokalnie, push wysyła na GitHub

### Lokalny commit
```bash
cd /Users/maciejgierlik/Documents/Aplikacje/Pulse
git add -A
git commit -m "Opis zmiany"
```

### Wysyłanie na GitHub
```bash
git push
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

## Wizja produktu — retencja między treningami

> **Problem wszystkich aplikacji fitness:** są narzędziami. Otwierasz je żeby coś zalogować, zamykasz. Użytkownik który otwiera aplikację tylko przy treningu — odchodzi przy pierwszej dłuższej przerwie.
> **Pytanie:** co sprawia że ludzie otwierają aplikację o 23:00 w piątek leżąc na kanapie?

### 1. Twoja siłownia jako żywy organizm
Aplikacja wie kto teraz trenuje w Twojej siłowni. Wie że Marek — 3 miejsca nad Tobą w rankingu — właśnie zrobił PR na klatce. Wie że nikt nie pobił rekordu wolumenu w tej siłowni od 4 miesięcy. Wie że dziś rano trenowały 3 osoby z Twojej listy znajomych.

To jest rzecz która sprawia że otwierasz aplikację nie po to żeby coś zrobić, ale żeby sprawdzić co się dzieje. Zmienna nagroda — nie wiesz co znajdziesz, ale coś tam zawsze jest. Dokładnie jak Instagram czy Twitter.

### 2. Rywal przypisany przez algorytm
Nie lista rankingowa. Jeden konkretny człowiek wybrany specjalnie dla Ciebie — ktoś ~10–15% silniejszy, trenujący podobnie często, z podobnym stylem. Aplikacja mówi:

> *"Twój rywal w tym miesiącu: Piotr R. Prowadzi o 2400 kg wolumenu. Ostatnio trenował 3 dni temu."*

Ta jedna cyfra — „2400 kg do nadrobienia" — sprawia że myślisz o tym kiedy idziesz spać. Mechanizm rywalizacji 1-na-1 jest wielokrotnie silniejszy niż rankingi grupowe bo jest osobisty i widoczny. Szachy rozumieją to od 1500 lat. Strava rozumie to z segmentami. Nikt nie zrobił tego porządnie w treningu siłowym.

### 3. Aplikacja ma pamięć i mówi o niej
Większość aplikacji patrzy tylko do przodu. Pulse patrzy wstecz i opowiada historię.

Przykłady:
- Wchodzisz na trening → *„Rok temu o tej porze ważyłeś 5 kg więcej i zaczynałeś z 60 kg na klatce."*
- Po treningu → *„To Twój 100. trening w tej siłowni."*
- Notyfikacja w losowy wtorek → *„Dokładnie 6 miesięcy temu był Twój najgorszy tydzień — 0 treningów. Teraz jesteś na 18-dniowym streaku."*

To nie jest gamifikacja. To narracja. Aplikacja staje się kroniką życia, nie tylko dziennikiem treningowym. Ludzie wracają po wspomnienia.

### 4. Eventy sezonowe w siłowni
3-miesięczne cykle z konkretnym wyzwaniem dla całej siłowni — nie globalnie, tylko dla Waszej siłowni.

> *„Sezon zimowy: FitFabric Poznań. Wyzwanie: kto zbierze największy wolumen do 31 marca. Aktualnie prowadzi: Marek K."*

Na końcu sezonu: tablica wyników, trwałe miejsce w historii siłowni, reset do nowego sezonu. Każdy sezon ma inny focus — raz wolumen, raz regularność, raz siła. Replikuje fenomen esportów i sezonów w grach (Fortnite, LoL). Ludzie grają bo *„sezon kończy się za 2 tygodnie i nie chcę spaść z 3. miejsca"*.

### 5. Rzeczy których nie rozumiesz dopóki nie używasz
Najtrudniejsze do zbudowania, najcenniejsze. Elementy które nie są wytłumaczone i które użytkownicy odkrywają przez używanie lub przez rozmowy z innymi.

- Klasa postaci zmienia się bez ostrzeżenia jeśli styl treningu się zmieni. Pewnego dnia wchodzisz i ikona jest inna. Zaczynasz rozumieć dlaczego. Mówisz o tym znajomemu.
- Poziom przestaje rosnąć przy pewnym progu i pojawia się coś co sugeruje że *„jest coś więcej"*. Żadnego wyjaśnienia. Po prostu znak.

Tajemnica jest silnym mechanizmem retencji — mózg nie potrafi zostawić nierozwiązanych zagadek.

### Wspólny mianownik
Każdy z tych konceptów robi jedną rzecz: **sprawia że aplikacja ma wartość MIĘDZY treningami, nie tylko podczas nich.**

- Rejestratorr → używasz 4× w tygodniu po 3 minuty
- Żywy ekosystem społeczny skupiony na Twojej siłowni → sprawdzasz rano przy kawie

Różnica między aplikacją a produktem który nie daje się odłożyć: czy generuje powody do otwarcia których użytkownik sam nie przewidywał.

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

## Must Have — Dzień 1 (MVP)

```
├── Rejestracja użytkownika
├── Logowanie treningów
├── Check-in z wyborem miejsca (mapa / wyszukiwarka)
├── Automatyczne tworzenie profilu siłowni po X check-inach
└── Licznik check-inów na profilu siłowni
```

## Można dodać później (B2B growth)

```
├── Przejęcie profilu przez siłownię (claim)
├── Dashboard siłowni (statystyki, aktywni użytkownicy)
├── Rezerwacje zajęć
└── Płatne plany dla siłowni (Basic / Pro)
```

---

## B2B — model danych publicznych vs właścicielskich

### Problem
Publiczny profil siłowni pokazuje: kto teraz trenuje, stali bywalcy, obłożenie, statystyki.
Jeśli właściciel widzi to samo co każdy użytkownik — nie ma powodu płacić.

### Decyzja architektoniczna
Część danych **musi być dostępna tylko dla zweryfikowanego właściciela**:

| Dane | Publiczny profil | Dashboard właściciela |
|---|---|---|
| Kto teraz trenuje | ✅ | ✅ |
| Stali bywalcy (ranking) | ✅ | ✅ |
| Obłożenie w ciągu dnia | ✅ (dziś) | ✅ + historia / trendy |
| Statystyki zbiorcze | ✅ (liczby) | ✅ + wykresy miesiąc/rok |
| Retencja i odpływ | ❌ | ✅ — kto przestał przychodzić i kiedy |
| Nowi vs powracający | ❌ | ✅ — miesięczny wykres |
| Ogłoszenia push do bywalców | ❌ | ✅ |
| Wyzwania sezonowe (tworzenie) | ❌ | ✅ |
| Badge "Oficjalny profil" | widoczny | edytowalny |
| Zdjęcia / opis / cennik / godziny | widoczne | edytowalne |
| Priorytet w Discover | ❌ | ✅ |

### Kluczowa wartość której nie ma nigdzie indziej
**Retencja** — właściciel widzi ilu bywalców przestało przychodzić w ostatnich 30/60/90 dniach.
Żaden CRM siłowni tego nie liczy automatycznie bo nie wie że klient ćwiczył — Pulse wie.

### Komunikacja push
Właściciel bez Pulse nie ma kanału dotarcia do aktywnych klientów poza Instagramem.
Pulse daje listę realnych bywalców (nie subskrybentów newslettera) + możliwość wysłania ogłoszenia.

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

## Plan rozwoju — kolejność

### Etap 1 — dokończyć Fazę 1 (fundament)
- [ ] **Achievementy** (pierwsze 5: First Blood, Century Club, Iron Streak, Volume Monster, PR Hunter)
- [ ] **Wykres 1RM w czasie** dla wybranego ćwiczenia (w RekordsView)
- [ ] **Usuwanie ćwiczenia** w ExercisesScreen

### Etap 2 — Backend (Supabase)
- [ ] Rejestracja i logowanie (email / Apple ID)
- [ ] Sync rekordów i profilu do bazy danych
- [ ] Offline-first: AsyncStorage → upload po treningu

### Etap 3 — Social (Faza 2)
- [ ] Feed znajomych (treningi, PR-y)
- [ ] Dodawanie znajomych / wyszukiwanie użytkowników
- [ ] Publiczny profil użytkownika

### Etap 4 — Rywalizacja (Faza 3)
- [ ] Rankingi: wolumen / streak / siła — znajomi / siłownia / global
- [ ] Rywal algorytmiczny (1v1, ~10–15% silniejszy)
- [ ] Wyzwania sezonowe w siłowni

### Etap 5 — B2B / App Store
- [ ] Profil siłowni (claim przez właściciela)
- [ ] Dashboard właściciela (retencja, ogłoszenia push)
- [ ] EAS Build + TestFlight + App Store

---

### Odłożone na później
- Splash screen / onboarding
- Check-in GPS (prawdziwa mapa) — teraz mockowane
- Automatyczny check-out po treningu

---

## Backend — co to znaczy dla Pulse

### Obecny stan
Aplikacja działa **tylko lokalnie** — dane są w AsyncStorage na telefonie. Nikt inny nie widzi Twoich treningów, Ty nie widzisz cudzych.

### Co daje backend
Serwer w internecie który:
- przechowuje dane wszystkich użytkowników w bazie danych
- pozwala się logować (email / Apple ID / Google)
- synchronizuje dane między urządzeniami
- umożliwia komunikację między użytkownikami (feed, rankingi, rywal)

### Co konkretnie trzeba zbudować

| Element | Opis |
|---|---|
| **Autentykacja** | Rejestracja i logowanie — bez tego nie ma kont, nie ma social |
| **Baza danych** | Rekordy, profile, siłownie na serwerze — proponowany stack: **Supabase** (PostgreSQL + auth, darmowy tier) |
| **Synchronizacja** | AsyncStorage → upload na serwer po każdym treningu. Offline działa, sync gdy internet |
| **Social API** | Feed znajomych, rankingi siłowni, rywal algorytmiczny |
| **Sesje treningowe (live)** | Realtime "Teraz tutaj" w GymScreen — patrz niżej |

### Sesje treningowe — flow z backendem

```
LogScreen → wybór siłowni
  ↓
WorkoutScreen start → POST /sessions { gymId, userId, startedAt }
  ↓
WorkoutScreen → PATCH /sessions/:id { currentExercise }
  (przy każdej zmianie ćwiczenia)
  ↓
GymScreen → GET /gyms/:id/live  (polling ~30s lub WebSocket)
  → zwraca aktywne sesje → sekcja "Teraz tutaj" z migającą kropką
  ↓
SummaryScreen (zakończenie) → PATCH /sessions/:id { endedAt }
  → sesja znika z "Teraz tutaj"
  → wolumen/czas/ćwiczenia trafiają do statystyk siłowni
```

**Struktura danych jest już gotowa** — rekordy mają `gymId`, `gymName`, `workoutId`. Brakuje tylko encji sesji po stronie backendu.

### Decyzje do podjęcia przed budową
- Supabase vs Firebase vs własny serwer?
- Czy najpierw MVP bez backendu (tylko local) i publikacja w App Store?
- Czy szukać współpracownika backendowego?

### Ważne
To największy skok w projekcie — tygodnie pracy, nie dni. Obecna struktura danych (`src/storage.js`, UUID, isoDate) jest już przygotowana pod migrację do backendu.

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
