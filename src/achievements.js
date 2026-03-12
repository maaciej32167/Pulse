/**
 * achievements.js
 * Kompletna baza achievementów dla aplikacji Pulse
 *
 * RZADKOŚĆ (rarity):
 *   common    – łatwe, pierwsze kroki
 *   uncommon  – kilka tygodni regularności
 *   rare      – kilka miesięcy zaangażowania
 *   epic      – rok+ poważnego trenowania
 *   legendary – lata, wyjątkowe osiągnięcia
 *   mythic    – prawie nieosiągalne, dla kilku %
 *   secret    – ukryte easter eggi, nie widać warunku
 */

export const RARITY = {
  common:    { label: 'Zwykły',     color: '#778899', glow: '#77889933' },
  uncommon:  { label: 'Niezwykły',  color: '#27ae60', glow: '#27ae6033' },
  rare:      { label: 'Rzadki',     color: '#2980b9', glow: '#2980b933' },
  epic:      { label: 'Epicki',     color: '#8e44ad', glow: '#8e44ad44' },
  legendary: { label: 'Legendarny', color: '#e67e22', glow: '#e67e2244' },
  mythic:    { label: 'Mityczny',   color: '#FF4757', glow: '#FF475755' },
  secret:    { label: '???',        color: '#445566', glow: '#44556622' },
};

// ─── KATEGORIE ────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: 'sessions',     label: 'ŻELAZO',       subtitle: 'Liczba treningów',       icon: '🏋️',  color: '#FF6B35' },
  { id: 'strength',     label: 'SIŁA',          subtitle: 'Rekordy osobiste',       icon: '⚡',  color: '#FFD700' },
  { id: 'consistency',  label: 'REGULARNOŚĆ',   subtitle: 'Streak i nawyk',         icon: '🔥',  color: '#E74C3C' },
  { id: 'volume',       label: 'WOLUMEN',       subtitle: 'Łączny podniesiony ciężar', icon: '⚖️', color: '#2ECC71' },
  { id: 'time',         label: 'CZAS',          subtitle: 'Godziny na siłowni',     icon: '⏱️',  color: '#3498DB' },
  { id: 'exploration',  label: 'EKSPLORACJA',   subtitle: 'Siłownie i miejsca',     icon: '🗺️',  color: '#9B59B6' },
  { id: 'social',       label: 'SPOŁECZNOŚĆ',   subtitle: 'Znajomi i rywalizacja',  icon: '👥',  color: '#1ABC9C' },
  { id: 'secret',       label: 'UKRYTE',        subtitle: '??? Odkryj sam',         icon: '🌑',  color: '#445566' },
];

