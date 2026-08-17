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
    const { data: userData } = await supabase.auth.getUser();
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

      const { data: flaggedBatches } = await query;

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
      const { data: pendingBatches } = await supabase
        .from("batches")
        .select("batch_id, crop_type, registered_at")
        .eq("status", "REGISTERED")
        .order("registered_at", { ascending: false });

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

    // 3. Batches Ready for Handoff (status = 'INSPECTED')
    // Visible to DISTRIBUTOR and REGULATOR network-wide.
    // Hidden from FARMER and INSPECTOR.
    if (!userRole || userRole === "DISTRIBUTOR" || userRole === "REGULATOR") {
      const { data: readyBatches } = await supabase
        .from("batches")
        .select("batch_id, crop_type, quantity_kg, registered_at")
        .eq("status", "INSPECTED")
        .order("registered_at", { ascending: false });

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
      const { data: pendingCreds } = await supabase
        .from("credentials")
        .select("id, user_id, license_number, certifying_body, submitted_at")
        .eq("status", "pending")
        .order("submitted_at", { ascending: false });

      if (pendingCreds && pendingCreds.length > 0) {
        const userIds = pendingCreds.map((c) => c.user_id);
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, email, role")
          .in("id", userIds);

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

    // Sort all alerts descending by timestamp
    alerts.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime());
  } catch (error) {
    console.error("Error fetching real alerts:", error);
  }

  return alerts;
}

export async function getLastViewedAlertsAt(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("last_viewed_alerts_at")
      .eq("id", userId)
      .single();

    if (!error && data && data.last_viewed_alerts_at) {
      return data.last_viewed_alerts_at;
    }
  } catch {
    // Column might not exist yet, fallback to localStorage
  }

  if (typeof window !== "undefined") {
    return localStorage.getItem(`agritrust_last_viewed_alerts_${userId}`);
  }

  return null;
}

export async function markAlertsAsViewed(userId: string): Promise<void> {
  const now = new Date().toISOString();
  if (typeof window !== "undefined") {
    localStorage.setItem(`agritrust_last_viewed_alerts_${userId}`, now);
  }

  try {
    await supabase
      .from("users")
      .update({ last_viewed_alerts_at: now })
      .eq("id", userId);
  } catch {
    // Ignore error if column doesn't exist yet
  }
}
