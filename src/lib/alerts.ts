import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

export interface RealAlert {
  id: string;
  title: string;
  description: string;
  time: string;
  rawTime: string;
  href: string;
  type: "critical" | "warning" | "info";
  roleSpecific?: UserRole[];
}

export interface StructuredAlertError {
  context?: string;
  operation?: string;
  table?: string;
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
  status: number | null;
}

export interface MarkAlertsViewedResult {
  databasePersisted: boolean;
  localPersisted: boolean;
}

export interface AlertReadStateResult {
  lastViewedAt: string | null;
  databaseAuthoritative: boolean;
}

const ERROR_LOG_WINDOW_MS = 60_000;
const recentErrorLogs = new Map<string, number>();

export function extractErrorDetails(error: unknown): StructuredAlertError {
  if (typeof error === "object" && error !== null) {
    const value = error as Record<string, unknown>;
    return {
      operation: typeof value.operation === "string" ? value.operation : undefined,
      table: typeof value.table === "string" ? value.table : undefined,
      message:
        typeof value.message === "string"
          ? value.message
          : error instanceof Error
            ? error.message
            : "Unknown alert error",
      code: typeof value.code === "string" ? value.code : null,
      details: typeof value.details === "string" ? value.details : null,
      hint: typeof value.hint === "string" ? value.hint : null,
      status: typeof value.status === "number" ? value.status : null,
    };
  }

  return {
    message: error == null ? "Unknown alert error" : String(error),
    code: null,
    details: null,
    hint: null,
    status: null,
  };
}

export function formatErrorDetails(error: unknown): string {
  const details = extractErrorDetails(error);
  return details.code ? `${details.message} [${details.code}]` : details.message;
}

/** Log only non-sensitive fields and throttle repeats from the polling loop. */
export function logAlertsError(context: string, error: unknown): void {
  const details = { context, ...extractErrorDetails(error) };
  const fingerprint = [
    context,
    details.operation,
    details.table,
    details.code,
    details.message,
  ].join("|");
  const now = Date.now();

  if (now - (recentErrorLogs.get(fingerprint) ?? 0) < ERROR_LOG_WINDOW_MS) return;

  recentErrorLogs.set(fingerprint, now);
  console.warn("[AgriTrust Alerts]", details);
}

class AlertQueryError extends Error {
  readonly operation: string;
  readonly table: string;
  readonly code: string | null;
  readonly details: string | null;
  readonly hint: string | null;
  readonly status: number | null;

  constructor(operation: string, table: string, error: unknown) {
    const source = extractErrorDetails(error);
    super(source.message);
    this.name = "AlertQueryError";
    this.operation = operation;
    this.table = table;
    this.code = source.code;
    this.details = source.details;
    this.hint = source.hint;
    this.status = source.status;
  }
}

