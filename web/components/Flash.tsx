"use client";

import React from "react";

/** Clean wrapper that renders children without screen-strobing flash effects */
export default function Flash({
  className,
  children,
}: {
  value?: string | number | null | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={className}>{children}</span>;
}
