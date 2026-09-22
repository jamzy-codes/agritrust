import { NextRequest, NextResponse } from "next/server";

import { buildCertificatePayload, normalizeCertificateRecord } from "@/lib/data-model";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const batchId = request.nextUrl.searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("certificates")
      .select("*")
      .eq("batch_id", batchId)
      .order("issued_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ certificates: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalized = normalizeCertificateRecord(body);
    const batchId = normalized.batch_id;
    const inspectorId = normalized.inspector_id;

    if (!batchId || !inspectorId) {
      return NextResponse.json(
        { error: "batchId and inspectorId are required" },
        { status: 400 }
      );
    }

    const payload = {
      ...buildCertificatePayload(body),
      batch_id: batchId,
      inspector_id: inspectorId,
    };

    if (!payload.certificate_number) {
      return NextResponse.json({ error: "certificateNumber is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("certificates").insert(payload).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ certificate: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
