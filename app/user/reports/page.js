"use client";

import { useRouter } from "next/navigation";
import {
  FaHome, FaBox, FaShoppingCart, FaChartBar, FaCog, FaSignOutAlt,
  FaBell, FaUser, FaCalendarAlt, FaFileExcel, FaFilePdf,
  FaPrint, FaSyncAlt
} from "react-icons/fa";

export default function UserReportsPage() {
  const router = useRouter();

  const reports = [
    ["1", "รายงานยอดขาย", ["วันที่ขาย", "เลขที่บิล", "พนักงานขาย", "จำนวนรายการ", "ยอดรวม"]],
    ["2", "รายงานสินค้าในคลัง", ["รหัสสินค้า", "ชื่อสินค้า", "หมวดหมู่", "จำนวนคงเหลือ", "สถานะสินค้า"]],
    ["3", "รายงานสินค้าใกล้หมด", ["รหัสสินค้า", "ชื่อสินค้า", "จำนวนคงเหลือ", "ระดับขั้นต่ำ"]],
    ["4", "รายงานสินค้าหมด", ["รหัสสินค้า", "ชื่อสินค้า", "จำนวนคงเหลือ", "วันที่หมด"]],
    ["5", "รายงานรับสินค้าเข้า", ["วันที่รับสินค้า", "เลขบาร์โค้ด", "ชื่อสินค้า", "จำนวนที่รับเข้า"]],
    ["6", "รายงานสินค้าขายดี", ["รหัสสินค้า", "ชื่อสินค้า", "จำนวนที่ขาย", "ยอดขายรวม"]],
    ["7", "รายงานกำไรและยอดขาย", ["ยอดขายรวม", "ต้นทุนรวม", "กำไรสุทธิ"]],
    ["8", "รายงานผู้ใช้งานระบบ", ["รหัสพนักงาน", "ชื่อพนักงาน", "สิทธิ์การใช้งาน"]],
    ["9", "รายงานประวัติการขาย", ["รายวัน", "รายเดือน", "รายปี", "กำหนดช่วงวันที่"]],
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

          <button onClick={() => router.push("/user/sales")} className="flex items-center gap-4 px-5 py-4 w-full rounded-xl">
            <FaShoppingCart /> ขายสินค้า
          </button>

          <button className="flex items-center gap-4 px-5 py-4 w-full rounded-xl bg-red-600">
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
            <h1 className="text-5xl font-bold">รายงาน</h1>
            <p className="text-gray-500 mt-2">Reports &gt; รายงาน</p>
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

        <div className="bg-white rounded-3xl shadow p-6 mb-6">
          <div className="grid grid-cols-6 gap-4">
            <button className="border rounded-xl py-4 flex justify-center items-center gap-2">
              <FaCalendarAlt /> ค้นหาตามวันที่
            </button>

            <select className="border rounded-xl px-4">
              <option>เลือกประเภทรายงาน</option>
              <option>รายงานยอดขาย</option>
              <option>รายงานสินค้าในคลัง</option>
              <option>รายงานสินค้าขายดี</option>
            </select>

            <button className="border border-green-500 text-green-600 rounded-xl flex justify-center items-center gap-2">
              <FaFileExcel /> Export Excel
            </button>

            <button className="border border-red-500 text-red-600 rounded-xl flex justify-center items-center gap-2">
              <FaFilePdf /> Export PDF
            </button>

            <button className="border rounded-xl flex justify-center items-center gap-2">
              <FaPrint /> พิมพ์รายงาน
            </button>

            <button className="border rounded-xl flex justify-center items-center gap-2">
              <FaSyncAlt /> รีเฟรชข้อมูล
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report[0]} className="bg-white rounded-3xl shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                  {report[0]}
                </div>
                <h2 className="text-xl font-bold">{report[1]}</h2>
              </div>

              <ul className="text-gray-600 space-y-2 list-disc ml-6">
                {report[2].map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <button className="mt-6 w-full border border-red-200 text-red-600 py-3 rounded-xl hover:bg-red-50">
                ดูรายงาน
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}