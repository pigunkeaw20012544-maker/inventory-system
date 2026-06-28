"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import LogoutButton from "../../components/LogoutButton";
import AccountHeader from "../../components/AccountHeader";
import UserDailySalesSubmission from "../../components/UserDailySalesSubmission";
import {
  FaHome,
  FaBox,
  FaShoppingCart,
  FaChartBar,
  FaCalendarAlt,
  FaFileExcel,
  FaPrint,
  FaShareAlt,
  FaSyncAlt,
  FaUserCheck,
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

export default function UserReportsPage() {
  const today = getLocalDateString();

  const [account, setAccount] = useState({
    name: "User",
    employeeCode: "-",
    role: "user",
  });

  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(getMonthValue());
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);

  const [myTodaySales, setMyTodaySales] = useState([]);
  const [myTodayItems, setMyTodayItems] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMySummary, setIsLoadingMySummary] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyText, setCopyText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const periodRange = useMemo(() => {
    return getPeriodRange(
      reportType,
      selectedDate,
      selectedMonth,
      selectedYear
    );
  }, [reportType, selectedDate, selectedMonth, selectedYear]);

  async function loadAccount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, employee_code, role")
      .eq("id", user.id)
      .maybeSingle();

    setAccount({
      name: profile?.display_name || "User",
      employeeCode: profile?.employee_code || "-",
      role: profile?.role || "user",
    });
  }

  async function loadReport() {
    setIsLoading(true);
    setErrorMessage("");

    const { startDate, endDate } = periodRange;

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

    let itemList = [];

    if (saleIds.length > 0) {
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
      } else {
        itemList = itemData || [];
      }
    }

    setSales(salesList);
    setSaleItems(itemList);
    setIsLoading(false);
  }

  async function loadMyTodaySummary() {
    setIsLoadingMySummary(true);

    const { data: todaySalesData, error: todaySalesError } = await supabase
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
      .eq("sale_date", today)
      .order("created_at", { ascending: false });

    if (todaySalesError) {
      console.error(todaySalesError);
      setMyTodaySales([]);
      setMyTodayItems([]);
      setIsLoadingMySummary(false);
      return;
    }

    const allowedNames = new Set([
      normalizeName(account.name),
      "user",
    ]);

    const mySalesList = (todaySalesData || []).filter((sale) =>
      allowedNames.has(normalizeName(sale.seller_name))
    );

    const mySaleIds = mySalesList.map((sale) => sale.id);

    let myItems = [];

    if (mySaleIds.length > 0) {
      const { data: myItemsData, error: myItemsError } = await supabase
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
        .in("sale_id", mySaleIds);

      if (myItemsError) {
        console.error(myItemsError);
      } else {
        myItems = myItemsData || [];
      }
    }

    setMyTodaySales(mySalesList);
    setMyTodayItems(myItems);
    setIsLoadingMySummary(false);
  }

  useEffect(() => {
    loadAccount();
  }, []);

  useEffect(() => {
    loadReport();
    loadMyTodaySummary();

    const channel = supabase
      .channel("user-reports-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => {
          loadReport();
          loadMyTodaySummary();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sale_items" },
        () => {
          loadReport();
          loadMyTodaySummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    reportType,
    selectedDate,
    selectedMonth,
    selectedYear,
    account.name,
  ]);

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
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sales, reportType]);

  const maxChartAmount = Math.max(
    ...chartData.map((item) => item.amount),
    1
  );

  const myTodayTotal = useMemo(() => {
    return myTodaySales.reduce(
      (sum, sale) => sum + toNumber(sale.total_amount),
      0
    );
  }, [myTodaySales]);

  const myTodayDiscount = useMemo(() => {
    return myTodaySales.reduce(
      (sum, sale) => sum + toNumber(sale.discount_amount),
      0
    );
  }, [myTodaySales]);

  const myTodayQuantity = useMemo(() => {
    return myTodayItems.reduce(
      (sum, item) => sum + toNumber(item.quantity),
      0
    );
  }, [myTodayItems]);

  function createMySummaryText() {
    return [
      "สรุปยอดขายประจำวัน",
      `วันที่: ${formatDate(today)}`,
      `รหัสพนักงาน: ${account.employeeCode}`,
      `พนักงานขาย: ${account.name}`,
      `จำนวนบิลขาย: ${myTodaySales.length.toLocaleString()} บิล`,
      `จำนวนสินค้าที่ขาย: ${myTodayQuantity.toLocaleString()} ชิ้น`,
      `ส่วนลดรวม: ${formatMoney(myTodayDiscount)} บาท`,
      `ยอดขายสุทธิ: ${formatMoney(myTodayTotal)} บาท`,
    ].join("\n");
  }

  function handleViewTodaySummary() {
    setReportType("daily");
    setSelectedDate(today);

    window.setTimeout(() => {
      document
        .getElementById("my-daily-summary")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }

  function printMyTodaySummary() {
    const printWindow = window.open("", "_blank", "width=500,height=680");

    if (!printWindow) {
      alert("กรุณาอนุญาต Pop-up เพื่อพิมพ์สรุปยอด");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>สรุปยอดขาย ${escapeHtml(formatDate(today))}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #111827;
            }

            h1 {
              font-size: 24px;
              margin-bottom: 8px;
            }

            .line {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              padding: 12px 0;
              border-bottom: 1px solid #e5e7eb;
            }

            .total {
              color: #dc2626;
              font-size: 22px;
              font-weight: bold;
              margin-top: 18px;
            }
          </style>
        </head>

        <body>
          <h1>สรุปยอดขายประจำวัน</h1>
          <p>ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p>
          <p>วันที่: ${escapeHtml(formatDate(today))}</p>
          <p>รหัสพนักงาน: ${escapeHtml(account.employeeCode)}</p>
          <p>พนักงานขาย: ${escapeHtml(account.name)}</p>

          <div class="line">
            <span>จำนวนบิลขาย</span>
            <strong>${myTodaySales.length.toLocaleString()} บิล</strong>
          </div>

          <div class="line">
            <span>จำนวนสินค้าที่ขาย</span>
            <strong>${myTodayQuantity.toLocaleString()} ชิ้น</strong>
          </div>

          <div class="line">
            <span>ส่วนลดรวม</span>
            <strong>${formatMoney(myTodayDiscount)} บาท</strong>
          </div>

          <div class="line total">
            <span>ยอดขายสุทธิ</span>
            <span>${formatMoney(myTodayTotal)} บาท</span>
          </div>

          <p style="margin-top:32px;text-align:center">
            พิมพ์จากระบบบริหารจัดการร้านค้า
          </p>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  async function handleSendSummary() {
    const summaryText = createMySummaryText();

    setCopyText(summaryText);
    setShowCopyModal(true);
  }

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await Promise.all([loadReport(), loadMyTodaySummary()]);
    } finally {
      setIsRefreshing(false);
    }
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
    link.download = `user-report-${reportType}-${periodRange.startDate}-to-${periodRange.endDate}.csv`;
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
          <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2>
          <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p>
        </div>

        <nav className="p-6 space-y-4">
          <Menu icon={<FaHome />} text="หน้าหลัก" href="/user/dashboard" />
          <Menu icon={<FaBox />} text="สินค้า" href="/user/products" />
          <Menu icon={<FaShoppingCart />} text="การขาย" href="/user/sales" />
          <Menu active icon={<FaChartBar />} text="รายงาน" href="/user/reports" />
          <LogoutButton />
        </nav>
      </aside>

      <main className="flex-1 min-w-0 p-6 xl:p-10">
        <div className="flex justify-end mb-6 print:hidden">
          <AccountHeader />
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">รายงาน</h1>
          <p className="text-gray-500 mt-2">
            รายงานยอดขายรายวัน รายเดือน และรายปี
          </p>
        </div>

        <UserDailySalesSubmission />

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

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
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
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="border rounded-xl py-4 px-5 flex items-center justify-center gap-2 text-gray-700 disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
              รีเฟรชข้อมูล
            </button>

            <button
              onClick={exportCsv}
              className="border border-green-300 text-green-600 rounded-xl py-4 px-5 flex items-center justify-center gap-2"
            >
              <FaFileExcel />
              Export CSV
            </button>

            <button
              onClick={printReport}
              className="border border-gray-300 text-gray-700 rounded-xl py-4 px-5 flex items-center justify-center gap-2"
            >
              <FaPrint />
              พิมพ์รายงาน
            </button>
          </div>

          <p className="mt-5 text-sm text-gray-500">
            ผู้ดูแลระบบเป็นผู้ปิดยอดประจำวัน ส่วน User สามารถดูและพิมพ์รายงานย้อนหลังได้
          </p>
        </section>

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
            รายงานนี้แสดงข้อมูลรวมเดียวกับรายงานฝั่ง Admin
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
            <h2 className="text-2xl font-bold text-gray-900">
              กราฟยอดขาย
            </h2>

            <p className="text-gray-500 mt-1 mb-6">
              แสดงยอดขายตามช่วงเวลาที่เลือก
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
              <div className="h-72 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500">
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
                <p className="text-gray-500">ยังไม่มีรายการขาย</p>
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
                แสดงรายการขายรวมตามช่วงเวลาที่เลือก
              </p>
            </div>

            {isLoading && (
              <p className="text-red-600">กำลังโหลดข้อมูล...</p>
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

        {showCopyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-5">
            <div className="w-[92vw] max-w-5xl rounded-3xl bg-white shadow-2xl">
              <div className="border-b px-8 py-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  คัดลอกข้อความนี้ แล้วส่งให้ผู้ดูแลระบบ
                </h2>

                <p className="mt-2 text-gray-500">
                  ลากเลือกข้อความทั้งหมด หรือกดปุ่มคัดลอกข้อความด้านล่าง
                </p>
              </div>

              <div className="p-8">
                <textarea
                  value={copyText}
                  readOnly
                  rows={16}
                  className="min-h-[420px] w-full resize-y rounded-2xl border border-gray-300 p-5 text-lg leading-8 text-gray-800 outline-none"
                />
              </div>

              <div className="flex justify-end gap-4 border-t px-8 py-6">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(copyText);
                      alert("คัดลอกข้อความเรียบร้อยแล้ว");
                    } catch {
                      alert(
                        "กรุณาลากเลือกข้อความในกล่อง แล้วกดคัดลอกเอง"
                      );
                    }
                  }}
                  className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
                >
                  คัดลอกข้อความ
                </button>
              </div>
            </div>
          </div>
        )}
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
      <p className="text-2xl font-bold mt-3 break-words">{value}</p>
      <p className="text-sm mt-2 opacity-80">{small}</p>
    </div>
  );
}

function MiniSummary({ label, value, strong }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        strong
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-gray-200 bg-gray-50 text-gray-800"
      }`}
    >
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-xl font-bold mt-2">{value}</p>
    </div>
  );
}