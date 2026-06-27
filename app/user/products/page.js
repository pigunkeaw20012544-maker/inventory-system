"use client";

import AccountHeader from "../../components/AccountHeader";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import LogoutButton from "../../components/LogoutButton";
import {
FaHome,
FaBox,
FaShoppingCart,
FaChartBar,
FaSignOutAlt,
FaBell,
FaUser,
FaBarcode,
FaSearch,
FaTimes,
FaCamera,
FaBoxOpen,
FaCheckCircle,
FaExclamationTriangle,
FaPlus,
FaSave,
} from "react-icons/fa";



const emptyForm = {
code: "",
barcode: "",
name: "",
category: "",
price: "",
stock: "",
unit: "ชิ้น",
status: "มีสินค้า",
};

export default function UserProductsPage() {
const [products, setProducts] = useState([]);
const [keyword, setKeyword] = useState("");
const [foundProduct, setFoundProduct] = useState(null);

const [showScanner, setShowScanner] = useState(false);
const [showDetail, setShowDetail] = useState(false);
const [showAddModal, setShowAddModal] = useState(false);

const [formData, setFormData] = useState(emptyForm);
const [formError, setFormError] = useState("");
async function loadProducts() {
const { data, error } = await supabase
.from("products")
.select(`       id,
      product_code,
      barcode,
      name,
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

const mappedProducts = (data || []).map((product) => ({
id: product.id,
code: product.product_code,
barcode: product.barcode,
name: product.name,
category: product.category?.name || "-",
price: Number(product.price).toFixed(2),
stock: product.stock,
unit: product.unit,
status: product.status,
}));

setProducts(mappedProducts);
}

useEffect(() => {
  loadProducts();

  const channel = supabase
    .channel("user-products-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      () => loadProducts()
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
  ].some((value) => value.toLowerCase().includes(search))
);


}, [keyword, products]);

function openProductDetail(product) {
setFoundProduct(product);
setShowDetail(true);
}

function searchProduct(value = keyword) {
const search = value.trim().toLowerCase();


if (!search) return;

const product = products.find(
  (item) =>
    item.barcode === search ||
    item.code.toLowerCase() === search ||
    item.name.toLowerCase().includes(search)
);

setFoundProduct(product || null);
setShowDetail(true);


}

function handleSearch(event) {
event.preventDefault();
searchProduct();
}

function handleFormChange(event) {
const { name, value } = event.target;


setFormData((prev) => ({
  ...prev,
  [name]: value,
}));


}

async function handleAddProduct(event) {
event.preventDefault();

const newCode = formData.code.trim().toUpperCase();
const newBarcode = formData.barcode.trim();
const categoryName = formData.category.trim();

if (
!newCode ||
!newBarcode ||
!formData.name.trim() ||
!categoryName ||
!formData.price ||
!formData.stock
) {
setFormError("กรุณากรอกข้อมูลสินค้าให้ครบทุกช่อง");
return;
}

const { data: categoryData, error: categoryError } = await supabase
.from("categories")
.select("id")
.eq("name", categoryName)
.maybeSingle();

if (categoryError) {
console.error(categoryError);
setFormError("ไม่สามารถตรวจสอบหมวดหมู่สินค้าได้");
return;
}

if (!categoryData) {
setFormError(
"ไม่พบหมวดหมู่นี้ กรุณาใช้: แก้ว, ภาชนะบรรจุ, อุปกรณ์ชงเครื่องดื่ม, อุปกรณ์เสริม หรือ วัตถุดิบ"
);
return;
}

const { error: insertError } = await supabase
.from("products")
.insert({
product_code: newCode,
barcode: newBarcode,
name: formData.name.trim(),
category_id: categoryData.id,
price: Number(formData.price),
stock: Number(formData.stock),
unit: formData.unit.trim() || "ชิ้น",
status: formData.status,
});

if (insertError) {
console.error(insertError);


if (insertError.code === "23505") {
  setFormError("รหัสสินค้าหรือบาร์โค้ดนี้มีอยู่ในระบบแล้ว");
} else {
  setFormError("บันทึกสินค้าไม่สำเร็จ กรุณาลองใหม่");
}

return;


}

await loadProducts();

setFormData(emptyForm);
setFormError("");
setShowAddModal(false);

alert("เพิ่มข้อมูลสินค้าสำเร็จ");
}

useEffect(() => {
if (!showScanner) return;


let scanner;
let cancelled = false;
let scanned = false;

const timer = window.setTimeout(async () => {
  try {
    const { Html5Qrcode } = await import("html5-qrcode");

    if (cancelled) return;

    scanner = new Html5Qrcode("barcode-reader");

    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 280, height: 180 },
      },
      (decodedText) => {
        if (cancelled || scanned) return;

        scanned = true;
        setKeyword(decodedText);

        const product = products.find(
          (item) => item.barcode === decodedText.trim()
        );

        setFoundProduct(product || null);
        setShowScanner(false);
        setShowDetail(true);
      },
      () => {}
    );
  } catch (error) {
    console.error(error);
    alert("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตใช้กล้อง หรือพิมพ์บาร์โค้ดแทน");
    setShowScanner(false);
  }
}, 200);

return () => {
  cancelled = true;
  window.clearTimeout(timer);

  if (scanner) {
    scanner.stop().catch(() => {});
  }
};


}, [showScanner, products]);

return ( <div className="min-h-screen bg-[#f8f9fb] flex"> <aside className="w-[300px] shrink-0 bg-[#111b2b] text-white min-h-screen"> <div className="bg-red-600 p-8 rounded-br-[45px]"> <div className="text-3xl">🥤</div> <h2 className="font-bold mt-3 text-lg">ระบบบริหารจัดการ</h2> <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p> </div>


    <nav className="p-5 space-y-4">
      <Menu icon={<FaHome />} text="หน้าหลัก" href="/user/dashboard" />
      <Menu active icon={<FaBox />} text="สินค้า" href="/user/products" />
      <Menu icon={<FaShoppingCart />} text="การขาย" href="/user/sales" />
      <Menu icon={<FaChartBar />} text="รายงาน" href="/user/reports" />
      <LogoutButton />
    </nav>
  </aside>

  <main className="flex-1 min-w-0 p-6 xl:p-10">
    <header className="flex justify-between items-start mb-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">สินค้า</h1>
        <p className="text-gray-500 mt-2">Products &gt; สินค้า</p>
      </div>

      <AccountHeader />
    </header>

    <section className="bg-white rounded-3xl border shadow-sm p-6 md:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            ค้นหาสินค้าด้วยบาร์โค้ด
          </h2>

          <p className="text-gray-500 mt-2">
            กดสแกนด้วยกล้อง หรือใช้เครื่องยิงบาร์โค้ดกับช่องค้นหา
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setFormError("");
              setShowAddModal(true);
            }}
            className="border border-red-600 text-red-600 px-6 py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-red-50"
          >
            <FaPlus />
            เพิ่มข้อมูลสินค้า
          </button>

          <button
            onClick={() => setShowScanner(true)}
            className="bg-red-600 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 shadow hover:bg-red-700"
          >
            <FaCamera />
            สแกนบาร์โค้ด
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-7 flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-1">
          <FaBarcode className="absolute left-5 top-5 text-gray-500" />

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="พิมพ์หรือยิงบาร์โค้ด เช่น 8851234567890"
            className="w-full border-2 border-gray-300 focus:border-red-500 rounded-xl py-4 pl-12 pr-5 outline-none text-gray-800"
          />
        </div>

        <button
          type="submit"
          className="bg-red-600 text-white px-8 py-4 rounded-xl flex items-center justify-center gap-3"
        >
          <FaSearch />
          ค้นหาสินค้า
        </button>
      </form>
    </section>

    <section className="mt-8 bg-white rounded-3xl border shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-900">รายการสินค้า</h2>
        <p className="text-gray-500">ทั้งหมด {filteredProducts.length} รายการ</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-gray-800">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="p-4 text-left">รหัสสินค้า</th>
              <th className="p-4 text-left">ชื่อสินค้า</th>
              <th className="p-4 text-left">หมวดหมู่</th>
              <th className="p-4 text-left">ราคาขาย</th>
              <th className="p-4 text-left">สต็อก</th>
              <th className="p-4 text-left">บาร์โค้ด</th>
              <th className="p-4 text-center">รายละเอียด</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.code} className="border-b">
                <td className="p-4">{product.code}</td>
                <td className="p-4 font-medium">{product.name}</td>
                <td className="p-4">{product.category}</td>
                <td className="p-4">{product.price} บาท</td>
                <td className="p-4">
                  {product.stock} {product.unit}
                </td>
                <td className="p-4 font-mono text-sm">{product.barcode}</td>

                <td className="p-4 text-center">
                  <button
                    onClick={() => openProductDetail(product)}
                    className="border border-red-500 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
                  >
                    ดูสินค้า
                  </button>
                </td>
              </tr>
            ))}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan="7" className="p-10 text-center text-gray-500">
                  ไม่พบสินค้าที่ค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  </main>

  {showAddModal && (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <form
        onSubmit={handleAddProduct}
        className="bg-white w-full max-w-3xl rounded-3xl p-7 md:p-8 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={() => setShowAddModal(false)}
          className="absolute top-5 right-5 text-gray-500 hover:text-red-600"
        >
          <FaTimes className="text-2xl" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900">
          เพิ่มข้อมูลสินค้า
        </h2>

        <p className="text-gray-500 mt-2">
          กรอกข้อมูลสินค้าเพื่อเพิ่มเข้าสู่รายการสินค้า
        </p>

        {formError && (
          <div className="mt-5 rounded-xl bg-red-50 border border-red-200 text-red-600 px-4 py-3">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <Field
            label="รหัสสินค้า"
            name="code"
            value={formData.code}
            onChange={handleFormChange}
            placeholder="เช่น BEV-0009"
          />

          <Field
            label="บาร์โค้ด"
            name="barcode"
            value={formData.barcode}
            onChange={handleFormChange}
            placeholder="เช่น 8851234500098"
          />

          <Field
            label="ชื่อสินค้า"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            placeholder="ชื่อสินค้า"
          />

          <Field
            label="หมวดหมู่"
            name="category"
            value={formData.category}
            onChange={handleFormChange}
            placeholder="เช่น แก้ว / วัตถุดิบ"
          />

          <Field
            label="ราคาขาย (บาท)"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleFormChange}
            placeholder="0.00"
          />

          <Field
            label="จำนวนสินค้า"
            name="stock"
            type="number"
            value={formData.stock}
            onChange={handleFormChange}
            placeholder="0"
          />

          <Field
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
            onClick={() => setShowAddModal(false)}
            className="border px-5 py-3 rounded-xl text-gray-700"
          >
            ยกเลิก
          </button>

          <button
            type="submit"
            className="bg-red-600 text-white px-5 py-3 rounded-xl flex items-center gap-2"
          >
            <FaSave />
            บันทึกสินค้า
          </button>
        </div>
      </form>
    </div>
  )}

  {showScanner && (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl p-7 relative">
        <button
          onClick={() => setShowScanner(false)}
          className="absolute top-5 right-5 text-gray-500 hover:text-red-600"
        >
          <FaTimes className="text-2xl" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900">
          สแกนบาร์โค้ดสินค้า
        </h2>

        <p className="text-gray-500 mt-2">
          หันกล้องไปที่บาร์โค้ด ระบบจะค้นหาให้ทันที
        </p>

        <div className="mt-6 rounded-2xl overflow-hidden border bg-black">
          <div id="barcode-reader" className="w-full min-h-[280px]" />
        </div>

        <button
          onClick={() => setShowScanner(false)}
          className="mt-5 w-full border py-3 rounded-xl text-gray-700"
        >
          ยกเลิกการสแกน
        </button>
      </div>
    </div>
  )}

  {showDetail && (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-8 relative">
        <button
          onClick={() => setShowDetail(false)}
          className="absolute top-5 right-5 text-gray-500 hover:text-red-600"
        >
          <FaTimes className="text-2xl" />
        </button>

        {foundProduct ? (
          <>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                <FaBoxOpen className="text-2xl" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  ข้อมูลสินค้า
                </h2>
                <p className="text-gray-500">{foundProduct.code}</p>
              </div>
            </div>

            <div className="mt-7 border rounded-2xl p-5">
              <p className="text-xl font-bold text-gray-900">
                {foundProduct.name}
              </p>

              <div className="grid grid-cols-2 gap-4 mt-5 text-gray-700">
                <Info label="หมวดหมู่" value={foundProduct.category} />
                <Info label="ราคาขาย" value={`${foundProduct.price} บาท`} />
                <Info
                  label="จำนวนคงเหลือ"
                  value={`${foundProduct.stock} ${foundProduct.unit}`}
                />
                <Info label="บาร์โค้ด" value={foundProduct.barcode} />
              </div>

              <div className="mt-5">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    foundProduct.status === "มีสินค้า"
                      ? "bg-green-100 text-green-600"
                      : foundProduct.status === "ใกล้หมด"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  <FaCheckCircle />
                  {foundProduct.status}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <FaExclamationTriangle className="text-5xl text-orange-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900 mt-5">
              ไม่พบสินค้า
            </h2>
            <p className="text-gray-500 mt-2">
              ไม่พบข้อมูลจากบาร์โค้ดนี้ในระบบ
            </p>
          </div>
        )}

        <button
          onClick={() => setShowDetail(false)}
          className="mt-7 w-full bg-red-600 text-white py-3 rounded-xl"
        >
          ปิดหน้าต่าง
        </button>
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

function Field({
label,
name,
value,
onChange,
placeholder,
type = "text",
}) {
return ( <div> <label className="block text-sm font-medium text-gray-700 mb-2">
{label} </label>

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

function Info({ label, value }) {
return ( <div> <p className="text-sm text-gray-500">{label}</p> <p className="font-semibold mt-1 break-words">{value}</p> </div>
);
}

function StatusBadge({ status }) {
const statusStyle = {
"มีสินค้า": "bg-green-100 text-green-600",
"พร้อมขาย": "bg-green-100 text-green-600",
"ใกล้หมด": "bg-orange-100 text-orange-600",
"หมด": "bg-red-100 text-red-600",
};

const colorClass =
statusStyle[status] || "bg-gray-100 text-gray-600";

return (
<span
className={
"inline-flex whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium " +
colorClass
}
>
{status} </span>
);
}
