/**
 * logActivity — write a structured audit event to the activity_log table.
 *
 * D365 migration path:
 *   Replace calls to this helper with Power Automate cloud flow triggers or
 *   Dataverse plug-in steps that write to the native Timeline / ActivityPointer,
 *   or to a custom crm_activitylog entity.
 *
 *   Event type mapping:
 *     org_created        → Account: createdon audit / Timeline note
 *     contact_added      → Contact: createdon audit / Timeline note
 *     engagement_created → Opportunity: createdon audit / Timeline note
 *     stage_changed      → Business Process Flow stage history or Power Automate note
 *     task_completed     → Task activity status change (system-tracked)
 *
 *   The metadata JSONB blob should be decomposed into typed columns on migration
 *   (e.g., crm_stagefrom / crm_stageto for stage_changed events).
 */
import { db } from "@workspace/db";
import { activityLogTable } from "@workspace/db/schema";

export type EventType =
  | "org_created"
  | "contact_added"
  | "engagement_created"
  | "stage_changed"
  | "task_created"
  | "task_completed"
  | "call_logged"
  | "qualification_changed"
  | "handover_initiated"
  | "handover_completed"
  | "disqualified";

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
