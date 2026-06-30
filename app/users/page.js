"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AccountHeader from "../components/AccountHeader";
import LogoutButton from "../components/LogoutButton";
import { supabase } from "../lib/supabase";

import {
  FaBox,
  FaChartBar,
  FaEdit,
  FaExclamationTriangle,
  FaHistory,
  FaHome,
  FaPlus,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaShoppingCart,
  FaSyncAlt,
  FaThLarge,
  FaTimes,
  FaTrash,
  FaUserCheck,
  FaUserSlash,
  FaUsers,
} from "react-icons/fa";

const EMPTY_FORM = {
  display_name: "",
  employee_code: "",
  position: "พนักงานขาย",
  phone: "",
  email: "",
  password: "",
  role: "user",
  is_active: true,
};

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isUserActive(user) {
  return user?.is_active !== false;
}

function getRoleLabel(role) {
  return role === "admin" ? "Admin" : "User";
}

async function adminRequest(url, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "ทำรายการไม่สำเร็จ");
  }

  return data;
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentUserId, setCurrentUserId] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");

  async function loadUsers() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await adminRequest("/api/admin/users");

      const mappedUsers = (data.users || []).map((user) => ({
        ...user,
        is_active: user.is_active !== false,
      }));

      setUsers(mappedUsers);
    } catch (error) {
      setUsers([]);
      setErrorMessage(error.message || "ไม่สามารถโหลดข้อมูลผู้ใช้งานได้");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id || "");
    }

    void loadCurrentUser();
    void loadUsers();

    function handleFocus() {
      void loadUsers();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const search = normalizeValue(keyword);

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        [
          user.display_name,
          user.email,
          user.employee_code,
          user.phone,
          user.position,
          user.role,
        ].some((value) => normalizeValue(value).includes(search));

      const active = isUserActive(user);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && active) ||
        (filter === "inactive" && !active) ||
        (filter === "admin" && user.role === "admin") ||
        (filter === "user" && user.role !== "admin");

      return matchesSearch && matchesFilter;
    });
  }, [users, keyword, filter]);

  const activeCount = useMemo(() => {
    return users.filter((user) => isUserActive(user)).length;
  }, [users]);

  const inactiveCount = useMemo(() => {
    return users.filter((user) => !isUserActive(user)).length;
  }, [users]);

  const adminCount = useMemo(() => {
    return users.filter((user) => user.role === "admin").length;
  }, [users]);

  const userCount = useMemo(() => {
    return users.filter((user) => user.role !== "admin").length;
  }, [users]);

  const isEditingSelf =
    String(editingUser?.id || "") === String(currentUserId || "");

  function resetModal() {
    setShowModal(false);
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setFormError("");
  }

  function openAddModal() {
    setModalMode("add");
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(user) {
    setModalMode("edit");
    setEditingUser(user);
    setFormError("");

    setFormData({
      display_name: user.display_name || "",
      employee_code: user.employee_code || "",
      position: user.position || "พนักงานขาย",
      phone: user.phone || "",
      email: user.email || "",
      password: "",
      role: user.role || "user",
      is_active: isUserActive(user),
    });

    setShowModal(true);
  }

  function closeModal() {
    if (isSaving) return;

    resetModal();
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSave(event) {
    event.preventDefault();

    const displayName = formData.display_name.trim();
    const email = formData.email.trim().toLowerCase();

    if (!displayName || !email) {
      setFormError("กรุณากรอกชื่อพนักงานและอีเมล");
      return;
    }

    if (!email.includes("@")) {
      setFormError("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    if (modalMode === "add" && formData.password.length < 8) {
      setFormError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (
      modalMode === "edit" &&
      formData.password &&
      formData.password.length < 8
    ) {
      setFormError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (modalMode === "edit" && isEditingSelf && !formData.is_active) {
      setFormError("ไม่สามารถปิดใช้งานบัญชีของตนเองได้");
      return;
    }

    if (
      modalMode === "edit" &&
      isEditingSelf &&
      formData.role !== "admin"
    ) {
      setFormError("ไม่สามารถลดสิทธิ์ Admin ของบัญชีตนเองได้");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const payload = {
        ...formData,
        display_name: displayName,
        employee_code: formData.employee_code.trim(),
        position: formData.position.trim(),
        phone: formData.phone.trim(),
        email,
      };

      if (modalMode === "add") {
        await adminRequest("/api/admin/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await adminRequest(`/api/admin/users?id=${editingUser.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      await loadUsers();
      resetModal();

      alert(
        modalMode === "add"
          ? "เพิ่มพนักงานสำเร็จ"
          : "แก้ไขข้อมูลพนักงานสำเร็จ"
      );
    } catch (error) {
      setFormError(error.message || "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user) {
    const isSelf = String(user.id) === String(currentUserId);

    if (isSelf) {
      alert("ไม่สามารถลบบัญชีของตนเองได้");
      return;
    }

    const confirmed = window.confirm(
      `ต้องการลบบัญชี "${user.display_name}" ใช่หรือไม่?\n\nผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้อีก`
    );

    if (!confirmed) return;

    try {
      await adminRequest(`/api/admin/users?id=${user.id}`, {
        method: "DELETE",
      });

      await loadUsers();
      alert("ลบบัญชีผู้ใช้งานสำเร็จ");
    } catch (error) {
      alert(error.message || "ลบบัญชีไม่สำเร็จ");
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setKeyword("");
    setFilter("all");

    await loadUsers();

    setIsRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-[290px] min-h-screen shrink-0 bg-[#182232] text-white">
        <div className="rounded-br-[42px] bg-red-600 px-7 py-8 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
              🥤
            </div>

            <div>
              <h2 className="text-lg font-bold">ระบบบริหารจัดการ</h2>

              <p className="text-xs text-white/80">
                ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-2 p-5">
          <p className="px-4 pb-1 pt-2 text-xs text-slate-400">
            เมนูหลัก
          </p>

          <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />
          <Menu icon={<FaBox />} text="สินค้า" href="/products" />

          <Menu
            icon={<FaThLarge />}
            text="หมวดหมู่สินค้า"
            href="/categories"
          />

          <Menu
            icon={<FaShoppingCart />}
            text="การขาย"
            href="/sales"
          />

          <Menu
            icon={<FaHistory />}
            text="ประวัติสต๊อก"
            href="/stock-movements"
          />

          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
          <Menu active icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />

          <div className="pt-5">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-6 xl:p-10">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900">
                ผู้ใช้งาน
              </h1>

              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                <FaShieldAlt />
                Admin
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              เพิ่ม แก้ไข ปิดใช้งาน และจัดการสิทธิ์ผู้ใช้งานในระบบ
            </p>
          </div>

          <AccountHeader />
        </header>

        {errorMessage && (
          <section className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            <FaExclamationTriangle className="mt-1 shrink-0" />
            <p>{errorMessage}</p>
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรช"}
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white hover:bg-red-700"
              >
                <FaPlus />
                เพิ่มพนักงาน
              </button>
            </div>

            <div className="relative w-full 2xl:w-[420px]">
              <FaSearch className="absolute left-4 top-4 text-slate-400" />

              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="ค้นหาชื่อ อีเมล รหัสพนักงาน หรือเบอร์โทร"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-800 outline-none focus:border-red-500 focus:bg-white"
              />
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            title="ผู้ใช้งานทั้งหมด"
            value={`${users.length} คน`}
            detail="บัญชีผู้ใช้งานในระบบ"
            icon={<FaUsers />}
            color="blue"
          />

          <SummaryCard
            title="ใช้งานอยู่"
            value={`${activeCount} คน`}
            detail="สามารถเข้าสู่ระบบได้"
            icon={<FaUserCheck />}
            color="green"
          />

          <SummaryCard
            title="ปิดใช้งาน"
            value={`${inactiveCount} คน`}
            detail="ไม่สามารถเข้าสู่ระบบได้"
            icon={<FaUserSlash />}
            color="orange"
          />

          <SummaryCard
            title="สิทธิ์ Admin"
            value={`${adminCount} คน`}
            detail={`พนักงานทั่วไป ${userCount} คน`}
            icon={<FaShieldAlt />}
            color="red"
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                รายชื่อผู้ใช้งาน
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                แสดง {filteredUsers.length} จาก {users.length} บัญชี
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                ทั้งหมด
              </FilterButton>

              <FilterButton
                active={filter === "active"}
                onClick={() => setFilter("active")}
              >
                ใช้งาน
              </FilterButton>

              <FilterButton
                active={filter === "inactive"}
                onClick={() => setFilter("inactive")}
              >
                ปิดใช้งาน
              </FilterButton>

              <FilterButton
                active={filter === "admin"}
                onClick={() => setFilter("admin")}
              >
                Admin
              </FilterButton>

              <FilterButton
                active={filter === "user"}
                onClick={() => setFilter("user")}
              >
                User
              </FilterButton>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-5 py-4 text-left font-semibold">#</th>
                  <th className="px-5 py-4 text-left font-semibold">
                    รหัสพนักงาน
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    ชื่อ-นามสกุล
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    ตำแหน่ง
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    เบอร์โทรศัพท์
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    อีเมล
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    สิทธิ์
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    สถานะ
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    วันที่เพิ่ม
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    จัดการ
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      กำลังโหลดข้อมูลผู้ใช้งาน...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredUsers.map((user, index) => {
                    const isSelf =
                      String(user.id) === String(currentUserId);

                    return (
                      <tr
                        key={user.id}
                        className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-slate-400">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-semibold text-slate-600">
                            {user.employee_code || "-"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {user.display_name || "-"}
                            </p>

                            {isSelf && (
                              <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                                บัญชีของคุณ
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {user.position || "-"}
                        </td>

                        <td className="px-5 py-4">{user.phone || "-"}</td>

                        <td className="px-5 py-4">{user.email || "-"}</td>

                        <td className="px-5 py-4">
                          <RoleBadge role={user.role} />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge isActive={isUserActive(user)} />
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatDate(user.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-600 hover:bg-blue-100"
                              title="แก้ไขผู้ใช้งาน"
                            >
                              <FaEdit />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              disabled={isSelf}
                              className={`rounded-xl border p-3 ${
                                isSelf
                                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                  : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                              }`}
                              title={
                                isSelf
                                  ? "ไม่สามารถลบบัญชีของตนเองได้"
                                  : "ลบผู้ใช้งาน"
                              }
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!isLoading && filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      ไม่พบผู้ใช้งานตามเงื่อนไขที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form
            onSubmit={handleSave}
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl md:p-8"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-6 top-6 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <FaTimes className="text-xl" />
            </button>

            <h2 className="text-2xl font-bold text-slate-900">
              {modalMode === "add" ? "เพิ่มพนักงาน" : "แก้ไขพนักงาน"}
            </h2>

            <p className="mt-1 text-slate-500">
              ข้อมูลจะบันทึกใน Supabase Auth และ profiles
            </p>

            {formError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                {formError}
              </div>
            )}

            <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field
                label="ชื่อ-นามสกุล"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="เช่น สมชาย ใจดี"
              />

              <Field
                label="รหัสพนักงาน"
                name="employee_code"
                value={formData.employee_code}
                onChange={handleChange}
                placeholder="เช่น EMP003"
              />

              <Field
                label="ตำแหน่ง"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="เช่น พนักงานขาย"
              />

              <Field
                label="เบอร์โทรศัพท์"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="เช่น 0812345678"
              />

              <Field
                label="อีเมล"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="เช่น user@email.com"
              />

              <Field
                label={
                  modalMode === "add"
                    ? "รหัสผ่าน"
                    : "รหัสผ่านใหม่ (เว้นว่างได้)"
                }
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={
                  modalMode === "add"
                    ? "อย่างน้อย 8 ตัวอักษร"
                    : "กรอกเมื่อต้องการเปลี่ยนรหัสผ่าน"
                }
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  สิทธิ์การใช้งาน
                </label>

                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isEditingSelf}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="user">User — พนักงานทั่วไป</option>
                  <option value="admin">Admin — ผู้ดูแลระบบ</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  disabled={isEditingSelf}
                  className="h-5 w-5 accent-red-600 disabled:cursor-not-allowed"
                />

                <div>
                  <p className="font-medium text-slate-800">
                    เปิดใช้งานบัญชีนี้
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {isEditingSelf
                      ? "บัญชีของคุณต้องเปิดใช้งานอยู่เสมอ"
                      : "ปิดใช้งานแล้วผู้ใช้จะเข้าสู่ระบบไม่ได้"}
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-5 py-3 text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white hover:bg-red-700 disabled:bg-red-300"
              >
                <FaSave />
                {isSaving ? "กำลังบันทึก..." : "บันทึกผู้ใช้งาน"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Menu({ icon, text, href, active }) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-4 rounded-xl px-4 py-3.5 transition ${
        active
          ? "bg-red-600 text-white shadow-lg"
          : "text-slate-200 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{text}</span>
    </Link>
  );
}

function FilterButton({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-red-600 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === "admin";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        isAdmin
          ? "bg-red-100 text-red-700"
          : "bg-blue-100 text-blue-700"
      }`}
    >
      {getRoleLabel(role)}
    </span>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        isActive
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-200 text-slate-600"
      }`}
    >
      {isActive ? "ใช้งาน" : "ปิดใช้งาน"}
    </span>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-red-500"
      />
    </div>
  );
}

function SummaryCard({ title, value, detail, icon, color }) {
  const styles = {
    blue: {
      icon: "bg-blue-100 text-blue-600",
      line: "bg-blue-500",
    },
    green: {
      icon: "bg-emerald-100 text-emerald-600",
      line: "bg-emerald-500",
    },
    orange: {
      icon: "bg-orange-100 text-orange-600",
      line: "bg-orange-500",
    },
    red: {
      icon: "bg-red-100 text-red-600",
      line: "bg-red-500",
    },
  };

  const style = styles[color] || styles.blue;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`absolute left-0 top-0 h-1 w-full ${style.line}`} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {value}
          </h2>

          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}