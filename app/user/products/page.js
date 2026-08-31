"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import AccountHeader from "../../components/AccountHeader";
import BrandLogo from "../../components/BrandLogo";
import LogoutButton from "../../components/LogoutButton";
import { supabase } from "../../lib/supabase";

import {
  FaBars,
  FaArrowUp,
  FaBarcode,
  FaBox,
  FaBoxOpen,
  FaChartBar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHome,
  FaSearch,
  FaShoppingCart,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getCategoryName(category) {
  if (Array.isArray(category)) {
    return category[0]?.name || "-";
  }

  return category?.name || "-";
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

function formatMoney(value) {
  return toNumber(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getScanCandidates(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return [];
  }

  const candidates = [rawValue];

  try {
    const url = new URL(rawValue);

    ["barcode", "code", "product_code", "sku", "id"].forEach((key) => {
      const valueFromUrl = url.searchParams.get(key);

      if (valueFromUrl) {
        candidates.push(valueFromUrl);
      }
    });

    const pathParts = url.pathname.split("/").filter(Boolean);

    if (pathParts.length > 0) {
      candidates.push(decodeURIComponent(pathParts[pathParts.length - 1]));
    }
  } catch {}

  try {
    const json = JSON.parse(rawValue);

    if (json && typeof json === "object") {
      ["barcode", "code", "product_code", "sku", "id"].forEach((key) => {
        if (json[key] !== undefined && json[key] !== null) {
          candidates.push(String(json[key]));
        }
      });
    }
  } catch {}

  return [...new Set(candidates.map(normalizeValue).filter(Boolean))];
}

export default function UserProductsPage() {
  const barcodeInputRef = useRef(null);

  const [products, setProducts] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [scanMessage, setScanMessage] = useState(
    "พร้อมสแกนบาร์โค้ดสินค้า"
  );
  const [scanError, setScanError] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [pageError, setPageError] = useState("");

  async function loadProducts() {
    setIsLoading(true);
    setPageError("");

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        product_code,
        barcode,
        name,
        price,
        stock,
        unit,
        status,
        category:categories(name)
      `)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      setProducts([]);
      setPageError(error.message || "ไม่สามารถโหลดข้อมูลสินค้าได้");
      setIsLoading(false);
      return;
    }

    const mappedProducts = (data || []).map((product) => ({
      id: product.id,
      code: product.product_code || "-",
      barcode: product.barcode || "",
      name: product.name || "-",
      category: getCategoryName(product.category),
      price: toNumber(product.price),
      stock: toNumber(product.stock),
      unit: product.unit || "ชิ้น",
      status: product.status || getStockInfo(product.stock).label,
    }));

    setProducts(mappedProducts);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadProducts();

    const channel = supabase
      .channel("user-products-and-stock-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          void loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const search = normalizeValue(keyword);

    if (!search) {
      return products;
    }

    return products.filter((product) =>
      [
        product.code,
        product.barcode,
        product.name,
        product.category,
        getStockInfo(product.stock).label,
      ].some((value) => normalizeValue(value).includes(search))
    );
  }, [products, keyword]);

  const summary = useMemo(() => {
    return {
      total: products.length,
      normal: products.filter((product) => product.stock >= 10).length,
      low: products.filter(
        (product) => product.stock > 0 && product.stock < 10
      ).length,
      out: products.filter((product) => product.stock <= 0).length,
    };
  }, [products]);

  function findProduct(value) {
    const search = normalizeValue(value);

    if (!search) {
      return null;
    }

    const exactMatch = products.find(
      (product) =>
        normalizeValue(product.barcode) === search ||
        normalizeValue(product.code) === search ||
        normalizeValue(product.id) === search
    );

    if (exactMatch) {
      return exactMatch;
    }

    return (
      products.find((product) =>
        normalizeValue(product.name).includes(search)
      ) || null
    );
  }

  function findProductByScan(value) {
    const candidates = getScanCandidates(value);

    return (
      products.find((product) => {
        const productValues = [
          product.barcode,
          product.code,
          product.id,
        ]
          .map(normalizeValue)
          .filter(Boolean);

        return productValues.some((productValue) =>
          candidates.includes(productValue)
        );
      }) || null
    );
  }

  function focusBarcodeInput() {
    setBarcodeValue("");
    setScanError(false);
    setScanMessage("พร้อมสแกนบาร์โค้ดสินค้า");

    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    }, 100);
  }

  function openDetail(product) {
    setSelectedProduct(product);
    setShowDetail(true);
  }

  function closeDetail() {
    setShowDetail(false);
    setSelectedProduct(null);
  }

  function handleBarcodeKeyDown(event) {
    if (event.key !== "Enter" && event.key !== "Tab") {
      return;
    }

    event.preventDefault();

    const scannedValue = event.currentTarget.value.trim();

    if (!scannedValue) {
      setScanError(true);
      setScanMessage("กรุณาสแกนบาร์โค้ด หรือกรอกรหัสสินค้า");
      return;
    }

    const product = findProductByScan(scannedValue);

    if (!product) {
      setScanError(true);
      setScanMessage(`ไม่พบสินค้า: ${scannedValue}`);
      setBarcodeValue("");

      window.setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);

      return;
    }

    setScanError(false);
    setScanMessage(
      `พบสินค้า: ${product.name} · คงเหลือ ${product.stock} ${product.unit}`
    );
    setBarcodeValue("");
    openDetail(product);
  }

  function handleSearch(event) {
    event.preventDefault();

    const searchValue = keyword.trim();

    if (!searchValue) {
      return;
    }

    setSelectedProduct(findProduct(searchValue));
    setShowDetail(true);
  }

  async function handleRefresh() {
    setIsRefreshing(true);

    await loadProducts();

    setIsRefreshing(false);
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      {/* Hamburger Button - Mobile Only */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-slate-200 shadow-lg text-slate-900"
      >
        {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
      </button>

      {/* Overlay - Mobile Only */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:relative
        w-full md:w-[290px]
        h-screen md:h-auto
        left-0 top-0
        z-40
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        min-h-screen md:min-h-screen shrink-0 bg-[#182232] text-white overflow-y-auto
      `}>
        <div className="rounded-b-2xl md:rounded-br-[42px] bg-red-600 px-4 md:px-7 py-6 md:py-8 shadow-lg">
          <div className="flex items-center gap-3">
            <BrandLogo />

            <div>
              <h2 className="text-base md:text-lg font-bold">ระบบบริหารจัดการ</h2>

              <p className="text-xs text-white/80">
                ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-2 p-4 md:p-5 flex md:flex-col gap-2 md:gap-0 flex-wrap md:flex-nowrap">
          <p className="hidden md:block px-4 pb-1 pt-2 text-xs text-slate-400 w-full">
            เมนูพนักงาน
          </p>

          <Menu
            icon={<FaHome />}
            text="หน้าหลัก"
            href="/user/dashboard"
            onNavigate={() => setSidebarOpen(false)}
          />

          <Menu
            active
            icon={<FaBox />}
            text="สินค้า"
            href="/user/products"
            onNavigate={() => setSidebarOpen(false)}
          />

          <Menu
            icon={<FaBarcode />}
            text="สแกนบาร์โค้ด"
            href="/user/barcode"
            onNavigate={() => setSidebarOpen(false)}
          />

          <Menu icon={<FaArrowUp />} text="รับสินค้าเข้า" href="/user/stock-in" onNavigate={() => setSidebarOpen(false)} />

          <Menu
            icon={<FaShoppingCart />}
            text="ขายสินค้า"
            href="/user/sales"
            onNavigate={() => setSidebarOpen(false)}
          />

          <Menu
            icon={<FaChartBar />}
            text="รายงาน"
            href="/user/reports"
            onNavigate={() => setSidebarOpen(false)}
          />

          <div className="hidden md:block pt-5 w-full">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 overflow-x-hidden">
        <header className="flex flex-col gap-3 sm:gap-5 md:gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                สินค้า
              </h1>

              <span className="rounded-full bg-blue-50 px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-blue-600">
                พนักงาน
              </span>
            </div>

              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-500">
              ดูรายการสินค้า ค้นหา และตรวจสอบรายละเอียดจากข้อมูลล่าสุด
            </p>
          </div>

          <AccountHeader />
        </header>

        {pageError && (
          <section className="mt-4 sm:mt-6 flex gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-red-200 bg-red-50 p-3 sm:p-5 text-xs sm:text-base text-red-700">
            <FaExclamationTriangle className="mt-0.5 sm:mt-1 shrink-0 text-sm sm:text-base" />
            <p>{pageError}</p>
          </section>
        )}

        <section className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          <SummaryCard
            title="สินค้าทั้งหมด"
            value={`${summary.total} รายการ`}
            detail="สินค้าในระบบ"
            icon={<FaBox />}
            color="blue"
          />

          <SummaryCard
            title="สินค้าปกติ"
            value={`${summary.normal} รายการ`}
            detail="เหลือตั้งแต่ 10 ชิ้น"
            icon={<FaCheckCircle />}
            color="green"
          />

          <SummaryCard
            title="สินค้าใกล้หมด"
            value={`${summary.low} รายการ`}
            detail="เหลือ 1–9 ชิ้น"
            icon={<FaExclamationTriangle />}
            color="orange"
          />

          <SummaryCard
            title="สินค้าหมด"
            value={`${summary.out} รายการ`}
            detail="สามารถเพิ่มจำนวนสต็อกได้"
            icon={<FaBoxOpen />}
            color="red"
          />
        </section>

        <section className="mt-6 sm:mt-8 rounded-xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-4 md:p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
                ค้นหาและตรวจสอบสินค้า
              </h2>

              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                ข้อมูลทั้งหมดอ่านจากฐานข้อมูลสินค้าโดยตรง
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="flex items-center gap-2 rounded-lg sm:rounded-xl bg-red-600 px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base text-white hover:bg-red-700 disabled:bg-red-300 shrink-0"
            >
              <FaSyncAlt
                className={`text-sm sm:text-base ${isLoading || isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
            </button>
          </div>

          <div className="mt-4 sm:mt-7 rounded-lg sm:rounded-2xl border-2 border-dashed border-red-200 bg-red-50 p-3 sm:p-5">
            <label className="mb-3 flex items-center gap-2 font-bold text-slate-800">
              <FaBarcode className="text-red-600" />
              ช่องสแกนบาร์โค้ดสินค้า
            </label>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                ref={barcodeInputRef}
                value={barcodeValue}
                onChange={(event) => setBarcodeValue(event.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                placeholder="เชื่อมต่อเครื่องสแกน แล้วสแกนบาร์โค้ดสินค้า"
                className="flex-1 rounded-xl border border-red-300 bg-white px-5 py-4 text-lg text-slate-800 outline-none focus:border-red-500"
              />

              <button
                type="button"
                onClick={focusBarcodeInput}
                className="rounded-xl border border-red-300 bg-white px-7 py-4 font-semibold text-red-600 hover:bg-red-100"
              >
                พร้อมสแกน
              </button>
            </div>

            <div
              className={`mt-3 rounded-xl px-4 py-3 text-sm ${
                scanError
                  ? "bg-red-100 text-red-700"
                  : "bg-white text-slate-600"
              }`}
            >
              {scanMessage}
            </div>

            <p className="mt-3 text-sm text-slate-500">
              รองรับเครื่องสแกนบาร์โค้ดแบบ USB หรือ Bluetooth และรับข้อมูลด้วยปุ่ม Enter หรือ Tab หลังการสแกน
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="mt-6 flex flex-col gap-4 md:flex-row"
          >
            <div className="relative flex-1">
              <FaSearch className="absolute left-5 top-5 text-slate-400" />

              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="ค้นหาด้วยชื่อสินค้า รหัสสินค้า หรือบาร์โค้ด"
                className="w-full rounded-xl border-2 border-slate-200 bg-white py-4 pl-12 pr-5 text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-7 py-4 text-white hover:bg-slate-900"
            >
              <FaSearch />
              ค้นหาสินค้า
            </button>
          </form>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                รายการสินค้า
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                แสดง {filteredProducts.length} จาก {summary.total} รายการ
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              ดูข้อมูลเท่านั้น
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-5 py-4 text-left font-semibold">
                    รหัสสินค้า
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    ชื่อสินค้า
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    หมวดหมู่
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    ราคาต่อหน่วย
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    สต็อก
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    บาร์โค้ด
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    รายละเอียด
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      กำลังโหลดข้อมูลสินค้า...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredProducts.map((product) => {
                    const stockInfo = getStockInfo(product.stock);

                    return (
                      <tr
                        key={product.id}
                        className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-semibold text-slate-600">
                            {product.code}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {product.name}
                        </td>

                        <td className="px-5 py-4">
                          {product.category}
                        </td>

                        <td className="px-5 py-4 text-right font-medium">
                          ฿ {formatMoney(product.price)}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-bold ${stockInfo.text}`}>
                              {product.stock} {product.unit}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stockInfo.badge}`}
                            >
                              {stockInfo.label}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-500">
                          {product.barcode || "-"}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => openDetail(product)}
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-red-600 hover:bg-red-100"
                          >
                            ดูสินค้า
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                {!isLoading && filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      ไม่พบสินค้าที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl md:p-8">
            <button
              type="button"
              onClick={closeDetail}
              className="absolute right-6 top-6 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <FaTimes className="text-xl" />
            </button>

            {selectedProduct ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                    <FaBoxOpen className="text-2xl" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      ข้อมูลสินค้า
                    </h2>

                    <p className="mt-1 text-slate-500">
                      {selectedProduct.code}
                    </p>
                  </div>
                </div>

                <div className="mt-7 rounded-2xl border border-slate-200 p-5">
                  <p className="text-xl font-bold text-slate-900">
                    {selectedProduct.name}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-5">
                    <Info
                      label="หมวดหมู่"
                      value={selectedProduct.category}
                    />

                    <Info
                      label="ราคาต่อหน่วย"
                      value={`฿ ${formatMoney(selectedProduct.price)}`}
                    />

                    <Info
                      label="จำนวนคงเหลือ"
                      value={`${selectedProduct.stock} ${selectedProduct.unit}`}
                    />

                    <Info
                      label="บาร์โค้ด"
                      value={selectedProduct.barcode || "-"}
                    />

                    <Info
                      label="สถานะ"
                      value={selectedProduct.status}
                    />
                  </div>

                  <div className="mt-6">
                    <StockBadge stock={selectedProduct.stock} />
                  </div>
                </div>

              </>
            ) : (
              <div className="py-8 text-center">
                <FaExclamationTriangle className="mx-auto text-5xl text-orange-500" />

                <h2 className="mt-5 text-2xl font-bold text-slate-900">
                  ไม่พบสินค้า
                </h2>
              </div>
            )}

            <button
              type="button"
              onClick={closeDetail}
              className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-900"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function Menu({ icon, text, href, active, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
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

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StockBadge({ stock }) {
  const stockInfo = getStockInfo(stock);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${stockInfo.badge}`}
    >
      <FaCheckCircle />
      {stockInfo.label}
    </span>
  );
}

function SummaryCard({ title, value, detail, icon, color }) {
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