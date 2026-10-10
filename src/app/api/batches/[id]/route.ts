import { NextRequest, NextResponse } from "next/server";

import { normalizeBatchRecord } from "@/lib/data-model";
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
    const normalized = normalizeBatchRecord(body);
    const updatePayload = {
      farm_id: normalized.farm_id ?? undefined,
      crop_type: normalized.crop_type ?? undefined,
      quantity_kg: normalized.quantity_kg ?? undefined,
      seed_variety: normalized.seed_variety ?? undefined,
      is_gmo_free: normalized.is_gmo_free ?? undefined,
      gmo_status: normalized.gmo_status ?? undefined,
      status: normalized.status ?? undefined,
      tx_hash: normalized.tx_hash ?? undefined,
      metadata_uri: normalized.metadata_uri ?? undefined,
      metadata_hash: normalized.metadata_hash ?? undefined,
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
