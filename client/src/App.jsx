import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Heart, MessageCircle, BookOpen, TrendingUp, Users, Bell, Shield,
  LogOut, Send, AlertTriangle, CheckCircle2, Clock, ChevronRight,
  ChevronLeft, Plus, User as UserIcon, ClipboardList, ScrollText, X
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

/* ---------------------------------------------------------
   DESIGN TOKENS
   A "bridge at dusk" palette — deep indigo night on one edge,
   warm sand dawn on the other, teal water underneath. The
   horizon-gradient rule is the signature element: it appears
   under every header and as the assessment progress bar,
   standing in for "crossing from where you are to support."
--------------------------------------------------------- */
const C = {
  ink: "#1B2A41",       // deep indigo — headings
  slate: "#4A5A6B",     // body text
  paper: "#F4F6F5",     // app background
  card: "#FFFFFF",
  teal: "#2F6F6B",      // primary — calm water
  tealDeep: "#1F4E4B",
  sand: "#E8A87C",      // warm accent — human warmth
  sandDeep: "#C97F4E",
  sage: "#7FA37B",      // low risk / good
  amber: "#D98E4A",     // moderate risk
  rose: "#C1666B",      // high risk (muted, not alarm-red)
  line: "#E1E7E4",
};

const HORIZON = `linear-gradient(90deg, ${C.tealDeep} 0%, ${C.teal} 45%, ${C.sand} 100%)`;

function FontLoader() {
  useEffect(() => {
    const l = document.createElement("style");
    l.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');`;
    document.head.appendChild(l);
    return () => document.head.removeChild(l);
  }, []);
  return null;
}
const display = { fontFamily: "'Fraunces', serif" };
const body = { fontFamily: "'Inter', sans-serif" };

/* ---------------------------------------------------------
   MOCK DATA
--------------------------------------------------------- */
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function genHistory(seed, weeks, trend) {
  const rand = seededRand(seed);
  const out = [];
  let base = 62 + rand() * 20;
  for (let w = 1; w <= weeks; w++) {
    base += trend + (rand() - 0.5) * 14;
    base = Math.max(4, Math.min(100, base));
    out.push({ week: `W${w}`, score: Math.round(base) });
  }
  return out;
}

function riskOf(pct) {
  if (pct < 28) return "high";
  if (pct < 50) return "moderate";
  return "low";
}

const NAMES = [
  "Jamie Cruz", "Mika Santos", "Leo Dizon", "Ana Reyes", "Paolo Reyes",
  "Cielo Ramos", "Ben Torres", "Kaye Villar", "Rico Aquino", "Nadia Flores",
  "Tomas Uy", "Sam de Leon"
];
const PROGRAMS = ["BS Computer Science", "BS Psychology", "BS Nursing", "BS Business Admin", "BS Education"];

const initialStudents = NAMES.map((name, i) => {
  const trend = i < 3 ? -3.2 : i < 6 ? -0.6 : 0.8; // first 3 trending down
  const history = genHistory(17 + i * 7, 8, trend);
  const latest = history[history.length - 1].score;
  return {
    id: `s${i + 1}`,
    name,
    program: PROGRAMS[i % PROGRAMS.length],
    yearLevel: (i % 4) + 1,
    history,
    latest,
    risk: riskOf(latest),
    journalCount: Math.floor(seededRand(i * 3 + 1)() * 6),
  };
});

const initialAlerts = initialStudents
  .filter((s) => s.risk !== "low")
  .map((s, idx) => ({
    id: `a${idx + 1}`,
    studentId: s.id,
    studentName: s.name,
    risk: s.risk,
    status: "open",
    createdAt: "This week",
    notes: [],
  }));

const RESOURCES = [
  { title: "Box breathing for exam stress", tag: "Coping skill" },
  { title: "Building a wind-down routine before sleep", tag: "Sleep" },
  { title: "How to tell a friend you're struggling", tag: "Connection" },
];

