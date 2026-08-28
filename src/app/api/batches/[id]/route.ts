import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("batches")
      .select("*, farms(farm_name, location)")
      .eq("batch_id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({ batch: data });
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
      farm_id: body.farmId ?? body.farm_id,
      crop_type: body.cropType ?? body.crop_type,
      quantity_kg: body.quantityKg ?? body.quantity_kg,
      seed_variety: body.seedVariety ?? body.seed_variety,
      is_gmo_free: body.isGMOFree ?? body.is_gmo_free,
      gmo_status: body.gmoStatus ?? body.gmo_status,
      status: body.status,
      tx_hash: body.txHash ?? body.tx_hash,
      metadata_uri: body.metadataUri ?? body.metadata_uri,
      metadata_hash: body.metadataHash ?? body.metadata_hash,
      updated_at: new Date().toISOString(),
    };

    const cleanedPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(cleanedPayload).length === 0) {
      return NextResponse.json({ error: "No batch fields supplied" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("batches")
      .update(cleanedPayload)
      .eq("batch_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ batch: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
