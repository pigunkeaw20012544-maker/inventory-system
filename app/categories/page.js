"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../components/AccountHeader";
import BrandLogo from "../components/BrandLogo";
import LogoutButton from "../components/LogoutButton";
import { supabase } from "../lib/supabase";

import {
  FaBox,
  FaChartBar,
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaHistory,
  FaHome,
  FaPlus,
  FaSave,
  FaSearch,
  FaShoppingCart,
  FaSyncAlt,
  FaThLarge,
  FaTimes,
  FaTrash,
  FaUsers,
} from "react-icons/fa";

const EMPTY_FORM = {
  name: "",
  description: "",
  is_active: true,
};

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState("");

  async function loadCategories() {
    setIsLoading(true);
    setPageError("");

    const [categoryResult, productResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, description, is_active")
        .order("id", { ascending: true }),

      supabase.from("products").select("id, category_id"),
    ]);

    if (categoryResult.error || productResult.error) {
      console.error(categoryResult.error || productResult.error);

      setPageError(
        categoryResult.error?.message ||
          productResult.error?.message ||
          "ไม่สามารถโหลดข้อมูลหมวดหมู่ได้"
      );

      setCategories([]);
      setIsLoading(false);
      return;
    }

    const productCount = (productResult.data || []).reduce(
      (result, product) => {
        const categoryId = String(product.category_id || "");

        result[categoryId] = (result[categoryId] || 0) + 1;

        return result;
      },
      {}
    );

    const mappedCategories = (categoryResult.data || []).map(
      (category) => ({
        id: category.id,
        name: category.name || "-",
        description: category.description || "",
        isActive: category.is_active !== false,
        totalProducts: productCount[String(category.id)] || 0,
      })
    );

    setCategories(mappedCategories);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadCategories();

    const channel = supabase
      .channel("admin-categories-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        () => void loadCategories()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => void loadCategories()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const search = normalizeValue(keyword);

    return categories.filter((category) => {
      const matchesSearch =
        !search ||
        [category.name, category.description].some((value) =>
          normalizeValue(value).includes(search)
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && category.isActive) ||
        (statusFilter === "inactive" && !category.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [categories, keyword, statusFilter]);

  const activeCount = useMemo(() => {
    return categories.filter((category) => category.isActive).length;
  }, [categories]);

  const inactiveCount = useMemo(() => {
    return categories.filter((category) => !category.isActive).length;
  }, [categories]);

  const categoryWithProductsCount = useMemo(() => {
    return categories.filter((category) => category.totalProducts > 0).length;
  }, [categories]);

  function openAddModal() {
    setModalMode("add");
    setEditingCategory(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(category) {
    setModalMode("edit");
    setEditingCategory(category);
    setFormError("");

    setFormData({
      name: category.name,
      description: category.description || "",
      is_active: category.isActive,
    });

    setShowModal(true);
  }

  function closeModal() {
    if (isSaving) return;

    setShowModal(false);
    setEditingCategory(null);
    setFormData(EMPTY_FORM);
    setFormError("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSaveCategory(event) {
    event.preventDefault();

    const name = formData.name.trim();
    const description = formData.description.trim();

    if (!name) {
      setFormError("กรุณากรอกชื่อหมวดหมู่สินค้า");
      return;
    }

    setIsSaving(true);
    setFormError("");

    const payload = {
      name,
      description,
      is_active: formData.is_active,
    };

    let response;

    if (modalMode === "add") {
      response = await supabase.from("categories").insert(payload);
    } else {
      response = await supabase
        .from("categories")
        .update(payload)
        .eq("id", editingCategory.id);
    }

    setIsSaving(false);

    if (response.error) {
      console.error(response.error);

      if (response.error.code === "23505") {
        setFormError("ชื่อหมวดหมู่นี้มีอยู่ในระบบแล้ว");
      } else {
        setFormError(
          response.error.message || "บันทึกหมวดหมู่ไม่สำเร็จ"
        );
      }

      return;
    }

    await loadCategories();
    closeModal();

    alert(
      modalMode === "add"
        ? "เพิ่มหมวดหมู่สำเร็จ"
        : "แก้ไขหมวดหมู่สำเร็จ"
    );
  }

  async function handleDeleteCategory(category) {
    if (category.totalProducts > 0) {
      alert(
        `ลบหมวดหมู่ "${category.name}" ไม่ได้ เพราะยังมีสินค้า ${category.totalProducts} รายการอยู่ในหมวดหมู่นี้`
      );
      return;
    }

    const confirmed = window.confirm(
      `ต้องการลบหมวดหมู่ "${category.name}" ใช่หรือไม่?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      console.error(error);

      if (error.code === "23503") {
        alert("ลบหมวดหมู่นี้ไม่ได้ เพราะยังมีสินค้าอยู่ในหมวดหมู่นี้");
      } else {
        alert(error.message || "ลบหมวดหมู่ไม่สำเร็จ");
      }

      return;
    }

    await loadCategories();
    alert("ลบหมวดหมู่สำเร็จ");
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setKeyword("");
    setStatusFilter("all");

    await loadCategories();

    setIsRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-[290px] min-h-screen md:min-h-screen shrink-0 bg-[#182232] text-white overflow-y-auto">
        <div className="rounded-b-2xl md:rounded-br-[42px] bg-red-600 px-4 md:px-7 py-6 md:py-8 shadow-lg">
          <div className="flex items-center gap-3">
            <BrandLogo />

            <div>
              <h2 className="text-base md:text-lg font-bold">
                ระบบบริหารจัดการ
              </h2>

              <p className="text-xs text-white/80">
                ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-2 p-4 md:p-5 flex md:flex-col gap-2 md:gap-0 flex-wrap md:flex-nowrap">
          <p className="hidden md:block px-4 pb-1 pt-2 text-xs text-slate-400 w-full">
            เมนูหลัก
          </p>

          <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />

          <Menu icon={<FaBox />} text="สินค้า" href="/products" />

          <Menu
            active
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

          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />

          <div className="pt-5 hidden md:block w-full">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 overflow-x-hidden">
        <header className="flex flex-col gap-3 sm:gap-5 md:gap-6">
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                หมวดหมู่สินค้า
              </h1>

              <span className="rounded-full bg-red-50 px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-red-600">
                Admin
              </span>
            </div>

            <p className="text-sm sm:text-base text-slate-500">
              จัดกลุ่มสินค้าให้เป็นระเบียบ เพื่อค้นหาและบริหารสินค้าได้ง่าย
            </p>
          </div>

          <div className="flex justify-end">
            <AccountHeader />
          </div>
        </header>

        <section className="mt-6 sm:mt-8 rounded-lg sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-2 rounded-lg sm:rounded-xl border border-slate-200 bg-white px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">{isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรช"}</span>
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-red-600 px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base text-white hover:bg-red-700"
              >
                <FaPlus />
                <span>เพิ่มหมวดหมู่</span>
              </button>
            </div>

            <div className="relative w-full lg:w-auto lg:max-w-xs">
              <FaSearch className="absolute left-3 sm:left-4 top-2.5 sm:top-3 text-slate-400 text-sm sm:text-base" />

              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="ค้นหาหมวดหมู่"
                className="w-full rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 py-2 sm:py-3 pl-9 sm:pl-11 pr-3 sm:pr-4 text-sm sm:text-base text-slate-800 outline-none focus:border-red-500 focus:bg-white"
              />
            </div>
          </div>
        </section>

        <section className="mt-4 sm:mt-8 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-5">
          <SummaryCard
            title="ทั้งหมด"
            value={categories.length}
            detail="หมวดหมู่"
            icon={<FaThLarge />}
            color="blue"
          />

          <SummaryCard
            title="เปิดใช้งาน"
            value={activeCount}
            detail="พร้อมใช้งาน"
            icon={<FaCheckCircle />}
            color="green"
          />

          <SummaryCard
            title="ปิดใช้งาน"
            value={inactiveCount}
            detail="พักการใช้งาน"
            icon={<FaExclamationTriangle />}
            color="orange"
          />

          <SummaryCard
            title="มีสินค้า"
            value={categoryWithProductsCount}
            detail="มีสินค้า"
            icon={<FaBox />}
            color="red"
          />
        </section>

        <section className="mt-6 sm:mt-8 overflow-hidden rounded-lg sm:rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 sm:gap-4 border-b border-slate-100 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
                รายการหมวดหมู่สินค้า
              </h2>

              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                แสดง {filteredCategories.length} จาก {categories.length} หมวดหมู่
              </p>
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-2">
              <FilterButton
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              >
                ทั้งหมด
              </FilterButton>

              <FilterButton
                active={statusFilter === "active"}
                onClick={() => setStatusFilter("active")}
              >
                ใช้งาน
              </FilterButton>

              <FilterButton
                active={statusFilter === "inactive"}
                onClick={() => setStatusFilter("inactive")}
              >
                ปิดใช้งาน
              </FilterButton>
            </div>
          </div>

          {pageError && (
            <div className="m-4 sm:m-6 flex gap-2 sm:gap-3 rounded-lg sm:rounded-2xl border border-red-200 bg-red-50 p-3 sm:p-4 text-sm sm:text-base text-red-700">
              <FaExclamationTriangle className="mt-0.5 sm:mt-1 shrink-0 text-sm sm:text-base" />
              <p>{pageError}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold">#</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold">
                    ชื่อหมวดหมู่
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold hidden sm:table-cell">
                    คำอธิบาย
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center font-semibold">
                    สินค้า
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-semibold hidden md:table-cell">
                    สถานะ
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-center font-semibold">
                    การจัดการ
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-3 sm:px-6 py-8 sm:py-14 text-center text-xs sm:text-base text-slate-500"
                    >
                      กำลังโหลดข้อมูลหมวดหมู่...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredCategories.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-400 text-xs sm:text-sm">
                        {index + 1}
                      </td>

                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-red-50 text-red-600 flex-shrink-0 text-sm sm:text-base">
                            <FaThLarge />
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-xs sm:text-base truncate">
                              {item.name}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400 hidden sm:block">
                              ID: {item.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-500 hidden sm:table-cell text-xs sm:text-sm max-w-xs truncate">
                        {item.description || "ไม่มีคำอธิบาย"}
                      </td>

                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold ${
                            item.totalProducts > 0
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.totalProducts}
                        </span>
                      </td>

                      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                        <StatusBadge isActive={item.isActive} />
                      </td>

                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex justify-center gap-1 sm:gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="rounded-lg sm:rounded-xl border border-blue-200 bg-blue-50 p-2 sm:p-3 text-blue-600 hover:bg-blue-100 text-sm sm:text-base"
                            title="แก้ไข"
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(item)}
                            className={`rounded-lg sm:rounded-xl border p-2 sm:p-3 text-sm sm:text-base ${
                              item.totalProducts > 0
                                ? "border-slate-200 bg-slate-100 text-slate-400"
                                : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                            }`}
                            title={
                              item.totalProducts > 0
                                ? "ไม่สามารถลบได้"
                                : "ลบ"
                            }
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!isLoading && filteredCategories.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-3 sm:px-6 py-8 sm:py-14 text-center text-xs sm:text-base text-slate-500"
                    >
                      ไม่พบหมวดหมู่สินค้าตามเงื่อนไขที่ค้นหา
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
            onSubmit={handleSaveCategory}
            className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl rounded-lg sm:rounded-3xl bg-white p-4 sm:p-7 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 sm:right-6 top-4 sm:top-6 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <FaTimes className="text-lg sm:text-xl" />
            </button>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 pr-8">
              {modalMode === "add"
                ? "เพิ่มหมวดหมู่สินค้า"
                : "แก้ไขหมวดหมู่สินค้า"}
            </h2>

            <p className="mt-1 text-xs sm:text-base text-slate-500">
              กรอกข้อมูลให้ครบ แล้วกดบันทึก
            </p>

            {formError && (
              <div className="mt-4 sm:mt-5 rounded-lg sm:rounded-xl border border-red-200 bg-red-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-base text-red-600">
                {formError}
              </div>
            )}

            <div className="mt-5 sm:mt-7">
              <label className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">
                ชื่อหมวดหมู่สินค้า
              </label>

              <input
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="เช่น แก้วพลาสติก"
                className="w-full rounded-lg sm:rounded-xl border border-slate-200 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="mt-4 sm:mt-5">
              <label className="mb-2 block text-xs sm:text-sm font-medium text-slate-700">
                คำอธิบาย
              </label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="เช่น สำหรับจัดเก็บสินค้าแก้วพลาสติกทุกขนาด"
                rows="4"
                className="w-full resize-none rounded-lg sm:rounded-xl border border-slate-200 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <label className="mt-5 sm:mt-6 flex cursor-pointer items-center gap-3 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-50 px-3 sm:px-4 py-3 sm:py-4">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    is_active: event.target.checked,
                  }))
                }
                className="h-4 w-4 sm:h-5 sm:w-5 accent-red-600"
              />

              <div>
                <p className="font-medium text-slate-800 text-xs sm:text-base">
                  เปิดใช้งานหมวดหมู่นี้
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  หมวดหมู่ที่ปิดใช้งานจะยังอยู่ในระบบ แต่แยกดูได้
                </p>
              </div>
            </label>

            <div className="mt-7 sm:mt-8 flex justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg sm:rounded-xl border border-slate-200 px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-base text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-red-600 px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-base text-white hover:bg-red-700 disabled:bg-red-300"
              >
                <FaSave className="text-sm sm:text-base" />
                <span>{isSaving ? "กำลังบันทึก..." : "บันทึก"}</span>
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
      className={`rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition ${
        active
          ? "bg-red-600 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold ${
        isActive
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-200 text-slate-600"
      }`}
    >
      {isActive ? "ใช้งาน" : "ปิดใช้งาน"}
    </span>
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
    <div className="relative overflow-hidden rounded-lg sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-6 shadow-sm">
      <div className={`absolute left-0 top-0 h-1 w-full ${style.line}`} />

      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>

          <h2 className="mt-2 sm:mt-3 text-xl sm:text-3xl font-bold text-slate-900 truncate">
            {value}
          </h2>

          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-500 line-clamp-1">{detail}</p>
        </div>

        <div
          className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-2xl text-lg sm:text-xl flex-shrink-0 ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}