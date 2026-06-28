"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCheckCircle,
  FaEye,
  FaSyncAlt,
} from "react-icons/fa";
import { supabase } from "../lib/supabase";

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDailySalesSubmissions() {
  const today = getToday();

  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);

  async function loadSubmissions() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("daily_sales_submissions")
      .select(`
        id,
        employee_code,
        employee_name,
        report_date,
        bill_count,
        item_quantity,
        discount_amount,
        total_amount,
        submitted_at,
        seen_at
      `)
      .eq("report_date", today)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error(error);
      setSubmissions([]);
    } else {
      setSubmissions(data || []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadSubmissions();

    const channel = supabase
      .channel(`admin-sales-submissions-${today}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_sales_submissions",
        },
        loadSubmissions
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = useMemo(() => {
    return submissions.filter((item) => !item.seen_at).length;
  }, [submissions]);

  async function handleMarkSeen(id) {
    setMarkingId(id);

    const { error } = await supabase.rpc(
      "mark_daily_sales_submission_seen",
      {
        p_submission_id: id,
      }
    );

    setMarkingId(null);

    if (error) {
      console.error(error);
      alert(error.message || "ไม่สามารถรับทราบยอดขายได้");
      return;
    }

    await loadSubmissions();
  }

  return (
    <section className="bg-white rounded-3xl border shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <FaBell className="text-xl" />

            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              ยอดส่งจากพนักงานวันนี้
            </h2>

            <p className="text-gray-500 mt-1">
              รายการที่ User ส่งเข้าระบบโดยตรง
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSubmissions}
          disabled={isLoading}
          className="border rounded-xl px-5 py-3 flex items-center gap-2 text-gray-700 disabled:opacity-60"
        >
          <FaSyncAlt className={isLoading ? "animate-spin" : ""} />
          รีเฟรชยอดส่ง
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-4 text-left">รหัสพนักงาน</th>
              <th className="p-4 text-left">ชื่อพนักงาน</th>
              <th className="p-4 text-left">จำนวนบิล</th>
              <th className="p-4 text-left">จำนวนสินค้า</th>
              <th className="p-4 text-left">ส่วนลด</th>
              <th className="p-4 text-left">ยอดสุทธิ</th>
              <th className="p-4 text-left">เวลาส่งยอด</th>
              <th className="p-4 text-left">สถานะ</th>
            </tr>
          </thead>

          <tbody>
            {submissions.length > 0 ? (
              submissions.map((item) => (
                <tr key={item.id} className="border-b text-gray-800">
                  <td className="p-4 font-semibold">
                    {item.employee_code}
                  </td>

                  <td className="p-4">{item.employee_name}</td>

                  <td className="p-4">{item.bill_count} บิล</td>

                  <td className="p-4">{item.item_quantity} ชิ้น</td>

                  <td className="p-4">
                    {formatMoney(item.discount_amount)} บาท
                  </td>

                  <td className="p-4 font-bold text-red-600">
                    {formatMoney(item.total_amount)} บาท
                  </td>

                  <td className="p-4">
                    {formatDateTime(item.submitted_at)}
                  </td>

                  <td className="p-4">
                    {item.seen_at ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-2 text-sm text-green-700">
                        <FaCheckCircle />
                        รับทราบแล้ว
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkSeen(item.id)}
                        disabled={markingId === item.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 disabled:opacity-60"
                      >
                        <FaEye />
                        {markingId === item.id
                          ? "กำลังบันทึก..."
                          : "รับทราบยอด"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="8"
                  className="p-10 text-center text-gray-500"
                >
                  {isLoading
                    ? "กำลังโหลดข้อมูล..."
                    : "วันนี้ยังไม่มีพนักงานส่งยอด"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}