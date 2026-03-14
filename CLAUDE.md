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
npx expo install expo-apple-authentication  # Apple Sign In
npx expo install expo-auth-session expo-web-browser  # Google Sign In
npx expo install expo-location              # Faza 2 — pobliskie siłownie
npx expo install expo-notifications         # Faza 3
```

---

### Autentykacja — wszystkie metody logowania

> **Reguła App Store:** jeśli aplikacja oferuje logowanie przez Google, **Apple Sign In jest obowiązkowy**. Apple odrzuci aplikację bez niego.

Supabase obsługuje wszystkie trzy metody — wybierasz które włączyć w Supabase Dashboard → Authentication → Providers.

---

#### Metoda 1 — Email + hasło

Najprostsza, ale wymaga weryfikacji emaila i obsługi resetu hasła.

**Supabase Dashboard → Auth → Email:** włącz "Confirm email".

**`src/auth.js`:**
```js
import { supabase } from './supabase';

// Rejestracja
export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },  // zapisane w user_metadata
  });
  if (error) throw error;

  // Utwórz profil (trigger lub ręcznie)
  if (data.user) {
    await supabase.from('profiles').insert({
      id:       data.user.id,
      name,
      username: email.split('@')[0],
    });
  }
  return data;
  // ⚠️ Supabase wysyła email weryfikacyjny — użytkownik musi go kliknąć
}

// Logowanie
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Reset hasła — wysyła email z linkiem
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'pulse://reset-password',  // deep link do aplikacji
  });
  if (error) throw error;
}

// Wylogowanie
export async function signOut() {
  await supabase.auth.signOut();
}
```

**Flow weryfikacji emaila:**
1. User rejestruje się → Supabase wysyła email z linkiem `pulse://confirm?token=...`
2. User klika link → otwiera aplikację przez deep link (`scheme: "pulse"` w app.json)
3. Aplikacja czyta token z URL i potwierdza konto

Obsługa deep linku w `App.js`:
```js
import * as Linking from 'expo-linking';

useEffect(() => {
  const sub = Linking.addEventListener('url', ({ url }) => {
    if (url.includes('confirm') || url.includes('reset-password')) {
      supabase.auth.getSessionFromUrl(url).then(({ data }) => {
        if (data.session) setSession(data.session);
      });
    }
  });
  return () => sub.remove();
}, []);
```

---

#### Metoda 2 — Apple Sign In (wymagane przez App Store)

**Supabase Dashboard → Auth → Apple Provider:** włącz, wpisz Service ID i klucz z Apple Developer.

**Apple Developer Console** — wymagane jednorazowo:
1. Certificates → Identifiers → utwórz Services ID (`com.maciejgierlik.pulse.siwa`)
2. Dodaj domenę Supabase jako Return URL
3. Keys → utwórz klucz z "Sign In with Apple" — pobierz `.p8`
4. Wpisz w Supabase: Team ID, Key ID, zawartość `.p8`

**Instalacja:**
```bash
npx expo install expo-apple-authentication
```

**`app.json`** — dodaj capability:
```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true
    }
  }
}
```

**`src/auth.js`** — dodaj funkcję:
```js
import * as AppleAuthentication from 'expo-apple-authentication';

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  // Przekaż token do Supabase
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;

  // Utwórz profil jeśli nowy użytkownik
  const name = credential.fullName
    ? `${credential.fullName.givenName} ${credential.fullName.familyName}`.trim()
    : null;

  if (name && data.user) {
    await supabase.from('profiles').upsert({
      id:   data.user.id,
      name: name,
    }, { onConflict: 'id', ignoreDuplicates: true });
  }

  return data;
}
```

> **Uwaga:** Apple przy pierwszym logowaniu zwraca imię i email — przy kolejnych już nie. Zapisz je od razu przy rejestracji.

**Przycisk w UI** — Apple narzuca konkretny wygląd (czarny/biały, własny komponent):
```jsx
import * as AppleAuthentication from 'expo-apple-authentication';

<AppleAuthentication.AppleAuthenticationButton
  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
  cornerRadius={12}
  style={{ width: '100%', height: 50 }}
  onPress={handleAppleSignIn}
/>
```

---

#### Metoda 3 — Google Sign In

**Supabase Dashboard → Auth → Google Provider:** włącz, wpisz Client ID i Secret z Google Cloud Console.

**Google Cloud Console** — wymagane jednorazowo:
1. console.cloud.google.com → utwórz projekt "Pulse"
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Utwórz dwa Client ID:
   - **iOS:** typ "iOS", Bundle ID = `com.maciejgierlik.pulse`
   - **Web:** typ "Web" (wymagany przez Supabase)