// ─── ACHIEVEMENTY ─────────────────────────────────────────────────────────
export const ACHIEVEMENTS = [

  // ══════════════════════════════════════════════════════
  // ŻELAZO – Liczba treningów
  // ══════════════════════════════════════════════════════
  {
    id: 'sessions_1',
    category: 'sessions',
    rarity: 'common',
    icon: '🥉',
    name: 'Pierwszy krok',
    description: 'Pierwszy trening zalogowany w aplikacji.',
    flavor: '"Każda legenda zaczyna się od jednego kroku."',
    condition: { type: 'sessions_total', value: 1 },
    xpReward: 50,
  },
  {
    id: 'sessions_10',
    category: 'sessions',
    rarity: 'common',
    icon: '🔟',
    name: 'Debiutant',
    description: 'Ukończ 10 treningów.',
    flavor: '"Zacząłeś. To więcej niż robi większość."',
    condition: { type: 'sessions_total', value: 10 },
    xpReward: 100,
  },
  {
    id: 'sessions_25',
    category: 'sessions',
    rarity: 'uncommon',
    icon: '🎯',
    name: 'Zaangażowany',
    description: 'Ukończ 25 treningów.',
    flavor: '"Trzy tygodnie budują nawyk. Ty już go masz."',
    condition: { type: 'sessions_total', value: 25 },
    xpReward: 200,
  },
  {
    id: 'sessions_50',
    category: 'sessions',
    rarity: 'uncommon',
    icon: '5️⃣0️⃣',
    name: 'Pięćdziesiątka',
    description: 'Ukończ 50 treningów.',
    flavor: '"Połowa setki. Wiesz już że to nie etap – to życie."',
    condition: { type: 'sessions_total', value: 50 },
    xpReward: 300,
  },
  {
    id: 'sessions_100',
    category: 'sessions',
    rarity: 'rare',
    icon: '💯',
    name: 'Centurion',
    description: 'Ukończ 100 treningów.',
    flavor: '"Centurionem zostawał ten co nie odpuszczał."',
    condition: { type: 'sessions_total', value: 100 },
    xpReward: 500,
  },
  {
    id: 'sessions_250',
    category: 'sessions',
    rarity: 'epic',
    icon: '🏛️',
    name: 'Weteran',
    description: 'Ukończ 250 treningów.',
    flavor: '"Nie pytasz już czy iść. Po prostu idziesz."',
    condition: { type: 'sessions_total', value: 250 },
    xpReward: 1000,
  },
  {
    id: 'sessions_500',
    category: 'sessions',
    rarity: 'legendary',
    icon: '⚔️',
    name: 'Legion',
    description: 'Ukończ 500 treningów.',
    flavor: '"Pięćset razy wybrałeś to zamiast kanapy."',
    condition: { type: 'sessions_total', value: 500 },
    xpReward: 2500,
  },
  {
    id: 'sessions_1000',
    category: 'sessions',
    rarity: 'mythic',
    icon: '👑',
    name: 'Tysiącletni',
    description: 'Ukończ 1000 treningów.',
    flavor: '"Tysiąc. Nie ma już nic do udowodnienia. I właśnie dlatego wracasz."',
    condition: { type: 'sessions_total', value: 1000 },
    xpReward: 10000,
  },

  // ══════════════════════════════════════════════════════
  // SIŁA – Rekordy osobiste
  // ══════════════════════════════════════════════════════
  {
    id: 'strength_first_plate',
    category: 'strength',
    rarity: 'common',
    icon: '🪙',
    name: 'Pierwsza talerka',
    description: 'Osiągnij 60 kg Squat, 40 kg Bench lub 80 kg Deadlift.',
    flavor: '"Żelazo po obu stronach. Pierwsze, ale nie ostatnie."',
    condition: { type: 'any_lift_pr', lifts: { squat: 60, bench: 40, deadlift: 80 } },
    xpReward: 150,
  },
  {
    id: 'strength_two_plates',
    category: 'strength',
    rarity: 'uncommon',
    icon: '🥈',
    name: 'Dwie talerki',
    description: 'Osiągnij 100 kg Squat, 60 kg Bench lub 140 kg Deadlift.',
    flavor: '"Dwie talerki to granica między ćwiczącym a siłaczem."',
    condition: { type: 'any_lift_pr', lifts: { squat: 100, bench: 60, deadlift: 140 } },
    xpReward: 300,
  },
  {
    id: 'strength_three_plates',
    category: 'strength',
    rarity: 'rare',
    icon: '🥇',
    name: 'Trzy talerki',
    description: 'Osiągnij 140 kg Squat, 100 kg Bench lub 180 kg Deadlift.',
    flavor: '"Trzy talerki to coś, o czym większość tylko marzy."',
    condition: { type: 'any_lift_pr', lifts: { squat: 140, bench: 100, deadlift: 180 } },
    xpReward: 600,
  },
  {
    id: 'strength_four_plates',
    category: 'strength',
    rarity: 'epic',
    icon: '🔱',
    name: 'Cztery talerki',
    description: 'Osiągnij 180 kg Squat, 140 kg Bench lub 220 kg Deadlift.',
    flavor: '"Niewielu dociera tutaj. Ty dotarłeś."',
    condition: { type: 'any_lift_pr', lifts: { squat: 180, bench: 140, deadlift: 220 } },
    xpReward: 1500,
  },
  {
    id: 'strength_iron_trinity',
    category: 'strength',
    rarity: 'legendary',
    icon: '⚜️',
    name: 'Iron Trinity',
    description: 'Pobij PR w Squat, Bench Press i Deadlift w ciągu jednego tygodnia.',
    flavor: '"Trzy fundamenty. Jeden tydzień. Jedno życie."',
    condition: { type: 'pr_all_three_in_week' },
    xpReward: 3000,
  },
  {
    id: 'strength_ghost_lift',
    category: 'strength',
    rarity: 'rare',
    icon: '👻',
    name: 'Ghost Lift',
    description: 'Pobij PR po co najmniej 90 dniach bez żadnego nowego rekordu.',
    flavor: '"Znikneło żelazo. Wróciło mocniejsze."',
    condition: { type: 'pr_after_drought_days', value: 90 },
    xpReward: 500,
  },
  {
    id: 'strength_comeback',
    category: 'strength',
    rarity: 'epic',
    icon: '🦅',
    name: 'Feniks',
    description: 'Pobij swój alltime PR po powrocie z przerwy dłuższej niż 60 dni.',
    flavor: '"Przerwa nie zresetowała Cię. Wzmocniła."',
    condition: { type: 'pr_after_break_days', value: 60 },
    xpReward: 1200,
  },
  {
    id: 'strength_body_ratio',
    category: 'strength',
    rarity: 'epic',
    icon: '🧬',
    name: 'Ciężar własny',
    description: 'Podnieś w Bench Press swój ciężar ciała.',
    flavor: '"Udźwignąć siebie – dosłownie."',
    condition: { type: 'bench_equals_bodyweight' },
    xpReward: 800,
  },
  {
    id: 'strength_double_bodyweight',
    category: 'strength',
    rarity: 'legendary',
    icon: '🌋',
    name: 'Dwa razy ja',
    description: 'Wykonaj Deadlift równy dwukrotności swojego ciężaru ciała.',
    flavor: '"Podnosisz dwie wersje siebie. Obie."',
    condition: { type: 'deadlift_double_bodyweight' },
    xpReward: 2000,
  },

  // ══════════════════════════════════════════════════════
  // REGULARNOŚĆ – Streak
  // ══════════════════════════════════════════════════════
  {
    id: 'streak_7',
    category: 'consistency',
    rarity: 'common',
    icon: '📅',
    name: 'Pierwszy tydzień',
    description: 'Trenuj przez 7 dni z rzędu.',
    flavor: '"Siedem dni. Zaczyna się coś prawdziwego."',
    condition: { type: 'streak_days', value: 7 },
    xpReward: 100,
  },
  {
    id: 'streak_14',
    category: 'consistency',
    rarity: 'uncommon',
    icon: '🔗',
    name: 'Łańcuch',
    description: 'Trenuj przez 14 dni z rzędu.',
    flavor: '"Dwa tygodnie. Łańcuch jest już za ciężki żeby go zerwać."',
    condition: { type: 'streak_days', value: 14 },
    xpReward: 250,
  },
  {
    id: 'streak_30',
    category: 'consistency',
    rarity: 'rare',
    icon: '🗓️',
    name: 'Iron Month',
    description: 'Trenuj przez 30 dni z rzędu.',
    flavor: '"30 razy wybrałeś siłownię. 30 razy mogłeś nie pójść."',
    condition: { type: 'streak_days', value: 30 },
    xpReward: 500,
  },
  {
    id: 'streak_60',
    category: 'consistency',
    rarity: 'epic',
    icon: '⛓️',
    name: 'Niezniszczalny',
    description: 'Trenuj przez 60 dni z rzędu.',
    flavor: '"Sześćdziesiąt dni. Twoje ciało już nie pyta po co."',
    condition: { type: 'streak_days', value: 60 },
    xpReward: 1000,
  },
  {
    id: 'streak_100',
    category: 'consistency',
    rarity: 'legendary',
    icon: '💎',
    name: 'Sto dni chwały',
    description: 'Trenuj przez 100 dni z rzędu.',
    flavor: '"Sto dni. Większość ludzi nie wytrzymuje 3."',
    condition: { type: 'streak_days', value: 100 },
    xpReward: 3000,
  },
  {
    id: 'streak_365',
    category: 'consistency',
    rarity: 'mythic',
    icon: '🌟',
    name: 'Rok żelaza',
    description: 'Trenuj przez 365 dni z rzędu.',
    flavor: '"Rok. Pełne okrążenie Słońca. Bez jednego dnia przerwy."',
    condition: { type: 'streak_days', value: 365 },
    xpReward: 15000,
  },
  {
    id: 'consistency_no_skip_week',
    category: 'consistency',
    rarity: 'uncommon',
    icon: '📐',
    name: 'Perfekcjonista',
    description: 'Ukończ 4 tygodnie bez pominięcia planowanego dnia treningowego.',
    flavor: '"Plan to obietnica. Dotrzymałeś jej 28 razy."',
    condition: { type: 'perfect_weeks', value: 4 },
    xpReward: 400,
  },
  {
    id: 'consistency_comeback',
    category: 'consistency',
    rarity: 'rare',
    icon: '🔄',
    name: 'Powrót',
    description: 'Wróć do regularnego treningu po przerwie dłuższej niż 3 miesiące.',
    flavor: '"Najtrudniejszy trening to ten po przerwie. Zrobiłeś go."',
    condition: { type: 'return_after_break_days', value: 90 },
    xpReward: 400,
  },

  // ══════════════════════════════════════════════════════
  // WOLUMEN – Łączny podniesiony ciężar
  // ══════════════════════════════════════════════════════
  {
    id: 'volume_10k',
    category: 'volume',
    rarity: 'common',
    icon: '📦',
    name: 'Pierwsza tona',
    description: 'Podnieś łącznie 10 000 kg we wszystkich treningach.',
    flavor: '"Dziesięć ton żelaza. Każde powtórzenie się liczyło."',
    condition: { type: 'total_volume_kg', value: 10000 },
    xpReward: 150,
  },
  {
    id: 'volume_100k',
    category: 'volume',
    rarity: 'uncommon',
    icon: '🏗️',
    name: 'Architekt',
    description: 'Podnieś łącznie 100 000 kg.',
    flavor: '"Sto ton. Budujesz coś więcej niż mięśnie."',
    condition: { type: 'total_volume_kg', value: 100000 },
    xpReward: 400,
  },
  {
    id: 'volume_500k',
    category: 'volume',
    rarity: 'rare',
    icon: '🚂',
    name: 'Lokomotywa',
    description: 'Podnieś łącznie 500 000 kg.',
    flavor: '"Pół miliona. Raz wprawiony w ruch – nie do zatrzymania."',
    condition: { type: 'total_volume_kg', value: 500000 },
    xpReward: 800,
  },
  {
    id: 'volume_1M',
    category: 'volume',
    rarity: 'epic',
    icon: '🌍',
    name: 'Milioner',
    description: 'Podnieś łącznie 1 000 000 kg (milion kilogramów).',
    flavor: '"Milion kilogramów. Liczba, której większość ludzi nie wyobraża sobie dotknąć."',
    condition: { type: 'total_volume_kg', value: 1000000 },
    xpReward: 2500,
  },
  {
    id: 'volume_10M',
    category: 'volume',
    rarity: 'legendary',
    icon: '🪐',
    name: 'Graviton',
    description: 'Podnieś łącznie 10 000 000 kg.',
    flavor: '"Dziesięć milionów. Grawitacja to dla Ciebie tylko sugestia."',
    condition: { type: 'total_volume_kg', value: 10000000 },
    xpReward: 10000,
  },
  {
    id: 'volume_session_10k',
    category: 'volume',
    rarity: 'rare',
    icon: '💥',
    name: 'Detonacja',
    description: 'Podnieś ponad 10 000 kg w pojedynczej sesji treningowej.',
    flavor: '"Jedna sesja. Dziesięć ton. Twoje ciało jutro się dowie."',
    condition: { type: 'single_session_volume_kg', value: 10000 },
    xpReward: 500,
  },
  {
    id: 'volume_everest',
    category: 'volume',
    rarity: 'mythic',
    icon: '🏔️',
    name: 'Everest',
    description: 'Podnieś łącznie 50 000 000 kg – więcej niż waży Mount Everest.',
    flavor: '"Podniosłeś górę. Dosłownie."',
    condition: { type: 'total_volume_kg', value: 50000000 },
    xpReward: 25000,
  },

  // ══════════════════════════════════════════════════════
  // CZAS – Godziny na siłowni
  // ══════════════════════════════════════════════════════
  {
    id: 'time_10h',
    category: 'time',
    rarity: 'common',
    icon: '⏰',
    name: 'Pierwsze godziny',
    description: 'Spędź łącznie 10 godzin na treningach.',
    flavor: '"Dziesięć godzin. Tyle co jeden dzień pracy. Ale dla siebie."',
    condition: { type: 'total_time_minutes', value: 600 },
    xpReward: 100,
  },
  {
    id: 'time_50h',
    category: 'time',
    rarity: 'uncommon',
    icon: '🕰️',
    name: 'Pięćdziesiąt godzin',
    description: 'Spędź łącznie 50 godzin na treningach.',
    flavor: '"Pięćdziesiąt godzin oddanych żelazu."',
    condition: { type: 'total_time_minutes', value: 3000 },
    xpReward: 300,
  },
  {
    id: 'time_100h',
    category: 'time',
    rarity: 'rare',
    icon: '⌛',
    name: 'Setka godzin',
    description: 'Spędź łącznie 100 godzin na treningach.',
    flavor: '"Mówią że 10 000 godzin robi mistrza. Zacząłeś poważnie."',
    condition: { type: 'total_time_minutes', value: 6000 },
    xpReward: 600,
  },
  {
    id: 'time_500h',
    category: 'time',
    rarity: 'epic',
    icon: '🌀',
    name: 'Pochłonięty',
    description: 'Spędź łącznie 500 godzin na treningach.',
    flavor: '"Pół tysiąca godzin. Wielu ludzi nie poświęca tyle na nic."',
    condition: { type: 'total_time_minutes', value: 30000 },
    xpReward: 2000,
  },
  {
    id: 'time_1000h',
    category: 'time',
    rarity: 'legendary',
    icon: '⚗️',
    name: 'Alchemik',
    description: 'Spędź łącznie 1000 godzin na treningach.',
    flavor: '"Tysiąc godzin. Zmieniłeś ołów w złoto."',
    condition: { type: 'total_time_minutes', value: 60000 },
    xpReward: 5000,
  },
  {
    id: 'time_efficient',
    category: 'time',
    rarity: 'uncommon',
    icon: '⚡',
    name: 'Snajper',
    description: 'Ukończ trening poniżej 35 minut z co najmniej 5 ćwiczeniami.',
    flavor: '"Wchodzisz. Robisz robotę. Wychodzisz. Bez zbędnych słów."',
    condition: { type: 'session_under_minutes', value: 35, min_exercises: 5 },
    xpReward: 200,
  },
  {
    id: 'time_marathon',
    category: 'time',
    rarity: 'rare',
    icon: '🏟️',
    name: 'Maraton',
    description: 'Ukończ trening trwający ponad 2.5 godziny.',
    flavor: '"Dwie i pół godziny. Większość wyszła dawno."',
    condition: { type: 'session_over_minutes', value: 150 },
    xpReward: 300,
  },

  // ══════════════════════════════════════════════════════
  // EKSPLORACJA
  // ══════════════════════════════════════════════════════
  {
    id: 'gym_home_10',
    category: 'exploration',
    rarity: 'common',
    icon: '🏠',
    name: 'Swój kąt',
    description: 'Odwiedź tę samą siłownię 10 razy.',
    flavor: '"Masz już swój kąt. Stały hak, znajome talerki."',
    condition: { type: 'same_gym_visits', value: 10 },
    xpReward: 100,
  },
  {
    id: 'gym_home_50',
    category: 'exploration',
    rarity: 'uncommon',
    icon: '🏡',
    name: 'Stały klient',
    description: 'Odwiedź tę samą siłownię 50 razy.',
    flavor: '"Znają Cię z imienia. I wiedzą, że przyjdziesz."',
    condition: { type: 'same_gym_visits', value: 50 },
    xpReward: 250,
  },
  {
    id: 'gym_home_100',
    category: 'exploration',
    rarity: 'rare',
    icon: '🏰',
    name: 'Zamek',
    description: 'Odwiedź tę samą siłownię 100 razy.',
    flavor: '"Nie chodzisz już do siłowni. Wracasz do zamku."',
    condition: { type: 'same_gym_visits', value: 100 },
    xpReward: 500,
  },
  {
    id: 'gym_nomad_3',
    category: 'exploration',
    rarity: 'uncommon',
    icon: '🧳',
    name: 'Wędrowiec',
    description: 'Trenuj w 3 różnych siłowniach.',
    flavor: '"Żelazo jest wszędzie. Ty też."',
    condition: { type: 'unique_gyms', value: 3 },
    xpReward: 150,
  },
  {
    id: 'gym_nomad_10',
    category: 'exploration',
    rarity: 'rare',
    icon: '🌐',
    name: 'Nomad',
    description: 'Trenuj w 10 różnych siłowniach.',
    flavor: '"Siłownia to stan umysłu, nie adres."',
    condition: { type: 'unique_gyms', value: 10 },
    xpReward: 400,
  },
  {
    id: 'gym_nomad_25',
    category: 'exploration',
    rarity: 'legendary',
    icon: '🗺️',
    name: 'Globetrotter',
    description: 'Trenuj w 25 różnych siłowniach.',
    flavor: '"Mapa Twoich treningów to atlas podróży."',
    condition: { type: 'unique_gyms', value: 25 },
    xpReward: 1500,
  },
  {
    id: 'gym_different_cities',
    category: 'exploration',
    rarity: 'epic',
    icon: '✈️',
    name: 'Żelazo bez granic',
    description: 'Trenuj w siłowniach w 5 różnych miastach.',
    flavor: '"Walizka? Zawsze jest w niej miejsce na buty treningowe."',
    condition: { type: 'unique_cities', value: 5 },
    xpReward: 1000,
  },
  {
    id: 'city_10',
    category: 'exploration',
    rarity: 'legendary',
    icon: '🚉',
    name: 'Pasażer',
    description: 'Trenuj w siłowniach w 10 różnych miastach.',
    flavor: '"Każde miasto ma swoją siłownię. Ty znasz już dziesięć."',
    condition: { type: 'unique_cities', value: 10 },
    xpReward: 2500,
  },
  {
    id: 'city_25',
    category: 'exploration',
    rarity: 'mythic',
    icon: '🌍',
    name: 'Żelazny Kartograf',
    description: 'Trenuj w siłowniach w 25 różnych miastach.',
    flavor: '"Twoja mapa treningowa to atlas, który większość ludzi nigdy nie wypełni."',
    condition: { type: 'unique_cities', value: 25 },
    xpReward: 7500,
  },
  {
    id: 'city_50',
    category: 'exploration',
    rarity: 'mythic',
    icon: '🛸',
    name: 'Bez korzeni',
    description: 'Trenuj w siłowniach w 50 różnych miastach.',
    flavor: '"Dom to tam, gdzie jest sztanga. Masz ich pięćdziesiąt."',
    condition: { type: 'unique_cities', value: 50 },
    xpReward: 20000,
  },

  // ══════════════════════════════════════════════════════
  // SPOŁECZNOŚĆ
  // ══════════════════════════════════════════════════════
  {
    id: 'social_first_friend',
    category: 'social',
    rarity: 'common',
    icon: '🤝',
    name: 'Spotter',
    description: 'Dodaj pierwszego znajomego w aplikacji.',
    flavor: '"Każdy potrzebuje spotter\'a. Znalazłeś swojego."',
    condition: { type: 'friends_count', value: 1 },
    xpReward: 75,
  },
  {
    id: 'social_5_friends',
    category: 'social',
    rarity: 'uncommon',
    icon: '👊',
    name: 'Ekipa',
    description: 'Miej 5 znajomych w aplikacji.',
    flavor: '"Pięcioosobowa ekipa. Motywacja się mnoży."',
    condition: { type: 'friends_count', value: 5 },
    xpReward: 200,
  },
  {
    id: 'social_first_follower',
    category: 'social',
    rarity: 'common',
    icon: '👁️',
    name: 'Ktoś patrzy',
    description: 'Otrzymaj swojego pierwszego followera.',
    flavor: '"Ktoś uznał, że warto Cię obserwować. Nie zawiedź go."',
    condition: { type: 'followers_count', value: 1 },
    xpReward: 100,
  },
  {
    id: 'social_followers_100',
    category: 'social',
    rarity: 'uncommon',
    icon: '📣',
    name: 'Głos w tłumie',
    description: 'Osiągnij 100 followerów.',
    flavor: '"Sto osób wybrało śledzenie Twojej drogi. Każdy trening jest teraz publicznym oświadczeniem."',
    condition: { type: 'followers_count', value: 100 },
    xpReward: 400,
  },
  {
    id: 'social_followers_1000',
    category: 'social',
    rarity: 'rare',
    icon: '📡',
    name: 'Sygnał',
    description: 'Osiągnij 1 000 followerów.',
    flavor: '"Tysiąc osób odbiera Twój sygnał. Co im dziś pokażesz?"',
    condition: { type: 'followers_count', value: 1000 },
    xpReward: 1000,
  },
  {
    id: 'social_followers_10000',
    category: 'social',
    rarity: 'epic',
    icon: '🔊',
    name: 'Amplifikator',
    description: 'Osiągnij 10 000 followerów.',
    flavor: '"Dziesięć tysięcy par oczu. Twoje treningi inspirują kogoś, kogo nigdy nie spotkasz."',
    condition: { type: 'followers_count', value: 10000 },
    xpReward: 3000,
  },
  {
    id: 'social_followers_100000',
    category: 'social',
    rarity: 'legendary',
    icon: '🌐',
    name: 'Żelazna ikona',
    description: 'Osiągnij 100 000 followerów.',
    flavor: '"Sto tysięcy. Jesteś już czymś więcej niż użytkownikiem aplikacji."',
    condition: { type: 'followers_count', value: 100000 },
    xpReward: 15000,
  },
  {
    id: 'social_rival_beaten',
    category: 'social',
    rarity: 'rare',
    icon: '🥊',
    name: 'Rywalizacja',
    description: 'Przeskocz znajomego w rankingu wolumenu miesięcznego.',
    flavor: '"Miłego dnia, przyjaciel. Twoje miejsce jest teraz moje."',
    condition: { type: 'overtake_friend_rank' },
    xpReward: 300,
  },
  {
    id: 'social_gym_legend',
    category: 'social',
    rarity: 'epic',
    icon: '🏆',
    name: 'Legenda siłowni',
    description: 'Zajmuj pierwsze miejsce w rankingu swojej siłowni przez cały miesiąc.',
    flavor: '"Pytają kto to jest. Odpowiedź brzmi: ten co zawsze tu jest."',
    condition: { type: 'gym_rank_1_full_month' },
    xpReward: 1500,
  },

  // ══════════════════════════════════════════════════════
  // UKRYTE – Easter eggs
  // ══════════════════════════════════════════════════════
  {
    id: 'secret_insomnia',
    category: 'secret',
    rarity: 'secret',
    icon: '🦉',
    name: 'Bezsenność',
    description: 'Ukryty achievement.',
    revealedDescription: 'Zaloguj trening między 23:00 a 5:00 rano.',
    revealedFlavor: '"Śpisz? Nie. Trenujesz."',
    condition: { type: 'session_time_range', from: 23, to: 5 },
    xpReward: 200,
  },
  {
    id: 'secret_new_year',
    category: 'secret',
    rarity: 'secret',
    icon: '🎆',
    name: 'Nowy Rok, stary ja',
    description: 'Ukryty achievement.',
    revealedDescription: 'Zaloguj trening 1 stycznia.',
    revealedFlavor: '"Kiedy inni mają postanowienia – Ty masz już trening."',
    condition: { type: 'session_on_date', month: 1, day: 1 },
    xpReward: 300,
  },
  {
    id: 'secret_birthday',
    category: 'secret',
    rarity: 'secret',
    icon: '🎂',
    name: 'Najlepszy prezent',
    description: 'Ukryty achievement.',
    revealedDescription: 'Zaloguj trening w dniu swoich urodzin.',
    revealedFlavor: '"Świętowanie przez pot i żelazo."',
    condition: { type: 'session_on_birthday' },
    xpReward: 250,
  },
  {
    id: 'secret_friday_13',
    category: 'secret',
    rarity: 'secret',
    icon: '🖤',
    name: 'Piątek Trzynastego',
    description: 'Ukryty achievement.',
    revealedDescription: 'Zaloguj trening w piątek 13.',
    revealedFlavor: '"Pech? Nie dziś."',
    condition: { type: 'session_on_friday_13' },
    xpReward: 200,
  },
  {
    id: 'secret_full_moon',
    category: 'secret',
    rarity: 'secret',
    icon: '🌕',
    name: 'Pełnia',
    description: 'Ukryty achievement.',
    revealedDescription: 'Zaloguj trening w noc pełni księżyca.',
    revealedFlavor: '"Wilkołaki ćwiczą też."',
    condition: { type: 'session_on_full_moon' },
    xpReward: 333,
  },
  {
    id: 'secret_666',
    category: 'secret',
    rarity: 'secret',
    icon: '😈',
    name: 'The Number',
    description: 'Ukryty achievement.',
    revealedDescription: 'Ukończ łącznie 666 serii we wszystkich treningach.',
    revealedFlavor: '"Nie boisz się liczb."',
    condition: { type: 'total_sets', value: 666 },
    xpReward: 666,
  },
  {
    id: 'secret_dawn',
    category: 'secret',
    rarity: 'secret',
    icon: '🌅',
    name: 'Jutrznia',
    description: 'Ukryty achievement.',
    revealedDescription: 'Zaloguj 7 treningów między 5:00 a 7:00 rano.',
    revealedFlavor: '"Świt należy do tych co go widzą z siłowni."',
    condition: { type: 'sessions_time_range_count', from: 5, to: 7, value: 7 },
    xpReward: 400,
  },
  {
    id: 'secret_no_rest',
    category: 'secret',
    rarity: 'secret',
    icon: '🩸',
    name: 'Bez litości',
    description: 'Ukryty achievement.',
    revealedDescription: 'Trenuj 7 dni z rzędu bez ani jednego dnia odpoczynku.',
    revealedFlavor: '"Twoje ciało prosiło o litość. Odmówiłeś."',
    condition: { type: 'streak_days', value: 7, consecutive: true },
    xpReward: 350,
  },
  {
    id: 'secret_ghost',
    category: 'secret',
    rarity: 'secret',
    icon: '👁️',
    name: 'Obserwator',
    description: 'Ukryty achievement.',
    revealedDescription: 'Trenuj regularnie przez miesiąc bez opublikowania ani jednego postu.',
    revealedFlavor: '"Nie potrzebujesz widowni. Wiesz co zrobiłeś."',
    condition: { type: 'no_posts_for_days_with_sessions', value: 30 },
    xpReward: 300,
  },
];

