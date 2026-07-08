"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import AccountHeader from "../../components/AccountHeader";
import BrandLogo from "../../components/BrandLogo";
import LogoutButton from "../../components/LogoutButton";
import { supabase } from "../../lib/supabase";

import {
  FaBarcode,
  FaBox,
  FaBoxOpen,
  FaChartBar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHistory,
  FaHome,
  FaPlus,
  FaSave,
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
  const [myMovements, setMyMovements] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [scanMessage, setScanMessage] = useState(
    "พร้อมยิงบาร์โค้ดสินค้า"
  );
  const [scanError, setScanError] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveProduct, setReceiveProduct] = useState(null);
  const [receiveQuantity, setReceiveQuantity] = useState("");
  const [receiveNote, setReceiveNote] = useState("");
  const [receiveError, setReceiveError] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [pageError, setPageError] = useState("");
  const [historyError, setHistoryError] = useState("");

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
    }));

    setProducts(mappedProducts);
    setIsLoading(false);
  }

  async function loadMyMovements() {
    setIsHistoryLoading(true);
    setHistoryError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setMyMovements([]);
      setHistoryError("ไม่พบข้อมูลผู้ใช้งาน");
      setIsHistoryLoading(false);
      return;
    }

    const { data, error } = await supabase
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
      .eq("performed_by_user_id", user.id)
      .eq("movement_type", "stock_in")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error(error);
      setMyMovements([]);
      setHistoryError(
        error.message || "ไม่สามารถโหลดประวัติการเพิ่มสต็อกได้"
      );
      setIsHistoryLoading(false);
      return;
    }

    setMyMovements(data || []);
    setIsHistoryLoading(false);
  }

  useEffect(() => {
    void loadProducts();
    void loadMyMovements();

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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock_movements",
        },
        () => {
          void loadMyMovements();
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
    setScanMessage("พร้อมยิงบาร์โค้ดสินค้า");

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

  function openReceiveModal(product) {
    setReceiveProduct(product);
    setReceiveQuantity("");
    setReceiveNote("");
    setReceiveError("");
    setShowDetail(false);
    setShowReceiveModal(true);
  }

  function closeReceiveModal() {
    if (isReceiving) {
      return;
    }

    setShowReceiveModal(false);
    setReceiveProduct(null);
    setReceiveQuantity("");
    setReceiveNote("");
    setReceiveError("");
  }

  async function handleReceiveStock(event) {
    event.preventDefault();

    const quantity = Number(receiveQuantity);

    if (!receiveProduct) {
      setReceiveError("กรุณาเลือกสินค้าที่ต้องการเพิ่มสต็อก");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setReceiveError("จำนวนเพิ่มสต็อกต้องเป็นจำนวนเต็มมากกว่า 0");
      return;
    }

    setIsReceiving(true);
    setReceiveError("");

    const { data, error } = await supabase.rpc("user_receive_stock", {
      p_product_id: Number(receiveProduct.id),
      p_quantity: quantity,
      p_note: receiveNote.trim() || null,
    });

    if (error) {
      console.error(error);
      setReceiveError(error.message || "เพิ่มสต็อกไม่สำเร็จ");
      setIsReceiving(false);
      return;
    }

    const result = data || {};

    await Promise.all([loadProducts(), loadMyMovements()]);

    closeReceiveModal();
    setIsReceiving(false);

    alert(
      `เพิ่มสต็อกสำเร็จ
สินค้า: ${result.product_name || receiveProduct.name}
คงเหลือเดิม: ${result.stock_before ?? receiveProduct.stock}
คงเหลือใหม่: ${result.stock_after ?? "-"}`
    );
  }

  function handleBarcodeKeyDown(event) {
    if (event.key !== "Enter" && event.key !== "Tab") {
      return;
    }

    event.preventDefault();

    const scannedValue = event.currentTarget.value.trim();

    if (!scannedValue) {
      setScanError(true);
      setScanMessage("กรุณายิงบาร์โค้ด หรือกรอกรหัสสินค้า");
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

    await Promise.all([loadProducts(), loadMyMovements()]);

    setIsRefreshing(false);
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <aside className="w-full md:w-[290px] min-h-screen md:min-h-screen shrink-0 bg-[#182232] text-white overflow-y-auto">
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
          />

          <Menu
            active
            icon={<FaBox />}
            text="สินค้า"
            href="/user/products"
          />

          <Menu
            icon={<FaShoppingCart />}
            text="เบิก/ตัดสต็อก"
            href="/user/sales"
          />

          <Menu
            icon={<FaChartBar />}
            text="รายงาน"
            href="/user/reports"
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
              ดูสินค้า ค้นหา ยิงบาร์โค้ด และเพิ่มจำนวนสต็อกสินค้าเดิม
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
                ค้นหา ตรวจสอบ และเพิ่มสต็อก
              </h2>

              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                พนักงานเพิ่มได้เฉพาะจำนวนสต็อกสินค้าเดิมเท่านั้น
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
              ช่องยิงบาร์โค้ดสินค้า
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
                placeholder="คลิกช่องนี้ แล้วใช้เครื่องยิงบาร์โค้ด"
                className="flex-1 rounded-xl border border-red-300 bg-white px-5 py-4 text-lg text-slate-800 outline-none focus:border-red-500"
              />

              <button
                type="button"
                onClick={focusBarcodeInput}
                className="rounded-xl border border-red-300 bg-white px-7 py-4 font-semibold text-red-600 hover:bg-red-100"
              >
                พร้อมยิง
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
              เสียบเครื่องสแกน USB แล้วกดพร้อมยิง จากนั้นยิงบาร์โค้ดได้ทันที
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

            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
              เพิ่มได้เฉพาะสต็อก
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
                    เพิ่มสต็อก
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
                      colSpan="8"
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
                            onClick={() => openReceiveModal(product)}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 font-medium text-emerald-700 hover:bg-emerald-100"
                          >
                            <FaPlus />
                            เพิ่มสต็อก
                          </button>
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
                      colSpan="8"
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

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <FaHistory />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  ประวัติการเพิ่มสต็อกของฉัน
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  แสดงชื่อ รหัสพนักงาน จำนวนที่เพิ่ม และวันเวลา
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadMyMovements()}
              disabled={isHistoryLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <FaSyncAlt
                className={isHistoryLoading ? "animate-spin" : ""}
              />
              รีเฟรชประวัติ
            </button>
          </div>

          {historyError && (
            <div className="m-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
              {historyError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-5 py-4 text-left font-semibold">
                    วันเวลา
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
                {isHistoryLoading && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      กำลังโหลดประวัติการเพิ่มสต็อก...
                    </td>
                  </tr>
                )}

                {!isHistoryLoading &&
                  myMovements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="border-t border-slate-100 text-slate-700"
                    >
                      <td className="px-5 py-4">
                        {formatDateTime(movement.created_at)}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {movement.performed_by_code || "-"}
                      </td>

                      <td className="px-5 py-4">
                        {movement.performed_by_name || "User"}
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
                        <span className="rounded-full bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-700">
                          +{toNumber(movement.quantity)}{" "}
                          {movement.unit || "ชิ้น"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {toNumber(movement.stock_before)} /{" "}
                        {toNumber(movement.stock_after)}
                      </td>

                      <td className="px-5 py-4">
                        {movement.note || "-"}
                      </td>
                    </tr>
                  ))}

                {!isHistoryLoading && myMovements.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      ยังไม่มีประวัติการเพิ่มสต็อกของคุณ
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
                  </div>

                  <div className="mt-6">
                    <StockBadge stock={selectedProduct.stock} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openReceiveModal(selectedProduct)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700"
                >
                  <FaPlus />
                  เพิ่มสต็อกสินค้า
                </button>
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

      {showReceiveModal && receiveProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
          <form
            onSubmit={handleReceiveStock}
            className="relative w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl md:p-8"
          >
            <button
              type="button"
              onClick={closeReceiveModal}
              disabled={isReceiving}
              className="absolute right-6 top-6 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <FaTimes className="text-xl" />
            </button>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <FaPlus className="text-2xl" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  เพิ่มจำนวนสต็อก
                </h2>

                <p className="mt-1 text-slate-500">
                  ระบบจะบันทึกชื่อ รหัสพนักงาน และวันเวลาอัตโนมัติ
                </p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-semibold text-slate-900">
                {receiveProduct.name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                รหัสสินค้า: {receiveProduct.code}
              </p>

              <p className="mt-3 text-sm text-slate-600">
                สต็อกปัจจุบัน:{" "}
                <span className="font-bold text-slate-900">
                  {receiveProduct.stock} {receiveProduct.unit}
                </span>
              </p>
            </div>

            {receiveError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                {receiveError}
              </div>
            )}

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                จำนวนที่เพิ่ม
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={receiveQuantity}
                onChange={(event) => setReceiveQuantity(event.target.value)}
                placeholder="เช่น 50"
                disabled={isReceiving}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-emerald-500 disabled:bg-slate-100"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                หมายเหตุ
              </label>

              <textarea
                value={receiveNote}
                onChange={(event) => setReceiveNote(event.target.value)}
                placeholder="เช่น รับสินค้าจากคลัง หรือรับสินค้าเข้าร้าน"
                rows="4"
                disabled={isReceiving}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-emerald-500 disabled:bg-slate-100"
              />
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeReceiveModal}
                disabled={isReceiving}
                className="rounded-xl border border-slate-200 px-5 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isReceiving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
              >
                <FaSave />
                {isReceiving ? "กำลังบันทึก..." : "บันทึกเพิ่มสต็อก"}
              </button>
            </div>
          </form>
        </div>
      )}
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