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
FaSearch,
FaFileExcel,
FaFilePdf,
FaPrint,
FaCalendarAlt,
FaSyncAlt,
} from "react-icons/fa";

function getLocalDateString(date = new Date()) {
const offset = date.getTimezoneOffset();

return new Date(date.getTime() - offset * 60 * 1000)
.toISOString()
.slice(0, 10);
}

function getMonthStart() {
const now = new Date();
return getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
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

function formatDate(value) {
if (!value) return "-";

const date = new Date(`${value}T00:00:00`);

return date.toLocaleDateString("th-TH", {
day: "2-digit",
month: "2-digit",
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

function csvCell(value) {
const text = String(value ?? "").replaceAll('"', '""');
return `"${text}"`;
}

export default function ReportsPage() {
const [startDate, setStartDate] = useState(getMonthStart());
const [endDate, setEndDate] = useState(getLocalDateString());

const [sales, setSales] = useState([]);
const [saleItems, setSaleItems] = useState([]);

const [isLoading, setIsLoading] = useState(false);
const [isRefreshing, setIsRefreshing] = useState(false);
const [errorMessage, setErrorMessage] = useState("");

async function loadReport() {
if (startDate > endDate) {
alert("วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด");
return;
}


setIsLoading(true);
setErrorMessage("");

const { data: salesData, error: salesError } = await supabase
  .from("sales")
  .select(`
    id,
    sale_number,
    sale_date,
    seller_name,
    note,
    subtotal_amount,
    discount_amount,
    total_amount,
    created_at
  `)
  .gte("sale_date", startDate)
  .lte("sale_date", endDate)
  .order("created_at", { ascending: false });

if (salesError) {
  console.error(salesError);
  setErrorMessage("ไม่สามารถโหลดข้อมูลรายงานการขายได้");
  setSales([]);
  setSaleItems([]);
  setIsLoading(false);
  return;
}

const salesList = salesData || [];
const saleIds = salesList.map((sale) => sale.id);

if (saleIds.length === 0) {
  setSales([]);
  setSaleItems([]);
  setIsLoading(false);
  return;
}

const { data: itemData, error: itemError } = await supabase
  .from("sale_items")
  .select(`
    sale_id,
    product_id,
    product_code,
    product_name,
    quantity,
    price,
    discount,
    subtotal
  `)
  .in("sale_id", saleIds);

if (itemError) {
  console.error(itemError);
  setErrorMessage("โหลดรายการสินค้าในบิลไม่สำเร็จ");
  setSales(salesList);
  setSaleItems([]);
  setIsLoading(false);
  return;
}

const itemsList = itemData || [];

const productIds = [
  ...new Set(
    itemsList
      .map((item) => String(item.product_id || ""))
      .filter(Boolean)
  ),
];

let productMap = {};

if (productIds.length > 0) {
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select(`
      id,
      category_id,
      category:categories(name)
    `)
    .in("id", productIds);

  if (!productsError) {
    productMap = (productsData || []).reduce((result, product) => {
      const categoryName = Array.isArray(product.category)
        ? product.category[0]?.name
        : product.category?.name;

      result[String(product.id)] = categoryName || "ไม่ระบุหมวดหมู่";
      return result;
    }, {});
  }
}

const mappedItems = itemsList.map((item) => ({
  saleId: item.sale_id,
  productId: String(item.product_id || ""),
  productCode: item.product_code,
  productName: item.product_name,
  quantity: toNumber(item.quantity),
  price: toNumber(item.price),
  discount: toNumber(item.discount),
  subtotal: toNumber(item.subtotal),
  category: productMap[String(item.product_id)] || "ไม่ระบุหมวดหมู่",
}));

setSales(salesList);
setSaleItems(mappedItems);
setIsLoading(false);


}

useEffect(() => {
loadReport();
}, []);

const itemSummaryBySale = useMemo(() => {
return saleItems.reduce((result, item) => {
if (!result[item.saleId]) {
result[item.saleId] = {
lines: 0,
quantity: 0,
};
}


  result[item.saleId].lines += 1;
  result[item.saleId].quantity += item.quantity;

  return result;
}, {});


}, [saleItems]);

const totalSales = useMemo(() => {
return sales.reduce(
(sum, sale) => sum + toNumber(sale.total_amount),
0
);
}, [sales]);

const totalQuantity = useMemo(() => {
return saleItems.reduce((sum, item) => sum + item.quantity, 0);
}, [saleItems]);

const topProducts = useMemo(() => {
const grouped = saleItems.reduce((result, item) => {
const key = item.productCode || item.productName;


  if (!result[key]) {
    result[key] = {
      name: item.productName,
      code: item.productCode,
      quantity: 0,
      amount: 0,
    };
  }

  result[key].quantity += item.quantity;
  result[key].amount += item.subtotal;

  return result;
}, {});

return Object.values(grouped).sort((a, b) => b.quantity - a.quantity);


}, [saleItems]);

const topProduct = topProducts[0];

const categorySummary = useMemo(() => {
const grouped = saleItems.reduce((result, item) => {
const category = item.category || "ไม่ระบุหมวดหมู่";


  if (!result[category]) {
    result[category] = 0;
  }

  result[category] += item.subtotal;
  return result;
}, {});

return Object.entries(grouped)
  .map(([name, amount]) => ({
    name,
    amount,
    percent: totalSales > 0 ? (amount / totalSales) * 100 : 0,
  }))
  .sort((a, b) => b.amount - a.amount);


}, [saleItems, totalSales]);

const dailySales = useMemo(() => {
const grouped = sales.reduce((result, sale) => {
const date = sale.sale_date;


  if (!result[date]) {
    result[date] = 0;
  }

  result[date] += toNumber(sale.total_amount);
  return result;
}, {});

return Object.entries(grouped)
  .map(([date, amount]) => ({ date, amount }))
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(-14);


}, [sales]);

const maxDailySales = Math.max(
...dailySales.map((item) => item.amount),
1
);

async function handleSearch() {
await loadReport();
}

async function handleRefresh() {
setIsRefreshing(true);
await loadReport();
setIsRefreshing(false);
}

function exportCsv() {
if (sales.length === 0) {
alert("ไม่มีข้อมูลการขายสำหรับ Export");
return;
}


const rows = [
  [
    "วันที่ขาย",
    "เลขที่บิล",
    "พนักงานขาย",
    "จำนวนสินค้า",
    "จำนวนรายการ",
    "ส่วนลด",
    "ยอดสุทธิ",
    "หมายเหตุ",
  ],
  ...sales.map((sale) => {
    const itemSummary = itemSummaryBySale[sale.id] || {
      quantity: 0,
      lines: 0,
    };

    return [
      formatDate(sale.sale_date),
      sale.sale_number,
      sale.seller_name || "Admin",
      itemSummary.quantity,
      itemSummary.lines,
      formatMoney(sale.discount_amount),
      formatMoney(sale.total_amount),
      sale.note || "",
    ];
  }),
];

const csv = "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\n");

const blob = new Blob([csv], {
  type: "text/csv;charset=utf-8;",
});

const url = URL.createObjectURL(blob);
const link = document.createElement("a");

link.href = url;
link.download = `sales-report-${startDate}-to-${endDate}.csv`;
link.click();

URL.revokeObjectURL(url);


}

function printReport() {
window.print();
}

return ( <div className="min-h-screen bg-[#f8f9fb] flex"> <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden print:hidden"> <div className="bg-red-600 p-8 rounded-br-[45px]"> <div className="text-3xl">🥤</div> <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2> <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p> </div>


    <nav className="p-6 space-y-4">
      <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />
      <Menu icon={<FaBox />} text="สินค้า" href="/products" />
      <Menu icon={<FaThLarge />} text="หมวดหมู่สินค้า" href="/categories" />
      <Menu icon={<FaShoppingCart />} text="การขาย" href="/sales" />
      <Menu active icon={<FaChartBar />} text="รายงาน" href="/reports" />
      <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
      <LogoutButton />
    </nav>
  </aside>

  <main className="flex-1 min-w-0 p-6 xl:p-10">
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-gray-900">รายงาน</h1>
      <p className="text-gray-500 mt-2">Reports &gt; รายงานยอดขาย</p>
    </div>

    <div className="bg-white rounded-3xl shadow-sm border p-6 mb-6 print:hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-6 gap-4 items-end">
        <DateField
          label="วันที่เริ่มต้น"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <DateField
          label="วันที่สิ้นสุด"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />

        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-red-600 text-white rounded-xl py-4 flex items-center justify-center gap-2 disabled:bg-red-300"
        >
          <FaSearch />
          ค้นหา
        </button>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="border rounded-xl py-4 flex items-center justify-center gap-2 text-gray-700 disabled:opacity-60"
        >
          <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
          รีเฟรช
        </button>

        <button
          onClick={exportCsv}
          className="border border-green-300 text-green-600 rounded-xl py-4 flex items-center justify-center gap-2"
        >
          <FaFileExcel />
          Export Excel
        </button>

        <button
          onClick={printReport}
          className="border border-red-300 text-red-600 rounded-xl py-4 flex items-center justify-center gap-2"
        >
          <FaFilePdf />
          บันทึก PDF
        </button>
      </div>

      <div className="flex justify-end mt-5">
        <button
          onClick={printReport}
          className="border rounded-xl px-6 py-3 flex items-center gap-2 text-gray-700"
        >
          <FaPrint />
          พิมพ์รายงาน
        </button>
      </div>
    </div>

    {errorMessage && (
      <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
        {errorMessage}
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 mb-6">
      <SummaryCard
        title="ยอดขายรวม"
        value={`${formatMoney(totalSales)} บาท`}
        small={`ช่วงวันที่ ${formatDate(startDate)} - ${formatDate(endDate)}`}
        color="red"
      />

      <SummaryCard
        title="จำนวนบิลขาย"
        value={`${sales.length} บิล`}
        small={`รวมสินค้า ${totalQuantity.toLocaleString()} ชิ้น`}
        color="orange"
      />

      <SummaryCard
        title="สินค้าขายดี"
        value={topProduct ? topProduct.name : "-"}
        small={
          topProduct
            ? `ขายแล้ว ${topProduct.quantity.toLocaleString()} ชิ้น`
            : "ยังไม่มีข้อมูลการขาย"
        }
        color="green"
      />

      <SummaryCard
        title="ยอดขายเฉลี่ยต่อบิล"
        value={
          sales.length > 0
            ? `${formatMoney(totalSales / sales.length)} บาท`
            : "0.00 บาท"
        }
        small="คำนวณจากยอดสุทธิทุกบิล"
        color="blue"
      />
    </div>

    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          ยอดขายรายวัน
        </h2>

        {dailySales.length > 0 ? (
          <div className="h-72 flex items-end gap-2 border-b border-gray-200 pb-7">
            {dailySales.map((item) => {
              const height = Math.max(
                8,
                (item.amount / maxDailySales) * 100
              );

              return (
                <div
                  key={item.date}
                  className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-2"
                >
                  <span className="text-xs text-gray-500">
                    {formatMoney(item.amount)}
                  </span>

                  <div
                    className="w-full bg-red-500 rounded-t-xl"
                    style={{ height: `${height}%` }}
                    title={`${formatDate(item.date)}: ${formatMoney(
                      item.amount
                    )} บาท`}
                  />

                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {item.date.slice(8, 10)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-72 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500">
            ยังไม่มีข้อมูลยอดขายในช่วงวันที่เลือก
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          ยอดขายแยกตามหมวดหมู่
        </h2>

        {categorySummary.length > 0 ? (
          <div className="space-y-5">
            {categorySummary.slice(0, 6).map((item) => (
              <div key={item.name}>
                <div className="flex justify-between gap-4 text-gray-700 mb-2">
                  <span className="font-medium">{item.name}</span>

                  <span>
                    {formatMoney(item.amount)} บาท ({item.percent.toFixed(1)}%)
                  </span>
                </div>

                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-between pt-5 border-t font-bold text-gray-800">
              <span>รวมยอดขาย</span>
              <span className="text-red-600">
                {formatMoney(totalSales)} บาท
              </span>
            </div>
          </div>
        ) : (
          <div className="h-72 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500">
            ยังไม่มีข้อมูลหมวดหมู่ที่ขาย
          </div>
        )}
      </div>
    </div>

    <div className="bg-white rounded-3xl border shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            รายการขายล่าสุด
          </h2>

          <p className="text-gray-500 mt-1">
            แสดงรายการขายจากช่วงวันที่ที่เลือก
          </p>
        </div>

        {isLoading && (
          <span className="text-red-600">กำลังโหลดข้อมูล...</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-4 text-left">#</th>
              <th className="p-4 text-left">วันที่ / เวลา</th>
              <th className="p-4 text-left">เลขที่บิล</th>
              <th className="p-4 text-left">จำนวนสินค้า</th>
              <th className="p-4 text-left">จำนวนรายการ</th>
              <th className="p-4 text-left">ส่วนลด</th>
              <th className="p-4 text-left">ยอดสุทธิ</th>
              <th className="p-4 text-left">พนักงานขาย</th>
            </tr>
          </thead>

          <tbody>
            {sales.length > 0 ? (
              sales.map((sale, index) => {
                const itemSummary = itemSummaryBySale[sale.id] || {
                  quantity: 0,
                  lines: 0,
                };

                return (
                  <tr key={sale.id} className="border-b text-gray-800">
                    <td className="p-4">{index + 1}</td>

                    <td className="p-4">
                      <div>{formatDate(sale.sale_date)}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDateTime(sale.created_at)}
                      </div>
                    </td>

                    <td className="p-4 font-semibold">
                      {sale.sale_number}
                    </td>

                    <td className="p-4">
                      {itemSummary.quantity.toLocaleString()} ชิ้น
                    </td>

                    <td className="p-4">
                      {itemSummary.lines.toLocaleString()} รายการ
                    </td>

                    <td className="p-4">
                      {formatMoney(sale.discount_amount)} บาท
                    </td>

                    <td className="p-4 font-bold text-red-600">
                      {formatMoney(sale.total_amount)} บาท
                    </td>

                    <td className="p-4">
                      {sale.seller_name || "Admin"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="8"
                  className="p-12 text-center text-gray-500"
                >
                  ยังไม่มีรายการขายในช่วงวันที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

function DateField({ label, value, onChange }) {
return ( <div> <label className="block mb-2 font-medium text-gray-700">
{label} </label>


  <div className="relative">
    <input
      type="date"
      value={value}
      onChange={onChange}
      className="w-full border rounded-xl px-4 py-4 pr-10 text-gray-800 outline-none"
    />

    <FaCalendarAlt className="absolute right-4 top-5 text-gray-400 pointer-events-none" />
  </div>
</div>


);
}

function SummaryCard({ title, value, small, color }) {
const colors = {
red: "bg-red-100 text-red-600",
orange: "bg-orange-100 text-orange-500",
green: "bg-green-100 text-green-600",
blue: "bg-blue-100 text-blue-600",
};

return ( <div className="bg-white rounded-3xl border shadow-sm p-6">
<div className={`w-16 h-16 ${colors[color]} rounded-2xl mb-4`} />


  <p className="font-bold text-gray-800">{title}</p>

  <h2
    className={`text-2xl font-bold mt-2 ${
      colors[color].split(" ")[1]
    }`}
  >
    {value}
  </h2>

  <p className="text-gray-500 mt-2">{small}</p>
</div>


);
}
