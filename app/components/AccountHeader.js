"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaBell,
  FaUser,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";
import { supabase } from "../lib/supabase";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function AccountHeader() {
  const pathname = usePathname();

  const [account, setAccount] = useState({
    name: "กำลังโหลด...",
    role: "user",
  });

  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("low");
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [alertError, setAlertError] = useState("");

  const productsPageHref = pathname.startsWith("/user")
    ? "/user/products"
    : "/products";

  async function loadAlerts() {
    setIsLoadingAlerts(true);
    setAlertError("");

    const { data, error } = await supabase
      .from("products")
      .select("id, name, stock, unit")
      .lt("stock", 10)
      .order("stock", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("โหลดแจ้งเตือนสินค้าไม่สำเร็จ:", error);
      setAlertError("ไม่สามารถโหลดข้อมูลแจ้งเตือนได้");
      setLowStockProducts([]);
      setOutOfStockProducts([]);
    } else {
      const allAlerts = data || [];

      setOutOfStockProducts(
        allAlerts.filter((product) => toNumber(product.stock) <= 0)
      );

      setLowStockProducts(
        allAlerts.filter(
          (product) =>
            toNumber(product.stock) > 0 && toNumber(product.stock) < 10
        )
      );
    }

    setIsLoadingAlerts(false);
  }

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      setAccount({
        name:
          profile?.display_name ||
          (profile?.role === "admin" ? "ผู้ดูแลระบบ" : "พนักงานขาย"),
        role: profile?.role || "user",
      });
    }

    loadAccount();
    loadAlerts();

    const timer = window.setInterval(loadAlerts, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  function handleBellClick() {
    const nextOpen = !isAlertOpen;

    setIsAlertOpen(nextOpen);

    if (nextOpen) {
      loadAlerts();
    }
  }

  const alertCount = lowStockProducts.length + outOfStockProducts.length;

  const displayedProducts =
    activeTab === "low" ? lowStockProducts : outOfStockProducts;

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <button
          type="button"
          onClick={handleBellClick}
          className="relative text-gray-700 hover:text-red-600 transition"
          title="แจ้งเตือนสินค้า"
          aria-label="แจ้งเตือนสินค้า"
        >
          <FaBell className="text-xl" />

          {alertCount > 0 && (
            <span className="absolute -top-3 -right-4 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </button>

        {isAlertOpen && (
  <div className="fixed right-6 top-24 z-50 w-[760px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border bg-white shadow-2xl">
    <div className="flex items-center justify-between border-b px-6 py-5">
      <div>
        <p className="text-xl font-bold text-gray-900">
          แจ้งเตือนสต็อกสินค้า
        </p>

        <p className="mt-1 text-base text-gray-500">
          รายการสินค้าที่เหลือน้อยกว่า 10 ชิ้น หรือสินค้าหมดแล้ว
        </p>
      </div>

      <button
        type="button"
        onClick={() => setIsAlertOpen(false)}
        className="rounded-lg p-2 text-xl text-gray-500 hover:bg-red-50 hover:text-red-600"
        title="ปิด"
      >
        <FaTimes />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-4 border-b p-5">
      <button
        type="button"
        onClick={() => setActiveTab("low")}
        className={`min-w-[320px] whitespace-nowrap rounded-xl px-5 py-4 text-base font-semibold transition ${
          activeTab === "low"
            ? "bg-orange-500 text-white"
            : "bg-orange-50 text-orange-600 hover:bg-orange-100"
        }`}
      >
        สินค้าใกล้หมด ({lowStockProducts.length})
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("out")}
        className={`whitespace-nowrap rounded-xl px-5 py-4 text-base font-semibold transition ${
          activeTab === "out"
            ? "bg-red-600 text-white"
            : "bg-red-50 text-red-600 hover:bg-red-100"
        }`}
      >
        สินค้าหมดแล้ว ({outOfStockProducts.length})
      </button>
    </div>

    <div className="max-h-[420px] overflow-y-auto">
      {isLoadingAlerts ? (
        <p className="p-7 text-center text-base text-gray-500">
          กำลังโหลดข้อมูล...
        </p>
      ) : alertError ? (
        <p className="p-7 text-center text-base text-red-600">
          {alertError}
        </p>
      ) : displayedProducts.length > 0 ? (
        displayedProducts.map((product) => {
          const stock = toNumber(product.stock);
          const isOutOfStock = stock <= 0;

          return (
            <div
              key={product.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-b px-6 py-5 last:border-b-0"
            >
              <div className="flex min-w-0 items-start gap-4">
                <FaExclamationTriangle
                  className={`mt-1 shrink-0 text-xl ${
                    isOutOfStock ? "text-red-600" : "text-orange-500"
                  }`}
                />

                <div className="min-w-0">
                  <p className="break-words text-lg font-semibold text-gray-900">
                    {product.name}
                  </p>

                  <p className="mt-2 text-base text-gray-500">
                    คงเหลือ {stock} {product.unit || "ชิ้น"}
                  </p>
                </div>
              </div>

              <span
                className={`whitespace-nowrap rounded-full px-4 py-2 text-base font-semibold ${
                  isOutOfStock
                    ? "bg-red-100 text-red-600"
                    : "bg-orange-100 text-orange-600"
                }`}
              >
                {isOutOfStock ? "หมดแล้ว" : "ใกล้หมด"}
              </span>
            </div>
          );
        })
      ) : (
        <p className="p-8 text-center text-base text-gray-500">
          {activeTab === "low"
            ? "ไม่มีสินค้าใกล้หมด"
            : "ไม่มีสินค้าที่หมดแล้ว"}
        </p>
      )}
    </div>

    <div className="border-t p-4">
      <Link
        href={productsPageHref}
        onClick={() => setIsAlertOpen(false)}
        className="block rounded-xl bg-gray-100 px-5 py-4 text-center text-base font-semibold text-gray-700 hover:bg-gray-200"
      >
        ไปจัดการสินค้า
      </Link>
    </div>
  </div>
)}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
          <FaUser />
        </div>

        <div>
          <p className="font-bold text-gray-900">{account.name}</p>
          <p className="text-sm text-gray-500">
            {account.role === "admin" ? "Administrator" : "User"}
          </p>
        </div>
      </div>
    </div>
  );
}