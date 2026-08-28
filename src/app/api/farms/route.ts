import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const ownerId = request.nextUrl.searchParams.get("ownerId");

    let query = supabaseAdmin
      .from("farms")
      .select("*")
      .order("created_at", { ascending: false });

    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ farms: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const farmName = body.farmName ?? body.farm_name;
    const location = body.location ?? body.locationName;
    const ownerId = body.ownerId ?? body.owner_id;

    if (!ownerId || !farmName || !location) {
      return NextResponse.json(
        {
          error: "ownerId, farmName, and location are required",
        },
        { status: 400 }
      );
    }

    const payload = {
      owner_id: ownerId,
      farm_name: farmName,
      location,
      gps_coordinates: body.gpsCoordinates ?? body.gps_coordinates ?? null,
      nasc_registration: body.nascRegistration ?? body.nasc_registration ?? null,
      primary_crops: Array.isArray(body.primaryCrops)
        ? body.primaryCrops
        : body.primary_crops ?? null,
      farm_photo_url: body.farmPhotoUrl ?? body.farm_photo_url ?? null,
    };

    const { data, error } = await supabaseAdmin.from("farms").insert(payload).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ farm: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
