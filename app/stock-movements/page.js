"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import LogoutButton from "../components/LogoutButton";
import AccountHeader from "../components/AccountHeader";

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

function getMovementInfo(type) {
  const types = {
    initial_stock: {
      label: "สต๊อกเริ่มต้น",
      color: "bg-blue-100 text-blue-700",
    },
    stock_in: {
      label: "รับสินค้าเข้า",
      color: "bg-green-100 text-green-700",
    },
    sale_out: {
      label: "ขายออก",
      color: "bg-red-100 text-red-700",
    },
    adjustment_in: {
      label: "ปรับเพิ่มสต๊อก",
      color: "bg-emerald-100 text-emerald-700",
    },
    adjustment_out: {
      label: "ปรับลดสต๊อก",
      color: "bg-orange-100 text-orange-700",
    },
  };

  return (
    types[type] || {
      label: "ไม่ระบุ",
      color: "bg-gray-100 text-gray-700",
    }
  );
}

function isStockIn(type) {
  return ["initial_stock", "stock_in", "adjustment_in"].includes(type);
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
        error.message || "ไม่สามารถโหลดประวัติสต๊อกได้"
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
    const search = keyword.trim().toLowerCase();

    return movements.filter((movement) => {
      const matchesType =
        typeFilter === "all" ||
        movement.movement_type === typeFilter;

      const matchesSearch =
        !search ||
        [
          movement.product_code,
          movement.product_name,
          movement.performed_by_code,
          movement.performed_by_name,
          movement.note,
        ].some((value) =>
          String(value || "").toLowerCase().includes(search)
        );

      return matchesType && matchesSearch;
    });
  }, [movements, keyword, typeFilter]);

  const summary = useMemo(() => {
    return movements.reduce(
      (result, movement) => {
        const quantity = Math.abs(toNumber(movement.quantity));

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

    await loadMovements();

    setIsRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">
      <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden">
        <div className="bg-red-600 p-8 rounded-br-[45px]">
          <div className="text-3xl">🥤</div>

          <h2 className="mt-3 font-bold">
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
            active
            icon={<FaHistory />}
            text="ประวัติสต๊อก"
            href="/stock-movements"
          />

          <Menu
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
        <header className="flex flex-col justify-between gap-5 mb-8 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              ประวัติสต๊อกสินค้า
            </h1>

            <p className="mt-2 text-gray-500">
              ตรวจสอบการรับสินค้าเข้า ขายออก และผู้ดำเนินการ
            </p>
          </div>

          <AccountHeader />
        </header>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<FaHistory />}
            title="รายการทั้งหมดวันนี้"
            value={summary.total}
            detail="รายการ"
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
            value={new Date(
              `${selectedDate}T00:00:00`
            ).toLocaleDateString("th-TH")}
            detail="เลือกดูย้อนหลังได้"
            color="orange"
          />
        </section>

        <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <FaCalendarAlt />
                วันที่
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
                className="w-full rounded-xl border px-4 py-3 text-gray-800 outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                ประเภทรายการ
              </label>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
                className="w-full rounded-xl border px-4 py-3 text-gray-800 outline-none focus:border-red-500"
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
              <label className="mb-2 block text-sm font-medium text-gray-700">
                ค้นหา
              </label>

              <div className="relative">
                <FaSearch className="absolute left-4 top-4 text-gray-400" />

                <input
                  value={keyword}
                  onChange={(event) =>
                    setKeyword(event.target.value)
                  }
                  placeholder="สินค้า / ชื่อพนักงาน / รหัสพนักงาน"
                  className="w-full rounded-xl border py-3 pl-11 pr-4 text-gray-800 outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="mt-5 flex items-center gap-3 rounded-xl bg-red-600 px-6 py-3 text-white disabled:bg-red-300"
          >
            <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
            รีเฟรชข้อมูล
          </button>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-2xl font-bold text-gray-900">
              รายการเคลื่อนไหวสต๊อก
            </h2>

            <p className="mt-1 text-gray-500">
              พบ {filteredMovements.length} รายการ
            </p>
          </div>

          {errorMessage && (
            <div className="m-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <FaExclamationTriangle className="mt-1 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-[1150px] w-full text-gray-800">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-4 text-left">วันเวลา</th>
                  <th className="p-4 text-left">ประเภท</th>
                  <th className="p-4 text-left">รหัสสินค้า</th>
                  <th className="p-4 text-left">ชื่อสินค้า</th>
                  <th className="p-4 text-right">จำนวน</th>
                  <th className="p-4 text-center">ก่อน</th>
                  <th className="p-4 text-center">หลัง</th>
                  <th className="p-4 text-left">ผู้ดำเนินการ</th>
                  <th className="p-4 text-left">หมายเหตุ</th>
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan="9"
                      className="p-12 text-center text-gray-500"
                    >
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredMovements.map((movement) => {
                    const info = getMovementInfo(
                      movement.movement_type
                    );

                    const quantity = Math.abs(
                      toNumber(movement.quantity)
                    );

                    const incoming = isStockIn(
                      movement.movement_type
                    );

                    return (
                      <tr
                        key={movement.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-4 whitespace-nowrap">
                          {formatDateTime(movement.created_at)}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-medium ${info.color}`}
                          >
                            {info.label}
                          </span>
                        </td>

                        <td className="p-4 font-mono text-sm">
                          {movement.product_code || "-"}
                        </td>

                        <td className="p-4 font-medium">
                          {movement.product_name || "-"}
                        </td>

                        <td
                          className={`p-4 text-right font-bold ${
                            incoming
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {incoming ? "+" : "-"}
                          {quantity} {movement.unit || "ชิ้น"}
                        </td>

                        <td className="p-4 text-center">
                          {movement.stock_before ?? "-"}
                        </td>

                        <td className="p-4 text-center font-semibold">
                          {movement.stock_after ?? "-"}
                        </td>

                        <td className="p-4">
                          <p className="font-medium">
                            {movement.performed_by_name || "ระบบ"}
                          </p>

                          <p className="text-sm text-gray-500">
                            {movement.performed_by_code || "-"}
                          </p>
                        </td>

                        <td className="p-4">
                          {movement.note || "-"}
                        </td>
                      </tr>
                    );
                  })}

                {!isLoading &&
                  filteredMovements.length === 0 && (
                    <tr>
                      <td
                        colSpan="9"
                        className="p-12 text-center text-gray-500"
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
      className={`flex w-full items-center gap-4 rounded-xl px-5 py-4 whitespace-nowrap ${
        active ? "bg-red-600 shadow-lg" : "hover:bg-white/10"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

function SummaryCard({ icon, title, value, detail, color }) {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{title}</p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {value}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {detail}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}