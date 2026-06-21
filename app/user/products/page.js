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
  FaPlus,
  FaSave,
  FaSearch,
  FaSyncAlt,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

export default function ProductsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* Sidebar */}
      <aside className="w-72 bg-[#111827] text-white">
        <div className="bg-red-600 p-6 rounded-br-[50px]">
          <h2 className="font-bold text-lg">
            ระบบบริหารจัดการ
            <br />
            ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
          </h2>
        </div>

        <div className="p-4 space-y-3">

          <button
            onClick={() => router.push("/user/dashboard")}
            className="flex items-center gap-4 px-5 py-4 w-full rounded-xl"
          >
            <FaHome />
            หน้าหลัก
          </button>

          <button className="flex items-center gap-4 px-5 py-4 w-full rounded-xl bg-red-600">
            <FaBox />
            สินค้า
          </button>

          <button
            onClick={() => router.push("/user/sales")}
            className="flex items-center gap-4 px-5 py-4 w-full rounded-xl"
          >
            <FaShoppingCart />
            การขาย
          </button>

          <button
            onClick={() => router.push("/user/reports")}
            className="flex items-center gap-4 px-5 py-4 w-full rounded-xl"
          >
            <FaChartBar />
            รายงาน
          </button>

          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-4 px-5 py-4 w-full rounded-xl"
          >
            <FaSignOutAlt />
            ออกจากระบบ
          </button>

        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8">

        {/* Header */}
        <div className="flex justify-between mb-8">

          <div>
            <h1 className="text-5xl font-bold">สินค้า</h1>
            <p className="text-gray-500 mt-2">
              หน้าหลัก &gt; สินค้า
            </p>
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

        {/* เพิ่มสินค้า */}
        <div className="bg-white rounded-3xl shadow p-8">

          <div className="flex justify-between mb-8">
            <h2 className="text-3xl font-bold">
              เพิ่มข้อมูลสินค้า
            </h2>

            <button className="bg-red-600 text-white px-6 py-3 rounded-xl flex gap-3 items-center">
              <FaPlus />
              เพิ่มสินค้า
            </button>
          </div>

          <div className="grid grid-cols-4 gap-6">

            <input className="border rounded-xl p-4" placeholder="รหัสสินค้า" />
            <input className="border rounded-xl p-4" placeholder="ชื่อสินค้า" />
            <input className="border rounded-xl p-4" placeholder="หมวดหมู่" />
            <input className="border rounded-xl p-4" placeholder="ราคาขาย (บาท)" />

            <input className="border rounded-xl p-4" placeholder="จำนวนสินค้า" />
            <input className="border rounded-xl p-4" placeholder="หน่วยนับ" />
            <input className="border rounded-xl p-4" placeholder="เลขบาร์โค้ด" />
            <input className="border rounded-xl p-4" placeholder="สถานะสินค้า" />

          </div>

          <div className="flex justify-end gap-4 mt-8">

            <button className="border px-8 py-3 rounded-xl">
              ยกเลิก
            </button>

            <button className="bg-red-600 text-white px-8 py-3 rounded-xl flex items-center gap-3">
              <FaSave />
              บันทึก
            </button>

          </div>

        </div>

        {/* ตารางสินค้า */}
        <div className="bg-white rounded-3xl shadow p-8 mt-8">

          <div className="flex gap-4 mb-6">

            <input
              className="border rounded-xl p-4 flex-1"
              placeholder="ค้นหารหัสสินค้า, ชื่อสินค้า, บาร์โค้ด"
            />

            <button className="bg-red-600 text-white px-8 rounded-xl flex items-center gap-3">
              <FaSearch />
              ค้นหา
            </button>

            <button className="border px-8 rounded-xl flex items-center gap-3">
              <FaSyncAlt />
              รีเฟรชข้อมูล
            </button>

          </div>

          <table className="w-full">

            <thead>
              <tr className="border-b text-gray-500">
                <th>#</th>
                <th>รหัสสินค้า</th>
                <th>ชื่อสินค้า</th>
                <th>หมวดหมู่</th>
                <th>ราคาขาย</th>
                <th>จำนวนสินค้า</th>
                <th>หน่วยนับ</th>
                <th>บาร์โค้ด</th>
                <th>สถานะสินค้า</th>
                <th>จัดการ</th>
              </tr>
            </thead>

            <tbody className="text-center">

              <tr className="h-16 border-b">
                <td>1</td>
                <td>CUP-22</td>
                <td>แก้วพลาสติก 22 oz.</td>
                <td>แก้ว</td>
                <td>2.50</td>
                <td>150</td>
                <td>ชิ้น</td>
                <td>8851234567890</td>
                <td className="text-green-600 font-bold">
                  มีสินค้า
                </td>
                <td>
                  <div className="flex justify-center gap-4">
                    <FaEdit />
                    <FaTrash className="text-red-600" />
                  </div>
                </td>
              </tr>

            </tbody>

          </table>

        </div>

      </main>
    </div>
  );
}