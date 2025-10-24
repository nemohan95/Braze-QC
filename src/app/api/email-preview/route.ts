import { NextRequest, NextResponse } from "next/server";

import { fetchBrazePreviewHtml, isHostAllowed } from "@/lib/brazePreview";
import { normaliseString } from "@/lib/normalise";
import { parseEmail } from "@/lib/parseEmail";
import { getClientIp } from "@/lib/requestContext";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(ip);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  let payload: { brazeUrl?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const brazeUrl = normaliseString(payload.brazeUrl);

  if (!brazeUrl) {
    return NextResponse.json({ error: "brazeUrl is required" }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(brazeUrl);
  } catch {
    return NextResponse.json({ error: "brazeUrl must be a valid URL" }, { status: 400 });
  }

  if (!isHostAllowed(targetUrl)) {
    return NextResponse.json({ error: "brazeUrl host is not permitted" }, { status: 400 });
  }

  try {
    const html = await fetchBrazePreviewHtml(targetUrl);
    const parsedEmail = parseEmail(html);

    return NextResponse.json({
      subject: parsedEmail.subject ?? null,
      preheader: parsedEmail.preheader ?? null,
      links: parsedEmail.links,
      ctas: parsedEmail.ctas,
    });
  } catch (error) {
    const message = (error as Error)?.message || "Failed to fetch preview";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
