"use client";

import { useEffect, useRef, useState } from "react";
import {
  FaBarcode,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";

function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

export default function BarcodeProductSearch({
  products = [],
  onProductFound,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const [barcodeValue, setBarcodeValue] = useState("");
  const [scanStatus, setScanStatus] = useState({
    type: "idle",
    text: "พร้อมยิงบาร์โค้ดสินค้า",
  });

  useEffect(() => {
    if (disabled) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [disabled]);

  function focusScanner() {
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }

  function findProduct(value = barcodeValue) {
    const rawValue = String(value ?? "").trim();
    const scannedValue = normalizeValue(rawValue);

    if (!scannedValue) {
      setScanStatus({
        type: "error",
        text: "กรุณายิงบาร์โค้ดหรือกรอกรหัสสินค้าก่อน",
      });

      focusScanner();
      return;
    }

    const product = products.find(
      (item) =>
        normalizeValue(item.barcode) === scannedValue ||
        normalizeValue(item.code) === scannedValue
    );

    setBarcodeValue("");

    if (!product) {
      setScanStatus({
        type: "error",
        text: `ไม่พบสินค้า: ${rawValue}`,
      });

      focusScanner();
      return;
    }

    onProductFound?.(product);

    setScanStatus({
      type: "success",
      text: `พบสินค้า: ${product.name} · คงเหลือ ${product.stock} ${product.unit}`,
    });

    focusScanner();
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    findProduct(event.currentTarget.value);
  }

  const statusClass =
    scanStatus.type === "success"
      ? "bg-green-100 text-green-700"
      : scanStatus.type === "error"
      ? "bg-red-100 text-red-700"
      : "bg-white text-gray-600";

  return (
    <section className="mt-6 rounded-3xl border-2 border-dashed border-red-200 bg-red-50/60 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="flex-1">
          <label className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-900">
            <FaBarcode className="text-red-600" />
            ยิงบาร์โค้ดสินค้า
          </label>

          <input
            ref={inputRef}
            value={barcodeValue}
            onChange={(event) => setBarcodeValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoComplete="off"
            placeholder="คลิกช่องนี้ แล้วใช้เครื่องยิงบาร์โค้ด"
            className="w-full rounded-xl border bg-white px-5 py-4 text-lg text-gray-800 outline-none focus:border-red-500 disabled:bg-gray-100"
          />
        </div>

        <button
          type="button"
          onClick={() => findProduct()}
          disabled={disabled}
          className="rounded-xl bg-red-600 px-6 py-4 font-semibold text-white disabled:bg-red-300"
        >
          ค้นหาสินค้า
        </button>

        <button
          type="button"
          onClick={focusScanner}
          disabled={disabled}
          className="rounded-xl border border-red-300 bg-white px-6 py-4 font-semibold text-red-600 disabled:opacity-60"
        >
          พร้อมยิง
        </button>
      </div>

      <div
        className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${statusClass}`}
      >
        {scanStatus.type === "success" ? (
          <FaCheckCircle />
        ) : scanStatus.type === "error" ? (
          <FaExclamationCircle />
        ) : (
          <FaBarcode />
        )}

        <span>{scanStatus.text}</span>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        ใช้ได้กับเครื่องยิงบาร์โค้ด USB หรือ Bluetooth ที่ส่งปุ่ม Enter หลังรหัสสินค้า
      </p>
    </section>
  );
}