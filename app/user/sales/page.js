"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../../components/AccountHeader";
import BarcodeScanBox from "../../components/BarcodeScanBox";
import LogoutButton from "../../components/LogoutButton";
import { supabase } from "../../lib/supabase";

import {
  FaBarcode,
  FaBox,
  FaChartBar,
  FaHome,
  FaMinus,
  FaPlus,
  FaPrint,
  FaSave,
  FaSearch,
  FaShoppingCart,
  FaSyncAlt,
  FaTrash,
} from "react-icons/fa";

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function createSaleNumber() {
  const now = new Date();

  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  const random = Math.floor(100 + Math.random() * 900);

  return `INV-${date}-${time}-${random}`;
}

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCategoryName(category) {
  if (Array.isArray(category)) {
    return category[0]?.name || "-";
  }

  return category?.name || "-";
}

export default function UserSalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  const [productSearch, setProductSearch] = useState("");
  const [saleDate, setSaleDate] = useState(getToday());
  const [saleNumber, setSaleNumber] = useState(createSaleNumber());
  const [note, setNote] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState("0");

  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastReceipt, setLastReceipt] = useState(null);

  async function loadProducts() {
    setIsLoadingProducts(true);
    setErrorMessage("");

    try {
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
        throw error;
      }

      const mappedProducts = (data || []).map((product) => ({
        id: String(product.id),
        code: product.product_code || "-",
        barcode: product.barcode || "",
        name: product.name || "-",
        category: getCategoryName(product.category),
        price: toNumber(product.price),
        stock: toNumber(product.stock),
        unit: product.unit || "ชิ้น",
        status: product.status || "มีสินค้า",
      }));

      setProducts(mappedProducts);
    } catch (error) {
      console.error(error);
      setProducts([]);
      setErrorMessage(error.message || "ไม่สามารถโหลดข้อมูลสินค้าได้");
    } finally {
      setIsLoadingProducts(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const productResults = useMemo(() => {
    const search = normalizeValue(productSearch);

    return products
      .filter((product) => {
        if (!search) return true;

        return [
          product.code,
          product.barcode,
          product.name,
          product.category,
        ].some((value) => normalizeValue(value).includes(search));
      })
      .slice(0, 8);
  }, [products, productSearch]);

  const itemAmount = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + toNumber(item.quantity) * toNumber(item.price),
      0
    );
  }, [cart]);

  const itemDiscount = useMemo(() => {
    return cart.reduce((sum, item) => sum + toNumber(item.discount), 0);
  }, [cart]);

  const totalQuantity = useMemo(() => {
    return cart.reduce((sum, item) => sum + toNumber(item.quantity), 0);
  }, [cart]);

  const subtotal = Math.max(0, itemAmount - itemDiscount);

  const globalDiscountAmount = Math.min(
    Math.max(0, toNumber(globalDiscount)),
    subtotal
  );

  const grandTotal = Math.max(0, subtotal - globalDiscountAmount);

  function addProduct(product) {
    if (!product || toNumber(product.stock) <= 0) {
      alert(`สินค้า "${product?.name || "-"}" หมดสต๊อก`);
      return false;
    }

    setCart((previous) => {
      const exists = previous.find((item) => item.productId === product.id);

      if (exists) {
        return previous.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: Math.min(
                  toNumber(item.quantity) + 1,
                  toNumber(item.stock)
                ),
              }
            : item
        );
      }

      return [
        ...previous,
        {
          productId: product.id,
          code: product.code,
          barcode: product.barcode,
          name: product.name,
          category: product.category,
          stock: product.stock,
          unit: product.unit,
          quantity: 1,
          price: product.price,
          discount: 0,
        },
      ];
    });

    setProductSearch("");
    return true;
  }

  function addProductFromSearch() {
    const search = normalizeValue(productSearch);

    if (!search) {
      alert("กรุณาพิมพ์รหัสสินค้า หรือบาร์โค้ดก่อน");
      return;
    }

    const exactProduct = products.find(
      (product) =>
        normalizeValue(product.code) === search ||
        normalizeValue(product.barcode) === search
    );

    if (exactProduct) {
      addProduct(exactProduct);
      return;
    }

    if (productResults.length === 1) {
      addProduct(productResults[0]);
      return;
    }

    if (productResults.length > 1) {
      alert("พบสินค้าหลายรายการ กรุณาเลือกสินค้าจากรายการด้านล่าง");
      return;
    }

    alert("ไม่พบสินค้าจากรหัสหรือบาร์โค้ดนี้");
  }

  function handleSearchKeyDown(event) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    addProductFromSearch();
  }

  function updateQuantity(productId, value) {
    setCart((previous) =>
      previous.map((item) => {
        if (item.productId !== productId) return item;

        const quantity = Math.max(
          1,
          Math.min(Math.floor(toNumber(value)), toNumber(item.stock))
        );

        return {
          ...item,
          quantity,
        };
      })
    );
  }

  function increaseQuantity(productId) {
    setCart((previous) =>
      previous.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Math.min(
                toNumber(item.quantity) + 1,
                toNumber(item.stock)
              ),
            }
          : item
      )
    );
  }

  function decreaseQuantity(productId) {
    setCart((previous) =>
      previous.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Math.max(1, toNumber(item.quantity) - 1),
            }
          : item
      )
    );
  }

  function updateDiscount(productId, value) {
    setCart((previous) =>
      previous.map((item) =>
        item.productId === productId
          ? {
              ...item,
              discount: Math.max(0, toNumber(value)),
            }
          : item
      )
    );
  }

  function removeCartItem(productId) {
    setCart((previous) =>
      previous.filter((item) => item.productId !== productId)
    );
  }

  function clearCart() {
    if (cart.length === 0) return;

    const confirmed = window.confirm(
      "ต้องการล้างรายการสินค้าทั้งหมดใช่หรือไม่?"
    );

    if (!confirmed) return;

    setCart([]);
    setGlobalDiscount("0");
    setNote("");
  }

  function cancelSale() {
    if (
      cart.length > 0 &&
      !window.confirm("ต้องการยกเลิกรายการขายนี้ใช่หรือไม่?")
    ) {
      return;
    }

    setCart([]);
    setProductSearch("");
    setGlobalDiscount("0");
    setNote("");
    setSaleNumber(createSaleNumber());
  }

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await loadProducts();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSaveSale() {
    if (cart.length === 0) {
      alert("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    const hasOverStock = cart.some(
      (item) => toNumber(item.quantity) > toNumber(item.stock)
    );

    if (hasOverStock) {
      alert("มีสินค้าที่ระบุจำนวนเกินสต็อก กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    setIsSaving(true);

    const currentSaleNumber = saleNumber;
    const cartSnapshot = cart.map((item) => ({ ...item }));

    try {
      const { error } = await supabase.rpc("create_user_sale", {
        p_sale_number: currentSaleNumber,
        p_sale_date: saleDate,
        p_note: note.trim(),
        p_discount: globalDiscountAmount,
        p_items: cart.map((item) => ({
          product_id: Number(item.productId),
          quantity: toNumber(item.quantity),
          price: toNumber(item.price),
          discount: toNumber(item.discount),
        })),
      });

      if (error) {
        throw error;
      }

      setLastReceipt({
        saleNumber: currentSaleNumber,
        saleDate,
        items: cartSnapshot,
        itemAmount,
        itemDiscount,
        globalDiscount: globalDiscountAmount,
        total: grandTotal,
      });

      await loadProducts();

      setCart([]);
      setProductSearch("");
      setGlobalDiscount("0");
      setNote("");
      setSaleNumber(createSaleNumber());

      alert(`บันทึกการขายสำเร็จ\nเลขที่บิล: ${currentSaleNumber}`);
    } catch (error) {
      console.error(error);
      alert(error.message || "บันทึกการขายไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }
  function printLastReceipt() {
    if (!lastReceipt) {
      alert("กรุณาบันทึกการขายก่อนพิมพ์ใบเสร็จ");
      return;
    }

    const receiptWindow = window.open(
      "",
      "_blank",
      "width=450,height=700"
    );

    if (!receiptWindow) {
      alert("กรุณาอนุญาต Pop-up เพื่อพิมพ์ใบเสร็จ");
      return;
    }

    const rows = lastReceipt.items
      .map((item) => {
        const lineTotal = Math.max(
          0,
          toNumber(item.quantity) * toNumber(item.price) -
            toNumber(item.discount)
        );

        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.name)}</strong><br />
              <small>${escapeHtml(item.code)}</small>
            </td>
            <td style="text-align:right">${item.quantity}</td>
            <td style="text-align:right">${formatMoney(lineTotal)}</td>
          </tr>
        `;
      })
      .join("");

    receiptWindow.document.write(`
      <html>
        <head>
          <title>ใบเสร็จ ${escapeHtml(lastReceipt.saleNumber)}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111827;
            }

            h2,
            p {
              margin: 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            td,
            th {
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }

            .row {
              display: flex;
              justify-content: space-between;
              margin-top: 10px;
            }

            .total {
              margin-top: 18px;
              font-size: 20px;
              font-weight: bold;
              color: #dc2626;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>

        <body>
          <h2>ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</h2>
          <p>ใบเสร็จรับเงิน</p>

          <br />

          <p>เลขที่บิล: ${escapeHtml(lastReceipt.saleNumber)}</p>
          <p>วันที่: ${escapeHtml(lastReceipt.saleDate)}</p>

          <table>
            <thead>
              <tr>
                <th style="text-align:left">สินค้า</th>
                <th style="text-align:right">จำนวน</th>
                <th style="text-align:right">รวม</th>
              </tr>
            </thead>

            <tbody>${rows}</tbody>
          </table>

          <div class="row">
            <span>รวมราคาสินค้า</span>
            <span>${formatMoney(lastReceipt.itemAmount)} บาท</span>
          </div>

          <div class="row">
            <span>ส่วนลดสินค้า</span>
            <span>${formatMoney(lastReceipt.itemDiscount)} บาท</span>
          </div>

          <div class="row">
            <span>ส่วนลดรวม</span>
            <span>${formatMoney(lastReceipt.globalDiscount)} บาท</span>
          </div>

          <div class="total">
            <span>ยอดสุทธิ</span>
            <span>${formatMoney(lastReceipt.total)} บาท</span>
          </div>

          <p style="margin-top:30px;text-align:center">
            ขอบคุณที่ใช้บริการ
          </p>
        </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.focus();

    window.setTimeout(() => {
      receiptWindow.print();
    }, 300);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-[290px] min-h-screen shrink-0 bg-[#182232] text-white">
        <div className="rounded-br-[42px] bg-red-600 px-7 py-8 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
              🥤
            </div>

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
            active
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
                การขายสินค้า
              </h1>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                พนักงาน
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              เพิ่มสินค้าในรายการ คำนวณยอดขาย และบันทึกใบเสร็จ
            </p>
          </div>

          <AccountHeader />
        </header>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  ข้อมูลการขาย
                </h2>

                <p className="mt-1 text-slate-500">
                  ค้นหาสินค้าจากชื่อ รหัสสินค้า หรือบาร์โค้ด
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || isSaving}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
                รีเฟรชสินค้า
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  วันที่ขาย
                </label>

                <input
                  type="date"
                  value={saleDate}
                  onChange={(event) => setSaleDate(event.target.value)}
                  disabled={isSaving}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  เลขที่บิล
                </label>

                <input
                  value={saleNumber}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ค้นหาสินค้า / สแกนบาร์โค้ด
              </label>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <FaBarcode className="absolute left-4 top-4 text-slate-400" />

                  <input
                    value={productSearch}
                    onChange={(event) =>
                      setProductSearch(event.target.value)
                    }
                    onKeyDown={handleSearchKeyDown}
                    disabled={isSaving}
                    placeholder="ชื่อสินค้า รหัสสินค้า หรือบาร์โค้ด"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-slate-800 outline-none focus:border-red-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={addProductFromSearch}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 text-white hover:bg-red-700 disabled:bg-red-300"
                >
                  <FaSearch />
                  เพิ่ม
                </button>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                ใช้เครื่องสแกนบาร์โค้ดยิงที่ช่องด้านบน แล้วกด Enter ได้ทันที
              </p>
            </div>

            <div className="mt-6">
              <BarcodeScanBox
                products={products}
                onAddProduct={addProduct}
                disabled={isSaving || isLoadingProducts}
              />
            </div>

            <div className="mt-7">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {productSearch ? "ผลการค้นหา" : "สินค้าในระบบ"}
                </h3>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                  {productResults.length} รายการ
                </span>
              </div>

              {isLoadingProducts ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
                  กำลังโหลดสินค้า...
                </div>
              ) : productResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {productResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      disabled={product.stock <= 0 || isSaving}
                      className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex justify-between gap-3">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-600">
                          {product.code}
                        </span>

                        <span className="font-bold text-red-600">
                          ฿ {formatMoney(product.price)}
                        </span>
                      </div>

                      <p className="mt-3 font-semibold text-slate-900">
                        {product.name}
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        {product.category} · คงเหลือ {product.stock}{" "}
                        {product.unit}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
                  ไม่พบสินค้าที่ค้นหา
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  รายการสินค้าที่ขาย
                </h2>

                <p className="mt-1 text-slate-500">
                  {cart.length} รายการ · รวม {totalQuantity} ชิ้น
                </p>
              </div>

              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0 || isSaving}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaTrash />
                ล้างรายการ
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-3 text-left font-medium">สินค้า</th>
                    <th className="py-3 text-center font-medium">ราคา</th>
                    <th className="py-3 text-center font-medium">จำนวน</th>
                    <th className="py-3 text-center font-medium">ส่วนลด</th>
                    <th className="py-3 text-center font-medium">ยอดรวม</th>
                    <th className="py-3"></th>
                  </tr>
                </thead>

                <tbody>
                  {cart.length > 0 ? (
                    cart.map((item) => {
                      const lineTotal = Math.max(
                        0,
                        toNumber(item.quantity) * toNumber(item.price) -
                          toNumber(item.discount)
                      );

                      return (
                        <tr
                          key={item.productId}
                          className="border-b border-slate-100"
                        >
                          <td className="py-4">
                            <p className="font-semibold text-slate-900">
                              {item.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.code} · คงเหลือ {item.stock} {item.unit}
                            </p>
                          </td>

                          <td className="text-center">
                            ฿ {formatMoney(item.price)}
                          </td>

                          <td className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  decreaseQuantity(item.productId)
                                }
                                disabled={isSaving}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <FaMinus className="text-xs" />
                              </button>

                              <input
                                type="number"
                                min="1"
                                max={item.stock}
                                value={item.quantity}
                                onChange={(event) =>
                                  updateQuantity(
                                    item.productId,
                                    event.target.value
                                  )
                                }
                                disabled={isSaving}
                                className="w-14 rounded-lg border border-slate-200 py-2 text-center outline-none focus:border-red-500"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  increaseQuantity(item.productId)
                                }
                                disabled={
                                  isSaving ||
                                  toNumber(item.quantity) >=
                                    toNumber(item.stock)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <FaPlus className="text-xs" />
                              </button>
                            </div>
                          </td>

                          <td className="text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discount}
                              onChange={(event) =>
                                updateDiscount(
                                  item.productId,
                                  event.target.value
                                )
                              }
                              disabled={isSaving}
                              className="w-20 rounded-lg border border-slate-200 py-2 text-center outline-none focus:border-red-500"
                            />
                          </td>

                          <td className="text-center font-bold text-slate-900">
                            ฿ {formatMoney(lineTotal)}
                          </td>

                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => removeCartItem(item.productId)}
                              disabled={isSaving}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                              title="ลบรายการ"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="py-16 text-center text-slate-500"
                      >
                        ยังไม่มีสินค้าในรายการขาย
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-6">
              <div className="flex justify-between text-slate-700">
                <span>รวมราคาสินค้า</span>
                <b>฿ {formatMoney(itemAmount)}</b>
              </div>

              <div className="flex justify-between text-slate-700">
                <span>ส่วนลดสินค้า</span>
                <b>฿ {formatMoney(itemDiscount)}</b>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-slate-700">ส่วนลดรวม</span>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={globalDiscount}
                    onChange={(event) =>
                      setGlobalDiscount(event.target.value)
                    }
                    disabled={isSaving}
                    className="w-36 rounded-xl border border-slate-200 bg-white p-2 text-right outline-none focus:border-red-500"
                  />

                  <span className="text-slate-700">บาท</span>
                </div>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-4 text-2xl font-bold text-red-600">
                <span>ยอดรวมสุทธิ</span>
                <span>฿ {formatMoney(grandTotal)}</span>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                หมายเหตุ
              </label>

              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={isSaving}
                placeholder="เพิ่มหมายเหตุ (ไม่บังคับ)"
                rows="3"
                className="w-full resize-none rounded-xl border border-slate-200 p-4 text-slate-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={cancelSale}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 px-6 py-4 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleSaveSale}
                disabled={isSaving || cart.length === 0}
                className="flex items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-white hover:bg-red-700 disabled:bg-red-300"
              >
                <FaSave />
                {isSaving ? "กำลังบันทึก..." : "บันทึกการขาย"}
              </button>

              <button
                type="button"
                onClick={printLastReceipt}
                disabled={!lastReceipt || isSaving}
                className="col-span-2 flex items-center justify-center gap-3 rounded-xl border border-slate-200 px-6 py-4 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <FaPrint />
                พิมพ์ใบเสร็จล่าสุด
              </button>
            </div>
          </section>
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