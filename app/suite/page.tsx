"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "../../components/Nav";
import { ThemeToggle } from "../../components/ThemeToggle";
import { Icon } from "../../components/Icon";
import { loadProfile, saveProfile, type Profile } from "../../lib/profile";
import { cloudEnabled, supabase, fetchProfile, upsertProfile } from "../../lib/cloud";
import { Auth } from "../../components/Auth";
import { Onboarding } from "../../components/suite/Onboarding";
import { Brief } from "../../components/suite/Brief";
import { RiskTab } from "../../components/suite/RiskTab";
import { InsightsTab } from "../../components/suite/InsightsTab";
import { NewsTab } from "../../components/suite/NewsTab";
import { CoachTab } from "../../components/suite/CoachTab";
import { JournalTab } from "../../components/suite/JournalTab";
import { ChallengeTab } from "../../components/suite/ChallengeTab";
import { SimulatorTab } from "../../components/suite/SimulatorTab";
import { TodayTab } from "../../components/suite/TodayTab";
import { PlanTab } from "../../components/suite/PlanTab";
import { ToolsTab } from "../../components/suite/ToolsTab";
import { ChartsTab } from "../../components/suite/ChartsTab";
import { MarketsTab } from "../../components/suite/MarketsTab";
import { LiveFlowTab } from "../../components/suite/LiveFlowTab";
import { ConnectTab } from "../../components/suite/ConnectTab";
import { PreMortemTab } from "../../components/suite/PreMortemTab";
import { GateTab } from "../../components/suite/GateTab";
import { GuardTab } from "../../components/suite/GuardTab";
import { MobileNav } from "../../components/suite/MobileNav";
import { MirrorTab } from "../../components/suite/MirrorTab";
import { EdgeTab } from "../../components/suite/EdgeTab";
import { ProLock } from "../../components/suite/ProLock";
import { FundedScoreTab } from "../../components/suite/FundedScoreTab";
import { ExecutionTab } from "../../components/suite/ExecutionTab";
import { SizingTab } from "../../components/suite/SizingTab";
import { PortfolioTab } from "../../components/suite/PortfolioTab";
import { PayoutTab } from "../../components/suite/PayoutTab";
import { SettingsTab } from "../../components/suite/SettingsTab";
import { AlertsBar } from "../../components/suite/AlertsBar";
import { CommandPalette, type Command } from "../../components/suite/CommandPalette";
import { LiveTicker } from "../../components/suite/LiveTicker";
import { SessionClock } from "../../components/suite/SessionClock";
import { demoProfile } from "../../lib/profile";

const TABS = [
  ["brief", "Daily Brief", "gauge"],
  ["today", "Today · Live", "bolt"],
  ["guard", "Live Guard", "shield"],
  ["connect", "Broker Link", "repeat"],
  ["markets", "Markets", "grid"],
  ["flow", "Order Flow", "bolt"],
  ["charts", "Charts", "chart"],
  ["risk", "Risk", "shield"],
  ["premortem", "Pre-Mortem", "alert"],
  ["gate", "Pre-Trade Gate", "check"],
  ["fundedscore", "FundedScore", "gauge"],
  ["mirror", "The Mirror", "repeat"],
  ["edge", "Your Edge", "up"],
  ["insights", "Insights", "spark"],
  ["execution", "Execution", "target"],
  ["sizing", "Optimal Sizing", "calc"],
  ["portfolio", "Multi-Account", "grid"],
  ["payout", "Payout Planner", "check"],
  ["news", "News", "news"],
  ["coach", "AI Coach", "brain"],
  ["journal", "Journal & Score", "book"],
  ["challenge", "Challenge", "target"],
  ["simulator", "Firm Simulator", "repeat"],
  ["plan", "Plan & Ritual", "check"],
  ["tools", "Calculators", "calc"],
  ["settings", "Settings", "settings"],
] as const;
const PRO_TABS = new Set(["mirror", "edge"]);

const GROUPS: { label: string; ids: string[] }[] = [
  { label: "Daily", ids: ["brief", "today", "guard", "connect"] },
  { label: "Markets", ids: ["markets", "flow", "charts", "news"] },
  { label: "Risk & Edge", ids: ["risk", "premortem", "gate", "fundedscore", "insights", "execution", "sizing", "portfolio", "journal", "score"] },
  { label: "FundedCore Pro", ids: ["mirror", "edge"] },
  { label: "Pass & Plan", ids: ["challenge", "simulator", "payout", "plan", "tools"] },
  { label: "AI", ids: ["coach"] },
];
const TAB_MAP = Object.fromEntries(TABS.map((t) => [t[0], { label: t[1], icon: t[2] }]));