// ─── Logika sprawdzania achievementów ────────────────────────────────────
/**
 * Sprawdza które achievementy zostały odblokowane na podstawie danych użytkownika.
 *
 * @param {Object} userData - dane użytkownika z AsyncStorage
 * @param {Array}  userData.records - historia treningów
 * @param {Array}  userData.unlockedIds - już odblokowane (żeby nie dublować)
 * @returns {{ newlyUnlocked: string[], progress: Object }}
 */
export function checkAchievements(userData) {
  const { records = [], unlockedIds = [], profile = {}, bodyWeight = 80 } = userData;

  const newlyUnlocked = [];
  const progress = {}; // achievementId → { current, target }

  const totalSessions = records.length;
  const totalVolumeKg = records.reduce((sum, r) =>
    sum + (r.exercises || []).reduce((s2, ex) =>
      s2 + (ex.sets || []).reduce((s3, set) =>
        s3 + (set.weight || 0) * (set.reps || 0), 0), 0), 0);
  const totalMinutes = records.reduce((sum, r) => sum + (r.durationMin || 0), 0);

  // Pomocnik: czy achievement już odblokowany
  const isUnlocked = id => unlockedIds.includes(id);

  // Pomocnik: oznacz jako nowo odblokowany
  const unlock = id => {
    if (!isUnlocked(id)) newlyUnlocked.push(id);
  };

  // ── Sesje ──────────────────────────────────────────────────────────────
  [1, 10, 25, 50, 100, 250, 500, 1000].forEach(n => {
    const id = `sessions_${n}`;
    progress[id] = { current: totalSessions, target: n };
    if (totalSessions >= n) unlock(id);
  });

  // ── Wolumen ────────────────────────────────────────────────────────────
  [10000, 100000, 500000, 1000000, 10000000, 50000000].forEach(n => {
    const suffixes = { 10000: '10k', 100000: '100k', 500000: '500k', 1000000: '1M', 10000000: '10M', 50000000: 'everest' };
    const id = `volume_${suffixes[n]}`;
    progress[id] = { current: totalVolumeKg, target: n };
    if (totalVolumeKg >= n) unlock(id);
  });

  // ── Czas ───────────────────────────────────────────────────────────────
  [600, 3000, 6000, 30000, 60000].forEach(n => {
    const suffixes = { 600: '10h', 3000: '50h', 6000: '100h', 30000: '500h', 60000: '1000h' };
    const id = `time_${suffixes[n]}`;
    progress[id] = { current: totalMinutes, target: n };
    if (totalMinutes >= n) unlock(id);
  });

  // ── Streak (uproszczony przykład) ──────────────────────────────────────
  // W prawdziwej implementacji oblicz z records.date
  // Tutaj: placeholder
  const currentStreak = userData.currentStreak || 0;
  [7, 14, 30, 60, 100, 365].forEach(n => {
    const id = `streak_${n}`;
    progress[id] = { current: currentStreak, target: n };
    if (currentStreak >= n) unlock(id);
  });

  return { newlyUnlocked, progress };
}

