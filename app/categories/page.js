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
  FaEdit,
  FaTrash,
} from "react-icons/fa";

export default function CategoriesPage() {
  const categories = [
    {
      name: "แก้ว",
      detail: "แก้วพลาสติก แก้วกระดาษ แก้วPET ฯลฯ",
      total: "156 รายการ",
    },
    {
      name: "หลอด",
      detail: "หลอดพลาสติก หลอดกระดาษ หลอดสแตนเลส",
      total: "89 รายการ",
    },
    {
      name: "ฝาแก้ว",
      detail: "ฝาโดม ฝาเรียบ ฝาปิดเปิด",
      total: "64 รายการ",
    },
    {
      name: "ปลอกแก้ว",
      detail: "ปลอกกระดาษ ปลอกพลาสติก",
      total: "32 รายการ",
    },
    {
      name: "ถุงหิ้ว",
      detail: "ถุงหิ้วพลาสติก ถุงกระดาษ",
      total: "28 รายการ",
    },
    {
      name: "ขวด",
      detail: "ขวดพลาสติก ขวดแก้ว",
      total: "45 รายการ",
    },
    {
      name: "อุปกรณ์เสริม",
      detail: "ที่คน แท่นปั๊ม ที่จับแก้ว ฯลฯ",
      total: "78 รายการ",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex">

      {/* Sidebar */}
      <aside className="w-[300px] bg-[#1f2633] text-white rounded-r-[45px] overflow-hidden">

        <div className="bg-red-600 p-8 rounded-br-[45px]">
          <div className="text-3xl">🥤</div>
          <h2 className="font-bold mt-3">
            ระบบบริหารจัดการ
          </h2>
          <p className="text-sm">
            ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
          </p>
        </div>

        <nav className="p-6 space-y-4">

          <Menu icon={<FaHome />} text="Dashboard" href="/dashboard" />

          <Menu icon={<FaBox />} text="สินค้า" href="/products" />

          <Menu
            active
            icon={<FaThLarge />}
            text="หมวดหมู่สินค้า"
            href="/categories"
          />

          <Menu icon={<FaShoppingCart />} text="การขาย" href="/sales" />

          

          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />

          <Menu icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />


          <Menu icon={<FaSignOutAlt />} text="ออกจากระบบ" href="/login" />

        </nav>

      </aside>

      {/* Content */}
      <main className="flex-1 p-10">

        <div className="flex justify-between items-center mb-10">

          <div>
            <h1 className="text-5xl font-bold">
              หมวดหมู่สินค้า
            </h1>

            <p className="text-gray-400 mt-3 text-xl">
              Categories &gt; หมวดหมู่สินค้า
            </p>
          </div>

          <button className="bg-red-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-lg hover:bg-red-700">
            <FaPlus />
            เพิ่มหมวดหมู่สินค้า
          </button>

        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-sm border p-8">

          <table className="w-full">

            <thead className="bg-gray-100">

              <tr className="text-gray-700">

                <th className="p-5 text-left">#</th>

                <th className="p-5 text-left">
                  ชื่อหมวดหมู่
                </th>

                <th className="p-5 text-left">
                  คำอธิบาย
                </th>

                <th className="p-5 text-left">
                  จำนวนสินค้า
                </th>

                <th className="p-5 text-left">
                  สถานะ
                </th>

                <th className="p-5 text-left">
                  จัดการ
                </th>

              </tr>

            </thead>

            <tbody>

              {categories.map((item, index) => (
                <tr key={index} className="border-b">

                  <td className="p-6">
                    {index + 1}
                  </td>

                  <td className="p-6 font-semibold">
                    {item.name}
                  </td>

                  <td className="p-6 text-gray-500">
                    {item.detail}
                  </td>

                  <td className="p-6">
                    {item.total}
                  </td>

                  <td className="p-6">
                    <span className="bg-green-100 text-green-600 px-4 py-2 rounded-full">
                      ใช้งาน
                    </span>
                  </td>

                  <td className="p-6 flex gap-3">

                    <button className="border rounded-xl p-3 hover:bg-gray-100">
                      <FaEdit />
                    </button>

                    <button className="border rounded-xl p-3 text-red-600 hover:bg-red-50">
                      <FaTrash />
                    </button>

                  </td>

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
        active
          ? "bg-red-600 shadow-lg"
          : "hover:bg-white/10"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}