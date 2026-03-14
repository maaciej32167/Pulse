# CLAUDE.md — Siła Native (React Native)

## Ostatnie aktualizacje

> **Aktualizuj tę sekcję po każdym `git commit` / `git push`** — krótki opis co zostało zmienione.
> **Po `git push` zaktualizuj również dev log w Obsidianie:** `/Users/maciejgierlik/Documents/Obsidian/Pulse/Dev log/2026-03.md`

| Data | Commit | Zmiany |
|---|---|---|
| 14.03.2026 | `d5af5d5` | Czcionki min 9px, Historia PR chipy, Raport kafelki/wykresy, klawiatura telefon, spójność liczenia treningów |
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
- **`git commit` i `git push` — TYLKO na wyraźne polecenie użytkownika. Nigdy automatycznie po wprowadzeniu zmian.**

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
- [x] **Achievementy** — pełna baza (src/achievements.js), ekran (AchievementsScreen), silnik zliczający (computeAchievementsFromRecords), zapis po treningu (SummaryScreen)
- [ ] **Wykres 1RM w czasie** dla wybranego ćwiczenia (w RekordsView)
- [ ] **Usuwanie ćwiczenia** w ExercisesScreen

#### Achievementy — co działa / co czeka na backend

**Działa teraz (local):**
- Sesje: 1, 10, 25, 50, 100, 250, 500, 1000 treningów
- Wolumen: łączny (10k → Everest) + 10k w jednej sesji
- Czas: łączny (10h → 1000h) + Snajper (<35min) + Maraton (>2.5h)
- Regularność: streak 7/14/30/60/100/365 dni
- Siła: talerki (1-4), ciężar własny, 2x bodyweight, Ghost Lift, Iron Trinity, Feniks
- Ukryte: Bezsenność (23-5), Nowy Rok (1 stycznia), Piątek 13, 666 serii, Jutrznia (5-7 rano)

**Czeka na backend / dane:**
- SPOŁECZNOŚĆ (followers, znajomi, ranking) → wymaga backendu Faza 2
- EKSPLORACJA (siłownie, miasta) → wymaga prawdziwego GPS check-in Faza 4
- Urodziny (secret) → dodać pole `birthDate` do profilu użytkownika
- Pełnia księżyca (secret) → zewnętrzne API lub algorytm lunar
- Obserwator (secret, brak postów) → wymaga social feed Faza 2
- Perfekcjonista (4 perfect weeks) → wymaga PlanScreen z planowaniem dni

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

## Backend — plan wdrożenia

**Stack: Supabase** (PostgreSQL + Auth + Realtime + Storage). Decyzja podjęta.
Darmowy tier wystarczy na MVP. Projekt założyć na supabase.com → "pulse-app".

---

### Co jest już gotowe w lokalnej strukturze

| Element | Status |
|---|---|
| UUID dla wszystkich rekordów | ✅ `generateUUID()` w storage.js |
| `workoutId` grupujący serie | ✅ |
| `gymName` w rekordach | ✅ (denormalizacja offline) |
| `isoDate` (ISO 8601) | ✅ |
| `prTypes[]` tablica typów PR | ✅ |
| `is_public` toggle w SummaryScreen | ✅ |
| `userId: null` placeholder w profilu | ✅ |

### Czego brakuje — do zbudowania

| Element | Plik docelowy | Uwagi |
|---|---|---|
| Klient Supabase | `src/supabase.js` | URL + anon key z dashboardu |
| Zmienne środowiskowe | `.env` + `app.config.js` | Nigdy nie hardkoduj kluczy |
| AuthScreen (UI logowania) | `screens/AuthScreen.js` | Email + hasło, Apple Sign In |
| Logika auth | `src/auth.js` | signUp, signIn, signOut |
| Sync po treningu | `src/sync.js` | Fire & forget w SummaryScreen |
| Migracja historii | `src/sync.js` | Jednorazowo przy pierwszym logowaniu |
| Deep link (potwierdzenie email) | `app.json` → `scheme: "pulse"` | Wymagane przez Supabase auth |
| Storage avatarów/zdjęć | Supabase Storage bucket | `avatars/`, `workout-photos/` |
| Push notifications | `src/notifications.js` | Expo + Supabase Edge Function |
| Tabela `gyms` z UUID | SQL + migracja | Teraz gymName to string — docelowo foreign key |
| Sync achievementów | `src/sync.js` | Tabela `achievements` w Supabase |
| Rankingi (SQL view) | Supabase SQL Editor | `gym_weekly_rank` view |
| System znajomych | `src/feed.js` | Tabela `follows` |

