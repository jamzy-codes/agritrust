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
    if (profile.id !== id && profile.role !== "REGULATOR") {
      throw new ApiAuthError("You may only view your own profile.", 403);
    }
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, full_name, email, role, wallet_address")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: data });
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
    const profile = await requireApiProfile(request);
    if (profile.id !== id) {
      throw new ApiAuthError("You may only update your own profile.", 403);
    }
    const body = await request.json();
    const updatePayload = {
      full_name: body.fullName ?? body.full_name,
      wallet_address: body.walletAddress ?? body.wallet_address,
    };

    const cleanedPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(cleanedPayload).length === 0) {
      return NextResponse.json({ error: "No user fields supplied" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(cleanedPayload)
      .eq("id", id)
      .select("id, full_name, email, role, wallet_address")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    const authResponse = apiAuthErrorResponse(error);
    if (authResponse) return authResponse;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