export default function Suite() {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [tab, setTab] = useState<string>("brief");
  const [session, setSession] = useState<any>(null);
  const [authReady, setAuthReady] = useState<boolean>(!cloudEnabled);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (!cloudEnabled || !supabase) { setProfileState(loadProfile()); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  // cloud: load this user's profile ONCE when they sign in.
  // (Supabase fires a new session object on token refresh / tab focus; without
  // this guard each one reloads the cloud profile and clobbers in-session edits.)
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!cloudEnabled) return;
    const uid = session?.user?.id || null;
    if (!uid) { setProfileState(null); loadedFor.current = null; return; }
    if (loadedFor.current === uid) return; // already loaded for this user — don't overwrite their changes
    loadedFor.current = uid;
    fetchProfile(uid).then((cloudP) => {
      const localP = loadProfile();
      let p = cloudP || localP;
      // if local has more trades than cloud, the cloud copy is stale — keep the user's real upload
      if (cloudP && localP && (localP.trades?.length || 0) > (cloudP.trades?.length || 0)) p = localP;
      setProfileState(p);
      if (p && cloudEnabled) upsertProfile(uid, p); // re-sync the winning copy back to cloud
    });
  }, [session]);

  function setProfile(p: Profile) {
    setProfileState(p); saveProfile(p);
    if (cloudEnabled && session?.user) upsertProfile(session.user.id, p);
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); }

  if (cloudEnabled && !authReady) {
    return <div className="min-h-screen flex items-center justify-center text-t3">Loading…</div>;
  }
  if (cloudEnabled && !session) {
    return <Auth />;
  }
  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center text-t3">Loading your suite…</div>;
  }
  if (!profile.onboarded) {
    return <Onboarding onDone={(p) => { setProfile({ ...p, onboarded: true }); setTab("brief"); }} initial={profile} />;
  }

  const commands: Command[] = [
    ...TABS.map((t) => ({ id: "go-" + t[0], label: "Go to " + t[1], section: "Navigate", icon: t[2], run: () => setTab(t[0]) })),
    { id: "demo", label: "Load demo data", section: "Action", icon: "bolt", run: () => setProfile(demoProfile(profile)) },
    { id: "theme", label: "Toggle light / dark mode", section: "Action", icon: "spark", run: () => { const r = document.documentElement; const n = r.getAttribute("data-theme") === "dark" ? "light" : "dark"; r.setAttribute("data-theme", n); try { localStorage.setItem("fc-theme", n); } catch {} } },
    { id: "exit", label: "Exit to homepage", section: "Action", icon: "arrow", run: () => { window.location.href = "/"; } },
  ];

  const title = (TAB_MAP[tab] && TAB_MAP[tab].label) || "FundedCore";

  return (
    <div className="appframe">
      <CommandPalette commands={commands} />
      <MobileNav tab={tab} setTab={setTab} tabMap={TAB_MAP} groups={GROUPS} onExit={() => { window.location.href = "/"; }} onSignOut={signOut} canSignOut={!!(cloudEnabled && session)} userName={profile.name} pro={profile.pro} />
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="px-1.5 mb-3 hidden md:block"><Link href="/"><Logo size={22} /></Link></div>
        <div className="flex-1 overflow-y-auto md:space-y-1 flex md:block gap-1">
          {GROUPS.map((g) => (
            <div key={g.label} className="md:mb-2">
              <div className="side-sec hidden md:block">{g.label}</div>
              {g.ids.filter((id) => TAB_MAP[id]).map((id) => (
                <button key={id} onClick={() => setTab(id)} className={`side-link ${tab === id ? "on" : ""}`}>
                  <Icon name={TAB_MAP[id].icon} size={16} className="opacity-90" />
                  <span className="hidden md:inline">{TAB_MAP[id].label}</span>
                  {PRO_TABS.has(id) && !profile.pro && <Icon name="lock" size={12} className="ml-auto opacity-70 hidden md:inline" />}
                </button>
              ))}
            </div>
          ))}
        </div>
        <button onClick={() => setTab("settings")} className="side-link mt-2 hidden md:flex">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[.7rem] font-semibold shrink-0" style={{ background: "var(--acc-weak)", color: "var(--acc)", border: "1px solid var(--line2)" }}>{profile.name.charAt(0).toUpperCase()}</span>
          <span className="truncate">{profile.name} · Pro</span>
        </button>
      </aside>

      {/* MAIN */}
      <div className="min-w-0">
        <header className="topbar">
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline-flex md:hidden shrink-0"><Logo size={20} /></span>
            <h2 className="display text-[1.02rem] text-t1 truncate">{title}</h2>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden md:flex items-center"><SessionClock /></span>
            <button onClick={() => { const e = new KeyboardEvent("keydown", { key: "k", metaKey: true }); window.dispatchEvent(e); }} className="hidden md:inline-flex items-center gap-1.5 chip hover:text-t1 transition" title="Command palette"><Icon name="spark" size={13} /> <span className="cmdk-kbd">⌘K</span></button>
            <ThemeToggle />
            {cloudEnabled && session && <button onClick={signOut} className="text-t3 hover:text-t1 transition text-sm hidden sm:block">Sign out</button>}
            <Link href="/" className="text-t3 hover:text-t1 transition text-sm hidden sm:block">Exit</Link>
          </div>
        </header>

        <LiveTicker />

        <main className="content">
          {profile.demo && (
            <div className="card p-3 mb-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: "color-mix(in srgb, var(--amb) 45%, var(--line2))", background: "color-mix(in srgb, var(--amb) 7%, transparent)" }}>
              <span className="text-[.84rem] text-t1"><b style={{ color: "var(--amb)" }}>You're viewing demo data.</b> These are sample trades and accounts — not yours. Upload your own to make the whole app yours.</span>
              <button onClick={() => setTab("journal")} className="btn btn-primary !py-1.5 !px-3.5 text-[.78rem] shrink-0">Upload my trades →</button>
            </div>
          )}
          <AlertsBar profile={profile} />
          <div key={tab} className="fade">
          {tab === "brief" && <Brief profile={profile} go={setTab} setProfile={setProfile} />}
          {tab === "risk" && <RiskTab profile={profile} setProfile={setProfile} />}
          {tab === "premortem" && <PreMortemTab profile={profile} setProfile={setProfile} go={setTab} />}
          {tab === "gate" && <GateTab profile={profile} />}
          {tab === "guard" && <GuardTab profile={profile} setProfile={setProfile} />}
          {tab === "fundedscore" && <FundedScoreTab profile={profile} />}
          {tab === "mirror" && (profile.pro ? <MirrorTab profile={profile} /> : <ProLock profile={profile} setProfile={setProfile} go={setTab} />)}
          {tab === "edge" && (profile.pro ? <EdgeTab profile={profile} /> : <ProLock profile={profile} setProfile={setProfile} go={setTab} />)}
          {tab === "insights" && <InsightsTab profile={profile} />}
          {tab === "execution" && <ExecutionTab profile={profile} setProfile={setProfile} go={setTab} />}
          {tab === "sizing" && <SizingTab profile={profile} />}
          {tab === "portfolio" && <PortfolioTab profile={profile} />}
          {tab === "payout" && <PayoutTab profile={profile} />}
          {tab === "news" && <NewsTab />}
          {tab === "coach" && <CoachTab profile={profile} />}
          {tab === "journal" && <JournalTab profile={profile} setProfile={setProfile} />}
          {tab === "challenge" && <ChallengeTab profile={profile} />}
          {tab === "simulator" && <SimulatorTab profile={profile} />}
          {tab === "today" && <TodayTab profile={profile} setProfile={setProfile} />}
          {tab === "connect" && <ConnectTab profile={profile} />}
          {tab === "plan" && <PlanTab profile={profile} setProfile={setProfile} />}
          {tab === "tools" && <ToolsTab profile={profile} />}
          {tab === "charts" && <ChartsTab profile={profile} />}
          {tab === "markets" && <MarketsTab />}
          {tab === "flow" && <LiveFlowTab />}
          {tab === "settings" && <SettingsTab profile={profile} setProfile={setProfile} />}
          </div>
        </main>
      </div>
    </div>
  );
}
