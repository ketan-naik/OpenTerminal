"use client";

import { CompanyScreenerDossier, RuleBasedObservation } from "../../../lib/screenerTypes";

export default function AnalysisTab({ dossier }: { dossier: CompanyScreenerDossier }) {
  const { profile, observations, keyRatios } = dossier;
  const pros = observations.filter((o) => o.type === "PRO");
  const cons = observations.filter((o) => o.type === "CON");

  const categories = Array.from(new Set(observations.map((o) => o.category)));

  return (
    <div className="space-y-4 p-4">
      {/* Header Info */}
      <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-[13px] text-[var(--amber)] flex items-center gap-1.5">
            <span>🔬</span>
            <span>Deterministic Rule-Based Investment Analysis</span>
          </h3>
          <p className="text-[11px] text-[var(--text-dim)]">
            Quantitative diagnostic rules evaluated directly against SEC & exchange financial statement metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {pros.length} PROS IDENTIFIED
          </span>
          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
            {cons.length} RISKS FLAGGED
          </span>
        </div>
      </div>

      {/* Grouped by Category */}
      <div className="space-y-3">
        {categories.map((cat) => {
          const items = observations.filter((o) => o.category === cat);
          return (
            <div key={cat} className="bg-[var(--panel-2)] border border-[var(--border)] rounded overflow-hidden">
              <div className="px-3 py-1.5 bg-[var(--panel)] border-b border-[var(--border)] flex items-center justify-between">
                <span className="font-bold text-[11px] text-[var(--text)] uppercase tracking-wider">{cat}</span>
                <span className="text-[10px] text-[var(--text-dim)] font-mono">{items.length} Rules Evaluated</span>
              </div>
              <div className="p-3 space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded border flex items-start justify-between gap-3 ${
                      item.type === "PRO"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-rose-500/5 border-rose-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`text-[13px] font-bold ${item.type === "PRO" ? "text-emerald-400" : "text-rose-400"}`}>
                        {item.type === "PRO" ? "✓" : "✕"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[11.5px] text-[var(--text)]">{item.title}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-[var(--panel)] border border-[var(--border)] text-[var(--text-dim)]">
                            {item.metric}: {item.value}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-dim)] mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                        item.severity === "HIGH"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-[var(--panel)] text-[var(--text-dim)] border border-[var(--border)]"
                      }`}
                    >
                      {item.severity} IMPACT
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
