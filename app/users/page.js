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
  FaSearch,
} from "react-icons/fa";

export default function UsersPage() {
  const users = [
    ["EMP001", "นาย อนุชา ใจดี", "ผู้จัดการร้าน", "081-234-5678", "anucha@example.com", "Admin", "ใช้งาน", "25/05/2567"],
    ["EMP002", "น.ส. วราภรณ์ ศรีสุข", "พนักงานขาย", "082-345-6789", "waraporn@example.com", "พนักงานขาย", "ใช้งาน", "24/05/2567"],
    ["EMP003", "นาย กิตติพงษ์ ทองดี", "คลังสินค้า", "083-456-7890", "kittipong@example.com", "คลังสินค้า", "ใช้งาน", "24/05/2567"],
    ["EMP004", "น.ส. สุชาดา นิ่มนวล", "บัญชี", "084-567-8901", "suchada@example.com", "บัญชี", "ใช้งาน", "23/05/2567"],
    ["EMP005", "นาย ธนวัฒน์ มากมี", "ฝ่ายสนับสนุน", "085-678-9012", "thanawat@example.com", "ฝ่ายสนับสนุน", "ไม่ใช้งาน", "22/05/2567"],
    ["EMP006", "น.ส. จิราพร แก้วใส", "พนักงานขาย", "086-789-0123", "jiraporn@example.com", "พนักงานขาย", "ใช้งาน", "20/05/2567"],
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
          <Menu icon={<FaChartBar />} text="รายงาน" href="/reports" />
          <Menu active icon={<FaUsers />} text="ผู้ใช้งาน" href="/users" />
          <Menu icon={<FaSignOutAlt />} text="ออกจากระบบ" href="/login" />
        </nav>
      </aside>

      <main className="flex-1 p-10">
        <div className="flex items-center gap-4 mb-3">
          <h1 className="text-5xl font-bold text-gray-900">ผู้ใช้งาน</h1>
          <span className="bg-red-100 text-red-600 px-5 py-2 rounded-lg font-semibold">
            เฉพาะ Admin เท่านั้น
          </span>
        </div>

        <p className="text-gray-400 text-xl mb-8">
          Users &gt; ผู้ใช้งาน
        </p>

        <div className="bg-white rounded-3xl border shadow-sm p-6 mb-6">
          <div className="flex gap-10 text-lg font-semibold">
            <button className="text-red-600 border-b-4 border-red-600 pb-4">
              จัดการผู้ใช้งาน
            </button>
            <button className="pb-4">เพิ่มพนักงาน</button>
            <button className="pb-4">ลบพนักงาน</button>
            <button className="pb-4">ออกรหัสพนักงาน</button>
            <button className="pb-4">ประวัติการเข้าใช้งาน</button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <Summary title="พนักงานทั้งหมด" value="12 คน" color="red" />
          <Summary title="ใช้งานอยู่" value="10 คน" color="green" />
          <Summary title="ไม่ใช้งาน" value="2 คน" color="orange" />
          <Summary title="สิทธิ์ Admin" value="2 คน" color="blue" />
        </div>

        <div className="bg-white rounded-3xl border shadow-sm p-6">
          <div className="flex justify-between mb-6">
            <div className="relative">
              <FaSearch className="absolute left-4 top-4 text-gray-400" />
              <input
                placeholder="ค้นหาชื่อ, อีเมล, รหัสพนักงาน หรือเบอร์โทร"
                className="border rounded-xl pl-12 pr-5 py-3 w-[520px]"
              />
            </div>

            <button className="bg-red-600 text-white px-7 py-3 rounded-xl flex items-center gap-2">
              <FaPlus />
              เพิ่มพนักงาน
            </button>
          </div>

          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">#</th>
                <th className="p-4 text-left">รหัสพนักงาน</th>
                <th className="p-4 text-left">ชื่อ-นามสกุล</th>
                <th className="p-4 text-left">ตำแหน่ง</th>
                <th className="p-4 text-left">เบอร์โทรศัพท์</th>
                <th className="p-4 text-left">อีเมล</th>
                <th className="p-4 text-left">สิทธิ์การใช้งาน</th>
                <th className="p-4 text-left">สถานะ</th>
                <th className="p-4 text-left">วันที่เพิ่ม</th>
                <th className="p-4 text-left">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user, index) => (
                <tr key={index} className="border-b">
                  <td className="p-4">{index + 1}</td>
                  <td className="p-4 font-semibold">{user[0]}</td>
                  <td className="p-4">{user[1]}</td>
                  <td className="p-4">{user[2]}</td>
                  <td className="p-4">{user[3]}</td>
                  <td className="p-4">{user[4]}</td>
                  <td className="p-4">
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-lg">
                      {user[5]}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-lg ${
                        user[6] === "ใช้งาน"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {user[6]}
                    </span>
                  </td>
                  <td className="p-4">{user[7]}</td>
                  <td className="p-4 flex gap-3">
                    <button className="border rounded-lg p-3">
                      <FaEdit />
                    </button>
                    <button className="border rounded-lg p-3 text-red-600">
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
        active ? "bg-red-600 shadow-lg" : "hover:bg-white/10"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

function Summary({ title, value, color }) {
  const colors = {
    red: "bg-red-100 text-red-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-500",
    blue: "bg-blue-100 text-blue-600",
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm p-6">
      <div className={`w-14 h-14 rounded-2xl mb-4 ${colors[color]}`}></div>
      <p className="font-bold">{title}</p>
      <h2 className="text-3xl font-bold mt-2">{value}</h2>
    </div>
  );
}