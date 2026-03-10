import { useState } from "react";

const RED = "#FF4757";

const WEEKS = [
  { label: "Pn", trainings: 1, duration: 72, volume: 8400 },
  { label: "Wt", trainings: 0, duration: 0, volume: 0 },
  { label: "Śr", trainings: 1, duration: 58, volume: 7100 },
  { label: "Cz", trainings: 0, duration: 0, volume: 0 },
  { label: "Pt", trainings: 1, duration: 84, volume: 10200 },
  { label: "So", trainings: 1, duration: 95, volume: 11800 },
  { label: "Nd", trainings: 0, duration: 0, volume: 0 },
];
const MONTHS = [
  { label: "Lip", trainings: 14, duration: 890, volume: 98000 },
  { label: "Sie", trainings: 16, duration: 1020, volume: 112000 },
  { label: "Wrz", trainings: 12, duration: 780, volume: 89000 },
  { label: "Paź", trainings: 18, duration: 1140, volume: 128000 },
  { label: "Lis", trainings: 17, duration: 1080, volume: 121000 },
  { label: "Gru", trainings: 15, duration: 960, volume: 109000 },
];

const HISTORY = [
  {
    id: 1, date: "Dziś, 07:45", name: "PUSH A – Klatka / Barki", gym: "FitFabric Poznań",
    duration: "1h 24min", volume: "11 800 kg", exercises: 6, prs: 1,
    sets: [
      { ex: "Bench Press", sets: "5 × 5", weight: "102.5 kg", pr: true },
      { ex: "Incline DB Press", sets: "4 × 10", weight: "32 kg", pr: false },
      { ex: "Cable Fly", sets: "3 × 15", weight: "22.5 kg", pr: false },
      { ex: "Overhead Press", sets: "4 × 8", weight: "72.5 kg", pr: false },
      { ex: "Lateral Raise", sets: "4 × 12", weight: "18 kg", pr: false },
      { ex: "Face Pull", sets: "3 × 15", weight: "30 kg", pr: false },
    ]
  },
  {
    id: 2, date: "Sob, 10:12", name: "LEG DAY – Siła", gym: "FitFabric Poznań",
    duration: "1h 35min", volume: "14 200 kg", exercises: 5, prs: 0,
    sets: [
      { ex: "Back Squat", sets: "5 × 3", weight: "140 kg", pr: false },
      { ex: "Romanian Deadlift", sets: "4 × 8", weight: "100 kg", pr: false },
      { ex: "Leg Press", sets: "4 × 12", weight: "220 kg", pr: false },
      { ex: "Leg Curl", sets: "3 × 12", weight: "55 kg", pr: false },
      { ex: "Calf Raise", sets: "4 × 15", weight: "120 kg", pr: false },
    ]
  },
  {
    id: 3, date: "Śr, 18:30", name: "PULL – Plecy / Biceps", gym: "FitFabric Poznań",
    duration: "58 min", volume: "9 400 kg", exercises: 6, prs: 0,
    sets: [
      { ex: "Deadlift", sets: "4 × 4", weight: "160 kg", pr: false },
      { ex: "Barbell Row", sets: "4 × 8", weight: "90 kg", pr: false },
      { ex: "Lat Pulldown", sets: "3 × 12", weight: "75 kg", pr: false },
      { ex: "Cable Row", sets: "3 × 12", weight: "70 kg", pr: false },
      { ex: "Hammer Curl", sets: "3 × 12", weight: "24 kg", pr: false },
      { ex: "EZ Bar Curl", sets: "3 × 10", weight: "40 kg", pr: false },
    ]
  },
];

const PRS = [
  { ex: "Back Squat", weight: "145 kg", date: "12 gru 2024", trend: 5 },
  { ex: "Bench Press", weight: "102.5 kg", date: "Dziś", trend: 2.5, isNew: true },
  { ex: "Deadlift", weight: "182.5 kg", date: "2 gru 2024", trend: 2.5 },
  { ex: "Overhead Press", weight: "80 kg", date: "28 lis 2024", trend: 5 },
  { ex: "Romanian Deadlift", weight: "130 kg", date: "15 lis 2024", trend: 10 },
  { ex: "Incline DB Press", weight: "38 kg", date: "1 gru 2024", trend: 2 },
  { ex: "Pull-up", weight: "+30 kg", date: "10 lis 2024", trend: 5 },
  { ex: "Barbell Row", weight: "110 kg", date: "5 gru 2024", trend: 5 },
];