4. Wpisz Web Client ID + Secret w Supabase

**Instalacja:**
```bash
npx expo install expo-auth-session expo-web-browser expo-crypto
```

**`src/auth.js`** — dodaj funkcję:
```js
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();  // wymagane — dodaj na poziomie modułu

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:     'TWÓJ_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId:     'TWÓJ_WEB_CLIENT_ID.apps.googleusercontent.com',
  });

  async function signInWithGoogle() {
    const result = await promptAsync();
    if (result.type !== 'success') return;

    const { id_token } = result.params;

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: id_token,
    });
    if (error) throw error;

    // Utwórz profil jeśli nowy użytkownik
    if (data.user) {
      const meta = data.user.user_metadata;
      await supabase.from('profiles').upsert({
        id:         data.user.id,
        name:       meta.full_name || meta.name,
        avatar_url: meta.avatar_url || meta.picture,
      }, { onConflict: 'id', ignoreDuplicates: true });
    }

    return data;
  }

  return { signInWithGoogle, ready: !!request };
}
```

---

#### AuthScreen — UI logowania

`screens/AuthScreen.js` — jeden ekran obsługuje rejestrację i logowanie:

```
┌─────────────────────────────┐
│          PULSE              │
│                             │
│  [ Apple Sign In ]  ← czarny przycisk Apple
│  [ G  Zaloguj przez Google ]
│                             │
│  ─────── lub ───────        │
│                             │
│  Email: ________________    │
│  Hasło: ________________    │
│                             │
│  [ Zaloguj się ]            │
│  [ Zarejestruj się ]        │
│                             │
│  Nie pamiętasz hasła?       │
└─────────────────────────────┘
```

Logika w `App.js`:
```js
if (!session) return <AuthScreen onAuth={setSession} />;
```

---

#### Usunięcie konta (wymagane przez App Store)

Apple od 2023 wymaga przycisku usunięcia konta w aplikacji.

Profil → Ustawienia → Usuń konto:
```js
export async function deleteAccount() {
  const { data: { user } } = await supabase.auth.getUser();

  // Usuń dane użytkownika (RLS pozwoli tylko na własne)
  await supabase.from('records').delete().eq('user_id', user.id);
  await supabase.from('workouts').delete().eq('user_id', user.id);
  await supabase.from('profiles').delete().eq('id', user.id);

  // Usuń konto auth — wymaga Supabase Service Role Key (Edge Function)
  // Nie używaj Service Role Key w aplikacji mobilnej!
  await supabase.functions.invoke('delete-user');

  await supabase.auth.signOut();
}
```

Usunięcie konta auth wymaga **Supabase Edge Function** (serwer) bo `auth.admin.deleteUser()` wymaga klucza serwisowego którego nie można trzymać w aplikacji mobilnej.

---

#### Podsumowanie — co dodać do tabeli "czego brakuje"

| Element | Plik | Uwagi |
|---|---|---|
| `signUp/signIn` email+hasło | `src/auth.js` | + obsługa błędów (złe hasło, email zajęty) |
| Deep link weryfikacja emaila | `App.js` | `Linking.addEventListener` |
| Reset hasła | `src/auth.js` + `AuthScreen` | `resetPasswordForEmail()` |
| Apple Sign In | `src/auth.js` | `expo-apple-authentication` |
| Apple Developer: Services ID + klucz | Apple Developer Console | jednorazowo |
| Google Sign In | `src/auth.js` | `expo-auth-session` |
| Google Cloud: OAuth Client ID | Google Cloud Console | jednorazowo |
| `AuthScreen.js` UI | `screens/AuthScreen.js` | wszystkie 3 metody + reset hasła |
| Usunięcie konta | `src/auth.js` + Edge Function | wymagane przez App Store |
| `delete-user` Edge Function | Supabase Dashboard | usuwa konto auth bezpiecznie |

---

### Wyszukiwanie pobliskich siłowni (Discover)

**Stack:** PostGIS (wbudowany w Supabase) + `expo-location`.

**SQL — jednorazowo w Supabase Dashboard → Extensions:**
```sql
create extension if not exists postgis;

-- Dodaj kolumnę geography do gyms
alter table gyms add column location geography(POINT, 4326);
create index gyms_location_idx on gyms using gist(location);

-- Funkcja RPC wywoływana z aplikacji
create or replace function gyms_nearby(lat float, lng float, radius int)
returns table(id uuid, name text, city text, distance_m float) as $$
  select id, name, city,
    st_distance(location, st_point(lng, lat)::geography) as distance_m
  from gyms
  where st_dwithin(location, st_point(lng, lat)::geography, radius)
  order by distance_m;
$$ language sql stable;
```