function queryError(operation: string, table: string, error: unknown): AlertQueryError {
  return new AlertQueryError(operation, table, error);
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 0) return "Just now";
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(diffInSeconds / 86400);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export async function fetchRealAlerts(userRole?: UserRole, userId?: string): Promise<RealAlert[]> {
  const alerts: RealAlert[] = [];

  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw queryError("get signed-in user", "auth.users", userError);
    effectiveUserId = userData.user?.id;
  }

  try {
    // 1. Flagged Batches
    // Visible to REGULATOR (network-wide) and FARMER (own registered batches only).
    // Hidden from INSPECTOR and DISTRIBUTOR.
    if (!userRole || userRole === "REGULATOR" || (userRole === "FARMER" && effectiveUserId)) {
      let query = supabase
        .from("batches")
        .select("batch_id, crop_type, quantity_kg, gmo_status, registered_at")
        .eq("status", "FLAGGED")
        .order("registered_at", { ascending: false });

      if (userRole === "FARMER" && effectiveUserId) {
        query = query.eq("registered_by", effectiveUserId);
      }

      const { data: flaggedBatches, error: flaggedError } = await query;
      if (flaggedError) {
        throw queryError("fetch flagged batches", "public.batches", flaggedError);
      }

      if (flaggedBatches) {
        for (const batch of flaggedBatches) {
          alerts.push({
            id: `flagged-${batch.batch_id}`,
            title: `Batch ${batch.batch_id} flagged: ${batch.gmo_status || "Compliance flag raised"}`,
            description: `Crop: ${batch.crop_type} (${batch.quantity_kg} kg)`,
            time: formatRelativeTime(batch.registered_at),
            rawTime: batch.registered_at,
            href: `/dashboard/trace/${batch.batch_id}`,
            type: "critical",
          });
        }
      }
    }

    // 2. Batches Awaiting Inspection (status = 'REGISTERED')
    // Visible to INSPECTOR and REGULATOR network-wide.
    // Hidden from FARMER and DISTRIBUTOR.
    if (!userRole || userRole === "INSPECTOR" || userRole === "REGULATOR") {
      const { data: pendingBatches, error: pendingError } = await supabase
        .from("batches")
        .select("batch_id, crop_type, registered_at")
        .eq("status", "REGISTERED")
        .order("registered_at", { ascending: false });

      if (pendingError) {
        throw queryError("fetch batches awaiting inspection", "public.batches", pendingError);
      }

      if (pendingBatches) {
        for (const batch of pendingBatches) {
          alerts.push({
            id: `pending-inspection-${batch.batch_id}`,
            title: `Batch ${batch.batch_id} awaiting inspection`,
            description: `Crop: ${batch.crop_type} registered and pending inspector verification`,
            time: formatRelativeTime(batch.registered_at),
            rawTime: batch.registered_at,
            href: `/dashboard/trace/${batch.batch_id}`,
            type: "warning",
          });
        }
      }
    }

    // 3. Certified batches ready for their first distribution handoff.
    // Visible to DISTRIBUTOR and REGULATOR network-wide.
    // Hidden from FARMER and INSPECTOR.
    if (!userRole || userRole === "DISTRIBUTOR" || userRole === "REGULATOR") {
      const { data: readyBatches, error: readyError } = await supabase
        .from("batches")
        .select("batch_id, crop_type, quantity_kg, registered_at")
        .eq("status", "CERTIFIED")
        .order("registered_at", { ascending: false });

      if (readyError) {
        throw queryError("fetch batches ready for handoff", "public.batches", readyError);
      }

      if (readyBatches) {
        for (const batch of readyBatches) {
          alerts.push({
            id: `ready-handoff-${batch.batch_id}`,
            title: `Batch ${batch.batch_id} ready for handoff`,
            description: `Crop: ${batch.crop_type} (${batch.quantity_kg} kg) inspected and ready for distribution`,
            time: formatRelativeTime(batch.registered_at),
            rawTime: batch.registered_at,
            href: `/dashboard/trace/${batch.batch_id}`,
            type: "info",
          });
        }
      }
    }

    // 4. Pending Credential Applications (status = 'pending')
    // Visible to REGULATOR network-wide.
    if (!userRole || userRole === "REGULATOR") {
      const { data: pendingCreds, error: credentialsError } = await supabase
        .from("credentials")
        .select("id, user_id, license_number, certifying_body, submitted_at")
        .eq("status", "pending")
        .order("submitted_at", { ascending: false });

      if (credentialsError) {
        throw queryError("fetch pending credentials", "public.credentials", credentialsError);
      }

      if (pendingCreds && pendingCreds.length > 0) {
        const userIds = pendingCreds.map((c) => c.user_id);
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email, role")
          .in("id", userIds);

        if (usersError) {
          throw queryError(
            "fetch pending credential applicants",
            "public.users",
            usersError,
          );
        }

        const userMap = new Map(users?.map((u) => [u.id, u]));

        for (const cred of pendingCreds) {
          const applicant = userMap.get(cred.user_id);
          const applicantName = applicant?.full_name || applicant?.email || "Applicant";
          const roleLabel = applicant?.role ? ` (${applicant.role})` : "";
          alerts.push({
            id: `cred-${cred.id}`,
            title: `Pending credential application: ${applicantName}${roleLabel}`,
            description: `License: ${cred.license_number || "N/A"} | Body: ${cred.certifying_body || "N/A"}`,
            time: formatRelativeTime(cred.submitted_at),
            rawTime: cred.submitted_at,
            href: "/dashboard/approvals",
            type: "warning",
            roleSpecific: ["REGULATOR"],
          });
        }
      }
    }

    // Lifecycle history uses the real inspection and custody timestamps rather
    // than the batch registration timestamp.
    if (userRole === "FARMER" && effectiveUserId) {
      const { data: farmerBatches, error: farmerBatchError } = await supabase
        .from("batches")
        .select("batch_id, crop_type")
        .eq("registered_by", effectiveUserId)
        .order("registered_at", { ascending: false });

      if (farmerBatchError) {
        throw queryError("fetch farmer batch updates", "public.batches", farmerBatchError);
      }

      const batchIds = (farmerBatches ?? []).map((batch) => batch.batch_id);
      if (batchIds.length > 0) {
        const [{ data: inspections, error: inspectionError }, { data: handoffs, error: handoffError }] =
          await Promise.all([
            supabase
              .from("inspections")
              .select("id, batch_id, certificate_issued, inspected_at")
              .in("batch_id", batchIds)
              .order("inspected_at", { ascending: false }),
            supabase
              .from("handoffs")
              .select("id, batch_id, to_party, location, condition, handed_off_at")
              .in("batch_id", batchIds)
              .order("handed_off_at", { ascending: false }),
          ]);
        if (inspectionError) {
          throw queryError("fetch farmer inspection history", "public.inspections", inspectionError);
        }
        if (handoffError) {
          throw queryError("fetch farmer custody history", "public.handoffs", handoffError);
        }

        for (const inspection of inspections ?? []) {
          alerts.push({
            id: `farmer-inspection-${inspection.id}`,
            title: `Inspection completed for batch ${inspection.batch_id}`,
            description: inspection.certificate_issued
              ? "The inspection passed and a biosafety certificate was issued."
              : "The batch inspection was recorded.",
            time: formatRelativeTime(inspection.inspected_at),
            rawTime: inspection.inspected_at,
            href: `/dashboard/trace/${inspection.batch_id}`,
            type: "info",
          });
        }
        for (const handoff of handoffs ?? []) {
          const delivered = handoff.condition === "Final market delivery recorded on-chain";
          alerts.push({
            id: `farmer-${delivered ? "delivery" : "handoff"}-${handoff.id}`,
            title: delivered
              ? `Final market delivery recorded for ${handoff.batch_id}`
              : `Handoff recorded for batch ${handoff.batch_id}`,
            description: delivered
              ? `The Distributor recorded delivery at ${handoff.location || handoff.to_party || "the market"}.`
              : `The batch is in transit to ${handoff.to_party || handoff.location || "the next custodian"}.`,
            time: formatRelativeTime(handoff.handed_off_at),
            rawTime: handoff.handed_off_at,
            href: `/dashboard/trace/${handoff.batch_id}`,
            type: "info",
          });
        }
      }
    }

    if (userRole === "INSPECTOR" && effectiveUserId) {
      const { data: inspections, error } = await supabase
        .from("inspections")
        .select("id, batch_id, certificate_issued, inspected_at")
        .eq("inspector_id", effectiveUserId)
        .order("inspected_at", { ascending: false });
      if (error) throw queryError("fetch Inspector activity", "public.inspections", error);
      for (const inspection of inspections ?? []) {
        alerts.push({
          id: `inspector-activity-${inspection.id}`,
          title: inspection.certificate_issued
            ? `Certificate issued for ${inspection.batch_id}`
            : `Inspection recorded for ${inspection.batch_id}`,
          description: "Your verified inspection record is available in the batch history.",
          time: formatRelativeTime(inspection.inspected_at),
          rawTime: inspection.inspected_at,
          href: `/dashboard/trace/${inspection.batch_id}`,
          type: "info",
        });
      }
    }

    if (userRole === "DISTRIBUTOR" && effectiveUserId) {
      const { data: custodyEvents, error: custodyError } = await supabase
        .from("handoffs")
        .select("id, batch_id, to_party, location, condition, handed_off_at")
        .eq("distributor_id", effectiveUserId)
        .order("handed_off_at", { ascending: false });
      if (custodyError) {
        throw queryError("fetch Distributor custody history", "public.handoffs", custodyError);
      }
      const inTransitBatchIds = [...new Set(
        (custodyEvents ?? [])
          .filter((event) => event.condition !== "Final market delivery recorded on-chain")
          .map((event) => event.batch_id),
      )];
      let stillInTransit = new Set<string>();
      if (inTransitBatchIds.length > 0) {
        const { data: activeBatches, error: activeError } = await supabase
          .from("batches")
          .select("batch_id")
          .in("batch_id", inTransitBatchIds)
          .eq("status", "IN_TRANSIT");
        if (activeError) {
          throw queryError("fetch pending delivery tasks", "public.batches", activeError);
        }
        stillInTransit = new Set((activeBatches ?? []).map((batch) => batch.batch_id));
      }
      for (const event of custodyEvents ?? []) {
        const delivered = event.condition === "Final market delivery recorded on-chain";
        alerts.push({
          id: `distributor-${delivered ? "delivery" : "handoff"}-${event.id}`,
          title: delivered
            ? `Final delivery synchronized for ${event.batch_id}`
            : `Custody handoff synchronized for ${event.batch_id}`,
          description: delivered
            ? `Delivery was recorded at ${event.location || event.to_party || "the market"}.`
            : stillInTransit.has(event.batch_id)
              ? `Delivery remains pending for the batch sent to ${event.to_party || "the next custodian"}.`
              : `Custody was recorded to ${event.to_party || event.location || "the next custodian"}.`,
          time: formatRelativeTime(event.handed_off_at),
          rawTime: event.handed_off_at,
          href: `/dashboard/trace/${event.batch_id}`,
          type: stillInTransit.has(event.batch_id) ? "warning" : "info",
        });
      }
    }

    if (userRole === "REGULATOR") {
      const [{ data: inspections, error: inspectionError }, { data: custodyEvents, error: custodyError }] =
        await Promise.all([
          supabase
            .from("inspections")
            .select("id, batch_id, certificate_issued, inspected_at")
            .order("inspected_at", { ascending: false })
            .limit(50),
          supabase
            .from("handoffs")
            .select("id, batch_id, to_party, location, condition, handed_off_at")
            .order("handed_off_at", { ascending: false })
            .limit(50),
        ]);
      if (inspectionError) {
        throw queryError("fetch Regulator inspection activity", "public.inspections", inspectionError);
      }
      if (custodyError) {
        throw queryError("fetch Regulator supply-chain activity", "public.handoffs", custodyError);
      }
      for (const inspection of inspections ?? []) {
        alerts.push({
          id: `regulator-inspection-${inspection.id}`,
          title: inspection.certificate_issued
            ? `Certificate issued for ${inspection.batch_id}`
            : `Inspection recorded for ${inspection.batch_id}`,
          description: "A verified biosafety event was added to the network history.",
          time: formatRelativeTime(inspection.inspected_at),
          rawTime: inspection.inspected_at,
          href: `/dashboard/trace/${inspection.batch_id}`,
          type: "info",
        });
      }
      for (const event of custodyEvents ?? []) {
        const delivered = event.condition === "Final market delivery recorded on-chain";
        alerts.push({
          id: `regulator-${delivered ? "delivery" : "handoff"}-${event.id}`,
          title: delivered
            ? `Final market delivery recorded for ${event.batch_id}`
            : `Supply-chain handoff recorded for ${event.batch_id}`,
          description: delivered
            ? `Delivery destination: ${event.location || event.to_party || "Market"}.`
            : `Custody destination: ${event.to_party || event.location || "Next custodian"}.`,
          time: formatRelativeTime(event.handed_off_at),
          rawTime: event.handed_off_at,
          href: `/dashboard/trace/${event.batch_id}`,
          type: "info",
        });
      }
    }

    // Sort all alerts descending by timestamp
    alerts.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime());
  } catch (error) {
    throw error;
  }

  return alerts;
}

