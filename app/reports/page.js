"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../components/AccountHeader";
import BrandLogo from "../components/BrandLogo";
import AdminDailySalesSubmissions from "../components/AdminDailySalesSubmissions";
import LogoutButton from "../components/LogoutButton";
import { supabase } from "../lib/supabase";

import {
  FaBox,
  FaBoxOpen,
  FaCalendarAlt,
  FaChartBar,
  FaCheckCircle,
  FaFileExcel,
  FaHistory,
  FaHome,
  FaLock,
  FaPrint,
  FaShoppingCart,
  FaSyncAlt,
  FaThLarge,
  FaUsers,
} from "react-icons/fa";

function getLocalDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function getDaysAfterString(value, daysAfter = 1) {
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day + daysAfter);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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

export default function ReportsPage() {
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedMonth, setSelectedMonth] = useState(getMonthValue());
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
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
    const nextEndDate = getDaysAfterString(endDate);

    const [
      salesResponse,
      closingResponse,
      stockMovementsResponse,
    ] = await Promise.all([
      supabase
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

      supabase
        .from("stock_movements")
        .select(`
          id,
          product_code,
          product_name,
          unit,
          movement_type,
          quantity,
          stock_before,
          stock_after,
          note,
          performed_by_name,
          performed_by_code,
          created_at
        `)
        .eq("movement_type", "stock_in")
        .gte("created_at", `${startDate}T00:00:00+07:00`)
        .lt("created_at", `${nextEndDate}T00:00:00+07:00`)
        .order("created_at", { ascending: false }),
    ]);

    if (salesResponse.error) {
      console.error(salesResponse.error);

      setErrorMessage(
        salesResponse.error.message || "ไม่สามารถโหลดข้อมูลรายงานได้"
      );

      setSales([]);
      setSaleItems([]);
      setStockMovements([]);
      setClosingInfo(null);
      setIsLoading(false);
      return;
    }

    if (closingResponse.error) {
      console.warn("ไม่สามารถโหลดสถานะปิดยอด:", closingResponse.error);
      setClosingInfo(null);
    } else {
      setClosingInfo(closingResponse.data || null);
    }

    if (stockMovementsResponse.error) {
      console.error(stockMovementsResponse.error);
      setStockMovements([]);
      setErrorMessage(
        stockMovementsResponse.error.message ||
          "ไม่สามารถโหลดประวัติการเพิ่มสต็อกได้"
      );
    } else {
      setStockMovements(stockMovementsResponse.data || []);
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
          subtotal
        `)
        .in("sale_id", saleIds);

      if (error) {
        console.error(error);
        setErrorMessage(
          error.message || "โหลดรายการสินค้าในรายการตัดสต็อกไม่สำเร็จ"
        );
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock_movements",
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

  const totalValue = useMemo(() => {
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

  const averagePerRecord = useMemo(() => {
    if (sales.length === 0) return 0;

    return totalValue / sales.length;
  }, [sales.length, totalValue]);

  const topProducts = useMemo(() => {
    const grouped = saleItems.reduce((result, item) => {
      const key = item.product_code || item.product_name || "unknown";

      if (!result[key]) {
        result[key] = {
          name: item.product_name || "-",
          code: item.product_code || "-",
          quantity: 0,
          amount: 0,
        };
      }

      result[key].quantity += toNumber(item.quantity);
      result[key].amount += toNumber(item.subtotal);

      return result;
    }, {});

    return Object.values(grouped).sort((a, b) => {
      return b.quantity - a.quantity;
    });
  }, [saleItems]);

  const topProduct = topProducts[0];

  const stockInQuantity = useMemo(() => {
    return stockMovements.reduce(
      (sum, movement) => sum + toNumber(movement.quantity),
      0
    );
  }, [stockMovements]);

  const stockInEmployeeCount = useMemo(() => {
    const employees = new Set(
      stockMovements
        .map((movement) => {
          return (
            movement.performed_by_code ||
            movement.performed_by_name ||
            ""
          );
        })
        .filter(Boolean)
    );

    return employees.size;
  }, [stockMovements]);

  const stockInProductCount = useMemo(() => {
    const productSet = new Set(
      stockMovements
        .map(
          (movement) =>
            movement.product_code || movement.product_name || ""
        )
        .filter(Boolean)
    );

    return productSet.size;
  }, [stockMovements]);

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
      `ต้องการปิดยอด ${label} ใช่หรือไม่?\n\nระบบจะบันทึกยอดสรุปไว้ แต่จะไม่ลบประวัติรายการตัดสต็อก`
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

    alert("ปิดยอดรายงานสำเร็จ ข้อมูลเดิมยังดูย้อนหลังได้");
  }

  function exportCsv() {
    if (sales.length === 0 && stockMovements.length === 0) {
      alert("ไม่มีข้อมูลสำหรับ Export");
      return;
    }

    const rows = [
      [
        "ประเภท",
        "วันที่ / เวลา",
        "เลขที่รายการ / รหัสสินค้า",
        "ผู้ดำเนินการ",
        "สินค้า",
        "จำนวน",
        "มูลค่ารวม / สต็อกก่อน-หลัง",
        "หมายเหตุ",
      ],

      ...sales.map((sale) => {
        const summary = itemSummaryBySale[sale.id] || {
          quantity: 0,
          lines: 0,
        };

        return [
          "เบิก/ตัดสต็อก",
          `${formatDate(sale.sale_date)} ${formatDateTime(sale.created_at)}`,
          sale.sale_number || "-",
          sale.seller_name || "-",
          `${summary.lines} รายการสินค้า`,
          `${summary.quantity} ชิ้น`,
          `${formatMoney(sale.total_amount)} บาท`,
          sale.note || "",
        ];
      }),

      ...stockMovements.map((movement) => {
        return [
          "เพิ่มสต็อก",
          formatDateTime(movement.created_at),
          movement.product_code || "-",
          `${movement.performed_by_code || "-"} ${
            movement.performed_by_name || ""
          }`.trim(),
          movement.product_name || "-",
          `+${toNumber(movement.quantity)} ${movement.unit || "ชิ้น"}`,
          `${toNumber(movement.stock_before)} → ${toNumber(
            movement.stock_after
          )}`,
          movement.note || "",
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
    link.download = `inventory-report-${reportType}-${periodRange.startDate}-to-${periodRange.endDate}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-[290px] min-h-screen shrink-0 bg-[#182232] text-white print:hidden">
        <div className="rounded-br-[42px] bg-red-600 px-7 py-8 shadow-lg">
          <div className="flex items-center gap-3">
            <BrandLogo />

            <div>
              <h2 className="text-lg font-bold">
                ระบบบริหารจัดการ
              </h2>

              <p className="text-xs text-white/80">
                ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-2 p-5">
          <p className="px-4 pb-1 pt-2 text-xs text-slate-400">
            เมนูหลัก
          </p>

          <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />

          <Menu icon={<FaBox />} text="สินค้า" href="/products" />

          <Menu
            icon={<FaThLarge />}
            text="หมวดหมู่สินค้า"
            href="/categories"
          />

          <Menu
            icon={<FaShoppingCart />}
            text="เบิก/ตัดสต็อก"
            href="/sales"
          />

          <Menu
            icon={<FaHistory />}
            text="ประวัติสต็อก"
            href="/stock-movements"
          />

          <Menu
            active
            icon={<FaChartBar />}
            text="รายงาน"
            href="/reports"
          />

          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />

          <div className="pt-5">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-6 xl:p-10">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between print:hidden">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900">
                รายงานสต็อกสินค้า
              </h1>

              <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                Admin
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              สรุปรายการเบิก/ตัดสต็อก และประวัติเพิ่มสต็อกของพนักงาน
            </p>
          </div>

          <AccountHeader />
        </header>

        <div className="hidden print:block">
          <h1 className="text-3xl font-bold text-slate-900">
            รายงานสต็อกสินค้า
          </h1>

          <p className="mt-2 text-slate-600">
            {formatPeriodTitle(reportType, periodRange)}
          </p>
        </div>

        <div className="mt-8 print:hidden">
          <AdminDailySalesSubmissions />
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <PeriodButton
              active={reportType === "daily"}
              title="รายวัน"
              detail="ดูข้อมูลของวันที่เลือก"
              onClick={() => setReportType("daily")}
            />

            <PeriodButton
              active={reportType === "monthly"}
              title="รายเดือน"
              detail="ดูข้อมูลรวมทั้งเดือน"
              onClick={() => setReportType("monthly")}
            />

            <PeriodButton
              active={reportType === "yearly"}
              title="รายปี"
              detail="ดูข้อมูลรวมทั้งปี"
              onClick={() => setReportType("yearly")}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
              รีเฟรชข้อมูล
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-emerald-700 hover:bg-emerald-100"
            >
              <FaFileExcel />
              Export CSV
            </button>

            <button
              type="button"
              onClick={printReport}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-slate-700 hover:bg-slate-50"
            >
              <FaPrint />
              พิมพ์รายงาน
            </button>

            <button
              type="button"
              onClick={handleClosePeriod}
              disabled={isClosing}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-white hover:bg-red-700 disabled:bg-red-300"
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

          <p className="mt-5 text-sm text-slate-500">
            การปิดยอดใช้สำหรับสรุปรายการตัดสต็อก โดยไม่ลบประวัติการเพิ่มสต็อก
          </p>
        </section>

        {closingInfo && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="mt-1 shrink-0 text-emerald-600" />

              <div>
                <p className="font-bold text-emerald-700">
                  ปิดยอดแล้ว: {formatPeriodTitle(reportType, periodRange)}
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  มูลค่าปิดยอด {formatMoney(closingInfo.total_amount)} บาท ·{" "}
                  {toNumber(closingInfo.bill_count)} รายการ ·{" "}
                  {toNumber(closingInfo.item_quantity)} ชิ้น
                </p>

                <p className="mt-1 text-xs text-emerald-600">
                  ปิดยอดเมื่อ {formatDateTime(closingInfo.closed_at)}
                </p>
              </div>
            </div>
          </section>
        )}

        {errorMessage && (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {errorMessage}
          </section>
        )}

        <section className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900">
            {formatPeriodTitle(reportType, periodRange)}
          </h2>

          <p className="mt-1 text-slate-500">
            สรุปรายการเบิก/ตัดสต็อกและเพิ่มสต็อกตามช่วงเวลาที่เลือก
          </p>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            title="มูลค่าตัดสต็อกรวม"
            value={`฿ ${formatMoney(totalValue)}`}
            detail={`${sales.length.toLocaleString()} รายการ`}
            icon={<FaShoppingCart />}
            color="red"
          />

          <SummaryCard
            title="จำนวนสินค้าที่ตัด"
            value={`${totalQuantity.toLocaleString()} ชิ้น`}
            detail="รวมจำนวนสินค้าทุกรายการ"
            icon={<FaBox />}
            color="orange"
          />

          <SummaryCard
            title="สินค้าถูกตัดมากสุด"
            value={topProduct ? topProduct.name : "-"}
            detail={
              topProduct
                ? `จำนวน ${topProduct.quantity.toLocaleString()} ชิ้น`
                : "ยังไม่มีข้อมูล"
            }
            icon={<FaCheckCircle />}
            color="green"
          />

          <SummaryCard
            title="มูลค่าเฉลี่ยต่อรายการ"
            value={`฿ ${formatMoney(averagePerRecord)}`}
            detail="คำนวณจากมูลค่ารวม"
            icon={<FaChartBar />}
            color="blue"
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            title="จำนวนครั้งเพิ่มสต็อก"
            value={`${stockMovements.length.toLocaleString()} ครั้ง`}
            detail="รายการรับเข้าในช่วงเวลานี้"
            icon={<FaHistory />}
            color="blue"
          />

          <SummaryCard
            title="จำนวนสินค้าเพิ่มเข้า"
            value={`${stockInQuantity.toLocaleString()} ชิ้น`}
            detail="รวมสินค้าที่เพิ่มสต็อก"
            icon={<FaBoxOpen />}
            color="green"
          />

          <SummaryCard
            title="ผู้เพิ่มสต็อก"
            value={`${stockInEmployeeCount.toLocaleString()} คน`}
            detail="พนักงานที่เพิ่มสต็อก"
            icon={<FaUsers />}
            color="orange"
          />

          <SummaryCard
            title="สินค้าที่รับเข้า"
            value={`${stockInProductCount.toLocaleString()} รายการ`}
            detail="จำนวนสินค้าที่ถูกเพิ่มสต็อก"
            icon={<FaBox />}
            color="red"
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm 2xl:col-span-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                กราฟมูลค่าการตัดสต็อก
              </h2>

              <p className="mt-1 text-slate-500">
                สรุปมูลค่ารวมตามช่วงเวลาที่เลือก
              </p>
            </div>

            {chartData.length > 0 ? (
              <div className="mt-8 flex h-72 items-end gap-3 overflow-x-auto border-b border-slate-200 px-2 pb-8">
                {chartData.map((item) => {
                  const height = Math.max(
                    8,
                    (item.amount / maxChartAmount) * 100
                  );

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
                        title={`${item.label}: ${formatMoney(item.amount)} บาท`}
                      />

                      <span className="whitespace-nowrap text-xs text-slate-500">
                        {reportType === "yearly"
                          ? item.label.slice(5, 7)
                          : item.label.slice(8, 10)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8 flex h-72 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                ยังไม่มีข้อมูลในช่วงนี้
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                สินค้าถูกตัดมากสุด
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                5 อันดับแรก
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {topProducts.length > 0 ? (
                topProducts.slice(0, 5).map((item, index) => (
                  <div
                    key={`${item.code}-${index}`}
                    className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {index + 1}. {item.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.code || "-"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-bold text-red-600">
                        {item.quantity.toLocaleString()} ชิ้น
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        ฿ {formatMoney(item.amount)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500">
                  ยังไม่มีรายการตัดสต็อก
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                รายการตัดสต็อก
              </h2>

              <p className="mt-1 text-slate-500">
                แสดงข้อมูลตามช่วงเวลาที่เลือก
              </p>
            </div>

            {isLoading && (
              <p className="text-sm font-medium text-red-600">
                กำลังโหลดข้อมูล...
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
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
                  <th className="px-5 py-4 text-center font-semibold">
                    จำนวนสินค้า
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
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
                    const summary = itemSummaryBySale[sale.id] || {
                      quantity: 0,
                      lines: 0,
                    };

                    return (
                      <tr
                        key={sale.id}
                        className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-slate-400">
                          {index + 1}
                        </td>

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

                        <td className="px-5 py-4 text-center">
                          <span className="font-medium">
                            {summary.quantity.toLocaleString()} ชิ้น
                          </span>

                          <span className="ml-1 text-xs text-slate-400">
                            ({summary.lines} รายการ)
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-red-600">
                          ฿ {formatMoney(sale.total_amount)}
                        </td>

                        <td className="max-w-[250px] px-5 py-4 text-slate-500">
                          <p className="truncate">{sale.note || "-"}</p>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      {isLoading
                        ? "กำลังโหลดข้อมูล..."
                        : "ยังไม่มีรายการตัดสต็อกในช่วงเวลาที่เลือก"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-emerald-100 bg-emerald-50 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <FaHistory className="text-xl" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  ประวัติการเพิ่มสต็อกสินค้า
                </h2>

                <p className="mt-1 text-slate-500">
                  แสดงพนักงานที่เพิ่มสินค้าเข้าสต็อกตามช่วงเวลาที่เลือก
                </p>
              </div>
            </div>

            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-700">
              {stockMovements.length.toLocaleString()} รายการ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-5 py-4 text-left font-semibold">#</th>
                  <th className="px-5 py-4 text-left font-semibold">
                    วันเวลาเพิ่มสต็อก
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    รหัสพนักงาน
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    ชื่อพนักงาน
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    สินค้า
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    จำนวนเพิ่ม
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    สต็อกก่อน / หลัง
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    หมายเหตุ
                  </th>
                </tr>
              </thead>

              <tbody>
                {stockMovements.length > 0 ? (
                  stockMovements.map((movement, index) => (
                    <tr
                      key={movement.id}
                      className="border-t border-slate-100 text-slate-700 hover:bg-emerald-50/40"
                    >
                      <td className="px-5 py-4 text-slate-400">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        {formatDateTime(movement.created_at)}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {movement.performed_by_code || "-"}
                      </td>

                      <td className="px-5 py-4">
                        {movement.performed_by_name || "ไม่ระบุชื่อ"}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {movement.product_name || "-"}
                        </p>

                        <p className="mt-1 font-mono text-xs text-slate-400">
                          {movement.product_code || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-700">
                          +{toNumber(movement.quantity)}{" "}
                          {movement.unit || "ชิ้น"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center font-medium">
                        {toNumber(movement.stock_before)} /{" "}
                        {toNumber(movement.stock_after)}
                      </td>

                      <td className="max-w-[240px] px-5 py-4 text-slate-500">
                        <p className="truncate">{movement.note || "-"}</p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      {isLoading
                        ? "กำลังโหลดข้อมูล..."
                        : "ยังไม่มีประวัติการเพิ่มสต็อกในช่วงเวลาที่เลือก"}
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
          ? "border-red-600 bg-red-600 text-white shadow-md"
          : "border-slate-200 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50"
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
          className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-11 pr-4 text-slate-800 outline-none focus:border-red-500"
        />
      </div>
    </div>
  );
}

function SummaryCard({ title, value, detail, icon, color }) {
  const styles = {
    red: {
      icon: "bg-red-100 text-red-600",
      line: "bg-red-500",
    },
    orange: {
      icon: "bg-orange-100 text-orange-600",
      line: "bg-orange-500",
    },
    green: {
      icon: "bg-emerald-100 text-emerald-600",
      line: "bg-emerald-500",
    },
    blue: {
      icon: "bg-blue-100 text-blue-600",
      line: "bg-blue-500",
    },
  };

  const style = styles[color] || styles.blue;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`absolute left-0 top-0 h-1 w-full ${style.line}`} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h2 className="mt-3 break-words text-2xl font-bold text-slate-900">
            {value}
          </h2>

          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}