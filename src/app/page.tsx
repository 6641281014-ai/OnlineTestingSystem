import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "ADMIN") redirect("/admin/dashboard");
  if (user.role === "TEACHER") redirect("/instructor/courses");
  if (user.role === "STUDENT") redirect("/student/dashboard");

  redirect("/login");
}
