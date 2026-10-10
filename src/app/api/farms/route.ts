import { NextRequest, NextResponse } from "next/server";

import { buildFarmPayload, normalizeFarmRecord } from "@/lib/data-model";
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
    const normalized = normalizeFarmRecord(body);
    const ownerId = normalized.owner_id;
    const farmName = normalized.farm_name ?? normalized.name;
    const location = normalized.location ?? normalized.region;

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
      region: location,
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
