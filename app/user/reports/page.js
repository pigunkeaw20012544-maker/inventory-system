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
FaCalendarAlt,
FaFileExcel,
FaFilePdf,
FaPrint,
FaSyncAlt,
FaSearch,
} from "react-icons/fa";

function getLocalDateString(date = new Date()) {
const offset = date.getTimezoneOffset();

return new Date(date.getTime() - offset * 60 * 1000)
.toISOString()
.slice(0, 10);
}

function getMonthStart() {
const now = new Date();

return getLocalDateString(
new Date(now.getFullYear(), now.getMonth(), 1)
);
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

export default function UserReportsPage() {
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
    discount_amount,
    total_amount,
    created_at
  `)
  .eq("seller_name", "User")
  .gte("sale_date", startDate)
  .lte("sale_date", endDate)
  .order("created_at", { ascending: false });

if (salesError) {
  console.error(salesError);
  setErrorMessage("ไม่สามารถโหลดข้อมูลรายงานได้");
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

setSales(salesList);
setSaleItems(itemData || []);
setIsLoading(false);


}

useEffect(() => {
loadReport();
}, []);

const itemSummaryBySale = useMemo(() => {
return saleItems.reduce((result, item) => {
if (!result[item.sale_id]) {
result[item.sale_id] = {
quantity: 0,
lines: 0,
};
}


  result[item.sale_id].quantity += toNumber(item.quantity);
  result[item.sale_id].lines += 1;

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
return saleItems.reduce(
(sum, item) => sum + toNumber(item.quantity),
0
);
}, [saleItems]);

const totalDiscount = useMemo(() => {
return sales.reduce(
(sum, sale) => sum + toNumber(sale.discount_amount),
0
);
}, [sales]);

const topProducts = useMemo(() => {
const grouped = saleItems.reduce((result, item) => {
const key = item.product_code || item.product_name;


  if (!result[key]) {
    result[key] = {
      code: item.product_code,
      name: item.product_name,
      quantity: 0,
      amount: 0,
    };
  }

  result[key].quantity += toNumber(item.quantity);
  result[key].amount += toNumber(item.subtotal);

  return result;
}, {});

return Object.values(grouped).sort((a, b) => b.quantity - a.quantity);


}, [saleItems]);

const topProduct = topProducts[0];

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
alert("ไม่มีข้อมูลสำหรับ Export");
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
    const summary = itemSummaryBySale[sale.id] || {
      quantity: 0,
      lines: 0,
    };

    return [
      formatDate(sale.sale_date),
      sale.sale_number,
      sale.seller_name || "User",
      summary.quantity,
      summary.lines,
      formatMoney(sale.discount_amount),
      formatMoney(sale.total_amount),
      sale.note || "",
    ];
  }),
];

const csv =
  "\ufeff" +
  rows.map((row) => row.map(csvCell).join(",")).join("\n");

const blob = new Blob([csv], {
  type: "text/csv;charset=utf-8;",
});

const url = URL.createObjectURL(blob);
const link = document.createElement("a");

link.href = url;
link.download = `user-sales-report-${startDate}-to-${endDate}.csv`;
link.click();

URL.revokeObjectURL(url);


}

function printReport() {
window.print();
}

return ( <div className="min-h-screen flex bg-[#f8f9fb]"> <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden print:hidden"> <div className="bg-red-600 p-8 rounded-br-[45px]"> <div className="text-3xl">🥤</div> <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2> <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p> </div>


    <nav className="p-6 space-y-4">
      <Menu icon={<FaHome />} text="หน้าหลัก" href="/user/dashboard" />
      <Menu icon={<FaBox />} text="สินค้า" href="/user/products" />
      <Menu icon={<FaShoppingCart />} text="การขาย" href="/user/sales" />
      <Menu active icon={<FaChartBar />} text="รายงาน" href="/user/reports" />
      <LogoutButton />
    </nav>
  </aside>

  <main className="flex-1 min-w-0 p-6 xl:p-10">
    <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-6 mb-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">รายงาน</h1>
        <p className="text-gray-500 mt-2">
          Reports &gt; รายงานยอดขายของฉัน
        </p>
      </div>

      <div className="flex items-center gap-5">
        <FaBell className="text-xl text-gray-700" />

        <div className="w-12 h-12 rounded-full bg-red-600 text-white flex justify-center items-center">
          <FaUser />
        </div>

        <div>
          <h3 className="font-bold text-gray-900">พนักงานขาย</h3>
          <p className="text-gray-500">User</p>
        </div>
      </div>
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
        small={`ขายสินค้าแล้ว ${totalQuantity.toLocaleString()} ชิ้น`}
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
        title="ส่วนลดรวม"
        value={`${formatMoney(totalDiscount)} บาท`}
        small="คำนวณจากทุกบิลในช่วงวันที่เลือก"
        color="blue"
      />
    </div>

    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-3xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          สินค้าขายดี
        </h2>

        {topProducts.length > 0 ? (
          <div className="space-y-4">
            {topProducts.slice(0, 5).map((product, index) => (
              <div
                key={`${product.code}-${index}`}
                className="flex justify-between items-center border-b pb-4 last:border-b-0"
              >
                <div>
                  <p className="font-bold text-gray-900">
                    {index + 1}. {product.name}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {product.code}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-red-600">
                    {product.quantity.toLocaleString()} ชิ้น
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {formatMoney(product.amount)} บาท
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500">
            ยังไม่มีข้อมูลสินค้าที่ขาย
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          สรุปการขายของฉัน
        </h2>

        <div className="space-y-5">
          <SummaryLine
            label="ยอดขายก่อนหักส่วนลด"
            value={`${formatMoney(totalSales + totalDiscount)} บาท`}
          />

          <SummaryLine
            label="ส่วนลดทั้งหมด"
            value={`${formatMoney(totalDiscount)} บาท`}
          />

          <SummaryLine
            label="ยอดขายสุทธิ"
            value={`${formatMoney(totalSales)} บาท`}
            strong
          />

          <SummaryLine
            label="จำนวนสินค้า"
            value={`${totalQuantity.toLocaleString()} ชิ้น`}
          />

          <SummaryLine
            label="จำนวนบิลขาย"
            value={`${sales.length.toLocaleString()} บิล`}
          />
        </div>
      </div>
    </div>

    <div className="bg-white rounded-3xl shadow-sm border p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            รายการขายของฉัน
          </h2>

          <p className="text-gray-500 mt-1">
            แสดงบิลขายที่บันทึกโดย User ในช่วงวันที่เลือก
          </p>
        </div>

        {isLoading && (
          <p className="text-red-600">กำลังโหลดข้อมูล...</p>
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
              <th className="p-4 text-left">หมายเหตุ</th>
            </tr>
          </thead>

          <tbody>
            {sales.length > 0 ? (
              sales.map((sale, index) => {
                const summary = itemSummaryBySale[sale.id] || {
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
                      {summary.quantity.toLocaleString()} ชิ้น
                    </td>

                    <td className="p-4">
                      {summary.lines.toLocaleString()} รายการ
                    </td>

                    <td className="p-4">
                      {formatMoney(sale.discount_amount)} บาท
                    </td>

                    <td className="p-4 font-bold text-red-600">
                      {formatMoney(sale.total_amount)} บาท
                    </td>

                    <td className="p-4 text-gray-500">
                      {sale.note || "-"}
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
                  ยังไม่มีรายการขายของคุณในช่วงวันที่เลือก
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
const styles = {
red: "bg-red-100 text-red-600",
orange: "bg-orange-100 text-orange-500",
green: "bg-green-100 text-green-600",
blue: "bg-blue-100 text-blue-600",
};

return ( <div className="bg-white rounded-3xl shadow-sm border p-6">
<div className={`w-16 h-16 ${styles[color]} rounded-2xl mb-4`} />


  <p className="font-bold text-gray-800">{title}</p>

  <h2
    className={`text-2xl font-bold mt-2 ${
      styles[color].split(" ")[1]
    }`}
  >
    {value}
  </h2>

  <p className="text-gray-500 mt-2">{small}</p>
</div>


);
}

function SummaryLine({ label, value, strong = false }) {
return (
<div
className={`flex justify-between gap-4 ${
        strong
          ? "border-t pt-5 text-red-600 text-xl font-bold"
          : "text-gray-700"
      }`}
> <span>{label}</span> <span className="text-right">{value}</span> </div>
);
}
