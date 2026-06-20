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
  FaBell,
  FaCalendarAlt,
  FaArrowRight,
  FaBriefcase,
  FaFileAlt,
} from "react-icons/fa";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">
      {/* Sidebar */}
      <aside className="w-[300px] bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden">
        <div className="bg-red-600 p-8 rounded-br-[45px]">
          <div className="text-3xl">🥤</div>
          <h2 className="font-bold mt-3">ระบบบริหารจัดการ</h2>
          <p className="text-sm">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</p>
        </div>

        <nav className="p-6 space-y-4">
          <Menu active icon={<FaHome />} text="Dashboard" href="/dashboard" />
          <Menu icon={<FaBox />} text="สินค้า" href="/products" />
          <Menu icon={<FaThLarge />} text="หมวดหมู่สินค้า" href="/categories" />
          <Menu icon={<FaShoppingCart />} text="การขาย" href="/sales" />
          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
          <Menu icon={<FaSignOutAlt />} text="ออกจากระบบ" href="/login" />
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-2">ภาพรวมระบบ</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <FaBell className="text-2xl text-gray-700" />
              <span className="absolute -top-3 -right-3 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                3
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gray-800 rounded-full"></div>
              <div>
                <p className="font-bold">ผู้ดูแลระบบ</p>
                <p className="text-sm text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="flex justify-end mb-6">
          <div className="bg-white shadow-sm border rounded-xl px-5 py-3 flex items-center gap-3">
            <FaCalendarAlt />
            <span>25 พฤษภาคม 2567</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card title="จำนวนสินค้าทั้งหมด" value="1,248" unit="รายการ" color="red" />
          <Card title="จำนวนหมวดหมู่" value="24" unit="หมวดหมู่" color="gray" />
          <Card title="สินค้าใกล้หมด" value="18" unit="รายการ" color="yellow" />
          <Card title="ยอดขายวันนี้" value="฿ 28,450.00" unit="" color="green" />
        </div>

        {/* Chart + Low Stock */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 bg-white rounded-3xl shadow-sm border p-8">
            <h2 className="text-xl font-bold">ยอดขายวันนี้</h2>
            <p className="text-3xl font-bold text-red-600 mt-4">฿ 28,450.00</p>
            <p className="text-gray-500 mt-2">เปรียบเทียบกับเมื่อวาน</p>

            <div className="mt-8 h-64 bg-gradient-to-t from-red-100 to-white rounded-2xl flex items-end gap-5 px-8 pb-6">
              {[15, 25, 40, 38, 55, 70, 80, 78, 92].map((h, i) => (
                <div key={i} className="flex-1 flex items-end">
                  <div
                    className="w-full bg-red-500 rounded-t-xl"
                    style={{ height: `${h}%` }}
                  ></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border p-8">
            <div className="flex justify-between mb-5">
              <h2 className="text-xl font-bold">สินค้าใกล้หมด</h2>
              <button className="text-red-600 text-sm">ดูทั้งหมด</button>
            </div>

            {[
              ["แก้วเชคเกอร์ 750 ml.", "3 ชิ้น"],
              ["ขวดน้ำพลาสติก 1 ลิตร", "5 ชิ้น"],
              ["ไซรัปวนิลา 750 ml.", "4 ชิ้น"],
              ["ฝาโดม 98 mm.", "5 ชิ้น"],
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center py-4 border-b">
                <p className="font-medium">{item[0]}</p>
                <p className="text-red-600 font-bold">{item[1]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-6">
          <Link
            href="/products"
            className="bg-red-50 border border-red-100 rounded-3xl p-8 flex items-center justify-between hover:bg-red-100"
          >
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center text-3xl">
                <FaBriefcase />
              </div>
              <div>
                <h2 className="text-2xl font-bold">ไปหน้าสินค้า</h2>
                <p className="text-gray-500">จัดการสินค้า เพิ่ม / แก้ไข / ลบ</p>
              </div>
            </div>
            <FaArrowRight className="text-red-600 text-2xl" />
          </Link>

          <Link
            href="/reports"
            className="bg-white border rounded-3xl p-8 flex items-center justify-between hover:bg-gray-100"
          >
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-gray-800 text-white rounded-full flex items-center justify-center text-3xl">
                <FaFileAlt />
              </div>
              <div>
                <h2 className="text-2xl font-bold">ไปหน้ารายงาน</h2>
                <p className="text-gray-500">ดูรายงานยอดขาย รายงานสินค้า</p>
              </div>
            </div>
            <FaArrowRight className="text-gray-700 text-2xl" />
          </Link>
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

function Card({ title, value, unit, color }) {
  const style = {
    red: "bg-red-600 text-red-600",
    gray: "bg-gray-500 text-gray-600",
    yellow: "bg-yellow-400 text-yellow-500",
    green: "bg-green-500 text-green-600",
  };

  const [bg, text] = style[color].split(" ");

  return (
    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
      <div className="p-6">
        <div className={`w-16 h-16 ${bg} rounded-full mb-4`}></div>
        <p className="font-semibold">{title}</p>
        <div className="flex items-end gap-2 mt-2">
          <h2 className={`text-3xl font-bold ${text}`}>{value}</h2>
          <span className="text-gray-500">{unit}</span>
        </div>
      </div>

      <div className="bg-red-50 px-6 py-4 flex justify-between text-sm text-red-600">
        <span>ดูรายละเอียด</span>
        <span>›</span>
      </div>
    </div>
  );
}