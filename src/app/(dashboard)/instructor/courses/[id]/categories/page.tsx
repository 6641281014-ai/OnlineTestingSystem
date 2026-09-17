"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FolderTree,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  Loader2,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";

interface Category {
  id: string;
  name: string;
  description?: string | null;
  _count: {
    questions: number;
  };
}

export default function CourseCategoriesPage({
  params,
}: {
  params: { id: string };
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/${params.id}/categories`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch {
      setFeedback({ type: "error", message: "ไม่สามารถโหลดข้อมูลหมวดหมู่ได้" });
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenCreate = () => {
    setName("");
    setDescription("");
    setModalError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setSelectedCategory(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setModalError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (cat: Category) => {
    setSelectedCategory(cat);
    setModalError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/courses/${params.id}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalError(data.message || "เกิดข้อผิดพลาดในการสร้างหมวดหมู่");
        setSubmitting(false);
        return;
      }

      setIsCreateModalOpen(false);
      setFeedback({ type: "success", message: "สร้างหมวดหมู่สำเร็จ" });
      fetchCategories();
    } catch {
      setModalError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalError(data.message || "เกิดข้อผิดพลาดในการแก้ไข");
        setSubmitting(false);
        return;
      }

      setIsEditModalOpen(false);
      setFeedback({ type: "success", message: "แก้ไขหมวดหมู่สำเร็จ" });
      fetchCategories();
    } catch {
      setModalError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalError(data.message || "ไม่สามารถลบหมวดหมู่ได้");
        setSubmitting(false);
        return;
      }

      setIsDeleteModalOpen(false);
      setFeedback({ type: "success", message: "ลบหมวดหมู่เรียบร้อยแล้ว" });
      fetchCategories();
    } catch {
      setModalError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/instructor/courses/${params.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-3 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> กลับไปยังภาพรวมรายวิชา
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              หมวดหมู่ข้อสอบ (Question Categories)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              จัดกลุ่มข้อสอบตามบทเรียนหรือหัวข้อ เพื่อความสะดวกในการสร้างแบบทดสอบ
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" /> เพิ่มหมวดหมู่ใหม่
          </button>
        </div>
      </div>

      {feedback && <Alert type={feedback.type} message={feedback.message} className="mb-4" />}

      {/* Categories List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">กำลังโหลดหมวดหมู่...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FolderTree className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ยังไม่มีหมวดหมู่ข้อสอบ</h3>
            <p className="text-xs text-slate-500 mt-1">
              สร้างหมวดหมู่เพื่อจัดระเบียบข้อสอบตามบทเรียนหรือหัวข้อที่ต้องการ
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-semibold text-xs hover:bg-indigo-100 transition"
            >
              <Plus className="w-4 h-4" /> สร้างหมวดหมู่แรก
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">#</th>
                  <th className="px-6 py-3.5">ชื่อหมวดหมู่ / บทเรียน</th>
                  <th className="px-6 py-3.5">คำอธิบาย</th>
                  <th className="px-6 py-3.5">จำนวนข้อสอบ</th>
                  <th className="px-6 py-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 text-xs text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">{cat.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {cat.description || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                        <HelpCircle className="w-3.5 h-3.5" /> {cat._count.questions} ข้อ
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="เพิ่มหมวดหมู่ข้อสอบใหม่"
      >
        {modalError && <Alert type="error" message={modalError} className="mb-4" />}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อหมวดหมู่ / บทเรียน *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น บทที่ 1: การเขียนโปรแกรมเบื้องต้น"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              คำอธิบาย (Description)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="รายละเอียดหัวข้อย่อยหรือขอบเขตเนื้อหา..."
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
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              บันทึกหมวดหมู่
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="แก้ไขหมวดหมู่ข้อสอบ"
      >
        {modalError && <Alert type="error" message={modalError} className="mb-4" />}
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อหมวดหมู่ / บทเรียน *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              คำอธิบาย (Description)
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

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="ยืนยันการลบหมวดหมู่"
        maxWidth="sm"
      >
        {modalError && <Alert type="error" message={modalError} className="mb-4" />}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              คุณต้องการลบหมวดหมู่ <span className="font-bold">{selectedCategory?.name}</span> หรือไม่?
              ข้อสอบในหมวดหมู่นี้จะไม่ถูกลบ แต่จะถูกย้ายเป็นไม่มีหมวดหมู่
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDelete}
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
