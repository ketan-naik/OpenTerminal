"use client";

import { FilingDocument } from "../../../lib/screenerTypes";

export default function DocumentsTab({
  documents = [],
  symbol,
}: {
  documents: FilingDocument[];
  symbol: string;
}) {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="p-3 bg-[var(--panel-2)] border border-[var(--border)] rounded flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-[13px] text-[var(--amber)] flex items-center gap-1.5">
            <span>📑</span>
            <span>Official SEC Filings & Company Documents</span>
          </h3>
          <p className="text-[11px] text-[var(--text-dim)]">
            Direct access to official primary-source 10-K, 10-Q, and 8-K filings on SEC EDGAR.
          </p>
        </div>
        <a
          href={`https://www.sec.gov/edgar/searchedgar/companysearch?companySearch=${symbol}`}
          target="_blank"
          rel="noreferrer"
          className="term-btn !text-[10px] !py-1 text-[var(--amber)] border-[var(--amber)]/40 hover:bg-[var(--amber)]/10"
        >
          VIEW ON SEC.GOV ↗
        </a>
      </div>

      {/* Documents List */}
      <div className="border border-[var(--border)] rounded bg-[var(--panel-2)] overflow-hidden">
        <table className="w-full text-left border-collapse text-[11px] font-mono">
          <thead>
            <tr className="bg-[var(--panel)] border-b border-[var(--border)] text-[var(--text-dim)] uppercase text-[10px]">
              <th className="p-2.5">Document Type</th>
              <th className="p-2.5">Filing Date</th>
              <th className="p-2.5">Period Ended</th>
              <th className="p-2.5">Description</th>
              <th className="p-2.5">Source</th>
              <th className="p-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-[var(--panel)] transition-colors">
                <td className="p-2.5">
                  <span className="px-2 py-0.5 rounded font-bold bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/30">
                    {doc.documentType}
                  </span>
                </td>
                <td className="p-2.5 text-[var(--text-dim)]">{doc.filingDate}</td>
                <td className="p-2.5 text-[var(--text-dim)]">{doc.periodEnded}</td>
                <td className="p-2.5 text-[var(--text)] max-w-md truncate">{doc.description}</td>
                <td className="p-2.5 text-[var(--text-dim)]">{doc.source}</td>
                <td className="p-2.5 text-right">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="term-btn !text-[10px] !py-0.5 text-[var(--amber)] hover:underline inline-flex items-center gap-1"
                  >
                    <span>OPEN FILING ↗</span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
