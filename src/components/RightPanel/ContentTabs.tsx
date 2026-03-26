import { useState } from "react";
import { TilesTab } from "./TilesTab";
import { PropsTab } from "./PropsTab";

type Tab = "tiles" | "props";

export const ContentTabs = () => {
  const [activeTab, setActiveTab] = useState<Tab>("tiles");

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex items-center border-b border-edge bg-panel shrink-0">
        {(["tiles", "props"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-accent text-ink"
                : "border-transparent text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Scrollable tab content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        {activeTab === "tiles" ? <TilesTab /> : <PropsTab />}
      </div>
    </div>
  );
};
