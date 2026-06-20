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
  FaSyncAlt,
  FaSearch,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

export default function ProductsPage() {
  const products = [
    ["BEV-0001", "แก้วเชคเกอร์ 750 ml.", "อุปกรณ์ชงเครื่องดื่ม", "250.00", "42", "พร้อมขาย"],
    ["BEV-0002", "ขวดน้ำพลาสติก 1 ลิตร", "ภาชนะบรรจุ", "45.00", "38", "พร้อมขาย"],
    ["BEV-0003", "ปั๊มไซรัป 1 cc.", "อุปกรณ์เสริม", "180.00", "27", "พร้อมขาย"],
    ["BEV-0004", "ผงโกโก้ 1 กก.", "วัตถุดิบ", "350.00", "21", "พร้อมขาย"],
    ["BEV-0005", "แก้วตวง 2 oz.", "อุปกรณ์ชงเครื่องดื่ม", "60.00", "18", "ใกล้หมด"],
    ["BEV-0006", "ไซรัปวนิลา 750 ml.", "วัตถุดิบ", "220.00", "15", "ใกล้หมด"],
    ["BEV-0007", "หลอดดำ 6 mm.", "อุปกรณ์เสริม", "35.00", "12", "ใกล้หมด"],
    ["BEV-0008", "ฝาโดม 98 mm.", "อุปกรณ์เสริม", "45.00", "9", "ใกล้หมด"],
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
          <Menu active icon={<FaBox />} text="สินค้า" href="/products" />
          <Menu icon={<FaThLarge />} text="หมวดหมู่สินค้า" href="/categories" />
          <Menu icon={<FaShoppingCart />} text="การขาย" href="/sales" />
          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
          <Menu icon={<FaSignOutAlt />} text="ออกจากระบบ" href="/login" />
        </nav>
      </aside>

      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">สินค้า</h1>
            <p className="text-gray-500 mt-2">Dashboard &gt; สินค้า</p>
          </div>

          <div className="flex gap-4">
            <button className="bg-red-600 text-white px-6 py-4 rounded-xl flex items-center gap-2 shadow">
              <FaPlus />
              เพิ่มสินค้า
            </button>

            <button className="bg-white border px-6 py-4 rounded-xl flex items-center gap-2 shadow-sm">
              <FaSyncAlt />
              รีเฟรชข้อมูล
            </button>

            <div className="relative">
              <FaSearch className="absolute left-4 top-5 text-gray-400" />
              <input
                placeholder="ค้นหาสินค้า..."
                className="bg-white border rounded-xl pl-12 pr-5 py-4 w-80 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard title="จำนวนสินค้าทั้งหมด" value="1,248" unit="รายการ" color="red" />
          <StatCard title="จำนวนหมวดหมู่" value="24" unit="หมวดหมู่" color="green" />
          <StatCard title="สินค้าใกล้หมด" value="18" unit="รายการ" color="yellow" />
          <StatCard title="ยอดขายวันนี้" value="฿ 28,450.00" unit="" color="green" />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-6">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-4 text-left">#</th>
                <th className="p-4 text-left">รหัสสินค้า</th>
                <th className="p-4 text-left">ชื่อสินค้า</th>
                <th className="p-4 text-left">หมวดหมู่</th>
                <th className="p-4 text-left">ราคาขาย (บาท)</th>
                <th className="p-4 text-left">สต็อก</th>
                <th className="p-4 text-left">สถานะ</th>
                <th className="p-4 text-left">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {products.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-4">{index + 1}</td>
                  <td className="p-4">{item[0]}</td>
                  <td className="p-4">{item[1]}</td>
                  <td className="p-4">{item[2]}</td>
                  <td className="p-4">{item[3]}</td>
                  <td className="p-4">{item[4]}</td>
                  <td className="p-4">
                    <span
                      className={`px-4 py-2 rounded-full text-sm ${
                        item[5] === "พร้อมขาย"
                          ? "bg-green-100 text-green-600"
                          : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {item[5]}
                    </span>
                  </td>
                  <td className="p-4 flex gap-3">
                    <button className="border p-3 rounded-xl">
                      <FaEdit />
                    </button>
                    <button className="border p-3 rounded-xl text-red-600">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-6">
            <p className="text-gray-500">แสดง 10 รายการ</p>
            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded-lg">ก่อนหน้า</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg">1</button>
              <button className="px-4 py-2 border rounded-lg">2</button>
              <button className="px-4 py-2 border rounded-lg">3</button>
              <button className="px-4 py-2 border rounded-lg">ถัดไป</button>
            </div>
          </div>
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

function StatCard({ title, value, unit, color }) {
  const colorStyle = {
    red: "bg-red-600 text-red-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-500",
  };

  const [bg, text] = colorStyle[color].split(" ");

  return (
    <div className={`${color === "red" ? "bg-red-600 text-white" : "bg-white"} rounded-3xl shadow-sm border p-6`}>
      <div className={`w-16 h-16 ${color === "red" ? "bg-red-500" : bg} rounded-full mb-4`}></div>
      <p className={color === "red" ? "text-white" : "text-gray-800"}>{title}</p>
      <div className="flex items-end gap-2 mt-2">
        <h2 className={`text-3xl font-bold ${color === "red" ? "text-white" : text}`}>
          {value}
        </h2>
        <span className={color === "red" ? "text-white" : "text-gray-500"}>{unit}</span>
      </div>
    </div>
  );
}