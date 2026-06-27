"use client";

import AccountHeader from "../components/AccountHeader";
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
FaTrash,
FaCalendarAlt,
FaSave,
FaTimes,
FaSearch,
FaSyncAlt,
} from "react-icons/fa";

function getToday() {
const date = new Date();
const offset = date.getTimezoneOffset();
return new Date(date.getTime() - offset * 60 * 1000)
.toISOString()
.slice(0, 10);
}

function createSaleNumber() {
const now = new Date();

const date = [
now.getFullYear(),
String(now.getMonth() + 1).padStart(2, "0"),
String(now.getDate()).padStart(2, "0"),
].join("");

const time = [
String(now.getHours()).padStart(2, "0"),
String(now.getMinutes()).padStart(2, "0"),
String(now.getSeconds()).padStart(2, "0"),
].join("");

const random = Math.floor(100 + Math.random() * 900);

return `INV-${date}-${time}-${random}`;
}

function toNumber(value) {
const number = Number(value);
return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
return toNumber(value).toLocaleString("th-TH", {
minimumFractionDigits: 2,
maximumFractionDigits: 2,
});
}

export default function SalesPage() {
const [products, setProducts] = useState([]);
const [cart, setCart] = useState([]);

const [productSearch, setProductSearch] = useState("");
const [saleDate, setSaleDate] = useState(getToday());
const [sellerName, setSellerName] = useState("Admin");
const [saleNumber, setSaleNumber] = useState(createSaleNumber());
const [note, setNote] = useState("");
const [globalDiscount, setGlobalDiscount] = useState("0");

const [isSaving, setIsSaving] = useState(false);
const [isRefreshing, setIsRefreshing] = useState(false);

async function loadProducts() {
const { data, error } = await supabase
.from("products")
.select(`         id,
        product_code,
        barcode,
        name,
        price,
        stock,
        unit,
        status,
        category:categories(name)
      `)
.order("name", { ascending: true });


if (error) {
  console.error(error);
  alert("ไม่สามารถโหลดข้อมูลสินค้าได้");
  return;
}

const mappedProducts = (data || []).map((product) => {
  const categoryName = Array.isArray(product.category)
    ? product.category[0]?.name
    : product.category?.name;

  return {
    id: String(product.id),
    code: product.product_code,
    barcode: product.barcode || "",
    name: product.name,
    category: categoryName || "-",
    price: toNumber(product.price),
    stock: toNumber(product.stock),
    unit: product.unit || "ชิ้น",
    status: product.status || "มีสินค้า",
  };
});

setProducts(mappedProducts);


}

useEffect(() => {
loadProducts();
}, []);

const productResults = useMemo(() => {
const search = productSearch.trim().toLowerCase();


return products
  .filter((product) => {
    if (!search) return true;

    return [
      product.code,
      product.barcode,
      product.name,
      product.category,
    ].some((value) => String(value).toLowerCase().includes(search));
  })
  .slice(0, 8);


}, [products, productSearch]);

const itemAmount = useMemo(() => {
return cart.reduce(
(sum, item) => sum + toNumber(item.quantity) * toNumber(item.price),
0
);
}, [cart]);

const itemDiscount = useMemo(() => {
return cart.reduce((sum, item) => sum + toNumber(item.discount), 0);
}, [cart]);

const saleDiscount = Math.max(0, toNumber(globalDiscount));
const subtotal = Math.max(0, itemAmount - itemDiscount);
const totalDiscount = itemDiscount + saleDiscount;
const grandTotal = Math.max(0, subtotal - saleDiscount);

function addProduct(product) {
if (product.stock <= 0) {
alert(`สินค้า "${product.name}" หมดสต็อก`);
return;
}


setCart((previous) => {
  const exists = previous.find((item) => item.productId === product.id);

  if (exists) {
    return previous.map((item) =>
      item.productId === product.id
        ? {
            ...item,
            quantity: Math.min(item.quantity + 1, item.stock),
          }
        : item
    );
  }

  return [
    ...previous,
    {
      productId: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      stock: product.stock,
      unit: product.unit,
      quantity: 1,
      price: product.price,
      discount: 0,
    },
  ];
});

setProductSearch("");


}

function handleProductSearchKeyDown(event) {
if (event.key !== "Enter") return;


event.preventDefault();

const search = productSearch.trim().toLowerCase();

const exactProduct = products.find(
  (product) =>
    product.code.toLowerCase() === search ||
    product.barcode.toLowerCase() === search
);

if (exactProduct) {
  addProduct(exactProduct);
  return;
}

if (productResults.length === 1) {
  addProduct(productResults[0]);
  return;
}

alert("ไม่พบรหัสสินค้าหรือบาร์โค้ดที่ค้นหา");


}

function updateCartItem(productId, field, value) {
setCart((previous) =>
previous.map((item) => {
if (item.productId !== productId) return item;


    if (field === "quantity") {
      const quantity = Math.max(
        1,
        Math.min(Math.floor(toNumber(value)), item.stock)
      );

      return {
        ...item,
        quantity,
      };
    }

    return {
      ...item,
      [field]: Math.max(0, toNumber(value)),
    };
  })
);


}

function removeCartItem(productId) {
setCart((previous) =>
previous.filter((item) => item.productId !== productId)
);
}

function clearCart() {
if (cart.length === 0) return;


const confirmed = window.confirm("ต้องการล้างรายการขายทั้งหมดใช่หรือไม่?");

if (!confirmed) return;

setCart([]);
setGlobalDiscount("0");
setNote("");


}

function cancelSale() {
if (cart.length > 0) {
const confirmed = window.confirm(
"ต้องการยกเลิกรายการขายนี้ใช่หรือไม่?"
);


  if (!confirmed) return;
}

setCart([]);
setProductSearch("");
setGlobalDiscount("0");
setNote("");
setSaleNumber(createSaleNumber());


}

async function handleRefresh() {
setIsRefreshing(true);
await loadProducts();
setIsRefreshing(false);
}

async function handleSaveSale() {
if (cart.length === 0) {
alert("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ");
return;
}


const hasOverStock = cart.some(
  (item) => toNumber(item.quantity) > toNumber(item.stock)
);

if (hasOverStock) {
  alert("มีสินค้าที่ระบุจำนวนเกินสต็อก กรุณาตรวจสอบอีกครั้ง");
  return;
}

const currentSaleNumber = saleNumber;

setIsSaving(true);

const { error } = await supabase.rpc("create_sale", {
  p_sale_number: currentSaleNumber,
  p_sale_date: saleDate,
  p_seller_name: sellerName.trim() || "Admin",
  p_note: note.trim(),
  p_discount: saleDiscount,
  p_items: cart.map((item) => ({
    product_id: item.productId,
    quantity: toNumber(item.quantity),
    price: toNumber(item.price),
    discount: toNumber(item.discount),
  })),
});

setIsSaving(false);

if (error) {
  console.error(error);
  alert(error.message || "บันทึกการขายไม่สำเร็จ");
  return;
}

await loadProducts();

setCart([]);
setProductSearch("");
setGlobalDiscount("0");
setNote("");
setSaleNumber(createSaleNumber());

alert(`บันทึกการขายสำเร็จ\nเลขที่บิล: ${currentSaleNumber}`);


}

return ( <div className="min-h-screen bg-[#f8f9fb] flex"> <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden"> <div className="bg-red-600 p-8 rounded-br-[45px]"> <div className="text-3xl">🥤</div> <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2> <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p> </div>


    <nav className="p-6 space-y-4">
      <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />
      <Menu icon={<FaBox />} text="สินค้า" href="/products" />
      <Menu icon={<FaThLarge />} text="หมวดหมู่สินค้า" href="/categories" />
      <Menu active icon={<FaShoppingCart />} text="การขาย" href="/sales" />
      <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
      <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
      <LogoutButton />
    </nav>
  </aside>

  <main className="flex-1 min-w-0 p-6 xl:p-10">
    <div className="flex justify-end mb-6">
  <AccountHeader />
</div>
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-gray-900">ขายสินค้า</h1>
      <p className="text-gray-500 mt-2">Sales &gt; ขายสินค้า</p>
    </div>

    <div className="bg-white rounded-3xl shadow-sm border p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        ข้อมูลการขาย
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Field
          label="วันที่ขาย"
          value={saleDate}
          onChange={(event) => setSaleDate(event.target.value)}
          type="date"
          icon={<FaCalendarAlt />}
        />

        <Field
          label="เลขที่บิล"
          value={saleNumber}
          disabled
        />

        <Field
          label="พนักงานขาย"
          value={sellerName}
          onChange={(event) => setSellerName(event.target.value)}
          placeholder="เช่น Admin"
        />
      </div>
    </div>

    <div className="bg-white rounded-3xl shadow-sm border p-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          เพิ่มรายการสินค้า
        </h2>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="border px-5 py-3 rounded-xl text-gray-700 flex items-center gap-2 disabled:opacity-60"
        >
          <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชสินค้า"}
        </button>
      </div>

      <div className="relative">
        <FaSearch className="absolute left-4 top-4 text-gray-400" />

        <input
          value={productSearch}
          onChange={(event) => setProductSearch(event.target.value)}
          onKeyDown={handleProductSearchKeyDown}
          placeholder="ค้นหาชื่อสินค้า / รหัสสินค้า / สแกนบาร์โค้ด แล้วกด Enter"
          className="w-full border rounded-xl py-4 pl-12 pr-4 text-gray-800 outline-none focus:border-red-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 mt-5">
        {productResults.map((product) => (
          <button
            key={product.id}
            onClick={() => addProduct(product)}
            disabled={product.stock <= 0}
            className="text-left border rounded-2xl p-4 hover:border-red-400 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex justify-between gap-3">
              <p className="font-bold text-gray-900">{product.code}</p>
              <span className="text-sm text-red-600">
                ฿{formatMoney(product.price)}
              </span>
            </div>

            <p className="text-gray-700 mt-2 line-clamp-1">
              {product.name}
            </p>

            <p className="text-sm text-gray-500 mt-2">
              {product.category} · คงเหลือ {product.stock} {product.unit}
            </p>
          </button>
        ))}
      </div>

      {productResults.length === 0 && (
        <p className="text-gray-500 mt-5">
          ไม่พบสินค้าที่ค้นหา
        </p>
      )}
    </div>

    <div className="bg-white rounded-3xl shadow-sm border p-6 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          รายการสินค้าในบิล
        </h2>

        <button
          onClick={clearCart}
          disabled={cart.length === 0}
          className="border border-red-200 text-red-600 px-5 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50"
        >
          <FaTrash />
          ล้างรายการทั้งหมด
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px]">
          <thead className="bg-gray-100">
            <tr className="text-gray-700">
              <th className="p-4 text-left">#</th>
              <th className="p-4 text-left">รหัสสินค้า</th>
              <th className="p-4 text-left">ชื่อสินค้า</th>
              <th className="p-4 text-left">หมวดหมู่</th>
              <th className="p-4 text-left">จำนวน</th>
              <th className="p-4 text-left">หน่วย</th>
              <th className="p-4 text-left">ราคาต่อหน่วย</th>
              <th className="p-4 text-left">ส่วนลด</th>
              <th className="p-4 text-left">รวมเงิน</th>
              <th className="p-4 text-left">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {cart.length > 0 ? (
              cart.map((item, index) => {
                const lineTotal = Math.max(
                  0,
                  toNumber(item.quantity) * toNumber(item.price) -
                    toNumber(item.discount)
                );

                return (
                  <tr key={item.productId} className="border-b text-gray-800">
                    <td className="p-4">{index + 1}</td>
                    <td className="p-4 font-semibold">{item.code}</td>
                    <td className="p-4">{item.name}</td>
                    <td className="p-4">{item.category}</td>

                    <td className="p-4">
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        onChange={(event) =>
                          updateCartItem(
                            item.productId,
                            "quantity",
                            event.target.value
                          )
                        }
                        className="w-24 border rounded-xl px-3 py-2 text-center"
                      />

                      <p className="text-xs text-gray-400 mt-1">
                        คงเหลือ {item.stock}
                      </p>
                    </td>

                    <td className="p-4">{item.unit}</td>

                    <td className="p-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(event) =>
                          updateCartItem(
                            item.productId,
                            "price",
                            event.target.value
                          )
                        }
                        className="w-28 border rounded-xl px-3 py-2 text-center"
                      />
                    </td>

                    <td className="p-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(event) =>
                          updateCartItem(
                            item.productId,
                            "discount",
                            event.target.value
                          )
                        }
                        className="w-28 border rounded-xl px-3 py-2 text-center"
                      />
                    </td>

                    <td className="p-4 font-bold">
                      {formatMoney(lineTotal)}
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => removeCartItem(item.productId)}
                        className="border rounded-xl p-3 text-red-600 hover:bg-red-50"
                        title="ลบรายการ"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="10"
                  className="p-12 text-center text-gray-500"
                >
                  ยังไม่มีสินค้าในบิล กรุณาเลือกสินค้าด้านบน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
        <div className="xl:col-span-2">
          <label className="block text-gray-700 mb-2">
            หมายเหตุ
          </label>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="เพิ่มหมายเหตุ (ไม่บังคับ)"
            rows="5"
            className="w-full border rounded-xl px-5 py-4 text-gray-800 outline-none focus:border-red-500 resize-none"
          />
        </div>

        <div className="bg-red-50 rounded-2xl p-6">
          <div className="flex justify-between mb-4 text-gray-700">
            <span>รวมสินค้า ({cart.length} รายการ)</span>
            <span>{formatMoney(itemAmount)} บาท</span>
          </div>

          <div className="flex justify-between mb-4 text-gray-700">
            <span>ส่วนลดสินค้า</span>
            <span>{formatMoney(itemDiscount)} บาท</span>
          </div>

          <div className="flex items-center justify-between gap-3 mb-5">
            <span className="text-gray-700 whitespace-nowrap">
              ส่วนลดรวม
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={globalDiscount}
              onChange={(event) => setGlobalDiscount(event.target.value)}
              className="w-32 border rounded-xl px-3 py-2 text-center bg-white"
            />

            <span className="text-gray-700">บาท</span>
          </div>

          <div className="border-t border-red-200 pt-5">
            <div className="flex justify-between mb-2 text-gray-700">
              <span>ส่วนลดทั้งหมด</span>
              <span>{formatMoney(totalDiscount)} บาท</span>
            </div>

            <div className="flex justify-between items-end gap-3">
              <span className="text-red-600 font-bold text-xl">
                ยอดรวมสุทธิ
              </span>

              <span className="text-red-600 font-bold text-3xl text-right">
                {formatMoney(grandTotal)}
                <span className="text-lg ml-1">บาท</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="flex justify-between mt-8">
      <button
        onClick={cancelSale}
        disabled={isSaving}
        className="bg-white border px-8 py-4 rounded-2xl flex items-center gap-3 text-gray-700 disabled:opacity-60"
      >
        <FaTimes />
        ยกเลิก
      </button>

      <button
        onClick={handleSaveSale}
        disabled={isSaving || cart.length === 0}
        className="bg-red-600 text-white px-12 py-4 rounded-2xl flex items-center gap-3 shadow-lg disabled:bg-red-300"
      >
        <FaSave />
        {isSaving ? "กำลังบันทึก..." : "บันทึกการขาย"}
      </button>
    </div>
  </main>
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

function Field({
label,
value,
onChange,
icon,
disabled = false,
type = "text",
placeholder = "",
}) {
return ( <div> <label className="block mb-2 font-medium text-gray-700">
{label} </label>


  <div className="relative">
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full border rounded-xl px-5 py-4 text-gray-800 outline-none ${
        icon ? "pr-12" : ""
      } ${disabled ? "bg-gray-100 text-gray-500" : "bg-white"}`}
    />

    {icon && (
      <span className="absolute right-4 top-4 text-gray-400">
        {icon}
      </span>
    )}
  </div>
</div>


);
}
