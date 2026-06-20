"use client";

import Link from "next/link";
import {
  FaHome,
  FaBox,
  FaThLarge,
  FaShoppingCart,
  FaUsers,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaPlus,
  FaTrash,
  FaCalendarAlt,
  FaSave,
  FaTimes,
} from "react-icons/fa";

export default function SalesPage() {
  const items = [
    ["CUP-22", "แก้วพลาสติก 22 oz.", "แก้ว", 100, "ชิ้น", "2.50", "0.00", "250.00"],
    ["LID-98", "ฝาโดม 98 mm.", "ฝา", 80, "ชิ้น", "1.20", "0.00", "96.00"],
    ["STR-BLK", "หลอดพลาสติก สีดำ", "หลอด", 100, "ชิ้น", "0.60", "0.00", "60.00"],
    ["BOT-500", "ขวด PET 500 ml.", "ขวด", 50, "ชิ้น", "4.80", "0.00", "240.00"],
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">
      <aside className="w-[300px] bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden">
        <div className="bg-red-600 p-8 rounded-br-[45px]">
          <div className="text-3xl">🥤</div>
          <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2>
          <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p>
        </div>

        <nav className="p-6 space-y-4">
          <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />
          <Menu icon={<FaBox />} text="สินค้า" href="/products" />
          <Menu icon={<FaThLarge />} text="หมวดหมู่สินค้า" href="/categories" />
          <Menu active icon={<FaShoppingCart />} text="การขาย" href="/sales" />
          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
          <Menu icon={<FaSignOutAlt />} text="ออกจากระบบ" href="/login" />
        </nav>
      </aside>

      <main className="flex-1 p-10">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900">ขายสินค้า</h1>
          <p className="text-gray-400 text-xl mt-3">Dashboard &gt; ขายสินค้า</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-8 mb-6">
          <h2 className="text-2xl font-bold mb-6">ข้อมูลการขาย</h2>

          <div className="grid grid-cols-5 gap-6">
            <Field label="วันที่ขาย *" value="25/05/2567" icon={<FaCalendarAlt />} />
            <Field label="เลขที่บิล (อัตโนมัติ)" value="INV-250525-0001" disabled />
            <SelectField label="พนักงานขาย" value="Admin" />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">รายการสินค้า</h2>

            <button className="bg-red-600 hover:bg-red-700 text-white px-7 py-4 rounded-2xl flex items-center gap-3 shadow">
              <FaPlus />
              เพิ่มรายการขาย
            </button>
          </div>

          <table className="w-full">
            <thead className="bg-gray-100">
              <tr className="text-gray-700">
                <th className="p-4 text-left">#</th>
                <th className="p-4 text-left">รหัสสินค้า</th>
                <th className="p-4 text-left">ชื่อสินค้า</th>
                <th className="p-4 text-left">หมวดหมู่</th>
                <th className="p-4 text-left">จำนวน</th>
                <th className="p-4 text-left">หน่วยนับ</th>
                <th className="p-4 text-left">ราคาต่อหน่วย (บาท)</th>
                <th className="p-4 text-left">ส่วนลด (บาท)</th>
                <th className="p-4 text-left">รวมเงิน (บาท)</th>
                <th className="p-4 text-left">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-4">{index + 1}</td>
                  <td className="p-4 font-semibold">{item[0]}</td>
                  <td className="p-4">{item[1]}</td>
                  <td className="p-4">{item[2]}</td>
                  <td className="p-4">
                    <input
                      defaultValue={item[3]}
                      className="w-24 border rounded-xl px-4 py-3 text-center"
                    />
                  </td>
                  <td className="p-4">{item[4]}</td>
                  <td className="p-4">
                    <input
                      defaultValue={item[5]}
                      className="w-24 border rounded-xl px-4 py-3 text-center"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      defaultValue={item[6]}
                      className="w-24 border rounded-xl px-4 py-3 text-center"
                    />
                  </td>
                  <td className="p-4 font-semibold">{item[7]}</td>
                  <td className="p-4">
                    <button className="border rounded-xl p-3 text-red-600 hover:bg-red-50">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-3 gap-8 mt-8">
            <div className="col-span-2">
              <button className="border border-red-200 text-red-600 px-6 py-3 rounded-xl flex items-center gap-2">
                <FaTrash />
                ล้างรายการทั้งหมด
              </button>

              <div className="mt-8">
                <label className="block mb-2">หมายเหตุ</label>
                <input
                  placeholder="เพิ่มหมายเหตุ (ไม่บังคับ)"
                  className="w-full border rounded-xl px-5 py-4"
                />
              </div>
            </div>

            <div className="bg-red-50 rounded-2xl p-6">
              <div className="flex justify-between mb-5">
                <span>รวมรายการ (4 รายการ)</span>
                <span>646.00 บาท</span>
              </div>

              <div className="flex justify-between items-center mb-5">
                <span>ส่วนลดรวม</span>
                <input
                  defaultValue="0.00"
                  className="w-40 border rounded-xl px-4 py-3 text-center bg-white"
                />
                <span>บาท</span>
              </div>

              <div className="flex justify-between items-center pt-5 border-t">
                <span className="text-red-600 font-bold text-xl">ยอดรวมสุทธิ</span>
                <span className="text-red-600 font-bold text-4xl">646.00 บาท</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button className="bg-white border px-10 py-4 rounded-2xl flex items-center gap-3">
            <FaTimes />
            ยกเลิก
          </button>

          <button className="bg-red-600 text-white px-20 py-4 rounded-2xl flex items-center gap-3 shadow-lg">
            <FaSave />
            บันทึกการขาย
          </button>
        </div>
      </main>
    </div>
  );
}

function Menu({ icon, text, href, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-5 py-4 rounded-xl ${
        active ? "bg-red-600 shadow-lg" : "hover:bg-white/10"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

function Field({ label, value, icon, disabled }) {
  return (
    <div>
      <label className="block mb-2 font-medium">{label}</label>
      <div className="relative">
        <input
          defaultValue={value}
          disabled={disabled}
          className={`w-full border rounded-xl px-5 py-4 ${
            icon ? "pr-12" : ""
          } ${disabled ? "bg-gray-100 text-gray-400" : "bg-white"}`}
        />
        {icon && <span className="absolute right-4 top-4">{icon}</span>}
      </div>
    </div>
  );
}

function SelectField({ label, value }) {
  return (
    <div>
      <label className="block mb-2 font-medium">{label}</label>
      <select defaultValue={value} className="w-full border rounded-xl px-5 py-4 bg-white">
        <option>{value}</option>
      </select>
    </div>
  );
}