// Per-trader profile, persisted in the browser (localStorage). No backend.
// Holds the trader's accounts and trade history so every tool personalizes to them.
import type { Account } from "./risk";
import type { Trade } from "./score";

export type Profile = {
  name: string;
  accounts: Account[];
  trades: Trade[];
  settings: {
    instrument: string;
    defaultStop: number;
    maxTradesPerDay: number;
    dailyLossStop: number; // self-imposed $ stop
    anthropicKey?: string;
  };
  demo?: boolean;
  plan: string;                 // the trader's written trading plan
  checklist: string[];          // pre-session checklist items
  checklistDone: { date: string; done: number[] }; // today's checked items
  onboarded: boolean;
};

const KEY = "fundedcore.profile.v1";

export const DEFAULT_PROFILE: Profile = {
  name: "Trader",
  accounts: [],
  trades: [],
  settings: { instrument: "MNQ", defaultStop: 20, maxTradesPerDay: 4, dailyLossStop: 500 },
  plan: "",
  checklist: [
    "Reviewed today's high-impact news times",
    "Checked Distance to Breach on every account",
    "Know my max size at my stop",
    "Committed to my daily loss stop",
    "Trading only my best window",
  ],
  checklistDone: { date: "", done: [] },
  onboarded: false,
};

export function loadProfile(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const p = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...p, settings: { ...DEFAULT_PROFILE.settings, ...(p.settings || {}) } };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(KEY); } catch {}
}

// One-click demo: fills the suite with a realistic funded trader so every
// panel, ring, chart and insight comes alive immediately.
import { demoAccounts } from "./risk";
import { sampleById } from "./sampleTraders";

export function demoProfile(base: Profile): Profile {
  const maya = sampleById("maya");
  const accts = demoAccounts();
  // stamp recent trades onto the current week so charts/news overlays line up
  const src = maya ? maya.trades : [];
  const now = Date.now();
  const span = src.length ? src[src.length - 1].timestamp - src[0].timestamp : 1;
  const trades = src.map((t) => {
    const frac = span ? (t.timestamp - src[0].timestamp) / span : 0;
    const ts = now - (1 - frac) * 30 * 86400000; // last 30 days
    return { ...t, timestamp: ts, date: new Date(ts).toISOString().slice(0, 10) };
  });
  return {
    ...base,
    name: base.name && base.name !== "Trader" ? base.name : "Maya",
    accounts: accts,
    trades,
    onboarded: true,
    demo: true,
  };
}
