"use client";

import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-sky-900 via-blue-900 to-indigo-700 p-12">
        <div className="max-w-md text-white z-10">
          <h2 className="text-3xl font-semibold mb-4">ระบบบริหารจัดการ</h2>
          <h3 className="text-xl font-medium mb-6">ร้านค้าอุปกรณ์เครื่องดื่ม</h3>
          <p className="text-sm opacity-90">จัดการสินค้า ลูกค้า การขาย และสต็อกได้อย่างมีประสิทธิภาพครบจบในระบบเดียว เพื่อธุรกิจของคุณ</p>
        </div>

        <img
          src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80"
          alt="beverage equipment"
          className="absolute right-0 bottom-0 h-full object-cover opacity-60"
        />

        <div className="absolute left-6 bottom-6 flex gap-6 z-20 text-white text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18" />
            </svg>
            <span>จัดการง่าย</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0-1.657-1.343-3-3-3S6 9.343 6 11v1h6v-1z" />
            </svg>
            <span>ปลอดภัย</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="bg-blue-50 rounded-full p-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5.5 20a6.5 6.5 0 0113 0" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
            <p className="text-sm text-slate-500">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">ชื่อผู้ใช้ (Username)</label>
              <div className="relative">
                <input type="text" placeholder="ชื่อผู้ใช้" className="w-full border border-slate-200 rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                <span className="absolute right-3 top-3 text-slate-400">👤</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">รหัสผ่าน (Password)</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="รหัสผ่าน" className="w-full border border-slate-200 rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                <button type="button" aria-label="toggle" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2 text-slate-500">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.025.152-2.012.437-2.952"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="h-4 w-4" />
                จดจำฉัน
              </label>
              <a href="#" className="text-blue-600">ลืมรหัสผ่าน?</a>
            </div>

            <div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium">เข้าสู่ระบบ</button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"></div>
              <div className="text-sm text-slate-400">หรือ</div>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <div>
              <button type="button" className="w-full border border-slate-200 py-3 rounded-lg flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V5a2 2 0 00-2-2H6a2 2 0 00-2 2v6"/></svg>
                เข้าสู่ระบบด้วยบัญชีภายใน
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-slate-700">
              เพื่อความปลอดภัยของบัญชี หากกรอกข้อมูลผิดเกิน 5 ครั้ง บัญชีจะถูกล็อกชั่วคราว 15 นาที
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
