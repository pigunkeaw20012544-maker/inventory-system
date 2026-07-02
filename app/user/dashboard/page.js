"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../../components/AccountHeader";
import LogoutButton from "../../components/LogoutButton";
import BrandLogo from "../../components/BrandLogo";
import { supabase } from "../../lib/supabase";

import {
  FaArrowRight,
  FaBox,
  FaBoxOpen,
  FaChartBar,
  FaExclamationTriangle,
  FaHome,
  FaShoppingCart,
  FaSyncAlt,
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

  return new Date(`${value}T00:00:00`).toLocaleDateString("th-TH", {
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

function getStockInfo(stock) {
  const quantity = toNumber(stock);

  if (quantity <= 0) {
    return {
      label: "หมด",
      badge: "bg-red-100 text-red-700",
      text: "text-red-600",
    };
  }

  if (quantity < 10) {
    return {
      label: "ใกล้หมด",
      badge: "bg-orange-100 text-orange-700",
      text: "text-orange-600",
    };
  }

  return {
    label: "มีสินค้า",
    badge: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-600",
  };
}

export default function UserDashboardPage() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const today = getLocalDateString();

    async function loadDashboard() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error("ไม่พบข้อมูลผู้ใช้งาน");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const sellerNames = [
        profile?.display_name,
        "User",
      ].filter(Boolean);

      const [
        { data: productData, error: productError },
        { data: salesData, error: salesError },
      ] = await Promise.all([
        supabase
          .from("products")
          .select("id, product_code, name, stock, unit, status")
          .order("stock", { ascending: true }),

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
          .in("seller_name", sellerNames)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (productError) {
        throw productError;
      }

      if (salesError) {
        throw salesError;
      }

      setProducts(productData || []);
      setSales(salesData || []);
    } catch (error) {
      console.error(error);
      setProducts([]);
      setSales([]);
      setErrorMessage(
        error.message ||
          "ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาลองกดรีเฟรชอีกครั้ง"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();

    const channel = supabase
      .channel("user-dashboard-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          void loadDashboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          void loadDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => {
        const stock = toNumber(product.stock);

        return stock > 0 && stock < 10;
      })
      .sort((a, b) => toNumber(a.stock) - toNumber(b.stock));
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((product) => toNumber(product.stock) <= 0);
  }, [products]);

  const stockWarningProducts = useMemo(() => {
    return [...outOfStockProducts, ...lowStockProducts]
      .sort((a, b) => toNumber(a.stock) - toNumber(b.stock))
      .slice(0, 5);
  }, [outOfStockProducts, lowStockProducts]);

  const todaySales = useMemo(() => {
    return sales
      .filter((sale) => sale.sale_date === today)
      .reduce((sum, sale) => sum + toNumber(sale.total_amount), 0);
  }, [sales, today]);

  const todayBillCount = useMemo(() => {
    return sales.filter((sale) => sale.sale_date === today).length;
  }, [sales, today]);

  const dailySales = useMemo(() => {
    const groupedSales = sales.reduce((result, sale) => {
      const saleDate = sale.sale_date;

      result[saleDate] =
        (result[saleDate] || 0) + toNumber(sale.total_amount);

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

  const recentSales = useMemo(() => {
    return sales.slice(0, 5);
  }, [sales]);

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await loadDashboard();
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
            เมนูพนักงาน
          </p>

          <Menu
            active
            icon={<FaHome />}
            text="หน้าหลัก"
            href="/user/dashboard"
          />

          <Menu
            icon={<FaBox />}
            text="สินค้า"
            href="/user/products"
          />

          <Menu
            icon={<FaShoppingCart />}
            text="การขาย"
            href="/user/sales"
          />

          <Menu
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
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900">
                สวัสดี, พนักงานขาย
              </h1>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                User
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              ตรวจสอบสินค้า ดูยอดขาย และเริ่มทำรายการขายได้จากหน้านี้
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
            </button>

            <AccountHeader />
          </div>
        </header>

        {errorMessage && (
          <section className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            <FaExclamationTriangle className="mt-1 shrink-0" />
            <p>{errorMessage}</p>
          </section>
        )}

        <section className="mt-7 inline-flex items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-slate-700 shadow-sm">
          ยอดขายวันที่ {formatThaiDate(today)}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <DashboardCard
            title="สินค้าทั้งหมด"
            value={`${products.length.toLocaleString()} รายการ`}
            detail="สินค้าในระบบ"
            icon={<FaBox />}
            color="blue"
            href="/user/products"
          />

          <DashboardCard
            title="สินค้าใกล้หมด"
            value={`${lowStockProducts.length.toLocaleString()} รายการ`}
            detail="เหลือ 1–9 ชิ้น"
            icon={<FaExclamationTriangle />}
            color="orange"
            href="/user/products"
          />

          <DashboardCard
            title="สินค้าหมด"
            value={`${outOfStockProducts.length.toLocaleString()} รายการ`}
            detail="ควรรับสินค้าเข้า"
            icon={<FaBoxOpen />}
            color="red"
            href="/user/products"
          />

          <DashboardCard
            title="ยอดขายวันนี้"
            value={`฿ ${formatMoney(todaySales)}`}
            detail={`${todayBillCount.toLocaleString()} บิลขาย`}
            icon={<FaChartBar />}
            color="green"
            href="/user/sales"
          />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-3">
          <div className="2xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  ยอดขาย 7 วันล่าสุด
                </h2>

                <p className="mt-4 text-3xl font-bold text-red-600">
                  ฿ {formatMoney(todaySales)}
                </p>

                <p className="mt-2 text-slate-500">
                  วันนี้ขายได้ {todayBillCount.toLocaleString()} บิล
                </p>
              </div>

              <Link
                href="/user/reports"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                ดูรายงาน
              </Link>
            </div>

            <div className="mt-8 flex h-64 items-end gap-3 border-b border-slate-200 pb-7">
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
                    <span className="whitespace-nowrap text-xs text-slate-400">
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
            <h2 className="text-2xl font-bold text-slate-900">
              เมนูด่วน
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <QuickButton
                text="ดูรายการสินค้า"
                href="/user/products"
              />

              <QuickButton
                text="ขายสินค้า"
                href="/user/sales"
              />

              <QuickButton
                text="ดูรายงานของฉัน"
                href="/user/reports"
              />
            </div>

            <div className="mt-6 rounded-2xl bg-red-50 p-5">
              <p className="font-bold text-red-600">
                แจ้งเตือนสินค้าใกล้หมด
              </p>

              <p className="mt-2 text-slate-600">
                มีสินค้าใกล้หมดหรือหมดแล้ว{" "}
                {stockWarningProducts.length.toLocaleString()} รายการ
              </p>

              <Link
                href="/user/products"
                className="mt-4 inline-flex items-center gap-2 font-medium text-red-600"
              >
                ดูรายการสินค้า
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-3">
          <div className="2xl:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  รายการขายล่าสุดของฉัน
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  แสดงบิลขายที่บันทึกโดย User
                </p>
              </div>

              <Link
                href="/user/reports"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                ดูรายงานทั้งหมด
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="px-5 py-4 text-left font-semibold">#</th>
                    <th className="px-5 py-4 text-left font-semibold">
                      วันที่ / เวลา
                    </th>
                    <th className="px-5 py-4 text-left font-semibold">
                      เลขที่บิล
                    </th>
                    <th className="px-5 py-4 text-left font-semibold">
                      ยอดรวมสุทธิ
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentSales.length > 0 ? (
                    recentSales.map((sale, index) => (
                      <tr
                        key={sale.id}
                        className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">{index + 1}</td>

                        <td className="px-5 py-4">
                          <p>{formatThaiDate(sale.sale_date)}</p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(sale.created_at)}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {sale.sale_number || "-"}
                        </td>

                        <td className="px-5 py-4 font-bold text-red-600">
                          ฿ {formatMoney(sale.total_amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-6 py-16 text-center text-slate-500"
                      >
                        {isLoading
                          ? "กำลังโหลดข้อมูล..."
                          : "ยังไม่มีรายการขายของคุณ"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              สินค้าใกล้หมด
            </h2>

            <p className="mt-1 text-slate-500">
              รายการที่ควรตรวจสอบ
            </p>

            <div className="mt-5 space-y-3">
              {stockWarningProducts.length > 0 ? (
                stockWarningProducts.map((product) => {
                  const stockInfo = getStockInfo(product.stock);

                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {product.name || "-"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          คงเหลือ {toNumber(product.stock)}{" "}
                          {product.unit || "ชิ้น"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${stockInfo.badge}`}
                      >
                        {stockInfo.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-700">
                  สต๊อกสินค้าทุกรายการอยู่ในระดับปกติ
                </div>
              )}
            </div>
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

function DashboardCard({ title, value, detail, icon, color, href }) {
  const styles = {
    blue: {
      icon: "bg-blue-100 text-blue-600",
      line: "bg-blue-500",
    },
    green: {
      icon: "bg-emerald-100 text-emerald-600",
      line: "bg-emerald-500",
    },
    orange: {
      icon: "bg-orange-100 text-orange-600",
      line: "bg-orange-500",
    },
    red: {
      icon: "bg-red-100 text-red-600",
      line: "bg-red-500",
    },
  };

  const style = styles[color] || styles.blue;

  return (
    <Link
      href={href}
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`absolute left-0 top-0 h-1 w-full ${style.line}`} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h2 className="mt-3 text-2xl font-bold text-slate-900">
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
    </Link>
  );
}

function QuickButton({ text, href }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-slate-200 p-5 font-semibold text-slate-800 transition hover:border-red-300 hover:bg-red-50"
    >
      <span>{text}</span>

      <FaArrowRight className="text-red-600" />
    </Link>
  );
}