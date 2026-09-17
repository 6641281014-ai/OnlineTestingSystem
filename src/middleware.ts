import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { UserSessionPayload } from "./types/auth";

const AUTH_COOKIE_NAME = "auth_token";
const JWT_SECRET = process.env.JWT_SECRET || "default-secret-change-in-production-min-32-chars-long";
const secretKey = new TextEncoder().encode(JWT_SECRET);

async function verifyTokenEdge(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as UserSessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const session = token ? await verifyTokenEdge(token) : null;

  // Root redirect
  if (pathname === "/") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    if (session.role === "TEACHER") return NextResponse.redirect(new URL("/instructor/dashboard", request.url));
    if (session.role === "STUDENT") return NextResponse.redirect(new URL("/student/dashboard", request.url));
  }

  // If visiting /login while already logged in
  if (pathname === "/login") {
    if (session) {
      if (session.role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      if (session.role === "TEACHER") return NextResponse.redirect(new URL("/instructor/dashboard", request.url));
      if (session.role === "STUDENT") return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect Admin Routes
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    }
    if (session.role !== "ADMIN") {
      // Redirect to their respective dashboard
      if (session.role === "TEACHER") return NextResponse.redirect(new URL("/instructor/dashboard", request.url));
      if (session.role === "STUDENT") return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
  }

  // Protect Instructor Routes
  if (pathname.startsWith("/instructor")) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    }
    if (session.role !== "TEACHER" && session.role !== "ADMIN") {
      if (session.role === "STUDENT") return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
  }

  // Protect Student Routes
  if (pathname.startsWith("/student")) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    }
    if (session.role !== "STUDENT" && session.role !== "ADMIN") {
      if (session.role === "TEACHER") return NextResponse.redirect(new URL("/instructor/courses", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/instructor/:path*",
    "/student/:path*",
  ],
};
