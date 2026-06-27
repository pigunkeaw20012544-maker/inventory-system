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
FaBell,
FaUser,
FaBarcode,
FaSearch,
FaTrash,
FaSave,
FaPrint,
FaSyncAlt,
FaMinus,
FaPlus,
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

function escapeHtml(value) {
return String(value ?? "")
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', '"')
.replaceAll("'", "'");
}

export default function UserSalesPage() {
const [products, setProducts] = useState([]);
const [cart, setCart] = useState([]);

const [productSearch, setProductSearch] = useState("");
const [saleDate, setSaleDate] = useState(getToday());
const [saleNumber, setSaleNumber] = useState(createSaleNumber());
const [note, setNote] = useState("");
const [globalDiscount, setGlobalDiscount] = useState("0");

const [isLoadingProducts, setIsLoadingProducts] = useState(true);
const [isRefreshing, setIsRefreshing] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [errorMessage, setErrorMessage] = useState("");
const [lastReceipt, setLastReceipt] = useState(null);

async function loadProducts() {
setIsLoadingProducts(true);
setErrorMessage("");


const { data, error } = await supabase
  .from("products")
  .select(`
    id,
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
  setErrorMessage("ไม่สามารถโหลดข้อมูลสินค้าได้");
  setProducts([]);
  setIsLoadingProducts(false);
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
setIsLoadingProducts(false);


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

const subtotal = Math.max(0, itemAmount - itemDiscount);
const globalDiscountAmount = Math.min(
Math.max(0, toNumber(globalDiscount)),
subtotal
);
const grandTotal = Math.max(0, subtotal - globalDiscountAmount);

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
      barcode: product.barcode,
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

function addProductFromSearch() {
const search = productSearch.trim().toLowerCase();


if (!search) {
  alert("กรุณาพิมพ์รหัสสินค้า หรือบาร์โค้ดก่อน");
  return;
}

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

if (productResults.length > 1) {
  alert("พบสินค้าหลายรายการ กรุณาเลือกสินค้าจากรายการด้านล่าง");
  return;
}

alert("ไม่พบสินค้าจากรหัสหรือบาร์โค้ดนี้");


}

function handleSearchKeyDown(event) {
if (event.key !== "Enter") return;


event.preventDefault();
addProductFromSearch();


}

function updateQuantity(productId, value) {
setCart((previous) =>
previous.map((item) => {
if (item.productId !== productId) return item;


    const quantity = Math.max(
      1,
      Math.min(Math.floor(toNumber(value)), item.stock)
    );

    return {
      ...item,
      quantity,
    };
  })
);


}

function increaseQuantity(productId) {
setCart((previous) =>
previous.map((item) =>
item.productId === productId
? {
...item,
quantity: Math.min(item.quantity + 1, item.stock),
}
: item
)
);
}

function decreaseQuantity(productId) {
setCart((previous) =>
previous.map((item) =>
item.productId === productId
? {
...item,
quantity: Math.max(1, item.quantity - 1),
}
: item
)
);
}

function updateDiscount(productId, value) {
setCart((previous) =>
previous.map((item) =>
item.productId === productId
? {
...item,
discount: Math.max(0, toNumber(value)),
}
: item
)
);
}

function removeCartItem(productId) {
setCart((previous) =>
previous.filter((item) => item.productId !== productId)
);
}

function clearCart() {
if (cart.length === 0) return;


const confirmed = window.confirm(
  "ต้องการล้างรายการสินค้าทั้งหมดใช่หรือไม่?"
);

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

setIsSaving(true);

const currentSaleNumber = saleNumber;
const cartSnapshot = cart.map((item) => ({ ...item }));

const { error } = await supabase.rpc("create_sale", {
  p_sale_number: currentSaleNumber,
  p_sale_date: saleDate,
  p_seller_name: "User",
  p_note: note.trim(),
  p_discount: globalDiscountAmount,
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

setLastReceipt({
  saleNumber: currentSaleNumber,
  saleDate,
  items: cartSnapshot,
  itemAmount,
  itemDiscount,
  globalDiscount: globalDiscountAmount,
  total: grandTotal,
});

await loadProducts();

setCart([]);
setProductSearch("");
setGlobalDiscount("0");
setNote("");
setSaleNumber(createSaleNumber());

alert(`บันทึกการขายสำเร็จ\nเลขที่บิล: ${currentSaleNumber}`);


}

function printLastReceipt() {
if (!lastReceipt) {
alert("กรุณาบันทึกการขายก่อนพิมพ์ใบเสร็จ");
return;
}


const receiptWindow = window.open("", "_blank", "width=450,height=700");

if (!receiptWindow) {
  alert("กรุณาอนุญาต Pop-up เพื่อพิมพ์ใบเสร็จ");
  return;
}

const rows = lastReceipt.items
  .map((item) => {
    const lineTotal = Math.max(
      0,
      toNumber(item.quantity) * toNumber(item.price) -
        toNumber(item.discount)
    );

    return `
      <tr>
        <td>
          <strong>${escapeHtml(item.name)}</strong><br />
          <small>${escapeHtml(item.code)}</small>
        </td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">${formatMoney(lineTotal)}</td>
      </tr>
    `;
  })
  .join("");

receiptWindow.document.write(`
  <html>
    <head>
      <title>ใบเสร็จ ${escapeHtml(lastReceipt.saleNumber)}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 24px;
          color: #111827;
        }
        h2, p {
          margin: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        td, th {
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .total {
          margin-top: 18px;
          font-size: 20px;
          font-weight: bold;
          color: #dc2626;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <h2>ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</h2>
      <p>ใบเสร็จรับเงิน</p>
      <br />
      <p>เลขที่บิล: ${escapeHtml(lastReceipt.saleNumber)}</p>
      <p>วันที่: ${escapeHtml(lastReceipt.saleDate)}</p>

      <table>
        <thead>
          <tr>
            <th style="text-align:left">สินค้า</th>
            <th style="text-align:right">จำนวน</th>
            <th style="text-align:right">รวม</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="total">
        <span>ยอดสุทธิ</span>
        <span>${formatMoney(lastReceipt.total)} บาท</span>
      </div>

      <p style="margin-top:30px;text-align:center">ขอบคุณที่ใช้บริการ</p>
    </body>
  </html>
`);

receiptWindow.document.close();
receiptWindow.focus();

setTimeout(() => {
  receiptWindow.print();
}, 300);


}

return ( <div className="min-h-screen flex bg-[#f8f9fb]"> <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden"> <div className="bg-red-600 p-8 rounded-br-[45px]"> <div className="text-3xl">🥤</div> <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2> <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p> </div>


    <nav className="p-6 space-y-4">
      <Menu icon={<FaHome />} text="หน้าหลัก" href="/user/dashboard" />
      <Menu icon={<FaBox />} text="สินค้า" href="/user/products" />
      <Menu active icon={<FaShoppingCart />} text="การขาย" href="/user/sales" />
      <Menu icon={<FaChartBar />} text="รายงาน" href="/user/reports" />
      <LogoutButton />
    </nav>
  </aside>

  <main className="flex-1 min-w-0 p-6 xl:p-10">
    <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-6 mb-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">การขาย</h1>
        <p className="text-gray-500 mt-2">Sales &gt; การขายสินค้า</p>
      </div>

      <AccountHeader />
    </div>

    {errorMessage && (
      <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
        {errorMessage}
      </div>
    )}

    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
      <section className="bg-white rounded-3xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          ข้อมูลการขาย
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-gray-700 mb-2">วันที่ขาย</label>
            <input
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              className="border rounded-xl p-4 w-full text-gray-800"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">เลขที่บิล</label>
            <input
              value={saleNumber}
              readOnly
              className="border rounded-xl p-4 w-full bg-gray-100 text-gray-500"
            />
          </div>
        </div>

        <label className="block text-gray-700 mb-2">
          ค้นหาสินค้า / สแกนบาร์โค้ด
        </label>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <FaBarcode className="absolute left-4 top-4 text-gray-400" />

            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="border rounded-xl p-4 pl-12 w-full text-gray-800 outline-none focus:border-red-500"
              placeholder="พิมพ์ชื่อสินค้า รหัสสินค้า หรือบาร์โค้ด"
            />
          </div>

          <button
            onClick={addProductFromSearch}
            className="bg-red-600 text-white px-5 rounded-xl flex items-center gap-2"
          >
            <FaSearch />
            เพิ่ม
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-3">
          ใช้เครื่องสแกนบาร์โค้ดยิงที่ช่องนี้ แล้วกด Enter ได้ทันที
        </p>

        <div className="mt-7">
          <h3 className="font-bold text-xl text-gray-900 mb-4">
            {productSearch ? "ผลการค้นหา" : "สินค้าในระบบ"}
          </h3>

          {isLoadingProducts ? (
            <p className="text-gray-500">กำลังโหลดสินค้า...</p>
          ) : productResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  disabled={product.stock <= 0}
                  className="text-left border rounded-2xl p-4 hover:border-red-400 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex justify-between gap-3">
                    <p className="font-bold text-gray-900">
                      {product.code}
                    </p>

                    <span className="font-bold text-red-600">
                      ฿ {formatMoney(product.price)}
                    </span>
                  </div>

                  <p className="text-gray-700 mt-2">{product.name}</p>

                  <p className="text-sm text-gray-500 mt-2">
                    {product.category} · คงเหลือ {product.stock}{" "}
                    {product.unit}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">ไม่พบสินค้าที่ค้นหา</p>
          )}
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-sm border p-6">
        <div className="flex justify-between items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            รายการสินค้าที่ขาย
          </h2>

          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="text-red-600 flex items-center gap-2 disabled:opacity-50"
          >
            <FaTrash />
            ล้างรายการ
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="text-left py-3">สินค้า</th>
                <th className="text-center py-3">ราคา</th>
                <th className="text-center py-3">จำนวน</th>
                <th className="text-center py-3">ส่วนลด</th>
                <th className="text-center py-3">ยอดรวม</th>
                <th className="py-3"></th>
              </tr>
            </thead>

            <tbody>
              {cart.length > 0 ? (
                cart.map((item) => {
                  const lineTotal = Math.max(
                    0,
                    toNumber(item.quantity) * toNumber(item.price) -
                      toNumber(item.discount)
                  );

                  return (
                    <tr key={item.productId} className="border-b">
                      <td className="py-4">
                        <p className="font-bold text-gray-900">
                          {item.name}
                        </p>

                        <p className="text-gray-500 text-sm">
                          {item.code} · คงเหลือ {item.stock} {item.unit}
                        </p>
                      </td>

                      <td className="text-center">
                        ฿ {formatMoney(item.price)}
                      </td>

                      <td className="text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() =>
                              decreaseQuantity(item.productId)
                            }
                            className="border w-8 h-8 rounded-lg"
                          >
                            <FaMinus className="mx-auto text-xs" />
                          </button>

                          <input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={(event) =>
                              updateQuantity(
                                item.productId,
                                event.target.value
                              )
                            }
                            className="border rounded-lg w-14 py-2 text-center"
                          />

                          <button
                            onClick={() =>
                              increaseQuantity(item.productId)
                            }
                            className="border w-8 h-8 rounded-lg"
                          >
                            <FaPlus className="mx-auto text-xs" />
                          </button>
                        </div>
                      </td>

                      <td className="text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(event) =>
                            updateDiscount(
                              item.productId,
                              event.target.value
                            )
                          }
                          className="border rounded-lg w-20 py-2 text-center"
                        />
                      </td>

                      <td className="text-center font-bold text-gray-900">
                        ฿ {formatMoney(lineTotal)}
                      </td>

                      <td className="text-red-600 text-center">
                        <button
                          onClick={() => removeCartItem(item.productId)}
                          className="p-2 hover:bg-red-50 rounded-lg"
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
                    colSpan="6"
                    className="py-16 text-center text-gray-500"
                  >
                    ยังไม่มีสินค้าในรายการขาย
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-gray-50 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between text-gray-700">
            <span>รวมราคาสินค้า</span>
            <b>฿ {formatMoney(itemAmount)}</b>
          </div>

          <div className="flex justify-between text-gray-700">
            <span>ส่วนลดสินค้า</span>
            <b>฿ {formatMoney(itemDiscount)}</b>
          </div>

          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-700">ส่วนลดรวม</span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={globalDiscount}
              onChange={(event) => setGlobalDiscount(event.target.value)}
              className="border rounded-xl p-2 w-36 text-right bg-white"
            />

            <span className="text-gray-700">บาท</span>
          </div>

          <div className="flex justify-between text-red-600 text-2xl font-bold pt-4 border-t">
            <span>ยอดรวมสุทธิ</span>
            <span>฿ {formatMoney(grandTotal)}</span>
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-gray-700 mb-2">หมายเหตุ</label>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="เพิ่มหมายเหตุ (ไม่บังคับ)"
            rows="3"
            className="border rounded-xl p-4 w-full text-gray-800 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <button
            onClick={cancelSale}
            disabled={isSaving}
            className="border px-6 py-4 rounded-xl text-gray-700 disabled:opacity-60"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleSaveSale}
            disabled={isSaving || cart.length === 0}
            className="bg-red-600 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 disabled:bg-red-300"
          >
            <FaSave />
            {isSaving ? "กำลังบันทึก..." : "บันทึกการขาย"}
          </button>

          <button
            onClick={printLastReceipt}
            disabled={!lastReceipt}
            className="col-span-2 border px-6 py-4 rounded-xl flex items-center justify-center gap-3 text-gray-700 disabled:opacity-50"
          >
            <FaPrint />
            พิมพ์ใบเสร็จล่าสุด
          </button>
        </div>
      </section>
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
