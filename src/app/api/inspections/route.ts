import { NextRequest, NextResponse } from "next/server";

import { buildInspectionPayload, normalizeInspectionRecord } from "@/lib/data-model";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const batchId = request.nextUrl.searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("inspections")
      .select("*")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ inspections: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalized = normalizeInspectionRecord(body);
    const batchId = normalized.batch_id;
    const inspectorId = normalized.inspector_id;

    if (!batchId || !inspectorId) {
      return NextResponse.json(
        { error: "batchId and inspectorId are required" },
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
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
