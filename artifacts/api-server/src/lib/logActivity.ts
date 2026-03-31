import { db } from "@workspace/db";
import { activityLogTable } from "@workspace/db/schema";

export type EventType =
  | "org_created"
  | "contact_added"
  | "engagement_created"
  | "stage_changed"
  | "task_completed";

export async function logActivity(
  eventType: EventType,
  entityType: "organisation" | "engagement" | "contact" | "task",
  entityId: number,
  actorUserId: number | null | undefined,
  metadata: Record<string, unknown> = {}
) {
  try {
    await db.insert(activityLogTable).values({
      eventType,
      entityType,
      entityId,
      actorUserId: actorUserId ?? null,
      metadata,
    });
  } catch (err) {
    console.error("[logActivity] failed to write activity log:", err);
  }
}
