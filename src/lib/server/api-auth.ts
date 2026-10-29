import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../supabase-admin";
import type { UserRole } from "@/types";

export interface ApiProfile {
  id: string;
  role: UserRole;
  status: string;
  wallet_address: string | null;
}

export class ApiAuthError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiAuthError";
  }
}

export async function requireApiProfile(
  request: NextRequest,
  allowedRoles?: UserRole[],
): Promise<ApiProfile> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!token) throw new ApiAuthError("Authentication is required.", 401);

  const { data: authResult, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authResult.user) {
    throw new ApiAuthError("The session is invalid or expired.", 401);
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, role, status, wallet_address")
    .eq("id", authResult.user.id)
    .maybeSingle();
  if (profileError) throw new ApiAuthError("The user profile could not be verified.", 503);
  if (!profile || profile.status !== "active") {
    throw new ApiAuthError("An active AgriTrust profile is required.", 403);
  }
  if (allowedRoles && !allowedRoles.includes(profile.role as UserRole)) {
    throw new ApiAuthError("This role is not authorized for the requested operation.", 403);
  }
  return profile as ApiProfile;
}

export function apiAuthErrorResponse(error: unknown) {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

