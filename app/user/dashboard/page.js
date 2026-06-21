"use client";

import { useRouter } from "next/navigation";
import {
  FaHome,
  FaBox,
  FaShoppingCart,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaUser,
  FaBarcode,
} from "react-icons/fa";

export default function UserDashboardPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-72 bg-[#111827] text-white min-h-screen">
        <div className="bg-red-600 p-6 rounded-br-[50px]">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🥤</div>
            <div>
              <p className="text-sm">ระบบบริหารจัดการ</p>
              <h1 className="font-bold">ร้านค้าปลีกอุปกรณ์เครื่องดื่ม</h1>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-3">
          <button className="w-full flex items-center gap-4 bg-red-600 px-5 py-4 rounded-xl font-bold">
            <FaHome /> หน้าหลัก
          </button>
          <button onClick={() => router.push("/user/products")} className="w-full flex items-center gap-4 px-5 py-4">
            <FaBox /> สินค้า
          </button>
          <button onClick={() => router.push("/user/sales")} className="w-full flex items-center gap-4 px-5 py-4">
            <FaShoppingCart /> การขาย
          </button>
          <button className="w-full flex items-center gap-4 px-5 py-4">
            <FaChartBar /> รายงาน
          </button>
          <button onClick={() => router.push("/login")} className="w-full flex items-center gap-4 px-5 py-4">
            <FaSignOutAlt /> ออกจากระบบ
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold">สวัสดี, พนักงานขาย</h1>
            <p className="text-gray-500 mt-2">ยินดีต้อนรับเข้าสู่ระบบ</p>
          </div>

          <div className="flex items-center gap-5">
            <FaBell className="text-2xl" />
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white">
              <FaUser />
            </div>
            <div>
              <p className="font-bold">พนักงานขาย</p>
              <p className="text-gray-500">User</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <Card title="จำนวนสินค้าทั้งหมด" value="1,248" unit="รายการ" />
          <Card title="สินค้าใกล้หมด" value="32" unit="รายการ" color="orange" />
          <Card title="สินค้าหมด" value="8" unit="รายการ" color="red" />
          <Card title="ยอดขายวันนี้" value="฿ 8,450.00" unit="" color="green" />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <section className="col-span-2 bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">ยอดขายวันนี้</h2>
            <p className="text-4xl font-bold text-red-600">฿ 8,450.00</p>

            <div className="h-64 mt-8 flex items-end gap-6 border-b border-gray-200">
              {[20, 30, 45, 60, 70, 78, 100].map((h, i) => (
                <div
                  key={i}
                  className="w-12 bg-red-200 rounded-t-xl"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-5">เมนูด่วน</h2>

            <div className="grid grid-cols-2 gap-4">
              <QuickBtn text="ไปหน้าสินค้า" onClick={() => router.push("/user/products")} />
              <QuickBtn text="สแกนบาร์โค้ด" onClick={() => router.push("/user/barcode")} />
              <QuickBtn text="ขายสินค้า" onClick={() => router.push("/user/sales")} />
              <QuickBtn text="ออกจากระบบ" onClick={() => router.push("/login")} />
            </div>
          </section>
        </div>

        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-6 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-red-600">แจ้งเตือนสินค้าใกล้หมด</h3>
            <p className="text-gray-600">มี 32 รายการ กรุณาตรวจสอบและสั่งซื้อสินค้าเพิ่มเติม</p>
          </div>
          <button className="bg-red-600 text-white px-6 py-3 rounded-xl">
            ดูรายการสินค้าใกล้หมด
          </button>
        </div>
      </main>
    </div>
  );
}

function Card({ title, value, unit, color = "red" }) {
  const colors = {
    red: "text-red-600 bg-red-100",
    orange: "text-orange-500 bg-orange-100",
    green: "text-green-600 bg-green-100",
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center ${colors[color]}`}>
        <FaBox />
      </div>
      <p className="font-bold">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${colors[color].split(" ")[0]}`}>
        {value} <span className="text-sm text-gray-500">{unit}</span>
      </p>
    </div>
  );
}

function QuickBtn({ text, onClick }) {
  return (
    <button
      onClick={onClick}
      className="border rounded-2xl p-6 hover:bg-red-50 hover:border-red-400 font-bold"
    >
      {text}
    </button>
  );
}