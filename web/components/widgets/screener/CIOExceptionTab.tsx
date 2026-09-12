"use client";

import HedgeFundResearchWidget from "../HedgeFundResearchWidget";

export default function CIOExceptionTab({ symbol }: { symbol: string }) {
  return (
    <div className="p-2">
      <HedgeFundResearchWidget
        widget={{
          id: `w-sd-cio-${symbol}`,
          type: "research",
          symbol,
          linked: true,
        }}
      />
    </div>
  );
}
