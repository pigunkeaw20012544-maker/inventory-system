"use client";

import { useEffect } from "react";

export default function UserError({ error, reset }) {
  useEffect(() => {
    console.error("User page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fb] p-6">
      <section className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">ไม่สามารถโหลดหน้านี้ได้</h1>
        <p className="mt-3 text-slate-600">กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่ให้ติดต่อผู้ดูแลระบบ</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
        >
          ลองใหม่
        </button>
      </section>
    </main>
  );
}