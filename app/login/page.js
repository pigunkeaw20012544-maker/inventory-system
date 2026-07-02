"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { FaUser, FaLock } from "react-icons/fa";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import BrandLogo from "../components/BrandLogo";

export default function LoginPage() {
const router = useRouter();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);

const [errorMessage, setErrorMessage] = useState("");
const [isLoading, setIsLoading] = useState(false);

async function handleLogin(event) {
event.preventDefault();


const inputEmail = email.trim();
const inputPassword = password.trim();

if (!inputEmail || !inputPassword) {
  setErrorMessage("กรุณากรอกอีเมลและรหัสผ่าน");
  return;
}

setIsLoading(true);
setErrorMessage("");

const { data, error } = await supabase.auth.signInWithPassword({
  email: inputEmail,
  password: inputPassword,
});

if (error || !data.user) {
  setIsLoading(false);
  setErrorMessage("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  return;
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", data.user.id)
  .single();

setIsLoading(false);

if (profileError) {
  console.error(profileError);
  setErrorMessage("ไม่พบข้อมูลสิทธิ์ผู้ใช้งาน กรุณาตรวจสอบตาราง profiles");
  return;
}

if (profile.role === "admin") {
  router.replace("/dashboard");
  return;
}

router.replace("/user/dashboard");


}

return ( <div className="min-h-screen flex"> <div className="hidden lg:block w-1/2 bg-black relative overflow-hidden"> <img
       src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"
       alt="coffee"
       className="absolute inset-0 w-full h-full object-cover opacity-40"
     />


    <div className="absolute top-0 right-0 w-[250px] h-full bg-red-600 rounded-l-full opacity-80"></div>

    <div className="relative z-10 p-16 text-white">
      <div className="max-w-[520px]">
  <div>
    <h2 className="text-lg text-white/90">
      ระบบบริหารจัดการ
    </h2>

    <h1 className="mt-1 text-3xl font-bold leading-tight xl:text-4xl">
      <span className="block">ร้านค้าปลีกอุปกรณ์</span>
      <span className="block">เครื่องดื่ม</span>
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

  <div className="w-full lg:w-1/2 bg-gray-100 flex items-center justify-center p-6">
    <form
      onSubmit={handleLogin}
      className="bg-white w-full max-w-[520px] rounded-3xl shadow-xl p-8 md:p-12"
    >
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-5xl">
          👤
        </div>
      </div>

      <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
        เข้าสู่ระบบ
      </h1>

      <p className="text-center text-gray-500 mb-8">
        กรุณาเข้าสู่ระบบเพื่อใช้งาน
      </p>

      {errorMessage && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 relative">
        <FaUser className="absolute left-4 top-4 text-gray-400" />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full border rounded-xl pl-12 py-4 text-gray-800 outline-none focus:border-red-500"
        />
      </div>

      <div className="mt-4 relative">
        <FaLock className="absolute left-4 top-4 text-gray-400" />

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full border rounded-xl pl-12 pr-12 py-4 text-gray-800 outline-none focus:border-red-500"
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
        <label className="flex items-center gap-2 text-gray-500">
          <input type="checkbox" />
          Remember me
        </label>

        <button
          type="button"
          onClick={() =>
            alert("ระบบลืมรหัสผ่านจะทำในขั้นตอนถัดไป")
          }
          className="text-red-600"
        >
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-4 rounded-xl mt-8 font-bold"
      >
        {isLoading ? "กำลังเข้าสู่ระบบ..." : "Login"}
      </button>
    </form>
  </div>
</div>


);
}
