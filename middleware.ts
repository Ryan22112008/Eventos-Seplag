import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = ["/participante", "/organizador", "/admin", "/avaliador"];

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const developmentSources = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const websocketSource = process.env.NODE_ENV === "development" ? " ws://localhost:*" : "";
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentSources}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "frame-src https://www.google.com",
    `connect-src 'self'${websocketSource}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  requestHeaders.set("x-nonce", nonce);

  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`));
  const devMockMode = process.env.NODE_ENV !== "production" && process.env.DEV_MOCK_MODE === "true";
  let response: NextResponse;
  if (isProtected && !request.cookies.has("eventos_session")) {
    const loginUrl = new URL("/login", request.url);
    response = NextResponse.redirect(loginUrl);
  } else if (isProtected && devMockMode && !request.nextUrl.pathname.startsWith("/participante") && !["/organizador", "/admin", "/avaliador/trabalhos"].includes(request.nextUrl.pathname)) {
    requestHeaders.set("x-dev-mock-path", request.nextUrl.pathname);
    response = NextResponse.rewrite(new URL("/dev-mock", request.url), { request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
