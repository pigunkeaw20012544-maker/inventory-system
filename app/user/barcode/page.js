"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaArrowUp, FaBarcode, FaBox, FaChartBar, FaHome, FaShoppingCart, FaTimes, FaSyncAlt } from "react-icons/fa";
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

function mapProduct(product) {
  return {
    id: product.id,
    code: product.product_code || "-",
    product_code: product.product_code || "-",
    name: product.name || "-",
    barcode: product.barcode || "",
    category: getCategoryName(product.category),
    price: toNumber(product.price),
    stock: toNumber(product.stock),
    unit: product.unit || "ชิ้น",
    status: product.status || getStatus(product.stock),
  };
}

export default function UserBarcodePage() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scannerKey, setScannerKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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
      setProducts([]);
      setPageError(error.message || "ไม่สามารถโหลดข้อมูลสินค้าได้");
    } else {
      setProducts((data || []).map(mapProduct));
    }

    setIsLoading(false);
  }

  useEffect(() => {
    void loadProducts();

    const channel = supabase
      .channel("user-barcode-products-live")
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

  function handleProductFound(product) {
    setSelectedProduct(product);
  }

  function clearScan() {
    setSelectedProduct(null);
    setScannerKey((value) => value + 1);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setSelectedProduct(null);
    setScannerKey((value) => value + 1);
    await loadProducts();
    setIsRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="hidden min-h-screen w-[290px] shrink-0 bg-[#182232] text-white md:block">
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
          <p className="px-4 pb-1 pt-2 text-xs text-slate-400">เมนูพนักงาน</p>
          <Menu icon={<FaHome />} text="หน้าหลัก" href="/user/dashboard" />
          <Menu icon={<FaBox />} text="สินค้า" href="/user/products" />
          <Menu active icon={<FaBarcode />} text="สแกนบาร์โค้ด" href="/user/barcode" />
          <Menu icon={<FaArrowUp />} text="รับสินค้าเข้า" href="/user/stock-in" />
          <Menu icon={<FaShoppingCart />} text="ขายสินค้า" href="/user/sales" />
          <Menu icon={<FaChartBar />} text="รายงาน" href="/user/reports" />
          <div className="pt-5"><LogoutButton /></div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">สแกนบาร์โค้ดสินค้า</h1>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">พนักงาน</span>
            </div>
            <p className="mt-2 text-slate-500">ค้นหาและดูข้อมูลสินค้าจาก barcode โดยไม่แก้ไขข้อมูลในระบบ</p>
          </div>
          <AccountHeader />
        </header>

        {pageError && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{pageError}</div>}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">รับหมายเลขบาร์โค้ด</h2>
              <p className="mt-1 text-sm text-slate-500">ใช้เครื่องสแกนหรือพิมพ์ barcode แล้วกด Enter/ค้นหา</p>
            </div>
            <button type="button" onClick={handleRefresh} disabled={isRefreshing || isLoading} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-slate-700 disabled:opacity-60">
              <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} /> รีเฟรชข้อมูล
            </button>
          </div>

          <div className="mt-4" key={scannerKey}>
            <BarcodeProductSearch
              products={products}
              onProductFound={handleProductFound}
              onProductSelect={handleProductFound}
              successText={(product) => `พบสินค้า: ${product.name}`}
              disabled={isLoading || isRefreshing}
            />
          </div>

          <button type="button" onClick={clearScan} disabled={isLoading || isRefreshing} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <FaTimes /> ล้างข้อมูลสแกน
          </button>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600"><FaBarcode className="text-xl" /></div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">ข้อมูลสินค้าที่พบ</h2>
              <p className="mt-1 text-sm text-slate-500">ข้อมูลสินค้าจากระบบ</p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-500">กำลังโหลดข้อมูลสินค้า...</div>
          ) : selectedProduct ? (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Product code" value={selectedProduct.code} />
              <Info label="ชื่อสินค้า" value={selectedProduct.name} />
              <Info label="หมวดหมู่" value={selectedProduct.category} />
              <Info label="Barcode" value={selectedProduct.barcode || "ไม่มีบาร์โค้ด"} />
              <Info label="ราคา" value={`฿ ${selectedProduct.price.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
              <Info label="Stock" value={`${selectedProduct.stock} ${selectedProduct.unit}`} />
              <Info label="Unit" value={selectedProduct.unit} />
              <Info label="สถานะ" value={selectedProduct.status} />
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500">ยังไม่มีข้อมูลสินค้า กรุณาสแกนหรือค้นหา barcode</div>
          )}
        </section>
      </main>
    </div>
  );
}

function Menu({ icon, text, href, active }) {
  return <Link href={href} className={`flex w-full items-center gap-4 rounded-xl px-4 py-3.5 ${active ? "bg-red-600 text-white shadow-lg" : "text-slate-200 hover:bg-white/10"}`}><span className="text-lg">{icon}</span><span className="font-medium">{text}</span></Link>;
}

function Info({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 break-words font-semibold text-slate-900">{value}</p></div>;
}