---

### Schema bazy danych (wykonać w Supabase SQL Editor)

```sql
-- Profile użytkowników
create table public.profiles (
  id          uuid references auth.users primary key,
  username    text unique,
  name        text,
  bio         text,
  avatar_url  text,
  birth_date  date,
  created_at  timestamptz default now()
);

-- Siłownie
create table public.gyms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  city       text,
  lat        float,
  lng        float,
  created_at timestamptz default now()
);

-- Treningi (sesje)
create table public.workouts (
  id          uuid primary key,
  user_id     uuid references profiles,
  gym_id      uuid references gyms,
  gym_name    text,
  started_at  timestamptz,
  ended_at    timestamptz,
  title       text,
  note        text,
  is_public   boolean default true,
  created_at  timestamptz default now()
);

-- Serie
create table public.records (
  id           uuid primary key,
  workout_id   uuid references workouts,
  user_id      uuid references profiles,
  exercise     text not null,
  weight       float,
  reps         int,
  is_pr        boolean default false,
  pr_types     text[],
  iso_date     text,
  timestamp_ms bigint,
  created_at   timestamptz default now()
);

-- Ćwiczenia
create table public.exercises (
  id         uuid primary key,
  user_id    uuid references profiles,
  name       text not null,
  is_bw      boolean default false,
  created_at timestamptz default now()
);

-- Waga ciała
create table public.body_weights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles,
  weight_kg   float,
  measured_at timestamptz default now()
);

-- Znajomi
create table public.follows (
  follower_id  uuid references profiles,
  following_id uuid references profiles,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Ranking siłowni (view)
create view gym_weekly_rank as
select
  w.gym_name,
  w.user_id,
  p.name,
  p.avatar_url,
  sum(r.weight * r.reps) as volume,
  rank() over (
    partition by w.gym_name
    order by sum(r.weight * r.reps) desc
  ) as rank
from workouts w
join records r on r.workout_id = w.id
join profiles p on p.id = w.user_id
where w.started_at >= date_trunc('week', now())
group by w.gym_name, w.user_id, p.name, p.avatar_url;
```

**Row Level Security** — uruchomić po każdej tabeli:

```sql
alter table profiles     enable row level security;
alter table workouts     enable row level security;
alter table records      enable row level security;
alter table exercises    enable row level security;
alter table body_weights enable row level security;
alter table follows      enable row level security;

-- Przykładowe polityki:
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);
create policy "workouts_select" on workouts for select
  using (is_public = true or auth.uid() = user_id);
create policy "workouts_insert" on workouts for insert with check (auth.uid() = user_id);
create policy "records_own"    on records for all using (auth.uid() = user_id);
create policy "exercises_own"  on exercises for all using (auth.uid() = user_id);
create policy "body_weights_own" on body_weights for all using (auth.uid() = user_id);
create policy "follows_select" on follows for select using (true);
create policy "follows_insert" on follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on follows for delete using (auth.uid() = follower_id);
```

---

### Kolejność wdrożenia — fazy

#### Faza 1 — Auth + sync (7 dni, solo)

| # | Zadanie | Plik | Uwagi |
|---|---|---|---|
| 1 | Supabase projekt + SQL schema + RLS | — | Jednorazowo w dashboardzie |
| 2 | `.env` + `app.config.js` | root | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| 3 | `src/supabase.js` | nowy | Klient + SecureStore adapter |
| 4 | `src/auth.js` | nowy | signUp, signIn, signOut, getUser |
| 5 | `screens/AuthScreen.js` | nowy | UI: email/hasło + Apple Sign In |
| 6 | `App.js` | edycja | Wrap nawigacji logiką sesji auth |
| 7 | `app.json` | edycja | Dodać `scheme: "pulse"` (deep link email) |
| 8 | `src/sync.js` | nowy | syncWorkout() + syncAllHistorical() |
| 9 | `screens/SummaryScreen.js` | edycja | Wywołaj syncWorkout() po zapisaniu |
| 10 | Ekran onboarding sync | jednorazowy modal | syncAllHistorical() przy pierwszym logowaniu |

