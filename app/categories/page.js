"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import LogoutButton from "../components/LogoutButton";
import {
FaHome,
FaBox,
FaThLarge,
FaShoppingCart,
FaUsers,
FaChartBar,
FaSignOutAlt,
FaPlus,
FaEdit,
FaTrash,
FaSyncAlt,
FaSearch,
FaTimes,
FaSave,
} from "react-icons/fa";

const emptyForm = {
name: "",
description: "",
is_active: true,
};

export default function CategoriesPage() {
const [categories, setCategories] = useState([]);
const [keyword, setKeyword] = useState("");

const [showModal, setShowModal] = useState(false);
const [modalMode, setModalMode] = useState("add");
const [editingCategory, setEditingCategory] = useState(null);

const [formData, setFormData] = useState(emptyForm);
const [formError, setFormError] = useState("");
const [isSaving, setIsSaving] = useState(false);
const [isRefreshing, setIsRefreshing] = useState(false);

async function loadCategories() {
const [
{ data: categoryData, error: categoryError },
{ data: productData, error: productError },
] = await Promise.all([
supabase
.from("categories")
.select("id, name, description, is_active")
.order("id", { ascending: true }),
supabase.from("products").select("id, category_id"),
]);


if (categoryError || productError) {
  console.error(categoryError || productError);
  alert("ไม่สามารถโหลดข้อมูลหมวดหมู่ได้");
  return;
}

const productCount = (productData || []).reduce((result, product) => {
  result[product.category_id] = (result[product.category_id] || 0) + 1;
  return result;
}, {});

const mappedCategories = (categoryData || []).map((category) => ({
  id: category.id,
  name: category.name,
  description: category.description || "-",
  isActive: category.is_active,
  total: productCount[category.id] || 0,
}));

setCategories(mappedCategories);


}

useEffect(() => {
loadCategories();
}, []);

const filteredCategories = useMemo(() => {
const search = keyword.trim().toLowerCase();


if (!search) return categories;

return categories.filter((category) =>
  [category.name, category.description].some((value) =>
    String(value).toLowerCase().includes(search)
  )
);


}, [categories, keyword]);

function openAddModal() {
setModalMode("add");
setEditingCategory(null);
setFormData(emptyForm);
setFormError("");
setShowModal(true);
}

function openEditModal(category) {
setModalMode("edit");
setEditingCategory(category);
setFormError("");


setFormData({
  name: category.name,
  description: category.description === "-" ? "" : category.description,
  is_active: category.isActive,
});

setShowModal(true);


}

function closeModal() {
if (isSaving) return;


setShowModal(false);
setEditingCategory(null);
setFormData(emptyForm);
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

let error;

if (modalMode === "add") {
  ({ error } = await supabase.from("categories").insert(payload));
} else {
  ({ error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", editingCategory.id));
}

setIsSaving(false);

if (error) {
  console.error(error);

  if (error.code === "23505") {
    setFormError("ชื่อหมวดหมู่นี้มีอยู่ในระบบแล้ว");
  } else {
    setFormError("บันทึกหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่");
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
    alert(
      "ลบหมวดหมู่นี้ไม่ได้ เพราะยังมีสินค้าอยู่ในหมวดหมู่นี้"
    );
  } else {
    alert("ลบหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่");
  }

  return;
}

await loadCategories();
alert("ลบหมวดหมู่สำเร็จ");


}

async function handleRefresh() {
setIsRefreshing(true);
setKeyword("");


await loadCategories();

setIsRefreshing(false);


}

return ( <div className="min-h-screen bg-[#f8f9fb] flex"> <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden"> <div className="bg-red-600 p-8 rounded-br-[45px]"> <div className="text-3xl">🥤</div>


      <h2 className="font-bold mt-3">
        ระบบบริหารจัดการ
      </h2>

      <p className="text-sm">
        ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
      </p>
    </div>

    <nav className="p-6 space-y-4">
      <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />
      <Menu icon={<FaBox />} text="สินค้า" href="/products" />

      <Menu
        active
        icon={<FaThLarge />}
        text="หมวดหมู่สินค้า"
        href="/categories"
      />

      <Menu icon={<FaShoppingCart />} text="การขาย" href="/sales" />
      <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
      <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
      <LogoutButton />
    </nav>
  </aside>

  <main className="flex-1 min-w-0 p-6 xl:p-10">
    <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-6 mb-10">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">
          หมวดหมู่สินค้า
        </h1>

        <p className="text-gray-500 mt-2">
          Categories &gt; หมวดหมู่สินค้า
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-white border px-6 py-4 rounded-xl flex items-center gap-2 text-gray-800 disabled:opacity-60"
        >
          <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
        </button>

        <button
          onClick={openAddModal}
          className="bg-red-600 text-white px-6 py-4 rounded-xl flex items-center gap-3 shadow-lg hover:bg-red-700"
        >
          <FaPlus />
          เพิ่มหมวดหมู่สินค้า
        </button>
      </div>
    </div>

    <div className="bg-white rounded-3xl shadow-sm border p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <p className="text-gray-500">
          ทั้งหมด {filteredCategories.length} หมวดหมู่
        </p>

        <div className="relative w-full md:w-80">
          <FaSearch className="absolute left-4 top-4 text-gray-400" />

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="ค้นหาหมวดหมู่..."
            className="w-full border rounded-xl py-3 pl-11 pr-4 text-gray-800 outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px]">
          <thead className="bg-gray-100">
            <tr className="text-gray-700">
              <th className="p-5 text-left">#</th>
              <th className="p-5 text-left">ชื่อหมวดหมู่</th>
              <th className="p-5 text-left">คำอธิบาย</th>
              <th className="p-5 text-left">จำนวนสินค้า</th>
              <th className="p-5 text-left">สถานะ</th>
              <th className="p-5 text-left">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((item, index) => (
                <tr key={item.id} className="border-b text-gray-800">
                  <td className="p-6">{index + 1}</td>

                  <td className="p-6 font-semibold">
                    {item.name}
                  </td>

                  <td className="p-6 text-gray-500">
                    {item.description}
                  </td>

                  <td className="p-6">
                    {item.total} รายการ
                  </td>

                  <td className="p-6">
                    <span
                      className={`px-4 py-2 rounded-full text-sm ${
                        item.isActive
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {item.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                    </span>
                  </td>

                  <td className="p-6 flex gap-3">
                    <button
                      onClick={() => openEditModal(item)}
                      className="border rounded-xl p-3 hover:bg-gray-100"
                      title="แก้ไขหมวดหมู่"
                    >
                      <FaEdit />
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(item)}
                      className="border rounded-xl p-3 text-red-600 hover:bg-red-50"
                      title="ลบหมวดหมู่"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  className="p-10 text-center text-gray-500"
                >
                  ไม่พบหมวดหมู่สินค้า
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
        onSubmit={handleSaveCategory}
        className="bg-white w-full max-w-xl rounded-3xl p-8 shadow-2xl relative"
      >
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-6 top-6 text-gray-500 hover:text-red-600"
        >
          <FaTimes className="text-xl" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900">
          {modalMode === "add"
            ? "เพิ่มหมวดหมู่สินค้า"
            : "แก้ไขหมวดหมู่สินค้า"}
        </h2>

        <p className="text-gray-500 mt-2">
          กรอกข้อมูลแล้วกดบันทึกเพื่อเก็บลง Supabase
        </p>

        {formError && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
            {formError}
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ชื่อหมวดหมู่
          </label>

          <input
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="เช่น แก้วพลาสติก"
            className="w-full border rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-red-500"
          />
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            คำอธิบาย
          </label>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            placeholder="อธิบายรายละเอียดหมวดหมู่"
            rows="4"
            className="w-full border rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-red-500 resize-none"
          />
        </div>

        <label className="mt-6 flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(event) =>
              setFormData((previous) => ({
                ...previous,
                is_active: event.target.checked,
              }))
            }
            className="w-5 h-5 accent-red-600"
          />

          <span className="text-gray-700">
            เปิดใช้งานหมวดหมู่นี้
          </span>
        </label>

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
> <span className="text-xl">{icon}</span> <span>{text}</span> </Link>
);
}
