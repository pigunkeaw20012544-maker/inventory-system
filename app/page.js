"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaUser, FaLock } from "react-icons/fa";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* Left Side - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-black relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"
          alt="coffee"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />

        <div className="absolute top-0 right-0 w-[250px] h-full bg-red-600 rounded-l-full opacity-80"></div>

        <div className="relative z-10 p-8 sm:p-12 lg:p-16 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-4 rounded-2xl text-2xl sm:text-3xl">
              ☕
            </div>

            <div>
              <h2 className="text-sm sm:text-lg lg:text-xl">ระบบบริหารจัดการ</h2>
              <h1 className="text-lg sm:text-2xl lg:text-4xl font-bold">
                ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
              </h1>
            </div>
          </div>

          <div className="w-16 h-1 bg-red-500 mt-10 mb-6"></div>

          <p className="text-sm sm:text-base lg:text-lg leading-8">
            จัดการร้านค้าได้อย่างมีประสิทธิภาพ
            <br />
            ควบคุมสต๊อกสินค้า ยอดขาย ลูกค้า
            <br />
            และรายงานในระบบเดียว
          </p>
        </div>
      </div>

      {/* Right Side - Full width on mobile, half on desktop */}
      <div className="w-full lg:w-1/2 bg-gray-100 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white w-full max-w-sm sm:max-w-md md:max-w-lg p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl shadow-xl">

          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 p-3 sm:p-4">
              <img
                src="https://cdn-icons-png.flaticon.com/128/8639/8639414.png"
                alt="Login"
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">เข้าสู่ระบบ</h1>

            <p className="text-gray-500 mt-2 text-sm sm:text-base">
              กรุณาเข้าสู่ระบบเพื่อใช้งาน
            </p>
          </div>

          {/* Username */}
          <div className="mt-6 sm:mt-8 relative">
            <FaUser className="absolute left-3 sm:left-4 top-3 sm:top-4 text-gray-400" />

            <input
              type="text"
              placeholder="Username"
              className="w-full border rounded-lg sm:rounded-xl pl-10 sm:pl-12 py-2 sm:py-4 text-sm sm:text-base outline-none focus:border-red-500"
            />
          </div>

          {/* Password */}
          <div className="mt-3 sm:mt-4 relative">
            <FaLock className="absolute left-3 sm:left-4 top-3 sm:top-4 text-gray-400" />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full border rounded-lg sm:rounded-xl pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-4 text-sm sm:text-base outline-none focus:border-red-500"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 sm:right-4 top-3 sm:top-4 text-gray-400 text-base sm:text-xl"
            >
              {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between mt-3 sm:mt-4 text-xs sm:text-sm gap-2 sm:gap-0">
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Remember me
            </label>

            <button className="text-red-600 text-left sm:text-right">
              Forgot password?
            </button>
          </div>

          <button
            onClick={handleLogin}
            className="
              w-full
              bg-red-600
              hover:bg-red-700
              text-white
              py-2 sm:py-4
              rounded-lg sm:rounded-xl
              mt-4 sm:mt-6
              font-semibold
              text-sm sm:text-base
            "
          >
            Login
          </button>

        </div>
      </div>
    </div>
  );
}