import { NextRequest, NextResponse } from "next/server";

import { normalizeBatchRecord } from "@/lib/data-model";
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

    if (profile.role === "FARMER" && data.registered_by !== profile.id) {
      throw new ApiAuthError("You may only view your own batch records.", 403);
    }

    return NextResponse.json({ batch: data });
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
    await requireApiProfile(request, ["REGULATOR"]);
    const body = await request.json();
    const normalized = normalizeBatchRecord(body);
    const updatePayload = {
      farm_id: normalized.farm_id ?? undefined,
      crop_type: normalized.crop_type ?? undefined,
      quantity_kg: normalized.quantity_kg ?? undefined,
      seed_variety: normalized.seed_variety ?? undefined,
      is_gmo_free: normalized.is_gmo_free ?? undefined,
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
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
