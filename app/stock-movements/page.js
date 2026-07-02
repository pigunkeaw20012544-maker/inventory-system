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

function getDateRange(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  const startDate = new Date(year, month - 1, day, 0, 0, 0);
  const endDate = new Date(year, month - 1, day + 1, 0, 0, 0);

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

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getMovementInfo(type) {
  const types = {
    initial_stock: {
      label: "สต๊อกเริ่มต้น",
      color: "bg-blue-100 text-blue-700",
    },
    stock_in: {
      label: "รับสินค้าเข้า",
      color: "bg-emerald-100 text-emerald-700",
    },
    sale_out: {
      label: "ขายออก",
      color: "bg-red-100 text-red-700",
    },
    adjustment_in: {
      label: "ปรับเพิ่มสต๊อก",
      color: "bg-green-100 text-green-700",
    },
    adjustment_out: {
      label: "ปรับลดสต๊อก",
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

function getMovementQuantity(movement) {
  return Math.abs(toNumber(movement.quantity));
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadMovements() {
    setIsLoading(true);
    setErrorMessage("");

    const { startAt, endAt } = getDateRange(selectedDate);

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
        error.message || "ไม่สามารถโหลดประวัติการเคลื่อนไหวสต๊อกได้"
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
  }, [selectedDate]);

  const filteredMovements = useMemo(() => {
    const search = normalizeValue(keyword);

    return movements.filter((movement) => {
      const matchesType =
        typeFilter === "all" ||
        movement.movement_type === typeFilter;

      const matchesSearch =
        !search ||
        [
          movement.product_code,
          movement.product_name,
          movement.performed_by_name,
          movement.performed_by_code,
          movement.note,
        ].some((value) => normalizeValue(value).includes(search));

      return matchesType && matchesSearch;
    });
  }, [movements, keyword, typeFilter]);

  const summary = useMemo(() => {
    return movements.reduce(
      (result, movement) => {
        const quantity = getMovementQuantity(movement);

        result.total += 1;

        if (isStockIn(movement.movement_type)) {
          result.stockIn += quantity;
          result.stockInCount += 1;
        } else {
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
  }, [movements]);

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await loadMovements();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-[290px] min-h-screen shrink-0 bg-[#182232] text-white">
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
            text="การขาย"
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
              ตรวจสอบการรับสินค้าเข้า ขายออก ปรับสต๊อก และผู้ดำเนินการ
            </p>
          </div>

          <AccountHeader />
        </header>

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            icon={<FaHistory />}
            title="รายการทั้งหมด"
            value={summary.total}
            detail="รายการในวันที่เลือก"
            color="blue"
          />

          <SummaryCard
            icon={<FaArrowUp />}
            title="รับสินค้าเข้า"
            value={`+${summary.stockIn}`}
            detail={`${summary.stockInCount} รายการ`}
            color="green"
          />

          <SummaryCard
            icon={<FaArrowDown />}
            title="ขายหรือปรับลด"
            value={`-${summary.stockOut}`}
            detail={`${summary.stockOutCount} รายการ`}
            color="red"
          />

          <SummaryCard
            icon={<FaBoxOpen />}
            title="วันที่กำลังแสดง"
            value={formatDate(selectedDate)}
            detail="สามารถเลือกดูย้อนหลังได้"
            color="orange"
          />
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FaCalendarAlt />
                  วันที่
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
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
                  <option value="stock_in">รับสินค้าเข้า</option>
                  <option value="sale_out">ขายออก</option>
                  <option value="initial_stock">สต๊อกเริ่มต้น</option>
                  <option value="adjustment_in">ปรับเพิ่มสต๊อก</option>
                  <option value="adjustment_out">ปรับลดสต๊อก</option>
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
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                รายการเคลื่อนไหวสต๊อก
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                พบ {filteredMovements.length} รายการ
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              วันที่ {formatDate(selectedDate)}
            </span>
          </div>

          {errorMessage && (
            <div className="m-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <FaExclamationTriangle className="mt-1 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
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
                    ผู้ดำเนินการ
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
                      colSpan="9"
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
                            incoming ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {incoming ? "+" : "-"}
                          {quantity} {movement.unit || "ชิ้น"}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {movement.stock_before ?? "-"}
                        </td>

                        <td className="px-5 py-4 text-center font-semibold text-slate-900">
                          {movement.stock_after ?? "-"}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">
                            {movement.performed_by_name || "ระบบ"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {movement.performed_by_code || "-"}
                          </p>
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
                      colSpan="9"
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      ยังไม่มีประวัติสต๊อกในวันที่เลือก
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
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {value}
          </h2>

          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}