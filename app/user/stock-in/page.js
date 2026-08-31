"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FaArrowUp, FaBarcode, FaBars, FaBox, FaChartBar, FaHome, FaShoppingCart, FaSyncAlt, FaTimes, FaSave } from "react-icons/fa";
import AccountHeader from "../../components/AccountHeader";
import BarcodeProductSearch from "../../components/BarcodeProductSearch";
import BrandLogo from "../../components/BrandLogo";
import LogoutButton from "../../components/LogoutButton";
import { supabase } from "../../lib/supabase";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getStatus(stock) {
  const quantity = toNumber(stock);
  if (quantity <= 0) return "หมด";
  if (quantity < 10) return "ใกล้หมด";
  return "มีสินค้า";
}

function getCategoryName(category) {
  if (Array.isArray(category)) return category[0]?.name || "-";
  return category?.name || "-";
}

export default function UserStockInPage() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function loadProducts() {
    setIsLoading(true);
    setPageError("");
    const { data, error } = await supabase
      .from("products")
      .select("id, product_code, barcode, name, price, stock, unit, status, category:categories(name)")
      .order("name", { ascending: true });

    if (error) {
      setProducts([]);
      setPageError(error.message || "ไม่สามารถโหลดข้อมูลสินค้าได้");
    } else {
      setProducts((data || []).map((product) => ({
        id: product.id,
        code: product.product_code || "-",
        product_code: product.product_code || "-",
        barcode: product.barcode || "",
        name: product.name || "-",
        category: getCategoryName(product.category),
        price: toNumber(product.price),
        stock: toNumber(product.stock),
        unit: product.unit || "ชิ้น",
        status: product.status || getStatus(product.stock),
      })));
    }
    setIsLoading(false);
  }

  useEffect(() => {
    void loadProducts();
    const channel = supabase.channel("user-stock-in-products-live").on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => void loadProducts()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const stockAfter = useMemo(() => {
    const amount = Number(quantity);
    if (!selectedProduct || !Number.isInteger(amount) || amount <= 0) return selectedProduct?.stock || 0;
    return selectedProduct.stock + amount;
  }, [quantity, selectedProduct]);

  function selectProduct(product) {
    setSelectedProduct(product);
    setQuantity("");
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const amount = Number(quantity);
    if (!selectedProduct) return setFormError("กรุณาเลือกสินค้าที่ต้องการรับเข้า");
    if (!Number.isInteger(amount) || amount <= 0) return setFormError("จำนวนรับเข้าต้องเป็นจำนวนเต็มมากกว่า 0");
    if (!window.confirm(`ยืนยันรับสินค้าเข้า ${selectedProduct.name} จำนวน ${amount} ${selectedProduct.unit} หรือไม่?`)) return;

    setIsSaving(true);
    setFormError("");
    const { error } = await supabase.rpc("user_receive_stock", {
      p_product_id: Number(selectedProduct.id),
      p_quantity: amount,
      p_note: note.trim() || null,
    });

    if (error) {
      setFormError(error.message || "บันทึกการรับสินค้าไม่สำเร็จ");
      setIsSaving(false);
      return;
    }

    await loadProducts();
    setSelectedProduct(null);
    setQuantity("");
    setNote("");
    setIsSaving(false);
    alert("บันทึกการรับสินค้าสำเร็จ");
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadProducts();
    setIsRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <button type="button" onClick={() => setSidebarOpen((open) => !open)} className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 text-slate-900 shadow-lg md:hidden" aria-label="เปิดเมนู">{sidebarOpen ? <FaTimes /> : <FaBars />}</button>
      <aside className={`fixed left-0 top-0 z-40 min-h-screen w-full bg-[#182232] text-white transition-transform md:relative md:w-[260px] md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="rounded-br-[42px] bg-red-600 px-7 py-8"><div className="flex items-center gap-3"><BrandLogo /><div><h2 className="font-bold">ระบบบริหารจัดการ</h2><p className="text-xs text-white/80">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p></div></div></div>
        <nav className="space-y-2 p-5"><p className="px-4 pb-1 pt-2 text-xs text-slate-400">เมนูพนักงาน</p><Menu icon={<FaHome />} text="หน้าหลัก" href="/user/dashboard" /><Menu icon={<FaBox />} text="สินค้า" href="/user/products" /><Menu icon={<FaBarcode />} text="สแกนบาร์โค้ด" href="/user/barcode" /><Menu active icon={<FaArrowUp />} text="รับสินค้าเข้า" href="/user/stock-in" /><Menu icon={<FaShoppingCart />} text="ขายสินค้า" href="/user/sales" /><Menu icon={<FaChartBar />} text="รายงาน" href="/user/reports" /><div className="pt-5"><LogoutButton /></div></nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10"><header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">รับสินค้าเข้า</h1><p className="mt-2 text-slate-500">เพิ่มจำนวนสินค้าที่มีอยู่แล้ว พร้อมบันทึกประวัติการรับเข้า</p></div><AccountHeader /></header>
        {pageError && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{pageError}</div>}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-bold text-slate-900">เลือกสินค้า</h2><p className="mt-1 text-sm text-slate-500">ค้นหาด้วยชื่อ รหัสสินค้า หรือบาร์โค้ด</p></div><button type="button" onClick={handleRefresh} disabled={isRefreshing || isLoading} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-slate-700 disabled:opacity-50"><FaSyncAlt className={isRefreshing ? "animate-spin" : ""} /> รีเฟรช</button></div><div className="mt-4"><BarcodeProductSearch products={products} onProductFound={selectProduct} onProductSelect={selectProduct} successText={(product) => `เลือกสินค้าแล้ว: ${product.name}`} disabled={isLoading || isSaving} /></div></section>
        <form onSubmit={handleSubmit} className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">{selectedProduct ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xl font-bold text-slate-900">{selectedProduct.name}</p><p className="mt-1 font-mono text-sm text-slate-500">{selectedProduct.code} · {selectedProduct.barcode || "ไม่มีบาร์โค้ด"}</p><div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3"><Info label="คงเหลือเดิม" value={`${selectedProduct.stock} ${selectedProduct.unit}`} /><Info label="จำนวนรับเข้า" value={quantity ? `+${quantity}` : "-"} /><Info label="คงเหลือใหม่" value={`${stockAfter} ${selectedProduct.unit}`} /></div><p className="mt-4 text-sm text-slate-600">สถานะปัจจุบัน: {selectedProduct.status}</p></div> : <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">ยังไม่ได้เลือกสินค้า</div>}
          <div className="mt-6 grid gap-5 md:grid-cols-2"><Field label="จำนวนรับเข้า" value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={isSaving} /><Field label="หมายเหตุ" value={note} onChange={(event) => setNote(event.target.value)} disabled={isSaving} /></div>{formError && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{formError}</div>}<div className="mt-7 flex justify-end"><button type="submit" disabled={isSaving || isLoading || !selectedProduct} className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white disabled:bg-red-300"><FaSave /> {isSaving ? "กำลังบันทึก..." : "บันทึกการรับสินค้า"}</button></div>
        </form>
      </main>
    </div>
  );
}

function Menu({ icon, text, href, active }) { return <Link href={href} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 ${active ? "bg-red-600 text-white" : "text-slate-200 hover:bg-white/10"}`}><span>{icon}</span><span>{text}</span></Link>; }
function Field({ label, value, onChange, disabled }) { return <label className="block text-sm font-medium text-slate-700">{label}<input type="text" inputMode="numeric" value={value} onChange={onChange} disabled={disabled} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none disabled:bg-slate-100" /></label>; }
function Info({ label, value }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p></div>; }
