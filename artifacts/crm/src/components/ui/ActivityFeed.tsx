import { useListActivity } from "@workspace/api-client-react";
import type { ActivityLogEntry } from "@workspace/api-client-react";
import {
  Building2, User2, Handshake, CheckSquare, TrendingUp, Clock,
} from "lucide-react";

type EntityType = "organisation" | "engagement";

interface ActivityFeedProps {
  entityType: EntityType;
  entityId: number;
}

function eventIcon(eventType: ActivityLogEntry["eventType"]) {
  switch (eventType) {
    case "org_created":       return <Building2 size={14} className="text-primary" />;
    case "contact_added":     return <User2 size={14} className="text-blue-500" />;
    case "engagement_created": return <Handshake size={14} className="text-indigo-500" />;
    case "stage_changed":     return <TrendingUp size={14} className="text-amber-500" />;
    case "task_completed":    return <CheckSquare size={14} className="text-emerald-500" />;
    default:                  return <Clock size={14} className="text-muted-foreground" />;
  }
}

function eventBg(eventType: ActivityLogEntry["eventType"]) {
  switch (eventType) {
    case "org_created":        return "bg-primary/10";
    case "contact_added":      return "bg-blue-50";
    case "engagement_created": return "bg-indigo-50";
    case "stage_changed":      return "bg-amber-50";
    case "task_completed":     return "bg-emerald-50";
    default:                   return "bg-muted";
  }
}

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead", contacted: "Contacted", meeting_booked: "Meeting Booked",
  proposal: "Proposal", active: "Active", won: "Won", dormant: "Dormant",
};

function eventDescription(entry: ActivityLogEntry): string {
  const m = (entry.metadata ?? {}) as Record<string, unknown>;
  switch (entry.eventType) {
    case "org_created":
      return `Organisation "${m.orgName ?? "Unknown"}" was created`;
    case "contact_added":
      return `Contact "${m.contactName ?? "Unknown"}" was added`;
    case "engagement_created":
      return `Engagement "${m.title ?? "Unknown"}" was created (stage: ${STAGE_LABELS[m.stage as string] ?? m.stage ?? "—"})`;
    case "stage_changed": {
      const from = STAGE_LABELS[m.stageFrom as string] ?? m.stageFrom ?? "?";
      const to = STAGE_LABELS[m.stageTo as string] ?? m.stageTo ?? "?";
      const title = m.title ? ` on "${m.title}"` : "";
      const statusNote = m.status === "closed_won" ? " (Closed Won)" : m.status === "closed_lost" ? " (Closed Lost)" : "";
      return `Stage changed${title}: ${from} → ${to}${statusNote}`;
    }
    case "task_completed":
      return `Task "${m.taskTitle ?? "Unknown"}" was marked complete`;
    default:
      return "Activity recorded";
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ActivityFeed({ entityType, entityId }: ActivityFeedProps) {
  const { data: entries = [], isLoading } = useListActivity(
    { entityType, entityId },
    { query: { enabled: !!entityId, refetchOnWindowFocus: true } }
  );

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary/40" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-10 flex flex-col items-center gap-2 text-center px-6">
        <Clock size={28} className="text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        <p className="text-xs text-muted-foreground/60">Events will appear here as you work with this record.</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-0">
      {entries.map((entry, idx) => (
        <div key={entry.id} className="flex gap-3 group">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full ${eventBg(entry.eventType)} flex items-center justify-center shrink-0 mt-0.5 ring-2 ring-background`}>
              {eventIcon(entry.eventType)}
            </div>
            {idx < entries.length - 1 && (
              <div className="w-px flex-1 bg-border my-1 min-h-[12px]" />
            )}
          </div>
          <div className="pb-4 flex-1 min-w-0">
            <p className="text-sm text-foreground leading-snug">{eventDescription(entry)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {entry.actorName ? <span className="font-medium">{entry.actorName} · </span> : null}
              {relativeTime(entry.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
