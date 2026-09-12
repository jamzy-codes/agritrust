import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
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
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actorId = body.actorId ?? body.actor_id;
    const entityType = body.entityType ?? body.entity_type;
    const entityId = body.entityId ?? body.entity_id;
    const action = body.action;

    if (!entityType || !entityId || !action) {
      return NextResponse.json(
        { error: "entityType, entityId, and action are required" },
        { status: 400 }
      );
    }

    const payload = {
      actor_id: actorId ?? null,
      entity_type: entityType,
      entity_id: entityId,
      action,
      details_json: body.details ?? body.details_json ?? {},
    };

    const { data, error } = await supabaseAdmin.from("audit_logs").insert(payload).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ auditLog: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
