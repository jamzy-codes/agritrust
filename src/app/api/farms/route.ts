import { NextRequest, NextResponse } from "next/server";

import { buildFarmPayload, normalizeFarmRecord } from "@/lib/data-model";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiAuthErrorResponse, requireApiProfile } from "@/lib/server/api-auth";

export async function GET(request: NextRequest) {
  try {
    const profile = await requireApiProfile(request);
    const ownerId = request.nextUrl.searchParams.get("ownerId");

    let query = supabaseAdmin
      .from("farms")
      .select("*")
      .order("created_at", { ascending: false });

    if (profile.role === "FARMER") {
      query = query.eq("owner_id", profile.id);
    } else if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ farms: data ?? [] });
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
    const normalized = normalizeFarmRecord(body);
    const ownerId = profile.id;
    const farmName = normalized.farm_name;
    const location = normalized.location;

    if (!ownerId || !farmName || !location) {
      return NextResponse.json(
        {
          error: "ownerId, farmName, and location are required",
        },
        { status: 400 }
      );
    }

    const payload = {
      ...buildFarmPayload(body),
      owner_id: ownerId,
      farm_name: farmName,
      location,
    };

    const { data, error } = await supabaseAdmin.from("farms").insert(payload).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ farm: data }, { status: 201 });
  } catch (error) {
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