const TRAINING_DAYS = new Set([2,4,6,7,9,11,13,14,16,18,20,21,23,25,27,28]);
const RADAR_DATA = [
  { label: "SIŁA", val: 82 },
  { label: "WOLUMEN", val: 74 },
  { label: "REGULARNOŚĆ", val: 91 },
  { label: "RÓŻNORODNOŚĆ", val: 58 },
  { label: "PROGRES", val: 67 },
];
const TOP3 = [
  { ex: "Back Squat", volume: "28 000 kg" },
  { ex: "Bench Press", volume: "22 400 kg" },
  { ex: "Deadlift", volume: "18 600 kg" },
];

function fmtVol(v) { return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`; }

function BarChart({ data, metric }) {
  const vals = data.map(d => d[metric]);
  const max = Math.max(...vals, 1);
  const unitMap = { trainings: "", duration: "min", volume: "kg" };
  const fmt = v => metric === "volume" ? `${fmtVol(v)} kg` : `${v}${unitMap[metric] ? " " + unitMap[metric] : ""}`;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110, paddingTop: 20 }}>
      {data.map((d, i) => {
        const h = max > 0 ? Math.round((d[metric] / max) * 80) : 0;
        const isMax = d[metric] === max && d[metric] > 0;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            {isMax && (
              <div style={{ fontSize: 8, color: RED, fontWeight: 700, fontFamily: "monospace", whiteSpace: "nowrap", marginBottom: 2 }}>
                {fmt(d[metric])}
              </div>
            )}
            <div style={{
              width: "100%", height: Math.max(h, 2),
              background: isMax ? RED : d[metric] === 0 ? "#1a1c2a" : "#252840",
              borderRadius: "3px 3px 0 0",
              boxShadow: isMax ? `0 0 10px ${RED}55` : "none",
              transition: "height 0.5s"
            }} />
            <div style={{ fontSize: 9, color: "#445", fontFamily: "monospace", textTransform: "uppercase" }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Radar({ data }) {
  const cx = 80, cy = 80, r = 58;
  const n = data.length;
  const ang = i => (Math.PI * 2 * i / n) - Math.PI / 2;
  const pt = (i, ratio) => ({ x: cx + Math.cos(ang(i)) * r * ratio, y: cy + Math.sin(ang(i)) * r * ratio });
  const polyPts = data.map((d, i) => pt(i, d.val / 100));
  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      {[0.25, 0.5, 0.75, 1].map(l => (
        <polygon key={l} points={data.map((_, i) => { const p = pt(i, l); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke="#1e2030" strokeWidth={1} />
      ))}
      {data.map((_, i) => { const p = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#1e2030" strokeWidth={1} />; })}
      <polygon points={polyPts.map(p => `${p.x},${p.y}`).join(" ")} fill={`${RED}20`} stroke={RED} strokeWidth={1.5} />
      {polyPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={RED} />)}
      {data.map((d, i) => { const p = pt(i, 1.28); return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={6.5} fill="#667" fontFamily="monospace" fontWeight="700">{d.label}</text>; })}
    </svg>
  );
}

function TrainingCard({ t }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "#0d0f1a", border: `1px solid ${open ? "#2a2d45" : "#1a1c2a"}`, borderRadius: 12, overflow: "hidden", marginBottom: 8, transition: "border-color 0.2s" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "13px 15px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            {t.prs > 0 && <span style={{ background: `${RED}20`, color: RED, fontSize: 8, fontFamily: "monospace", fontWeight: 700, padding: "2px 5px", borderRadius: 3, letterSpacing: 0.5 }}>★ PR</span>}
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ccd", letterSpacing: 0.2 }}>{t.name}</span>
          </div>
          <div style={{ fontSize: 10, color: "#445", fontFamily: "monospace", display: "flex", gap: 10 }}>
            <span>{t.date}</span>
            <span style={{ color: "#334" }}>·</span>
            <span>{t.gym}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7a8a99", fontFamily: "monospace" }}>{t.duration}</div>
            <div style={{ fontSize: 10, color: "#445", fontFamily: "monospace" }}>{t.volume}</div>
          </div>
          <div style={{ color: "#2a3040", fontSize: 13, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>▾</div>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: "1px solid #1a1c2a" }}>
          <div style={{ padding: "4px 15px 8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0 14px" }}>
              {["Ćwiczenie", "Serie", "Ciężar", ""].map((h, i) => (
                <div key={i} style={{ fontSize: 8, color: "#2a3a4a", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5, padding: "8px 0 4px", borderBottom: "1px solid #1a1c2a", textAlign: i > 0 ? "right" : "left" }}>{h}</div>
              ))}
              {t.sets.map((s, i) => (
                <>
                  <div key={`a${i}`} style={{ fontSize: 11, color: "#778", padding: "5px 0", borderBottom: i < t.sets.length - 1 ? "1px solid #13151e" : "none" }}>{s.ex}</div>
                  <div key={`b${i}`} style={{ fontSize: 11, color: "#445", fontFamily: "monospace", textAlign: "right", padding: "5px 0", borderBottom: i < t.sets.length - 1 ? "1px solid #13151e" : "none" }}>{s.sets}</div>
                  <div key={`c${i}`} style={{ fontSize: 11, color: s.pr ? RED : "#667", fontFamily: "monospace", textAlign: "right", fontWeight: s.pr ? 700 : 400, padding: "5px 0", borderBottom: i < t.sets.length - 1 ? "1px solid #13151e" : "none" }}>{s.weight}</div>
                  <div key={`d${i}`} style={{ padding: "5px 0", borderBottom: i < t.sets.length - 1 ? "1px solid #13151e" : "none", textAlign: "right" }}>
                    {s.pr && <span style={{ fontSize: 8, color: RED, fontFamily: "monospace", fontWeight: 700 }}>PR</span>}
                  </div>
                </>
              ))}
            </div>
          </div>
          <div style={{ padding: "10px 15px", borderTop: "1px solid #1a1c2a", display: "flex", gap: 8 }}>
            <button style={{ flex: 1, padding: "8px", background: "#1a1c2a", border: "none", borderRadius: 8, color: "#556", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>SZCZEGÓŁY</button>
            <button style={{ flex: 1, padding: "8px", background: "#1a1c2a", border: "none", borderRadius: 8, color: "#556", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>POWTÓRZ</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PulseProfile() {
  const [tab, setTab] = useState("stats");
  const [timeframe, setTimeframe] = useState("week");
  const [metric, setMetric] = useState("volume");

  const chartData = timeframe === "week" ? WEEKS : MONTHS;
  const tabs = [
    { id: "stats", label: "STATS" },
    { id: "history", label: "HISTORIA" },
    { id: "prs", label: "REKORDY" },
    { id: "dashboard", label: "DASHBOARD" },
    { id: "calendar", label: "KALENDARZ" },
  ];
  const metrics = [
    { id: "volume", label: "WOLUMEN" },
    { id: "trainings", label: "TRENINGI" },
    { id: "duration", label: "CZAS" },
  ];

  const dayLabels = ["Pn","Wt","Śr","Cz","Pt","So","Nd"];
  const calCells = [...Array(6).fill(null), ...Array.from({length: 31}, (_, i) => i + 1)];

  return (
    <div style={{ minHeight: "100vh", background: "#080a12", color: "#aabbc0", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", maxWidth: 420, margin: "0 auto", paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;0,800;1,400&family=DM+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: "36px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 62, height: 62, borderRadius: 18, background: "linear-gradient(135deg,#181a2e,#272a42)", border: `2px solid ${RED}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🧔</div>
              <div style={{ position: "absolute", bottom: -7, right: -7, background: RED, borderRadius: 8, padding: "2px 7px", fontSize: 10, fontWeight: 800, color: "#fff", fontFamily: "DM Mono, monospace", border: "2px solid #080a12" }}>23</div>
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#ddeeff", letterSpacing: -0.4, marginBottom: 4 }}>Jan Kowalski</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 11, color: "#cc2233", fontFamily: "DM Mono, monospace", fontWeight: 700 }}>⚒ IRONBORN</span>
                <span style={{ color: "#223", fontSize: 12 }}>·</span>
                <span style={{ fontSize: 10, color: "#445", fontFamily: "DM Mono, monospace" }}>FitFabric Poznań</span>
              </div>
              <div style={{ fontSize: 10, color: "#445", fontFamily: "DM Mono, monospace", marginTop: 3 }}>🔥 streak 5 dni &nbsp;·&nbsp; 📍 Poznań</div>
            </div>
          </div>
          <button style={{ background: "none", border: "1px solid #1e2030", borderRadius: 8, padding: "6px 10px", color: "#445", fontSize: 13, cursor: "pointer" }}>⚙</button>
        </div>

        {/* Iron Path widget */}
        <div style={{ background: "#0d0f1a", borderRadius: 16, padding: 16, border: "1px solid #1a1c2a", display: "flex", gap: 14, alignItems: "center", marginBottom: 4 }}>
          <Radar data={RADAR_DATA} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 8, color: "#334", fontFamily: "DM Mono, monospace", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 11 }}>Iron Path</div>
            {RADAR_DATA.map(({ label, val }) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 8.5, color: "#556", fontFamily: "DM Mono, monospace" }}>{label}</span>
                  <span style={{ fontSize: 8.5, color: "#778", fontFamily: "DM Mono, monospace", fontWeight: 700 }}>{val}</span>
                </div>
                <div style={{ height: 2, background: "#1a1c2a", borderRadius: 2 }}>
                  <div style={{ width: `${val}%`, height: "100%", background: val >= 85 ? RED : val >= 70 ? "#2a4a6a" : "#1e2a3a", borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={{ overflowX: "auto", padding: "18px 20px 0", scrollbarWidth: "none" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #1a1c2a", minWidth: "max-content" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "9px 15px", background: "none", border: "none",
              borderBottom: tab === t.id ? `2px solid ${RED}` : "2px solid transparent",
              color: tab === t.id ? RED : "#445",
              fontSize: 9.5, fontFamily: "DM Mono, monospace", fontWeight: 700,
              letterSpacing: 1, cursor: "pointer", marginBottom: -1,
              transition: "color 0.15s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>

        {/* STATS */}
        {tab === "stats" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[["week","TYDZIEŃ"],["month","MIESIĄCE"]].map(([id, lbl]) => (
                <button key={id} onClick={() => setTimeframe(id)} style={{
                  padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 9, fontFamily: "DM Mono, monospace", fontWeight: 700, letterSpacing: 0.8,
                  border: `1px solid ${timeframe === id ? RED : "#1e2030"}`,
                  background: timeframe === id ? `${RED}18` : "transparent",
                  color: timeframe === id ? RED : "#445",
                }}>{lbl}</button>
              ))}
            </div>
            <div style={{ background: "#0d0f1a", borderRadius: 14, padding: "4px", border: "1px solid #1a1c2a", display: "flex", marginBottom: 14 }}>
              {metrics.map(m => (
                <button key={m.id} onClick={() => setMetric(m.id)} style={{
                  flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: metric === m.id ? "#1e2030" : "transparent",
                  color: metric === m.id ? "#ccd" : "#445",
                  fontSize: 9, fontFamily: "DM Mono, monospace", fontWeight: 700, letterSpacing: 0.5,
                }}>{m.label}</button>
              ))}
            </div>
            <div style={{ background: "#0d0f1a", borderRadius: 14, padding: "16px 16px 10px", border: "1px solid #1a1c2a", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#556", fontFamily: "DM Mono, monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                {metrics.find(m => m.id === metric)?.label} · {timeframe === "week" ? "ten tydzień" : "ostatnie 6 mies."}
              </div>
              <BarChart data={chartData} metric={metric} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Treningi (mies.)","15"],["Śr. czas sesji","64 min"],["Wolumen (mies.)","109k kg"],["Najdłuższy streak","18 dni"]].map(([l,v]) => (
                <div key={l} style={{ background: "#0d0f1a", borderRadius: 12, padding: "14px 16px", border: "1px solid #1a1c2a" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#ccd", fontFamily: "DM Mono, monospace", marginBottom: 4 }}>{v}</div>
                  <div style={{ fontSize: 8.5, color: "#445", fontFamily: "DM Mono, monospace", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* HISTORIA */}
        {tab === "history" && (
          <>
            <div style={{ fontSize: 8.5, color: "#334", fontFamily: "DM Mono, monospace", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>Ostatnie treningi</div>
            {HISTORY.map(t => <TrainingCard key={t.id} t={t} />)}
            <div style={{ textAlign: "center", padding: "14px 0", fontSize: 9.5, color: "#334", fontFamily: "DM Mono, monospace", cursor: "pointer", letterSpacing: 1 }}>WCZYTAJ WIĘCEJ ↓</div>
          </>
        )}

        {/* REKORDY */}
        {tab === "prs" && (
          <>
            <div style={{ fontSize: 8.5, color: "#334", fontFamily: "DM Mono, monospace", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>Rekordy osobiste</div>
            {PRS.map((pr, i) => (
              <div key={i} style={{ background: "#0d0f1a", borderRadius: 12, padding: "12px 14px", border: `1px solid ${pr.isNew ? RED + "44" : "#1a1c2a"}`, marginBottom: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                    {pr.isNew && <span style={{ fontSize: 7.5, background: `${RED}20`, color: RED, fontFamily: "DM Mono, monospace", fontWeight: 700, padding: "2px 5px", borderRadius: 3, letterSpacing: 0.5 }}>NOWY</span>}
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#ccd" }}>{pr.ex}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: "#445", fontFamily: "DM Mono, monospace" }}>{pr.date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "DM Mono, monospace", color: pr.isNew ? RED : "#8899aa", lineHeight: 1, marginBottom: 3 }}>{pr.weight}</div>
                  <div style={{ fontSize: 9.5, color: "#3a8a4a", fontFamily: "DM Mono, monospace" }}>+{pr.trend} kg ↑</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <>
            <div style={{ fontSize: 8.5, color: "#334", fontFamily: "DM Mono, monospace", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>Dashboard · Grudzień 2024</div>
            <div style={{ background: "linear-gradient(135deg,#18080c,#0d0f1a)", border: `1px solid ${RED}33`, borderRadius: 16, padding: 20, marginBottom: 10, display: "flex", gap: 20, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 48, fontWeight: 800, fontFamily: "DM Mono, monospace", color: RED, lineHeight: 1 }}>15</div>
                <div style={{ fontSize: 8.5, color: "#667", fontFamily: "DM Mono, monospace", textTransform: "uppercase", marginTop: 5 }}>treningów</div>
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
                {[["Wolumen","109k kg"],["Łączny czas","16h 0m"],["Śr. czas","64 min"],["Streak","5 dni 🔥"]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#8899aa", fontFamily: "DM Mono, monospace" }}>{v}</div>
                    <div style={{ fontSize: 9, color: "#334", fontFamily: "DM Mono, monospace" }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#0d0f1a", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid #1a1c2a" }}>
              <div style={{ fontSize: 8.5, color: "#445", fontFamily: "DM Mono, monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 13 }}>Nowe PR w grudniu</div>
              {PRS.filter(p => p.isNew || p.date.includes("Gru")).slice(0, 3).map((p, i, arr) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px solid #1a1c2a" : "none" }}>
                  <span style={{ fontSize: 12, color: "#778" }}>{p.ex}</span>
                  <span style={{ fontSize: 12, fontFamily: "DM Mono, monospace", fontWeight: 700, color: RED }}>{p.weight}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#0d0f1a", borderRadius: 14, padding: 16, border: "1px solid #1a1c2a" }}>
              <div style={{ fontSize: 8.5, color: "#445", fontFamily: "DM Mono, monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 13 }}>Top ćwiczenia wolumen</div>
              {TOP3.map(({ ex, volume }, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: i < 2 ? 10 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: i === 0 ? RED : "#1e2030", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontFamily: "DM Mono, monospace", color: i === 0 ? "#fff" : "#445", fontWeight: 700 }}>{i + 1}</div>
                    <span style={{ fontSize: 12, color: "#778" }}>{ex}</span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "DM Mono, monospace", color: "#556" }}>{volume}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* KALENDARZ */}
        {tab === "calendar" && (
          <>
            <div style={{ background: "#0d0f1a", borderRadius: 16, padding: 20, border: "1px solid #1a1c2a", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <button style={{ background: "none", border: "none", color: "#445", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>‹</button>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ccd", fontFamily: "DM Mono, monospace", letterSpacing: 1.5 }}>GRUDZIEŃ 2024</div>
                <button style={{ background: "none", border: "none", color: "#445", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
                {dayLabels.map(d => <div key={d} style={{ textAlign: "center", fontSize: 8, color: "#334", fontFamily: "DM Mono, monospace", padding: "4px 0" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                {calCells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const trained = TRAINING_DAYS.has(day);
                  const isToday = day === 30;
                  return (
                    <div key={i} style={{
                      aspectRatio: "1", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontFamily: "DM Mono, monospace", fontWeight: trained ? 700 : 400,
                      background: isToday ? RED : trained ? `${RED}1a` : "#0d0f1a",
                      color: isToday ? "#fff" : trained ? RED : "#2a3040",
                      border: isToday ? `1px solid ${RED}` : trained ? `1px solid ${RED}33` : "1px solid #13151e",
                      boxShadow: trained && !isToday ? `0 0 5px ${RED}25` : "none",
                    }}>{day}</div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 0, marginTop: 18, justifyContent: "space-around" }}>
                {[["Treningów", TRAINING_DAYS.size, RED],["Przerw", 31 - TRAINING_DAYS.size, "#334"],["Aktywność", `${Math.round(TRAINING_DAYS.size/31*100)}%`, "#556"]].map(([l,v,c]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "DM Mono, monospace", color: c }}>{v}</div>
                    <div style={{ fontSize: 8, color: "#334", fontFamily: "DM Mono, monospace", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#0d0f1a", borderRadius: 14, padding: 16, border: "1px solid #1a1c2a" }}>
              <div style={{ fontSize: 8.5, color: "#445", fontFamily: "DM Mono, monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Aktywność tygodniowa</div>
              {[["2–8 Gru",4],["9–15 Gru",4],["16–22 Gru",5],["23–29 Gru",2]].map(([week, days]) => (
                <div key={week} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #13151e" }}>
                  <div style={{ fontSize: 10.5, color: "#556", fontFamily: "DM Mono, monospace", width: 80 }}>{week}</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[...Array(7)].map((_, i) => (
                      <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: i < days ? RED : "#1a1c2a", boxShadow: i < days ? `0 0 3px ${RED}55` : "none" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "#445", fontFamily: "DM Mono, monospace", width: 20, textAlign: "right" }}>{days}×</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "#0a0c14", borderTop: "1px solid #1a1c2a", display: "flex", padding: "10px 10px 18px", justifyContent: "space-around", alignItems: "center" }}>
        {[["⚡","FEED",false,false],[" 🔍","DISCOVER",false,false],["＋","LOG",true,false],["🏆","RANKS",false,false],["👤","PROFIL",false,true]].map(([icon,label,accent,active]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }}>
            <div style={{ width: accent ? 46 : 30, height: accent ? 46 : 30, background: accent ? RED : "transparent", borderRadius: accent ? 14 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: accent ? 22 : 17, boxShadow: accent ? `0 4px 16px ${RED}55` : "none" }}>{icon}</div>
            <div style={{ fontSize: 7.5, fontFamily: "DM Mono, monospace", color: active ? RED : "#334", letterSpacing: 0.5 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
