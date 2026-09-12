import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const farmId = request.nextUrl.searchParams.get("farmId");
    const status = request.nextUrl.searchParams.get("status");

    let query = supabaseAdmin
      .from("batches")
      .select("*, farms(farm_name, location)")
      .order("registered_at", { ascending: false });

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
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const batchId = body.batchId ?? body.batch_id;
    const farmId = body.farmId ?? body.farm_id;
    const registeredBy = body.registeredBy ?? body.registered_by;

    if (!batchId || !farmId || !registeredBy) {
      return NextResponse.json(
        {
          error: "batchId, farmId, and registeredBy are required",
        },
        { status: 400 }
      );
    }

    const payload = {
      batch_id: batchId,
      farm_id: farmId,
      registered_by: registeredBy,
      crop_type: body.cropType ?? body.crop_type,
      quantity_kg: Number(body.quantityKg ?? body.quantity_kg ?? 0),
      seed_variety: body.seedVariety ?? body.seed_variety ?? null,
      is_gmo_free: Boolean(body.isGMOFree ?? body.is_gmo_free ?? false),
      gmo_status: body.gmoStatus ?? body.gmo_status ?? "farmer_declared",
      status: body.status ?? "REGISTERED",
      tx_hash: body.txHash ?? body.tx_hash ?? null,
      metadata_uri: body.metadataUri ?? body.metadata_uri ?? null,
      metadata_hash: body.metadataHash ?? body.metadata_hash ?? null,
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
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
