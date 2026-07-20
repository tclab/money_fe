import { useEffect, useRef } from "react";
import { useI18n } from "../../i18n/index.jsx";

// Landing page shown to logged-out visitors. Ported from design/landing.html
// and wired to the app's i18n context (shared language + theme).

const CSS = `
.fintra-landing{
  --bg:#f7f7f5; --panel:#ffffff; --card:#ffffff; --card2:#f4f4f5;
  --line:rgba(9,9,11,.10); --line2:rgba(9,9,11,.06);
  --t0:#18181b; --t1:#52525b; --t2:#71717a; --t3:#a1a1aa;
  --em:#059669; --em2:#10b981; --emInk:#ffffff;
  --rose:#e11d48; --amber:#b45309; --violet:#7c3aed;
  --glow:radial-gradient(60% 60% at 50% 0%, rgba(16,185,129,.12), transparent 70%);
  --shadow:0 24px 60px -28px rgba(9,9,11,.18);
  background:var(--bg); color:var(--t0);
  font-family:'Atlassian Sans',ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Ubuntu,"Helvetica Neue",sans-serif;
  -webkit-font-smoothing:antialiased; line-height:1.5;
  min-height:100vh; overflow-x:hidden;
  transition:background .35s ease, color .35s ease;
}
html.dark .fintra-landing{
  --bg:#09090b; --panel:#111113; --card:#161618; --card2:#1c1c1f;
  --line:rgba(255,255,255,.08); --line2:rgba(255,255,255,.05);
  --t0:#fafafa; --t1:#a1a1aa; --t2:#71717a; --t3:#52525b;
  --em:#34d399; --em2:#10b981; --emInk:#04150d;
  --rose:#fb7185; --amber:#fbbf24; --violet:#a78bfa;
  --glow:radial-gradient(60% 60% at 50% 0%, rgba(16,185,129,.14), transparent 70%);
  --shadow:0 24px 60px -20px rgba(0,0,0,.6);
}

.fintra-landing *{ box-sizing:border-box; margin:0; padding:0; }
.fintra-landing .mono{ font-family:'DM Mono',ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace; }
.fintra-landing .num{ font-family:'DM Mono',ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace; font-variant-numeric:tabular-nums; }
.fintra-landing .lab{ font-family:'DM Mono',ui-monospace,"SF Mono",Menlo,Consolas,monospace; letter-spacing:.16em; text-transform:uppercase; }
.fintra-landing a{ color:inherit; text-decoration:none; }
.fintra-landing .wrap{ width:100%; max-width:1160px; margin:0 auto; padding:0 22px; }

.fintra-landing .btn{ display:inline-flex; align-items:center; gap:8px; height:42px; padding:0 18px;
  border-radius:11px; font-size:14px; font-weight:600; cursor:pointer; border:1px solid transparent;
  transition:transform .12s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease;
  white-space:nowrap; font-family:inherit; }
.fintra-landing .btn:active{ transform:translateY(1px); }
.fintra-landing .btn-primary{ background:var(--em2); color:var(--emInk); box-shadow:0 8px 24px -10px var(--em2); }
.fintra-landing .btn-primary:hover{ background:var(--em); box-shadow:0 12px 30px -8px var(--em2); }
.fintra-landing .btn-ghost{ background:transparent; color:var(--t0); border-color:var(--line); }
.fintra-landing .btn-ghost:hover{ background:var(--card2); border-color:var(--t3); }
.fintra-landing .btn-sm{ height:36px; padding:0 14px; font-size:13px; border-radius:9px; }

.fintra-landing header.nav{ position:sticky; top:0; z-index:60; border-bottom:1px solid var(--line);
  background:color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter:blur(12px); }
.fintra-landing .nav-inner{ height:64px; display:flex; align-items:center; justify-content:space-between; gap:18px; }
.fintra-landing .brand{ display:flex; align-items:center; gap:10px; font-weight:800; letter-spacing:.02em; font-size:17px; cursor:pointer; }
.fintra-landing .brand .mark{ display:grid; place-items:center; width:30px; height:30px; border-radius:9px; background:var(--em2); }
.fintra-landing .nav-links{ display:flex; align-items:center; gap:26px; font-size:14px; color:var(--t1); }
.fintra-landing .nav-links a{ transition:color .18s ease; }
.fintra-landing .nav-links a:hover{ color:var(--t0); }
.fintra-landing .nav-right{ display:flex; align-items:center; gap:10px; }

.fintra-landing .langpill{ display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:999px;
  padding:3px; gap:2px; background:var(--card); }
.fintra-landing .langpill button{ border:0; background:transparent; color:var(--t2); font-size:11px; font-weight:700;
  letter-spacing:.06em; padding:4px 9px; border-radius:999px; cursor:pointer; font-family:'DM Mono',ui-monospace,Menlo,monospace; }
.fintra-landing .langpill button.on{ background:var(--em2); color:var(--emInk); }

.fintra-landing .icobtn{ display:grid; place-items:center; width:38px; height:38px; border-radius:10px;
  border:1px solid var(--line); background:var(--card); color:var(--t1); cursor:pointer; transition:.18s; }
.fintra-landing .icobtn:hover{ color:var(--t0); border-color:var(--t3); }

.fintra-landing .menutoggle{ display:none; }

.fintra-landing section{ position:relative; }
.fintra-landing .eyebrow{ font-size:11px; font-weight:700; color:var(--em); letter-spacing:.16em; text-transform:uppercase;
  font-family:'DM Mono',ui-monospace,Menlo,monospace; }
.fintra-landing h1,.fintra-landing h2,.fintra-landing h3{ letter-spacing:-.02em; line-height:1.08; }
.fintra-landing .lead{ color:var(--t1); font-size:17px; line-height:1.6; }

.fintra-landing .hero{ padding:78px 0 40px; }
.fintra-landing .hero::before{ content:""; position:absolute; inset:-120px 0 auto 0; height:520px; background:var(--glow); pointer-events:none; }
.fintra-landing .hero-grid{ display:grid; grid-template-columns:1fr 1fr; gap:54px; align-items:center; }
.fintra-landing .hero-grid>*{ min-width:0; }
.fintra-landing .hero h1{ font-size:56px; font-weight:800; margin:16px 0 20px; }
.fintra-landing .hero h1 .accent{ color:var(--em); }
.fintra-landing .hero-cta{ display:flex; gap:12px; margin-top:30px; flex-wrap:wrap; }
.fintra-landing .trust{ display:flex; gap:22px; margin-top:28px; color:var(--t2); font-size:12.5px; flex-wrap:wrap; }
.fintra-landing .trust span{ display:inline-flex; align-items:center; gap:7px; }
.fintra-landing .dot{ width:6px; height:6px; border-radius:999px; background:var(--em); }

.fintra-landing .mock{ background:var(--card); border:1px solid var(--line); border-radius:18px; padding:18px;
  box-shadow:var(--shadow); position:relative; }
.fintra-landing .mock .bar-top{ display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.fintra-landing .mock .dots{ display:flex; gap:6px; }
.fintra-landing .mock .dots i{ width:9px; height:9px; border-radius:999px; background:var(--line); display:block; }
.fintra-landing .mock .mtag{ font-size:10px; color:var(--t2); }
.fintra-landing .mock-row{ display:grid; grid-template-columns:1.35fr 1fr; gap:12px; }
.fintra-landing .mcard{ background:var(--card2); border:1px solid var(--line2); border-radius:13px; padding:15px; min-width:0; }
.fintra-landing .big{ overflow-wrap:anywhere; }
.fintra-landing .mcard .l{ font-size:9.5px; color:var(--t2); letter-spacing:.14em; text-transform:uppercase; font-family:'DM Mono',ui-monospace,Menlo,monospace; }
.fintra-landing .big{ font-size:30px; font-weight:700; margin-top:6px; letter-spacing:-.01em; }
.fintra-landing .usd{ font-size:11px; color:var(--t2); margin-top:3px; }
.fintra-landing .delta{ display:inline-flex; align-items:center; gap:5px; font-size:11px; color:var(--em);
  background:color-mix(in srgb, var(--em) 15%, transparent); padding:2px 8px; border-radius:999px; margin-top:9px; }
.fintra-landing .ring-wrap{ display:flex; align-items:center; gap:14px; }
.fintra-landing .ring{ transform:rotate(-90deg); border:none; outline:none; box-shadow:none; }
.fintra-landing .ring .track{ stroke:var(--line); }
.fintra-landing .ring .val{ stroke:var(--em); stroke-linecap:round; transition:stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1); }
.fintra-landing .bars{ margin-top:14px; }
.fintra-landing .bars .l{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.fintra-landing .legend{ display:flex; gap:12px; font-size:10px; color:var(--t2); }
.fintra-landing .legend i{ width:8px; height:8px; border-radius:2px; display:inline-block; margin-right:4px; vertical-align:middle; }
.fintra-landing .barchart{ display:flex; align-items:flex-end; gap:12px; height:96px; }
.fintra-landing .barcol{ flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; }
.fintra-landing .barpair{ display:flex; align-items:flex-end; gap:4px; height:80px; width:100%; justify-content:center; }
.fintra-landing .barpair b{ width:14px; border-radius:4px 4px 0 0; display:block; transition:height 1s cubic-bezier(.22,1,.36,1); }
.fintra-landing .barpair .in{ background:var(--em); }
.fintra-landing .barpair .out{ background:color-mix(in srgb, var(--rose) 62%, transparent); }
.fintra-landing .barcol span{ font-size:9.5px; color:var(--t2); font-family:'DM Mono',ui-monospace,Menlo,monospace; }
.fintra-landing .float-chip{ position:absolute; background:var(--panel); border:1px solid var(--line); border-radius:11px;
  padding:9px 12px; box-shadow:var(--shadow); font-size:11px; display:flex; align-items:center; gap:9px; }
.fintra-landing .float-1{ top:-16px; right:-14px; }
.fintra-landing .float-2{ bottom:-16px; left:-14px; }
.fintra-landing .pill-ok{ width:26px; height:26px; border-radius:8px; display:grid; place-items:center;
  background:color-mix(in srgb, var(--em) 16%, transparent); color:var(--em); }
.fintra-landing .pill-due{ width:26px; height:26px; border-radius:8px; display:grid; place-items:center;
  background:color-mix(in srgb, var(--rose) 16%, transparent); color:var(--rose); }

.fintra-landing .problem{ padding:56px 0; }
.fintra-landing .problem-card{ background:var(--card); border:1px solid var(--line); border-radius:18px; padding:40px;
  display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:center; }
.fintra-landing .scatter{ display:flex; flex-wrap:wrap; gap:10px; }
.fintra-landing .scatter .s{ border:1px dashed var(--line); border-radius:11px; padding:10px 13px; font-size:12px; color:var(--t2);
  display:flex; align-items:center; gap:8px; background:var(--card2); }
.fintra-landing .arrow-em{ color:var(--em); }

.fintra-landing .modules{ padding:64px 0; }
.fintra-landing .sec-head{ text-align:center; max-width:640px; margin:0 auto 44px; }
.fintra-landing .sec-head h2{ font-size:38px; font-weight:800; margin:14px 0 14px; }
.fintra-landing .mod-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.fintra-landing .mod{ background:var(--card); border:1px solid var(--line); border-radius:16px; padding:24px;
  transition:transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
.fintra-landing .mod:hover{ transform:translateY(-4px); border-color:color-mix(in srgb, var(--em) 40%, var(--line));
  box-shadow:var(--shadow); }
.fintra-landing .mod .ico{ width:46px; height:46px; border-radius:12px; display:grid; place-items:center; margin-bottom:16px;
  background:color-mix(in srgb, var(--em) 13%, transparent); color:var(--em); }
.fintra-landing .mod h3{ font-size:18px; font-weight:700; margin-bottom:8px; }
.fintra-landing .mod p{ color:var(--t1); font-size:14px; line-height:1.55; }
.fintra-landing .mod .kbadge{ font-size:10px; color:var(--t2); letter-spacing:.1em; text-transform:uppercase;
  font-family:'DM Mono',ui-monospace,Menlo,monospace; margin-top:14px; display:inline-block; }

.fintra-landing .how{ padding:64px 0; }
.fintra-landing .steps{ display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:8px; }
.fintra-landing .step{ background:var(--card); border:1px solid var(--line); border-radius:16px; padding:26px; position:relative; }
.fintra-landing .step .n{ font-size:13px; font-weight:800; color:var(--emInk); background:var(--em2); width:30px; height:30px;
  border-radius:9px; display:grid; place-items:center; font-family:'DM Mono',ui-monospace,Menlo,monospace; margin-bottom:16px; }
.fintra-landing .step h3{ font-size:17px; font-weight:700; margin-bottom:8px; }
.fintra-landing .step p{ color:var(--t1); font-size:14px; line-height:1.55; }

.fintra-landing .highlights{ padding:22px 0 64px; }
.fintra-landing .hband{ background:var(--card); border:1px solid var(--line); border-radius:18px; overflow:hidden;
  display:grid; grid-template-columns:repeat(4,1fr); }
.fintra-landing .hitem{ padding:30px 24px; border-right:1px solid var(--line); }
.fintra-landing .hitem:last-child{ border-right:0; }
.fintra-landing .hitem .ico{ width:38px; height:38px; border-radius:10px; display:grid; place-items:center; margin-bottom:14px;
  background:color-mix(in srgb, var(--em) 12%, transparent); color:var(--em); }
.fintra-landing .hitem h3{ font-size:15px; font-weight:700; margin-bottom:6px; }
.fintra-landing .hitem p{ color:var(--t2); font-size:13px; line-height:1.5; }

.fintra-landing .cta{ padding:20px 0 80px; }
.fintra-landing .cta-card{ position:relative; overflow:hidden; text-align:center; padding:72px 30px;
  background:var(--card); border:1px solid var(--line); border-radius:22px; }
.fintra-landing .cta-card::before{ content:""; position:absolute; inset:0; background:var(--glow); pointer-events:none; }
.fintra-landing .cta-card h2{ font-size:48px; font-weight:800; margin-bottom:16px; position:relative; }
.fintra-landing .cta-card p{ color:var(--t1); font-size:17px; margin-bottom:30px; position:relative; }
.fintra-landing .cta-card .hero-cta{ justify-content:center; position:relative; }

.fintra-landing footer{ border-top:1px solid var(--line); padding:46px 0 40px; }
.fintra-landing .foot{ display:grid; grid-template-columns:1.4fr 1fr 1fr auto; gap:30px; align-items:start; }
.fintra-landing .foot .brand{ margin-bottom:14px; }
.fintra-landing .foot p.desc{ color:var(--t2); font-size:13px; max-width:280px; line-height:1.6; }
.fintra-landing .foot h4{ font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--t2);
  font-family:'DM Mono',ui-monospace,Menlo,monospace; margin-bottom:14px; }
.fintra-landing .foot ul{ list-style:none; display:flex; flex-direction:column; gap:9px; }
.fintra-landing .foot ul a{ color:var(--t1); font-size:13.5px; }
.fintra-landing .foot ul a:hover{ color:var(--t0); }
.fintra-landing .foot-bottom{ margin-top:38px; padding-top:22px; border-top:1px solid var(--line);
  display:flex; align-items:center; justify-content:space-between; gap:16px; color:var(--t2); font-size:12px; flex-wrap:wrap; }

.fintra-landing .reveal{ opacity:0; transform:translateY(22px); transition:opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1); }
.fintra-landing .reveal.in{ opacity:1; transform:none; }
@media (prefers-reduced-motion:reduce){ .fintra-landing .reveal{ opacity:1; transform:none; transition:none; } }

@media (max-width:900px){
  .fintra-landing .hero-grid,.fintra-landing .problem-card{ grid-template-columns:1fr; gap:34px; }
  .fintra-landing .mod-grid,.fintra-landing .steps{ grid-template-columns:1fr 1fr; }
  .fintra-landing .hband{ grid-template-columns:1fr 1fr; }
  .fintra-landing .hitem:nth-child(2){ border-right:0; }
  .fintra-landing .hitem:nth-child(1),.fintra-landing .hitem:nth-child(2){ border-bottom:1px solid var(--line); }
  .fintra-landing .hero h1{ font-size:44px; }
  .fintra-landing .foot{ grid-template-columns:1fr 1fr; }
}
@media (max-width:640px){
  .fintra-landing .nav-links,.fintra-landing .nav-right .desk{ display:none; }
  .fintra-landing .menutoggle{ display:grid; }
  .fintra-landing .hero{ padding:52px 0 30px; }
  .fintra-landing .hero h1{ font-size:36px; }
  .fintra-landing .mod-grid,.fintra-landing .steps,.fintra-landing .hband,.fintra-landing .foot{ grid-template-columns:1fr; }
  .fintra-landing .hitem{ border-right:0; border-bottom:1px solid var(--line); }
  .fintra-landing .hitem:last-child{ border-bottom:0; }
  .fintra-landing .cta-card h2{ font-size:34px; }
  .fintra-landing .sec-head h2{ font-size:30px; }
  .fintra-landing .problem-card,.fintra-landing .cta-card{ padding:30px 22px; }
  .fintra-landing .float-1,.fintra-landing .float-2{ display:none; }
  .fintra-landing .mock-row{ grid-template-columns:1fr; }
  .fintra-landing .big{ font-size:26px; }
}
`;

