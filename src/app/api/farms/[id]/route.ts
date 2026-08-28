import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("farms")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "Farm not found" }, { status: 404 });
    }

    return NextResponse.json({ farm: data });
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
      farm_name: body.farmName ?? body.farm_name,
      location: body.location,
      gps_coordinates: body.gpsCoordinates ?? body.gps_coordinates,
      nasc_registration: body.nascRegistration ?? body.nasc_registration,
      primary_crops: Array.isArray(body.primaryCrops)
        ? body.primaryCrops
        : body.primary_crops,
      farm_photo_url: body.farmPhotoUrl ?? body.farm_photo_url,
      updated_at: new Date().toISOString(),
    };

    const cleanedPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(cleanedPayload).length === 0) {
      return NextResponse.json({ error: "No farm fields supplied" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("farms")
      .update(cleanedPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ farm: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
