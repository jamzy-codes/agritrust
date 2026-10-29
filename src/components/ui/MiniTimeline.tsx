import { Check, Clock } from "lucide-react";

interface MiniTimelineProps {
  stages: Array<"complete" | "current" | "pending">;
}

const labels = ["Farm", "Warehouse", "Inspect", "Distribute", "Market"];

function connectorClassName(
  current: MiniTimelineProps["stages"][number],
  next: MiniTimelineProps["stages"][number],
) {
  if (current === "complete" && next === "complete") {
    return "bg-accent-green";
  }

  if (current === "complete" && next === "current") {
    return "bg-gradient-to-r from-accent-green to-accent-amber";
  }

  if (current === "current" && next === "pending") {
    return "border-t-2 border-dashed border-agri-border bg-transparent";
  }

  return "bg-agri-border";
}

export function MiniTimeline({ stages }: MiniTimelineProps) {
  return (
    <div className="flex min-w-112 items-center">
      {stages.map((stage, index) => (
        <div key={`${labels[index]}-${stage}`} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                stage === "complete"
                  ? "border-accent-green bg-accent-green"
                  : stage === "current"
                    ? "animate-pulse border-accent-amber bg-accent-amber"
                    : "border-agri-border bg-agri-raised"
              }`}
            >
              {stage === "complete" ? <Check className="h-3 w-3 text-white" /> : null}
              {stage === "current" ? <Clock className="h-3 w-3 text-white" /> : null}
            </div>
            <span className="mt-1 text-[10px] text-agri-muted">{labels[index]}</span>
          </div>
          {index < stages.length - 1 ? (
            <div className={`mx-2 h-px flex-1 ${connectorClassName(stage, stages[index + 1])}`} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
