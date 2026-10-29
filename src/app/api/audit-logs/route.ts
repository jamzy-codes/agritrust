import { NextRequest, NextResponse } from "next/server";

import { buildAuditLogPayload, normalizeAuditLogRecord } from "@/lib/data-model";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiAuthErrorResponse, requireApiProfile } from "@/lib/server/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireApiProfile(request, ["REGULATOR"]);
    const entityId = request.nextUrl.searchParams.get("entityId");
    const entityType = request.nextUrl.searchParams.get("entityType");

    let query = supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ auditLogs: data ?? [] });
  } catch (error) {
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await requireApiProfile(request);
    const body = await request.json();
    const normalized = normalizeAuditLogRecord(body);
    const actorId = profile.id;
    const entityType = normalized.entity_type;
    const entityId = normalized.entity_id;
    const action = normalized.action;

    if (!entityType || !entityId || !action) {
      return NextResponse.json(
        { error: "entityType, entityId, and action are required" },
        { status: 400 }
      );
    }

    const payload = {
      ...buildAuditLogPayload(body),
      actor_id: actorId ?? null,
      entity_type: entityType,
      entity_id: entityId,
      action,
    };

    const { data, error } = await supabaseAdmin.from("audit_logs").insert(payload).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ auditLog: data }, { status: 201 });
  } catch (error) {
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
