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
  FaSearch,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
  FaCalendarAlt,
} from "react-icons/fa";

export default function ReportsPage() {
  const sales = [
    ["25/05/2567 14:35", "INV-250525-0001", "ลูกค้าทั่วไป", 4, "646.00", "Admin"],
    ["25/05/2567 13:20", "INV-250525-0002", "คุณสมชาย ใจดี", 6, "1,250.00", "Admin"],
    ["25/05/2567 11:05", "INV-250525-0003", "บริษัท เอ บี ซี จำกัด", 8, "2,450.00", "Admin"],
    ["24/05/2567 16:40", "INV-250524-0008", "ลูกค้าทั่วไป", 3, "315.00", "Admin"],
    ["24/05/2567 15:10", "INV-250524-0007", "คุณอรรณา สุขใจดี", 5, "980.00", "Admin"],
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
          <Menu icon={<FaShoppingCart />} text="การขาย" href="/sales" />
          <Menu active icon={<FaChartBar />} text="รายงาน" href="/reports" />
          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
          <Menu icon={<FaSignOutAlt />} text="ออกจากระบบ" href="/login" />
        </nav>
      </aside>

      <main className="flex-1 p-10">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900">รายงาน</h1>
          <p className="text-gray-400 text-xl mt-3">Reports &gt; รายงาน</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border p-8 mb-6">
          <div className="grid grid-cols-6 gap-5 items-end">
            <DateField label="ช่วงวันที่" value="01/05/2567" />
            <DateField label="ถึง" value="25/05/2567" />

            <div>
              <label className="block mb-2 font-semibold">ประเภทรายงาน</label>
              <select className="w-full border rounded-xl px-4 py-4 bg-white">
                <option>ทั้งหมด</option>
                <option>รายงานสินค้า</option>
                <option>รายงานยอดขาย</option>
              </select>
            </div>

            <button className="bg-red-600 text-white rounded-xl py-4 flex items-center justify-center gap-2">
              <FaSearch />
              ค้นหา
            </button>

            <button className="border border-green-300 text-green-600 rounded-xl py-4 flex items-center justify-center gap-2">
              <FaFileExcel />
              Export Excel
            </button>

            <button className="border border-red-300 text-red-600 rounded-xl py-4 flex items-center justify-center gap-2">
              <FaFilePdf />
              Export PDF
            </button>
          </div>

          <div className="flex justify-end mt-5">
            <button className="border rounded-xl px-6 py-3 flex items-center gap-2">
              <FaPrint />
              พิมพ์รายงาน
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <SummaryCard title="ยอดขายรวม" value="28,450.00 บาท" small="จำนวน 45 รายการ" color="red" />
          <SummaryCard title="กำไรสุทธิ" value="8,925.50 บาท" small="เทียบกับช่วงก่อนหน้า" color="orange" />
          <SummaryCard title="สินค้าขายดี" value="แก้วพลาสติก 22 oz." small="ขายแล้ว 320 ชิ้น" color="green" />
          <SummaryCard title="ลูกค้าทั้งหมด" value="128 ราย" small="ลูกค้าใหม่ 18 ราย" color="blue" />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-3xl border shadow-sm p-8">
            <h2 className="text-2xl font-bold mb-6">ยอดขายรายวัน</h2>
            <div className="h-72 bg-gradient-to-t from-red-100 to-white rounded-2xl flex items-end gap-4 px-6 pb-6">
              {[35, 60, 45, 60, 42, 30, 45, 55, 90, 100, 70, 55, 45, 30, 50, 60].map((h, i) => (
                <div key={i} className="flex-1 flex items-end">
                  <div className="bg-red-500 rounded-t-xl w-full" style={{ height: `${h}%` }}></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border shadow-sm p-8">
            <h2 className="text-2xl font-bold mb-6">ยอดขายแยกตามหมวดหมู่</h2>

            <div className="flex items-center gap-10">
              <div className="w-56 h-56 rounded-full bg-gradient-to-tr from-blue-500 via-green-400 to-orange-400"></div>

              <div className="space-y-5 flex-1">
                <Category name="แก้ว" value="12,450.00 บาท" percent="43.8%" />
                <Category name="หลอด" value="6,240.00 บาท" percent="21.9%" />
                <Category name="ฝาแก้ว" value="5,850.00 บาท" percent="20.6%" />
                <Category name="อุปกรณ์เสริม" value="3,910.00 บาท" percent="13.7%" />

                <div className="flex justify-between pt-4 border-t font-bold">
                  <span>รวม</span>
                  <span className="text-red-600">28,450.00 บาท</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-8">
          <div className="flex justify-between mb-5">
            <h2 className="text-2xl font-bold">รายการขายล่าสุด</h2>
            <button className="border px-5 py-2 rounded-xl">ดูรายงานทั้งหมด</button>
          </div>

          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">#</th>
                <th className="p-4 text-left">วันที่</th>
                <th className="p-4 text-left">เลขที่บิล</th>
                <th className="p-4 text-left">ลูกค้า</th>
                <th className="p-4 text-left">จำนวนรายการ</th>
                <th className="p-4 text-left">ยอดรวม (บาท)</th>
                <th className="p-4 text-left">พนักงานขาย</th>
              </tr>
            </thead>

            <tbody>
              {sales.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-4">{index + 1}</td>
                  <td className="p-4">{item[0]}</td>
                  <td className="p-4">{item[1]}</td>
                  <td className="p-4">{item[2]}</td>
                  <td className="p-4">{item[3]}</td>
                  <td className="p-4">{item[4]}</td>
                  <td className="p-4">{item[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

function DateField({ label, value }) {
  return (
    <div>
      <label className="block mb-2 font-semibold">{label}</label>
      <div className="relative">
        <input defaultValue={value} className="w-full border rounded-xl px-4 py-4 pr-10" />
        <FaCalendarAlt className="absolute right-4 top-5 text-gray-500" />
      </div>
    </div>
  );
}

function SummaryCard({ title, value, small, color }) {
  const colors = {
    red: "bg-red-100 text-red-600",
    orange: "bg-orange-100 text-orange-500",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm p-6">
      <div className={`w-16 h-16 ${colors[color]} rounded-2xl mb-4`}></div>
      <p className="font-bold">{title}</p>
      <h2 className={`text-2xl font-bold mt-2 ${colors[color].split(" ")[1]}`}>
        {value}
      </h2>
      <p className="text-gray-500 mt-2">{small}</p>
    </div>
  );
}

function Category({ name, value, percent }) {
  return (
    <div className="flex justify-between">
      <span>{name}</span>
      <span>{value}</span>
      <span className="text-gray-500">{percent}</span>
    </div>
  );
}