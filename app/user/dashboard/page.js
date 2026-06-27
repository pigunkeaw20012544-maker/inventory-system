"use client";

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
FaSyncAlt,
FaArrowRight,
} from "react-icons/fa";

function getLocalDateString(date = new Date()) {
const offset = date.getTimezoneOffset();

return new Date(date.getTime() - offset * 60 * 1000)
.toISOString()
.slice(0, 10);
}

function getDaysAgoString(daysAgo) {
const date = new Date();
date.setDate(date.getDate() - daysAgo);

return getLocalDateString(date);
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

function formatThaiDate(value) {
if (!value) return "-";

const date = new Date(`${value}T00:00:00`);

return date.toLocaleDateString("th-TH", {
day: "numeric",
month: "long",
year: "numeric",
});
}

function formatDateTime(value) {
if (!value) return "-";

return new Date(value).toLocaleString("th-TH", {
day: "2-digit",
month: "2-digit",
year: "numeric",
hour: "2-digit",
minute: "2-digit",
});
}

export default function UserDashboardPage() {
const [products, setProducts] = useState([]);
const [sales, setSales] = useState([]);

const [isLoading, setIsLoading] = useState(true);
const [isRefreshing, setIsRefreshing] = useState(false);
const [errorMessage, setErrorMessage] = useState("");

async function loadDashboard() {
setIsLoading(true);
setErrorMessage("");


const [
  { data: productData, error: productError },
  { data: salesData, error: salesError },
] = await Promise.all([
  supabase
    .from("products")
    .select("id, name, stock, unit, status")
    .order("stock", { ascending: true }),

  supabase
    .from("sales")
    .select(`
      id,
      sale_number,
      sale_date,
      seller_name,
      total_amount,
      created_at
    `)
    .eq("seller_name", "User")
    .order("created_at", { ascending: false })
    .limit(100),
]);

if (productError || salesError) {
  console.error(productError || salesError);

  setErrorMessage(
    "ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาลองกดรีเฟรชอีกครั้ง"
  );
}

setProducts(productData || []);
setSales(salesData || []);
setIsLoading(false);


}

useEffect(() => {
loadDashboard();
}, []);

const today = getLocalDateString();

const lowStockProducts = useMemo(() => {
return products
.filter(
(product) =>
product.status === "ใกล้หมด" ||
product.status === "หมด" ||
toNumber(product.stock) <= 20
)
.sort((a, b) => toNumber(a.stock) - toNumber(b.stock));
}, [products]);

const outOfStockProducts = useMemo(() => {
return products.filter(
(product) =>
product.status === "หมด" || toNumber(product.stock) <= 0
);
}, [products]);

const todaySales = useMemo(() => {
return sales
.filter((sale) => sale.sale_date === today)
.reduce((sum, sale) => sum + toNumber(sale.total_amount), 0);
}, [sales, today]);

const todayBillCount = useMemo(() => {
return sales.filter((sale) => sale.sale_date === today).length;
}, [sales, today]);

const dailySales = useMemo(() => {
const groupedSales = sales.reduce((result, sale) => {
result[sale.sale_date] =
(result[sale.sale_date] || 0) + toNumber(sale.total_amount);


  return result;
}, {});

return Array.from({ length: 7 }, (_, index) => {
  const date = getDaysAgoString(6 - index);

  return {
    date,
    label: date.slice(8, 10),
    amount: groupedSales[date] || 0,
  };
});


}, [sales]);

const maxDailySales = Math.max(
...dailySales.map((item) => item.amount),
1
);

const recentSales = sales.slice(0, 5);

async function handleRefresh() {
setIsRefreshing(true);
await loadDashboard();
setIsRefreshing(false);
}

return ( <div className="min-h-screen flex bg-[#f8f9fb]"> <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden"> <div className="bg-red-600 p-8 rounded-br-[45px]"> <div className="text-3xl">🥤</div>


      <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2>

      <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p>
    </div>

    <nav className="p-6 space-y-4">
      <Menu
        active
        icon={<FaHome />}
        text="หน้าหลัก"
        href="/user/dashboard"
      />

      <Menu icon={<FaBox />} text="สินค้า" href="/user/products" />

      <Menu
        icon={<FaShoppingCart />}
        text="การขาย"
        href="/user/sales"
      />

      <Menu
        icon={<FaChartBar />}
        text="รายงาน"
        href="/user/reports"
      />

      <LogoutButton />
    </nav>
  </aside>

  <main className="flex-1 min-w-0 p-6 xl:p-10">
    <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-6 mb-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">
          สวัสดี, พนักงานขาย
        </h1>

        <p className="text-gray-500 mt-2">
          ยินดีต้อนรับเข้าสู่ระบบ
        </p>
      </div>

      <div className="flex items-center gap-5">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-white border rounded-xl px-5 py-3 flex items-center gap-2 text-gray-700 disabled:opacity-60"
        >
          <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
        </button>

        <FaBell className="text-xl text-gray-700" />

        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white">
          <FaUser />
        </div>

        <div>
          <p className="font-bold text-gray-900">พนักงานขาย</p>
          <p className="text-gray-500">User</p>
        </div>
      </div>
    </div>

    {errorMessage && (
      <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
        {errorMessage}
      </div>
    )}

    <div className="bg-white border rounded-2xl px-5 py-3 mb-6 inline-flex items-center gap-3 text-gray-700">
      ยอดขายวันที่ {formatThaiDate(today)}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 mb-6">
      <Card
        title="จำนวนสินค้าทั้งหมด"
        value={products.length.toLocaleString()}
        unit="รายการ"
        color="red"
        href="/user/products"
      />

      <Card
        title="สินค้าใกล้หมด"
        value={lowStockProducts.length.toLocaleString()}
        unit="รายการ"
        color="orange"
        href="/user/products"
      />

      <Card
        title="สินค้าหมด"
        value={outOfStockProducts.length.toLocaleString()}
        unit="รายการ"
        color="red"
        href="/user/products"
      />

      <Card
        title="ยอดขายวันนี้"
        value={`฿ ${formatMoney(todaySales)}`}
        unit=""
        color="green"
        href="/user/sales"
      />
    </div>

    <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
      <section className="2xl:col-span-2 bg-white rounded-3xl shadow-sm border p-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              ยอดขาย 7 วันล่าสุด
            </h2>

            <p className="text-3xl font-bold text-red-600 mt-4">
              ฿ {formatMoney(todaySales)}
            </p>

            <p className="text-gray-500 mt-2">
              วันนี้ขายได้ {todayBillCount} บิล
            </p>
          </div>

          <Link
            href="/user/reports"
            className="border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm"
          >
            ดูรายงาน
          </Link>
        </div>

        <div className="h-64 mt-8 flex items-end gap-3 border-b border-gray-200 pb-6">
          {dailySales.map((item) => {
            const height = Math.max(
              8,
              (item.amount / maxDailySales) * 100
            );

            return (
              <div
                key={item.date}
                className="flex-1 h-full flex flex-col justify-end items-center gap-2"
              >
                <span className="text-xs text-gray-400">
                  {item.amount > 0
                    ? `฿${toNumber(item.amount).toLocaleString("th-TH")}`
                    : "-"}
                </span>

                <div
                  className="w-full bg-red-500 rounded-t-xl"
                  style={{ height: `${height}%` }}
                  title={`${formatThaiDate(item.date)}: ${formatMoney(
                    item.amount
                  )} บาท`}
                />

                <span className="text-xs text-gray-500">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-5">
          เมนูด่วน
        </h2>

        <div className="grid grid-cols-1 gap-4">
          <QuickBtn text="ดูรายการสินค้า" href="/user/products" />

          <QuickBtn text="ขายสินค้า" href="/user/sales" />

          <QuickBtn text="ดูรายงานของฉัน" href="/user/reports" />
        </div>

        <div className="mt-6 rounded-2xl bg-red-50 p-5">
          <p className="font-bold text-red-600">
            แจ้งเตือนสินค้าใกล้หมด
          </p>

          <p className="text-gray-600 mt-2">
            มีสินค้าใกล้หมด {lowStockProducts.length} รายการ
          </p>

          <Link
            href="/user/products"
            className="inline-block mt-4 text-red-600 font-medium"
          >
            ดูรายการสินค้า →
          </Link>
        </div>
      </section>
    </div>

    <section className="bg-white rounded-3xl shadow-sm border p-6 mt-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            รายการขายล่าสุดของฉัน
          </h2>

          <p className="text-gray-500 mt-1">
            แสดงบิลขายที่บันทึกโดย User
          </p>
        </div>

        <Link
          href="/user/reports"
          className="border rounded-xl px-5 py-2 text-gray-700"
        >
          ดูรายงานทั้งหมด
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-4 text-left">#</th>
              <th className="p-4 text-left">วันที่ / เวลา</th>
              <th className="p-4 text-left">เลขที่บิล</th>
              <th className="p-4 text-left">ยอดรวมสุทธิ</th>
            </tr>
          </thead>

          <tbody>
            {recentSales.length > 0 ? (
              recentSales.map((sale, index) => (
                <tr key={sale.id} className="border-b text-gray-800">
                  <td className="p-4">{index + 1}</td>

                  <td className="p-4">
                    <div>{formatThaiDate(sale.sale_date)}</div>

                    <div className="text-xs text-gray-400 mt-1">
                      {formatDateTime(sale.created_at)}
                    </div>
                  </td>

                  <td className="p-4 font-semibold">
                    {sale.sale_number}
                  </td>

                  <td className="p-4 font-bold text-red-600">
                    ฿ {formatMoney(sale.total_amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  className="p-12 text-center text-gray-500"
                >
                  {isLoading
                    ? "กำลังโหลดข้อมูล..."
                    : "ยังไม่มีรายการขายของคุณ"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
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

function Card({ title, value, unit, color, href }) {
const colors = {
red: "bg-red-100 text-red-600",
orange: "bg-orange-100 text-orange-600",
green: "bg-green-100 text-green-600",
};

return ( <Link
   href={href}
   className="bg-white rounded-3xl shadow-sm border p-6 hover:shadow-md transition-shadow"
 >
<div
className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center ${colors[color]}`}
> <FaBox /> </div>


  <p className="font-bold text-gray-800">{title}</p>

  <div className="flex items-end gap-2 mt-2">
    <p className={`text-3xl font-bold ${colors[color].split(" ")[1]}`}>
      {value}
    </p>

    <span className="text-sm text-gray-500">{unit}</span>
  </div>
</Link>


);
}

function QuickBtn({ text, href }) {
return ( <Link
   href={href}
   className="border rounded-2xl p-5 hover:bg-red-50 hover:border-red-400 font-bold text-gray-800 flex justify-between items-center"
 > <span>{text}</span> <FaArrowRight className="text-red-600" /> </Link>
);
}
