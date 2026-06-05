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
  onboarded: boolean;
};

const KEY = "fundedcore.profile.v1";

export const DEFAULT_PROFILE: Profile = {
  name: "Trader",
  accounts: [],
  trades: [],
  settings: { instrument: "MNQ", defaultStop: 20, maxTradesPerDay: 4, dailyLossStop: 500 },
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
