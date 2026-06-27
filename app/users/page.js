"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import LogoutButton from "../components/LogoutButton";
import AccountHeader from "../components/AccountHeader";
import {
  FaHome,
  FaBox,
  FaThLarge,
  FaShoppingCart,
  FaUsers,
  FaChartBar,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaSyncAlt,
  FaSave,
  FaTimes,
} from "react-icons/fa";

const emptyForm = {
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

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

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
      setUsers(data.users || []);
    } catch (error) {
      setUsers([]);
      setErrorMessage(error.message);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return users.filter((user) => {
      const matchSearch =
        !search ||
        [
          user.display_name,
          user.email,
          user.employee_code,
          user.phone,
          user.position,
        ].some((value) =>
          String(value || "").toLowerCase().includes(search)
        );

      const matchFilter =
        filter === "all" ||
        (filter === "active" && user.is_active) ||
        (filter === "inactive" && !user.is_active) ||
        (filter === "admin" && user.role === "admin");

      return matchSearch && matchFilter;
    });
  }, [users, keyword, filter]);

  const activeCount = users.filter((user) => user.is_active).length;
  const inactiveCount = users.filter((user) => !user.is_active).length;
  const adminCount = users.filter((user) => user.role === "admin").length;

  function openAddModal() {
    setModalMode("add");
    setEditingUser(null);
    setFormData(emptyForm);
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
      is_active: user.is_active !== false,
    });

    setShowModal(true);
  }

  function closeModal() {
    if (isSaving) return;

    setShowModal(false);
    setEditingUser(null);
    setFormData(emptyForm);
    setFormError("");
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

    if (!formData.display_name.trim() || !formData.email.trim()) {
      setFormError("กรุณากรอกชื่อพนักงานและอีเมล");
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

    setIsSaving(true);
    setFormError("");

    try {
      const payload = {
        ...formData,
        display_name: formData.display_name.trim(),
        employee_code: formData.employee_code.trim(),
        position: formData.position.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
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
      closeModal();

      alert(
        modalMode === "add"
          ? "เพิ่มพนักงานสำเร็จ"
          : "แก้ไขข้อมูลพนักงานสำเร็จ"
      );
    } catch (error) {
      setFormError(error.message);
    }

    setIsSaving(false);
  }

  async function handleDelete(user) {
    const confirmed = window.confirm(
      `ต้องการลบบัญชี "${user.display_name}" ใช่หรือไม่?`
    );

    if (!confirmed) return;

    try {
      await adminRequest(`/api/admin/users?id=${user.id}`, {
        method: "DELETE",
      });

      await loadUsers();
      alert("ลบบัญชีผู้ใช้งานสำเร็จ");
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadUsers();
    setIsRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">
      <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden">
        <div className="bg-red-600 p-8 rounded-br-[45px]">
          <div className="text-3xl">🥤</div>
          <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2>
          <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p>
        </div>

        <nav className="p-6 space-y-4">
          <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />
          <Menu icon={<FaBox />} text="สินค้า" href="/products" />
          <Menu
            icon={<FaThLarge />}
            text="หมวดหมู่สินค้า"
            href="/categories"
          />
          <Menu icon={<FaShoppingCart />} text="การขาย" href="/sales" />
          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
          <Menu active icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
          <LogoutButton />
        </nav>
      </aside>

      <main className="flex-1 min-w-0 p-6 xl:p-10">
        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-6 mb-8">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold text-gray-900">
                ผู้ใช้งาน
              </h1>

              <span className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold">
                เฉพาะ Admin เท่านั้น
              </span>
            </div>

            <p className="text-gray-500 mt-2">
              Users &gt; จัดการผู้ใช้งานในระบบ
            </p>
          </div>

          <AccountHeader />
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-6">
          <FilterButton
            text="ทั้งหมด"
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />

          <FilterButton
            text="ใช้งานอยู่"
            active={filter === "active"}
            onClick={() => setFilter("active")}
          />

          <FilterButton
            text="ไม่ใช้งาน"
            active={filter === "inactive"}
            onClick={() => setFilter("inactive")}
          />

          <FilterButton
            text="Admin"
            active={filter === "admin"}
            onClick={() => setFilter("admin")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 mb-6">
          <Summary
            title="พนักงานทั้งหมด"
            value={`${users.length} คน`}
            color="red"
          />
          <Summary
            title="ใช้งานอยู่"
            value={`${activeCount} คน`}
            color="green"
          />
          <Summary
            title="ไม่ใช้งาน"
            value={`${inactiveCount} คน`}
            color="orange"
          />
          <Summary
            title="สิทธิ์ Admin"
            value={`${adminCount} คน`}
            color="blue"
          />
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col xl:flex-row xl:justify-between gap-4 mb-6">
            <div className="relative w-full xl:w-[520px]">
              <FaSearch className="absolute left-4 top-4 text-gray-400" />

              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="ค้นหาชื่อ, อีเมล, รหัสพนักงาน หรือเบอร์โทร"
                className="w-full border rounded-xl pl-12 pr-5 py-3 text-gray-800 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border px-5 py-3 rounded-xl flex items-center gap-2 text-gray-700 disabled:opacity-60"
              >
                <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
                รีเฟรช
              </button>

              <button
                onClick={openAddModal}
                className="bg-red-600 text-white px-6 py-3 rounded-xl flex items-center gap-2"
              >
                <FaPlus />
                เพิ่มพนักงาน
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px]">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-4 text-left">#</th>
                  <th className="p-4 text-left">รหัสพนักงาน</th>
                  <th className="p-4 text-left">ชื่อ-นามสกุล</th>
                  <th className="p-4 text-left">ตำแหน่ง</th>
                  <th className="p-4 text-left">เบอร์โทร</th>
                  <th className="p-4 text-left">อีเมล</th>
                  <th className="p-4 text-left">สิทธิ์</th>
                  <th className="p-4 text-left">สถานะ</th>
                  <th className="p-4 text-left">วันที่เพิ่ม</th>
                  <th className="p-4 text-left">จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => (
                    <tr key={user.id} className="border-b text-gray-800">
                      <td className="p-4">{index + 1}</td>
                      <td className="p-4 font-semibold">
                        {user.employee_code || "-"}
                      </td>
                      <td className="p-4">{user.display_name || "-"}</td>
                      <td className="p-4">{user.position || "-"}</td>
                      <td className="p-4">{user.phone || "-"}</td>
                      <td className="p-4">{user.email || "-"}</td>

                      <td className="p-4">
                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-lg text-sm">
                          {user.role === "admin" ? "Admin" : "User"}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-lg text-sm ${
                            user.is_active
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {user.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </span>
                      </td>

                      <td className="p-4">{formatDate(user.created_at)}</td>

                      <td className="p-4 flex gap-3">
                        <button
                          onClick={() => openEditModal(user)}
                          className="border rounded-lg p-3 hover:bg-gray-100"
                          title="แก้ไข"
                        >
                          <FaEdit />
                        </button>

                        <button
                          onClick={() => handleDelete(user)}
                          className="border rounded-lg p-3 text-red-600 hover:bg-red-50"
                          title="ลบ"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="p-12 text-center text-gray-500">
                      {isLoading ? "กำลังโหลดข้อมูล..." : "ไม่พบผู้ใช้งาน"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white w-full max-w-3xl rounded-3xl p-8 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-6 top-6 text-gray-500 hover:text-red-600"
            >
              <FaTimes className="text-xl" />
            </button>

            <h2 className="text-2xl font-bold text-gray-900">
              {modalMode === "add" ? "เพิ่มพนักงาน" : "แก้ไขพนักงาน"}
            </h2>

            <p className="text-gray-500 mt-2">
              ข้อมูลจะบันทึกใน Supabase Auth และ profiles
            </p>

            {formError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              <Field
                label="ชื่อ-นามสกุล"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
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
              />

              <Field
                label="เบอร์โทรศัพท์"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />

              <Field
                label="อีเมล"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
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
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สิทธิ์การใช้งาน
                </label>

                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full border rounded-xl px-4 py-3 text-gray-800"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <label className="flex items-center gap-3 mt-8 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-5 h-5 accent-red-600"
                />

                <span className="text-gray-700">
                  เปิดใช้งานบัญชีนี้
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={closeModal}
                className="border px-5 py-3 rounded-xl text-gray-700"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="bg-red-600 text-white px-5 py-3 rounded-xl flex items-center gap-2 disabled:bg-red-300"
              >
                <FaSave />
                {isSaving ? "กำลังบันทึก..." : "บันทึก"}
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
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl ${
        active ? "bg-red-600 shadow-lg" : "hover:bg-white/10"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

function FilterButton({ text, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 rounded-xl ${
        active ? "bg-red-600 text-white" : "bg-white border text-gray-700"
      }`}
    >
      {text}
    </button>
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
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-red-500"
      />
    </div>
  );
}

function Summary({ title, value, color }) {
  const colors = {
    red: "bg-red-100",
    green: "bg-green-100",
    orange: "bg-orange-100",
    blue: "bg-blue-100",
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm p-6">
      <div className={`w-14 h-14 rounded-2xl mb-4 ${colors[color]}`} />
      <p className="font-bold text-gray-800">{title}</p>
      <h2 className="text-3xl font-bold mt-2 text-gray-900">{value}</h2>
    </div>
  );
}