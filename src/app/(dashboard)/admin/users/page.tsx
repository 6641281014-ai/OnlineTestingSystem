"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  GraduationCap,
  BookOpen,
  Search,
  Filter,
  Plus,
  Edit,
  KeyRound,
  Eye,
  Power,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  ShieldAlert,
  ArrowUpDown,
  Lock,
  ChevronRight,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  studentOrTeacherId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    enrollments: number;
    coursesTeaching: number;
    attempts: number;
  };
}

interface SummaryStats {
  totalUsers: number;
  studentCount: number;
  teacherCount: number;
  adminCount: number;
  activeCount: number;
  inactiveCount: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentOrTeacherId: "",
    role: "STUDENT" as "STUDENT" | "TEACHER" | "ADMIN",
    password: "",
    isActive: true,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    studentOrTeacherId: "",
    role: "STUDENT" as "STUDENT" | "TEACHER" | "ADMIN",
    isActive: true,
  });

  const [targetRole, setTargetRole] = useState<"STUDENT" | "TEACHER" | "ADMIN">("STUDENT");
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch current user & list
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current logged-in user identity
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) setCurrentUserId(meData.user.id);
      }

      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (roleFilter !== "ALL") params.append("role", roleFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "ไม่สามารถดึงข้อมูลผู้ใช้งานได้");
        setLoading(false);
        return;
      }

      setUsers(data.data || []);
      setSummary(data.summary || null);
      setLoading(false);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalMessage(null);
    setActionLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalMessage({ type: "error", text: data.message || "เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน" });
        return;
      }

      setModalMessage({ type: "success", text: "สร้างผู้ใช้งานสำเร็จ" });
      setTimeout(() => {
        setIsCreateOpen(false);
        setCreateForm({
          firstName: "",
          lastName: "",
          email: "",
          studentOrTeacherId: "",
          role: "STUDENT",
          password: "",
          isActive: true,
        });
        setModalMessage(null);
        fetchUsers();
      }, 800);
    } catch {
      setModalMessage({ type: "error", text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit User
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalMessage(null);
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalMessage({ type: "error", text: data.message || "เกิดข้อผิดพลาดในการแก้ไขผู้ใช้งาน" });
        return;
      }

      // Optimistically update user in table
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                name: editForm.name,
                email: editForm.email,
                studentOrTeacherId: editForm.studentOrTeacherId,
                role: editForm.role,
                isActive: editForm.isActive,
              }
            : u
        )
      );

      setModalMessage({ type: "success", text: "แก้ไขข้อมูลผู้ใช้งานสำเร็จ" });
      setTimeout(() => {
        setIsEditOpen(false);
        setModalMessage(null);
        fetchUsers();
      }, 800);
    } catch {
      setModalMessage({ type: "error", text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Change Role
  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalMessage(null);
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalMessage({ type: "error", text: data.message || "เกิดข้อผิดพลาดในการเปลี่ยนบทบาท" });
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, role: targetRole } : u))
      );

      setModalMessage({ type: "success", text: "เปลี่ยนบทบาทสำเร็จ" });
      setTimeout(() => {
        setIsRoleOpen(false);
        setModalMessage(null);
        fetchUsers();
      }, 800);
    } catch {
      setModalMessage({ type: "error", text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Toggle Status (Activate / Deactivate)
  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    setModalMessage(null);
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !selectedUser.isActive }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalMessage({ type: "error", text: data.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ" });
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, isActive: !selectedUser.isActive } : u))
      );

      setModalMessage({
        type: "success",
        text: selectedUser.isActive ? "ระงับการใช้งานบัญชีสำเร็จ" : "เปิดการใช้งานบัญชีสำเร็จ",
      });
      setTimeout(() => {
        setIsStatusOpen(false);
        setModalMessage(null);
        fetchUsers();
      }, 800);
    } catch {
      setModalMessage({ type: "error", text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalMessage(null);
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalMessage({ type: "error", text: data.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" });
        return;
      }

      setModalMessage({ type: "success", text: "รีเซ็ตรหัสผ่านใหม่สำเร็จ" });
      setTimeout(() => {
        setIsResetPassOpen(false);
        setNewPassword("");
        setModalMessage(null);
      }, 800);
    } catch {
      setModalMessage({ type: "error", text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      studentOrTeacherId: user.studentOrTeacherId || "",
      role: user.role,
      isActive: user.isActive,
    });
    setModalMessage(null);
    setActionLoading(false);
    setIsEditOpen(true);
  };

  const openRoleModal = (user: UserItem) => {
    setSelectedUser(user);
    setTargetRole(user.role);
    setModalMessage(null);
    setActionLoading(false);
    setIsRoleOpen(true);
  };

  const openStatusModal = (user: UserItem) => {
    setSelectedUser(user);
    setModalMessage(null);
    setActionLoading(false);
    setIsStatusOpen(true);
  };

  const openResetPassModal = (user: UserItem) => {
    setSelectedUser(user);
    setNewPassword("");
    setModalMessage(null);
    setActionLoading(false);
    setIsResetPassOpen(true);
  };

  const openViewModal = (user: UserItem) => {
    setSelectedUser(user);
    setActionLoading(false);
    setIsViewOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setActionLoading(false);
    setModalMessage(null);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setActionLoading(false);
    setModalMessage(null);
  };

  const closeRoleModal = () => {
    setIsRoleOpen(false);
    setActionLoading(false);
    setModalMessage(null);
  };

  const closeStatusModal = () => {
    setIsStatusOpen(false);
    setActionLoading(false);
    setModalMessage(null);
  };

  const closeResetPassModal = () => {
    setIsResetPassOpen(false);
    setActionLoading(false);
    setModalMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Academic Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <span className="flex items-center gap-1 text-slate-500">
          <Shield className="w-3.5 h-3.5 text-indigo-600" /> ศูนย์บริหารจัดการระบบ
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-700 font-semibold">การบริหารจัดการบัญชีและสิทธิ์การใช้งาน</span>
      </nav>

      {/* 2. Executive IAM Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-50/70 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>ระบบบริหารจัดการบัญชีและสิทธิ์การใช้งาน (Institutional Identity & Access Management - IAM)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              จัดการผู้ใช้งานในระบบ
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
              ค้นหา ตรวจสอบ ปรับเปลี่ยนบทบาททางวิชาการ และกำกับดูแลสถานะบัญชีผู้ใช้งานระดับสถาบัน
            </p>
          </div>

          <div>
            <button
              onClick={() => {
                setModalMessage(null);
                setActionLoading(false);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              เพิ่มผู้ใช้งานใหม่
            </button>
          </div>
        </div>
      </div>

      {/* 3. Summary Stat Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">ผู้ใช้ทั้งหมด</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{summary.totalUsers}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">นักศึกษา (STUDENT)</span>
              <GraduationCap className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">{summary.studentCount}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">อาจารย์ (TEACHER)</span>
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-600 mt-2 font-mono">{summary.teacherCount}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">ผู้ดูแล (ADMIN)</span>
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-600 mt-2 font-mono">{summary.adminCount}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">เปิดใช้งานปกติ</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{summary.activeCount}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">ระงับการใช้งาน</span>
              <UserX className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-2 font-mono">{summary.inactiveCount}</div>
          </div>
        </div>
      )}

      {/* 4. Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อ-สกุล, อีเมล, หรือรหัสประจำตัว..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>บทบาท:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">ทั้งหมดทุกบทบาท</option>
              <option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</option>
              <option value="TEACHER">TEACHER (อาจารย์ผู้สอน)</option>
              <option value="STUDENT">STUDENT (นักศึกษา)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>สถานะ:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">ทั้งหมดทุกสถานะ</option>
              <option value="ACTIVE">ACTIVE (เปิดใช้งาน)</option>
              <option value="INACTIVE">INACTIVE (ถูกระงับ)</option>
            </select>
          </div>

          <button
            onClick={() => fetchUsers()}
            title="รีเฟรชข้อมูล"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* 5. Enterprise Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลผู้ใช้งานระบบ...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ไม่พบข้อมูลผู้ใช้งาน</h3>
            <p className="text-xs text-slate-500">ลองเปลี่ยนคำค้นหาหรือตัวกรองบทบาท/สถานะ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4">อีเมล</th>
                  <th className="px-6 py-4">รหัสประจำตัว</th>
                  <th className="px-6 py-4">บทบาท (Role)</th>
                  <th className="px-6 py-4">สถานะบัญชี</th>
                  <th className="px-6 py-4">วันที่สมัคร</th>
                  <th className="px-6 py-4 text-center">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const initial = u.name ? u.name.trim().charAt(0) : "U";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                              u.role === "ADMIN"
                                ? "bg-purple-100 text-purple-700"
                                : u.role === "TEACHER"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {u.name}
                              {isSelf && (
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                                  บัญชีคุณ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">{u.email}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">
                        {u.studentOrTeacherId || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold ${
                            u.role === "ADMIN"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : u.role === "TEACHER"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {u.role === "ADMIN"
                            ? "ผู้ดูแลระบบ (ADMIN)"
                            : u.role === "TEACHER"
                            ? "อาจารย์ (TEACHER)"
                            : "นักศึกษา (STUDENT)"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.isActive ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {u.isActive ? "ใช้งานได้ปกติ" : "ระงับการใช้งาน"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                          {/* View */}
                          <button
                            onClick={() => openViewModal(u)}
                            title="ดูรายละเอียดข้อมูล"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(u)}
                            title="แก้ไขข้อมูลผู้ใช้"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Change Role */}
                          <button
                            onClick={() => openRoleModal(u)}
                            disabled={isSelf}
                            title={isSelf ? "ไม่สามารถเปลี่ยนบทบาทบัญชีตนเองได้" : "เปลี่ยนบทบาท"}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>

                          {/* Toggle Status */}
                          <button
                            onClick={() => openStatusModal(u)}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? "ไม่สามารถระงับบัญชีตนเองได้"
                                : u.isActive
                                ? "ปิดการใช้งาน / ระงับบัญชี"
                                : "เปิดการใช้งาน"
                            }
                            className={`p-1.5 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${
                              u.isActive
                                ? "text-slate-500 hover:text-rose-600 hover:bg-white"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-white"
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => openResetPassModal(u)}
                            title="รีเซ็ตรหัสผ่านใหม่"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-white transition"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* ======================================================== */}
      {/* 1. CREATE USER MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="เพิ่มผู้ใช้งานใหม่ (Admin Create User)"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {modalMessage && (
            <Alert type={modalMessage.type} message={modalMessage.text} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createForm.firstName}
                onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                placeholder="เช่น สมชาย"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createForm.lastName}
                onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                placeholder="เช่น ใจดี"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              อีเมล <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสประจำตัว (ถ้ามี)
              </label>
              <input
                type="text"
                value={createForm.studentOrTeacherId}
                onChange={(e) =>
                  setCreateForm({ ...createForm, studentOrTeacherId: e.target.value })
                }
                placeholder="เช่น 65010001"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                บทบาท (Role) <span className="text-rose-500">*</span>
              </label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    role: e.target.value as "STUDENT" | "TEACHER" | "ADMIN",
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="STUDENT">STUDENT (นักศึกษา)</option>
                <option value="TEACHER">TEACHER (อาจารย์)</option>
                <option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสผ่านเริ่มต้น <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="create-isActive"
              checked={createForm.isActive}
              onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="create-isActive" className="text-xs font-medium text-slate-700">
              เปิดใช้งานบัญชีทันที (Active)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeCreateModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              บันทึกผู้ใช้งาน
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 2. EDIT USER MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditOpen}
        onClose={closeEditModal}
        title={`แก้ไขข้อมูล: ${selectedUser?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          {modalMessage && (
            <Alert type={modalMessage.type} message={modalMessage.text} />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อ-นามสกุล <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              อีเมล <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสประจำตัว
              </label>
              <input
                type="text"
                value={editForm.studentOrTeacherId}
                onChange={(e) =>
                  setEditForm({ ...editForm, studentOrTeacherId: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                บทบาท (Role)
              </label>
              <select
                value={editForm.role}
                disabled={selectedUser?.id === currentUserId}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    role: e.target.value as "STUDENT" | "TEACHER" | "ADMIN",
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="TEACHER">TEACHER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-isActive"
              checked={editForm.isActive}
              disabled={selectedUser?.id === currentUserId}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="edit-isActive" className="text-xs font-medium text-slate-700">
              สถานะเปิดใช้งาน (Active)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              บันทึกการแก้ไข
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 3. CHANGE ROLE MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRoleOpen}
        onClose={closeRoleModal}
        title={`เปลี่ยนบทบาท: ${selectedUser?.name}`}
        maxWidth="sm"
      >
        <form onSubmit={handleChangeRole} className="space-y-4">
          {modalMessage && (
            <Alert type={modalMessage.type} message={modalMessage.text} />
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">คำเตือน:</span> การเปลี่ยนบทบาทจะส่งผลต่อสิทธิ์การเข้าถึงเมนูและข้อมูลของระบบทันที
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              บทบาทใหม่
            </label>
            <select
              value={targetRole}
              onChange={(e) =>
                setTargetRole(e.target.value as "STUDENT" | "TEACHER" | "ADMIN")
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="STUDENT">STUDENT (นักศึกษา)</option>
              <option value="TEACHER">TEACHER (อาจารย์)</option>
              <option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeRoleModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              ยืนยันเปลี่ยนบทบาท
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 4. STATUS TOGGLE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isStatusOpen}
        onClose={closeStatusModal}
        title={selectedUser?.isActive ? "ยืนยันการระงับบัญชีผู้ใช้งาน" : "ยืนยันการเปิดใช้งานบัญชี"}
        maxWidth="sm"
      >
        <div className="space-y-4">
          {modalMessage && (
            <Alert type={modalMessage.type} message={modalMessage.text} />
          )}

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedUser?.isActive
                  ? "bg-rose-100 text-rose-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              <Power className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">{selectedUser?.name}</div>
              <div className="text-xs text-slate-500">{selectedUser?.email}</div>
            </div>
          </div>

          {selectedUser?.isActive ? (
            <p className="text-xs text-slate-600 leading-relaxed">
              คุณต้องการ <span className="font-bold text-rose-600">ระงับการใช้งาน (Deactivate)</span> บัญชีผู้ใช้นี้ใช่หรือไม่? เมื่อถูกระงับ ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง
            </p>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              คุณต้องการ <span className="font-bold text-emerald-600">เปิดใช้งาน (Activate)</span> บัญชีผู้ใช้นี้ใช่หรือไม่? ผู้ใช้จะสามารถเข้าสู่ระบบและทำรายการได้ตามปกติ
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeStatusModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={actionLoading}
              className={`px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 ${
                selectedUser?.isActive
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {selectedUser?.isActive ? "ยืนยันระงับบัญชี" : "ยืนยันเปิดใช้งาน"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 5. RESET PASSWORD MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isResetPassOpen}
        onClose={closeResetPassModal}
        title={`รีเซ็ตรหัสผ่าน: ${selectedUser?.name}`}
        maxWidth="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {modalMessage && (
            <Alert type={modalMessage.type} message={modalMessage.text} />
          )}

          <p className="text-xs text-slate-600">
            กรุณากรอกรหัสผ่านใหม่สำหรับผู้ใช้งานนี้ รหัสผ่านจะถูกเข้ารหัสก่อนบันทึกอย่างปลอดภัย
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสผ่านใหม่ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeResetPassModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              บันทึกรหัสผ่านใหม่
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 6. VIEW USER DETAILS MODAL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="รายละเอียดผู้ใช้งาน"
        maxWidth="md"
      >
        {selectedUser && (
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="font-bold text-base text-slate-900">{selectedUser.name}</div>
              <div className="text-xs text-slate-500">{selectedUser.email}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-1">รหัสประจำตัว</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedUser.studentOrTeacherId || "ไม่มีข้อมูล"}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-1">บทบาท (Role)</span>
                <span className="font-semibold text-slate-800">{selectedUser.role}</span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-1">สถานะบัญชี</span>
                <span
                  className={`font-semibold ${
                    selectedUser.isActive ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {selectedUser.isActive ? "เปิดใช้งาน (Active)" : "ระงับการใช้งาน (Inactive)"}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block mb-1">วันที่สร้างบัญชี</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedUser.createdAt).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {selectedUser._count && (
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div className="font-bold text-indigo-700 text-lg">
                    {selectedUser._count.enrollments}
                  </div>
                  <div className="text-slate-500 text-[10px]">รายวิชาที่ลงทะเบียน</div>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="font-bold text-blue-700 text-lg">
                    {selectedUser._count.coursesTeaching}
                  </div>
                  <div className="text-slate-500 text-[10px]">รายวิชาที่สอน</div>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div className="font-bold text-emerald-700 text-lg">
                    {selectedUser._count.attempts}
                  </div>
                  <div className="text-slate-500 text-[10px]">ครั้งที่เข้าสอบ</div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
