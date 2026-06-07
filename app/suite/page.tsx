"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "../../components/Nav";
import { Icon } from "../../components/Icon";
import { loadProfile, saveProfile, type Profile } from "../../lib/profile";
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
import { SettingsTab } from "../../components/suite/SettingsTab";
import { AlertsBar } from "../../components/suite/AlertsBar";

const TABS = [
  ["brief", "Daily Brief", "gauge"],
  ["today", "Today · Live", "bolt"],
  ["markets", "Markets", "grid"],
  ["charts", "Charts", "chart"],
  ["risk", "Risk", "shield"],
  ["insights", "Insights", "spark"],
  ["news", "News", "news"],
  ["coach", "AI Coach", "brain"],
  ["journal", "Journal & Score", "book"],
  ["challenge", "Challenge", "target"],
  ["simulator", "Firm Simulator", "repeat"],
  ["plan", "Plan & Ritual", "check"],
  ["tools", "Calculators", "calc"],
  ["settings", "Settings", "settings"],
] as const;

export default function Suite() {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [tab, setTab] = useState<string>("brief");

  useEffect(() => {
    setProfileState(loadProfile());
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  function setProfile(p: Profile) { setProfileState(p); saveProfile(p); }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center text-t3">Loading your suite…</div>;
  }
  if (!profile.onboarded) {
    return <Onboarding onDone={(p) => { setProfile({ ...p, onboarded: true }); setTab("brief"); }} initial={profile} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/70 border-b border-white/[.06]">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/"><Logo size={24} /></Link>
          <div className="text-sm text-t2 hidden sm:block">Hi, <span className="text-t1 font-medium">{profile.name}</span> · {profile.accounts.length} account{profile.accounts.length !== 1 ? "s" : ""} · {profile.trades.length} trades</div>
          <span className="chip" style={{ borderColor: "#34D39955", color: "#34D399" }}><span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: "#34D399" }} /> live · all systems</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 flex-1 grid md:grid-cols-[200px_1fr] gap-5 py-5">
        <nav className="md:sticky md:top-20 md:self-start">
          <div className="navrail flex md:flex-col gap-1 overflow-x-auto">
            {TABS.map(([id, label, icon]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`navitem whitespace-nowrap ${tab === id ? "active" : ""}`}>
                <Icon name={icon} size={17} className="opacity-90" />
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2.5 mt-3 px-3 py-2.5 navrail">
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg,#5B8CFF,#8B5CF6)", boxShadow: "0 0 18px -4px rgba(91,140,255,.7)" }}>
              {profile.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="text-[.8rem] font-medium truncate">{profile.name}</div>
              <div className="text-[.65rem] text-t3">Pro · $5/mo</div>
            </div>
          </div>
        </nav>

        <main className="min-w-0">
          <AlertsBar profile={profile} />
          {tab === "brief" && <Brief profile={profile} go={setTab} setProfile={setProfile} />}
          {tab === "risk" && <RiskTab profile={profile} setProfile={setProfile} />}
          {tab === "insights" && <InsightsTab profile={profile} />}
          {tab === "news" && <NewsTab />}
          {tab === "coach" && <CoachTab profile={profile} />}
          {tab === "journal" && <JournalTab profile={profile} setProfile={setProfile} />}
          {tab === "challenge" && <ChallengeTab profile={profile} />}
          {tab === "simulator" && <SimulatorTab profile={profile} />}
          {tab === "today" && <TodayTab profile={profile} setProfile={setProfile} />}
          {tab === "plan" && <PlanTab profile={profile} setProfile={setProfile} />}
          {tab === "tools" && <ToolsTab profile={profile} />}
          {tab === "charts" && <ChartsTab profile={profile} />}
          {tab === "markets" && <MarketsTab />}
          {tab === "settings" && <SettingsTab profile={profile} setProfile={setProfile} />}
        </main>
      </div>
    </div>
  );
}