function readStateKey(userId: string): string {
  return `agritrust_last_viewed_alerts_${userId}`;
}

function localReadState(userId: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(readStateKey(userId));
  } catch {
    return null;
  }
}

function writeLocalReadState(userId: string, viewedAt: string | null): boolean {
  if (typeof window === "undefined") return false;

  try {
    if (viewedAt) window.localStorage.setItem(readStateKey(userId), viewedAt);
    else window.localStorage.removeItem(readStateKey(userId));
    return true;
  } catch {
    return false;
  }
}

export async function getAlertsReadState(userId: string): Promise<AlertReadStateResult> {
  try {
    const { data, error } = await supabase.rpc("get_my_last_viewed_alerts_at");

    if (error) {
      logAlertsError("Alert read state database lookup failed; using local storage", error);
    } else {
      const lastViewedAt = typeof data === "string" ? data : null;
      // A successful database response is authoritative, including null. Clear
      // stale local state instead of allowing it to override a newer DB value.
      writeLocalReadState(userId, lastViewedAt);
      return { lastViewedAt, databaseAuthoritative: true };
    }
  } catch (error) {
    logAlertsError("Alert read state database lookup failed; using local storage", error);
  }

  return {
    lastViewedAt: localReadState(userId),
    databaseAuthoritative: false,
  };
}

export async function markAlertsAsViewed(
  userId: string,
): Promise<MarkAlertsViewedResult> {
  try {
    const { data, error } = await supabase.rpc("mark_my_alerts_viewed");

    if (error) {
      logAlertsError("Alert read state database update failed", error);
    } else if (typeof data === "string") {
      return {
        databasePersisted: true,
        localPersisted: writeLocalReadState(userId, data),
      };
    } else {
      logAlertsError(
        "Alert read state database update returned no timestamp",
        new Error("mark_my_alerts_viewed returned no timestamp"),
      );
    }
  } catch (error) {
    logAlertsError("Alert read state database update failed", error);
  }

  // The fallback is deliberately written only after the authoritative database
  // update fails. A later successful DB read will overwrite or clear it.
  return {
    databasePersisted: false,
    localPersisted: writeLocalReadState(userId, new Date().toISOString()),
  };
}
