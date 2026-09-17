"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Users,
  HelpCircle,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  AlertCircle,
  Edit2,
  Trash2,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";

interface Course {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  academicYear?: string | null;
  semester?: number | null;
  isActive: boolean;
  _count: {
    enrollments: number;
    questions: number;
    exams: number;
  };
}

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [academicYear, setAcademicYear] = useState("2569");
  const [semester, setSemester] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/courses");
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

  const handleOpenCreate = () => {
    setCode("");
    setTitle("");
    setDescription("");
    setAcademicYear("2569");
    setSemester("1");
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setSelectedCourse(course);
    setCode(course.code);
    setTitle(course.title);
    setDescription(course.description || "");
    setAcademicYear(course.academicYear || "2569");
    setSemester(String(course.semester || "1"));
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (course: Course) => {
    setSelectedCourse(course);
    setFormError(null);
    setSubmitting(false);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDelete = () => {
    setIsDeleteModalOpen(false);
    setFormError(null);
    setSubmitting(false);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          title,
          description,
          academicYear,
          semester: Number(semester),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || "เกิดข้อผิดพลาดในการสร้างรายวิชา");
        setSubmitting(false);
        return;
      }

      setIsCreateModalOpen(false);
      setFeedback({ type: "success", message: "สร้างรายวิชาสำเร็จเรียบร้อยแล้ว" });
      fetchCourses();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          title,
          description,
          academicYear,
          semester: Number(semester),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || "เกิดข้อผิดพลาดในการแก้ไขรายวิชา");
        setSubmitting(false);
        return;
      }

      setIsEditModalOpen(false);
      setFeedback({ type: "success", message: "แก้ไขข้อมูลรายวิชาสำเร็จ" });
      fetchCourses();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.message || "ไม่สามารถลบรายวิชาได้");
        setSubmitting(false);
        return;
      }

      setIsDeleteModalOpen(false);
      setFeedback({ type: "success", message: "ลบรายวิชาเรียบร้อยแล้ว" });
      setCourses((prev) => prev.filter((c) => c.id !== selectedCourse.id));
      fetchCourses();
    } catch {
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            รายวิชาที่รับผิดชอบ
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            จัดการรายวิชา คลังข้อสอบ และรายชื่อนักศึกษาในชั้นเรียน
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          สร้างรายวิชาใหม่
        </button>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          className="mb-4"
        />
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัสวิชา หรือชื่อวิชา..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium px-2">
          ทั้งหมด {filteredCourses.length} รายวิชา
        </div>
      </div>

      {/* Course List Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">กำลังโหลดรายวิชา...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">ไม่พบรายวิชา</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search ? "ไม่พบวิชาที่ตรงกับการค้นหา" : "คุณยังไม่ได้สร้างรายวิชาในระบบ"}
          </p>
          {!search && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-semibold text-xs hover:bg-indigo-100 transition"
            >
              <Plus className="w-4 h-4" /> สร้างรายวิชาแรกของคุณ
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono">
                    {course.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">
                      ปีการศึกษา {course.academicYear || "2569"} / เทอม {course.semester || "1"}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(course)}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                      title="แก้ไขรายวิชา"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(course)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                      title="ลบรายวิชา"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <Link
                  href={`/instructor/courses/${course.id}`}
                  className="group block"
                >
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1 mb-1">
                    {course.title}
                  </h3>
                </Link>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">
                  {course.description || "ไม่มีคำอธิบายรายวิชา"}
                </p>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100">
                <Link
                  href={`/instructor/courses/${course.id}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  จัดการรายวิชา <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="สร้างรายวิชาใหม่"
      >
        {formError && <Alert type="error" message={formError} className="mb-4" />}
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสวิชา (Course Code) *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น CPE101, CS202"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ปีการศึกษา / ภาคเรียน
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2569"
                  className="w-2/3 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-1/3 px-2 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">เทอม 1</option>
                  <option value="2">เทอม 2</option>
                  <option value="3">ฤดูร้อน</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อรายวิชา (Course Title) *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น การเขียนโปรแกรมคอมพิวเตอร์พื้นฐาน"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              คำอธิบายรายวิชา (Description)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="รายละเอียดเนื้อหา และวัตถุประสงค์ของรายวิชา..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              บันทึกรายวิชา
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="แก้ไขข้อมูลรายวิชา"
      >
        {formError && <Alert type="error" message={formError} className="mb-4" />}
        <form onSubmit={handleEditCourse} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสวิชา (Course Code) *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ปีการศึกษา / ภาคเรียน
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-2/3 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-1/3 px-2 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">เทอม 1</option>
                  <option value="2">เทอม 2</option>
                  <option value="3">ฤดูร้อน</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อรายวิชา (Course Title) *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              คำอธิบายรายวิชา (Description)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึกการแก้ไข
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Course Confirm Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDelete}
        title="ยืนยันการลบรายวิชา"
        maxWidth="sm"
      >
        {formError && <Alert type="error" message={formError} className="mb-4" />}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              คุณต้องการลบรายวิชา <span className="font-bold">{selectedCourse?.code} - {selectedCourse?.title}</span> หรือไม่?
              <span className="block mt-1 text-slate-600">
                หากรายวิชานี้มีประวัติการเข้าสอบหรือคำตอบของนักศึกษาแล้ว ระบบจะป้องกันการลบเพื่อรักษาความถูกต้องของข้อมูลงานวิจัย
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseDelete}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDeleteCourse}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 disabled:opacity-70"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              ยืนยันการลบ
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
