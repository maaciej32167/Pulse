import { useState, useRef } from "react";

const menuItems = [
  {
    id: "home", label: "HOME", angle: -162, color: "#00F5FF",
    icon: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s>30?"1.8":"2"} strokeLinecap="round" strokeLinejoin="round" width={s} height={s}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    id: "workout", label: "WORKOUT", angle: -117, color: "#FF4757",
    icon: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s>30?"1.8":"2"} strokeLinecap="round" strokeLinejoin="round" width={s} height={s}>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    id: "progress", label: "STATS", angle: -90, color: "#FFD700",
    icon: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s>30?"1.8":"2"} strokeLinecap="round" strokeLinejoin="round" width={s} height={s}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    id: "social", label: "SOCIAL", angle: -63, color: "#00F5FF",
    icon: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s>30?"1.8":"2"} strokeLinecap="round" strokeLinejoin="round" width={s} height={s}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    id: "profile", label: "PROFILE", angle: -18, color: "#FF4757",
    icon: (s) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s>30?"1.8":"2"} strokeLinecap="round" strokeLinejoin="round" width={s} height={s}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const RADIUS = 110;
function toRad(deg) { return (deg * Math.PI) / 180; }

// Phases:
// IDLE → OPEN → HEARTBEAT → EXPANDING → CENTER (icon center, big) → HEADER (icon slides to top)
const P = { IDLE: 0, OPEN: 1, HEARTBEAT: 2, EXPANDING: 3, CENTER: 4, HEADER: 5 };

