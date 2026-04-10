import { cn } from "@/lib/utils";
import type { Engagement } from "@workspace/api-client-react";
import { ALL_STAGES_NO_LEGACY, STAGE_CONFIG_MAP } from "./constants";

interface FunnelBarProps {
  engagements: Engagement[];
  activeStage: string;
  onStageClick: (stage: string) => void;
}

export function FunnelBar({ engagements, activeStage, onStageClick }: FunnelBarProps) {
  const counts = engagements.reduce<Record<string, number>>((acc, e) => {
    const s = e.sdrStage ?? "new";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const total = engagements.length;

  const activeStages = ALL_STAGES_NO_LEGACY.filter((s) => s.group === "active");
  const terminalStages = ALL_STAGES_NO_LEGACY.filter((s) => s.group === "terminal");

  function handleClick(stage: string) {
    onStageClick(activeStage === stage ? "" : stage);
  }

  return (
    <div className="bg-white border-b flex-shrink-0 overflow-x-auto">
      <div className="flex items-center gap-0 min-w-max px-1">
        {/* Total */}
        <button
          onClick={() => onStageClick("")}
          className={cn(
            "flex items-center gap-2 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors",
            activeStage === ""
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <span>All</span>
          <span className={cn(
            "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums",
            activeStage === "" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {total}
          </span>
        </button>

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* Active stages */}
        {activeStages.map((stage) => {
          const count = counts[stage.value] ?? 0;
          const isActive = activeStage === stage.value;
          return (
            <button
              key={stage.value}
              onClick={() => handleClick(stage.value)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : count === 0
                    ? "border-transparent text-muted-foreground/40 hover:text-muted-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <span>{stage.label}</span>
              {count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <div className="w-px h-6 bg-border mx-0.5" />

        {/* Terminal stages */}
        {terminalStages.map((stage) => {
          const count = counts[stage.value] ?? 0;
          const isActive = activeStage === stage.value;
          return (
            <button
              key={stage.value}
              onClick={() => handleClick(stage.value)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : count === 0
                    ? "border-transparent text-muted-foreground/40"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <span>{stage.label}</span>
              {count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold tabular-nums",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-red-100 text-red-700"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
