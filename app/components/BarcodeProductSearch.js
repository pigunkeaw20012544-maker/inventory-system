"use client";

import { useRef, useState } from "react";
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

export default function BarcodeProductSearch({
  products = [],
  onAddProduct,
  onProductFound,
  onProductSelect,
  successText,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const [barcodeValue, setBarcodeValue] = useState("");
  const [scanStatus, setScanStatus] = useState({
    type: "idle",
    text: "พร้อมสแกนบาร์โค้ดหรือ QR Code",
  });
  const [matches, setMatches] = useState([]);
  const processingRef = useRef(false);
  const lastScanRef = useRef({ value: "", timestamp: 0 });

  const addProductHandler = onAddProduct || onProductFound;

  function focusScanner() {
    if (disabled) {
      return;
    }

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  function findProduct(value = barcodeValue) {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;
    const rawValue = String(value ?? "").trim();

    if (
      rawValue &&
      rawValue === lastScanRef.current.value &&
      Date.now() - lastScanRef.current.timestamp < 500
    ) {
      processingRef.current = false;
      return;
    }

    lastScanRef.current = { value: rawValue, timestamp: Date.now() };
    const scanCandidates = getScanCandidates(rawValue);

    if (scanCandidates.length === 0) {
      setScanStatus({
        type: "error",
        text: "กรุณาสแกนบาร์โค้ดหรือ QR Code ก่อน",
      });

      focusScanner();
      processingRef.current = false;
      return;
    }

    const exactMatches = products.filter((item) => {
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

    const partialMatches = products.filter((item) =>
      [item.name, item.code, item.product_code, item.barcode]
        .map(normalizeValue)
        .some((productValue) => productValue.includes(normalizeValue(rawValue)))
    );

    const matchingProducts = exactMatches.length > 0 ? exactMatches : partialMatches;

    setBarcodeValue("");
    setMatches(matchingProducts);

    if (matchingProducts.length === 0) {
      setScanStatus({
        type: "error",
        text: `ไม่พบสินค้า: ${rawValue}`,
      });

      focusScanner();
      processingRef.current = false;
      return;
    }

    const barcodeMatches = exactMatches.filter(
      (item) => normalizeValue(item.barcode) === normalizeValue(rawValue)
    );

    if (barcodeMatches.length > 1) {
      setScanStatus({
        type: "error",
        text: "พบ barcode ซ้ำในฐานข้อมูล กรุณาตรวจสอบข้อมูลสินค้า",
      });

      focusScanner();
      processingRef.current = false;
      return;
    }

    const product = matchingProducts[0];

    if (exactMatches.length !== 1) {
      setScanStatus({
        type: "success",
        text: `พบสินค้า ${matchingProducts.length} รายการ กรุณาเลือกจากผลการค้นหา`,
      });
      focusScanner();
      processingRef.current = false;
      return;
    }

    if (!addProductHandler) {
      setScanStatus({
        type: "error",
        text: "ไม่พบฟังก์ชันเพิ่มสินค้าในหน้านี้",
      });

      focusScanner();
      processingRef.current = false;
      return;
    }

    const result = addProductHandler(product);

    if (result === false) {
      setScanStatus({
        type: "error",
        text: `ไม่สามารถเพิ่มสินค้า: ${product.name}`,
      });

      focusScanner();
      processingRef.current = false;
      return;
    }

    setScanStatus({
      type: "success",
      text:
        successText?.(product) ||
        `เพิ่มสินค้าแล้ว: ${product.name} · คงเหลือ ${product.stock} ${product.unit}`,
    });

    focusScanner();
    processingRef.current = false;
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
    setMatches([]);

    if (scanStatus.type !== "idle") {
      setScanStatus({
        type: "idle",
        text: "พร้อมสแกนบาร์โค้ดหรือ QR Code",
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
            สแกนบาร์โค้ดสินค้า
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
            placeholder="เชื่อมต่อเครื่องสแกน แล้วสแกนบาร์โค้ดสินค้า"
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
          พร้อมสแกน
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
        รองรับเครื่องสแกนบาร์โค้ดแบบ USB หรือ Bluetooth และรับข้อมูลด้วยปุ่ม Enter หรือ Tab หลังการสแกน
      </p>

      {matches.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {matches.map((product) => (
            <button
              type="button"
              onClick={() => onProductSelect?.(product)}
              key={product.id}
              className="w-full rounded-xl border border-emerald-200 bg-white p-4 text-left hover:bg-emerald-50"
            >
              <p className="font-semibold text-gray-900">{product.name}</p>
              <p className="mt-1 text-sm text-gray-500">
                {product.code || product.product_code || "-"} · {product.barcode || "ไม่มีบาร์โค้ด"}
              </p>
              <p className="mt-2 text-sm text-gray-700">
                ราคา ฿{Number(product.price || 0).toFixed(2)} · คงเหลือ {product.stock ?? 0} {product.unit || "ชิ้น"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                หมวดหมู่ {product.category || "-"} · สถานะ {product.status || "-"}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}