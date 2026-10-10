import { NextRequest, NextResponse } from "next/server";

import { normalizeBatchRecord } from "@/lib/data-model";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const normalized = normalizeBatchRecord(body);
    const status = normalized.status ?? body.status ?? body.newStatus;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("batches")
      .update({ status, updated_at: new Date().toISOString() })
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