// ─── Silnik achievementów dla flat records z Pulse ──────────────────────────
/**
 * Oblicza które achievementy są odblokowane na podstawie flat records z Pulse.
 * Wywołuj po każdym treningu (w SummaryScreen).
 *
 * @param {Array}  records     - flat array serii z AsyncStorage (pulse_records)
 * @param {Object} profile     - profil użytkownika (pulse_profile)
 * @param {number} bodyWeight  - waga ciała w kg
 * @param {Array}  unlockedIds - już odblokowane ID (żeby nie liczyć dwa razy)
 * @returns {{ newlyUnlocked: string[], progress: Object }}
 */
export function computeAchievementsFromRecords(records = [], profile = {}, bodyWeight = 80, unlockedIds = []) {
  const newlyUnlocked = [];
  const progress = {};

  const isUnlocked = id => unlockedIds.includes(id);
  const unlock = (id, isoDateStr) => {
    if (!isUnlocked(id)) newlyUnlocked.push({ id, date: isoDateStr || null });
  };

  // ── Pomocniki ────────────────────────────────────────────────────────────

  // Grupy po sesji (workoutId lub isoDate jako fallback)
  const bySession = new Map();
  for (const r of records) {
    const key = r.workoutId || r.isoDate || 'x';
    if (!bySession.has(key)) bySession.set(key, []);
    bySession.get(key).push(r);
  }
  const sessions = Array.from(bySession.values());

  // Unikalne dni treningowe
  const uniqueDays = new Set(records.map(r => r.isoDate).filter(Boolean));
  const totalSessions = uniqueDays.size;

  // Wolumen łączny
  const totalVolumeKg = records.reduce((s, r) => s + (Number(r.weight) || 0) * (Number(r.reps) || 0), 0);

  // Czas łączny (min) — z różnic timestampów per sesja
  let totalMinutes = 0;
  for (const sess of sessions) {
    const tss = sess.map(r => r.timestamp || 0).filter(Boolean);
    if (tss.length > 1) totalMinutes += (Math.max(...tss) - Math.min(...tss)) / 60000;
  }

  // Streak (najdłuższy)
  const sortedDays = Array.from(uniqueDays).sort();
  let bestStreak = 0, curStreak = 0, prevDay = null;
  for (const d of sortedDays) {
    const ms = new Date(d).getTime();
    curStreak = prevDay !== null && ms - prevDay === 86400000 ? curStreak + 1 : 1;
    bestStreak = Math.max(bestStreak, curStreak);
    prevDay = ms;
  }

  // Max waga per ćwiczenie (name → maxWeight)
  const maxWeightByEx = new Map();
  for (const r of records) {
    const w = Number(r.weight) || 0;
    if (!maxWeightByEx.has(r.exercise) || w > maxWeightByEx.get(r.exercise).weight) {
      maxWeightByEx.set(r.exercise, { weight: w, isoDate: r.isoDate });
    }
  }

  // Mapowanie nazw ćwiczeń na klucze (squat / bench / deadlift)
  const LIFT_MAP = {
    squat:    ['Barbell back squat', 'Barbell squat', 'Squat', 'Back Squat'],
    bench:    ['Bench press', 'Barbell bench press', 'Bench Press', 'Incline bench press'],
    deadlift: ['Deadlift', 'Romanian deadlift', 'Sumo deadlift'],
  };
  const getBestLift = liftKey => {
    let best = 0, bestDate = null;
    for (const name of (LIFT_MAP[liftKey] || [])) {
      const entry = maxWeightByEx.get(name);
      if (entry && entry.weight > best) { best = entry.weight; bestDate = entry.isoDate; }
    }
    return { weight: best, isoDate: bestDate };
  };

  // Max wolumen w jednej sesji
  const sessionVolumes = sessions.map(sess => ({
    vol: sess.reduce((s, r) => s + (Number(r.weight) || 0) * (Number(r.reps) || 0), 0),
    isoDate: sess[0]?.isoDate,
  }));
  const bestSessionVol = sessionVolumes.reduce((b, s) => s.vol > b.vol ? s : b, { vol: 0 });

  // Czas trwania sesji (min)
  const sessionDurations = sessions.map(sess => {
    const tss = sess.map(r => r.timestamp || 0).filter(Boolean);
    return tss.length > 1 ? (Math.max(...tss) - Math.min(...tss)) / 60000 : 0;
  });

  // Liczba ćwiczeń w sesji
  const sessionExCounts = sessions.map(sess => new Set(sess.map(r => r.exercise)).size);

  // ── SESJE ────────────────────────────────────────────────────────────────
  const sessNs = [1, 10, 25, 50, 100, 250, 500, 1000];
  sessNs.forEach(n => {
    const id = `sessions_${n}`;
    progress[id] = { current: totalSessions, target: n };
    if (totalSessions >= n) {
      const date = sortedDays[n - 1] || null;
      unlock(id, date);
    }
  });

  // ── WOLUMEN ŁĄCZNY ───────────────────────────────────────────────────────
  const volTargets = { 10000: '10k', 100000: '100k', 500000: '500k', 1000000: '1M', 10000000: '10M', 50000000: 'everest' };
  Object.entries(volTargets).forEach(([n, suffix]) => {
    const id = `volume_${suffix}`;
    progress[id] = { current: Math.round(totalVolumeKg), target: Number(n) };
    if (totalVolumeKg >= Number(n)) unlock(id);
  });

  // ── WOLUMEN SESJA ────────────────────────────────────────────────────────
  progress['volume_session_10k'] = { current: Math.round(bestSessionVol.vol), target: 10000 };
  if (bestSessionVol.vol >= 10000) unlock('volume_session_10k', bestSessionVol.isoDate);

  // ── CZAS ─────────────────────────────────────────────────────────────────
  const timeTargets = { 600: '10h', 3000: '50h', 6000: '100h', 30000: '500h', 60000: '1000h' };
  Object.entries(timeTargets).forEach(([n, suffix]) => {
    const id = `time_${suffix}`;
    progress[id] = { current: Math.round(totalMinutes), target: Number(n) };
    if (totalMinutes >= Number(n)) unlock(id);
  });

  // Snajper — trening < 35 min z ≥ 5 ćwiczeniami
  const hasSnajper = sessions.some((sess, i) => sessionDurations[i] > 0 && sessionDurations[i] < 35 && sessionExCounts[i] >= 5);
  if (hasSnajper) unlock('time_efficient');

  // Maraton — trening > 150 min
  const hasMaraton = sessions.some((_, i) => sessionDurations[i] > 150);
  if (hasMaraton) unlock('time_marathon');

  // ── STREAK ───────────────────────────────────────────────────────────────
  [7, 14, 30, 60, 100, 365].forEach(n => {
    const id = `streak_${n}`;
    progress[id] = { current: bestStreak, target: n };
    if (bestStreak >= n) unlock(id);
  });

  // ── SIŁA ─────────────────────────────────────────────────────────────────
  // any_lift_pr — progi dla talerzy
  const strengthTargets = [
    { id: 'strength_first_plate', lifts: { squat: 60, bench: 40, deadlift: 80 } },
    { id: 'strength_two_plates',  lifts: { squat: 100, bench: 60, deadlift: 140 } },
    { id: 'strength_three_plates',lifts: { squat: 140, bench: 100, deadlift: 180 } },
    { id: 'strength_four_plates', lifts: { squat: 180, bench: 140, deadlift: 220 } },
  ];
  strengthTargets.forEach(({ id, lifts }) => {
    const met = Object.entries(lifts).some(([lift, threshold]) => getBestLift(lift).weight >= threshold);
    if (met) unlock(id);
  });

  // Ciężar własny — bench >= bodyWeight
  const bestBench = getBestLift('bench');
  if (bodyWeight > 0 && bestBench.weight >= bodyWeight) unlock('strength_body_ratio', bestBench.isoDate);

  // Dwa razy ja — deadlift >= 2 * bodyWeight
  const bestDL = getBestLift('deadlift');
  if (bodyWeight > 0 && bestDL.weight >= bodyWeight * 2) unlock('strength_double_bodyweight', bestDL.isoDate);

  // Ghost Lift — PR po 90 dniach suszy
  const prRecords = records.filter(r => r.isPR).sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));
  for (let i = 1; i < prRecords.length; i++) {
    const gap = (new Date(prRecords[i].isoDate) - new Date(prRecords[i - 1].isoDate)) / 86400000;
    if (gap >= 90) { unlock('strength_ghost_lift', prRecords[i].isoDate); break; }
  }

  // Iron Trinity — PR w squat, bench i deadlift w ciągu jednego tygodnia (7 dni)
  const prByLift = { squat: [], bench: [], deadlift: [] };
  for (const r of records) {
    if (!r.isPR || !r.isoDate) continue;
    for (const [liftKey, names] of Object.entries(LIFT_MAP)) {
      if (names.some(n => r.exercise.toLowerCase() === n.toLowerCase())) {
        prByLift[liftKey].push(new Date(r.isoDate).getTime());
      }
    }
  }
  outer: for (const sqTs of prByLift.squat) {
    for (const bpTs of prByLift.bench) {
      for (const dlTs of prByLift.deadlift) {
        const span = Math.max(sqTs, bpTs, dlTs) - Math.min(sqTs, bpTs, dlTs);
        if (span <= 7 * 86400000) {
          unlock('strength_iron_trinity', new Date(Math.max(sqTs, bpTs, dlTs)).toISOString().split('T')[0]);
          break outer;
        }
      }
    }
  }

  // Feniks — pobicie alltime PR po przerwie ≥ 60 dni
  const sortedByTs = [...records].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const alltimePR = new Map(); // exercise → max 1RM before break
  let lastTs = 0;
  for (const r of sortedByTs) {
    const ts = r.timestamp || 0;
    const breakDays = lastTs > 0 ? (ts - lastTs) / 86400000 : 0;
    if (breakDays >= 60 && lastTs > 0) {
      // Sprawdź czy po przerwie bije alltime PR
      const orm = Number(r.weight) * (36 / (37 - Math.min(Number(r.reps), 36)));
      const prev = alltimePR.get(r.exercise) || 0;
      if (orm > prev) {
        unlock('strength_comeback', r.isoDate);
      }
    }
    // Aktualizuj alltime PR
    const orm = Number(r.weight) * (36 / (37 - Math.min(Number(r.reps), 36)));
    if (!alltimePR.has(r.exercise) || orm > alltimePR.get(r.exercise)) {
      alltimePR.set(r.exercise, orm);
    }
    lastTs = ts;
  }

  // ── UKRYTE (secret) ───────────────────────────────────────────────────────

  // Bezsenność — trening 23:00–5:00
  const hasNight = records.some(r => {
    if (!r.timestamp) return false;
    const h = new Date(r.timestamp).getHours();
    return h >= 23 || h < 5;
  });
  if (hasNight) unlock('secret_insomnia');

  // Nowy Rok, stary ja — trening 1 stycznia
  const hasNewYear = records.some(r => r.isoDate && r.isoDate.endsWith('-01-01'));
  if (hasNewYear) unlock('secret_new_year');

  // Urodziny
  if (profile.birthDate) {
    const [, bMd] = (profile.birthDate || '').split('-').length === 3
      ? ['', profile.birthDate.slice(5)]
      : ['', null];
    if (bMd) {
      const hasBirthday = records.some(r => r.isoDate && r.isoDate.endsWith(bMd));
      if (hasBirthday) unlock('secret_birthday');
    }
  }

  // Piątek 13 — trening w piątek 13
  const hasFriday13 = records.some(r => {
    if (!r.isoDate) return false;
    const d = new Date(r.isoDate);
    return d.getDay() === 5 && d.getDate() === 13;
  });
  if (hasFriday13) unlock('secret_friday_13');

  // The Number — 666 serii łącznie
  progress['secret_666'] = { current: records.length, target: 666 };
  if (records.length >= 666) unlock('secret_666');

  // Jutrznia — 7 treningów 5:00–7:00
  const dawnSessions = new Set(
    records
      .filter(r => r.timestamp && new Date(r.timestamp).getHours() >= 5 && new Date(r.timestamp).getHours() < 7)
      .map(r => r.isoDate)
  );
  progress['secret_dawn'] = { current: dawnSessions.size, target: 7 };
  if (dawnSessions.size >= 7) unlock('secret_dawn');

  // Bez litości — 7 dni z rzędu (to samo co streak_7, ale secret)
  if (bestStreak >= 7) unlock('secret_no_rest');

  // Pełnia — trening w noc pełni księżyca
  // Algorytm: znana pełnia 6 stycznia 2000, 18:14 UTC + okres synodyczny 29.53059 dni
  // Faza 0 = nów, 0.5 = pełnia; okno ±1.5 dnia (~0.051 cyklu)
  const FULL_MOON_REF_MS = 947182440000; // 2000-01-06T18:14:00Z
  const SYNODIC_MS = 29.53059 * 86400000;
  const hasFullMoon = records.some(r => {
    if (!r.timestamp) return false;
    const elapsed = r.timestamp - FULL_MOON_REF_MS;
    const phase = ((elapsed % SYNODIC_MS) + SYNODIC_MS) % SYNODIC_MS / SYNODIC_MS;
    return Math.abs(phase - 0.5) < 0.051; // ±1.5 dnia od pełni
  });
  if (hasFullMoon) unlock('secret_full_moon');

  return { newlyUnlocked, progress };
}

// ─── Grupowanie po kategoriach ─────────────────────────────────────────────
export function getAchievementsByCategory(categoryId) {
  return ACHIEVEMENTS.filter(a => a.category === categoryId);
}

// ─── Statystyki kolekcji ────────────────────────────────────────────────────
export function getCollectionStats(unlockedIds = []) {
  const total    = ACHIEVEMENTS.length;
  const unlocked = ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)).length;
  const xp       = ACHIEVEMENTS
    .filter(a => unlockedIds.includes(a.id))
    .reduce((sum, a) => sum + (a.xpReward || 0), 0);

  const byRarity = {};
  for (const key of Object.keys(RARITY)) {
    const inRarity  = ACHIEVEMENTS.filter(a => a.rarity === key).length;
    const gotRarity = ACHIEVEMENTS.filter(a => a.rarity === key && unlockedIds.includes(a.id)).length;
    byRarity[key] = { total: inRarity, unlocked: gotRarity };
  }

  return { total, unlocked, xp, byRarity };
}
