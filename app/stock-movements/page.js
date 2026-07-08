"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../components/AccountHeader";
import BrandLogo from "../components/BrandLogo";
import LogoutButton from "../components/LogoutButton";
import { supabase } from "../lib/supabase";

import {
  FaArrowDown,
  FaArrowUp,
  FaBox,
  FaBoxOpen,
  FaCalendarAlt,
  FaChartBar,
  FaExclamationTriangle,
  FaHistory,
  FaHome,
  FaSearch,
  FaShoppingCart,
  FaSyncAlt,
  FaThLarge,
  FaUsers,
} from "react-icons/fa";

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getToday() {
  return formatLocalDate(new Date());
}

function getDateRange(startDateString, endDateString) {
  const [startYear, startMonth, startDay] = startDateString
    .split("-")
    .map(Number);

  const [endYear, endMonth, endDay] = endDateString
    .split("-")
    .map(Number);

  const startDate = new Date(
    startYear,
    startMonth - 1,
    startDay,
    0,
    0,
    0
  );

  const endDate = new Date(
    endYear,
    endMonth - 1,
    endDay + 1,
    0,
    0,
    0
  );

  return {
    startAt: startDate.toISOString(),
    endAt: endDate.toISOString(),
  };
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

function formatDateRange(startDate, endDate) {
  if (startDate === endDate) {
    return formatDate(startDate);
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getEmployeeKey(movement) {
  return String(
    movement.performed_by_user_id ||
      movement.performed_by_code ||
      movement.performed_by_name ||
      "system"
  );
}

function getMovementInfo(type) {
  const types = {
    initial_stock: {
      label: "สต็อกเริ่มต้น",
      color: "bg-blue-100 text-blue-700",
    },
    stock_in: {
      label: "เพิ่มสต็อก",
      color: "bg-emerald-100 text-emerald-700",
    },
    sale_out: {
      label: "เบิก/ตัดสต็อก",
      color: "bg-red-100 text-red-700",
    },
    stock_out: {
      label: "เบิก/ตัดสต็อก",
      color: "bg-red-100 text-red-700",
    },
    adjustment_in: {
      label: "ปรับเพิ่มสต็อก",
      color: "bg-green-100 text-green-700",
    },
    adjustment_out: {
      label: "ปรับลดสต็อก",
      color: "bg-orange-100 text-orange-700",
    },
  };

  return (
    types[type] || {
      label: "ไม่ระบุ",
      color: "bg-slate-100 text-slate-600",
    }
  );
}

function isStockIn(type) {
  return ["initial_stock", "stock_in", "adjustment_in"].includes(type);
}

function isStockOut(type) {
  return ["sale_out", "stock_out", "adjustment_out"].includes(type);
}

function getMovementQuantity(movement) {
  return Math.abs(toNumber(movement.quantity));
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);

  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());

  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadMovements() {
    setIsLoading(true);
    setErrorMessage("");

    if (!startDate || !endDate) {
      setMovements([]);
      setErrorMessage("กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด");
      setIsLoading(false);
      return;
    }

    if (startDate > endDate) {
      setMovements([]);
      setErrorMessage("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      setIsLoading(false);
      return;
    }

    const { startAt, endAt } = getDateRange(startDate, endDate);

    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        id,
        product_id,
        product_code,
        product_name,
        unit,
        movement_type,
        quantity,
        stock_before,
        stock_after,
        note,
        performed_by_user_id,
        performed_by_name,
        performed_by_code,
        created_at
      `)
      .gte("created_at", startAt)
      .lt("created_at", endAt)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);

      setMovements([]);
      setErrorMessage(
        error.message || "ไม่สามารถโหลดประวัติการเคลื่อนไหวสต็อกได้"
      );
      setIsLoading(false);
      return;
    }

    setMovements(data || []);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadMovements();

    const channel = supabase
      .channel("admin-stock-movements-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock_movements",
        },
        () => void loadMovements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [startDate, endDate]);

  const employeeOptions = useMemo(() => {
    const employeeMap = new Map();

    movements.forEach((movement) => {
      const key = getEmployeeKey(movement);

      if (key === "system") {
        return;
      }

      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          key,
          code: movement.performed_by_code || "-",
          name: movement.performed_by_name || "ไม่ระบุชื่อ",
        });
      }
    });

    return Array.from(employeeMap.values()).sort((a, b) =>
      `${a.code} ${a.name}`.localeCompare(`${b.code} ${b.name}`, "th")
    );
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const search = normalizeValue(keyword);

    return movements.filter((movement) => {
      const matchesType =
        typeFilter === "all" ||
        movement.movement_type === typeFilter;

      const matchesEmployee =
        employeeFilter === "all" ||
        getEmployeeKey(movement) === employeeFilter;

      const matchesSearch =
        !search ||
        [
          movement.product_code,
          movement.product_name,
          movement.performed_by_name,
          movement.performed_by_code,
          movement.note,
          getMovementInfo(movement.movement_type).label,
        ].some((value) => normalizeValue(value).includes(search));

      return matchesType && matchesEmployee && matchesSearch;
    });
  }, [movements, keyword, typeFilter, employeeFilter]);

  const summary = useMemo(() => {
    return filteredMovements.reduce(
      (result, movement) => {
        const quantity = getMovementQuantity(movement);

        result.total += 1;

        if (isStockIn(movement.movement_type)) {
          result.stockIn += quantity;
          result.stockInCount += 1;
        }

        if (isStockOut(movement.movement_type)) {
          result.stockOut += quantity;
          result.stockOutCount += 1;
        }

        return result;
      },
      {
        total: 0,
        stockIn: 0,
        stockOut: 0,
        stockInCount: 0,
        stockOutCount: 0,
      }
    );
  }, [filteredMovements]);

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await loadMovements();
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleClearFilters() {
    const today = getToday();

    setStartDate(today);
    setEndDate(today);
    setKeyword("");
    setTypeFilter("all");
    setEmployeeFilter("all");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-[290px] min-h-screen md:min-h-screen shrink-0 bg-[#182232] text-white overflow-y-auto">
        <div className="rounded-br-[42px] bg-red-600 px-7 py-8 shadow-lg">
          <div className="flex items-center gap-3">
            <BrandLogo />

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
            active
            icon={<FaHistory />}
            text="ประวัติสต๊อก"
            href="/stock-movements"
          />

          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />

          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />

          <div className="pt-5">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-6 xl:p-10">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900">
                ประวัติสต๊อกสินค้า
              </h1>

              <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                Admin
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              ตรวจสอบการเพิ่มสต็อก เบิก/ตัดสต็อก และข้อมูลพนักงานผู้ดำเนินการ
            </p>
          </div>

          <AccountHeader />
        </header>

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            icon={<FaHistory />}
            title="รายการทั้งหมด"
            value={summary.total.toLocaleString()}
            detail="ตามตัวกรองที่เลือก"
            color="blue"
          />

          <SummaryCard
            icon={<FaArrowUp />}
            title="เพิ่มสต็อก"
            value={`+${summary.stockIn.toLocaleString()}`}
            detail={`${summary.stockInCount.toLocaleString()} รายการ`}
            color="green"
          />

          <SummaryCard
            icon={<FaArrowDown />}
            title="เบิก/ตัดสต็อก"
            value={`-${summary.stockOut.toLocaleString()}`}
            detail={`${summary.stockOutCount.toLocaleString()} รายการ`}
            color="red"
          />

          <SummaryCard
            icon={<FaBoxOpen />}
            title="ช่วงวันที่กำลังแสดง"
            value={formatDateRange(startDate, endDate)}
            detail="เลือกดูย้อนหลังได้"
            color="orange"
          />
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-5">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FaCalendarAlt />
                  วันที่เริ่มต้น
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  วันที่สิ้นสุด
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  min={startDate}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  ประเภทรายการ
                </label>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-red-500"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="stock_in">เพิ่มสต็อก</option>
                  <option value="sale_out">เบิก/ตัดสต็อก</option>
                  <option value="stock_out">เบิก/ตัดสต็อก</option>
                  <option value="initial_stock">สต็อกเริ่มต้น</option>
                  <option value="adjustment_in">ปรับเพิ่มสต็อก</option>
                  <option value="adjustment_out">ปรับลดสต็อก</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  พนักงานผู้ดำเนินการ
                </label>

                <select
                  value={employeeFilter}
                  onChange={(event) => setEmployeeFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-red-500"
                >
                  <option value="all">พนักงานทุกคน</option>

                  {employeeOptions.map((employee) => (
                    <option key={employee.key} value={employee.key}>
                      {employee.code} - {employee.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  ค้นหา
                </label>

                <div className="relative">
                  <FaSearch className="absolute left-4 top-4 text-slate-400" />

                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="สินค้า / พนักงาน / หมายเหตุ"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-800 outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-700 hover:bg-slate-50"
              >
                ล้างตัวกรอง
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-white hover:bg-red-700 disabled:bg-red-300"
              >
                <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                รายการเคลื่อนไหวสต๊อก
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                พบ {filteredMovements.length.toLocaleString()} จาก{" "}
                {movements.length.toLocaleString()} รายการ
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              {formatDateRange(startDate, endDate)}
            </span>
          </div>

          {errorMessage && (
            <div className="m-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <FaExclamationTriangle className="mt-1 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-5 py-4 text-left font-semibold">
                    วันเวลา
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    ประเภท
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    รหัสสินค้า
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    ชื่อสินค้า
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    จำนวน
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    ก่อน
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    หลัง
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    รหัสพนักงาน
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    ชื่อผู้ดำเนินการ
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    หมายเหตุ
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      กำลังโหลดข้อมูลประวัติสต๊อก...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredMovements.map((movement) => {
                    const info = getMovementInfo(movement.movement_type);
                    const incoming = isStockIn(movement.movement_type);
                    const outgoing = isStockOut(movement.movement_type);
                    const quantity = getMovementQuantity(movement);

                    return (
                      <tr
                        key={movement.id}
                        className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          {formatDateTime(movement.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${info.color}`}
                          >
                            {info.label}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-600">
                            {movement.product_code || "-"}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {movement.product_name || "-"}
                        </td>

                        <td
                          className={`px-5 py-4 text-right font-bold ${
                            incoming
                              ? "text-emerald-600"
                              : outgoing
                              ? "text-red-600"
                              : "text-slate-600"
                          }`}
                        >
                          {incoming ? "+" : outgoing ? "-" : ""}
                          {quantity} {movement.unit || "ชิ้น"}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {movement.stock_before ?? "-"}
                        </td>

                        <td className="px-5 py-4 text-center font-semibold text-slate-900">
                          {movement.stock_after ?? "-"}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {movement.performed_by_code || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {movement.performed_by_name || "ระบบ"}
                        </td>

                        <td className="max-w-[240px] px-5 py-4 text-slate-500">
                          <p className="truncate">
                            {movement.note || "-"}
                          </p>
                        </td>
                      </tr>
                    );
                  })}

                {!isLoading && filteredMovements.length === 0 && (
                  <tr>
                    <td
                      colSpan="10"
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      ยังไม่มีประวัติสต๊อกตามตัวกรองที่เลือก
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

function SummaryCard({ icon, title, value, detail, color }) {
  const styles = {
    blue: {
      icon: "bg-blue-100 text-blue-600",
      line: "bg-blue-500",
    },
    green: {
      icon: "bg-emerald-100 text-emerald-600",
      line: "bg-emerald-500",
    },
    red: {
      icon: "bg-red-100 text-red-600",
      line: "bg-red-500",
    },
    orange: {
      icon: "bg-orange-100 text-orange-600",
      line: "bg-orange-500",
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