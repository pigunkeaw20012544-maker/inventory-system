"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Barcode from "react-barcode";

import {
  FaBars,
  FaArrowUp,
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
import BrandLogo from "../components/BrandLogo";
import BarcodeProductSearch from "../components/BarcodeProductSearch";
import LogoutButton from "../components/LogoutButton";
import { supabase } from "../lib/supabase";

const emptyForm = {
  product_code: "",
  barcode: "",
  name: "",
  category_id: "",
  cost_price: "",
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

function getGrossProfit(price, costPrice) {
  return Number(price || 0) - Number(costPrice || 0);
}

function getGrossMarginPercent(price, costPrice) {
  const salePrice = Number(price || 0);

  if (salePrice <= 0) {
    return null;
  }

  return (getGrossProfit(price, costPrice) / salePrice) * 100;
}

function getProfitClass(profit) {
  if (profit < 0) {
    return "text-red-600";
  }

  if (profit === 0) {
    return "text-slate-500";
  }

  return "text-emerald-600";
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageError, setPageError] = useState("");

  async function loadProducts() {
    setIsLoading(true);
    setPageError("");

    const [
      { data: productData, error: productError },
      { data: costData, error: costError },
    ] = await Promise.all([
      supabase
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
        .order("id", { ascending: true }),

      supabase
        .from("product_costs")
        .select("product_id, cost_price"),
    ]);

    if (productError || costError) {
      console.error(productError || costError);
      setProducts([]);
      setPageError(
        productError?.message ||
          costError?.message ||
          "ไม่สามารถโหลดข้อมูลสินค้าได้"
      );
      setIsLoading(false);
      return;
    }

    const costByProductId = new Map(
      (costData || []).map((item) => [
        String(item.product_id),
        Number(item.cost_price || 0),
      ])
    );

    const mappedProducts = (productData || []).map((product) => ({
      id: product.id,
      code: product.product_code || "-",
      barcode: product.barcode || "",
      name: product.name || "-",
      categoryId: product.category_id,
      category: getCategoryName(product.category),
      costPrice: costByProductId.get(String(product.id)) || 0,
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      unit: product.unit || "ชิ้น",
      status: getStatusFromStock(product.stock),
    }));

    const barcodeCounts = mappedProducts.reduce((counts, product) => {
      const barcode = String(product.barcode || "").trim();

      if (barcode) {
        counts[barcode] = (counts[barcode] || 0) + 1;
      }

      return counts;
    }, {});

    const duplicateBarcodes = Object.keys(barcodeCounts).filter(
      (barcode) => barcodeCounts[barcode] > 1
    );

    setProducts(mappedProducts);
    if (duplicateBarcodes.length > 0) {
      setPageError(
        `พบ barcode ซ้ำในฐานข้อมูล ${duplicateBarcodes.length} รายการ กรุณาตรวจสอบก่อนใช้งาน`
      );
    }
    setIsLoading(false);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, is_active")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setCategories(
      (data || []).map((category) => ({
        ...category,
        is_active: category.is_active === true,
      }))
    );
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
          table: "product_costs",
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

    return products.filter((product) =>
      (!search ||
        [
          product.code,
          product.barcode,
          product.name,
          product.category,
          product.status,
        ].some((value) =>
          String(value || "").toLowerCase().includes(search)
        )) &&
        (categoryFilter === "all" ||
          String(product.categoryId) === String(categoryFilter)) &&
        (statusFilter === "all" || product.status === statusFilter)
    );
  }, [categoryFilter, keyword, products, statusFilter]);

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
    return products.filter(
      (product) => Number(product.stock) > 0 && Number(product.stock) < 10
    ).length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter((product) => Number(product.stock) <= 0).length;
  }, [products]);

  const inventorySaleValue = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total + Number(product.price || 0) * Number(product.stock || 0),
      0
    );
  }, [products]);

  const inventoryCostValue = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total +
        Number(product.costPrice || 0) * Number(product.stock || 0),
      0
    );
  }, [products]);

  const expectedGrossProfit = useMemo(() => {
    return inventorySaleValue - inventoryCostValue;
  }, [inventorySaleValue, inventoryCostValue]);

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

  async function openAddModal() {
  await loadCategories();

  setModalMode("add");
  setEditingProduct(null);

  setFormData({
    ...emptyForm,
    barcode: "",
  });

  setFormError("");
  setShowProductModal(true);
}

  async function openEditModal(product) {
    await loadCategories();

    setModalMode("edit");
    setEditingProduct(product);
    setFormError("");

    setFormData({
      product_code: product.code,
      barcode: product.barcode || "",
      name: product.name,
      category_id: String(product.categoryId || ""),
      cost_price: String(product.costPrice || 0),
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

  async function findProductDuplicate(field, value, excludeId) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq(field, value)
      .limit(1);

    if (error) throw error;

    return (data || []).some(
      (product) => String(product.id) !== String(excludeId || "")
    );
  }

  async function createUniqueBarcode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const timestamp = Date.now().toString().slice(-11);
      const suffix = String(attempt).padStart(2, "0");
      const candidate = `${timestamp}${suffix}`;

      if (!(await findProductDuplicate("barcode", candidate))) {
        return candidate;
      }
    }

    throw new Error("ไม่สามารถสร้างบาร์โค้ดที่ไม่ซ้ำได้ กรุณาลองใหม่");
  }

  async function validateCategory(categoryId, allowInactiveCurrent) {
    const { data, error } = await supabase
      .from("categories")
      .select("id, is_active")
      .eq("id", categoryId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("ไม่พบหมวดหมู่สินค้าที่เลือก");

    if (!data.is_active && !allowInactiveCurrent) {
      throw new Error("หมวดหมู่นี้ถูกปิดใช้งาน ไม่สามารถใช้กับสินค้าใหม่ได้");
    }

    return data;
  }

  async function handleSaveProduct(event) {
  event.preventDefault();

  const productCode = formData.product_code.trim().toUpperCase();
  const barcode = formData.barcode.trim();
  const name = formData.name.trim();
  const categoryId = Number(formData.category_id);
  const costPrice = Number(formData.cost_price);
  const price = Number(formData.price);
  const stock = Number(formData.stock);
  const unit = formData.unit.trim();

  if (
    !productCode ||
    !name ||
    !formData.category_id ||
    formData.cost_price === "" ||
    formData.price === "" ||
    formData.stock === "" ||
    !unit
  ) {
    setFormError("กรุณากรอกชื่อสินค้า หมวดหมู่ ราคา ต้นทุน จำนวน และหน่วยให้ครบ");
    return;
  }

  if (
    !Number.isFinite(categoryId) ||
    !Number.isFinite(costPrice) ||
    !Number.isFinite(price) ||
    !Number.isInteger(stock) ||
    costPrice < 0 ||
    price < 0 ||
    stock < 0
  ) {
    setFormError(
      "ต้นทุนและราคาขายต้องเป็นตัวเลข และจำนวนสต็อกต้องเป็นจำนวนเต็ม 0 หรือมากกว่า"
    );
    return;
  }

  if (!Number.isInteger(categoryId) || stock < 0) {
    setFormError("หมวดหมู่และจำนวนสต็อกไม่ถูกต้อง");
    return;
  }

  if (!/^[-\wก-๙\s./]+$/.test(name)) {
    setFormError("ชื่อสินค้ามีอักขระที่ไม่รองรับ");
    return;
  }

  const productPayload = {
    product_code: productCode,
    name,
    category_id: categoryId,
    price,
    stock,
    unit,
    status: getStatusFromStock(stock),
  };

  setIsSaving(true);
  setFormError("");

  try {
    await validateCategory(
      categoryId,
      modalMode === "edit" &&
        String(categoryId) === String(editingProduct?.categoryId)
    );

    if (await findProductDuplicate("product_code", productCode, editingProduct?.id)) {
      throw new Error("รหัสสินค้านี้มีอยู่ในระบบแล้ว");
    }

    let savedProductId = editingProduct?.id;
    let savedBarcode = editingProduct?.barcode || "";
    const productBeforeEdit = editingProduct
      ? {
          product_code: editingProduct.code,
          barcode: editingProduct.barcode || null,
          name: editingProduct.name,
          category_id: editingProduct.categoryId,
          price: editingProduct.price,
          stock: editingProduct.stock,
          unit: editingProduct.unit,
          status: editingProduct.status,
        }
      : null;

    if (modalMode === "add") {
      savedBarcode = await createUniqueBarcode();
      productPayload.barcode = savedBarcode;
    } else if (barcode !== editingProduct.barcode) {
      if (!barcode) {
        throw new Error("สินค้าที่มีอยู่แล้วต้องคงบาร์โค้ดเดิมไว้");
      }

      if (await findProductDuplicate("barcode", barcode, editingProduct.id)) {
        throw new Error("บาร์โค้ดนี้มีอยู่ในระบบแล้ว");
      }

      productPayload.barcode = barcode;
      savedBarcode = barcode;
    }

    if (modalMode === "edit") {
      delete productPayload.stock;
    }

    if (modalMode === "add") {
      const { data, error } = await supabase
        .from("products")
        .insert(productPayload)
        .select("id, barcode")
        .single();

      if (error) {
        throw error;
      }

      savedProductId = data.id;
      savedBarcode = data.barcode || "";
    } else {
      const { error } = await supabase
        .from("products")
        .update(productPayload)
        .eq("id", editingProduct.id);

      if (error) {
        throw error;
      }
    }

    const { error: costError } = await supabase
      .from("product_costs")
      .upsert(
        {
          product_id: savedProductId,
          cost_price: costPrice,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "product_id",
        }
      );

    if (costError) {
      if (modalMode === "add" && savedProductId) {
        await supabase
          .from("products")
          .delete()
          .eq("id", savedProductId);
      } else if (modalMode === "edit" && productBeforeEdit) {
        await supabase
          .from("products")
          .update(productBeforeEdit)
          .eq("id", savedProductId);
      }

      throw costError;
    }

    await loadProducts();

    setShowProductModal(false);
    setEditingProduct(null);
    setFormData(emptyForm);
    setFormError("");

    alert(
      modalMode === "add"
        ? `เพิ่มสินค้าพร้อมราคาต้นทุนสำเร็จ
บาร์โค้ด: ${savedBarcode || "-"}`
        : "แก้ไขสินค้าพร้อมราคาต้นทุนสำเร็จ"
    );
  } catch (error) {
    console.error(error);

    if (error.code === "23505") {
      setFormError("รหัสสินค้าหรือบาร์โค้ดนี้มีอยู่ในระบบแล้ว");
    } else {
      setFormError(
        error.message || "บันทึกสินค้าและราคาต้นทุนไม่สำเร็จ"
      );
    }
  } finally {
    setIsSaving(false);
  }
}

async function handleDeleteProduct(product) {
  const confirmed = window.confirm(
    `ต้องการลบสินค้า "${product.name}" (${product.code}) ใช่หรือไม่?\n\nระบบจะตรวจประวัติรับเข้า เคลื่อนไหวสต็อก และการขายก่อนลบ`
  );

  if (!confirmed) return;

  const relationChecks = await Promise.all([
    supabase.from("stock_in").select("id").eq("product_id", product.id).limit(1),
    supabase
      .from("stock_movements")
      .select("id")
      .eq("product_id", product.id)
      .limit(1),
    supabase.from("sale_items").select("id").eq("product_id", product.id).limit(1),
  ]);

  const relationError = relationChecks.find((result) => result.error)?.error;

  if (relationError) {
    alert(
      relationError.message ||
        "ตรวจสอบประวัติสินค้าไม่สำเร็จ จึงยังไม่ดำเนินการลบ"
    );
    return;
  }

  const hasHistory = relationChecks.some(
    (result) => (result.data || []).length > 0
  );

  if (hasHistory) {
    alert(
      "ลบสินค้าไม่ได้ เพราะมีประวัติรับเข้า เคลื่อนไหวสต็อก หรือการขายอ้างอิงอยู่ ระบบไม่ลบประวัติเหล่านี้"
    );
    return;
  }

  const { data: existingCost, error: costReadError } = await supabase
    .from("product_costs")
    .select("product_id, cost_price, updated_at")
    .eq("product_id", product.id)
    .maybeSingle();

  if (costReadError) {
    alert(costReadError.message || "อ่านข้อมูลต้นทุนสินค้าไม่สำเร็จ");
    return;
  }

  const { error: deleteCostError } = await supabase
    .from("product_costs")
    .delete()
    .eq("product_id", product.id);

  if (deleteCostError) {
    alert(deleteCostError.message || "ลบข้อมูลต้นทุนสินค้าไม่สำเร็จ");
    return;
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", product.id);

  if (error) {
    if (existingCost) {
      await supabase.from("product_costs").upsert(existingCost, {
        onConflict: "product_id",
      });
    }

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
    setCategoryFilter("all");
    setStatusFilter("all");
    setScannedProduct(null);

    await Promise.all([loadProducts(), loadCategories()]);

    setIsRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-[290px] min-h-screen md:min-h-screen shrink-0 bg-[#182232] text-white overflow-y-auto">
        <div className="rounded-b-2xl md:rounded-br-[42px] bg-red-600 px-4 md:px-7 py-6 md:py-8 shadow-lg">
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

          <Menu icon={<FaArrowUp />} text="รับสินค้าเข้า" href="/stock-in" />

          <Menu
            icon={<FaHistory />}
            text="ประวัติสต๊อก"
            href="/stock-movements"
          />

          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />

          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />

          <div className="pt-5 hidden md:block w-full">
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
              เพิ่ม แก้ไข ตรวจสอบสินค้า ราคาต้นทุน และกำไรขั้นต้น
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
                aria-label="ดูบาร์โค้ดสินค้า"
              >
                <FaBarcode />
                ดูบาร์โค้ด
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

            <div className="flex flex-col gap-3 sm:flex-row 2xl:w-auto">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none focus:border-red-500"
                aria-label="กรองตามหมวดหมู่"
              >
                <option value="all">ทุกหมวดหมู่</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none focus:border-red-500"
                aria-label="กรองตามสถานะสินค้า"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="มีสินค้า">มีสินค้า</option>
                <option value="ใกล้หมด">ใกล้หมด</option>
                <option value="หมด">หมด</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-red-100 bg-gradient-to-r from-red-50 to-white p-5">
          <div className="mb-4">
            <h2 className="font-bold text-slate-900">
              ค้นหาด้วยเครื่องสแกนบาร์โค้ด
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              รองรับเครื่องสแกนบาร์โค้ดแบบ USB หรือ Bluetooth
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

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-6">
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
            title="สินค้าหมด"
            value={outOfStockCount.toLocaleString()}
            detail="ต้องตรวจสอบหรือเติมสินค้า"
            icon={<FaExclamationTriangle />}
            color="red"
          />

          <StatCard
            title="ต้นทุนสินค้าคงเหลือ"
            value={`฿ ${formatMoney(inventoryCostValue)}`}
            detail="คำนวณจากต้นทุน × สต๊อก"
            icon={<FaBox />}
            color="purple"
          />

          <StatCard
            title="กำไรขั้นต้นคงเหลือ"
            value={`฿ ${formatMoney(expectedGrossProfit)}`}
            detail="ราคาขาย - ต้นทุน ยังไม่รวมค่าใช้จ่ายอื่น"
            icon={<FaChartBar />}
            color="blue"
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                รายการสินค้าและกำไรขั้นต้น
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                แสดง {filteredProducts.length} จาก {products.length} รายการ
              </p>
            </div>

            <p className="text-sm text-slate-500">
              ราคาต้นทุนและกำไรเห็นเฉพาะผู้ดูแลระบบ
            </p>
          </div>

          {pageError && (
            <div className="m-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <FaExclamationTriangle className="mt-1 shrink-0" />
              <p>{pageError}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] text-sm">
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
                  <th className="px-5 py-4 text-right font-semibold">
                    ราคาต้นทุน
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    ราคาขาย
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    กำไร/หน่วย
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    กำไรขั้นต้น %
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    สต๊อก
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    สถานะ
                  </th>
                  <th className="px-5 py-4 text-center font-semibold">
                    จัดการ
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-6 py-14 text-center text-slate-500"
                    >
                      กำลังโหลดข้อมูลสินค้า...
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredProducts.map((item, index) => {
                    const profit = getGrossProfit(
                      item.price,
                      item.costPrice
                    );

                    const margin = getGrossMarginPercent(
                      item.price,
                      item.costPrice
                    );

                    return (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-slate-400">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs font-semibold text-slate-700">
                            {item.code}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {item.name}
                          </p>

                          <p className="mt-1 font-mono text-xs text-slate-400">
                            {item.barcode || "ไม่มีบาร์โค้ด"}
                          </p>
                        </td>

                        <td className="px-5 py-4">{item.category}</td>

                        <td className="px-5 py-4 text-right font-medium text-slate-700">
                          ฿ {formatMoney(item.costPrice)}
                        </td>

                        <td className="px-5 py-4 text-right font-medium">
                          ฿ {formatMoney(item.price)}
                        </td>

                        <td
                          className={`px-5 py-4 text-right font-bold ${getProfitClass(
                            profit
                          )}`}
                        >
                          ฿ {formatMoney(profit)}
                        </td>

                        <td
                          className={`px-5 py-4 text-right font-bold ${getProfitClass(
                            profit
                          )}`}
                        >
                          {margin === null ? "-" : `${margin.toFixed(1)}%`}
                        </td>

                        <td className="px-5 py-4 text-center">
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

                        <td className="px-5 py-4">
                          <StatusBadge status={item.status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openBarcodeModal(item)}
                              className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:bg-slate-100"
                              title="ดูบาร์โค้ด"
                              aria-label="ดูบาร์โค้ดสินค้า"
                            >
                              <FaBarcode />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-600 hover:bg-blue-100"
                              title="แก้ไขสินค้า ต้นทุน และราคาขาย"
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
                    );
                  })}

                {!isLoading && filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan="11"
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
              กรอกข้อมูลสินค้า ต้นทุน และราคาขายให้ครบ
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

             <div>
  <label className="mb-2 block text-sm font-medium text-slate-700">
    บาร์โค้ด
  </label>

  <input
    value={
      modalMode === "add"
        ? "ระบบจะสร้างบาร์โค้ดอัตโนมัติเมื่อบันทึก"
        : formData.barcode || "-"
    }
    readOnly
    className="w-full cursor-default rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 font-mono text-slate-700 outline-none"
  />

  <p className="mt-2 text-xs text-slate-500">
    ระบบสร้างเลขบาร์โค้ด 13 หลักที่ไม่ซ้ำกันให้อัตโนมัติ
  </p>
</div>

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

                  {categories
                    .filter(
                      (category) =>
                        category.is_active === true ||
                        String(category.id) === String(formData.category_id)
                    )
                    .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.is_active !== true ? " (ปิดใช้งาน)" : ""}
                    </option>
                    ))}
                </select>
              </div>

              <InputField
                label="ราคาต้นทุน (บาท)"
                name="cost_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_price}
                onChange={handleFormChange}
                placeholder="0.00"
              />

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
                disabled={modalMode === "edit"}
              />

              {modalMode === "edit" && (
                <p className="-mt-3 text-xs text-slate-500 md:col-span-2">
                  สต็อกของสินค้าที่มีอยู่แล้วต้องปรับผ่าน Process 6 เพื่อรักษาประวัติการเคลื่อนไหว
                </p>
              )}

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

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm text-emerald-700">
                  กำไรขั้นต้นต่อหน่วย
                </p>

                <p
                  className={`mt-1 text-xl font-bold ${getProfitClass(
                    getGrossProfit(formData.price, formData.cost_price)
                  )}`}
                >
                  ฿{" "}
                  {formatMoney(
                    getGrossProfit(formData.price, formData.cost_price)
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  กำไรขั้นต้น{" "}
                  {getGrossMarginPercent(
                    formData.price,
                    formData.cost_price
                  ) === null
                    ? "-"
                    : `${getGrossMarginPercent(
                        formData.price,
                        formData.cost_price
                      ).toFixed(1)}%`}
                </p>
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
          <div className="barcode-print-area relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowBarcodeModal(false)}
              className="absolute right-6 top-6 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="ปิดตัวอย่างบาร์โค้ด"
            >
              <FaTimes className="text-xl" />
            </button>

            <h2 className="text-2xl font-bold text-slate-900">
              แสดงบาร์โค้ดสินค้า
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
                {selectedProduct.barcode ? (
                  <Barcode
                    value={selectedProduct.barcode}
                    format="CODE128"
                    width={2}
                    height={90}
                    displayValue={true}
                    fontSize={16}
                    margin={0}
                  />
                ) : (
                  <p className="px-8 py-8 text-sm font-semibold text-amber-700">
                    สินค้านี้ยังไม่มีบาร์โค้ด
                  </p>
                )}
              </div>

              <p className="mt-4 font-mono text-sm text-slate-500">
                {selectedProduct.barcode || "ไม่มีบาร์โค้ด"}
              </p>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-slate-700 hover:bg-slate-50"
                aria-label="ปิดตัวอย่างบาร์โค้ด"
              >
                ปิด
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                disabled={!selectedProduct.barcode}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white hover:bg-red-700"
                aria-label="พิมพ์บาร์โค้ดสินค้า"
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

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
  disabled = false,
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
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-red-500 disabled:cursor-not-allowed disabled:bg-slate-100"
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
    purple: {
      icon: "bg-violet-100 text-violet-600",
      line: "bg-violet-500",
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