/* ---------------------------------------------------------
   ASSESSMENT INSTRUMENT (paraphrased 5-item wellbeing check,
   modeled on the WHO-5 structure — 0-5 scale, sum × 4 = %.
   NOTE for the team: get the official licensed WHO-5 item
   text and attribution before using this in production.
--------------------------------------------------------- */
const CHECKIN_ITEMS = [
  "I have felt calm and relaxed",
  "I have felt active and full of energy",
  "I have felt cheerful and in good spirits",
  "I woke up feeling fresh and rested",
  "My day has been filled with things that interest me",
];
const SCALE = [
  { v: 0, l: "At no time" },
  { v: 1, l: "Some of the time" },
  { v: 2, l: "Less than half" },
  { v: 3, l: "More than half" },
  { v: 4, l: "Most of the time" },
  { v: 5, l: "All of the time" },
];

/* ---------------------------------------------------------
   AI CHATBOT — calls YOUR backend, not the AI provider directly.
   The system prompt and crisis-keyword filter now live server-side
   in server/src/services/aiService.js, where they can't be bypassed
   by editing browser code.
--------------------------------------------------------- */
// IMPORTANT: the browser must NEVER call the AI provider directly — that
// would expose your API key to anyone who opens dev tools. Instead we call
// our own backend (server/src/services/aiService.js), which holds the key
// and applies the crisis-safety filter before anything reaches the model.
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

async function callBackendChat(sessionId, message, accessToken) {
  const res = await fetch(`${API_BASE}/api/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Chat request failed (${res.status})`);
  }
  return res.json(); // { sessionId, reply, flagged, createdAt }
}

/* ---------------------------------------------------------
   SMALL UI PRIMITIVES
--------------------------------------------------------- */
function Horizon({ className = "h-1" }) {
  return <div className={`w-full rounded-full ${className}`} style={{ background: HORIZON }} />;
}

