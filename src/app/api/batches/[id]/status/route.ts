import { NextRequest, NextResponse } from "next/server";

import { normalizeBatchRecord } from "@/lib/data-model";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { apiAuthErrorResponse, requireApiProfile } from "@/lib/server/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireApiProfile(request, ["REGULATOR"]);
    const body = await request.json();
    const normalized = normalizeBatchRecord(body);
    const status = normalized.status ?? body.status ?? body.newStatus;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    if (status !== "FLAGGED") {
      return NextResponse.json(
        { error: "Generic status updates are disabled; lifecycle status must be synchronized from chain." },
        { status: 409 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("batches")
      .update({ status })
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