#### Faza 2 — Feed + znajomi (5 dni)

| # | Zadanie | Plik |
|---|---|---|
| 11 | `src/feed.js` | nowy — loadFriendsFeed, loadGymFeed, loadLiveAtGym |
| 12 | FeedScreen — podmiana mocków | edycja |
| 13 | Realtime TERAZ TUTAJ | FeedScreen — supabase.channel() |
| 14 | System follow/unfollow | DiscoverScreen |
| 15 | Publiczny profil z danymi real | PublicProfileScreen |

#### Faza 3 — Rankingi + powiadomienia (5 dni)

| # | Zadanie | Uwagi |
|---|---|---|
| 16 | Ranking siłowni z widoku SQL | gym_weekly_rank |
| 17 | Expo Push Notifications setup | `src/notifications.js` |
| 18 | Supabase Edge Function → trigger | Wysyła push przy nowym PR znajomego |
| 19 | Zdjęcia treningów | Supabase Storage bucket `workout-photos/` |
| 20 | Avatary użytkowników | Supabase Storage bucket `avatars/` |

---

### Kluczowe pliki do napisania

**`src/supabase.js`** — klient z SecureStore:
```js
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem:    (key) => SecureStore.getItemAsync(key),
  setItem:    (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { storage: ExpoSecureStoreAdapter, autoRefreshToken: true,
            persistSession: true, detectSessionInUrl: false } }
);
```

**`src/sync.js`** — sync po treningu (fire & forget):
```js
export async function syncWorkout(workoutId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;  // offline — pomijamy

  const allRecords = await loadRecords();
  const wRecords   = allRecords.filter(r => r.workoutId === workoutId);
  const first      = wRecords[0];

  await supabase.from('workouts').upsert({
    id: workoutId, user_id: user.id,
    gym_name: first.gymName || null,
    started_at: first.timestamp ? new Date(first.timestamp).toISOString() : null,
    is_public: true,
  });

  await supabase.from('records').upsert(
    wRecords.map(r => ({
      id: r.id, workout_id: workoutId, user_id: user.id,
      exercise: r.exercise, weight: Number(r.weight), reps: Number(r.reps),
      is_pr: r.isPR || false, pr_types: r.prTypes || [],
      iso_date: r.isoDate || null, timestamp_ms: r.timestamp || null,
    }))
  );
}
```

**W `SummaryScreen.js`** — po `await saveRecords(...)`:
```js
import { syncWorkout } from '../src/sync';
syncWorkout(workoutId).catch(console.warn);  // fire & forget, nie blokuje UI
```

**W `App.js`** — obsługa sesji:
```js
const [session, setSession] = useState(null);
const [authLoading, setAuthLoading] = useState(true);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
    setAuthLoading(false);
  });
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
  return () => subscription.unsubscribe();
}, []);

// W JSX: if (!session) return <AuthScreen />;
```

---

### Zasady których pilnować

1. **Zawsze `upsert`, nigdy `insert`** — sync może być wywołany wielokrotnie
2. **Offline-first** — `syncWorkout()` to fire & forget; aplikacja działa bez internetu
3. **Nie usuwać AsyncStorage** — zostaje jako lokalny cache, Supabase to mirror
4. **RLS zawsze włączone** — nigdy nie wyłączaj nawet na testy
5. **Klucze w `.env`** — `EXPO_PUBLIC_SUPABASE_URL` i `EXPO_PUBLIC_SUPABASE_ANON_KEY`, nigdy hardkodowane
6. **`app.json` scheme** — bez `scheme: "pulse"` potwierdzenie emaila nie działa na urządzeniu

---

### Instalacja zależności (gdy zaczynamy)

```bash
cd /Users/maciejgierlik/Documents/Aplikacje/Pulse
npx expo install @supabase/supabase-js
npx expo install expo-secure-store
npx expo install expo-notifications  # Faza 3
```

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
