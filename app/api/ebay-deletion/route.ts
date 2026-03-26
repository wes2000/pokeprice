import { NextRequest, NextResponse } from "next/server";

const VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN || "pokeprice-ebay-verify-2026";

// eBay marketplace account deletion/closure notification endpoint
// Required for production API keys — PokéPrice stores no eBay user data,
// so we just acknowledge the notification.

export async function GET(req: NextRequest) {
  // eBay sends a challenge_code to verify endpoint ownership
  const challengeCode = req.nextUrl.searchParams.get("challenge_code");
  if (challengeCode) {
    // eBay expects: SHA-256 hash of challengeCode + verificationToken + endpoint URL
    const crypto = await import("crypto");
    const endpoint = `${req.nextUrl.origin}/api/ebay-deletion`;
    const hash = crypto
      .createHash("sha256")
      .update(challengeCode + VERIFICATION_TOKEN + endpoint)
      .digest("hex");
    return NextResponse.json({ challengeResponse: hash });
  }
  return NextResponse.json({ status: "ok" });
}

export async function POST() {
  // Account deletion notification — we store no user data, just acknowledge
  return NextResponse.json({ status: "ok" });
}
