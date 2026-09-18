"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Search,
  ArrowRight,
  FolderKanban,
  CheckCircle2,
  Plus,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";

interface Course {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  academicYear?: string | null;
  semester?: number | null;
  isEnrolled: boolean;
  enrolledAt?: string | null;
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    enrollments?: number;
    exams: number;
  };
}

export default function StudentCoursesPage() {
  const [activeTab, setActiveTab] = useState<"MY_COURSES" | "CATALOG">("MY_COURSES");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Enroll modal state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/courses?catalog=true");
      const data = await res.json();
      if (data.success) {
        setCourses(data.courses);
      }
    } catch {
      setFeedback({ type: "error", message: "ไม่สามารถโหลดข้อมูลรายวิชาได้" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleOpenEnrollModal = (course: Course) => {
    setSelectedCourse(course);
    setModalError(null);
    setIsEnrollModalOpen(true);
  };

  const handleOpenUnenrollModal = (course: Course) => {
    setSelectedCourse(course);
    setModalError(null);
    setIsUnenrollModalOpen(true);
  };

  const handleConfirmEnroll = async () => {
    if (!selectedCourse) return;
    setActionLoading(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}/enroll`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalError(data.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
        setActionLoading(false);
        return;
      }

      setIsEnrollModalOpen(false);
      setFeedback({ type: "success", message: data.message || "ลงทะเบียนเรียนสำเร็จ" });
      fetchCourses();
    } catch {
      setModalError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmUnenroll = async () => {
    if (!selectedCourse) return;
    setActionLoading(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}/enroll`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalError(data.message || "เกิดข้อผิดพลาดในการถอนรายวิชา");
        setActionLoading(false);
        return;
      }

      setIsUnenrollModalOpen(false);
      setFeedback({ type: "success", message: data.message || "ถอนการลงทะเบียนเรียบร้อยแล้ว" });
      fetchCourses();
    } catch {
      setModalError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setActionLoading(false);
    }
  };

  const myCourses = courses.filter((c) => c.isEnrolled);

  const filteredCatalog = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.instructor.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/student/dashboard" className="hover:text-emerald-600 transition">
          แดชบอร์ด
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">รายวิชาและการลงทะเบียน</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-mono">
                My Enrolled Courses
              </span>
              <span className="text-xs text-slate-400">ระบบลงทะเบียนและเข้าสู่ห้องเรียน</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              รายวิชาและการลงทะเบียนเรียน
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              ดูรายวิชาที่ลงทะเบียนแล้ว เข้าทำแบบทดสอบประจำวิชา และค้นหารายวิชาที่เปิดรับสมัคร
            </p>
          </div>
          <button
            onClick={() => {
              setActiveTab("CATALOG");
              setSearch("");
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition shrink-0"
          >
            <Search className="w-4 h-4" /> ค้นหารายวิชาเพื่อลงทะเบียน
          </button>
        </div>
      </div>

      {feedback && <Alert type={feedback.type} message={feedback.message} className="mb-4" />}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("MY_COURSES")}
          className={`pb-3 transition relative flex items-center gap-2 ${
            activeTab === "MY_COURSES"
              ? "text-emerald-600 border-b-2 border-emerald-600 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          รายวิชาของฉัน ({myCourses.length})
        </button>
        <button
          onClick={() => setActiveTab("CATALOG")}
          className={`pb-3 transition relative flex items-center gap-2 ${
            activeTab === "CATALOG"
              ? "text-emerald-600 border-b-2 border-emerald-600 font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Search className="w-4 h-4" />
          รายวิชาทั้งหมดที่เปิดรับ ({courses.length})
        </button>
      </div>

      {/* TAB 1: My Courses */}
      {activeTab === "MY_COURSES" && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium">กำลังโหลดรายวิชา...</p>
            </div>
          ) : myCourses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">ยังไม่มีรายวิชาที่ลงทะเบียน</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                คุณยังไม่ได้ลงทะเบียนในรายวิชาใดๆ สามารถค้นหารายวิชาและกดลงทะเบียนเรียนได้ทันที
              </p>
              <button
                onClick={() => setActiveTab("CATALOG")}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition shadow-sm"
              >
                <Plus className="w-4 h-4" /> ไปหน้ารายวิชาที่เปิดรับลงทะเบียน
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-mono">
                        {course.code}
                      </span>
                      <span className="text-xs text-slate-400">
                        ปี {course.academicYear || "2569"} / เทอม {course.semester || "1"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-2">{course.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                      {course.description || "ไม่มีคำอธิบายรายวิชา"}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600 mb-4">
                      <div>
                        <span className="text-slate-400">อาจารย์ผู้สอน: </span>
                        <span className="font-semibold text-slate-800">{course.instructor.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {course.instructor.email}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenUnenrollModal(course)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs"
                      title="ถอนการลงทะเบียน"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/student/courses/${course.id}`}
                      className="py-2 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      เข้าสู่รายวิชา <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Course Catalog */}
      {activeTab === "CATALOG" && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหารหัสวิชา, ชื่อวิชา, หรือชื่ออาจารย์ผู้สอน..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold px-2">
              พบ {filteredCatalog.length} รายวิชา
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium">กำลังโหลดรายวิชา...</p>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">ไม่พบรายวิชา</h3>
              <p className="text-xs text-slate-500 mt-1">
                ไม่พบรายวิชาที่ตรงกับคำค้นหา &quot;{search}&quot;
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCatalog.map((course) => (
                <div
                  key={course.id}
                  className={`bg-white rounded-2xl border p-6 shadow-sm transition flex flex-col justify-between ${
                    course.isEnrolled
                      ? "border-emerald-200 bg-emerald-50/10"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono">
                        {course.code}
                      </span>
                      {course.isEnrolled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ลงทะเบียนแล้ว
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          เปิดรับลงทะเบียน
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-2">{course.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                      {course.description || "ไม่มีคำอธิบายรายวิชา"}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">ผู้สอน:</span>
                        <span className="font-semibold text-slate-800">{course.instructor.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">นักศึกษา:</span>
                        <span className="font-bold text-slate-700">{course._count?.enrollments || 0} คน</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">แบบทดสอบ:</span>
                        <span className="font-bold text-emerald-700">{course._count.exams} ชุด</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    {course.isEnrolled ? (
                      <Link
                        href={`/student/courses/${course.id}`}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
                      >
                        เข้าสู่รายวิชา <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleOpenEnrollModal(course)}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> ลงทะเบียนรายวิชานี้
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enroll Confirmation Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="ยืนยันการลงทะเบียนเรียน"
        maxWidth="md"
      >
        {modalError && <Alert type="error" message={modalError} className="mb-4" />}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
            <div className="font-bold text-sm text-emerald-900">รายละเอียดรายวิชา:</div>
            <div className="space-y-1">
              <div><span className="font-semibold">รหัสวิชา:</span> {selectedCourse?.code}</div>
              <div><span className="font-semibold">ชื่อวิชา:</span> {selectedCourse?.title}</div>
              <div><span className="font-semibold">อาจารย์ผู้สอน:</span> {selectedCourse?.instructor.name}</div>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            คุณต้องการลงทะเบียนเรียนในรายวิชานี้ด้วยตนเองหรือไม่? เมื่อลงทะเบียนแล้ว คุณจะสามารถเข้าถึงบทเรียนและแบบทดสอบในวิชานี้ได้ทันที
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirmEnroll}
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังลงทะเบียน...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  ยืนยันการลงทะเบียน
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Unenroll Confirmation Modal */}
      <Modal
        isOpen={isUnenrollModalOpen}
        onClose={() => setIsUnenrollModalOpen(false)}
        title="ยืนยันการถอนรายวิชา"
        maxWidth="md"
      >
        {modalError && <Alert type="error" message={modalError} className="mb-4" />}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
            <div className="font-bold text-sm text-rose-950">คำเตือนการถอนรายวิชา:</div>
            <div>คุณกำลังจะถอนรายวิชา <span className="font-bold">{selectedCourse?.code} {selectedCourse?.title}</span></div>
            <p className="text-[11px] text-rose-800">
              หากคุณมีประวัติการเข้าสอบแล้ว ระบบจะไม่อนุญาตให้ถอนรายวิชาเพื่อรักษาความถูกต้องของข้อมูลผลการเรียน
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUnenrollModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirmUnenroll}
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังถอน...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  ยืนยันถอนรายวิชา
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
