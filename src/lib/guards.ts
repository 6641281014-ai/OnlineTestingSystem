import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, verifyToken } from "./auth";
import { prisma } from "./prisma";
import { Role, UserSessionPayload } from "@/types/auth";

export async function getCurrentUser(): Promise<UserSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !payload.id) return null;

  // Verify that the user is still active in the database
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true, studentOrTeacherId: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    studentOrTeacherId: user.studentOrTeacherId,
  };
}

export async function requireAuth(): Promise<UserSessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(allowedRoles: Role[]): Promise<UserSessionPayload> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    // Redirect to their appropriate dashboard if they don't have access to this page
    if (user.role === "ADMIN") redirect("/admin/dashboard");
    if (user.role === "TEACHER") redirect("/instructor/courses");
    if (user.role === "STUDENT") redirect("/student/dashboard");
    redirect("/login");
  }
  return user;
}
