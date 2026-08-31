"use client";

import { useEffect, useRef, useState } from "react";

export default function BarcodeScannerInput({
  onScan,
  placeholder = "คลิกช่องนี้แล้วสแกนบาร์โค้ด",
}) {
  const [barcode, setBarcode] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submitBarcode() {
    const value = barcode.trim();

    if (!value) {
      return;
    }

    onScan(value);
    setBarcode("");

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitBarcode();
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-800">
        สแกนบาร์โค้ดสินค้า
      </label>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
        />

        <button
          type="button"
          onClick={submitBarcode}
          className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
        >
          ค้นหา
        </button>
      </div>
    </div>
  );
}