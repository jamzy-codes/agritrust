import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("inspections")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    return NextResponse.json({ inspection: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updatePayload = {
      result: body.result,
      notes: body.notes,
      passed: body.passed,
      quality_grade: body.qualityGrade ?? body.quality_grade,
      gmo_test_result: body.gmoTestResult ?? body.gmo_test_result,
      certificate_issued: body.certificateIssued ?? body.certificate_issued,
      tx_hash: body.txHash ?? body.tx_hash,
      updated_at: new Date().toISOString(),
    };

    const cleanedPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(cleanedPayload).length === 0) {
      return NextResponse.json({ error: "No inspection fields supplied" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("inspections")
      .update(cleanedPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ inspection: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
