"use client";

import { useEffect } from "react";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import Workspace from "./Workspace";
import CommandPalette from "./CommandPalette";
import { useTerminal } from "../store/terminal";

export default function Terminal() {
  const theme = useTerminal((s) => s.theme);
  const setCommandOpen = useTerminal((s) => s.setCommandOpen);
  const focusOrAddWidget = useTerminal((s) => s.focusOrAddWidget);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (e.altKey) {
        const map: Record<string, () => void> = {
          "1": () => focusOrAddWidget("chart"),
          "2": () => focusOrAddWidget("quote"),
          "3": () => focusOrAddWidget("news"),
          "4": () => focusOrAddWidget("screener"),
          "5": () => focusOrAddWidget("heatmap"),
          "6": () => focusOrAddWidget("crypto"),
          "7": () => focusOrAddWidget("options"),
          "8": () => focusOrAddWidget("portfolio"),
          "9": () => focusOrAddWidget("ai"),
        };
        const fn = map[e.key];
        if (fn) {
          e.preventDefault();
          fn();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen, focusOrAddWidget]);

  return (
    <div data-theme={theme} className="flex flex-col h-screen">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Workspace />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
