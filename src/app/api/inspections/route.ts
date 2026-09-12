import { NextRequest, NextResponse } from "next/server";

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
    const batchId = body.batchId ?? body.batch_id;
    const inspectorId = body.inspectorId ?? body.inspector_id;

    if (!batchId || !inspectorId) {
      return NextResponse.json(
        { error: "batchId and inspectorId are required" },
        { status: 400 }
      );
    }

    const payload = {
      batch_id: batchId,
      inspector_id: inspectorId,
      result: body.result ?? body.inspection_result ?? "PENDING",
      notes: body.notes ?? null,
      passed: Boolean(body.passed ?? false),
      quality_grade: body.qualityGrade ?? body.quality_grade ?? null,
      gmo_test_result: body.gmoTestResult ?? body.gmo_test_result ?? null,
      certificate_issued: Boolean(body.certificateIssued ?? body.certificate_issued ?? false),
      tx_hash: body.txHash ?? body.tx_hash ?? null,
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