**`app.json`** — uprawnienie lokalizacji:
```json
"plugins": [
  ["expo-location", {
    "locationWhenInUsePermission": "Pulse potrzebuje lokalizacji do znalezienia pobliskich siłowni."
  }]
]
```

**`src/discover.js`** — funkcja do napisania:
```js
import * as Location from 'expo-location';
import { supabase } from './supabase';

export async function loadNearbyGyms(radiusMeters = 5000) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return [];

  const { coords } = await Location.getCurrentPositionAsync({});

  const { data } = await supabase.rpc('gyms_nearby', {
    lat: coords.latitude,
    lng: coords.longitude,
    radius: radiusMeters,
  });

  return data || [];
}
```

**Auto-tworzenie siłowni przy check-inie:**
Gdy użytkownik robi check-in do siłowni której nie ma w bazie → `upsert` po nazwie + mieście.
Supabase zwraca istniejący rekord lub tworzy nowy. Dodaj `gymId` do workout po check-inie.

```js
export async function findOrCreateGym(name, city, lat, lng) {
  // Szukaj istniejącej
  const { data: existing } = await supabase
    .from('gyms')
    .select('id')
    .ilike('name', name)
    .eq('city', city)
    .single();

  if (existing) return existing.id;

  // Utwórz nową
  const { data } = await supabase
    .from('gyms')
    .insert({
      name, city,
      location: `POINT(${lng} ${lat})`,
    })
    .select('id')
    .single();

  return data.id;
}
```

---

### Wyszukiwanie użytkowników (Discover)

**Stack:** `pg_trgm` — fuzzy search tolerujący literówki i różnice wielkości liter.

**SQL — jednorazowo:**
```sql
create extension if not exists pg_trgm;

create index profiles_name_trgm     on profiles using gin(name gin_trgm_ops);
create index profiles_username_trgm on profiles using gin(username gin_trgm_ops);
```

**`src/discover.js`** — dwie funkcje:
```js
// Proste wyszukiwanie (wystarczy na start)
export async function searchUsers(query) {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, username, avatar_url')
    .or(`name.ilike.%${query}%, username.ilike.%${query}%`)
    .limit(20);

  return data || [];
}

// Zalogowany użytkownik — czy followuje wynik
export async function searchUsersWithFollow(query) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('profiles')
    .select(`
      id, name, username, avatar_url,
      follows!follows_following_id_fkey ( follower_id )
    `)
    .or(`name.ilike.%${query}%, username.ilike.%${query}%`)
    .eq('follows.follower_id', user.id)
    .limit(20);

  return (data || []).map(u => ({
    ...u,
    isFollowing: u.follows.length > 0,
  }));
}
```

**Kolejność w planie wdrożenia** — dodaj do Fazy 2:

| # | Zadanie | Plik |
|---|---|---|
| 2a | PostGIS + `pg_trgm` SQL extensions | Supabase dashboard |
| 2b | `expo-location` + app.json permission | konfiguracja |
| 2c | `src/discover.js` | nowy — loadNearbyGyms, searchUsers |
| 2d | DiscoverScreen — podmiana mocków | edycja |
| 2e | findOrCreateGym() przy check-inie | LogScreen / WorkoutScreen |

---

## Droga do App Store

> To pierwsza aplikacja — proces jest dłuższy niż się wydaje. Każdy etap opisany krok po kroku.

---

### Co jest już gotowe

| Element | Status |
|---|---|
| Mac z Xcode | ✅ xcode-select 2416 |
| Node v24, npm v11 | ✅ |
| Kod aplikacji (lokalna wersja) | ✅ działa w Expo Go |
| GitHub repo | ✅ github.com/maaciej32167/Pulse |

---

### Co musi być gotowe PRZED złożeniem do App Store

Poniższe rzeczy są **wymagane** — bez nich Apple odrzuci aplikację:

| Element | Uwagi |
|---|---|
| Apple Developer Account | $99/rok, enrollment 1–2 dni robocze |
| Backend działający (auth + sync) | Apple wymaga żeby konto działało podczas review |
| Polityka prywatności (URL) | Obowiązkowa gdy app zbiera dane użytkowników |
| Onboarding przy pierwszym uruchomieniu | Apple odrzuca aplikacje bez wyjaśnienia co robi app |
| Ikona aplikacji (1024×1024 px) | Bez przezroczystości, bez zaokrąglonych rogów |
| Screenshots dla każdego rozmiaru urządzenia | iPhone 6.9", 6.5", 5.5" — minimum |
| Opis aplikacji po angielsku | App Store jest globalny |
| Bundle identifier ustawiony w app.json | `com.maciejgierlik.pulse` |
| `scheme` w app.json | `"pulse"` — deep links dla auth |
| Uprawnienia z opisem (lokalizacja, notyfikacje) | Każde uprawnienie = opis PO POLSKU i angielsku |

