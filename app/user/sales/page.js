"use client";

import { useRouter } from "next/navigation";
import {
  FaHome, FaBox, FaShoppingCart, FaChartBar, FaCog, FaSignOutAlt,
  FaBell, FaUser, FaBarcode, FaSearch, FaPlus, FaTrash, FaSave, FaPrint
} from "react-icons/fa";

export default function UserSalesPage() {
  const router = useRouter();

  const items = [
    ["CUP-22", "แก้วพลาสติก 22 oz.", "2.50", 2, "5.00"],
    ["BOT-500", "ขวด PET 500 ml.", "4.80", 1, "4.80"],
    ["LID-98", "ฝาโดม 98 mm.", "1.20", 2, "2.40"],
    ["STR-BLK", "หลอดพลาสติก สีดำ", "0.60", 5, "3.00"],
  ];

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

        <div className="p-4 space-y-3">
          <button onClick={() => router.push("/user/dashboard")} className="flex items-center gap-4 px-5 py-4 w-full rounded-xl">
            <FaHome /> หน้าหลัก
          </button>

          <button onClick={() => router.push("/user/products")} className="flex items-center gap-4 px-5 py-4 w-full rounded-xl">
            <FaBox /> สินค้า
          </button>

          <button className="flex items-center gap-4 px-5 py-4 w-full rounded-xl bg-red-600">
            <FaShoppingCart /> การขาย
          </button>

          <button onClick={() => router.push("/user/reports")} className="flex items-center gap-4 px-5 py-4 w-full rounded-xl">
            <FaChartBar /> รายงาน
          </button>

          <button onClick={() => router.push("/login")} className="flex items-center gap-4 px-5 py-4 w-full rounded-xl">
            <FaSignOutAlt /> ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <div className="flex justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold">การขาย</h1>
            <p className="text-gray-500 mt-2">Sales &gt; การขาย</p>
          </div>

          <div className="flex items-center gap-5">
            <FaBell size={24} />
            <div className="w-12 h-12 rounded-full bg-red-600 text-white flex justify-center items-center">
              <FaUser />
            </div>
            <div>
              <h3 className="font-bold">พนักงานขาย</h3>
              <p className="text-gray-500">User</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <section className="bg-white rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6">ข้อมูลการขาย</h2>

            <div className="grid grid-cols-2 gap-5 mb-6">
              <input className="border rounded-xl p-4" value="25/05/2567" readOnly />
              <input className="border rounded-xl p-4" value="INV-250525-0001" readOnly />
            </div>

            <div className="flex gap-4 mb-5">
              <div className="relative flex-1">
                <FaBarcode className="absolute left-4 top-5 text-gray-400" />
                <input className="border rounded-xl p-4 pl-12 w-full" placeholder="สแกนบาร์โค้ดสินค้า" />
              </div>
              <button className="bg-red-600 text-white px-6 rounded-xl flex items-center gap-3">
                <FaBarcode /> สแกน
              </button>
            </div>

            <div className="flex gap-4">
              <input className="border rounded-xl p-4 flex-1" placeholder="ค้นหาสินค้า ชื่อ / รหัส / บาร์โค้ด" />
              <button className="bg-red-600 text-white px-6 rounded-xl flex items-center gap-3">
                <FaSearch /> ค้นหา
              </button>
            </div>

            <div className="mt-8 border rounded-2xl p-6">
              <h3 className="font-bold text-xl mb-4">ข้อมูลสินค้า</h3>
              <p className="text-2xl font-bold">แก้วพลาสติก 22 oz.</p>
              <p className="text-gray-500 mt-2">รหัสสินค้า: CUP-22</p>
              <p className="text-green-600 font-bold mt-2">ราคา ฿ 2.50</p>

              <div className="flex items-center gap-4 mt-6">
                <span>จำนวน</span>
                <button className="border px-4 py-2 rounded-lg">-</button>
                <input className="border rounded-lg w-20 text-center py-2" value="1" readOnly />
                <button className="border px-4 py-2 rounded-lg">+</button>
                <button className="ml-auto border border-red-500 text-red-600 px-6 py-3 rounded-xl flex items-center gap-3">
                  <FaPlus /> เพิ่มรายการขาย
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow p-8">
            <div className="flex justify-between mb-6">
              <h2 className="text-2xl font-bold">รายการสินค้าที่ขาย</h2>
              <button className="text-red-600 flex items-center gap-2">
                <FaTrash /> ลบรายการ
              </button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-3">สินค้า</th>
                  <th>ราคา</th>
                  <th>จำนวน</th>
                  <th>ยอดรวม</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b h-16">
                    <td>
                      <p className="font-bold">{item[1]}</p>
                      <p className="text-gray-500 text-sm">{item[0]}</p>
                    </td>
                    <td className="text-center">฿ {item[2]}</td>
                    <td className="text-center">{item[3]}</td>
                    <td className="text-center">฿ {item[4]}</td>
                    <td className="text-red-600"><FaTrash /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-6 bg-gray-50 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between">
                <span>รวมเงิน</span>
                <b>฿ 15.20</b>
              </div>
              <div className="flex justify-between">
                <span>ส่วนลด</span>
                <input className="border rounded-xl p-2 w-40 text-right" value="0.00" readOnly />
              </div>
              <div className="flex justify-between text-red-600 text-2xl font-bold">
                <span>ยอดรวม</span>
                <span>฿ 15.20</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <button className="border px-6 py-4 rounded-xl">ยกเลิก</button>
              <button className="bg-red-600 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3">
                <FaSave /> บันทึกการขาย
              </button>
              <button className="col-span-2 border px-6 py-4 rounded-xl flex items-center justify-center gap-3">
                <FaPrint /> พิมพ์ใบเสร็จ
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}