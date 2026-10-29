import { NextRequest, NextResponse } from "next/server";

import { buildBatchPayload, normalizeBatchRecord } from "@/lib/data-model";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiAuthErrorResponse, requireApiProfile } from "@/lib/server/api-auth";

export async function GET(request: NextRequest) {
  try {
    const profile = await requireApiProfile(request);
    const farmId = request.nextUrl.searchParams.get("farmId");
    const status = request.nextUrl.searchParams.get("status");

    let query = supabaseAdmin
      .from("batches")
      .select("*, farms(farm_name, location)")
      .order("registered_at", { ascending: false });

    if (profile.role === "FARMER") {
      query = query.eq("registered_by", profile.id);
    }

    if (farmId) {
      query = query.eq("farm_id", farmId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ batches: data ?? [] });
  } catch (error) {
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await requireApiProfile(request, ["FARMER"]);
    const body = await request.json();
    const normalized = normalizeBatchRecord(body);
    const batchId = normalized.batch_id;
    const farmId = normalized.farm_id;
    const registeredBy = profile.id;

    if (!batchId || !farmId || !registeredBy) {
      return NextResponse.json(
        {
          error: "batchId, farmId, and registeredBy are required",
        },
        { status: 400 }
      );
    }

    const payload = {
      ...buildBatchPayload(body),
      batch_id: batchId,
      farm_id: farmId,
      registered_by: registeredBy,
    };

    if (!payload.crop_type) {
      return NextResponse.json({ error: "cropType is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("batches").insert(payload).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ batch: data }, { status: 201 });
  } catch (error) {
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
