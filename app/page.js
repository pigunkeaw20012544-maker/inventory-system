"use client";

import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src="/next.svg" alt="logo" width={40} height={16} />
            <div>
              <div className="text-sm text-slate-600">ระบบบริหารจัดการ</div>
              <div className="text-lg font-semibold">Retail Beverage Equipment</div>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            <a href="#" className="hover:text-slate-900">แดชบอร์ด</a>
            <a href="#" className="hover:text-slate-900">สินค้า</a>
            <a href="#" className="hover:text-slate-900">ลูกค้า</a>
            <a href="#" className="hover:text-slate-900">การขาย</a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">สวัสดี, ผู้ดูแลระบบ</h1>
            <p className="text-sm text-slate-500">ภาพรวมระบบและสถิติของร้านคุณ</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md">สร้างรายการใหม่</button>
            <button className="px-3 py-2 border rounded-md">นำออก</button>
          </div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-slate-500">ยอดขายวันนี้</div>
            <div className="text-2xl font-semibold">฿12,340</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-slate-500">สต็อกสินค้า</div>
            <div className="text-2xl font-semibold">1,254 รายการ</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-slate-500">ลูกค้าใหม่</div>
            <div className="text-2xl font-semibold">34</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-slate-500">คำสั่งซื้อรอชำระ</div>
            <div className="text-2xl font-semibold">7</div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">รายการสินค้า</h2>
              <a href="#" className="text-sm text-blue-600">ดูทั้งหมด</a>
            </div>

            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 border rounded-md">
                  <div className="w-16 h-16 bg-slate-100 rounded-md flex items-center justify-center">📦</div>
                  <div className="flex-1">
                    <div className="font-medium">เครื่องปั่นกาแฟ รุ่น A{i}</div>
                    <div className="text-sm text-slate-500">สต็อก: {50 * i} ชิ้น</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">ราคา</div>
                    <div className="font-semibold">฿{(2500 * i).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-3">กิจกรรมล่าสุด</h3>
            <ul className="text-sm text-slate-600 space-y-2">
              <li>สั่งซื้อ #1023 ถูกยืนยัน</li>
              <li>สต็อกสินค้า "กาแฟบด" เหลือน้อย</li>
              <li>ลูกค้าใหม่: คุณสมชาย</li>
            </ul>
          </aside>
        </section>
      </main>
    </div>
  );
}
