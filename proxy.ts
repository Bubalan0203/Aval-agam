import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (host.endsWith(".vercel.app")) {
    const redirectUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      "https://www.avalagam.com"
    );
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}
