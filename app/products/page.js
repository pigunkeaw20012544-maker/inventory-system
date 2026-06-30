"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Barcode from "react-barcode";

import {
  FaBarcode,
  FaBox,
  FaBoxOpen,
  FaBoxes,
  FaChartBar,
  FaCheckCircle,
  FaEdit,
  FaExclamationTriangle,
  FaHistory,
  FaHome,
  FaPlus,
  FaPrint,
  FaSave,
  FaSearch,
  FaShoppingCart,
  FaSyncAlt,
  FaThLarge,
  FaTimes,
  FaTrash,
  FaUsers,
} from "react-icons/fa";

import AccountHeader from "../components/AccountHeader";
import BarcodeProductSearch from "../components/BarcodeProductSearch";
import LogoutButton from "../components/LogoutButton";
import { supabase } from "../lib/supabase";

const emptyForm = {
  product_code: "",
  barcode: "",
  name: "",
  category_id: "",
  price: "",
  stock: "",
  unit: "ชิ้น",
};

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

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [scannedProduct, setScannedProduct] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editingProduct, setEditingProduct] = useState(null);

  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");

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
        category_id,
        price,
        stock,
        unit,
        status,
        category:categories(name)
      `)
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setProducts([]);
      setPageError(
        error.message || "ไม่สามารถโหลดข้อมูลสินค้าจากฐานข้อมูลได้"
      );
      setIsLoading(false);
      return;
    }

    const mappedProducts = (data || []).map((product) => ({
      id: product.id,
      code: product.product_code || "-",
      barcode: product.barcode || "",
      name: product.name || "-",
      categoryId: product.category_id,
      category: getCategoryName(product.category),
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      unit: product.unit || "ชิ้น",
      status: product.status || getStatusFromStock(product.stock),
    }));

    setProducts(mappedProducts);
    setIsLoading(false);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setCategories(data || []);
  }

  useEffect(() => {
    void loadProducts();
    void loadCategories();

    const channel = supabase
      .channel("admin-products-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => void loadProducts()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
        },
        () => void loadCategories()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    if (!search) return products;

    return products.filter((product) =>
      [
        product.code,
        product.barcode,
        product.name,
        product.category,
        product.status,
      ].some((value) =>
        String(value || "").toLowerCase().includes(search)
      )
    );
  }, [keyword, products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((product) => Number(product.stock) <= 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(
      (product) =>
        Number(product.stock) > 0 && Number(product.stock) < 10
    );
  }, [products]);

  const totalStock = useMemo(() => {
    return products.reduce(
      (total, product) => total + Number(product.stock || 0),
      0
    );
  }, [products]);

  const readyProductCount = useMemo(() => {
    return products.filter((product) => Number(product.stock) > 0).length;
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((product) => Number(product.stock) < 10).length;
  }, [products]);

  const inventoryValue = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total + Number(product.price || 0) * Number(product.stock || 0),
      0
    );
  }, [products]);

  function handleBarcodeProductFound(product) {
    const currentProduct =
      products.find((item) => String(item.id) === String(product.id)) ||
      product;

    setScannedProduct(currentProduct);
    setKeyword(currentProduct.barcode || currentProduct.code || "");
  }

  function openBarcodeModal(product) {
    const selected = product || products[0];

    if (!selected) {
      alert("ยังไม่มีสินค้าในระบบ");
      return;
    }

    setSelectedProduct(selected);
    setShowBarcodeModal(true);
  }

  function openAddModal() {
    setModalMode("add");
    setEditingProduct(null);
    setFormData(emptyForm);
    setFormError("");
    setShowProductModal(true);
  }

  function openEditModal(product) {
    setModalMode("edit");
    setEditingProduct(product);
    setFormError("");

    setFormData({
      product_code: product.code,
      barcode: product.barcode || "",
      name: product.name,
      category_id: String(product.categoryId || ""),
      price: String(product.price || ""),
      stock: String(product.stock),
      unit: product.unit || "ชิ้น",
    });

    setShowProductModal(true);
  }

  function closeProductModal() {
    if (isSaving) return;

    setShowProductModal(false);
    setEditingProduct(null);
    setFormData(emptyForm);
    setFormError("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSaveProduct(event) {
    event.preventDefault();

    const productCode = formData.product_code.trim().toUpperCase();
    const barcode = formData.barcode.trim();
    const name = formData.name.trim();
    const categoryId = Number(formData.category_id);
    const price = Number(formData.price);
    const stock = Number(formData.stock);

    if (
      !productCode ||
      !barcode ||
      !name ||
      !formData.category_id ||
      formData.price === "" ||
      formData.stock === ""
    ) {
      setFormError("กรุณากรอกข้อมูลสินค้าให้ครบทุกช่อง");
      return;
    }

    if (
      !Number.isFinite(categoryId) ||
      !Number.isFinite(price) ||
      !Number.isInteger(stock) ||
      price < 0 ||
      stock < 0
    ) {
      setFormError(
        "ราคาขายต้องเป็นตัวเลข และจำนวนสต๊อกต้องเป็นจำนวนเต็ม 0 หรือมากกว่า"
      );
      return;
    }

    const payload = {
      product_code: productCode,
      barcode,
      name,
      category_id: categoryId,
      price,
      stock,
      unit: formData.unit.trim() || "ชิ้น",
      status: getStatusFromStock(stock),
    };

    setIsSaving(true);
    setFormError("");

    let error;

    if (modalMode === "add") {
      ({ error } = await supabase.from("products").insert(payload));
    } else {
      ({ error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editingProduct.id));
    }

    setIsSaving(false);

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        setFormError("รหัสสินค้าหรือบาร์โค้ดนี้มีอยู่ในระบบแล้ว");
      } else {
        setFormError(error.message || "บันทึกสินค้าไม่สำเร็จ");
      }

      return;
    }

    await loadProducts();
    closeProductModal();

    alert(
      modalMode === "add"
        ? "เพิ่มสินค้าสำเร็จ"
        : "แก้ไขสินค้าสำเร็จ"
    );
  }

  async function handleDeleteProduct(product) {
    const confirmed = window.confirm(
      `ต้องการลบสินค้า "${product.name}" (${product.code}) ใช่หรือไม่?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error(error);
      alert(error.message || "ลบสินค้าไม่สำเร็จ");
      return;
    }

    await loadProducts();
    alert("ลบสินค้าสำเร็จ");
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    setKeyword("");
    setScannedProduct(null);

    await Promise.all([loadProducts(), loadCategories()]);

    setIsRefreshing(false);
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

          <Menu active icon={<FaBox />} text="สินค้า" href="/products" />

          <Menu
            icon={<FaThLarge />}
            text="หมวดหมู่สินค้า"
            href="/categories"
          />

          <Menu
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
                จัดการสินค้า
              </h1>

              <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600">
                Admin
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              เพิ่ม แก้ไข ค้นหา และตรวจสอบสินค้าในคลัง
            </p>
          </div>

          <AccountHeader />
        </header>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openBarcodeModal()}
                className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 text-white hover:bg-slate-700"
              >
                <FaBarcode />
                สร้างบาร์โค้ด
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white hover:bg-red-700"
              >
                <FaPlus />
                เพิ่มสินค้า
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรช"}
              </button>
            </div>

            <div className="relative w-full 2xl:w-[380px]">
              <FaSearch className="absolute left-4 top-4 text-slate-400" />

              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="ค้นหาชื่อสินค้า / รหัส / บาร์โค้ด"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-800 outline-none focus:border-red-500 focus:bg-white"
              />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-red-100 bg-gradient-to-r from-red-50 to-white p-5">
          <div className="mb-4">
            <h2 className="font-bold text-slate-900">
              ค้นหาด้วยเครื่องยิงบาร์โค้ด
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              รองรับเครื่องยิงบาร์โค้ด USB และ Bluetooth
            </p>
          </div>

          <BarcodeProductSearch
            products={products}
            onProductFound={handleBarcodeProductFound}
          />
        </section>

        {outOfStockProducts.length > 0 && (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex gap-3">
              <FaExclamationTriangle className="mt-1 text-xl text-red-600" />

              <div>
                <h2 className="font-bold text-red-700">
                  สินค้าหมด {outOfStockProducts.length} รายการ
                </h2>

                <p className="mt-1 text-sm text-red-600">
                  {outOfStockProducts
                    .slice(0, 5)
                    .map((product) => product.name)
                    .join(", ")}
                </p>
              </div>
            </div>
          </section>
        )}

        {lowStockProducts.length > 0 && (
          <section className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <div className="flex gap-3">
              <FaExclamationTriangle className="mt-1 text-xl text-orange-600" />

              <div>
                <h2 className="font-bold text-orange-700">
                  สินค้าใกล้หมด {lowStockProducts.length} รายการ
                </h2>

                <p className="mt-1 text-sm text-orange-600">
                  {lowStockProducts
                    .slice(0, 5)
                    .map(
                      (product) =>
                        `${product.name} (${product.stock} ${product.unit})`
                    )
                    .join(", ")}
                </p>
              </div>
            </div>
          </section>
        )}

        {scannedProduct && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-xl bg-emerald-100 p-3 text-emerald-600">
                  <FaCheckCircle />
                </div>

                <div>
                  <p className="font-bold text-slate-900">
                    พบสินค้า: {scannedProduct.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    รหัสสินค้า {scannedProduct.code} · คงเหลือ{" "}
                    {scannedProduct.stock} {scannedProduct.unit}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openBarcodeModal(scannedProduct)}
                className="rounded-xl border border-emerald-300 bg-white px-5 py-3 text-emerald-700 hover:bg-emerald-100"
              >
                ดูบาร์โค้ดสินค้า
              </button>
            </div>
          </section>
        )}

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <StatCard
            title="สินค้าทั้งหมด"
            value={products.length.toLocaleString()}
            detail="รายการในระบบ"
            icon={<FaBoxes />}
            color="red"
          />

          <StatCard
            title="สินค้าพร้อมขาย"
            value={readyProductCount.toLocaleString()}
            detail={`คงเหลือรวม ${totalStock.toLocaleString()} ชิ้น`}
            icon={<FaBoxOpen />}
            color="green"
          />

          <StatCard
            title="สินค้าใกล้หมด"
            value={lowStockCount.toLocaleString()}
            detail="สต๊อกน้อยกว่า 10 ชิ้น"
            icon={<FaExclamationTriangle />}
            color="orange"
          />

          <StatCard
            title="มูลค่าสต๊อก"
            value={`฿ ${formatMoney(inventoryValue)}`}
            detail={`มี ${categories.length} หมวดหมู่`}
            icon={<FaBox />}
            color="blue"
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                รายการสินค้า
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                แสดง {filteredProducts.length} จาก {products.length} รายการ
              </p>
            </div>

            <p className="text-sm text-slate-500">
              ใช้ปุ่มดินสอเพื่อแก้ไขสินค้า
            </p>
          </div>

          {pageError && (
            <div className="m-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <FaExclamationTriangle className="mt-1 shrink-0" />
              <p>{pageError}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-6 py-4 text-left font-semibold">#</th>
                  <th className="px-6 py-4 text-left font-semibold">
                    รหัสสินค้า
                  </th>
                  <th className="px-6 py-4 text-left font-semibold">
                    ชื่อสินค้า
                  </th>
                  <th className="px-6 py-4 text-left font-semibold">
                    หมวดหมู่
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    ราคาขาย
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">
                    สต๊อก
                  </th>
                  <th className="px-6 py-4 text-left font-semibold">
                    สถานะ
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">
                    จัดการ
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      กำลังโหลดข้อมูลสินค้า...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredProducts.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 text-slate-400">
                        {index + 1}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs font-semibold text-slate-700">
                          {item.code}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">
                          {item.name}
                        </p>

                        <p className="mt-1 font-mono text-xs text-slate-400">
                          {item.barcode || "ไม่มีบาร์โค้ด"}
                        </p>
                      </td>

                      <td className="px-6 py-4">{item.category}</td>

                      <td className="px-6 py-4 text-right font-medium">
                        ฿ {formatMoney(item.price)}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                            Number(item.stock) <= 0
                              ? "bg-red-100 text-red-600"
                              : Number(item.stock) < 10
                              ? "bg-orange-100 text-orange-600"
                              : "bg-emerald-100 text-emerald-600"
                          }`}
                        >
                          {item.stock} {item.unit}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openBarcodeModal(item)}
                            className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:bg-slate-100"
                            title="ดูบาร์โค้ด"
                          >
                            <FaBarcode />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-600 hover:bg-blue-100"
                            title="แก้ไขสินค้า"
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(item)}
                            className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-600 hover:bg-red-100"
                            title="ลบสินค้า"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!isLoading && filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      ไม่พบสินค้าจากคำค้นหานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form
            onSubmit={handleSaveProduct}
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl md:p-8"
          >
            <button
              type="button"
              onClick={closeProductModal}
              className="absolute right-6 top-6 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <FaTimes className="text-xl" />
            </button>

            <h2 className="text-2xl font-bold text-slate-900">
              {modalMode === "add" ? "เพิ่มสินค้าใหม่" : "แก้ไขสินค้า"}
            </h2>

            <p className="mt-1 text-slate-500">
              กรอกข้อมูลให้ครบ แล้วกดบันทึกสินค้า
            </p>

            {formError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                {formError}
              </div>
            )}

            <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
              <InputField
                label="รหัสสินค้า"
                name="product_code"
                value={formData.product_code}
                onChange={handleFormChange}
                placeholder="เช่น BEV-0009"
              />

              <InputField
                label="บาร์โค้ด"
                name="barcode"
                value={formData.barcode}
                onChange={handleFormChange}
                placeholder="เช่น 8851234500098"
              />

              <InputField
                label="ชื่อสินค้า"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="ชื่อสินค้า"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  หมวดหมู่
                </label>

                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-red-500"
                >
                  <option value="">-- เลือกหมวดหมู่ --</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <InputField
                label="ราคาขาย (บาท)"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleFormChange}
                placeholder="0.00"
              />

              <InputField
                label="จำนวนสต๊อก"
                name="stock"
                type="number"
                min="0"
                step="1"
                value={formData.stock}
                onChange={handleFormChange}
                placeholder="0"
              />

              <InputField
                label="หน่วยนับ"
                name="unit"
                value={formData.unit}
                onChange={handleFormChange}
                placeholder="ชิ้น"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  สถานะสินค้า
                </label>

                <div className="flex h-[50px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
                  <StatusBadge
                    status={getStatusFromStock(formData.stock)}
                  />

                  <span className="ml-3 text-sm text-slate-500">
                    ระบบคำนวณจากจำนวนสต๊อกอัตโนมัติ
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeProductModal}
                className="rounded-xl border border-slate-200 px-5 py-3 text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white hover:bg-red-700 disabled:bg-red-300"
              >
                <FaSave />
                {isSaving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showBarcodeModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowBarcodeModal(false)}
              className="absolute right-6 top-6 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <FaTimes className="text-xl" />
            </button>

            <h2 className="text-2xl font-bold text-slate-900">
              สร้างบาร์โค้ดสินค้า
            </h2>

            <p className="mt-1 text-slate-500">
              เลือกสินค้า แล้วสามารถพิมพ์บาร์โค้ดได้
            </p>

            <select
              value={String(selectedProduct.id)}
              onChange={(event) => {
                const product = products.find(
                  (item) => String(item.id) === event.target.value
                );

                setSelectedProduct(product || null);
              }}
              className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-red-500"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.code} - {product.name}
                </option>
              ))}
            </select>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-lg font-bold text-slate-900">
                {selectedProduct.name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                รหัสสินค้า: {selectedProduct.code}
              </p>

              <div className="mt-5 inline-block rounded-xl bg-white p-5 shadow-sm">
                <Barcode
                  value={
                    selectedProduct.barcode ||
                    selectedProduct.code ||
                    "NO-CODE"
                  }
                  format="CODE128"
                  width={2}
                  height={90}
                  displayValue={true}
                  fontSize={16}
                  margin={0}
                />
              </div>

              <p className="mt-4 font-mono text-sm text-slate-500">
                {selectedProduct.barcode || selectedProduct.code}
              </p>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-slate-700 hover:bg-slate-50"
              >
                ปิด
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white hover:bg-red-700"
              >
                <FaPrint />
                พิมพ์บาร์โค้ด
              </button>
            </div>
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

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        step={step}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-red-500"
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const statusStyle = {
    มีสินค้า: "bg-emerald-100 text-emerald-700",
    พร้อมขาย: "bg-emerald-100 text-emerald-700",
    ใกล้หมด: "bg-orange-100 text-orange-700",
    หมด: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
        statusStyle[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ title, value, detail, icon, color }) {
  const styles = {
    red: {
      icon: "bg-red-100 text-red-600",
      line: "bg-red-500",
    },
    green: {
      icon: "bg-emerald-100 text-emerald-600",
      line: "bg-emerald-500",
    },
    orange: {
      icon: "bg-orange-100 text-orange-600",
      line: "bg-orange-500",
    },
    blue: {
      icon: "bg-blue-100 text-blue-600",
      line: "bg-blue-500",
    },
  };

  const style = styles[color] || styles.blue;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
    </div>
  );
}