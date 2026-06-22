"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Barcode from "react-barcode";
import {
  FaHome,
  FaBox,
  FaThLarge,
  FaShoppingCart,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaPlus,
  FaSyncAlt,
  FaSearch,
  FaEdit,
  FaTrash,
  FaBarcode,
  FaPrint,
  FaTimes,
} from "react-icons/fa";

export default function ProductsPage() {
  const products = [
    {
      code: "BEV-0001",
      barcode: "8851234500012",
      name: "แก้วเชคเกอร์ 750 ml.",
      category: "อุปกรณ์ชงเครื่องดื่ม",
      price: "250.00",
      stock: "42",
      status: "พร้อมขาย",
    },
    {
      code: "BEV-0002",
      barcode: "8851234500029",
      name: "ขวดน้ำพลาสติก 1 ลิตร",
      category: "ภาชนะบรรจุ",
      price: "45.00",
      stock: "38",
      status: "พร้อมขาย",
    },
    {
      code: "BEV-0003",
      barcode: "8851234500036",
      name: "ปั๊มไซรัป 1 cc.",
      category: "อุปกรณ์เสริม",
      price: "180.00",
      stock: "27",
      status: "พร้อมขาย",
    },
    {
      code: "BEV-0004",
      barcode: "8851234500043",
      name: "ผงโกโก้ 1 กก.",
      category: "วัตถุดิบ",
      price: "350.00",
      stock: "21",
      status: "พร้อมขาย",
    },
    {
      code: "BEV-0005",
      barcode: "8851234500050",
      name: "แก้วตวง 2 oz.",
      category: "อุปกรณ์ชงเครื่องดื่ม",
      price: "60.00",
      stock: "18",
      status: "ใกล้หมด",
    },
    {
      code: "BEV-0006",
      barcode: "8851234500067",
      name: "ไซรัปวนิลา 750 ml.",
      category: "วัตถุดิบ",
      price: "220.00",
      stock: "15",
      status: "ใกล้หมด",
    },
    {
      code: "BEV-0007",
      barcode: "8851234500074",
      name: "หลอดดำ 6 mm.",
      category: "อุปกรณ์เสริม",
      price: "35.00",
      stock: "12",
      status: "ใกล้หมด",
    },
    {
      code: "BEV-0008",
      barcode: "8851234500081",
      name: "ฝาโดม 98 mm.",
      category: "อุปกรณ์เสริม",
      price: "45.00",
      stock: "9",
      status: "ใกล้หมด",
    },
  ];

  const [keyword, setKeyword] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

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
      ].some((value) => value.toLowerCase().includes(search))
    );
  }, [keyword]);

  function openBarcodeModal(product = products[0]) {
    setSelectedProduct(product);
    setShowBarcodeModal(true);
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">
      <aside className="w-[300px] shrink-0 bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden">
        <div className="bg-red-600 p-8 rounded-br-[45px]">
          <div className="text-3xl">🥤</div>
          <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2>
          <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p>
        </div>

        <nav className="p-6 space-y-4">
          <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />
          <Menu active icon={<FaBox />} text="สินค้า" href="/products" />
          <Menu icon={<FaThLarge />} text="หมวดหมู่สินค้า" href="/categories" />
          <Menu icon={<FaShoppingCart />} text="การขาย" href="/sales" />
          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
          <Menu icon={<FaSignOutAlt />} text="ออกจากระบบ" href="/login" />
        </nav>
      </aside>

      <main className="flex-1 min-w-0 p-6 xl:p-10">
        <div className="flex flex-col 2xl:flex-row 2xl:justify-between 2xl:items-center gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">สินค้า</h1>
            <p className="text-gray-500 mt-2">Products &gt; สินค้า</p>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => openBarcodeModal()}
              className="bg-slate-800 text-white px-6 py-4 rounded-xl flex items-center gap-2 shadow"
            >
              <FaBarcode />
              สร้างบาร์โค้ด
            </button>

            <button className="bg-red-600 text-white px-6 py-4 rounded-xl flex items-center gap-2 shadow">
              <FaPlus />
              เพิ่มสินค้า
            </button>

            <button
              onClick={() => setKeyword("")}
              className="bg-white border px-6 py-4 rounded-xl flex items-center gap-2 shadow-sm text-gray-800"
            >
              <FaSyncAlt />
              รีเฟรชข้อมูล
            </button>

            <div className="relative">
              <FaBarcode className="absolute left-4 top-5 text-gray-500" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="สแกน / ค้นหาด้วยบาร์โค้ด..."
                className="bg-white border rounded-xl pl-12 pr-11 py-4 w-full sm:w-80 outline-none text-gray-800"
              />
              <FaSearch className="absolute right-4 top-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6 mb-8">
          <StatCard title="จำนวนสินค้าทั้งหมด" value="1,248" unit="รายการ" color="red" />
          <StatCard title="จำนวนหมวดหมู่" value="24" unit="หมวดหมู่" color="green" />
          <StatCard title="สินค้าใกล้หมด" value="18" unit="รายการ" color="yellow" />
          <StatCard title="ยอดขายวันนี้" value="฿ 28,450.00" unit="" color="green" />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-4 text-left">#</th>
                  <th className="p-4 text-left">รหัสสินค้า</th>
                  <th className="p-4 text-left">ชื่อสินค้า</th>
                  <th className="p-4 text-left">หมวดหมู่</th>
                  <th className="p-4 text-left">ราคาขาย (บาท)</th>
                  <th className="p-4 text-left">สต็อก</th>
                  <th className="p-4 text-left">บาร์โค้ด</th>
                  <th className="p-4 text-left">สถานะ</th>
                  <th className="p-4 text-left">จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((item, index) => (
                    <tr key={item.code} className="border-b text-gray-800">
                      <td className="p-4">{index + 1}</td>
                      <td className="p-4">{item.code}</td>
                      <td className="p-4">{item.name}</td>
                      <td className="p-4">{item.category}</td>
                      <td className="p-4">{item.price}</td>
                      <td className="p-4">{item.stock}</td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{item.barcode}</span>

                          <button
                            onClick={() => openBarcodeModal(item)}
                            className="border border-slate-300 p-2 rounded-lg text-slate-700 hover:bg-slate-100"
                            title="ดูบาร์โค้ด"
                          >
                            <FaBarcode />
                          </button>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-4 py-2 rounded-full text-sm ${
                            item.status === "พร้อมขาย"
                              ? "bg-green-100 text-green-600"
                              : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="p-4 flex gap-3">
                        <button className="border p-3 rounded-xl text-gray-700">
                          <FaEdit />
                        </button>

                        <button className="border p-3 rounded-xl text-red-600">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="p-10 text-center text-gray-500">
                      ไม่พบสินค้าจากบาร์โค้ดหรือคำค้นหานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <p className="text-gray-500">
              แสดง {filteredProducts.length} รายการ
            </p>

            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded-lg text-gray-700">
                ก่อนหน้า
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg">
                1
              </button>
              <button className="px-4 py-2 border rounded-lg text-gray-700">
                2
              </button>
              <button className="px-4 py-2 border rounded-lg text-gray-700">
                3
              </button>
              <button className="px-4 py-2 border rounded-lg text-gray-700">
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      </main>

      {showBarcodeModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
            <button
              onClick={() => setShowBarcodeModal(false)}
              className="absolute right-6 top-6 text-gray-500 hover:text-red-600"
            >
              <FaTimes className="text-xl" />
            </button>

            <h2 className="text-2xl font-bold text-gray-900">
              สร้างบาร์โค้ดสินค้า
            </h2>

            <p className="text-gray-500 mt-1">
              เลือกสินค้าเพื่อสร้างและพิมพ์บาร์โค้ด
            </p>

            <select
              value={selectedProduct.code}
              onChange={(e) => {
                const product = products.find(
                  (item) => item.code === e.target.value
                );
                setSelectedProduct(product);
              }}
              className="w-full mt-5 border rounded-xl p-4 text-gray-800 outline-none"
            >
              {products.map((product) => (
                <option key={product.code} value={product.code}>
                  {product.code} - {product.name}
                </option>
              ))}
            </select>

            <div className="mt-6 border rounded-2xl bg-gray-50 p-6 text-center">
              <p className="font-bold text-gray-900">{selectedProduct.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                รหัสสินค้า: {selectedProduct.code}
              </p>

              <div className="bg-white mt-5 p-5 rounded-xl inline-block">
                <Barcode
                  value={selectedProduct.barcode}
                  format="CODE128"
                  width={2}
                  height={90}
                  displayValue={true}
                  fontSize={16}
                  margin={0}
                />
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Barcode: {selectedProduct.barcode}
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="border px-5 py-3 rounded-xl text-gray-700"
              >
                ปิด
              </button>

              <button
                onClick={() => window.print()}
                className="bg-red-600 text-white px-5 py-3 rounded-xl flex items-center gap-2"
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
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl whitespace-nowrap ${
        active ? "bg-red-600 shadow-lg" : "hover:bg-white/10"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

function StatCard({ title, value, unit, color }) {
  const colorStyle = {
    red: "bg-red-600 text-red-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-500",
  };

  const [bg, text] = colorStyle[color].split(" ");

  return (
    <div
      className={`${
        color === "red" ? "bg-red-600 text-white" : "bg-white"
      } rounded-3xl shadow-sm border p-6`}
    >
      <div
        className={`w-16 h-16 ${
          color === "red" ? "bg-red-500" : bg
        } rounded-full mb-4`}
      ></div>

      <p className={color === "red" ? "text-white" : "text-gray-800"}>
        {title}
      </p>

      <div className="flex items-end gap-2 mt-2">
        <h2
          className={`text-3xl font-bold ${
            color === "red" ? "text-white" : text
          }`}
        >
          {value}
        </h2>

        <span className={color === "red" ? "text-white" : "text-gray-500"}>
          {unit}
        </span>
      </div>
    </div>
  );
}