---

### Etap 0 — Konfiguracja projektu (zrób teraz, przed backendem)

**`app.json`** — uzupełnij brakujące pola:

```json
{
  "expo": {
    "name": "Pulse",
    "slug": "pulse",
    "version": "1.0.0",
    "scheme": "pulse",
    "ios": {
      "bundleIdentifier": "com.maciejgierlik.pulse",
      "buildNumber": "1",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Pulse używa lokalizacji do znalezienia pobliskich siłowni.",
        "NSCameraUsageDescription": "Pulse używa aparatu do zdjęć treningowych.",
        "NSPhotoLibraryUsageDescription": "Pulse potrzebuje dostępu do zdjęć."
      }
    },
    "plugins": [
      ["expo-location", {
        "locationWhenInUsePermission": "Pulse używa lokalizacji do znalezienia pobliskich siłowni."
      }],
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#FF4757"
      }]
    ]
  }
}
```

**Ikona i splash screen** — wygeneruj automatycznie przez EAS:
```bash
# Przygotuj plik icon.png (1024×1024, bez przezroczystości)
# i splash.png (2048×2048) w ./assets/
```

---

### Etap 1 — Apple Developer Account

1. Wejdź na developer.apple.com → Enroll
2. Wybierz "Individual" (nie company) — tańszy proces
3. Zapłać $99 — karta debetowa/kredytowa, BLIK nie działa
4. Poczekaj 1–2 dni na weryfikację (czasem szybciej)
5. Po weryfikacji: App Store Connect dostępny na appstoreconnect.apple.com

---

### Etap 2 — EAS Build (budowanie aplikacji)

EAS Build buduje `.ipa` (plik instalacyjny iOS) w chmurze Expo — nie potrzebujesz lokalnego Xcode do budowania.

```bash
# Jednorazowa instalacja
npm install -g eas-cli

# Zaloguj się kontem Expo (utwórz na expo.dev jeśli nie masz)
eas login

# Inicjalizuj EAS w projekcie (tworzy eas.json)
eas build:configure
```

**`eas.json`** — konfiguracja buildów:
```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "ios": { "buildNumber": "1" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Budowanie:**
```bash
# Build testowy (do TestFlight)
eas build --platform ios --profile preview

