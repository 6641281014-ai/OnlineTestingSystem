"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  BadgeCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [studentOrTeacherId, setStudentOrTeacherId] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email validation regex
  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim();

    // Client-side quick checks
    if (!firstName.trim()) {
      setError("กรุณากรอกชื่อ");
      return;
    }
    if (!lastName.trim()) {
      setError("กรุณากรอกนามสกุล");
      return;
    }
    if (!cleanEmail) {
      setError("กรุณากรอกอีเมล");
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setError("กรุณากรอกอีเมลให้ถูกต้องตามรูปแบบ (เช่น user@example.com)");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          studentOrTeacherId: studentOrTeacherId || null,
          role,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
        setLoading(false);
        return;
      }

      setSuccess("สมัครสมาชิกสำเร็จ! กำลังนำท่านไปยังหน้าเข้าสู่ระบบ...");
      setLoading(false);

      // Redirect to /login after 1.5s
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30 text-white mb-3">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ระบบทดสอบออนไลน์
          </h1>
          <p className="text-indigo-200 text-xs sm:text-sm mt-0.5">
            เพื่อประเมินผลสัมฤทธิ์ทางการเรียน
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">สมัครสมาชิก</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              สร้างบัญชีเพื่อเข้าใช้งานระบบ
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="เช่น สมชาย"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  นามสกุล <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="เช่น ใจดี"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Email & Student/Teacher ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อีเมล (Email) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสประจำตัว (ถ้ามี)
                </label>
                <div className="relative">
                  <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentOrTeacherId}
                    onChange={(e) => setStudentOrTeacherId(e.target.value)}
                    placeholder="เช่น 65010001"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm bg-slate-50/50 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                บทบาทผู้ใช้งาน <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("STUDENT")}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition text-left ${
                    role === "STUDENT"
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm"
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      role === "STUDENT"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">นักศึกษา (Student)</div>
                    <div className="text-[10px] text-slate-500">เข้าสอบ & ดูผลคะแนน</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("TEACHER")}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition text-left ${
                    role === "TEACHER"
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm"
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      role === "TEACHER"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">อาจารย์ (Teacher)</div>
                    <div className="text-[10px] text-slate-500">สร้างข้อสอบ & วิจัย</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่าน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={loading || Boolean(success)}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm bg-slate-50/50 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || Boolean(success)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                    title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ยืนยันรหัสผ่าน <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    disabled={loading || Boolean(success)}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm bg-slate-50/50 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading || Boolean(success)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none"
                    title={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="w-full mt-3 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังสมัครสมาชิก...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  สมัครสมาชิกสำเร็จ!
                </>
              ) : (
                <>
                  สมัครสมาชิก
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Link to Login */}
            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">มีบัญชีอยู่แล้ว? </span>
              <Link
                href="/login"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition"
              >
                เข้าสู่ระบบ
              </Link>
            </div>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          โครงงานปริญญานิพนธ์ — ระบบทดสอบออนไลน์เพื่อประเมินผลสัมฤทธิ์ทางการเรียน
        </div>
      </div>
    </div>
  );
}
