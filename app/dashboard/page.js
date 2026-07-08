"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../components/AccountHeader";
import BrandLogo from "../components/BrandLogo";
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
  const [saleItems, setSaleItems] = useState([]);
  const [productCosts, setProductCosts] = useState([]);

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
      { data: costData, error: costError },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, product_code, name, price, stock, unit, status")
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
        .limit(300),

      supabase
        .from("product_costs")
        .select("product_id, cost_price"),
    ]);

    if (productError || categoryError || salesError || costError) {
      console.error(productError || categoryError || salesError || costError);

      setErrorMessage(
        productError?.message ||
          categoryError?.message ||
          salesError?.message ||
          costError?.message ||
          "ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาตรวจสอบฐานข้อมูล Supabase"
      );
    }

    const salesList = salesData || [];
    const saleIds = salesList.map((sale) => sale.id);

    let saleItemData = [];

    if (saleIds.length > 0) {
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          sale_id,
          product_id,
          quantity,
          price,
          subtotal
        `)
        .in("sale_id", saleIds);

      if (error) {
        console.error(error);
        setErrorMessage(error.message || "ไม่สามารถโหลดข้อมูลรายการสินค้าได้");
        saleItemData = [];
      } else {
        saleItemData = data || [];
      }
    }

    setProducts(productData || []);
    setCategories(categoryData || []);
    setSales(salesList);
    setSaleItems(saleItemData);
    setProductCosts(costData || []);

    setIsLoading(false);
  }

  useEffect(() => {
    void loadDashboard();

    const channel = supabase
      .channel("admin-dashboard-live")
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
          table: "product_costs",
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
          table: "categories",
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sale_items",
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

  const today = getLocalDateString();
  const yesterday = getDaysAgoString(1);

  const costByProductId = useMemo(() => {
    return productCosts.reduce((result, item) => {
      result[String(item.product_id)] = toNumber(item.cost_price);
      return result;
    }, {});
  }, [productCosts]);

  const saleById = useMemo(() => {
    return sales.reduce((result, sale) => {
      result[String(sale.id)] = sale;
      return result;
    }, {});
  }, [sales]);

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

  const todayCost = useMemo(() => {
    return saleItems.reduce((sum, item) => {
      const sale = saleById[String(item.sale_id)];

      if (!sale || sale.sale_date !== today) {
        return sum;
      }

      const costPrice = costByProductId[String(item.product_id)] || 0;

      return sum + costPrice * toNumber(item.quantity);
    }, 0);
  }, [saleItems, saleById, today, costByProductId]);

  const todayProfit = useMemo(() => {
    return todaySales - todayCost;
  }, [todaySales, todayCost]);

  const todayProfitPercent = useMemo(() => {
    if (todaySales <= 0) {
      return 0;
    }

    return (todayProfit / todaySales) * 100;
  }, [todaySales, todayProfit]);

  const inventorySaleValue = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total + toNumber(product.price) * toNumber(product.stock),
      0
    );
  }, [products]);

  const inventoryCostValue = useMemo(() => {
    return products.reduce((total, product) => {
      const costPrice = costByProductId[String(product.id)] || 0;

      return total + costPrice * toNumber(product.stock);
    }, 0);
  }, [products, costByProductId]);

  const inventoryProfitValue = useMemo(() => {
    return inventorySaleValue - inventoryCostValue;
  }, [inventorySaleValue, inventoryCostValue]);

  const comparisonText = useMemo(() => {
    if (yesterdaySales === 0 && todaySales === 0) {
      return "ยังไม่มีข้อมูลรายการวันนี้";
    }

    if (yesterdaySales === 0) {
      return "เริ่มมีรายการตัดสต็อกวันนี้";
    }

    const difference = todaySales - yesterdaySales;

    if (difference === 0) {
      return "มูลค่ารวมเท่ากับเมื่อวาน";
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

  function getSaleCost(saleId) {
    return saleItems
      .filter((item) => String(item.sale_id) === String(saleId))
      .reduce((sum, item) => {
        const costPrice = costByProductId[String(item.product_id)] || 0;
        return sum + costPrice * toNumber(item.quantity);
      }, 0);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadDashboard();
    setIsRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-[290px] shrink-0 md:min-h-screen bg-[#182232] text-white print:hidden overflow-y-auto">
        <div className="bg-red-600 px-4 md:px-7 py-6 md:py-8 rounded-b-2xl md:rounded-br-[42px] shadow-lg">
          <div className="flex items-center gap-3">
            <BrandLogo />

            <div>
              <h2 className="text-base md:text-lg font-bold">
                ระบบบริหารจัดการ
              </h2>

              <p className="text-xs text-white/80">
                ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-2 p-4 md:p-5 flex md:flex-col gap-2 md:gap-0 flex-wrap md:flex-nowrap">
          <p className="hidden md:block px-4 pb-1 pt-2 text-xs text-slate-400 w-full">
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
            text="เบิก/ตัดสต็อก"
            href="/sales"
          />

          <Menu
            icon={<FaHistory />}
            text="ประวัติสต็อก"
            href="/stock-movements"
          />

          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />

          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />

          <div className="pt-5 hidden md:block w-full">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 overflow-x-hidden">
        <header className="flex flex-col gap-3 sm:gap-5 md:gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                Dashboard
              </h1>

              {stockAlertProducts.length > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-red-600 flex-shrink-0">
                  <FaBell />
                  <span className="hidden sm:inline">แจ้งเตือน</span> {stockAlertProducts.length}
                </span>
              )}
            </div>

            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-500">
              ภาพรวมสินค้า ต้นทุน กำไร และการแจ้งเตือนสต็อก
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 rounded-lg sm:rounded-xl border border-slate-200 bg-white px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}</span>
              <span className="sm:hidden">{isRefreshing ? "..." : "รีเฟรช"}</span>
            </button>

            <div className="flex-1 sm:flex-none">
              <AccountHeader />
            </div>
          </div>
        </header>

        <div className="mt-4 sm:mt-6 flex justify-end">
          <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-slate-200 bg-white px-3 sm:px-5 py-2 sm:py-3 text-xs sm:text-base text-slate-700 shadow-sm">
            <FaCalendarAlt className="text-sm" />
            <span className="text-xs sm:text-base">{formatThaiDate(today)}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 sm:mt-6 rounded-lg sm:rounded-2xl border border-red-200 bg-red-50 px-3 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-red-600">
            {errorMessage}
          </div>
        )}

        {outOfStockProducts.length > 0 && (
          <Link
            href="/products"
            className="mt-4 sm:mt-6 block rounded-xl sm:rounded-3xl border border-red-200 bg-red-50 p-4 sm:p-6 transition hover:bg-red-100"
          >
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-3 sm:gap-4 min-w-0">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-red-600 text-lg sm:text-xl text-white">
                  <FaExclamationTriangle />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-red-700">
                    สินค้าหมด {outOfStockProducts.length} รายการ
                  </h2>

                  <p className="mt-1 text-xs sm:text-sm text-red-600">
                    สินค้าเหลือ 0 ชิ้น กรุณารับสินค้าเข้าเพื่อให้สามารถตัดสต็อกได้
                  </p>

                  <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-2">
                    {outOfStockProducts.slice(0, 3).map((product) => (
                      <span
                        key={product.id}
                        className="rounded-full bg-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium text-red-700"
                      >
                        {product.name}
                      </span>
                    ))}

                    {outOfStockProducts.length > 3 && (
                      <span className="rounded-full bg-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium text-red-700">
                        +{outOfStockProducts.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className="flex items-center gap-2 font-medium text-red-700 text-sm sm:text-base flex-shrink-0">
                ไปหน้าสินค้า
                <FaArrowRight />
              </span>
            </div>
          </Link>
        )}

        {lowStockProducts.length > 0 && (
          <Link
            href="/products"
            className="mt-2 sm:mt-4 block rounded-xl sm:rounded-3xl border border-orange-200 bg-orange-50 p-4 sm:p-6 transition hover:bg-orange-100"
          >
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-3 sm:gap-4 min-w-0">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-orange-500 text-lg sm:text-xl text-white">
                  <FaExclamationTriangle />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-orange-700">
                    สินค้าใกล้หมด {lowStockProducts.length} รายการ
                  </h2>

                  <p className="mt-1 text-xs sm:text-sm text-orange-600">
                    สินค้าเหลือ 1–9 ชิ้น ควรวางแผนรับสินค้าเข้าเพิ่ม
                  </p>

                  <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-2">
                    {lowStockProducts.slice(0, 3).map((product) => (
                      <span
                        key={product.id}
                        className="rounded-full bg-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium text-orange-700"
                      >
                        {product.name} ({toNumber(product.stock)}{" "}
                        {product.unit || "ชิ้น"})
                      </span>
                    ))}

                    {lowStockProducts.length > 3 && (
                      <span className="rounded-full bg-white px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium text-orange-700">
                        +{lowStockProducts.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className="flex items-center gap-2 font-medium text-orange-700 text-sm sm:text-base flex-shrink-0">
                ตรวจสอบสินค้า
                <FaArrowRight />
              </span>
            </div>
          </Link>
        )}

        <section className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
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
            title="สินค้าใกล้หมด"
            value={lowStockProducts.length.toLocaleString()}
            unit="รายการ"
            color="orange"
            icon={<FaBoxOpen />}
            href="/products"
            footer="เหลือ 1–9 ชิ้น"
          />

          <Card
            title="มูลค่าตัดสต็อกวันนี้"
            value={`฿ ${formatMoney(todaySales)}`}
            unit=""
            color="green"
            icon={<FaShoppingCart />}
            href="/sales"
            footer={`${todayBillCount} รายการวันนี้`}
          />

          <Card
            title="ต้นทุนวันนี้"
            value={`฿ ${formatMoney(todayCost)}`}
            unit=""
            color="purple"
            icon={<FaBriefcase />}
            href="/reports"
            footer="ต้นทุนสินค้าที่ถูกตัดวันนี้"
          />

          <Card
            title="กำไรขั้นต้นวันนี้"
            value={`฿ ${formatMoney(todayProfit)}`}
            unit=""
            color={todayProfit >= 0 ? "green" : "red"}
            icon={<FaChartBar />}
            href="/reports"
            footer={`กำไร ${todayProfitPercent.toFixed(1)}%`}
          />

          <Card
            title="ต้นทุนสินค้าคงเหลือ"
            value={`฿ ${formatMoney(inventoryCostValue)}`}
            unit=""
            color="purple"
            icon={<FaBox />}
            href="/products"
            footer="ต้นทุนรวมของสต็อก"
          />

          <Card
            title="กำไรคงเหลือในสต็อก"
            value={`฿ ${formatMoney(inventoryProfitValue)}`}
            unit=""
            color={inventoryProfitValue >= 0 ? "blue" : "red"}
            icon={<FaChartBar />}
            href="/products"
            footer="ราคาขายรวม - ต้นทุนรวม"
          />
        </section>

        <section className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 rounded-xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  มูลค่าตัดสต็อก 7 วันล่าสุด
                </h2>

                <p className="mt-2 sm:mt-4 text-2xl sm:text-3xl font-bold text-red-600">
                  ฿ {formatMoney(todaySales)}
                </p>

                <p className="mt-1 sm:mt-2 text-xs sm:text-base text-slate-500">
                  {comparisonText}
                </p>

                <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <MiniSummary
                    label="ต้นทุนวันนี้"
                    value={`฿ ${formatMoney(todayCost)}`}
                  />

                  <MiniSummary
                    label="กำไรวันนี้"
                    value={`฿ ${formatMoney(todayProfit)}`}
                    highlight={todayProfit >= 0 ? "green" : "red"}
                  />

                  <MiniSummary
                    label="กำไรขั้นต้น"
                    value={`${todayProfitPercent.toFixed(1)}%`}
                    highlight={todayProfit >= 0 ? "green" : "red"}
                  />
                </div>
              </div>

              <Link
                href="/reports"
                className="rounded-lg sm:rounded-xl border border-red-200 px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 flex-shrink-0 text-center"
              >
                ดูรายงานตัดสต็อก
              </Link>
            </div>

            <div className="mt-6 sm:mt-8 flex h-40 sm:h-64 items-end gap-1 sm:gap-3 border-b px-1 sm:px-2 pb-4 sm:pb-6 overflow-x-auto">
              {dailySales.map((item) => {
                const height = Math.max(
                  8,
                  (item.amount / maxDailySales) * 100
                );

                return (
                  <div
                    key={item.date}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1 sm:gap-2 min-w-[30px]"
                  >
                    <span className="text-xs text-slate-400 line-clamp-1">
                      {item.amount > 0
                        ? `฿${toNumber(item.amount).toLocaleString("th-TH")}`
                        : "-"}
                    </span>

                    <div
                      className="w-full rounded-t-lg bg-red-500"
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

          <div className="rounded-xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-3 sm:mb-5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  แจ้งเตือนสต๊อก
                </h2>

                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  สินค้าที่ต้องตรวจสอบ
                </p>
              </div>

              <Link href="/products" className="text-xs sm:text-sm text-red-600 flex-shrink-0">
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
                    className="flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-100 py-3 sm:py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm sm:text-base text-slate-800">
                        {item.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {item.product_code || "-"} · {getStockStatusText(item.stock)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold ${
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
              <div className="flex h-40 sm:h-56 flex-col items-center justify-center text-center text-slate-500">
                <FaBoxOpen className="mb-2 sm:mb-3 text-3xl sm:text-4xl text-emerald-500" />

                <p className="font-medium text-sm sm:text-base text-slate-700">
                  สต๊อกสินค้าปกติ
                </p>

                <p className="mt-1 text-xs sm:text-sm">
                  ไม่มีสินค้าที่หมดหรือใกล้หมด
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 sm:mt-8 rounded-xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm overflow-x-auto">
          <div className="mb-4 sm:mb-5 flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between min-w-max md:min-w-0">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
                รายการตัดสต็อกล่าสุด
              </h2>

              <p className="mt-1 text-xs sm:text-base text-slate-500">
                แสดงมูลค่ารวม ต้นทุน และกำไรขั้นต้นของแต่ละรายการ
              </p>
            </div>

            <Link
              href="/reports"
              className="rounded-lg sm:rounded-xl border border-slate-200 px-3 sm:px-5 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 flex-shrink-0"
            >
              ดูรายงานทั้งหมด
            </Link>
          </div>

          <div className="table-responsive">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 sm:p-4 text-left">#</th>
                  <th className="p-2 sm:p-4 text-left hidden sm:table-cell">วันที่ / เวลา</th>
                  <th className="p-2 sm:p-4 text-left">เลขที่รายการ</th>
                  <th className="p-2 sm:p-4 text-left hidden md:table-cell">ผู้ดำเนินการ</th>
                  <th className="p-2 sm:p-4 text-right">มูลค่ารวม</th>
                  <th className="p-2 sm:p-4 text-right hidden sm:table-cell">ต้นทุน</th>
                  <th className="p-2 sm:p-4 text-right">กำไร</th>
                </tr>
              </thead>

              <tbody>
                {recentSales.length > 0 ? (
                  recentSales.map((sale, index) => {
                    const saleCost = getSaleCost(sale.id);
                    const saleProfit = toNumber(sale.total_amount) - saleCost;

                    return (
                      <tr
                        key={sale.id}
                        className="border-b border-slate-100 text-slate-800"
                      >
                        <td className="p-2 sm:p-4">{index + 1}</td>

                        <td className="p-2 sm:p-4 hidden sm:table-cell">
                          <div className="text-xs sm:text-sm">{formatThaiDate(sale.sale_date)}</div>

                          <div className="mt-1 text-xs text-slate-400">
                            {formatDateTime(sale.created_at)}
                          </div>
                        </td>

                        <td className="p-2 sm:p-4 font-semibold">
                          {sale.sale_number}
                        </td>

                        <td className="p-2 sm:p-4 hidden md:table-cell text-xs sm:text-sm">
                          {sale.seller_name || "Admin"}
                        </td>

                        <td className="p-2 sm:p-4 text-right font-bold text-red-600 text-xs sm:text-sm">
                          ฿ {formatMoney(sale.total_amount)}
                        </td>

                        <td className="p-2 sm:p-4 text-right font-bold text-violet-600 hidden sm:table-cell text-xs sm:text-sm">
                          ฿ {formatMoney(saleCost)}
                        </td>

                        <td
                          className={`p-2 sm:p-4 text-right font-bold text-xs sm:text-sm ${
                            saleProfit >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          ฿ {formatMoney(saleProfit)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-4 sm:p-10 text-center text-xs sm:text-base text-slate-500"
                    >
                      {isLoading
                        ? "กำลังโหลดข้อมูล..."
                        : "ยังไม่มีรายการตัดสต็อกในระบบ"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Link
            href="/products"
            className="flex flex-col sm:flex-row items-center sm:items-stretch justify-between rounded-xl sm:rounded-3xl border border-red-100 bg-red-50 p-4 sm:p-8 transition hover:bg-red-100 gap-4 sm:gap-5"
          >
            <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
              <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-red-600 text-2xl sm:text-3xl text-white flex-shrink-0">
                <FaBriefcase />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
                  ไปหน้าสินค้า
                </h2>

                <p className="text-xs sm:text-base text-slate-500 line-clamp-2">
                  จัดการสินค้า ราคาต้นทุน ราคาขาย และกำไรต่อหน่วย
                </p>
              </div>
            </div>

            <FaArrowRight className="text-xl sm:text-2xl text-red-600 flex-shrink-0" />
          </Link>

          <Link
            href="/reports"
            className="flex flex-col sm:flex-row items-center sm:items-stretch justify-between rounded-xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 transition hover:bg-slate-50 gap-4 sm:gap-5"
          >
            <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
              <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-slate-800 text-2xl sm:text-3xl text-white flex-shrink-0">
                <FaFileAlt />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
                  ไปหน้ารายงาน
                </h2>

                <p className="text-xs sm:text-base text-slate-500 line-clamp-2">
                  ดูรายงานตัดสต็อกและสรุปข้อมูล
                </p>
              </div>
            </div>

            <FaArrowRight className="text-xl sm:text-2xl text-slate-700 flex-shrink-0" />
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

function MiniSummary({ label, value, highlight }) {
  const color =
    highlight === "green"
      ? "text-emerald-600"
      : highlight === "red"
      ? "text-red-600"
      : "text-slate-900";

  return (
    <div className="rounded-lg sm:rounded-2xl border border-slate-200 bg-slate-50 px-2 sm:px-4 py-2 sm:py-3">
      <p className="text-xs sm:text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-base sm:text-xl font-bold ${color}`}>{value}</p>
    </div>
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
    purple: {
      icon: "bg-violet-100 text-violet-600",
      number: "text-violet-600",
      footer: "bg-violet-50 text-violet-600",
    },
  };

  const style = styles[color] || styles.blue;

  return (
    <Link
      href={href}
      className="overflow-hidden rounded-lg sm:rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs sm:text-base font-medium text-slate-600">{title}</p>

            <div className="mt-2 sm:mt-3 flex items-end gap-1 sm:gap-2">
              <h2 className={`text-xl sm:text-3xl font-bold ${style.number} truncate`}>
                {value}
              </h2>

              <span className="text-xs sm:text-base text-slate-500">{unit}</span>
            </div>
          </div>

          <div
            className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-2xl text-lg sm:text-xl flex-shrink-0 ${style.icon}`}
          >
            {icon}
          </div>
        </div>
      </div>

      <div
        className={`flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm ${style.footer}`}
      >
        <span className="truncate">{footer}</span>
        <FaArrowRight className="ml-2 flex-shrink-0" />
      </div>
    </Link>
  );
}