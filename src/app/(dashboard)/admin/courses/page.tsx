"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Search,
  ArrowRight,
  Shield,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  Loader2,
  ChevronRight,
  Sparkles,
  Calendar,
  GraduationCap,
  Filter,
  User,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";

interface CourseItem {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  academicYear?: string | null;
  semester?: number | null;
  isActive: boolean;
  createdAt: string;
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    enrollments: number;
    questions: number;
    exams: number;
  };
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("ALL");

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "ไม่สามารถดึงข้อมูลรายวิชาได้");
        setLoading(false);
        return;
      }
      setCourses(data.courses || []);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Derived filter calculations
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.instructor.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSemester =
      semesterFilter === "ALL" || String(c.semester) === semesterFilter;

    return matchesSearch && matchesSemester;
  });

  // Calculate Institutional Metrics
  const totalCourses = courses.length;
  const uniqueInstructors = new Set(courses.map((c) => c.instructor.id)).size;
  const totalEnrollments = courses.reduce((acc, c) => acc + (c._count?.enrollments || 0), 0);
  const totalExams = courses.reduce((acc, c) => acc + (c._count?.exams || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Academic Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link
          href="/admin/dashboard"
          className="hover:text-indigo-600 transition flex items-center gap-1"
        >
          <Shield className="w-3.5 h-3.5 text-indigo-600" /> แดชบอร์ด
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-semibold">ทะเบียนรายวิชาทั้งหมด</span>
      </nav>

      {/* 2. Executive Hero Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-50/70 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>ทะเบียนรายวิชาและหลักสูตรระดับสถาบัน (Institutional Course Registry)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              รายวิชาทั้งหมดในระบบ (All Courses)
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
              ภาพรวมรายวิชาที่อาจารย์ผู้สอนเปิดสอนในระบบ พร้อมสถิติจำนวนนักศึกษา คลังข้อสอบ และแบบทดสอบที่จัดสอบ
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-center min-w-[95px]">
              <div className="text-[11px] text-slate-400 font-medium">รายวิชาทั้งหมด</div>
              <div className="text-xl font-extrabold text-slate-900 font-mono">{totalCourses}</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-blue-50 border border-blue-100 text-center min-w-[95px]">
              <div className="text-[11px] text-blue-700 font-medium">อาจารย์ผู้สอน</div>
              <div className="text-xl font-extrabold text-blue-800 font-mono">{uniqueInstructors}</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center min-w-[95px]">
              <div className="text-[11px] text-emerald-700 font-medium">ลงทะเบียนรวม</div>
              <div className="text-xl font-extrabold text-emerald-800 font-mono">{totalEnrollments}</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-purple-50 border border-purple-100 text-center min-w-[95px]">
              <div className="text-[11px] text-purple-700 font-medium">แบบทดสอบรวม</div>
              <div className="text-xl font-extrabold text-purple-800 font-mono">{totalExams}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหารหัสวิชา, ชื่อวิชา, หรือชื่ออาจารย์ผู้สอน..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Semester Filter */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>ภาคเรียน:</span>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">ทั้งหมดทุกภาคเรียน</option>
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
              <option value="3">ภาคเรียนฤดูร้อน</option>
            </select>
          </div>

          <button
            onClick={fetchCourses}
            title="รีเฟรชข้อมูล"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* 4. Institutional Courses Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              รายการรายวิชาในระบบ ({filteredCourses.length} รายวิชา)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงข้อมูลหลักสูตร อาจารย์ผู้รับผิดชอบ และสถิติทรัพยากรทางการศึกษา
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลทะเบียนรายวิชา...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ไม่พบรายวิชาที่ตรงกับเงื่อนไข</h3>
            <p className="text-xs text-slate-500">ลองเปลี่ยนคำค้นหาหรือตัวกรองภาคเรียน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-4">รหัสวิชา</th>
                  <th className="px-6 py-4">ชื่อรายวิชา</th>
                  <th className="px-6 py-4">อาจารย์ผู้รับผิดชอบ</th>
                  <th className="px-6 py-4">ปีการศึกษา / ภาคเรียน</th>
                  <th className="px-6 py-4 text-center">นักศึกษา (คน)</th>
                  <th className="px-6 py-4 text-center">ข้อสอบ (ข้อ)</th>
                  <th className="px-6 py-4 text-center">แบบทดสอบ (ชุด)</th>
                  <th className="px-6 py-4 text-right">การเข้าถึง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 leading-snug">{c.title}</div>
                      {c.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 max-w-sm">
                          {c.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {c.instructor.name ? c.instructor.name.trim().charAt(0) : "T"}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{c.instructor.name}</div>
                          <div className="text-slate-400 text-[11px]">{c.instructor.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        ปี {c.academicYear || "2569"} / ภาค {c.semester || "1"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {c._count?.enrollments || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                        {c._count?.questions || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        {c._count?.exams || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/instructor/courses/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition border border-indigo-100"
                      >
                        ดูข้อมูลวิชา <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

