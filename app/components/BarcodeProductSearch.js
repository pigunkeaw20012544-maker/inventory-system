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

function getScanCandidates(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return [];
  }

  const candidates = [rawValue];

  try {
    const json = JSON.parse(rawValue);

    if (json && typeof json === "object") {
      ["barcode", "code", "product_code", "sku", "id"].forEach((key) => {
        if (json[key] !== undefined && json[key] !== null) {
          candidates.push(String(json[key]));
        }
      });
    }
  } catch {}

  try {
    const url = new URL(rawValue);

    ["barcode", "code", "product_code", "sku", "id"].forEach((key) => {
      const valueFromUrl = url.searchParams.get(key);

      if (valueFromUrl) {
        candidates.push(valueFromUrl);
      }
    });

    const pathParts = url.pathname.split("/").filter(Boolean);

    if (pathParts.length > 0) {
      candidates.push(decodeURIComponent(pathParts[pathParts.length - 1]));
    }
  } catch {}

  const labelMatch = rawValue.match(
    /(?:barcode|code|product_code|sku|id)\s*[:=]\s*["']?([^,\s}&"']+)/i
  );

  if (labelMatch?.[1]) {
    candidates.push(labelMatch[1]);
  }

  return [...new Set(candidates.map(normalizeValue).filter(Boolean))];
}

export default function BarcodeScanBox({
  products = [],
  onAddProduct,
  onProductFound,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const [barcodeValue, setBarcodeValue] = useState("");
  const [scanStatus, setScanStatus] = useState({
    type: "idle",
    text: "พร้อมยิงบาร์โค้ดหรือ QR Code",
  });

  const addProductHandler = onAddProduct || onProductFound;

  useEffect(() => {
    if (disabled) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [disabled]);

  function focusScanner() {
    if (disabled) {
      return;
    }

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  function findProduct(value = barcodeValue) {
    const rawValue = String(value ?? "").trim();
    const scanCandidates = getScanCandidates(rawValue);

    if (scanCandidates.length === 0) {
      setScanStatus({
        type: "error",
        text: "กรุณายิงบาร์โค้ดหรือ QR Code ก่อน",
      });

      focusScanner();
      return;
    }

    const product = products.find((item) => {
      const productValues = [
        item.barcode,
        item.code,
        item.product_code,
        item.sku,
        item.id,
      ]
        .map(normalizeValue)
        .filter(Boolean);

      return productValues.some((productValue) =>
        scanCandidates.includes(productValue)
      );
    });

    setBarcodeValue("");

    if (!product) {
      setScanStatus({
        type: "error",
        text: `ไม่พบสินค้า: ${rawValue}`,
      });

      focusScanner();
      return;
    }

    if (Number(product.stock || 0) <= 0) {
      setScanStatus({
        type: "error",
        text: `สินค้า ${product.name} หมดสต็อก`,
      });

      focusScanner();
      return;
    }

    if (!addProductHandler) {
      setScanStatus({
        type: "error",
        text: "ไม่พบฟังก์ชันเพิ่มสินค้าในหน้านี้",
      });

      focusScanner();
      return;
    }

    const result = addProductHandler(product);

    if (result === false) {
      setScanStatus({
        type: "error",
        text: `ไม่สามารถเพิ่มสินค้า: ${product.name}`,
      });

      focusScanner();
      return;
    }

    setScanStatus({
      type: "success",
      text: `เพิ่มสินค้าแล้ว: ${product.name} · คงเหลือ ${product.stock} ${product.unit}`,
    });

    focusScanner();
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter" && event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    findProduct(event.currentTarget.value);
  }

  function handleChange(event) {
    setBarcodeValue(event.target.value);

    if (scanStatus.type !== "idle") {
      setScanStatus({
        type: "idle",
        text: "พร้อมยิงบาร์โค้ดหรือ QR Code",
      });
    }
  }

  const statusClass =
    scanStatus.type === "success"
      ? "bg-emerald-100 text-emerald-700"
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
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onClick={focusScanner}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            placeholder="เสียบ USB แล้วคลิกช่องนี้เพื่อยิงบาร์โค้ด"
            className="w-full rounded-xl border bg-white px-5 py-4 text-lg text-gray-800 outline-none focus:border-red-500 disabled:bg-gray-100"
          />
        </div>

        <button
          type="button"
          onClick={() => findProduct()}
          disabled={disabled}
          className="rounded-xl bg-red-600 px-6 py-4 font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
        >
          ค้นหาสินค้า
        </button>

        <button
          type="button"
          onClick={focusScanner}
          disabled={disabled}
          className="rounded-xl border border-red-300 bg-white px-6 py-4 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
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
        รองรับเครื่องสแกน USB หรือ Bluetooth ที่ทำงานแบบคีย์บอร์ด และส่ง Enter หรือ Tab หลังยิงรหัส
      </p>
    </section>
  );
}