function RiskPill({ risk }) {
  const map = {
    low: { bg: "#EAF3E9", fg: C.sage, label: "Low risk" },
    moderate: { bg: "#FBF0E3", fg: C.amber, label: "Moderate" },
    high: { bg: "#F7E9EA", fg: C.rose, label: "Needs attention" },
  };
  const m = map[risk];
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: m.bg, color: m.fg }}>
      {m.label}
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl shadow-sm p-5 ${className}`} style={{ background: C.card, border: `1px solid ${C.line}` }}>
      {children}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
      style={{
        background: active ? C.tealDeep : "transparent",
        color: active ? "#fff" : C.slate,
      }}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function Shell({ title, subtitle, roleLabel, roleIcon: RoleIcon, nav, onExit, children }) {
  return (
    <div className="min-h-screen flex" style={{ background: C.paper, ...body }}>
      <FontLoader />
      <aside className="w-64 shrink-0 p-5 flex flex-col gap-6" style={{ background: C.card, borderRight: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2 px-1">
          <Heart size={22} color={C.teal} />
          <span className="text-lg font-semibold" style={{ ...display, color: C.ink }}>MindBridge</span>
        </div>
        <div className="flex items-center gap-2 px-1 text-xs" style={{ color: C.slate }}>
          <RoleIcon size={14} /> {roleLabel}
        </div>
        <nav className="flex flex-col gap-1">{nav}</nav>
        <div className="mt-auto">
          <button onClick={onExit} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ color: C.slate }}>
            <LogOut size={16} /> Switch role
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="px-8 pt-8 pb-4">
          <h1 className="text-2xl" style={{ ...display, color: C.ink }}>{title}</h1>
          {subtitle && <p className="text-sm mt-1" style={{ color: C.slate }}>{subtitle}</p>}
          <div className="mt-4"><Horizon /></div>
        </header>
        <div className="px-8 pb-10">{children}</div>
      </main>
    </div>
  );
}

/* ---------------------------------------------------------
   LANDING
--------------------------------------------------------- */
function Landing({ onEnter }) {
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({ email: "", password: "", schoolId: "", program: "BS Computer Science", yearLevel: 1 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitAuth() {
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, role: "student", schoolId: form.schoolId, program: form.program, yearLevel: Number(form.yearLevel) };

      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      onEnter("student", { accessToken: data.accessToken, user: data.user });
    } catch (e) {
      setError(e.message + " — make sure your backend (npm run dev in /server) is running on " + API_BASE);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.ink, ...body }}>
      <FontLoader />
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Heart size={26} color={C.sand} />
            <span className="text-sm tracking-widest uppercase" style={{ color: C.sand, letterSpacing: "0.2em" }}>MindBridge</span>
          </div>
          <h1 className="text-5xl leading-tight mb-4" style={{ ...display, color: "#fff", fontWeight: 500 }}>
            A steady hand<br />between check-ins.
          </h1>
          <p className="text-base mb-10" style={{ color: "#B9C4CE" }}>
            Weekly wellness check-ins, private journaling, and after-hours support —
            with a clear line to your Guidance Office when it matters most.
          </p>
          <div className="mb-10"><Horizon className="h-[3px] max-w-xs mx-auto" /></div>

          {!showAuth ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setShowAuth(true)}
                className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
                style={{ background: "#22354D", border: "1px solid #34495F" }}
              >
                <UserIcon size={20} color={C.sand} />
                <div className="mt-3 font-medium" style={{ color: "#fff" }}>I'm a Student</div>
                <div className="text-xs mt-1" style={{ color: "#93A2AF" }}>Log in — connects to your real backend</div>
              </button>
              <button
                onClick={() => onEnter("counselor")}
                className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
                style={{ background: "#22354D", border: "1px solid #34495F" }}
              >
                <Shield size={20} color={C.sand} />
                <div className="mt-3 font-medium" style={{ color: "#fff" }}>I'm a Counselor</div>
                <div className="text-xs mt-1" style={{ color: "#93A2AF" }}>Demo mode — mock data, not yet wired</div>
              </button>
              <button
                onClick={() => onEnter("admin")}
                className="rounded-2xl p-5 text-left transition-transform hover:-translate-y-0.5"
                style={{ background: "#22354D", border: "1px solid #34495F" }}
              >
                <Users size={20} color={C.sand} />
                <div className="mt-3 font-medium" style={{ color: "#fff" }}>I'm an Admin</div>
                <div className="text-xs mt-1" style={{ color: "#93A2AF" }}>Demo mode — mock data, not yet wired</div>
              </button>
            </div>
          ) : (
            <div className="max-w-sm mx-auto rounded-2xl p-6 text-left" style={{ background: "#22354D", border: "1px solid #34495F" }}>
              <div className="flex gap-2 mb-4">
                <button onClick={() => setMode("login")} className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: mode === "login" ? C.sand : "transparent", color: mode === "login" ? C.ink : "#93A2AF" }}>Log in</button>
                <button onClick={() => setMode("register")} className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: mode === "register" ? C.sand : "transparent", color: mode === "register" ? C.ink : "#93A2AF" }}>Register</button>
              </div>
              <div className="flex flex-col gap-2.5">
                <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "#1B2A41", color: "#fff", border: "1px solid #34495F" }} />
                <input placeholder="Password (min 8 characters)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "#1B2A41", color: "#fff", border: "1px solid #34495F" }} />
                {mode === "register" && (
                  <>
                    <input placeholder="School ID" value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
                      className="rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "#1B2A41", color: "#fff", border: "1px solid #34495F" }} />
                    <input placeholder="Program (e.g. BS Computer Science)" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}
                      className="rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "#1B2A41", color: "#fff", border: "1px solid #34495F" }} />
                    <input placeholder="Year level (1-6)" type="number" value={form.yearLevel} onChange={(e) => setForm({ ...form, yearLevel: e.target.value })}
                      className="rounded-lg px-3 py-2 text-sm outline-none" style={{ background: "#1B2A41", color: "#fff", border: "1px solid #34495F" }} />
                  </>
                )}
              </div>
              {error && <p className="text-xs mt-3" style={{ color: C.rose || "#E08D93" }}>{error}</p>}
              <button onClick={submitAuth} disabled={loading || !form.email || !form.password}
                className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: C.teal, color: "#fff" }}>
                {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
              </button>
              <button onClick={() => setShowAuth(false)} className="w-full mt-2 text-xs" style={{ color: "#93A2AF" }}>← Back</button>
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-xs pb-6" style={{ color: "#6B7C8C" }}>
        Student login connects to your real backend at {API_BASE} · Counselor/Admin are still demo mode
      </p>
    </div>
  );
}

/* ---------------------------------------------------------
   STUDENT PORTAL
--------------------------------------------------------- */
function StudentPortal({ onExit, accessToken, user }) {
  const [tab, setTab] = useState("checkin");
  const [history, setHistory] = useState(() => genHistory(101, 6, 0.4));
  const [answers, setAnswers] = useState(Array(CHECKIN_ITEMS.length).fill(null));
  const [submitted, setSubmitted] = useState(null);
  const [journal, setJournal] = useState([
    { id: 1, mood: "🙂 Okay", text: "Midterms are close but I'm managing. Slept better this week.", date: "3 days ago" },
  ]);
  const [journalDraft, setJournalDraft] = useState("");
  const [mood, setMood] = useState("🙂 Okay");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi, I'm the MindBridge Companion. I'm here to listen — how are you doing today?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  const nav = (
    <>
      <NavItem icon={ClipboardList} label="Weekly Check-in" active={tab === "checkin"} onClick={() => setTab("checkin")} />
      <NavItem icon={TrendingUp} label="My Trends" active={tab === "trends"} onClick={() => setTab("trends")} />
      <NavItem icon={BookOpen} label="Journal" active={tab === "journal"} onClick={() => setTab("journal")} />
      <NavItem icon={MessageCircle} label="Chat Support" active={tab === "chat"} onClick={() => setTab("chat")} />
    </>
  );

  function submitCheckin() {
    const sum = answers.reduce((a, b) => a + (b ?? 0), 0);
    const pct = sum * 4;
    const risk = riskOf(pct);
    setSubmitted({ pct, risk });
    setHistory((h) => [...h, { week: `W${h.length + 1}`, score: pct }]);
  }

  async function sendChat() {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      // Talks to YOUR backend (server/src/controllers/chat.controller.js),
      // which applies the crisis filter and calls the AI provider for you.
      const { sessionId: newSessionId, reply, flagged } = await callBackendChat(sessionId, userMsg, accessToken);
      setSessionId(newSessionId);
      setMessages((m) => [...m, { role: "assistant", content: reply, crisis: flagged }]);
    } catch (e) {
      setMessages((m) => [...m, {
        role: "assistant",
        content: accessToken
          ? "I'm having trouble connecting to the server right now. Please try again in a moment."
          : "You're not logged in yet, so this can't reach the real backend. Log in on the landing page first — see the note below.",
      }]);
    }
    setChatLoading(false);
  }

  return (
    <Shell title="Weekly Check-in" subtitle={user?.email || "Not connected to backend"} roleLabel="Student" roleIcon={UserIcon} nav={nav} onExit={onExit}>
      {tab === "checkin" && (
        <Card className="max-w-xl">
          {!submitted ? (
            <div className="flex flex-col gap-6">
              {CHECKIN_ITEMS.map((item, i) => (
                <div key={i}>
                  <p className="text-sm font-medium mb-2" style={{ color: C.ink }}>{item}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {SCALE.map((s) => (
                      <button
                        key={s.v}
                        onClick={() => setAnswers((a) => a.map((x, idx) => (idx === i ? s.v : x)))}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border"
                        style={{
                          borderColor: answers[i] === s.v ? C.teal : C.line,
                          background: answers[i] === s.v ? C.teal : "transparent",
                          color: answers[i] === s.v ? "#fff" : C.slate,
                        }}
                      >
                        {s.l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                disabled={answers.some((a) => a === null)}
                onClick={submitCheckin}
                className="mt-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: C.teal, color: "#fff" }}
              >
                Submit check-in
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 size={32} color={C.sage} className="mx-auto mb-3" />
              <p className="text-lg font-medium" style={{ ...display, color: C.ink }}>Check-in received</p>
              <p className="text-sm mt-2" style={{ color: C.slate }}>
                Your wellbeing score this week: <strong>{submitted.pct}%</strong>
              </p>
              <div className="mt-2"><RiskPill risk={submitted.risk} /></div>
              <p className="text-xs mt-4 max-w-sm mx-auto" style={{ color: C.slate }}>
                {submitted.risk !== "low"
                  ? "It looks like this has been a harder week. Your Guidance Counselor may reach out — that's a good thing, not a punishment."
                  : "Thanks for checking in. See you next week."}
              </p>
            </div>
          )}
        </Card>
      )}

      {tab === "trends" && (
        <Card>
          <p className="text-sm font-medium mb-4" style={{ color: C.ink }}>Your wellbeing score over time</p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke={C.line} vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: C.slate }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: C.slate }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke={C.teal} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium mb-3" style={{ color: C.ink }}>A few things that might help</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {RESOURCES.map((r) => (
                <div key={r.title} className="p-3 rounded-xl" style={{ background: C.paper }}>
                  <p className="text-xs font-semibold" style={{ color: C.tealDeep }}>{r.tag}</p>
                  <p className="text-sm mt-1" style={{ color: C.ink }}>{r.title}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {tab === "journal" && (
        <Card className="max-w-xl">
          <p className="text-sm font-medium mb-3" style={{ color: C.ink }}>New entry — private, only you can read this</p>
          <div className="flex gap-2 mb-3">
            {["🙂 Okay", "😀 Good", "😔 Low", "😣 Stressed", "😴 Tired"].map((m) => (
              <button key={m} onClick={() => setMood(m)} className="px-2.5 py-1 rounded-full text-xs border"
                style={{ borderColor: mood === m ? C.sand : C.line, background: mood === m ? "#FBF0E3" : "transparent" }}>
                {m}
              </button>
            ))}
          </div>
          <textarea
            value={journalDraft}
            onChange={(e) => setJournalDraft(e.target.value)}
            placeholder="What's on your mind this week?"
            className="w-full rounded-xl p-3 text-sm outline-none resize-none"
            style={{ border: `1px solid ${C.line}`, minHeight: 100 }}
          />
          <button
            disabled={!journalDraft.trim()}
            onClick={() => {
              setJournal((j) => [{ id: Date.now(), mood, text: journalDraft, date: "Just now" }, ...j]);
              setJournalDraft("");
            }}
            className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ background: C.sandDeep, color: "#fff" }}
          >
            Save entry
          </button>
          <div className="mt-6 flex flex-col gap-3">
            {journal.map((e) => (
              <div key={e.id} className="p-3 rounded-xl" style={{ background: C.paper }}>
                <div className="flex justify-between text-xs mb-1" style={{ color: C.slate }}>
                  <span>{e.mood}</span><span>{e.date}</span>
                </div>
                <p className="text-sm" style={{ color: C.ink }}>{e.text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "chat" && (
        <Card className="max-w-xl flex flex-col" style={{ height: 520 }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            {messages.map((m, i) => (
              <div key={i} className="max-w-[85%] text-sm rounded-2xl px-3.5 py-2.5"
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? C.teal : m.crisis ? "#F7E9EA" : C.paper,
                  color: m.role === "user" ? "#fff" : C.ink,
                }}>
                {m.content}
              </div>
            ))}
            {chatLoading && <div className="text-xs" style={{ color: C.slate }}>Companion is typing…</div>}
          </div>
          <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type a message…"
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: `1px solid ${C.line}` }}
            />
            <button onClick={sendChat} className="px-3 rounded-xl" style={{ background: C.teal, color: "#fff" }}>
              <Send size={16} />
            </button>
          </div>
          <p className="text-[11px] mt-2" style={{ color: C.slate }}>
            Support, not therapy. Messages suggesting crisis are routed to safety resources automatically.
          </p>
        </Card>
      )}
    </Shell>
  );
}

/* ---------------------------------------------------------
   COUNSELOR PORTAL
--------------------------------------------------------- */
function CounselorPortal({ onExit }) {
  const [tab, setTab] = useState("dashboard");
  const [students] = useState(initialStudents);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [openStudent, setOpenStudent] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [auditLog, setAuditLog] = useState([]);

  const nav = (
    <>
      <NavItem icon={TrendingUp} label="Dashboard" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
      <NavItem icon={Bell} label={`Alerts (${alerts.filter(a=>a.status==="open").length})`} active={tab === "alerts"} onClick={() => setTab("alerts")} />
    </>
  );

  const avgTrend = useMemo(() => {
    const weeks = 8;
    return Array.from({ length: weeks }, (_, w) => {
      const vals = students.map((s) => s.history[w]?.score).filter(Boolean);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { week: `W${w + 1}`, avg: Math.round(avg) };
    });
  }, [students]);

  const distribution = useMemo(() => {
    const counts = { low: 0, moderate: 0, high: 0 };
    students.forEach((s) => counts[s.risk]++);
    return [
      { name: "Low", value: counts.low, color: C.sage },
      { name: "Moderate", value: counts.moderate, color: C.amber },
      { name: "High", value: counts.high, color: C.rose },
    ];
  }, [students]);

  function openProfile(student) {
    setOpenStudent(student);
    setAuditLog((l) => [{ id: Date.now(), text: `Viewed ${student.name}'s profile`, time: "Just now" }, ...l]);
  }

  function resolveAlert(id) {
    setAlerts((a) => a.map((al) => (al.id === id ? { ...al, status: "resolved", notes: [...al.notes, noteDraft].filter(Boolean) } : al)));
    setNoteDraft("");
  }

  return (
    <Shell title="Counselor Dashboard" subtitle={`${students.length} students · ${alerts.filter(a=>a.status==="open").length} open alerts`} roleLabel="Guidance Counselor" roleIcon={Shield} nav={nav} onExit={onExit}>
      {tab === "dashboard" && (
        <div className="grid gap-5">
          <div className="grid sm:grid-cols-3 gap-5">
            <Card><p className="text-xs" style={{ color: C.slate }}>Total students</p><p className="text-3xl mt-1" style={{ ...display, color: C.ink }}>{students.length}</p></Card>
            <Card><p className="text-xs" style={{ color: C.slate }}>Open alerts</p><p className="text-3xl mt-1" style={{ ...display, color: C.rose }}>{alerts.filter(a=>a.status==="open").length}</p></Card>
            <Card><p className="text-xs" style={{ color: C.slate }}>Avg. wellbeing this week</p><p className="text-3xl mt-1" style={{ ...display, color: C.teal }}>{avgTrend[avgTrend.length-1]?.avg}%</p></Card>
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2">
              <p className="text-sm font-medium mb-4" style={{ color: C.ink }}>Cohort average wellbeing trend</p>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={avgTrend}>
                    <CartesianGrid stroke={C.line} vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: C.slate }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: C.slate }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avg" stroke={C.teal} strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <p className="text-sm font-medium mb-4" style={{ color: C.ink }}>Risk distribution</p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                      {distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                {distribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs" style={{ color: C.slate }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name} — {d.value}
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card>
            <p className="text-sm font-medium mb-4" style={{ color: C.ink }}>All students</p>
            <div className="flex flex-col divide-y" style={{ borderColor: C.line }}>
              {students.map((s) => (
                <button key={s.id} onClick={() => openProfile(s)} className="flex items-center justify-between py-3 text-left" style={{ borderColor: C.line }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.ink }}>{s.name}</p>
                    <p className="text-xs" style={{ color: C.slate }}>{s.program} · Year {s.yearLevel}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <RiskPill risk={s.risk} />
                    <ChevronRight size={16} color={C.slate} />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "alerts" && (
        <div className="grid gap-3 max-w-2xl">
          {alerts.filter(a=>a.status==="open").length === 0 && (
            <Card><p className="text-sm" style={{ color: C.slate }}>No open alerts. 🎉</p></Card>
          )}
          {alerts.map((a) => a.status === "open" && (
            <Card key={a.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} color={a.risk === "high" ? C.rose : C.amber} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.ink }}>{a.studentName}</p>
                    <p className="text-xs" style={{ color: C.slate }}>{a.createdAt}</p>
                  </div>
                </div>
                <RiskPill risk={a.risk} />
              </div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Intervention note (e.g. reached out, scheduled a session)…"
                className="w-full rounded-xl p-2.5 text-sm mt-3 outline-none resize-none"
                style={{ border: `1px solid ${C.line}`, minHeight: 60 }}
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => resolveAlert(a.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.teal, color: "#fff" }}>
                  Log note & resolve
                </button>
                <button onClick={() => openProfile(students.find(s => s.id === a.studentId))} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ border: `1px solid ${C.line}`, color: C.slate }}>
                  View profile
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {openStudent && (
        <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: "rgba(27,42,65,0.4)" }} onClick={() => setOpenStudent(null)}>
          <div className="rounded-2xl p-6 max-w-lg w-full" style={{ background: C.card }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg" style={{ ...display, color: C.ink }}>{openStudent.name}</p>
                <p className="text-xs" style={{ color: C.slate }}>{openStudent.program} · Year {openStudent.yearLevel} · {openStudent.journalCount} journal entries</p>
              </div>
              <button onClick={() => setOpenStudent(null)}><X size={18} color={C.slate} /></button>
            </div>
            <div className="mt-4" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={openStudent.history}>
                  <CartesianGrid stroke={C.line} vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.slate }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke={C.teal} strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3"><RiskPill risk={openStudent.risk} /></div>
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ---------------------------------------------------------
   ADMIN PORTAL
--------------------------------------------------------- */
function AdminPortal({ onExit }) {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([
    { id: 1, name: "Jamie Cruz", role: "student", email: "jamie.cruz@school.edu" },
    { id: 2, name: "Dr. Elena Vega", role: "counselor", email: "e.vega@school.edu" },
    { id: 3, name: "System Admin", role: "admin", email: "admin@school.edu" },
  ]);
  const [auditLog] = useState([
    { id: 1, text: "Counselor Dr. Elena Vega viewed Leo Dizon's profile", time: "2 hours ago" },
    { id: 2, text: "Admin updated assessment template to v3", time: "Yesterday" },
    { id: 3, text: "Counselor Dr. Elena Vega resolved an alert for Ana Reyes", time: "2 days ago" },
  ]);
  const [newUser, setNewUser] = useState({ name: "", role: "student", email: "" });

  const nav = (
    <>
      <NavItem icon={Users} label="Users" active={tab === "users"} onClick={() => setTab("users")} />
      <NavItem icon={ScrollText} label="Audit Log" active={tab === "audit"} onClick={() => setTab("audit")} />
    </>
  );

  return (
    <Shell title="System Administration" subtitle={`${users.length} accounts`} roleLabel="Administrator" roleIcon={Users} nav={nav} onExit={onExit}>
      {tab === "users" && (
        <div className="grid gap-5 max-w-2xl">
          <Card>
            <p className="text-sm font-medium mb-3" style={{ color: C.ink }}>Add a user</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <input placeholder="Full name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${C.line}` }} />
              <input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${C.line}` }} />
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="rounded-lg px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${C.line}` }}>
                <option value="student">Student</option>
                <option value="counselor">Counselor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              disabled={!newUser.name || !newUser.email}
              onClick={() => { setUsers((u) => [...u, { ...newUser, id: Date.now() }]); setNewUser({ name: "", role: "student", email: "" }); }}
              className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
              style={{ background: C.teal, color: "#fff" }}
            >
              <Plus size={15} /> Add user
            </button>
          </Card>
          <Card>
            <div className="flex flex-col divide-y" style={{ borderColor: C.line }}>
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.ink }}>{u.name}</p>
                    <p className="text-xs" style={{ color: C.slate }}>{u.email}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full capitalize" style={{ background: C.paper, color: C.slate }}>{u.role}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      {tab === "audit" && (
        <Card className="max-w-2xl">
          <div className="flex flex-col gap-3">
            {auditLog.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <Clock size={14} color={C.slate} className="mt-0.5" />
                <div>
                  <p style={{ color: C.ink }}>{a.text}</p>
                  <p className="text-xs" style={{ color: C.slate }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Shell>
  );
}

/* ---------------------------------------------------------
   ROOT
--------------------------------------------------------- */
export default function MindBridge() {
  const [role, setRole] = useState("landing");
  const [session, setSession] = useState(null); // { accessToken, user }

  function enter(nextRole, sessionData) {
    if (sessionData) setSession(sessionData);
    setRole(nextRole);
  }
  function exit() {
    setSession(null);
    setRole("landing");
  }

  if (role === "landing") return <Landing onEnter={enter} />;
  if (role === "student") return <StudentPortal onExit={exit} accessToken={session?.accessToken} user={session?.user} />;
  if (role === "counselor") return <CounselorPortal onExit={exit} />;
  return <AdminPortal onExit={exit} />;
}
