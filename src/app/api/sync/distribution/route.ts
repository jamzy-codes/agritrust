import { NextRequest, NextResponse } from "next/server";

import {
  DistributionSyncError,
  inspectDistributionSync,
  synchronizeDistribution,
} from "@/lib/server/distribution-sync";
import { supabaseAdmin } from "@/lib/supabase-admin";

function redactErrorMessage(message: string) {
  return message
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/(authorization|apikey|api_key)\s*[:=]\s*\S+/gi, "$1=[redacted]");
}

function errorResponse(error: unknown) {
  if (error instanceof DistributionSyncError) {
    return NextResponse.json(
      { error: error.message, stage: error.stage },
      { status: error.status },
    );
  }
  const value = error as { name?: unknown; shortMessage?: unknown; message?: unknown; code?: unknown };
  console.error("[AgriTrust sync] Unexpected distribution synchronization error", {
    name: typeof value?.name === "string" ? value.name : "Error",
    shortMessage:
      typeof value?.shortMessage === "string" ? redactErrorMessage(value.shortMessage) : null,
    message: typeof value?.message === "string" ? redactErrorMessage(value.message) : "Unknown error",
    code:
      typeof value?.code === "string" || typeof value?.code === "number" ? value.code : null,
  });
  return NextResponse.json(
    { error: "Distribution synchronization is temporarily unavailable.", stage: "internal" },
    { status: 500 },
  );
}

function readBatchId(request: NextRequest, body?: unknown) {
  const bodyBatchId =
    body && typeof body === "object" && "batchId" in body
      ? (body as { batchId?: unknown }).batchId
      : null;
  const value =
    typeof bodyBatchId === "string"
      ? bodyBatchId.trim()
      : request.nextUrl.searchParams.get("batchId")?.trim();
  if (!value || !/^[A-Za-z0-9-]{1,100}$/.test(value)) {
    throw new DistributionSyncError("verification", "A valid batchId is required.", 400);
  }
  return value;
}

async function authenticateDistributor(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    throw new DistributionSyncError("authorization", "Authentication is required.", 401);
  }
  const { data: userResult, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userResult.user) {
    throw new DistributionSyncError("authorization", "The session is invalid or expired.", 401);
  }
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, role, wallet_address, status")
    .eq("id", userResult.user.id)
    .maybeSingle();
  if (profileError) {
    throw new DistributionSyncError("authorization", "The Distributor profile could not be verified.", 503);
  }
  if (
    !profile ||
    profile.role !== "DISTRIBUTOR" ||
    profile.status !== "active" ||
    typeof profile.wallet_address !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(profile.wallet_address)
  ) {
    throw new DistributionSyncError("authorization", "An active Distributor profile is required.", 403);
  }
  return { id: profile.id, wallet_address: profile.wallet_address };
}

export async function GET(request: NextRequest) {
  try {
    const profile = await authenticateDistributor(request);
    const batchId = readBatchId(request);
    return NextResponse.json(await inspectDistributionSync(batchId, profile));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await authenticateDistributor(request);
    const body = await request.json().catch(() => null);
    const batchId = readBatchId(request, body);
    return NextResponse.json(await synchronizeDistribution(batchId, profile));
  } catch (error) {
    return errorResponse(error);
  }
}
