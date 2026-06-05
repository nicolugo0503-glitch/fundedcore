"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "../../components/Nav";
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
import { SettingsTab } from "../../components/suite/SettingsTab";
import { AlertsBar } from "../../components/suite/AlertsBar";

const TABS = [
  ["brief", "Daily Brief", "◎"],
  ["risk", "Risk", "🛡"],
  ["insights", "Insights", "✦"],
  ["news", "News", "◷"],
  ["coach", "AI Coach", "✧"],
  ["journal", "Journal & Score", "▤"],
  ["challenge", "Challenge", "◆"],
  ["simulator", "Firm Simulator", "⇄"],
  ["settings", "Settings", "⚙"],
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
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/"><Logo size={24} /></Link>
          <div className="text-sm text-t2 hidden sm:block">Hi, <span className="text-t1 font-medium">{profile.name}</span> · {profile.accounts.length} account{profile.accounts.length !== 1 ? "s" : ""} · {profile.trades.length} trades</div>
          <span className="chip" style={{ borderColor: "#10B98155", color: "#10B981" }}>$5/mo · everything</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 flex-1 grid md:grid-cols-[200px_1fr] gap-5 py-5">
        <nav className="md:sticky md:top-20 md:self-start">
          <div className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            {TABS.map(([id, label, icon]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition ${tab === id ? "bg-acc/15 text-t1 border border-acc/40" : "text-t2 hover:text-t1 hover:bg-white/[.03] border border-transparent"}`}>
                <span className="opacity-80">{icon}</span> {label}
              </button>
            ))}
          </div>
        </nav>

        <main className="min-w-0">
          <AlertsBar profile={profile} />
          {tab === "brief" && <Brief profile={profile} go={setTab} />}
          {tab === "risk" && <RiskTab profile={profile} setProfile={setProfile} />}
          {tab === "insights" && <InsightsTab profile={profile} />}
          {tab === "news" && <NewsTab />}
          {tab === "coach" && <CoachTab profile={profile} />}
          {tab === "journal" && <JournalTab profile={profile} setProfile={setProfile} />}
          {tab === "challenge" && <ChallengeTab profile={profile} />}
          {tab === "simulator" && <SimulatorTab profile={profile} />}
          {tab === "settings" && <SettingsTab profile={profile} setProfile={setProfile} />}
        </main>
      </div>
    </div>
  );
}
