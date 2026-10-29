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
    if (profile.role === "FARMER" && data.owner_id !== profile.id) {
      throw new ApiAuthError("You may only view your own farm.", 403);
    }

    return NextResponse.json({ farm: data });
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
    const profile = await requireApiProfile(request, ["FARMER", "REGULATOR"]);
    const { data: existingFarm, error: existingError } = await supabaseAdmin
      .from("farms")
      .select("owner_id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });
    if (!existingFarm) return NextResponse.json({ error: "Farm not found" }, { status: 404 });
    if (profile.role !== "REGULATOR" && existingFarm.owner_id !== profile.id) {
      throw new ApiAuthError("You may only update your own farm.", 403);
    }
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
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