export default function PulseMenu() {
  const [phase, setPhase] = useState(P.IDLE);
  const [active, setActive] = useState(null);
  const [ripple, setRipple] = useState(false);
  const timers = useRef([]);

  const after = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const handleToggle = () => {
    if (phase === P.IDLE) {
      setPhase(P.OPEN);
      setRipple(true);
      after(() => setRipple(false), 600);
    } else if (phase === P.OPEN) {
      setPhase(P.IDLE);
    }
  };

  const handleItem = (item) => {
    if (phase !== P.OPEN) return;
    setActive(item);
    setPhase(P.HEARTBEAT);
    after(() => setPhase(P.EXPANDING), 700);   // start expand overlay after heartbeat
    after(() => setPhase(P.CENTER), 2500);     // overlay takes 1800ms, then icon appears
    after(() => setPhase(P.HEADER), 3400);     // pause 900ms at center, then slide to header
  };

  const handleReturn = () => {
    clearAll();
    setPhase(P.IDLE);
    setActive(null);
  };

  const sel = menuItems.find(m => m.id === active);
  const hiding = phase >= P.HEARTBEAT;
  const isScreen = phase >= P.CENTER;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0A0C; font-family: 'Barlow', sans-serif; color: #fff; min-height: 100vh; overflow: hidden; }
        :root { --cyan: #00F5FF; --coral: #FF4757; --gold: #FFD700; }

        .shell {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          position: relative; overflow: hidden; padding: 24px;
        }
        .bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .bg-glow::before {
          content:''; position: absolute; bottom: -20%; left: 50%; transform: translateX(-50%);
          width: 600px; height: 400px;
          background: radial-gradient(ellipse, rgba(0,245,255,0.07) 0%, transparent 70%);
        }
        .bg-glow::after {
          content:''; position: absolute; top: 20%; right: -10%;
          width: 300px; height: 300px;
          background: radial-gradient(ellipse, rgba(255,71,87,0.06) 0%, transparent 70%);
        }
        .grid {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        /* ── Main header (PULSE logo) ── */
        .header {
          position: relative; z-index: 2; text-align: center; margin-bottom: 60px;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .header.fade { opacity: 0; transform: translateY(-10px); pointer-events: none; }
        .logo {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 52px;
          letter-spacing: 0.15em;
          background: linear-gradient(135deg, var(--cyan) 0%, #fff 50%, var(--coral) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          line-height: 1; text-transform: uppercase;
        }
        .tagline {
          font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 0.4em;
          color: rgba(255,255,255,0.35); text-transform: uppercase; margin-top: 6px;
        }

        .hint {
          position: relative; z-index: 2; margin-bottom: 48px; height: 20px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 0.3em;
          font-weight: 600; color: rgba(255,255,255,0.2); text-transform: uppercase; text-align: center;
          transition: opacity 0.3s ease;
        }
        .hint.fade { opacity: 0; }

        /* ── Menu wheel ── */
        .menu-wrap {
          position: relative; z-index: 10; width: 300px; height: 300px;
          display: flex; align-items: center; justify-content: center;
        }
        .orbit {
          position: absolute; width: 240px; height: 240px; border-radius: 50%;
          border: 1px dashed rgba(255,255,255,0.04);
          top: 50%; left: 50%; transform: translate(-50%,-50%);
          transition: border-color 0.4s ease; pointer-events: none;
        }
        .orbit.open { border-color: rgba(0,245,255,0.08); }

        /* ── Item buttons ── */
        .item-wrap { position: absolute; top: 50%; left: 50%; }
        .item-btn {
          width: 56px; height: 56px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(15,15,20,0.85);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          cursor: pointer; position: relative; overflow: visible;
          outline: none; padding: 0; opacity: 0; transform: scale(0);
        }
        .item-btn:hover { transform: scale(1.12) !important; }
        .item-btn:active { transform: scale(0.92) !important; }
        .item-btn.active-item { border-color: var(--c); box-shadow: 0 0 20px var(--c), inset 0 0 12px rgba(0,0,0,0.6); }
        .item-icon { color: rgba(255,255,255,0.5); transition: color 0.2s ease; display: flex; align-items: center; justify-content: center; }
        .item-btn:hover .item-icon, .item-btn.active-item .item-icon { color: var(--c); }
        .item-label {
          position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%);
          font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 9px;
          letter-spacing: 0.12em; color: rgba(255,255,255,0.35); text-transform: uppercase;
          white-space: nowrap; pointer-events: none; transition: color 0.2s ease;
        }
        .item-btn:hover .item-label, .item-btn.active-item .item-label { color: var(--c); }

        /* ── Center button ── */
        .center-btn {
          width: 68px; height: 68px; border-radius: 50%; border: none;
          cursor: pointer; position: relative; z-index: 20;
          display: flex; align-items: center; justify-content: center;
          outline: none;
          background: linear-gradient(135deg, #FF4757 0%, #FF6B9D 50%, #C0392B 100%);
          box-shadow: 0 0 30px rgba(255,71,87,0.5), 0 0 60px rgba(255,71,87,0.2), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .center-btn:hover:not(:disabled) { transform: scale(1.08); }
        .center-btn:active:not(:disabled) { transform: scale(0.94); }
        .center-btn.is-open { transform: rotate(45deg) scale(1.05) !important; }
        .center-btn.is-open:hover { transform: rotate(45deg) scale(1.1) !important; }

        /* lub·DUB heartbeat */
        .center-btn.heartbeat {
          animation: lubDub 0.65s ease-in-out forwards;
          cursor: default; pointer-events: none;
        }
        @keyframes lubDub {
          0%   { transform: scale(1);    box-shadow: 0 0 30px rgba(255,71,87,0.5), 0 0 60px rgba(255,71,87,0.2); }
          12%  { transform: scale(1.20); box-shadow: 0 0 50px rgba(255,71,87,0.95), 0 0 90px rgba(255,71,87,0.5); }
          22%  { transform: scale(0.95); box-shadow: 0 0 20px rgba(255,71,87,0.3); }
          38%  { transform: scale(1.32); box-shadow: 0 0 65px rgba(255,71,87,1),    0 0 120px rgba(255,71,87,0.6); }
          52%  { transform: scale(0.97); box-shadow: 0 0 25px rgba(255,71,87,0.4); }
          68%  { transform: scale(1.08); box-shadow: 0 0 35px rgba(255,71,87,0.6); }
          100% { transform: scale(1);    box-shadow: 0 0 30px rgba(255,71,87,0.5), 0 0 60px rgba(255,71,87,0.2); }
        }

        /* Hide button during and after expand (overlay takes over) */
        .center-btn.expanding,
        .center-btn.gone {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        /* ── EXPAND OVERLAY ──
           A separate fixed div that grows from the button's center position
           to fill the entire screen. Uses width/height transition instead of
           scale() — no compositing jank, perfectly smooth.
        */
        .expand-overlay {
          position: fixed;
          /* Starts as a small circle centered on the button.
             Button is centered in viewport; we position the overlay center there. */
          border-radius: 50%;
          pointer-events: none;
          z-index: 50;
          /* GPU-accelerated properties only */
          will-change: width, height, opacity;
        }
        .expand-overlay.growing {
          animation: overlayGrow 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes overlayGrow {
          0%   {
            width: 68px; height: 68px;
            margin-left: -34px; margin-top: -34px;
            opacity: 1;
            border-radius: 50%;
          }
          20%  {
            opacity: 0.85;
            border-radius: 46%;
          }
          55%  {
            opacity: 0.45;
            border-radius: 20%;
          }
          80%  {
            opacity: 0.12;
            border-radius: 6%;
          }
          100% {
            width: 300vmax; height: 300vmax;
            margin-left: -150vmax; margin-top: -150vmax;
            opacity: 0;
            border-radius: 0%;
          }
        }

        .center-icon { color: #fff; display: flex; align-items: center; justify-content: center; transition: opacity 0.1s ease; }
        .center-btn.heartbeat .center-icon { opacity: 0; }

        /* pulse rings */
        .ring { position: absolute; border-radius: 50%; border: 1.5px solid rgba(255,71,87,0.4); animation: pulseRing 2s ease-out infinite; pointer-events: none; }
        .ring1 { inset: -8px; }
        .ring2 { inset: -18px; animation-delay: 0.7s; border-color: rgba(255,71,87,0.2); }
        @keyframes pulseRing {
          0%   { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        .ripple { position: absolute; inset: -30px; border-radius: 50%; background: radial-gradient(circle, rgba(255,71,87,0.3) 0%, transparent 70%); animation: rippleOut 0.6s ease-out forwards; pointer-events: none; }
        @keyframes rippleOut {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2);   opacity: 0; }
        }

        /* footer */
        .footer-row { position: relative; z-index: 2; margin-top: 60px; text-align: center; transition: opacity 0.3s ease; }
        .footer-row.fade { opacity: 0; pointer-events: none; }
        .instr { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 0.25em; color: rgba(255,255,255,0.18); text-transform: uppercase; }
        .stats { position: relative; z-index: 2; display: flex; gap: 32px; margin-top: 48px; transition: opacity 0.3s ease; }
        .stats.fade { opacity: 0; }
        .stat { text-align: center; }
        .stat-val { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 28px; letter-spacing: 0.04em; color: #fff; line-height: 1; }
        .stat-val em { color: var(--cyan); font-style: normal; }
        .stat-lbl { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 0.3em; color: rgba(255,255,255,0.25); text-transform: uppercase; margin-top: 4px; }
        .divider { width: 1px; background: rgba(255,255,255,0.08); align-self: stretch; }

        /* ═══════════════════════════════════════
           DESTINATION PAGE
           ═══════════════════════════════════════ */

        /* Full page that fades in once expanding is done */
        .page {
          position: fixed; inset: 0; z-index: 100;
          display: flex; flex-direction: column; align-items: stretch;
          opacity: 0; pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .page.visible { opacity: 1; pointer-events: all; }

        /*
          Page header bar — always at top.
          The icon+title block will animate INTO this zone.
        */
        .page-topbar {
          display: flex; align-items: center; gap: 16px;
          padding: 52px 28px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: relative; z-index: 2;
        }

        .page-icon-small {
          width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }

        .page-title-small {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
          font-size: 28px; letter-spacing: 0.15em; text-transform: uppercase; line-height: 1;
        }
        .page-sub-small {
          font-family: 'Barlow Condensed', sans-serif; font-size: 11px;
          letter-spacing: 0.3em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); margin-top: 2px;
        }

        /* Content area below header */
        .page-content {
          flex: 1; padding: 32px 28px;
          display: flex; flex-direction: column; gap: 20px;
          overflow-y: auto;
        }

        /* Placeholder content cards */
        .content-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 20px 22px;
          animation: cardIn 0.4s ease both;
        }
        .content-card:nth-child(1) { animation-delay: 0.1s; }
        .content-card:nth-child(2) { animation-delay: 0.22s; }
        .content-card:nth-child(3) { animation-delay: 0.34s; }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-label {
          font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 0.3em;
          text-transform: uppercase; color: rgba(255,255,255,0.25); margin-bottom: 10px;
        }
        .card-bar {
          height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06);
          overflow: hidden; margin-bottom: 8px;
        }
        .card-fill {
          height: 100%; border-radius: 3px;
          animation: fillBar 0.8s cubic-bezier(0.22,1,0.36,1) 0.3s both;
        }
        @keyframes fillBar {
          from { width: 0%; }
        }
        .card-val {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 22px; line-height: 1;
        }

        /* back button bottom */
        .back-btn {
          margin: 0 28px 36px;
          font-family: 'Barlow Condensed', sans-serif; font-size: 12px;
          font-weight: 600; letter-spacing: 0.35em; text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          padding: 14px 28px; border-radius: 100px; cursor: pointer; outline: none;
          transition: color 0.2s, border-color 0.2s, background 0.2s;
          animation: cardIn 0.4s ease 0.3s both;
        }
        .back-btn:hover { color: #fff; border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); }

        /* ─── The floating icon+title hero that appears center, then slides to topbar ─── */
        .hero-anchor {
          position: fixed; z-index: 200;
          /* Will be positioned via inline style / class transitions */
          pointer-events: none;
          display: flex; flex-direction: column; align-items: center;
          /* CENTER state: vertically + horizontally centered */
          top: 50%; left: 50%;
          transform: translate(-50%, -50%) scale(1);
          transition: none;
        }

        /* When sliding to header — we animate all properties */
        .hero-anchor.slide-to-header {
          /* target position: top-left area matching topbar */
          top: 62px;
          left: 28px;
          transform: translate(0, 0) scale(1);
          transition: top 0.85s cubic-bezier(0.65, 0, 0.35, 1),
                      left 0.85s cubic-bezier(0.65, 0, 0.35, 1),
                      transform 0.85s cubic-bezier(0.65, 0, 0.35, 1);
        }

        .hero-icon {
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          /* CENTER state: large */
          width: 96px; height: 96px;
          transition: width 0.85s cubic-bezier(0.65,0,0.35,1),
                      height 0.85s cubic-bezier(0.65,0,0.35,1),
                      box-shadow 0.85s ease;
        }
        .hero-icon.small {
          width: 44px; height: 44px;
        }

        .hero-title {
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
          text-transform: uppercase; line-height: 1; white-space: nowrap;
          /* CENTER state: large */
          font-size: 52px; letter-spacing: 0.2em; margin-top: 20px;
          transition: font-size 0.85s cubic-bezier(0.65,0,0.35,1),
                      margin-top 0.85s cubic-bezier(0.65,0,0.35,1),
                      letter-spacing 0.85s ease;
        }
        .hero-title.small {
          font-size: 28px; letter-spacing: 0.15em; margin-top: 0;
        }

        .hero-sub {
          font-family: 'Barlow Condensed', sans-serif; font-size: 13px;
          letter-spacing: 0.4em; color: rgba(255,255,255,0.35); text-transform: uppercase;
          margin-top: 8px;
          transition: opacity 0.5s ease, margin-top 0.85s ease;
        }
        .hero-sub.hidden { opacity: 0; margin-top: 0; }

        /* Appear animation for the center hero */
        .hero-appear {
          animation: heroReveal 0.8s cubic-bezier(0.34, 1.3, 0.64, 1) both;
        }
        @keyframes heroReveal {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {/* ── Destination page (background + content) ── */}
      <div
        className={`page ${isScreen ? "visible" : ""}`}
        style={sel ? { background: `radial-gradient(ellipse at 50% 0%, ${sel.color}14 0%, #0A0A0C 55%)` } : {}}
      >
        {/* Topbar placeholder — the real icon+title is the floating hero overlay */}
        <div className="page-topbar" style={{ minHeight: 110 }} />

        {/* Content */}
        {sel && phase === P.HEADER && (
          <div className="page-content">
            <div className="content-card">
              <div className="card-label">Last 7 Days</div>
              <div className="card-bar"><div className="card-fill" style={{ width: "72%", background: sel.color }} /></div>
              <div className="card-val" style={{ color: sel.color }}>72% <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>completion</span></div>
            </div>
            <div className="content-card">
              <div className="card-label">This Month</div>
              <div className="card-bar"><div className="card-fill" style={{ width: "58%", background: sel.color }} /></div>
              <div className="card-val" style={{ color: sel.color }}>14 <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>sessions</span></div>
            </div>
            <div className="content-card">
              <div className="card-label">Personal Best</div>
              <div className="card-bar"><div className="card-fill" style={{ width: "91%", background: sel.color }} /></div>
              <div className="card-val" style={{ color: sel.color }}>91% <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>score</span></div>
            </div>
          </div>
        )}

        <button className="back-btn" style={{ color: sel?.color, borderColor: `${sel?.color}44` }} onClick={handleReturn}>
          ← Back to Menu
        </button>
      </div>

      {/* ── Floating hero: icon + title, animates center → header ── */}
      {sel && phase >= P.CENTER && (
        <div
          className={`hero-anchor ${phase === P.HEADER ? "slide-to-header" : "hero-appear"}`}
          style={{ pointerEvents: "none" }}
        >
          <div
            className={`hero-icon ${phase === P.HEADER ? "small" : ""}`}
            style={{
              background: `${sel.color}18`,
              border: `1.5px solid ${sel.color}55`,
              boxShadow: phase === P.HEADER ? "none" : `0 0 50px ${sel.color}55`,
              color: sel.color,
            }}
          >
            {sel.icon(phase === P.HEADER ? 22 : 40)}
          </div>
          <div
            className={`hero-title ${phase === P.HEADER ? "small" : ""}`}
            style={{ color: sel.color }}
          >
            {sel.label}
          </div>
          <div className={`hero-sub ${phase === P.HEADER ? "hidden" : ""}`}>
            Pulse · Active View
          </div>
        </div>
      )}

      {/* ── Main app shell ── */}
      <div className="shell">
        <div className="bg-glow" />
        <div className="grid" />

        <header className={`header ${hiding ? "fade" : ""}`}>
          <div className="logo">PULSE</div>
          <div className="tagline">Train · Track · Share</div>
        </header>

        <div className={`hint ${hiding ? "fade" : ""}`}>
          {phase === P.IDLE ? "TAP TO NAVIGATE" : phase === P.OPEN ? "SELECT DESTINATION" : ""}
        </div>

        <div className="menu-wrap">
          <div className={`orbit ${phase === P.OPEN ? "open" : ""}`} />

          {menuItems.map((item, i) => {
            const rad = toRad(item.angle);
            const x = Math.cos(rad) * RADIUS;
            const y = Math.sin(rad) * RADIUS;
            const openDelay  = i * 50;
            const closeDelay = (menuItems.length - 1 - i) * 30;
            const shown  = phase === P.OPEN;
            const fading = hiding;

            return (
              <div
                key={item.id}
                className="item-wrap"
                style={{
                  transform: shown
                    ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                    : `translate(-50%, -50%)`,
                  transition: `transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${shown ? openDelay : closeDelay}ms`,
                  zIndex: 5,
                }}
              >
                <button
                  className={`item-btn ${active === item.id ? "active-item" : ""}`}
                  style={{
                    "--c": item.color,
                    opacity: shown && !fading ? 1 : 0,
                    transform: shown && !fading ? "scale(1)" : "scale(0)",
                    transition: fading
                      ? `opacity 0.18s ease ${i * 25}ms, transform 0.18s ease ${i * 25}ms`
                      : `opacity 0.3s ease ${openDelay}ms, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${openDelay}ms, box-shadow 0.2s, border-color 0.2s`,
                  }}
                  onClick={() => handleItem(item.id)}
                  aria-label={item.label}
                  disabled={fading}
                >
                  <span className="item-icon">{item.icon(22)}</span>
                  <span className="item-label">{item.label}</span>
                </button>
              </div>
            );
          })}

          {/* Expand overlay — separate element, grows from center, no scale() jank */}
          {phase >= P.EXPANDING && phase < P.CENTER && sel && (
            <div
              className="expand-overlay growing"
              style={{
                left: "50%",
                top: "50%",
                background: `linear-gradient(135deg, ${sel.color} 0%, #FF6B9D 50%, #C0392B 100%)`,
              }}
            />
          )}

          {/* Center button */}
          <button
            className={[
              "center-btn",
              phase === P.OPEN ? "is-open" : "",
              phase === P.HEARTBEAT ? "heartbeat" : "",
              phase >= P.EXPANDING ? "expanding" : "",
            ].join(" ")}
            onClick={handleToggle}
            disabled={hiding}
            aria-label={phase === P.OPEN ? "Close menu" : "Open menu"}
          >
            {phase === P.IDLE && <div className="ring ring1" />}
            {phase === P.IDLE && <div className="ring ring2" />}
            {ripple && <div className="ripple" />}
            <span className="center-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="26" height="26">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </span>
          </button>
        </div>

        <div className={`footer-row ${hiding ? "fade" : ""}`}>
          <p className="instr">{phase === P.OPEN ? "Select destination" : "Press center to expand"}</p>
        </div>

        <div className={`stats ${hiding ? "fade" : ""}`}>
          <div className="stat"><div className="stat-val">147<em>k</em></div><div className="stat-lbl">Calories</div></div>
          <div className="divider" />
          <div className="stat"><div className="stat-val">38</div><div className="stat-lbl">Workouts</div></div>
          <div className="divider" />
          <div className="stat"><div className="stat-val">12</div><div className="stat-lbl">Friends</div></div>
        </div>
      </div>
    </>
  );
}
