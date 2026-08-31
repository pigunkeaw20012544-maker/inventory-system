"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AccountHeader from "../components/AccountHeader";
import BarcodeProductSearch from "../components/BarcodeProductSearch";
import BrandLogo from "../components/BrandLogo";
import LogoutButton from "../components/LogoutButton";
import { supabase } from "../lib/supabase";
import {
  FaArrowDown,
  FaArrowUp,
  FaBars,
  FaBox,
  FaChartBar,
  FaHistory,
  FaHome,
  FaSave,
  FaShoppingCart,
  FaSyncAlt,
  FaThLarge,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

const EMPTY_ADJUSTMENT = {
  direction: "in",
  quantity: "",
  note: "",
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getStatusFromStock(stock) {
  const quantity = toNumber(stock);
  if (quantity <= 0) return "หมด";
  if (quantity < 10) return "ใกล้หมด";
  return "มีสินค้า";
}

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function mapProduct(product) {
  return {
    id: product.id,
    code: product.product_code || "-",
    product_code: product.product_code || "-",
    barcode: product.barcode || "",
    name: product.name || "-",
    category: Array.isArray(product.category)
      ? product.category[0]?.name || "-"
      : product.category?.name || "-",
    stock: toNumber(product.stock),
    unit: product.unit || "ชิ้น",
    price: toNumber(product.price),
    status: getStatusFromStock(product.stock),
  };
}

export default function StockInPage() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mode, setMode] = useState("receive");
  const [quantity, setQuantity] = useState("");
  const [adjustment, setAdjustment] = useState(EMPTY_ADJUSTMENT);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        category_id,
        price,
        stock,
        unit,
        status,
        category:categories(name)
      `)
      .order("name", { ascending: true });

    if (error) {
      setProducts([]);
      setPageError(error.message || "ไม่สามารถโหลดข้อมูลสินค้าได้");
      setIsLoading(false);
      return;
    }

    setProducts((data || []).map(mapProduct));
    setIsLoading(false);
  }

  useEffect(() => {
    void loadProducts();

    const channel = supabase
      .channel("admin-stock-in-products-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => void loadProducts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const nextStock = useMemo(() => {
    const currentStock = toNumber(selectedProduct?.stock);
    const change = toNumber(quantity);

    if (!selectedProduct || !Number.isInteger(change) || change <= 0) {
      return currentStock;
    }

    return mode === "receive" || adjustment.direction === "in"
      ? currentStock + change
      : currentStock - change;
  }, [adjustment.direction, mode, quantity, selectedProduct]);

  function selectProduct(product) {
    const freshProduct =
      products.find((item) => String(item.id) === String(product.id)) || product;

    setSelectedProduct(freshProduct);
    setQuantity("");
    setFormError("");
  }

  function clearForm() {
    if (isSaving) return;
    setSelectedProduct(null);
    setQuantity("");
    setAdjustment(EMPTY_ADJUSTMENT);
    setFormError("");
  }

  function handleModeChange(nextMode) {
    if (isSaving) return;
    setMode(nextMode);
    setQuantity("");
    setFormError("");
  }

  async function handleReceive() {
    const receiveQuantity = Number(quantity);

    if (!selectedProduct) {
      setFormError("กรุณาเลือกสินค้าที่ต้องการรับเข้า");
      return;
    }

    if (!Number.isInteger(receiveQuantity) || receiveQuantity <= 0) {
      setFormError("จำนวนรับเข้าต้องเป็นจำนวนเต็มมากกว่า 0");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const { data, error } = await supabase.rpc("user_receive_stock", {
        p_product_id: Number(selectedProduct.id),
        p_quantity: receiveQuantity,
        p_note: adjustment.note.trim() || null,
      });

      if (error) throw error;

      await loadProducts();
      const result = data || {};
      const updatedProduct = products.find(
        (product) => String(product.id) === String(selectedProduct.id)
      );

      setSelectedProduct(
        updatedProduct
          ? {
              ...updatedProduct,
              stock: toNumber(result.stock_after),
              status: getStatusFromStock(result.stock_after),
            }
          : null
      );
      setQuantity("");
      setAdjustment((previous) => ({ ...previous, note: "" }));
      alert(
        `รับสินค้าเข้าสำเร็จ\nสินค้า: ${result.product_name || selectedProduct.name}\nคงเหลือเดิม: ${result.stock_before ?? selectedProduct.stock}\nคงเหลือใหม่: ${result.stock_after ?? "-"}`
      );
    } catch (error) {
      setFormError(
        error.message ||
          "รับสินค้าไม่สำเร็จ กรุณาตรวจสอบว่า RPC user_receive_stock อนุญาต Admin และ RLS ถูกต้อง"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdjustment() {
    const change = Number(adjustment.quantity);
    const currentStock = toNumber(selectedProduct?.stock);
    const stockAfter =
      adjustment.direction === "in" ? currentStock + change : currentStock - change;

    if (!selectedProduct) {
      setFormError("กรุณาเลือกสินค้าที่ต้องการปรับสต็อก");
      return;
    }

    if (!Number.isInteger(change) || change <= 0) {
      setFormError("จำนวนปรับสต็อกต้องเป็นจำนวนเต็มมากกว่า 0");
      return;
    }

    if (!adjustment.note.trim()) {
      setFormError("กรุณาระบุเหตุผลหรือหมายเหตุการปรับสต็อก");
      return;
    }

    if (stockAfter < 0) {
      setFormError("สต็อกหลังปรับไม่สามารถติดลบได้");
      return;
    }

    const confirmed = window.confirm(
      `ยืนยันปรับสต็อก ${selectedProduct.name} จาก ${currentStock} เป็น ${stockAfter} ${selectedProduct.unit} ใช่หรือไม่?`
    );

    if (!confirmed) return;

    setIsSaving(true);
    setFormError("");

    const movementType =
      adjustment.direction === "in" ? "adjustment_in" : "adjustment_out";
    const productUpdate = {
      stock: stockAfter,
      status: getStatusFromStock(stockAfter),
    };

    try {
      const { data: updatedProduct, error: productError } = await supabase
        .from("products")
        .update(productUpdate)
        .eq("id", selectedProduct.id)
        .eq("stock", currentStock)
        .select("id")
        .maybeSingle();

      if (productError) throw productError;
      if (!updatedProduct) {
        throw new Error("สต็อกสินค้าเปลี่ยนแปลงระหว่างการบันทึก กรุณารีเฟรชแล้วลองใหม่");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = user
        ? await supabase
            .from("profiles")
            .select("display_name, employee_code")
            .eq("id", user.id)
            .maybeSingle()
        : { data: null };

      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          product_id: selectedProduct.id,
          product_code: selectedProduct.code,
          product_name: selectedProduct.name,
          unit: selectedProduct.unit,
          movement_type: movementType,
          quantity: change,
          stock_before: currentStock,
          stock_after: stockAfter,
          note: adjustment.note.trim(),
          performed_by_user_id: user?.id || null,
          performed_by_name: profile?.display_name || null,
          performed_by_code: profile?.employee_code || null,
        });

      if (movementError) {
        await supabase
          .from("products")
          .update({ stock: currentStock, status: getStatusFromStock(currentStock) })
          .eq("id", selectedProduct.id)
          .eq("stock", stockAfter);
        throw movementError;
      }

      await loadProducts();
      setSelectedProduct((previous) =>
        previous
          ? { ...previous, stock: stockAfter, status: getStatusFromStock(stockAfter) }
          : previous
      );
      setAdjustment(EMPTY_ADJUSTMENT);
      alert("ปรับปรุงสต็อกสำเร็จ");
    } catch (error) {
      setFormError(error.message || "ปรับปรุงสต็อกไม่สำเร็จ");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (mode === "receive") {
      await handleReceive();
    } else {
      await handleAdjustment();
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await loadProducts();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <button
        type="button"
        onClick={() => setSidebarOpen((open) => !open)}
        className="md:hidden fixed top-4 left-4 z-50 rounded-lg bg-white p-2 text-slate-900 shadow-lg"
        aria-label="เปิดเมนู"
      >
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          aria-label="ปิดเมนู"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 min-h-screen w-full shrink-0 overflow-y-auto bg-[#182232] text-white transition-transform md:relative md:w-[290px] md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="rounded-br-[42px] bg-red-600 px-7 py-8 shadow-lg">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div>
              <h2 className="text-lg font-bold">ระบบบริหารจัดการ</h2>
              <p className="text-xs text-white/80">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p>
            </div>
          </div>
        </div>
        <nav className="space-y-2 p-5">
          <p className="px-4 pb-1 pt-2 text-xs text-slate-400">เมนูหลัก</p>
          <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />
          <Menu icon={<FaBox />} text="สินค้า" href="/products" />
          <Menu icon={<FaThLarge />} text="หมวดหมู่สินค้า" href="/categories" />
          <Menu icon={<FaShoppingCart />} text="การขาย" href="/sales" />
          <Menu active icon={<FaArrowUp />} text="รับสินค้าเข้า" href="/stock-in" />
          <Menu icon={<FaHistory />} text="ประวัติสต็อก" href="/stock-movements" />
          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
          <div className="pt-5"><LogoutButton /></div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-6 xl:p-10">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900">รับสินค้าเข้าและปรับสต็อก</h1>
              <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600">Admin</span>
            </div>
            <p className="mt-2 text-slate-500">เพิ่มสินค้าจากการรับเข้า หรือปรับปรุงจำนวนพร้อมบันทึกประวัติ</p>
          </div>
          <AccountHeader />
        </header>

        <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-2">
            <button type="button" onClick={() => handleModeChange("receive")} className={`rounded-xl px-5 py-3 font-semibold ${mode === "receive" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <FaArrowUp className="mr-2 inline" /> รับสินค้าเข้า
            </button>
            <button type="button" onClick={() => handleModeChange("adjust")} className={`rounded-xl px-5 py-3 font-semibold ${mode === "adjust" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <FaArrowDown className="mr-2 inline" /> ปรับสต็อก
            </button>
          </div>
          <button type="button" onClick={handleRefresh} disabled={isRefreshing || isLoading} className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-slate-700 disabled:opacity-60">
            <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} /> รีเฟรชสินค้า
          </button>
        </section>

        {pageError && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{pageError}</div>}

        <section className="mt-6 rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">เลือกสินค้า</h2>
          <p className="mt-1 text-sm text-slate-500">ค้นหาด้วยชื่อ รหัสสินค้า หรือบาร์โค้ด</p>
          <BarcodeProductSearch
            products={products}
            onProductFound={selectProduct}
            onProductSelect={selectProduct}
            successText={(product) => `เลือกสินค้าแล้ว: ${product.name}`}
            disabled={isLoading || isSaving}
          />
        </section>

        <form onSubmit={handleSubmit} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedProduct ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xl font-bold text-slate-900">{selectedProduct.name}</p>
                  <p className="mt-1 font-mono text-sm text-slate-500">{selectedProduct.code} · {selectedProduct.barcode || "ไม่มีบาร์โค้ด"}</p>
                  <p className="mt-2 text-sm text-slate-600">สถานะ {selectedProduct.status} · หน่วย {selectedProduct.unit}</p>
                </div>
                <button type="button" onClick={clearForm} disabled={isSaving} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-600 disabled:opacity-50">เปลี่ยนสินค้า</button>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <InfoCard label="Stock เดิม" value={`${selectedProduct.stock} ${selectedProduct.unit}`} />
                <InfoCard label={mode === "receive" ? "จำนวนรับเข้า" : "จำนวนปรับ"} value={mode === "receive" ? quantity || "-" : adjustment.quantity || "-"} />
                <InfoCard label="Stock หลังรายการ" value={`${nextStock} ${selectedProduct.unit}`} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">ยังไม่ได้เลือกสินค้า</div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {mode === "receive" ? (
              <Field label="จำนวนรับเข้า" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="เช่น 10" />
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">ทิศทางการปรับ</label>
                  <select value={adjustment.direction} onChange={(event) => setAdjustment((previous) => ({ ...previous, direction: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800">
                    <option value="in">ปรับเพิ่ม</option>
                    <option value="out">ปรับลด</option>
                  </select>
                </div>
                <Field label="จำนวนปรับสต็อก" type="number" min="1" step="1" value={adjustment.quantity} onChange={(event) => setAdjustment((previous) => ({ ...previous, quantity: event.target.value }))} placeholder="เช่น 5" />
              </>
            )}
            <Field label="หมายเหตุ / เหตุผล" value={mode === "receive" ? adjustment.note : adjustment.note} onChange={(event) => setAdjustment((previous) => ({ ...previous, note: event.target.value }))} placeholder={mode === "receive" ? "เช่น รับสินค้าจากคลัง" : "เช่น ตรวจนับจริง หรือสินค้าชำรุด"} />
          </div>

          {formError && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{formError}</div>}

          <div className="mt-7 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={clearForm} disabled={isSaving} className="rounded-xl border border-slate-200 px-5 py-3 text-slate-700 disabled:opacity-50">ล้างรายการ</button>
            <button type="submit" disabled={isSaving || isLoading || !selectedProduct} className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white disabled:bg-red-300">
              <FaSave /> {isSaving ? "กำลังบันทึก..." : mode === "receive" ? "บันทึกรับสินค้าเข้า" : "บันทึกการปรับสต็อก"}
            </button>
          </div>
        </form>

        <div className="mt-6 flex justify-end">
          <Link href="/stock-movements" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-700">ดูประวัติการเคลื่อนไหวสต็อก</Link>
        </div>
      </main>
    </div>
  );
}

function Menu({ icon, text, href, active }) {
  return <Link href={href} className={`flex w-full items-center gap-4 rounded-xl px-4 py-3.5 ${active ? "bg-red-600 text-white shadow-lg" : "text-slate-200 hover:bg-white/10"}`}><span className="text-lg">{icon}</span><span className="font-medium">{text}</span></Link>;
}

function Field({ label, value, onChange, type = "text", min, step, placeholder }) {
  return <div><label className="mb-2 block text-sm font-medium text-slate-700">{label}</label><input type={type} min={min} step={step} value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-red-500" /></div>;
}

function InfoCard({ label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p></div>;
}
