"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../../components/AccountHeader";
import LogoutButton from "../../components/LogoutButton";
import UserDailySalesSubmission from "../../components/UserDailySalesSubmission";
import { supabase } from "../../lib/supabase";

import {
  FaBox,
  FaCalendarAlt,
  FaChartBar,
  FaFileExcel,
  FaHome,
  FaPrint,
  FaShoppingCart,
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
  const startDate = new Date(`${range.startDate}T00:00:00`);

  if (type === "daily") {
    return `รายวัน: ${formatDate(range.startDate)}`;
  }

  if (type === "monthly") {
    return `รายเดือน: ${startDate.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    })}`;
  }

  return `รายปี: ${startDate.toLocaleDateString("th-TH", {
    year: "numeric",
  })}`;
}

function csvCell(value) {
  const text = String(value ?? "").replaceAll('"', '""');

  return `"${text}"`;
}

export default function UserReportsPage() {
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedMonth, setSelectedMonth] = useState(getMonthValue());
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

    try {
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          sale_number,
          sale_date,
          seller_name,
          note,
          total_amount,
          created_at
        `)
        .gte("sale_date", periodRange.startDate)
        .lte("sale_date", periodRange.endDate)
        .order("created_at", { ascending: false });

      if (salesError) {
        throw salesError;
      }

      const salesList = salesData || [];
      const saleIds = salesList.map((sale) => sale.id);

      let items = [];

      if (saleIds.length > 0) {
        const { data: itemData, error: itemError } = await supabase
          .from("sale_items")
          .select(`
            sale_id,
            product_code,
            product_name,
            quantity,
            price,
            subtotal
          `)
          .in("sale_id", saleIds);

        if (itemError) {
          throw itemError;
        }

        items = itemData || [];
      }

      setSales(salesList);
      setSaleItems(items);
    } catch (error) {
      console.error(error);
      setSales([]);
      setSaleItems([]);
      setErrorMessage(error.message || "ไม่สามารถโหลดข้อมูลรายงานได้");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();

    const channel = supabase
      .channel("user-stock-out-reports-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          void loadReport();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sale_items",
        },
        () => {
          void loadReport();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportType, selectedDate, selectedMonth, selectedYear]);

  const summaryBySale = useMemo(() => {
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

  const totals = useMemo(() => {
    const totalValue = sales.reduce(
      (sum, sale) => sum + toNumber(sale.total_amount),
      0
    );

    const totalQuantity = saleItems.reduce(
      (sum, item) => sum + toNumber(item.quantity),
      0
    );

    return {
      totalValue,
      totalQuantity,
    };
  }, [sales, saleItems]);

  const topProducts = useMemo(() => {
    const grouped = saleItems.reduce((result, item) => {
      const key =
        item.product_code ||
        item.product_name ||
        "ไม่ระบุสินค้า";

      if (!result[key]) {
        result[key] = {
          code: item.product_code || "-",
          name: item.product_name || "ไม่ระบุสินค้า",
          quantity: 0,
          amount: 0,
        };
      }

      result[key].quantity += toNumber(item.quantity);
      result[key].amount += toNumber(item.subtotal);

      return result;
    }, {});

    return Object.values(grouped).sort(
      (a, b) => b.quantity - a.quantity
    );
  }, [saleItems]);

  const chartData = useMemo(() => {
    const grouped = sales.reduce((result, sale) => {
      const stockOutDate = String(sale.sale_date || "");

      const label =
        reportType === "yearly"
          ? stockOutDate.slice(0, 7)
          : stockOutDate;

      if (!label) {
        return result;
      }

      result[label] =
        (result[label] || 0) + toNumber(sale.total_amount);

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

  function exportCsv() {
    if (sales.length === 0) {
      alert("ไม่มีข้อมูลสำหรับ Export");
      return;
    }

    const rows = [
      [
        "วันที่ตัดสต็อก",
        "เลขที่รายการ",
        "ผู้ดำเนินการ",
        "จำนวนสินค้า",
        "จำนวนรายการ",
        "มูลค่ารวม",
        "หมายเหตุ",
      ],
      ...sales.map((sale) => {
        const itemSummary = summaryBySale[sale.id] || {
          quantity: 0,
          lines: 0,
        };

        return [
          formatDate(sale.sale_date),
          sale.sale_number || "-",
          sale.seller_name || "-",
          itemSummary.quantity,
          itemSummary.lines,
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
    link.download = `stock-out-report-${reportType}-${periodRange.startDate}-to-${periodRange.endDate}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="print:hidden w-[290px] min-h-screen shrink-0 bg-[#182232] text-white">
        <div className="rounded-br-[42px] bg-red-600 px-7 py-8 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
              🥤
            </div>

            <div>
              <h2 className="text-lg font-bold">ระบบบริหารจัดการ</h2>

              <p className="text-xs text-white/80">
                ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-2 p-5">
          <p className="px-4 pb-1 pt-2 text-xs text-slate-400">
            เมนูพนักงาน
          </p>

          <Menu icon={<FaHome />} text="หน้าหลัก" href="/user/dashboard" />

          <Menu icon={<FaBox />} text="สินค้า" href="/user/products" />

          <Menu
            icon={<FaShoppingCart />}
            text="เบิก/ตัดสต็อก"
            href="/user/sales"
          />

          <Menu
            active
            icon={<FaChartBar />}
            text="รายงาน"
            href="/user/reports"
          />

          <div className="pt-5">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-6 xl:p-10">
        <header className="print:hidden flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900">
                รายงานตัดสต็อก
              </h1>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                พนักงาน
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              รายงานรายการเบิก/ตัดสต็อกรายวัน รายเดือน และรายปี
            </p>
          </div>

          <AccountHeader />
        </header>

        <div className="print:hidden mt-8">
          <UserDailySalesSubmission />
        </div>

        <section className="print:hidden mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <PeriodButton
              active={reportType === "daily"}
              title="รายวัน"
              detail="ดูรายการของวันที่เลือก"
              onClick={() => setReportType("daily")}
            />

            <PeriodButton
              active={reportType === "monthly"}
              title="รายเดือน"
              detail="ดูรายการรวมทั้งเดือน"
              onClick={() => setReportType("monthly")}
            />

            <PeriodButton
              active={reportType === "yearly"}
              title="รายปี"
              detail="ดูรายการรวมทั้งปี"
              onClick={() => setReportType("yearly")}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              disabled={isLoading || isRefreshing}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-4 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
              รีเฟรชข้อมูล
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 px-5 py-4 text-emerald-600 hover:bg-emerald-50"
            >
              <FaFileExcel />
              Export CSV
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-4 text-slate-700 hover:bg-slate-50"
            >
              <FaPrint />
              พิมพ์รายงาน
            </button>
          </div>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900">
            {formatPeriodTitle(reportType, periodRange)}
          </h2>

          <p className="mt-1 text-slate-500">
            สรุปรายการเบิก/ตัดสต็อกตามช่วงเวลาที่เลือก
          </p>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            title="มูลค่ารวม"
            value={`${formatMoney(totals.totalValue)} บาท`}
            detail={`${sales.length.toLocaleString()} รายการ`}
            color="red"
          />

          <SummaryCard
            title="จำนวนสินค้าที่ตัด"
            value={`${totals.totalQuantity.toLocaleString()} ชิ้น`}
            detail="รวมจำนวนสินค้าทุกรายการ"
            color="orange"
          />

          <SummaryCard
            title="สินค้าถูกตัดมากสุด"
            value={topProducts[0]?.name || "-"}
            detail={
              topProducts[0]
                ? `จำนวน ${topProducts[0].quantity.toLocaleString()} ชิ้น`
                : "ยังไม่มีข้อมูล"
            }
            color="green"
          />

          <SummaryCard
            title="มูลค่าเฉลี่ยต่อรายการ"
            value={`${formatMoney(
              sales.length > 0
                ? totals.totalValue / sales.length
                : 0
            )} บาท`}
            detail="คำนวณจากมูลค่ารวม"
            color="blue"
          />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-3">
          <div className="2xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              กราฟมูลค่าการตัดสต็อก
            </h2>

            <p className="mt-1 text-slate-500">
              แสดงมูลค่ารวมตามช่วงเวลาที่เลือก
            </p>

            {chartData.length > 0 ? (
              <div className="mt-8 flex h-72 items-end gap-3 overflow-x-auto border-b border-slate-200 pb-8">
                {chartData.map((item) => {
                  const height = Math.max(
                    8,
                    (item.amount / maxChartAmount) * 100
                  );

                  const label =
                    reportType === "yearly"
                      ? item.label.slice(5, 7)
                      : item.label.slice(8, 10);

                  return (
                    <div
                      key={item.label}
                      className="flex h-full min-w-16 flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="whitespace-nowrap text-xs text-slate-500">
                        ฿ {formatMoney(item.amount)}
                      </span>

                      <div
                        className="w-full rounded-t-xl bg-red-500"
                        style={{ height: `${height}%` }}
                      />

                      <span className="text-xs text-slate-500">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 flex h-72 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                ยังไม่มีข้อมูลในช่วงนี้
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              สินค้าถูกตัดมากสุด
            </h2>

            <div className="mt-5 space-y-4">
              {topProducts.length > 0 ? (
                topProducts.slice(0, 5).map((item, index) => (
                  <div
                    key={`${item.code}-${index}`}
                    className="flex justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.code}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {item.quantity.toLocaleString()} ชิ้น
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatMoney(item.amount)} บาท
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">
                  ยังไม่มีรายการตัดสต็อก
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                รายการตัดสต็อก
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                แสดงรายการตามช่วงเวลาที่เลือก
              </p>
            </div>

            {isLoading && (
              <p className="text-red-600">กำลังโหลดข้อมูล...</p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-5 py-4 text-left font-semibold">#</th>
                  <th className="px-5 py-4 text-left font-semibold">
                    วันที่ / เวลา
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    เลขที่รายการ
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    ผู้ดำเนินการ
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    จำนวนสินค้า
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    มูลค่ารวม
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    หมายเหตุ
                  </th>
                </tr>
              </thead>

              <tbody>
                {sales.length > 0 ? (
                  sales.map((sale, index) => {
                    const itemSummary = summaryBySale[sale.id] || {
                      quantity: 0,
                      lines: 0,
                    };

                    return (
                      <tr
                        key={sale.id}
                        className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">{index + 1}</td>

                        <td className="px-5 py-4">
                          <p>{formatDate(sale.sale_date)}</p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(sale.created_at)}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {sale.sale_number || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {sale.seller_name || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {itemSummary.quantity.toLocaleString()} ชิ้น

                          <span className="ml-1 text-xs text-slate-400">
                            ({itemSummary.lines} รายการ)
                          </span>
                        </td>

                        <td className="px-5 py-4 font-bold text-red-600">
                          {formatMoney(sale.total_amount)} บาท
                        </td>

                        <td className="max-w-[240px] px-5 py-4 text-slate-500">
                          <p className="truncate">{sale.note || "-"}</p>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      ยังไม่มีรายการตัดสต็อกในช่วงเวลาที่เลือก
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

function PeriodButton({ active, title, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        active
          ? "border-red-600 bg-red-600 text-white"
          : "border-slate-200 bg-white text-slate-800 hover:bg-red-50"
      }`}
    >
      <p className="text-xl font-bold">{title}</p>

      <p
        className={`mt-1 text-sm ${
          active ? "text-red-100" : "text-slate-500"
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
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="relative">
        <FaCalendarAlt className="pointer-events-none absolute left-4 top-4 text-slate-400" />

        <input
          type={type}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-slate-800 outline-none focus:border-red-500"
        />
      </div>
    </div>
  );
}

function SummaryCard({ title, value, detail, color }) {
  const styles = {
    red: {
      line: "bg-red-500",
      text: "text-red-600",
    },
    orange: {
      line: "bg-orange-500",
      text: "text-orange-600",
    },
    green: {
      line: "bg-emerald-500",
      text: "text-emerald-600",
    },
    blue: {
      line: "bg-blue-500",
      text: "text-blue-600",
    },
  };

  const style = styles[color] || styles.blue;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`absolute left-0 top-0 h-1 w-full ${style.line}`} />

      <p className="text-sm font-medium text-slate-500">{title}</p>

      <h3 className={`mt-3 break-words text-2xl font-bold ${style.text}`}>
        {value}
      </h3>

      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}