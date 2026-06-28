"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import LogoutButton from "../../components/LogoutButton";
import AccountHeader from "../../components/AccountHeader";

import {
  FaBarcode,
  FaBox,
  FaBoxOpen,
  FaChartBar,
  FaCheckCircle,
  FaExclamationTriangle,
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

function getCategoryName(category) {
  if (Array.isArray(category)) {
    return category[0]?.name || "-";
  }

  return category?.name || "-";
}

function getStatusFromStock(stock) {
  const quantity = Number(stock || 0);

  if (quantity <= 0) return "หมด";
  if (quantity < 10) return "ใกล้หมด";

  return "มีสินค้า";
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getReceiveResult(data) {
  if (Array.isArray(data)) {
    return data[0] || {};
  }

  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  return data || {};
}

export default function UserProductsPage() {
  const barcodeInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [keyword, setKeyword] = useState("");

  const [barcodeValue, setBarcodeValue] = useState("");
  const [scanMessage, setScanMessage] = useState(
    "พร้อมยิงบาร์โค้ดสินค้า"
  );
  const [scanError, setScanError] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveProductId, setReceiveProductId] = useState("");
  const [receiveQuantity, setReceiveQuantity] = useState("");
  const [receiveNote, setReceiveNote] = useState("");
  const [receiveError, setReceiveError] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  async function loadProducts() {
    setIsLoading(true);

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
      .order("id", { ascending: true });

    setIsLoading(false);

    if (error) {
      console.error(error);
      alert(error.message || "ไม่สามารถโหลดข้อมูลสินค้าได้");
      return;
    }

    const mappedProducts = (data || []).map((product) => ({
      id: product.id,
      code: product.product_code || "-",
      barcode: product.barcode || "",
      name: product.name || "-",
      category: getCategoryName(product.category),
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      unit: product.unit || "ชิ้น",
      status: product.status || getStatusFromStock(product.stock),
    }));

    setProducts(mappedProducts);
  }

  useEffect(() => {
    void loadProducts();

    const channel = supabase
      .channel("user-products-live")
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

  const filteredProducts = useMemo(() => {
    const search = normalizeValue(keyword);

    if (!search) return products;

    return products.filter((product) =>
      [
        product.code,
        product.barcode,
        product.name,
        product.category,
        product.status,
      ].some((value) => normalizeValue(value).includes(search))
    );
  }, [products, keyword]);

  const selectedReceiveProduct = useMemo(() => {
    return (
      products.find(
        (product) => String(product.id) === String(receiveProductId)
      ) || null
    );
  }, [products, receiveProductId]);

  function findProduct(value) {
    const search = normalizeValue(value);

    if (!search) return null;

    return (
      products.find(
        (product) =>
          normalizeValue(product.barcode) === search ||
          normalizeValue(product.code) === search ||
          normalizeValue(product.name).includes(search)
      ) || null
    );
  }

  function focusBarcodeInput() {
    window.setTimeout(() => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    }, 50);
  }

  function openDetail(product) {
    setSelectedProduct(product);
    setShowDetail(true);
  }

  function handleBarcodeKeyDown(event) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const scannedValue = barcodeValue.trim();

    if (!scannedValue) {
      setScanError(true);
      setScanMessage("กรุณายิงบาร์โค้ด หรือกรอกรหัสสินค้า");
      focusBarcodeInput();
      return;
    }

    const product = findProduct(scannedValue);

    if (!product) {
      setScanError(true);
      setScanMessage(`ไม่พบสินค้า: ${scannedValue}`);
      setBarcodeValue("");
      focusBarcodeInput();
      return;
    }

    setScanError(false);
    setScanMessage(
      `พบสินค้า: ${product.name} · คงเหลือ ${product.stock} ${product.unit}`
    );

    setBarcodeValue("");
    openDetail(product);
    focusBarcodeInput();
  }

  function handleSearch(event) {
    event.preventDefault();

    const value = keyword.trim();

    if (!value) {
      setSelectedProduct(null);
      setShowDetail(true);
      return;
    }

    const product = findProduct(value);

    setSelectedProduct(product);
    setShowDetail(true);
  }

  function openReceiveModal(product = null) {
    setReceiveProductId(product ? String(product.id) : "");
    setReceiveQuantity("");
    setReceiveNote("");
    setReceiveError("");
    setShowReceiveModal(true);
  }

  function closeReceiveModal() {
    if (isReceiving) return;

    setShowReceiveModal(false);
    setReceiveProductId("");
    setReceiveQuantity("");
    setReceiveNote("");
    setReceiveError("");
  }

  async function handleReceiveStock(event) {
    event.preventDefault();

    const productId = Number(receiveProductId);
    const quantity = Number(receiveQuantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      setReceiveError("กรุณาเลือกสินค้าที่ต้องการรับเข้า");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setReceiveError("จำนวนรับสินค้าเข้าต้องเป็นจำนวนเต็มมากกว่า 0");
      return;
    }

    const productBeforeReceive = selectedReceiveProduct;

    setIsReceiving(true);
    setReceiveError("");

    const { data, error } = await supabase.rpc("receive_stock", {
      p_product_id: productId,
      p_quantity: quantity,
      p_note: receiveNote.trim() || null,
    });

    setIsReceiving(false);

    if (error) {
      console.error(error);
      setReceiveError(error.message || "รับสินค้าเข้าไม่สำเร็จ");
      return;
    }

    const result = getReceiveResult(data);
    const returnedStock = Number(result.stock_after);

    const stockAfter = Number.isFinite(returnedStock)
      ? returnedStock
      : Number(productBeforeReceive?.stock || 0) + quantity;

    await loadProducts();

    setSelectedProduct((previous) => {
      if (!previous || String(previous.id) !== String(productId)) {
        return previous;
      }

      return {
        ...previous,
        stock: stockAfter,
        status: getStatusFromStock(stockAfter),
      };
    });

    closeReceiveModal();

    alert(
      `${result.message || "รับสินค้าเข้าสำเร็จ"}\nสินค้า: ${
        productBeforeReceive?.name || "-"
      }\nคงเหลือ: ${stockAfter} ${
        productBeforeReceive?.unit || "ชิ้น"
      }`
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">
      <aside className="w-[300px] shrink-0 bg-[#111b2b] text-white min-h-screen">
        <div className="bg-red-600 p-8 rounded-br-[45px]">
          <div className="text-3xl">🥤</div>

          <h2 className="font-bold mt-3 text-lg">
            ระบบบริหารจัดการ
          </h2>

          <p className="text-sm">
            ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
          </p>
        </div>

        <nav className="p-5 space-y-4">
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
            text="การขาย"
            href="/user/sales"
          />

          <Menu
            icon={<FaChartBar />}
            text="รายงาน"
            href="/user/reports"
          />

          <LogoutButton />
        </nav>
      </aside>

      <main className="flex-1 min-w-0 p-6 xl:p-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:justify-between lg:items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              สินค้า
            </h1>

            <p className="text-gray-500 mt-2">
              Products &gt; สินค้า
            </p>
          </div>

          <AccountHeader />
        </header>

        <section className="bg-white rounded-3xl border shadow-sm p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                ค้นหาและตรวจสอบสินค้า
              </h2>

              <p className="text-gray-500 mt-2">
                User ค้นหาสินค้า ยิงบาร์โค้ด และรับสินค้าเข้าได้
                แต่ไม่สามารถเพิ่มสินค้าใหม่ได้
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openReceiveModal()}
                className="border border-red-600 text-red-600 px-6 py-4 rounded-xl flex items-center gap-3 hover:bg-red-50"
              >
                <FaPlus />
                รับสินค้าเข้า
              </button>

              <button
                type="button"
                onClick={() => void loadProducts()}
                disabled={isLoading}
                className="bg-red-600 text-white px-6 py-4 rounded-xl flex items-center gap-3 disabled:bg-red-300"
              >
                <FaSyncAlt className={isLoading ? "animate-spin" : ""} />
                รีเฟรชข้อมูล
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-red-200 bg-red-50 p-5">
            <label className="flex items-center gap-2 font-bold text-gray-800 mb-3">
              <FaBarcode className="text-red-600" />
              ยิงบาร์โค้ดสินค้า
            </label>

            <input
              ref={barcodeInputRef}
              value={barcodeValue}
              onChange={(event) => setBarcodeValue(event.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              autoComplete="off"
              placeholder="คลิกช่องนี้ แล้วใช้เครื่องยิงบาร์โค้ด"
              className="w-full rounded-xl border bg-white px-5 py-4 text-lg text-gray-800 outline-none focus:border-red-500"
            />

            <div
              className={`mt-3 rounded-xl px-4 py-3 text-sm ${
                scanError
                  ? "bg-red-100 text-red-700"
                  : "bg-white text-gray-600"
              }`}
            >
              {scanMessage}
            </div>

            <p className="mt-3 text-sm text-gray-500">
              รองรับเครื่องยิงบาร์โค้ด USB หรือ Bluetooth
              ที่ส่งปุ่ม Enter หลังรหัสสินค้า
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="mt-6 flex flex-col md:flex-row gap-4"
          >
            <div className="relative flex-1">
              <FaSearch className="absolute left-5 top-5 text-gray-500" />

              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="ค้นหาด้วยชื่อสินค้า / รหัสสินค้า"
                className="w-full border-2 border-gray-300 focus:border-red-500 rounded-xl py-4 pl-12 pr-5 outline-none text-gray-800"
              />
            </div>

            <button
              type="submit"
              className="bg-red-600 text-white px-8 py-4 rounded-xl flex items-center justify-center gap-3"
            >
              <FaSearch />
              ค้นหาสินค้า
            </button>
          </form>
        </section>

        <section className="mt-8 bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-gray-900">
              รายการสินค้า
            </h2>

            <p className="text-gray-500">
              ทั้งหมด {filteredProducts.length} รายการ
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-gray-800">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-4 text-left">รหัสสินค้า</th>
                  <th className="p-4 text-left">ชื่อสินค้า</th>
                  <th className="p-4 text-left">หมวดหมู่</th>
                  <th className="p-4 text-left">ราคาขาย</th>
                  <th className="p-4 text-left">สต๊อก</th>
                  <th className="p-4 text-left">บาร์โค้ด</th>
                  <th className="p-4 text-center">รายละเอียด</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b">
                    <td className="p-4">{product.code}</td>

                    <td className="p-4 font-medium">
                      {product.name}
                    </td>

                    <td className="p-4">
                      {product.category}
                    </td>

                    <td className="p-4">
                      {formatMoney(product.price)} บาท
                    </td>

                    <td className="p-4">
                      {product.stock} {product.unit}
                    </td>

                    <td className="p-4 font-mono text-sm">
                      {product.barcode || "-"}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => openDetail(product)}
                        className="border border-red-500 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
                      >
                        ดูสินค้า
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-10 text-center text-gray-500"
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

      {showReceiveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleReceiveStock}
            className="bg-white w-full max-w-xl rounded-3xl p-7 md:p-8 relative"
          >
            <button
              type="button"
              onClick={closeReceiveModal}
              className="absolute top-5 right-5 text-gray-500 hover:text-red-600"
            >
              <FaTimes className="text-2xl" />
            </button>

            <h2 className="text-2xl font-bold text-gray-900">
              รับสินค้าเข้า
            </h2>

            <p className="text-gray-500 mt-2">
              เลือกสินค้าที่มีอยู่แล้ว และระบุจำนวนที่รับเข้า
            </p>

            {receiveError && (
              <div className="mt-5 rounded-xl bg-red-50 border border-red-200 text-red-600 px-4 py-3">
                {receiveError}
              </div>
            )}

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                สินค้า
              </label>

              <select
                value={receiveProductId}
                onChange={(event) => setReceiveProductId(event.target.value)}
                className="w-full border rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-red-500"
              >
                <option value="">-- เลือกสินค้า --</option>

                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.name} (คงเหลือ{" "}
                    {product.stock} {product.unit})
                  </option>
                ))}
              </select>
            </div>

            {selectedReceiveProduct && (
              <div className="mt-4 rounded-xl bg-gray-50 border p-4">
                <p className="font-semibold text-gray-900">
                  {selectedReceiveProduct.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  รหัสสินค้า: {selectedReceiveProduct.code} · คงเหลือ{" "}
                  {selectedReceiveProduct.stock}{" "}
                  {selectedReceiveProduct.unit}
                </p>
              </div>
            )}

            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จำนวนรับเข้า
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={receiveQuantity}
                onChange={(event) => setReceiveQuantity(event.target.value)}
                placeholder="เช่น 50"
                className="w-full border rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-red-500"
              />
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                หมายเหตุ
              </label>

              <textarea
                value={receiveNote}
                onChange={(event) => setReceiveNote(event.target.value)}
                placeholder="เช่น รับจากร้านค้าส่ง"
                rows="3"
                className="w-full border rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={closeReceiveModal}
                className="border px-5 py-3 rounded-xl text-gray-700"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isReceiving}
                className="bg-red-600 text-white px-5 py-3 rounded-xl flex items-center gap-2 disabled:bg-red-300"
              >
                <FaSave />
                {isReceiving ? "กำลังบันทึก..." : "บันทึกรับสินค้า"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 relative">
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="absolute top-5 right-5 text-gray-500 hover:text-red-600"
            >
              <FaTimes className="text-2xl" />
            </button>

            {selectedProduct ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                    <FaBoxOpen className="text-2xl" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      ข้อมูลสินค้า
                    </h2>

                    <p className="text-gray-500">
                      {selectedProduct.code}
                    </p>
                  </div>
                </div>

                <div className="mt-7 border rounded-2xl p-5">
                  <p className="text-xl font-bold text-gray-900">
                    {selectedProduct.name}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-5 text-gray-700">
                    <Info
                      label="หมวดหมู่"
                      value={selectedProduct.category}
                    />

                    <Info
                      label="ราคาขาย"
                      value={`${formatMoney(selectedProduct.price)} บาท`}
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

                  <div className="mt-5">
                    <StatusBadge status={selectedProduct.status} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowDetail(false);
                    openReceiveModal(selectedProduct);
                  }}
                  className="mt-5 w-full border border-red-300 text-red-600 py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <FaPlus />
                  รับสินค้าเข้ารายการนี้
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <FaExclamationTriangle className="text-5xl text-orange-500 mx-auto" />

                <h2 className="text-2xl font-bold text-gray-900 mt-5">
                  ไม่พบสินค้า
                </h2>

                <p className="text-gray-500 mt-2">
                  ไม่พบข้อมูลจากบาร์โค้ดหรือรหัสสินค้านี้
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="mt-7 w-full bg-red-600 text-white py-3 rounded-xl"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Menu({ icon, text, href, active }) {
  return (
    <Link
      href={href}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl whitespace-nowrap ${
        active ? "bg-red-600 shadow-lg" : "hover:bg-white/10"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-semibold mt-1 break-words">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusStyle = {
    มีสินค้า: "bg-green-100 text-green-600",
    พร้อมขาย: "bg-green-100 text-green-600",
    ใกล้หมด: "bg-orange-100 text-orange-600",
    หมด: "bg-red-100 text-red-600",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
        statusStyle[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      <FaCheckCircle />
      {status}
    </span>
  );
}