const BrandMark = () => (
  <span className="mark" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="9" width="2.6" height="5" rx="1" fill="var(--emInk)" />
      <rect x="6.7" y="5" width="2.6" height="9" rx="1" fill="var(--emInk)" />
      <rect x="11.4" y="2.5" width="2.6" height="11.5" rx="1" fill="var(--emInk)" />
    </svg>
  </span>
);

export default function Landing({ onGetStarted }) {
  const { lang, setLang, theme, setTheme } = useI18n();
  const rootRef = useRef(null);
  const L = (en, es) => (lang === "es" ? es : en);

  // Reveal on scroll.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Dashboard mockup entrance animation.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const mock = root.querySelector("#mock");
    if (!mock) return;
    const pct = 32,
      circ = 188.5,
      filledOffset = circ - (circ * pct) / 100;
    const ringEl = root.querySelector("#ring");
    const ep = root.querySelector("#ringPct");
    ringEl.style.strokeDashoffset = circ;
    ep.textContent = "0%";
    root.querySelectorAll("#barchart b").forEach((b) => (b.style.height = "0px"));
    let mockDone = false;
    const mio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !mockDone) {
            mockDone = true;
            setTimeout(() => {
              ringEl.style.strokeDashoffset = filledOffset.toFixed(1);
              let start = null;
              const stepFn = (ts) => {
                if (!start) start = ts;
                const p = Math.min((ts - start) / 1200, 1);
                ep.textContent = Math.round(p * pct) + "%";
                if (p < 1) requestAnimationFrame(stepFn);
              };
              requestAnimationFrame(stepFn);
            }, 200);
            root.querySelectorAll("#barchart b").forEach((b, i) => {
              setTimeout(() => {
                b.style.height = b.getAttribute("data-h") + "px";
              }, 260 + i * 55);
            });
          }
        });
      },
      { threshold: 0.4 }
    );
    mio.observe(mock);
    return () => mio.disconnect();
  }, []);

  const LangPill = () => (
    <div className="langpill" role="group" aria-label="Language">
      <button className={lang === "es" ? "on" : undefined} onClick={() => setLang("es")}>ES</button>
      <button className={lang === "en" ? "on" : undefined} onClick={() => setLang("en")}>EN</button>
    </div>
  );

  return (
    <div className="fintra-landing" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAV */}
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="brand"><BrandMark /> FINTRA</a>

          <nav className="nav-links">
            <a href="#features">{L("Features", "Características")}</a>
            <a href="#modules">{L("Modules", "Módulos")}</a>
            <a href="#how">{L("How it works", "Cómo funciona")}</a>
          </nav>

          <div className="nav-right">
            <LangPill />
            <button className="icobtn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {theme === "dark" ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              )}
            </button>
            <button className="btn btn-ghost btn-sm desk" onClick={onGetStarted}>{L("Sign in", "Entrar")}</button>
            <button className="btn btn-primary btn-sm" onClick={onGetStarted}>{L("Get started", "Empieza")}</button>
            <button className="icobtn menutoggle" onClick={onGetStarted} aria-label="Menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="reveal">
              <span className="eyebrow">{L("Your money, one monthly view", "Tu dinero, una vista mensual")}</span>
              <h1>
                {L("Take control of", "Toma el control")}
                <br />
                <span className="accent">{L("your month's money.", "del dinero de tu mes.")}</span>
              </h1>
              <p className="lead">
                {L(
                  "Track expenses, income, debts, and shared costs in one place. FINTRA replaces the messy spreadsheet with six connected modules that give you the full picture, every month.",
                  "Controla gastos, ingresos, deudas y costos compartidos en un solo lugar. FINTRA reemplaza la hoja de cálculo desordenada con seis módulos conectados que te dan el panorama completo, cada mes."
                )}
              </p>
              <div className="hero-cta">
                <button className="btn btn-primary" onClick={onGetStarted}>{L("Start free", "Empieza gratis")}</button>
                <a className="btn btn-ghost" href="#how">{L("See how it works", "Cómo funciona")}</a>
              </div>
              <div className="trust">
                <span><i className="dot" /><span>{L("No card required", "Sin tarjeta")}</span></span>
                <span><i className="dot" /><span>{L("COP & USD", "COP y USD")}</span></span>
                <span><i className="dot" /><span>{L("Your data stays private", "Tus datos son privados")}</span></span>
              </div>
            </div>

            {/* DASHBOARD MOCKUP */}
            <div className="reveal" style={{ transitionDelay: ".12s" }}>
              <div className="mock" id="mock">
                <div className="bar-top">
                  <div className="dots"><i /><i /><i /></div>
                  <div className="mtag lab">{L("April 2026 · Synced", "Abril 2026 · Sincronizado")}</div>
                </div>

                <div className="mock-row">
                  <div className="mcard">
                    <div className="l">{L("Net balance", "Balance neto")}</div>
                    <div className="big num">$4,820,000</div>
                    <div className="usd num">≈ US$1,205.00</div>
                    <div className="delta num"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>+12.4%</div>
                  </div>
                  <div className="mcard">
                    <div className="l">{L("Savings rate", "Tasa de ahorro")}</div>
                    <div className="ring-wrap" style={{ marginTop: "10px" }}>
                      <svg width="74" height="74" viewBox="0 0 74 74" className="ring">
                        <circle className="track" cx="37" cy="37" r="30" fill="none" strokeWidth="9" />
                        <circle className="val" id="ring" cx="37" cy="37" r="30" fill="none" strokeWidth="9" strokeDasharray="188.5" strokeDashoffset="128.2" />
                      </svg>
                      <div>
                        <div className="big num" style={{ fontSize: "26px" }} id="ringPct">32%</div>
                        <div className="usd num">{L("of income saved", "del ingreso ahorrado")}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mcard bars" style={{ marginTop: "12px" }}>
                  <div className="l">
                    <span className="lab" style={{ fontSize: "9.5px" }}>{L("Income vs. Expenses", "Ingresos vs. Gastos")}</span>
                    <span className="legend">
                      <span><i style={{ background: "var(--em)" }} /><span>{L("In", "Entra")}</span></span>
                      <span><i style={{ background: "color-mix(in srgb,var(--rose) 62%,transparent)" }} /><span>{L("Out", "Sale")}</span></span>
                    </span>
                  </div>
                  <div className="barchart" id="barchart">
                    <div className="barcol"><div className="barpair"><b className="in" data-h="52" style={{ height: "52px" }} /><b className="out" data-h="40" style={{ height: "40px" }} /></div><span>JAN</span></div>
                    <div className="barcol"><div className="barpair"><b className="in" data-h="60" style={{ height: "60px" }} /><b className="out" data-h="46" style={{ height: "46px" }} /></div><span>FEB</span></div>
                    <div className="barcol"><div className="barpair"><b className="in" data-h="48" style={{ height: "48px" }} /><b className="out" data-h="58" style={{ height: "58px" }} /></div><span>MAR</span></div>
                    <div className="barcol"><div className="barpair"><b className="in" data-h="72" style={{ height: "72px" }} /><b className="out" data-h="50" style={{ height: "50px" }} /></div><span>APR</span></div>
                  </div>
                </div>

                <div className="float-chip float-1">
                  <span className="pill-ok"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                  <div><div className="num" style={{ fontWeight: 600 }}>{L("Rent paid", "Arriendo pago")}</div><div className="num" style={{ color: "var(--t2)", fontSize: "10px" }}>$1,750,000</div></div>
                </div>
                <div className="float-chip float-2">
                  <span className="pill-due"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg></span>
                  <div><div className="num" style={{ fontWeight: 600 }}>{L("Card due", "Tarjeta pendiente")}</div><div className="num" style={{ color: "var(--t2)", fontSize: "10px" }}>$620,000</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="problem" id="features">
          <div className="wrap">
            <div className="problem-card reveal">
              <div>
                <span className="eyebrow">{L("The problem", "El problema")}</span>
                <h2 style={{ fontSize: "32px", fontWeight: 800, margin: "14px 0 14px" }}>{L("Your money is scattered.", "Tu dinero está disperso.")}</h2>
                <p className="lead">
                  {L(
                    "Balances live in bank apps, budgets in spreadsheets, debts on sticky notes, and shared costs in a chat. There's no single view of the month, so you're always guessing where you stand.",
                    "Los saldos viven en apps del banco, los presupuestos en hojas de cálculo, las deudas en notas y los gastos compartidos en un chat. No hay una vista única del mes, siempre estás adivinando cómo vas."
                  )}
                </p>
              </div>
              <div className="scatter">
                <div className="s"><span className="arrow-em">✕</span> <span>{L("Bank app", "App del banco")}</span></div>
                <div className="s"><span className="arrow-em">✕</span> <span>{L("Spreadsheet", "Hoja de cálculo")}</span></div>
                <div className="s"><span className="arrow-em">✕</span> <span>{L("Sticky notes", "Notas")}</span></div>
                <div className="s"><span className="arrow-em">✕</span> <span>{L("Group chat", "Chat grupal")}</span></div>
                <div className="s"><span className="arrow-em">✕</span> <span>{L("Second bank app", "Otra app del banco")}</span></div>
                <div className="s"><span className="arrow-em">✕</span> <span>{L("Loan reminders", "Recordatorios de préstamo")}</span></div>
                <div className="s" style={{ borderStyle: "solid", borderColor: "var(--em)", color: "var(--em)" }}><span>→</span> <span>{L("One monthly view", "Una vista mensual")}</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* MODULES */}
        <section className="modules" id="modules">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">{L("Six connected modules", "Seis módulos conectados")}</span>
              <h2>{L("Everything your month needs.", "Todo lo que tu mes necesita.")}</h2>
              <p className="lead">
                {L(
                  "Each module does one job well, and they all share the same money. Change a number in one place and the whole picture updates.",
                  "Cada módulo hace bien una cosa, y todos comparten el mismo dinero. Cambia un número en un lugar y todo el panorama se actualiza."
                )}
              </p>
            </div>

            <div className="mod-grid">
              <div className="mod reveal">
                <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg></div>
                <h3>Dashboard</h3>
                <p>{L("Cash-flow overview: savings rate, net balance, and exactly where money came from and where it went.", "Vista de flujo: tasa de ahorro, balance neto y exactamente de dónde vino y a dónde fue el dinero.")}</p>
                <span className="kbadge">{L("Cash flow", "Flujo")}</span>
              </div>

              <div className="mod reveal" style={{ transitionDelay: ".05s" }}>
                <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg></div>
                <h3>{L("Expenses", "Gastos")}</h3>
                <p>{L("Monthly expenses by category with a clear paid / unpaid status and drag-to-reorder rows.", "Gastos mensuales por categoría con estado claro de pago y filas que arrastras para reordenar.")}</p>
                <span className="kbadge">{L("Paid / Unpaid", "Pago / Pendiente")}</span>
              </div>

              <div className="mod reveal" style={{ transitionDelay: ".1s" }}>
                <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 7 13.5 15.5 8.5 10.5 2 17" /><path d="M16 7h6v6" /></svg></div>
                <h3>{L("Income", "Ingresos")}</h3>
                <p>{L("Track every income source and see received versus still-pending at a glance.", "Registra cada fuente de ingreso y ve recibido versus pendiente de un vistazo.")}</p>
                <span className="kbadge">{L("Received / Pending", "Recibido / Pendiente")}</span>
              </div>

              <div className="mod reveal">
                <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" /><path d="M8 7h8M8 11h8M8 15h5" /></svg></div>
                <h3>{L("Transactions", "Transacciones")}</h3>
                <p>{L("Log daily spend with categories and payment methods, and watch your per-day average update live.", "Registra el gasto diario con categorías y métodos de pago, y ve tu promedio diario actualizarse en vivo.")}</p>
                <span className="kbadge">{L("Daily log", "Registro diario")}</span>
              </div>

              <div className="mod reveal" style={{ transitionDelay: ".05s" }}>
                <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
                <h3>Splitter</h3>
                <p>{L("Split shared income and expenses across people by share, who owes what, settled automatically.", "Divide ingresos y gastos compartidos entre personas por porción, quién debe qué, resuelto automáticamente.")}</p>
                <span className="kbadge">{L("By share", "Por porción")}</span>
              </div>

              <div className="mod reveal" style={{ transitionDelay: ".1s" }}>
                <div className="ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg></div>
                <h3>DebtKiller</h3>
                <p>{L("Track debts and loans, log payments, and project the exact month you'll be debt-free.", "Registra deudas y préstamos, anota pagos y proyecta el mes exacto en que estarás libre de deudas.")}</p>
                <span className="kbadge">{L("Payoff date", "Fecha de pago")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW */}
        <section className="how" id="how">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">{L("How it works", "Cómo funciona")}</span>
              <h2>{L("Live cash flow in three steps.", "Flujo en vivo en tres pasos.")}</h2>
            </div>
            <div className="steps">
              <div className="step reveal">
                <div className="n">1</div>
                <h3>{L("Sign up", "Regístrate")}</h3>
                <p>{L("Create an account in seconds, no card, no bank connection required. Pick COP, USD, or both.", "Crea una cuenta en segundos, sin tarjeta ni conexión bancaria. Elige COP, USD o ambos.")}</p>
              </div>
              <div className="step reveal" style={{ transitionDelay: ".06s" }}>
                <div className="n">2</div>
                <h3>{L("Add your month", "Agrega tu mes")}</h3>
                <p>{L("Enter this month's income and expenses by category. Mark what's paid, split what's shared, log your debts.", "Ingresa los ingresos y gastos del mes por categoría. Marca lo pagado, divide lo compartido, registra tus deudas.")}</p>
              </div>
              <div className="step reveal" style={{ transitionDelay: ".12s" }}>
                <div className="n">3</div>
                <h3>{L("Watch it update", "Míralo actualizarse")}</h3>
                <p>{L("Your cash flow, savings rate, and debt-free date recalculate live as you go. No formulas to maintain.", "Tu flujo, tasa de ahorro y fecha libre de deudas se recalculan en vivo. Sin fórmulas que mantener.")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* HIGHLIGHTS */}
        <section className="highlights">
          <div className="wrap">
            <div className="hband reveal">
              <div className="hitem">
                <div className="ico"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg></div>
                <h3>{L("Bilingual", "Bilingüe")}</h3>
                <p>{L("Full Spanish and English, switch anytime from the top bar.", "Español e inglés completos, cambia cuando quieras desde la barra.")}</p>
              </div>
              <div className="hitem">
                <div className="ico"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg></div>
                <h3>{L("Light & dark", "Claro y oscuro")}</h3>
                <p>{L("A calm dark default and a crisp light theme. Your eyes choose.", "Oscuro tranquilo por defecto y claro nítido. Tus ojos eligen.")}</p>
              </div>
              <div className="hitem">
                <div className="ico"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></svg></div>
                <h3>{L("Works on mobile", "Funciona en móvil")}</h3>
                <p>{L("Log a transaction from your phone the moment you spend.", "Registra un movimiento desde tu teléfono al instante de gastar.")}</p>
              </div>
              <div className="hitem">
                <div className="ico"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
                <h3>{L("Private by default", "Privado por defecto")}</h3>
                <p>{L("Your data stays yours. No selling, no ads, no bank scraping.", "Tus datos son tuyos. Sin ventas, sin anuncios, sin rastreo bancario.")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta" id="get-started">
          <div className="wrap">
            <div className="cta-card reveal">
              <h2>{L("Own your month.", "Adueñate de tu mes.")}</h2>
              <p>{L("Start free today. Your first monthly picture takes about five minutes to build.", "Empieza gratis hoy. Tu primer panorama mensual toma unos cinco minutos.")}</p>
              <div className="hero-cta">
                <button className="btn btn-primary" onClick={onGetStarted}>{L("Start free", "Empieza gratis")}</button>
                <a className="btn btn-ghost" href="#modules">{L("Explore modules", "Ver módulos")}</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot">
            <div>
              <a className="brand"><BrandMark /> FINTRA</a>
              <p className="desc" style={{ marginTop: "14px" }}>{L("A calm, monthly-focused money manager for individuals. Free while in beta.", "Un gestor de dinero tranquilo y mensual para personas. Gratis en beta.")}</p>
            </div>
            <div>
              <h4>{L("Modules", "Módulos")}</h4>
              <ul>
                <li><a href="#modules">Dashboard</a></li>
                <li><a href="#modules">{L("Expenses", "Gastos")}</a></li>
                <li><a href="#modules">{L("Income", "Ingresos")}</a></li>
                <li><a href="#modules">{L("Transactions", "Transacciones")}</a></li>
                <li><a href="#modules">Splitter</a></li>
                <li><a href="#modules">DebtKiller</a></li>
              </ul>
            </div>
            <div>
              <h4>{L("Product", "Producto")}</h4>
              <ul>
                <li><a href="#features">{L("Features", "Características")}</a></li>
                <li><a href="#how">{L("How it works", "Cómo funciona")}</a></li>
                <li><a onClick={onGetStarted} style={{ cursor: "pointer" }}>{L("Sign in", "Entrar")}</a></li>
              </ul>
            </div>
            <div>
              <h4>{L("Language", "Idioma")}</h4>
              <LangPill />
            </div>
          </div>
          <div className="foot-bottom">
            <span className="num">© 2026 FINTRA</span>
            <span>{L("Built for people, not portfolios.", "Hecho para personas, no para portafolios.")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
