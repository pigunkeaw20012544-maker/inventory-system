"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../components/AccountHeader";
import BarcodeScanBox from "../components/BarcodeScanBox";
import LogoutButton from "../components/LogoutButton";
import { supabase } from "../lib/supabase";

import {
  FaBox,
  FaBoxOpen,
  FaCalendarAlt,
  FaChartBar,
  FaExclamationTriangle,
  FaHistory,
  FaHome,
  FaSave,
  FaSearch,
  FaShoppingCart,
  FaSyncAlt,
  FaThLarge,
  FaTimes,
  FaTrash,
  FaUsers,
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

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getStockStatus(stock) {
  const quantity = toNumber(stock);

  if (quantity <= 0) return "หมด";
  if (quantity < 10) return "ใกล้หมด";

  return "มีสินค้า";
}

function getLineAmount(item) {
  return toNumber(item.quantity) * toNumber(item.price);
}

function getLineDiscount(item) {
  return Math.min(
    Math.max(0, toNumber(item.discount)),
    getLineAmount(item)
  );
}

function getLineTotal(item) {
  return Math.max(0, getLineAmount(item) - getLineDiscount(item));
}

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  const [productSearch, setProductSearch] = useState("");
  const [saleDate, setSaleDate] = useState(getToday());
  const [sellerName, setSellerName] = useState("Admin");
  const [saleNumber, setSaleNumber] = useState(createSaleNumber());
  const [note, setNote] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState("0");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

    const mappedProducts = (data || []).map((product) => {
      const categoryName = Array.isArray(product.category)
        ? product.category[0]?.name
        : product.category?.name;

      return {
        id: Number(product.id),
        code: product.product_code || "-",
        barcode: product.barcode || "",
        name: product.name || "-",
        category: categoryName || "-",
        price: toNumber(product.price),
        stock: toNumber(product.stock),
        unit: product.unit || "ชิ้น",
        status: getStockStatus(product.stock),
      };
    });

    setProducts(mappedProducts);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadProducts();

    const channel = supabase
      .channel("admin-sales-products-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => void loadProducts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const outOfStockProducts = useMemo(() => {
    return products.filter((product) => product.stock <= 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(
      (product) => product.stock > 0 && product.stock < 10
    );
  }, [products]);

  const totalQuantity = useMemo(() => {
    return cart.reduce((sum, item) => sum + toNumber(item.quantity), 0);
  }, [cart]);

  const itemAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + getLineAmount(item), 0);
  }, [cart]);

  const itemDiscount = useMemo(() => {
    return cart.reduce((sum, item) => sum + getLineDiscount(item), 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return Math.max(0, itemAmount - itemDiscount);
  }, [itemAmount, itemDiscount]);

  const saleDiscount = useMemo(() => {
    return Math.min(Math.max(0, toNumber(globalDiscount)), subtotal);
  }, [globalDiscount, subtotal]);

  const totalDiscount = useMemo(() => {
    return itemDiscount + saleDiscount;
  }, [itemDiscount, saleDiscount]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - saleDiscount);
  }, [subtotal, saleDiscount]);

  function addProduct(product) {
    if (!product || toNumber(product.stock) <= 0) {
      alert(`สินค้า "${product?.name || "-"}" หมดสต๊อก`);
      return false;
    }

    const existingItem = cart.find(
      (item) => item.productId === product.id
    );

    if (
      existingItem &&
      toNumber(existingItem.quantity) >= toNumber(product.stock)
    ) {
      alert(
        `สินค้า "${product.name}" มีในสต๊อกเพียง ${product.stock} ${product.unit}`
      );
      return false;
    }

    setCart((previous) => {
      const exists = previous.find(
        (item) => item.productId === product.id
      );

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
          stock: toNumber(product.stock),
          unit: product.unit,
          quantity: 1,
          price: toNumber(product.price),
          discount: 0,
        },
      ];
    });

    setProductSearch("");

    return true;
  }

  function handleProductSearchKeyDown(event) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const search = normalizeValue(productSearch);

    if (!search) return;

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

    alert("ไม่พบรหัสสินค้าหรือบาร์โค้ดที่ค้นหา");
  }

  function updateCartItem(productId, field, value) {
    setCart((previous) =>
      previous.map((item) => {
        if (item.productId !== productId) return item;

        if (field === "quantity") {
          const quantity = Math.max(
            1,
            Math.min(
              Math.floor(toNumber(value)),
              toNumber(item.stock)
            )
          );

          return {
            ...item,
            quantity,
            discount: Math.min(
              getLineDiscount(item),
              quantity * toNumber(item.price)
            ),
          };
        }

        if (field === "price") {
          const price = Math.max(0, toNumber(value));

          return {
            ...item,
            price,
            discount: Math.min(
              getLineDiscount(item),
              toNumber(item.quantity) * price
            ),
          };
        }

        if (field === "discount") {
          return {
            ...item,
            discount: Math.min(
              Math.max(0, toNumber(value)),
              getLineAmount(item)
            ),
          };
        }

        return item;
      })
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
      "ต้องการล้างรายการสินค้าในบิลทั้งหมดใช่หรือไม่?"
    );

    if (!confirmed) return;

    setCart([]);
    setGlobalDiscount("0");
    setNote("");
  }

  function cancelSale() {
    if (cart.length > 0) {
      const confirmed = window.confirm(
        "ต้องการยกเลิกรายการขายนี้ใช่หรือไม่?"
      );

      if (!confirmed) return;
    }

    setCart([]);
    setProductSearch("");
    setGlobalDiscount("0");
    setNote("");
    setSaleNumber(createSaleNumber());
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadProducts();
    setIsRefreshing(false);
  }

  async function handleSaveSale() {
    if (cart.length === 0) {
      alert("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    const hasInvalidQuantity = cart.some(
      (item) =>
        toNumber(item.quantity) <= 0 ||
        toNumber(item.quantity) > toNumber(item.stock)
    );

    if (hasInvalidQuantity) {
      alert("มีสินค้าที่ระบุจำนวนเกินสต๊อก กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    const currentSaleNumber = saleNumber;

    setIsSaving(true);

    const { error } = await supabase.rpc("create_admin_sale", {
      p_sale_number: currentSaleNumber,
      p_sale_date: saleDate,
      p_seller_name: sellerName.trim() || "Admin",
      p_note: note.trim(),
      p_discount: saleDiscount,
      p_items: cart.map((item) => ({
        product_id: Number(item.productId),
        quantity: toNumber(item.quantity),
        price: toNumber(item.price),
        discount: getLineDiscount(item),
      })),
    });

    setIsSaving(false);

    if (error) {
      console.error(error);
      alert(error.message || "บันทึกการขายไม่สำเร็จ");
      return;
    }

    await loadProducts();

    setCart([]);
    setProductSearch("");
    setGlobalDiscount("0");
    setNote("");
    setSaleNumber(createSaleNumber());

    alert(`บันทึกการขายสำเร็จ\nเลขที่บิล: ${currentSaleNumber}`);
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

          <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />

          <Menu icon={<FaBox />} text="สินค้า" href="/products" />

          <Menu
            icon={<FaThLarge />}
            text="หมวดหมู่สินค้า"
            href="/categories"
          />

          <Menu
            active
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

      <main className="min-w-0 flex-1 p-6 xl:p-10">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900">
                ขายสินค้า
              </h1>

              <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                Admin
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              สร้างรายการขาย ค้นหาสินค้า และสแกนบาร์โค้ด
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรชสินค้า"}
            </button>

            <AccountHeader />
          </div>
        </header>

        {pageError && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            <FaExclamationTriangle className="mt-1 shrink-0" />
            <p>{pageError}</p>
          </div>
        )}

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white">
                <FaExclamationTriangle />
              </div>

              <div>
                <p className="font-bold text-red-700">
                  สินค้าหมด {outOfStockProducts.length} รายการ
                </p>

                <p className="mt-1 text-sm text-red-600">
                  สินค้าที่หมดจะไม่สามารถเพิ่มลงในบิลได้
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white">
                <FaBoxOpen />
              </div>

              <div>
                <p className="font-bold text-orange-700">
                  สินค้าใกล้หมด {lowStockProducts.length} รายการ
                </p>

                <p className="mt-1 text-sm text-orange-600">
                  สินค้าเหลือ 1–9 ชิ้น ควรวางแผนรับสินค้าเพิ่ม
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FaCalendarAlt />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                ข้อมูลการขาย
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                ตรวจสอบข้อมูลก่อนบันทึกการขาย
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Field
              label="วันที่ขาย"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              type="date"
              icon={<FaCalendarAlt />}
            />

            <Field label="เลขที่บิล" value={saleNumber} disabled />

            <Field
              label="พนักงานขาย"
              value={sellerName}
              onChange={(event) => setSellerName(event.target.value)}
              placeholder="เช่น Admin"
            />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                เพิ่มรายการสินค้า
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                ค้นหาชื่อสินค้า รหัสสินค้า หรือสแกนบาร์โค้ด
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              สินค้าทั้งหมด {products.length} รายการ
            </span>
          </div>

          <div className="relative mt-6">
            <FaSearch className="absolute left-4 top-4 text-slate-400" />

            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              onKeyDown={handleProductSearchKeyDown}
              placeholder="ค้นหาชื่อสินค้า / รหัสสินค้า / สแกนบาร์โค้ด แล้วกด Enter"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-slate-800 outline-none focus:border-red-500 focus:bg-white"
            />
          </div>

          <div className="mt-5">
            <BarcodeScanBox
              products={products}
              onAddProduct={addProduct}
              disabled={isSaving || isRefreshing}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}

            {!isLoading &&
              productResults.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock =
                  product.stock > 0 && product.stock < 10;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    disabled={isOutOfStock || isSaving}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isOutOfStock
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
                        : "border-slate-200 bg-white hover:border-red-400 hover:bg-red-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-600">
                        {product.code}
                      </span>

                      <span className="font-bold text-red-600">
                        ฿ {formatMoney(product.price)}
                      </span>
                    </div>

                    <p className="mt-3 truncate font-semibold text-slate-900">
                      {product.name}
                    </p>

                    <p className="mt-1 truncate text-sm text-slate-500">
                      {product.category}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isOutOfStock
                            ? "bg-red-100 text-red-600"
                            : isLowStock
                            ? "bg-orange-100 text-orange-600"
                            : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        {getStockStatus(product.stock)}
                      </span>

                      <span className="text-sm font-medium text-slate-600">
                        {product.stock} {product.unit}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>

          {!isLoading && productResults.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 py-10 text-center text-slate-500">
              ไม่พบสินค้าที่ค้นหา
            </div>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                รายการสินค้าในบิล
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                มีสินค้า {cart.length} รายการ รวม {totalQuantity} ชิ้น
              </p>
            </div>

            <button
              type="button"
              onClick={clearCart}
              disabled={cart.length === 0 || isSaving}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaTrash />
              ล้างรายการทั้งหมด
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-5 py-4 text-left font-semibold">#</th>
                  <th className="px-5 py-4 text-left font-semibold">
                    รหัสสินค้า
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    ชื่อสินค้า
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    หมวดหมู่
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    จำนวน
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    ราคาต่อหน่วย
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    ส่วนลด
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    รวมเงิน
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    จัดการ
                  </th>
                </tr>
              </thead>

              <tbody>
                {cart.length > 0 ? (
                  cart.map((item, index) => (
                    <tr
                      key={item.productId}
                      className="border-t border-slate-100 text-slate-700"
                    >
                      <td className="px-5 py-4 text-slate-400">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-600">
                          {item.code}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {item.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          คงเหลือ {item.stock} {item.unit}
                        </p>
                      </td>

                      <td className="px-5 py-4">{item.category}</td>

                      <td className="px-5 py-4 text-center">
                        <input
                          type="number"
                          min="1"
                          max={item.stock}
                          value={item.quantity}
                          disabled={isSaving}
                          onChange={(event) =>
                            updateCartItem(
                              item.productId,
                              "quantity",
                              event.target.value
                            )
                          }
                          className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-center outline-none focus:border-red-500"
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          disabled={isSaving}
                          onChange={(event) =>
                            updateCartItem(
                              item.productId,
                              "price",
                              event.target.value
                            )
                          }
                          className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-right outline-none focus:border-red-500"
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          disabled={isSaving}
                          onChange={(event) =>
                            updateCartItem(
                              item.productId,
                              "discount",
                              event.target.value
                            )
                          }
                          className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-right outline-none focus:border-red-500"
                        />
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-slate-900">
                        ฿ {formatMoney(getLineTotal(item))}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.productId)}
                          disabled={isSaving}
                          className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          title="ลบรายการ"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-6 py-16 text-center text-slate-500"
                    >
                      <FaShoppingCart className="mx-auto mb-3 text-4xl text-slate-300" />
                      <p>ยังไม่มีสินค้าในบิล</p>
                      <p className="mt-1 text-sm">
                        กรุณาค้นหาหรือสแกนบาร์โค้ดเพื่อเพิ่มสินค้า
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <label className="mb-2 block font-medium text-slate-700">
              หมายเหตุ
            </label>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={isSaving}
              placeholder="เพิ่มหมายเหตุเกี่ยวกับรายการขายนี้ (ไม่บังคับ)"
              rows="6"
              className="w-full resize-none rounded-xl border border-slate-200 px-5 py-4 text-slate-800 outline-none focus:border-red-500"
            />
          </div>

          <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              สรุปยอดขาย
            </h2>

            <div className="mt-6 space-y-4 text-slate-700">
              <SummaryRow
                label={`รวมสินค้า (${totalQuantity} ชิ้น)`}
                value={`฿ ${formatMoney(itemAmount)}`}
              />

              <SummaryRow
                label="ส่วนลดสินค้า"
                value={`฿ ${formatMoney(itemDiscount)}`}
              />

              <div className="flex items-center justify-between gap-3">
                <span>ส่วนลดรวม</span>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={globalDiscount}
                    disabled={isSaving}
                    onChange={(event) =>
                      setGlobalDiscount(event.target.value)
                    }
                    className="w-28 rounded-xl border border-red-200 bg-white px-3 py-2 text-right outline-none focus:border-red-500"
                  />

                  <span>บาท</span>
                </div>
              </div>

              <SummaryRow
                label="ส่วนลดทั้งหมด"
                value={`฿ ${formatMoney(totalDiscount)}`}
              />
            </div>

            <div className="mt-6 border-t border-red-200 pt-5">
              <div className="flex items-end justify-between gap-3">
                <span className="text-xl font-bold text-red-600">
                  ยอดรวมสุทธิ
                </span>

                <span className="text-right text-3xl font-bold text-red-600">
                  ฿ {formatMoney(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={cancelSale}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 py-4 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <FaTimes />
            ยกเลิกรายการขาย
          </button>

          <button
            type="button"
            onClick={handleSaveSale}
            disabled={isSaving || cart.length === 0}
            className="flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-10 py-4 font-medium text-white shadow-lg hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            <FaSave />
            {isSaving ? "กำลังบันทึก..." : "บันทึกการขาย"}
          </button>
        </div>
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

function Field({
  label,
  value,
  onChange,
  icon,
  disabled = false,
  type = "text",
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-red-500 ${
            icon ? "pr-11" : ""
          } ${disabled ? "bg-slate-100 text-slate-500" : "bg-white"}`}
        />

        {icon && (
          <span className="absolute right-4 top-3.5 text-slate-400">
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}