# Build produkcyjny (do App Store)
eas build --platform ios --profile production
```

Pierwszy build trwa 15–30 minut. EAS wysyła link do pobrania.

---

### Etap 3 — Polityka prywatności (OBOWIĄZKOWE)

Apple wymaga URL do polityki prywatności — musi być publicznie dostępna strona.

**Najprostsze rozwiązanie:** GitHub Pages lub Notion (publiczna strona).

Polityka musi zawierać:
- jakie dane zbierasz (email, treningi, lokalizacja)
- jak je przechowujesz (Supabase, serwery w EU)
- prawo do usunięcia danych (endpoint w aplikacji)
- kontakt email

**Prawo do usunięcia konta** — Apple od 2023 roku wymaga żeby użytkownik mógł usunąć konto z poziomu aplikacji. Musisz to zaimplementować (Profil → Ustawienia → Usuń konto → `supabase.auth.admin.deleteUser()`).

---

### Etap 4 — App Store Connect — stworzenie listingu

1. Wejdź na appstoreconnect.apple.com
2. My Apps → `+` → New App
3. Wypełnij:
   - **Name:** Pulse - Gym Tracker
   - **Bundle ID:** com.maciejgierlik.pulse
   - **SKU:** pulse-001 (dowolny unikalny string)
   - **Primary Language:** Polish

4. **Opis (po angielsku i polsku):**
   - Subtitle (30 znaków): "Train. Track. Compete."
   - Description (4000 znaków): pełny opis funkcji
   - Keywords (100 znaków): gym,workout,tracker,fitness,lifting,strength

5. **Screenshots** — wymagane rozmiary:
   - iPhone 6.9" (iPhone 16 Pro Max): 1320×2868 px
   - iPhone 6.5" (iPhone 14 Plus): 1284×2778 px
   - iPhone 5.5" (iPhone 8 Plus): 1242×2208 px

   Najłatwiej: użyj symulatora Xcode w odpowiednim rozmiarze + `Cmd+S` do screenshota.

6. **Age Rating:** wypełnij kwestionariusz — Pulse to 4+ (brak przemocy, alkoholu itp.)

7. **Pricing:** Free

---

### Etap 5 — TestFlight (testy beta przed submitem)

Przed wysłaniem do review — przetestuj na prawdziwych urządzeniach:

```bash
eas build --platform ios --profile preview
eas submit --platform ios  # wysyła do App Store Connect
```

W App Store Connect → TestFlight:
- Dodaj siebie jako Internal Tester (do 100 osób, bez review Apple)
- External Testing (do 10 000 osób) wymaga review — zajmuje 1–2 dni

---

### Etap 6 — Submit do App Store

```bash
# Automatyczny submit po buildzie
eas submit --platform ios --latest
```

Lub ręcznie w App Store Connect: wybierz build → Add for Review → Submit.

**Przed submitem sprawdź:**
- [ ] Backend działa (Apple reviewer próbuje się zalogować)
- [ ] Konto testowe przygotowane dla reviewera (podaj w "Notes for Reviewer")
- [ ] Polityka prywatności URL wpisana w App Store Connect
- [ ] Wszystkie screenshots wgrane
- [ ] Opis aplikacji kompletny

---

### Etap 7 — Review Apple

- Czas oczekiwania: **1–3 dni** (średnio 24h)
- Możesz śledzić status w App Store Connect

**Najczęstsze powody odrzucenia dla pierwszej aplikacji:**

| Powód | Rozwiązanie |
|---|---|
| Brak polityki prywatności | Dodaj URL w App Store Connect |
| Backend nie działa podczas review | Upewnij się że serwery są aktywne |
| Brak opcji usunięcia konta | Zaimplementuj w Ustawieniach |
| Uprawnienia bez uzasadnienia | Każde `NSXxxUsageDescription` musi być konkretne |
| Crashuje podczas review | Przetestuj na fizycznym urządzeniu przed submitem |
| Placeholder content (mock dane) | Mock dane są OK jeśli wyraźnie opisane jako przykłady |
| Logowanie nie działa | Przygotuj konto demo dla reviewera |

**Jeśli Apple odrzuci:** dostajesz email z konkretnym powodem. Naprawiasz i resubmitujesz — nowa kolejka (kolejne 1–3 dni). Nie panikuj, to normalne przy pierwszej aplikacji.

---

### Etap 8 — Po publikacji

```bash
# Aktualizacja wersji (bez review jeśli drobna zmiana UI)
# Wymaga nowego buildu + submitu

# Hotfix bez review — OTA update (tylko JS, bez natywnych zmian)
npx expo install expo-updates
# Konfiguracja w eas.json + app.json
eas update --branch production --message "Fix: ..."
```

OTA update (expo-updates) — możesz naprawiać bugi bez czekania na Apple review, ale tylko zmiany w kodzie JS. Zmiany natywne (nowe uprawnienia, nowe biblioteki natywne) wymagają pełnego buildu.

---

### Szacowany harmonogram (od zera do App Store)

| Etap | Czas | Uwagi |
|---|---|---|
| Backend Faza 1 (auth + sync) | 1–2 tygodnie | Największy skok |
| Backend Faza 2 (feed, discover) | 1 tydzień | |
| Polityka prywatności | 1–2h | |
| Ikona + screenshots | 2–4h | |
| EAS setup + pierwszy build | 2–3h | |
| TestFlight testy | 3–7 dni | |
| App Store Connect listing | 2–3h | |
| Apple review | 1–3 dni | |
| **Łącznie od dziś** | **~4–6 tygodni** | Realistycznie dla pierwszej aplikacji |

---

### Koszty

| Element | Koszt |
|---|---|
| Apple Developer Program | $99/rok (~400 zł) |
| Supabase | $0 (darmowy tier do ~500 użytkowników) |
| EAS Build | $0 (darmowy tier: 30 buildów/miesiąc) |
| Expo Updates (OTA) | $0 (darmowy tier) |
| Domena na politykę prywatności | $0 (GitHub Pages) lub ~50 zł/rok |
| **Łącznie** | **~$99/rok** |

---

## Znane quirks

- Expo Go nie obsługuje SDK 55+ — projekt na SDK 54
- Na fizycznym urządzeniu w innej sieci: `--tunnel` (ngrok)
- AsyncStorage jest asynchroniczny — wszystkie odczyty w `useEffect` z `async/await`
- BW exercises: waga efektywna = `bodyWeight + extraWeight`, wyświetlana jako `"75 + 10 kg"`
