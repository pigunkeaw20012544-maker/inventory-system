"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../components/AccountHeader";
import LogoutButton from "../components/LogoutButton";
import { supabase } from "../lib/supabase";

import {
  FaArrowRight,
  FaBell,
  FaBox,
  FaBoxOpen,
  FaBoxes,
  FaBriefcase,
  FaCalendarAlt,
  FaChartBar,
  FaExclamationTriangle,
  FaFileAlt,
  FaHistory,
  FaHome,
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

function getStockLevel(stock) {
  const quantity = toNumber(stock);

  if (quantity <= 0) return "out";
  if (quantity < 10) return "low";

  return "normal";
}

function getStockStatusText(stock) {
  const level = getStockLevel(stock);

  if (level === "out") return "สินค้าหมด";
  if (level === "low") return "สินค้าใกล้หมด";

  return "สต๊อกปกติ";
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
        .select("id, product_code, name, stock, unit, status")
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

  const outOfStockProducts = useMemo(() => {
    return products
      .filter((product) => toNumber(product.stock) <= 0)
      .sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => {
        const stock = toNumber(product.stock);

        return stock > 0 && stock < 10;
      })
      .sort((a, b) => toNumber(a.stock) - toNumber(b.stock));
  }, [products]);

  const stockAlertProducts = useMemo(() => {
    return [...outOfStockProducts, ...lowStockProducts];
  }, [outOfStockProducts, lowStockProducts]);

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
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-[290px] shrink-0 min-h-screen bg-[#182232] text-white print:hidden">
        <div className="bg-red-600 px-7 py-8 rounded-br-[42px] shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
              🥤
            </div>

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

          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />

          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />

          <div className="pt-5">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 p-6 xl:p-10">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900">
                Dashboard
              </h1>

              {stockAlertProducts.length > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-600">
                  <FaBell />
                  แจ้งเตือน {stockAlertProducts.length}
                </span>
              )}
            </div>

            <p className="mt-2 text-slate-500">
              ภาพรวมยอดขาย สินค้า และการแจ้งเตือนสต๊อก
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
            </button>

            <AccountHeader />
          </div>
        </header>

        <div className="mt-6 flex justify-end">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-700 shadow-sm">
            <FaCalendarAlt />
            <span>{formatThaiDate(today)}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600">
            {errorMessage}
          </div>
        )}

        {outOfStockProducts.length > 0 && (
          <Link
            href="/products"
            className="mt-6 block rounded-3xl border border-red-200 bg-red-50 p-6 transition hover:bg-red-100"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-xl text-white">
                  <FaExclamationTriangle />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-red-700">
                    สินค้าหมด {outOfStockProducts.length} รายการ
                  </h2>

                  <p className="mt-1 text-sm text-red-600">
                    สินค้าเหลือ 0 ชิ้น กรุณารับสินค้าเข้าเพื่อให้สามารถขายได้
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {outOfStockProducts.slice(0, 5).map((product) => (
                      <span
                        key={product.id}
                        className="rounded-full bg-white px-3 py-1 text-sm font-medium text-red-700"
                      >
                        {product.name}
                      </span>
                    ))}

                    {outOfStockProducts.length > 5 && (
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-red-700">
                        และอีก {outOfStockProducts.length - 5} รายการ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className="flex items-center gap-2 font-medium text-red-700">
                ไปหน้าสินค้า
                <FaArrowRight />
              </span>
            </div>
          </Link>
        )}

        {lowStockProducts.length > 0 && (
          <Link
            href="/products"
            className="mt-4 block rounded-3xl border border-orange-200 bg-orange-50 p-6 transition hover:bg-orange-100"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-xl text-white">
                  <FaExclamationTriangle />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-orange-700">
                    สินค้าใกล้หมด {lowStockProducts.length} รายการ
                  </h2>

                  <p className="mt-1 text-sm text-orange-600">
                    สินค้าเหลือ 1–9 ชิ้น ควรวางแผนรับสินค้าเข้าเพิ่ม
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {lowStockProducts.slice(0, 5).map((product) => (
                      <span
                        key={product.id}
                        className="rounded-full bg-white px-3 py-1 text-sm font-medium text-orange-700"
                      >
                        {product.name} ({toNumber(product.stock)}{" "}
                        {product.unit || "ชิ้น"})
                      </span>
                    ))}

                    {lowStockProducts.length > 5 && (
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-orange-700">
                        และอีก {lowStockProducts.length - 5} รายการ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className="flex items-center gap-2 font-medium text-orange-700">
                ตรวจสอบสินค้า
                <FaArrowRight />
              </span>
            </div>
          </Link>
        )}

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-5">
          <Card
            title="สินค้าทั้งหมด"
            value={products.length.toLocaleString()}
            unit="รายการ"
            color="blue"
            icon={<FaBoxes />}
            href="/products"
            footer="ดูหน้าสินค้า"
          />

          <Card
            title="จำนวนหมวดหมู่"
            value={categories.length.toLocaleString()}
            unit="หมวดหมู่"
            color="gray"
            icon={<FaThLarge />}
            href="/categories"
            footer="ดูหมวดหมู่"
          />

          <Card
            title="สินค้าหมด"
            value={outOfStockProducts.length.toLocaleString()}
            unit="รายการ"
            color="red"
            icon={<FaExclamationTriangle />}
            href="/products"
            footer="ต้องรับสินค้าเข้า"
          />

          <Card
            title="สินค้าใกล้หมด"
            value={lowStockProducts.length.toLocaleString()}
            unit="รายการ"
            color="orange"
            icon={<FaBoxOpen />}
            href="/products"
            footer="เหลือ 1–9 ชิ้น"
          />

          <Card
            title="ยอดขายวันนี้"
            value={`฿ ${formatMoney(todaySales)}`}
            unit=""
            color="green"
            icon={<FaShoppingCart />}
            href="/sales"
            footer={`${todayBillCount} บิลขายวันนี้`}
          />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm 2xl:col-span-2">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  ยอดขาย 7 วันล่าสุด
                </h2>

                <p className="mt-4 text-3xl font-bold text-red-600">
                  ฿ {formatMoney(todaySales)}
                </p>

                <p className="mt-2 text-slate-500">
                  {comparisonText}
                </p>
              </div>

              <Link
                href="/reports"
                className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                ดูรายงานยอดขาย
              </Link>
            </div>

            <div className="mt-8 flex h-64 items-end gap-3 border-b px-2 pb-6">
              {dailySales.map((item) => {
                const height = Math.max(
                  8,
                  (item.amount / maxDailySales) * 100
                );

                return (
                  <div
                    key={item.date}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span className="text-xs text-slate-400">
                      {item.amount > 0
                        ? `฿${toNumber(item.amount).toLocaleString("th-TH")}`
                        : "-"}
                    </span>

                    <div
                      className="w-full rounded-t-xl bg-red-500"
                      style={{ height: `${height}%` }}
                      title={`${formatThaiDate(item.date)}: ${formatMoney(
                        item.amount
                      )} บาท`}
                    />

                    <span className="text-xs text-slate-500">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  แจ้งเตือนสต๊อก
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  สินค้าที่ต้องตรวจสอบ
                </p>
              </div>

              <Link href="/products" className="text-sm text-red-600">
                ดูทั้งหมด
              </Link>
            </div>

            {stockAlertProducts.length > 0 ? (
              stockAlertProducts.slice(0, 5).map((item) => {
                const level = getStockLevel(item.stock);
                const isOut = level === "out";

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {item.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {item.product_code || "-"} · {getStockStatusText(item.stock)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
                        isOut
                          ? "bg-red-100 text-red-600"
                          : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {toNumber(item.stock)} {item.unit || "ชิ้น"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="flex h-56 flex-col items-center justify-center text-center text-slate-500">
                <FaBoxOpen className="mb-3 text-4xl text-emerald-500" />
                <p className="font-medium text-slate-700">
                  สต๊อกสินค้าปกติ
                </p>
                <p className="mt-1 text-sm">
                  ไม่มีสินค้าที่หมดหรือใกล้หมด
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                รายการขายล่าสุด
              </h2>

              <p className="mt-1 text-slate-500">
                ข้อมูลจากรายการขายที่บันทึกในระบบ
              </p>
            </div>

            <Link
              href="/reports"
              className="rounded-xl border border-slate-200 px-5 py-2 text-slate-700 hover:bg-slate-50"
            >
              ดูรายงานทั้งหมด
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="bg-slate-50 text-slate-600">
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
                    <tr
                      key={sale.id}
                      className="border-b border-slate-100 text-slate-800"
                    >
                      <td className="p-4">{index + 1}</td>

                      <td className="p-4">
                        <div>{formatThaiDate(sale.sale_date)}</div>

                        <div className="mt-1 text-xs text-slate-400">
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
                      className="p-10 text-center text-slate-500"
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
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <Link
            href="/products"
            className="flex items-center justify-between rounded-3xl border border-red-100 bg-red-50 p-8 transition hover:bg-red-100"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-3xl text-white">
                <FaBriefcase />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  ไปหน้าสินค้า
                </h2>

                <p className="text-slate-500">
                  จัดการสินค้า เพิ่ม แก้ไข ลบ และตรวจสอบสต๊อก
                </p>
              </div>
            </div>

            <FaArrowRight className="text-2xl text-red-600" />
          </Link>

          <Link
            href="/reports"
            className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-8 transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-3xl text-white">
                <FaFileAlt />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  ไปหน้ารายงาน
                </h2>

                <p className="text-slate-500">
                  ดูรายงานยอดขายและสรุปข้อมูล
                </p>
              </div>
            </div>

            <FaArrowRight className="text-2xl text-slate-700" />
          </Link>
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

function Card({ title, value, unit, color, icon, href, footer }) {
  const styles = {
    blue: {
      icon: "bg-blue-100 text-blue-600",
      number: "text-blue-600",
      footer: "bg-blue-50 text-blue-600",
    },
    gray: {
      icon: "bg-slate-100 text-slate-600",
      number: "text-slate-700",
      footer: "bg-slate-50 text-slate-600",
    },
    red: {
      icon: "bg-red-100 text-red-600",
      number: "text-red-600",
      footer: "bg-red-50 text-red-600",
    },
    orange: {
      icon: "bg-orange-100 text-orange-600",
      number: "text-orange-600",
      footer: "bg-orange-50 text-orange-600",
    },
    green: {
      icon: "bg-emerald-100 text-emerald-600",
      number: "text-emerald-600",
      footer: "bg-emerald-50 text-emerald-600",
    },
  };

  const style = styles[color] || styles.blue;

  return (
    <Link
      href={href}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-slate-600">{title}</p>

            <div className="mt-3 flex items-end gap-2">
              <h2 className={`text-3xl font-bold ${style.number}`}>
                {value}
              </h2>

              <span className="text-slate-500">{unit}</span>
            </div>
          </div>

          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${style.icon}`}
          >
            {icon}
          </div>
        </div>
      </div>

      <div
        className={`flex items-center justify-between px-6 py-3 text-sm ${style.footer}`}
      >
        <span>{footer}</span>
        <FaArrowRight />
      </div>
    </Link>
  );
}