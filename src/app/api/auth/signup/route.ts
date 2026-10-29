import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Use the anonymous client so the project's normal signup, rate-limit, and
// email-confirmation settings remain authoritative. Never expose or use the
// service-role credential for a public account-creation endpoint.
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, phone } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName ?? null,
          phone: phone ?? null,
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: data.user });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error during signup" },
      { status: 500 }
    );
  }
}
