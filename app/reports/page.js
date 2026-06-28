"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import LogoutButton from "../components/LogoutButton";
import AccountHeader from "../components/AccountHeader";
import AdminDailySalesSubmissions from "../components/AdminDailySalesSubmissions";

import {
  FaHome,
  FaBox,
  FaThLarge,
  FaShoppingCart,
  FaUsers,
  FaChartBar,
  FaHistory,
  FaCalendarAlt,
  FaCheckCircle,
  FaFileExcel,
  FaLock,
  FaPrint,
  FaSyncAlt,
} from "react-icons/fa";

function getLocalDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function getMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function getPeriodRange(type, selectedDate, selectedMonth, selectedYear) {
  if (type === "daily") {
    return {
      startDate: selectedDate,
      endDate: selectedDate,
    };
  }

  if (type === "monthly") {
    const [year, month] = selectedMonth.split("-").map(Number);

    return {
      startDate: `${year}-${String(month).padStart(2, "0")}-01`,
      endDate: getLocalDateString(new Date(year, month, 0)),
    };
  }

  const year = Number(selectedYear);

  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
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

  return new Date(`${value}T00:00:00`).toLocaleDateString("th-TH", {
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

function formatPeriodTitle(type, range) {
  const start = new Date(`${range.startDate}T00:00:00`);

  if (type === "daily") {
    return `รายวัน: ${formatDate(range.startDate)}`;
  }

  if (type === "monthly") {
    return `รายเดือน: ${start.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    })}`;
  }

  return `รายปี: ${start.toLocaleDateString("th-TH", {
    year: "numeric",
  })}`;
}

function csvCell(value) {
  const text = String(value ?? "").replaceAll('"', '""');

  return `"${text}"`;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedMonth, setSelectedMonth] = useState(getMonthValue());
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [closingInfo, setClosingInfo] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const periodRange = useMemo(() => {
    return getPeriodRange(
      reportType,
      selectedDate,
      selectedMonth,
      selectedYear
    );
  }, [reportType, selectedDate, selectedMonth, selectedYear]);

  async function loadReport() {
    setIsLoading(true);
    setErrorMessage("");

    const { startDate, endDate } = periodRange;

    const [salesResponse, closingResponse] = await Promise.all([
      supabase
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
        .gte("sale_date", startDate)
        .lte("sale_date", endDate)
        .order("created_at", { ascending: false }),

      supabase
        .from("report_closings")
        .select(`
          id,
          total_amount,
          bill_count,
          item_quantity,
          closed_at
        `)
        .eq("period_type", reportType)
        .eq("period_start", startDate)
        .eq("period_end", endDate)
        .maybeSingle(),
    ]);

    if (salesResponse.error) {
      console.error(salesResponse.error);

      setErrorMessage("ไม่สามารถโหลดข้อมูลรายงานได้");
      setSales([]);
      setSaleItems([]);
      setIsLoading(false);

      return;
    }

    if (closingResponse.error) {
      console.warn("ไม่สามารถโหลดสถานะปิดยอด:", closingResponse.error);
      setClosingInfo(null);
    } else {
      setClosingInfo(closingResponse.data || null);
    }

    const salesList = salesResponse.data || [];
    const saleIds = salesList.map((sale) => sale.id);

    let itemList = [];

    if (saleIds.length > 0) {
      const { data, error } = await supabase
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

      if (error) {
        console.error(error);
        setErrorMessage("โหลดรายการสินค้าในบิลไม่สำเร็จ");
      } else {
        itemList = data || [];
      }
    }

    setSales(salesList);
    setSaleItems(itemList);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadReport();

    const channel = supabase
      .channel("admin-reports-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => void loadReport()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sale_items",
        },
        () => void loadReport()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportType, selectedDate, selectedMonth, selectedYear]);

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
          name: item.product_name,
          code: item.product_code,
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

  const chartData = useMemo(() => {
    const grouped = sales.reduce((result, sale) => {
      let key = sale.sale_date;

      if (reportType === "yearly") {
        key = sale.sale_date.slice(0, 7);
      }

      result[key] = (result[key] || 0) + toNumber(sale.total_amount);

      return result;
    }, {});

    return Object.entries(grouped)
      .map(([label, amount]) => ({
        label,
        amount,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sales, reportType]);

  const maxChartAmount = Math.max(
    ...chartData.map((item) => item.amount),
    1
  );

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await loadReport();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleClosePeriod() {
    const label = formatPeriodTitle(reportType, periodRange);

    const confirmed = window.confirm(
      `ต้องการปิดยอด ${label} ใช่หรือไม่?\n\nระบบจะบันทึกยอดสรุปไว้ แต่จะไม่ลบประวัติการขาย`
    );

    if (!confirmed) return;

    setIsClosing(true);

    const { error } = await supabase.rpc("close_report_period", {
      p_period_type: reportType,
      p_start_date: periodRange.startDate,
      p_end_date: periodRange.endDate,
    });

    setIsClosing(false);

    if (error) {
      console.error(error);
      alert(error.message || "ปิดยอดรายงานไม่สำเร็จ");
      return;
    }

    await loadReport();

    alert("ปิดยอดรายงานสำเร็จ ข้อมูลการขายเดิมยังดูย้อนหลังได้");
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
        const summary = itemSummaryBySale[sale.id] || {
          quantity: 0,
          lines: 0,
        };

        return [
          formatDate(sale.sale_date),
          sale.sale_number,
          sale.seller_name || "-",
          summary.quantity,
          summary.lines,
          formatMoney(sale.discount_amount),
          formatMoney(sale.total_amount),
          sale.note || "",
        ];
      }),
    ];

    const csv =
      "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `report-${reportType}-${periodRange.startDate}-to-${periodRange.endDate}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="min-h-screen flex bg-[#f8f9fb]">
      <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden print:hidden">
        <div className="bg-red-600 p-8 rounded-br-[45px]">
          <div className="text-3xl">🥤</div>

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

          <Menu
            active
            icon={<FaChartBar />}
            text="รายงาน"
            href="/reports"
          />

          <Menu
            icon={<FaUsers />}
            text="ผู้ใช้งาน"
            href="/users"
          />

          <LogoutButton />
        </nav>
      </aside>

      <main className="flex-1 min-w-0 p-6 xl:p-10">
        <div className="flex justify-end mb-6 print:hidden">
          <AccountHeader />
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            รายงาน
          </h1>

          <p className="text-gray-500 mt-2">
            รายงานยอดขายรายวัน รายเดือน และรายปี
          </p>
        </div>

        <AdminDailySalesSubmissions />

        <section className="bg-white rounded-3xl border shadow-sm p-6 mb-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PeriodButton
              active={reportType === "daily"}
              title="รายวัน"
              detail="ดูยอดขายของวันที่เลือก"
              onClick={() => setReportType("daily")}
            />

            <PeriodButton
              active={reportType === "monthly"}
              title="รายเดือน"
              detail="ดูยอดขายรวมทั้งเดือน"
              onClick={() => setReportType("monthly")}
            />

            <PeriodButton
              active={reportType === "yearly"}
              title="รายปี"
              detail="ดูยอดขายรวมทั้งปี"
              onClick={() => setReportType("yearly")}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
            {reportType === "daily" && (
              <DateField
                label="เลือกวันที่"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                type="date"
              />
            )}

            {reportType === "monthly" && (
              <DateField
                label="เลือกเดือน"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                type="month"
              />
            )}

            {reportType === "yearly" && (
              <DateField
                label="เลือกปี ค.ศ."
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                type="number"
                min="2000"
                max="2200"
              />
            )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="border rounded-xl py-4 px-5 flex items-center justify-center gap-2 text-gray-700 disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
              รีเฟรชข้อมูล
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="border border-green-300 text-green-600 rounded-xl py-4 px-5 flex items-center justify-center gap-2"
            >
              <FaFileExcel />
              Export CSV
            </button>

            <button
              type="button"
              onClick={printReport}
              className="border border-gray-300 text-gray-700 rounded-xl py-4 px-5 flex items-center justify-center gap-2"
            >
              <FaPrint />
              พิมพ์รายงาน
            </button>

            <button
              type="button"
              onClick={handleClosePeriod}
              disabled={isClosing}
              className="bg-red-600 text-white rounded-xl py-4 px-5 flex items-center justify-center gap-2 disabled:bg-red-300"
            >
              <FaLock />

              {isClosing
                ? "กำลังปิดยอด..."
                : reportType === "daily"
                ? "ปิดยอดประจำวัน"
                : reportType === "monthly"
                ? "ปิดยอดประจำเดือน"
                : "ปิดยอดประจำปี"}
            </button>
          </div>

          <p className="mt-5 text-sm text-gray-500">
            การปิดยอดจะบันทึกสรุปยอดของช่วงเวลาไว้ โดยไม่ลบข้อมูลการขายเก่า
          </p>
        </section>

        {closingInfo && (
          <section className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="mt-1 text-green-600" />

              <div>
                <p className="font-bold text-green-700">
                  ปิดยอดแล้ว: {formatPeriodTitle(reportType, periodRange)}
                </p>

                <p className="mt-1 text-sm text-green-700">
                  ยอดปิด {formatMoney(closingInfo.total_amount)} บาท ·{" "}
                  {closingInfo.bill_count} บิล ·{" "}
                  {closingInfo.item_quantity} ชิ้น
                </p>

                <p className="mt-1 text-xs text-green-600">
                  ปิดยอดเมื่อ {formatDateTime(closingInfo.closed_at)}
                </p>
              </div>
            </div>
          </section>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
            {errorMessage}
          </div>
        )}

        <section className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {formatPeriodTitle(reportType, periodRange)}
          </h2>

          <p className="mt-1 text-gray-500">
            ข้อมูลการขายยังคงอยู่ในระบบ สามารถกลับมาดูย้อนหลังได้เสมอ
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 mb-6">
          <SummaryCard
            title="ยอดขายรวม"
            value={`${formatMoney(totalSales)} บาท`}
            small={`${sales.length.toLocaleString()} บิลขาย`}
            color="red"
          />

          <SummaryCard
            title="จำนวนสินค้าที่ขาย"
            value={`${totalQuantity.toLocaleString()} ชิ้น`}
            small={`ส่วนลดรวม ${formatMoney(totalDiscount)} บาท`}
            color="orange"
          />

          <SummaryCard
            title="สินค้าขายดี"
            value={topProduct ? topProduct.name : "-"}
            small={
              topProduct
                ? `ขายแล้ว ${topProduct.quantity.toLocaleString()} ชิ้น`
                : "ยังไม่มีข้อมูล"
            }
            color="green"
          />

          <SummaryCard
            title="ยอดเฉลี่ยต่อบิล"
            value={
              sales.length > 0
                ? `${formatMoney(totalSales / sales.length)} บาท`
                : "0.00 บาท"
            }
            small="คำนวณจากยอดสุทธิ"
            color="blue"
          />
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6 mb-6">
          <section className="2xl:col-span-2 bg-white rounded-3xl border shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              กราฟยอดขาย
            </h2>

            <p className="text-gray-500 mb-6">
              สรุปยอดขายตามช่วงเวลาที่เลือก
            </p>

            {chartData.length > 0 ? (
              <div className="h-72 flex items-end gap-3 border-b pb-8 overflow-x-auto">
                {chartData.map((item) => {
                  const height = Math.max(
                    8,
                    (item.amount / maxChartAmount) * 100
                  );

                  return (
                    <div
                      key={item.label}
                      className="min-w-16 flex-1 h-full flex flex-col justify-end items-center gap-2"
                    >
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatMoney(item.amount)}
                      </span>

                      <div
                        className="w-full bg-red-500 rounded-t-xl"
                        style={{ height: `${height}%` }}
                      />

                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {reportType === "yearly"
                          ? item.label.slice(5, 7)
                          : item.label.slice(8, 10)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-72 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-500">
                ยังไม่มีข้อมูลยอดขายในช่วงนี้
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl border shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900">
              สินค้าขายดี
            </h2>

            <div className="mt-5 space-y-4">
              {topProducts.length > 0 ? (
                topProducts.slice(0, 5).map((item, index) => (
                  <div
                    key={`${item.code}-${index}`}
                    className="flex justify-between gap-4 border-b pb-4 last:border-b-0"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {item.name}
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        {item.code || "-"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {item.quantity.toLocaleString()} ชิ้น
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        {formatMoney(item.amount)} บาท
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">
                  ยังไม่มีรายการขาย
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                รายการขาย
              </h2>

              <p className="text-gray-500 mt-1">
                แสดงข้อมูลตามช่วงเวลาที่เลือก
              </p>
            </div>

            {isLoading && (
              <p className="text-red-600">
                กำลังโหลดข้อมูล...
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-4 text-left">#</th>
                  <th className="p-4 text-left">วันที่ / เวลา</th>
                  <th className="p-4 text-left">เลขที่บิล</th>
                  <th className="p-4 text-left">พนักงานขาย</th>
                  <th className="p-4 text-left">จำนวนสินค้า</th>
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
                          {sale.seller_name || "-"}
                        </td>

                        <td className="p-4">
                          {summary.quantity.toLocaleString()} ชิ้น

                          <span className="text-xs text-gray-400 ml-1">
                            ({summary.lines} รายการ)
                          </span>
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
                      ยังไม่มีรายการขายในช่วงเวลาที่เลือก
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
    >
      <span className="text-xl">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

function PeriodButton({ active, title, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        active
          ? "border-red-600 bg-red-600 text-white"
          : "bg-white text-gray-800 hover:bg-red-50"
      }`}
    >
      <p className="text-xl font-bold">{title}</p>

      <p
        className={`mt-1 text-sm ${
          active ? "text-red-100" : "text-gray-500"
        }`}
      >
        {detail}
      </p>
    </button>
  );
}

function DateField({ label, value, onChange, type, min, max }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      <div className="relative">
        <FaCalendarAlt className="absolute left-4 top-4 text-gray-400 pointer-events-none" />

        <input
          type={type}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          className="w-full border rounded-xl py-4 pl-11 pr-4 text-gray-800 outline-none focus:border-red-500"
        />
      </div>
    </div>
  );
}

function SummaryCard({ title, value, small, color }) {
  const colors = {
    red: "border-red-200 bg-red-50 text-red-600",
    orange: "border-orange-200 bg-orange-50 text-orange-600",
    green: "border-green-200 bg-green-50 text-green-600",
    blue: "border-blue-200 bg-blue-50 text-blue-600",
  };

  return (
    <div className={`rounded-3xl border p-6 ${colors[color]}`}>
      <p className="font-semibold">{title}</p>

      <p className="text-2xl font-bold mt-3 break-words">
        {value}
      </p>

      <p className="text-sm mt-2 opacity-80">
        {small}
      </p>
    </div>
  );
}