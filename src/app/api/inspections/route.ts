import { NextRequest, NextResponse } from "next/server";

import { buildInspectionPayload, normalizeInspectionRecord } from "@/lib/data-model";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiAuthErrorResponse, requireApiProfile } from "@/lib/server/api-auth";

export async function GET(request: NextRequest) {
  try {
    await requireApiProfile(request);
    const batchId = request.nextUrl.searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("inspections")
      .select("*")
      .eq("batch_id", batchId)
      .order("inspected_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ inspections: data ?? [] });
  } catch (error) {
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await requireApiProfile(request, ["INSPECTOR"]);
    const body = await request.json();
    const normalized = normalizeInspectionRecord(body);
    const batchId = normalized.batch_id;
    const inspectorId = profile.id;

    if (!batchId || !inspectorId || !normalized.inspected_at) {
      return NextResponse.json(
        { error: "batchId, inspectorId, and inspectedAt are required" },
        { status: 400 }
      );
    }

    const payload = {
      ...buildInspectionPayload(body),
      batch_id: batchId,
      inspector_id: inspectorId,
    };

    const { data, error } = await supabaseAdmin.from("inspections").insert(payload).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ inspection: data }, { status: 201 });
  } catch (error) {
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
