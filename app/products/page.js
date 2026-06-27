"use client";

import AccountHeader from "../components/AccountHeader";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import Barcode from "react-barcode";
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
FaSyncAlt,
FaSearch,
FaEdit,
FaTrash,
FaBarcode,
FaPrint,
FaTimes,
FaSave,
} from "react-icons/fa";

const emptyForm = {
product_code: "",
barcode: "",
name: "",
category_id: "",
price: "",
stock: "",
unit: "ชิ้น",
status: "มีสินค้า",
};

export default function ProductsPage() {
const [products, setProducts] = useState([]);
const [categories, setCategories] = useState([]);
const [keyword, setKeyword] = useState("");

const [selectedProduct, setSelectedProduct] = useState(null);
const [showBarcodeModal, setShowBarcodeModal] = useState(false);

const [showProductModal, setShowProductModal] = useState(false);
const [modalMode, setModalMode] = useState("add");
const [editingProduct, setEditingProduct] = useState(null);
const [formData, setFormData] = useState(emptyForm);
const [formError, setFormError] = useState("");
const [isSaving, setIsSaving] = useState(false);
const [isRefreshing, setIsRefreshing] = useState(false);

async function loadProducts() {
const { data, error } = await supabase
.from("products")
.select(`         id,
        product_code,
        barcode,
        name,
        category_id,
        price,
        stock,
        unit,
        status,
        category:categories(name)
      `)
.order("id", { ascending: true });


if (error) {
  console.error("โหลดสินค้าไม่สำเร็จ:", error);
  alert("ไม่สามารถโหลดข้อมูลสินค้าจากฐานข้อมูลได้");
  return;
}

const mappedProducts = (data || []).map((product) => {
  const categoryName = Array.isArray(product.category)
    ? product.category[0]?.name
    : product.category?.name;

  return {
    id: product.id,
    code: product.product_code,
    barcode: product.barcode,
    name: product.name,
    categoryId: product.category_id,
    category: categoryName || "-",
    price: Number(product.price).toFixed(2),
    stock: product.stock,
    unit: product.unit,
    status: product.status,
  };
});

setProducts(mappedProducts);


}

async function loadCategories() {
const { data, error } = await supabase
.from("categories")
.select("id, name")
.order("name", { ascending: true });


if (error) {
  console.error("โหลดหมวดหมู่ไม่สำเร็จ:", error);
  return;
}

setCategories(data || []);


}

useEffect(() => {
  loadProducts();
  loadCategories();

  const channel = supabase
    .channel("admin-products-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      () => loadProducts()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "categories" },
      () => loadCategories()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

const filteredProducts = useMemo(() => {
const search = keyword.trim().toLowerCase();


if (!search) return products;

return products.filter((product) =>
  [
    product.code,
    product.barcode,
    product.name,
    product.category,
    product.status,
  ].some((value) => String(value).toLowerCase().includes(search))
);


}, [keyword, products]);

const lowStockCount = products.filter(
(product) =>
product.status === "ใกล้หมด" ||
product.status === "หมด" ||
Number(product.stock) < 10
).length;

function openBarcodeModal(product) {
const selected = product || products[0];


if (!selected) {
  alert("ยังไม่มีสินค้าในระบบ");
  return;
}

setSelectedProduct(selected);
setShowBarcodeModal(true);


}

function openAddModal() {
setModalMode("add");
setEditingProduct(null);
setFormData(emptyForm);
setFormError("");
setShowProductModal(true);
}

function openEditModal(product) {
setModalMode("edit");
setEditingProduct(product);
setFormError("");


setFormData({
  product_code: product.code,
  barcode: product.barcode,
  name: product.name,
  category_id: String(product.categoryId || ""),
  price: product.price,
  stock: String(product.stock),
  unit: product.unit || "ชิ้น",
  status: product.status,
});

setShowProductModal(true);


}

function closeProductModal() {
if (isSaving) return;


setShowProductModal(false);
setEditingProduct(null);
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

async function handleSaveProduct(event) {
event.preventDefault();


const productCode = formData.product_code.trim().toUpperCase();
const barcode = formData.barcode.trim();
const name = formData.name.trim();
const categoryId = Number(formData.category_id);
const price = Number(formData.price);
const stock = Number(formData.stock);

if (
  !productCode ||
  !barcode ||
  !name ||
  !formData.category_id ||
  formData.price === "" ||
  formData.stock === ""
) {
  setFormError("กรุณากรอกข้อมูลสินค้าให้ครบทุกช่อง");
  return;
}

if (
  !Number.isFinite(price) ||
  price < 0 ||
  !Number.isFinite(stock) ||
  stock < 0
) {
  setFormError("ราคาขายและจำนวนสต็อกต้องเป็นตัวเลข 0 หรือมากกว่า");
  return;
}

const payload = {
  product_code: productCode,
  barcode,
  name,
  category_id: categoryId,
  price,
  stock,
  unit: formData.unit.trim() || "ชิ้น",
  status: formData.status,
};

setIsSaving(true);
setFormError("");

let error;

if (modalMode === "add") {
  ({ error } = await supabase.from("products").insert(payload));
} else {
  ({ error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", editingProduct.id));
}

setIsSaving(false);

if (error) {
  console.error(error);

  if (error.code === "23505") {
    setFormError("รหัสสินค้าหรือบาร์โค้ดนี้มีอยู่ในระบบแล้ว");
  } else {
    setFormError("บันทึกสินค้าไม่สำเร็จ กรุณาลองใหม่");
  }

  return;
}

await loadProducts();
closeProductModal();

alert(modalMode === "add" ? "เพิ่มสินค้าสำเร็จ" : "แก้ไขสินค้าสำเร็จ");


}

async function handleDeleteProduct(product) {
const confirmed = window.confirm(
`ต้องการลบสินค้า "${product.name}" (${product.code}) ใช่หรือไม่?`
);


if (!confirmed) return;

const { error } = await supabase
  .from("products")
  .delete()
  .eq("id", product.id);

if (error) {
  console.error(error);
  alert("ลบสินค้าไม่สำเร็จ กรุณาลองใหม่");
  return;
}

await loadProducts();
alert("ลบสินค้าสำเร็จ");


}

async function handleRefresh() {
setIsRefreshing(true);
setKeyword("");


await Promise.all([loadProducts(), loadCategories()]);

setIsRefreshing(false);


}

return ( <div className="min-h-screen bg-[#f8f9fb] flex"> <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden"> <div className="bg-red-600 p-8 rounded-br-[45px]"> <div className="text-3xl">🥤</div> <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2> <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p> </div>


    <nav className="p-6 space-y-4">
      <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />
      <Menu active icon={<FaBox />} text="สินค้า" href="/products" />
      <Menu icon={<FaThLarge />} text="หมวดหมู่สินค้า" href="/categories" />
      <Menu icon={<FaShoppingCart />} text="การขาย" href="/sales" />
      <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
      <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
      <LogoutButton />
    </nav>
  </aside>

  <main className="flex-1 min-w-0 p-6 xl:p-10">
    <div className="flex justify-end mb-6">
  <AccountHeader />
</div>
    <div className="flex flex-col 2xl:flex-row 2xl:justify-between 2xl:items-center gap-6 mb-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">สินค้า</h1>
        <p className="text-gray-500 mt-2">Products &gt; สินค้า</p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <button
          onClick={() => openBarcodeModal()}
          className="bg-slate-800 text-white px-6 py-4 rounded-xl flex items-center gap-2 shadow"
        >
          <FaBarcode />
          สร้างบาร์โค้ด
        </button>

        <button
          onClick={openAddModal}
          className="bg-red-600 text-white px-6 py-4 rounded-xl flex items-center gap-2 shadow"
        >
          <FaPlus />
          เพิ่มสินค้า
        </button>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-white border px-6 py-4 rounded-xl flex items-center gap-2 shadow-sm text-gray-800 disabled:opacity-60"
        >
          <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
        </button>

        <div className="relative">
          <FaSearch className="absolute left-4 top-5 text-gray-400" />

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="ค้นหารหัสสินค้า / ชื่อสินค้า / บาร์โค้ด..."
            className="bg-white border rounded-xl pl-12 pr-5 py-4 w-full sm:w-80 outline-none text-gray-800"
          />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="จำนวนสินค้าทั้งหมด"
        value={products.length.toLocaleString()}
        unit="รายการ"
        color="red"
      />

      <StatCard
        title="จำนวนหมวดหมู่"
        value={categories.length.toLocaleString()}
        unit="หมวดหมู่"
        color="green"
      />

      <StatCard
        title="สินค้าใกล้หมด"
        value={lowStockCount.toLocaleString()}
        unit="รายการ"
        color="yellow"
      />

      <StatCard
        title="ยอดขายวันนี้"
        value="฿ 28,450.00"
        unit=""
        color="green"
      />
    </div>

    <div className="bg-white rounded-3xl shadow-sm border p-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-4 text-left">#</th>
              <th className="p-4 text-left">รหัสสินค้า</th>
              <th className="p-4 text-left">ชื่อสินค้า</th>
              <th className="p-4 text-left">หมวดหมู่</th>
              <th className="p-4 text-left">ราคาขาย (บาท)</th>
              <th className="p-4 text-left">สต็อก</th>
              <th className="p-4 text-left">บาร์โค้ด</th>
              <th className="p-4 text-left">สถานะ</th>
              <th className="p-4 text-left">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((item, index) => (
                <tr key={item.id} className="border-b text-gray-800">
                  <td className="p-4">{index + 1}</td>
                  <td className="p-4">{item.code}</td>
                  <td className="p-4">{item.name}</td>
                  <td className="p-4">{item.category}</td>
                  <td className="p-4">{item.price}</td>
                  <td className="p-4">
                    {item.stock} {item.unit}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {item.barcode}
                      </span>

                      <button
                        onClick={() => openBarcodeModal(item)}
                        className="border border-slate-300 p-2 rounded-lg text-slate-700 hover:bg-slate-100"
                        title="ดูบาร์โค้ด"
                      >
                        <FaBarcode />
                      </button>
                    </div>
                  </td>

                  <td className="p-4">
                    <StatusBadge status={item.status} />
                  </td>

                  <td className="p-4 flex gap-3">
                    <button
                      onClick={() => openEditModal(item)}
                      className="border p-3 rounded-xl text-gray-700 hover:bg-gray-100"
                      title="แก้ไขสินค้า"
                    >
                      <FaEdit />
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(item)}
                      className="border p-3 rounded-xl text-red-600 hover:bg-red-50"
                      title="ลบสินค้า"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="p-10 text-center text-gray-500">
                  ไม่พบสินค้าจากคำค้นหานี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-6">
        <p className="text-gray-500">
          แสดง {filteredProducts.length} รายการ
        </p>
      </div>
    </div>
  </main>

  {showProductModal && (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSaveProduct}
        className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-7 md:p-8 shadow-2xl relative"
      >
        <button
          type="button"
          onClick={closeProductModal}
          className="absolute right-6 top-6 text-gray-500 hover:text-red-600"
        >
          <FaTimes className="text-xl" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900">
          {modalMode === "add" ? "เพิ่มสินค้า" : "แก้ไขสินค้า"}
        </h2>

        <p className="text-gray-500 mt-1">
          กรอกข้อมูลสินค้าแล้วกดบันทึก ระบบจะบันทึกลง Supabase
        </p>

        {formError && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <InputField
            label="รหัสสินค้า"
            name="product_code"
            value={formData.product_code}
            onChange={handleFormChange}
            placeholder="เช่น BEV-0009"
          />

          <InputField
            label="บาร์โค้ด"
            name="barcode"
            value={formData.barcode}
            onChange={handleFormChange}
            placeholder="เช่น 8851234500098"
          />

          <InputField
            label="ชื่อสินค้า"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="ชื่อสินค้า"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมวดหมู่
            </label>

            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleFormChange}
              className="w-full border rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-red-500"
            >
              <option value="">-- เลือกหมวดหมู่ --</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <InputField
            label="ราคาขาย (บาท)"
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={handleFormChange}
            placeholder="0.00"
          />

          <InputField
            label="จำนวนสต็อก"
            name="stock"
            type="number"
            min="0"
            step="1"
            value={formData.stock}
            onChange={handleFormChange}
            placeholder="0"
          />

          <InputField
            label="หน่วยนับ"
            name="unit"
            value={formData.unit}
            onChange={handleFormChange}
            placeholder="ชิ้น"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              สถานะสินค้า
            </label>

            <select
              name="status"
              value={formData.status}
              onChange={handleFormChange}
              className="w-full border rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-red-500"
            >
              <option value="มีสินค้า">มีสินค้า</option>
              <option value="ใกล้หมด">ใกล้หมด</option>
              <option value="หมด">หมด</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={closeProductModal}
            className="border px-5 py-3 rounded-xl text-gray-700"
          >
            ยกเลิก
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-red-600 disabled:bg-red-300 text-white px-5 py-3 rounded-xl flex items-center gap-2"
          >
            <FaSave />
            {isSaving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
          </button>
        </div>
      </form>
    </div>
  )}

  {showBarcodeModal && selectedProduct && (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
        <button
          onClick={() => setShowBarcodeModal(false)}
          className="absolute right-6 top-6 text-gray-500 hover:text-red-600"
        >
          <FaTimes className="text-xl" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900">
          สร้างบาร์โค้ดสินค้า
        </h2>

        <p className="text-gray-500 mt-1">
          เลือกสินค้าเพื่อสร้างและพิมพ์บาร์โค้ด
        </p>

        <select
          value={selectedProduct.code}
          onChange={(event) => {
            const product = products.find(
              (item) => item.code === event.target.value
            );

            setSelectedProduct(product || null);
          }}
          className="w-full mt-5 border rounded-xl p-4 text-gray-800 outline-none"
        >
          {products.map((product) => (
            <option key={product.id} value={product.code}>
              {product.code} - {product.name}
            </option>
          ))}
        </select>

        <div className="mt-6 border rounded-2xl bg-gray-50 p-6 text-center">
          <p className="font-bold text-gray-900">
            {selectedProduct.name}
          </p>

          <p className="text-sm text-gray-500 mt-1">
            รหัสสินค้า: {selectedProduct.code}
          </p>

          <div className="bg-white mt-5 p-5 rounded-xl inline-block">
            <Barcode
              value={selectedProduct.barcode}
              format="CODE128"
              width={2}
              height={90}
              displayValue={true}
              fontSize={16}
              margin={0}
            />
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Barcode: {selectedProduct.barcode}
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowBarcodeModal(false)}
            className="border px-5 py-3 rounded-xl text-gray-700"
          >
            ปิด
          </button>

          <button
            onClick={() => window.print()}
            className="bg-red-600 text-white px-5 py-3 rounded-xl flex items-center gap-2"
          >
            <FaPrint />
            พิมพ์บาร์โค้ด
          </button>
        </div>
      </div>
    </div>
  )}
</div>


);
}

function Menu({ icon, text, href, active }) {
return (
<Link
href={href}
className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl whitespace-nowrap ${
        active ? "bg-red-600 shadow-lg" : "hover:bg-white/10"
      }`}
> <span className="text-xl">{icon}</span> <span>{text}</span> </Link>
);
}

function InputField({
label,
name,
value,
onChange,
placeholder,
type = "text",
min,
step,
}) {
return ( <div> <label className="block text-sm font-medium text-gray-700 mb-2">
{label} </label>


  <input
    type={type}
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    min={min}
    step={step}
    className="w-full border rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-red-500"
  />
</div>


);
}

function StatusBadge({ status }) {
const statusStyle = {
"มีสินค้า": "bg-green-100 text-green-600",
"พร้อมขาย": "bg-green-100 text-green-600",
"ใกล้หมด": "bg-orange-100 text-orange-600",
"หมด": "bg-red-100 text-red-600",
};

return (
<span
className={`inline-flex whitespace-nowrap px-4 py-2 rounded-full text-sm ${
        statusStyle[status] || "bg-gray-100 text-gray-600"
      }`}
>
{status} </span>
);
}

function StatCard({ title, value, unit, color }) {
const colorStyle = {
red: "bg-red-600 text-red-600",
green: "bg-green-100 text-green-600",
yellow: "bg-yellow-100 text-yellow-500",
};

const [bg, text] = colorStyle[color].split(" ");

return (
<div
className={`${
        color === "red" ? "bg-red-600 text-white" : "bg-white"
      } rounded-3xl shadow-sm border p-6`}
>
<div
className={`w-16 h-16 ${
          color === "red" ? "bg-red-500" : bg
        } rounded-full mb-4`}
/>


  <p className={color === "red" ? "text-white" : "text-gray-800"}>
    {title}
  </p>

  <div className="flex items-end gap-2 mt-2">
    <h2
      className={`text-3xl font-bold ${
        color === "red" ? "text-white" : text
      }`}
    >
      {value}
    </h2>

    <span className={color === "red" ? "text-white" : "text-gray-500"}>
      {unit}
    </span>
  </div>
</div>


);
}
