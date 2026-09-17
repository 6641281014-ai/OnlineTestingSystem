import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่ได้เข้าสู่ระบบ",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Auth Me Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้",
      },
      { status: 500 }
    );
  }
}
