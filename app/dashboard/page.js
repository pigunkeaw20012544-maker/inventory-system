"use client";

import AccountHeader from "../components/AccountHeader";
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
  FaCalendarAlt,
  FaArrowRight,
  FaBriefcase,
  FaFileAlt,
  FaSyncAlt,
  FaHistory,
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

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sales, setSales] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard() {
    setIsLoading(true);
    setErrorMessage("");

    const [
      { data: productData, error: productError },
      { data: categoryData, error: categoryError },
      { data: salesData, error: salesError },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, stock, unit, status")
        .order("stock", { ascending: true }),

      supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true }),

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
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (productError || categoryError || salesError) {
      console.error(productError || categoryError || salesError);

      setErrorMessage(
        "ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาตรวจสอบฐานข้อมูล Supabase"
      );
    }

    setProducts(productData || []);
    setCategories(categoryData || []);
    setSales(salesData || []);

    setIsLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const today = getLocalDateString();
  const yesterday = getDaysAgoString(1);

  const lowStockProducts = useMemo(() => {
    return products
      .filter(
        (product) =>
          product.status === "ใกล้หมด" ||
          product.status === "หมด" ||
          toNumber(product.stock) < 10
      )
      .sort((a, b) => toNumber(a.stock) - toNumber(b.stock));
  }, [products]);

  const todaySales = useMemo(() => {
    return sales
      .filter((sale) => sale.sale_date === today)
      .reduce((sum, sale) => sum + toNumber(sale.total_amount), 0);
  }, [sales, today]);

  const yesterdaySales = useMemo(() => {
    return sales
      .filter((sale) => sale.sale_date === yesterday)
      .reduce((sum, sale) => sum + toNumber(sale.total_amount), 0);
  }, [sales, yesterday]);

  const todayBillCount = useMemo(() => {
    return sales.filter((sale) => sale.sale_date === today).length;
  }, [sales, today]);

  const comparisonText = useMemo(() => {
    if (yesterdaySales === 0 && todaySales === 0) {
      return "ยังไม่มีข้อมูลยอดขาย";
    }

    if (yesterdaySales === 0) {
      return "เริ่มมียอดขายวันนี้";
    }

    const difference = todaySales - yesterdaySales;

    if (difference === 0) {
      return "ยอดขายเท่ากับเมื่อวาน";
    }

    return `${difference > 0 ? "เพิ่มขึ้น" : "ลดลง"} ${formatMoney(
      Math.abs(difference)
    )} บาท จากเมื่อวาน`;
  }, [todaySales, yesterdaySales]);

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

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">
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
          <Menu active icon={<FaHome />} text="Dashboard" href="/dashboard" />

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
        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Dashboard
            </h1>

            <p className="text-gray-500 mt-2">
              ภาพรวมระบบ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white border px-5 py-3 rounded-xl flex items-center gap-2 text-gray-700 disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />

              {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
            </button>

            <AccountHeader />
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <div className="bg-white shadow-sm border rounded-xl px-5 py-3 flex items-center gap-3 text-gray-700">
            <FaCalendarAlt />
            <span>{formatThaiDate(today)}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 mb-8">
          <Card
            title="จำนวนสินค้าทั้งหมด"
            value={products.length.toLocaleString()}
            unit="รายการ"
            color="red"
            href="/products"
            footer="ดูหน้าสินค้า"
          />

          <Card
            title="จำนวนหมวดหมู่"
            value={categories.length.toLocaleString()}
            unit="หมวดหมู่"
            color="gray"
            href="/categories"
            footer="ดูหมวดหมู่"
          />

          <Card
            title="สินค้าใกล้หมด"
            value={lowStockProducts.length.toLocaleString()}
            unit="รายการ"
            color="yellow"
            href="/products"
            footer="ตรวจสอบสต๊อก"
          />

          <Card
            title="ยอดขายวันนี้"
            value={`฿ ${formatMoney(todaySales)}`}
            unit=""
            color="green"
            href="/sales"
            footer={`${todayBillCount} บิลขายวันนี้`}
          />
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6 mb-8">
          <div className="2xl:col-span-2 bg-white rounded-3xl shadow-sm border p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  ยอดขาย 7 วันล่าสุด
                </h2>

                <p className="text-3xl font-bold text-red-600 mt-4">
                  ฿ {formatMoney(todaySales)}
                </p>

                <p className="text-gray-500 mt-2">
                  {comparisonText}
                </p>
              </div>

              <Link
                href="/reports"
                className="text-red-600 border border-red-200 px-4 py-2 rounded-xl text-sm"
              >
                ดูรายงานยอดขาย
              </Link>
            </div>

            <div className="mt-8 h-64 flex items-end gap-3 px-2 pb-6 border-b">
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
          </div>

          <div className="bg-white rounded-3xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">
                สินค้าใกล้หมด
              </h2>

              <Link href="/products" className="text-red-600 text-sm">
                ดูทั้งหมด
              </Link>
            </div>

            {lowStockProducts.length > 0 ? (
              lowStockProducts.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 items-center py-4 border-b last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {item.name}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      สถานะ: {item.status || "มีสินค้า"}
                    </p>
                  </div>

                  <p className="text-red-600 font-bold whitespace-nowrap">
                    {toNumber(item.stock)} {item.unit || "ชิ้น"}
                  </p>
                </div>
              ))
            ) : (
              <div className="h-56 flex items-center justify-center text-gray-500">
                สต๊อกสินค้าปกติ
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-6 mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                รายการขายล่าสุด
              </h2>

              <p className="text-gray-500 mt-1">
                ข้อมูลจากรายการขายที่บันทึกในระบบ
              </p>
            </div>

            <Link
              href="/reports"
              className="border px-5 py-2 rounded-xl text-gray-700"
            >
              ดูรายงานทั้งหมด
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-4 text-left">#</th>
                  <th className="p-4 text-left">วันที่ / เวลา</th>
                  <th className="p-4 text-left">เลขที่บิล</th>
                  <th className="p-4 text-left">พนักงานขาย</th>
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

                      <td className="p-4">
                        {sale.seller_name || "Admin"}
                      </td>

                      <td className="p-4 font-bold text-red-600">
                        ฿ {formatMoney(sale.total_amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-10 text-center text-gray-500"
                    >
                      {isLoading
                        ? "กำลังโหลดข้อมูล..."
                        : "ยังไม่มีรายการขายในระบบ"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
          <Link
            href="/products"
            className="bg-red-50 border border-red-100 rounded-3xl p-8 flex items-center justify-between hover:bg-red-100"
          >
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center text-3xl">
                <FaBriefcase />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  ไปหน้าสินค้า
                </h2>

                <p className="text-gray-500">
                  จัดการสินค้า เพิ่ม / แก้ไข / ลบ
                </p>
              </div>
            </div>

            <FaArrowRight className="text-red-600 text-2xl" />
          </Link>

          <Link
            href="/reports"
            className="bg-white border rounded-3xl p-8 flex items-center justify-between hover:bg-gray-100"
          >
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-gray-800 text-white rounded-full flex items-center justify-center text-3xl">
                <FaFileAlt />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  ไปหน้ารายงาน
                </h2>

                <p className="text-gray-500">
                  ดูรายงานยอดขายและสรุปข้อมูล
                </p>
              </div>
            </div>

            <FaArrowRight className="text-gray-700 text-2xl" />
          </Link>
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
    >
      <span className="text-xl">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

function Card({ title, value, unit, color, href, footer }) {
  const style = {
    red: "bg-red-600 text-red-600",
    gray: "bg-gray-500 text-gray-600",
    yellow: "bg-yellow-400 text-yellow-500",
    green: "bg-green-500 text-green-600",
  };

  const [bg, text] = style[color].split(" ");

  return (
    <Link
      href={href}
      className="bg-white rounded-3xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className={`w-16 h-16 ${bg} rounded-full mb-4`} />

        <p className="font-semibold text-gray-800">{title}</p>

        <div className="flex items-end gap-2 mt-2">
          <h2 className={`text-3xl font-bold ${text}`}>{value}</h2>
          <span className="text-gray-500">{unit}</span>
        </div>
      </div>

      <div className="bg-red-50 px-6 py-4 flex justify-between text-sm text-red-600">
        <span>{footer}</span>
        <span>›</span>
      </div>
    </Link>
  );
}