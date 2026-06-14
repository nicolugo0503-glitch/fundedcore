"use client";
import { type Profile } from "../../lib/profile";
import { computeEdge, type EdgeCond } from "../../lib/edge";
import { usd, pct } from "../../lib/format";
import { SuiteHeader, Panel, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

function Row({ c, good }: { c: EdgeCond; good: boolean }) {
  const col = good ? "var(--grn)" : "var(--red)";
  return (
    <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: "color-mix(in srgb, var(--bg2,#111) 55%, transparent)" }}>
      <span className="text-[.6rem] font-semibold uppercase tracking-wide text-t3 w-[68px] shrink-0">{c.kind}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[.9rem] font-semibold truncate">{c.label}</div>
        <div className="text-[.74rem] text-t2">{pct(c.winRate)} win · {c.trades} trades · {usd(Math.round(c.net))} net</div>
      </div>
      <div className="mono text-[.95rem] font-bold shrink-0" style={{ color: col }}>{c.expectancy >= 0 ? "+" : ""}{usd(Math.round(c.expectancy))}<span className="text-t3 text-[.62rem] font-normal">/trade</span></div>
    </div>
  );
}

export function EdgeTab({ profile }: { profile: Profile }) {
  const e = computeEdge(profile.trades);
  if (!e.ready) {
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="Pro · Your Edge" title="Where you actually make money" sub="Not signals. Not predictions. Your own proven winning conditions, mined from your real trades." />
        <EmptyState icon="spark" title="Need more trades" body={e.reasonNeed || "Log more and your edge appears."} />
      </div>
    );
  }
  const facts = `Best conditions: ${e.best.slice(0, 3).map((c) => `${c.label} (${Math.round(c.winRate * 100)}%, ${usd(Math.round(c.expectancy))}/trade)`).join(", ")}. Worst: ${e.worst.slice(0, 2).map((c) => c.label).join(", ")}.`;
  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Pro · Your Edge" title="Where you actually make money"
        sub="This isn't a signal bot guessing the market. It reads YOUR history and finds the exact conditions — instrument, time, day, direction, setup — where your own data proves you have an edge. Trade these. Trim the rest."
        right={<span className="chip" style={{ color: "var(--acc)", borderColor: "color-mix(in srgb, var(--acc) 35%, transparent)" }}>PRO</span>} />

      <div className="card p-5">
        <div className="flex items-center gap-2 text-[.95rem] text-t1 leading-relaxed"><Icon name="spark" size={16} className="text-acc shrink-0" />{e.headline}</div>
      </div>

      <Panel title="Your A+ edges — concentrate here" icon="up">
        <div className="space-y-2">
          {e.best.length ? e.best.map((c, i) => <Row key={i} c={c} good />) : <div className="text-t3 text-sm py-2">No clearly profitable condition yet.</div>}
        </div>
      </Panel>

      <Panel title="Your money pits — trim or cut" icon="down">
        <div className="space-y-2">
          {e.worst.length ? e.worst.map((c, i) => <Row key={i} c={c} good={false} />) : <div className="text-t3 text-sm py-2">Nothing clearly losing — good.</div>}
        </div>
      </Panel>

      <AIRead module="Your Edge" facts={facts} />
      <p className="text-[.7rem] text-t3">Built only from conditions with 5+ of your own trades. It describes your past edge — not a guarantee the market repeats. For insight, not financial advice.</p>
    </div>
  );
}
