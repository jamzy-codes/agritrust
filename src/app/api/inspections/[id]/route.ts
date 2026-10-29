import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiAuthErrorResponse, ApiAuthError, requireApiProfile } from "@/lib/server/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await requireApiProfile(request);
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
    if (profile.role === "INSPECTOR" && data.inspector_id !== profile.id) {
      throw new ApiAuthError("You may only view your own inspection record.", 403);
    }

    return NextResponse.json({ inspection: data });
  } catch (error) {
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
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
    const profile = await requireApiProfile(request, ["INSPECTOR"]);
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("inspections")
      .select("inspector_id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });
    if (!existing) return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    if (existing.inspector_id !== profile.id) {
      throw new ApiAuthError("You may only update your own inspection record.", 403);
    }
    const body = await request.json();
    const updatePayload = {
      weight_kg: body.weightKg ?? body.weight_kg,
      quality_grade: body.qualityGrade ?? body.quality_grade,
      gmo_test_result: body.gmoTestResult ?? body.gmo_test_result,
      certificate_issued: body.certificateIssued ?? body.certificate_issued,
      tx_hash: body.txHash ?? body.tx_hash,
      inspected_at: body.inspectedAt ?? body.inspected_at,
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
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
