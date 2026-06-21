"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaUser, FaLock } from "react-icons/fa";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    const inputEmail = email.trim();
    const inputPassword = password.trim();

    if (inputEmail === "admin@gmail.com" && inputPassword === "12345678") {
      router.push("/dashboard");
      return;
    }

    if (inputEmail === "user@gmail.com" && inputPassword === "12345678") {
      router.push("/user/dashboard");
      return;
    }

    alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-1/2 bg-black relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"
          alt="coffee"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />

        <div className="absolute top-0 right-0 w-[250px] h-full bg-red-600 rounded-l-full opacity-80"></div>

        <div className="relative z-10 p-16 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-4 rounded-2xl text-3xl">☕</div>
            <div>
              <h2 className="text-xl">ระบบบริหารจัดการ</h2>
              <h1 className="text-4xl font-bold">
                ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
              </h1>
            </div>
          </div>

          <div className="w-20 h-1 bg-red-500 mt-16 mb-8"></div>

          <p className="text-lg leading-9">
            จัดการร้านค้าได้อย่างมีประสิทธิภาพ <br />
            ควบคุมสต็อกสินค้า ยอดขาย ลูกค้า <br />
            และรายงานในระบบเดียว
          </p>
        </div>
      </div>

      <div className="w-1/2 bg-gray-100 flex items-center justify-center">
        <div className="bg-white w-[520px] rounded-3xl shadow-xl p-12">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-5xl">
              👤
            </div>
          </div>

          <h1 className="text-4xl font-bold text-center mb-2">เข้าสู่ระบบ</h1>
          <p className="text-center text-gray-500 mb-8">
            กรุณาเข้าสู่ระบบเพื่อใช้งาน
          </p>

          <div className="mt-4 relative">
            <FaUser className="absolute left-4 top-4 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-xl pl-12 py-4 outline-none focus:border-red-500"
            />
          </div>

          <div className="mt-4 relative">
            <FaLock className="absolute left-4 top-4 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-xl pl-12 pr-12 py-4 outline-none focus:border-red-500"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4 text-gray-400"
            >
              {showPassword ? <IoEyeOutline /> : <IoEyeOffOutline />}
            </button>
          </div>

          <div className="flex justify-between items-center mt-4 text-sm">
            <label className="flex items-center gap-2 text-gray-400">
              <input type="checkbox" />
              Remember me
            </label>

            <button className="text-red-600">Forgot password?</button>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl mt-8 font-bold"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}