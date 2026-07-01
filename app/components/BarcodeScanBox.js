"use client";

import { useEffect, useRef, useState } from "react";
import {
  FaBarcode,
  FaCheckCircle,
  FaExclamationCircle,
  FaKeyboard,
} from "react-icons/fa";

function normalizeScanValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

export default function BarcodeScanBox({
  products = [],
  onAddProduct,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const [scanValue, setScanValue] = useState("");
  const [scanStatus, setScanStatus] = useState({
    type: "idle",
    text: "พร้อมยิงบาร์โค้ดสินค้า",
  });

  useEffect(() => {
    if (disabled) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [disabled]);

  function focusScanner() {
    if (disabled) {
      return;
    }

    setScanErrorStatus();

    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 80);
  }

  function setScanErrorStatus() {
    setScanStatus({
      type: "idle",
      text: "พร้อมยิงบาร์โค้ดสินค้า",
    });
  }

  function handleScan(event) {
    if (event.key !== "Enter" && event.key !== "Tab") {
      return;
    }

    event.preventDefault();

    const rawCode = String(event.currentTarget.value ?? "").trim();
    const scannedCode = normalizeScanValue(rawCode);

    if (!scannedCode) {
      setScanStatus({
        type: "error",
        text: "กรุณายิงบาร์โค้ดหรือกรอกรหัสก่อน",
      });

      focusScanner();
      return;
    }

    const matchedProduct = products.find((product) =>
      [
        product.barcode,
        product.code,
        product.product_code,
        product.id,
      ].some(
        (value) => normalizeScanValue(value) === scannedCode
      )
    );

    setScanValue("");

    if (!matchedProduct) {
      setScanStatus({
        type: "error",
        text: `ไม่พบสินค้า: ${rawCode}`,
      });

      focusScanner();
      return;
    }

    if (Number(matchedProduct.stock || 0) <= 0) {
      setScanStatus({
        type: "error",
        text: `สินค้า "${matchedProduct.name}" หมดสต็อก`,
      });

      focusScanner();
      return;
    }

    const added = onAddProduct?.(matchedProduct);

    if (added === false) {
      setScanStatus({
        type: "error",
        text: `ไม่สามารถเพิ่มสินค้า "${matchedProduct.name}" ได้`,
      });

      focusScanner();
      return;
    }

    setScanStatus({
      type: "success",
      text: `เพิ่มสินค้าแล้ว: ${matchedProduct.name} · คงเหลือ ${matchedProduct.stock} ${matchedProduct.unit}`,
    });

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

  function handleChange(event) {
    setScanValue(event.target.value);

    if (scanStatus.type !== "idle") {
      setScanErrorStatus();
    }
  }

  const isError = scanStatus.type === "error";
  const isSuccess = scanStatus.type === "success";

  return (
    <div className="mt-5 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/60 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="flex-1">
          <label className="mb-2 flex items-center gap-2 text-base font-bold text-gray-800">
            <FaBarcode className="text-red-600" />
            ช่องยิงบาร์โค้ดสินค้า
          </label>

          <div className="relative">
            <FaBarcode className="pointer-events-none absolute left-4 top-4 text-gray-400" />

            <input
              ref={inputRef}
              value={scanValue}
              onChange={handleChange}
              onKeyDown={handleScan}
              disabled={disabled}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              placeholder="คลิกช่องนี้ แล้วใช้เครื่องยิงบาร์โค้ด"
              className="w-full rounded-xl border border-red-300 bg-white py-4 pl-12 pr-4 text-lg text-gray-800 outline-none focus:border-red-500 disabled:bg-gray-100"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={focusScanner}
          disabled={disabled}
          className="rounded-xl border border-red-300 bg-white px-7 py-4 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          พร้อมยิง
        </button>
      </div>

      <div
        className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
          isError
            ? "bg-red-100 text-red-700"
            : isSuccess
            ? "bg-green-100 text-green-700"
            : "bg-white text-gray-600"
        }`}
      >
        {isError ? (
          <FaExclamationCircle />
        ) : isSuccess ? (
          <FaCheckCircle />
        ) : (
          <FaKeyboard />
        )}

        <span>{scanStatus.text}</span>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        เสียบเครื่องยิงบาร์โค้ด USB แล้วกดพร้อมยิง จากนั้นยิงรหัสได้ทันที
      </p>
    </div>
  );
}