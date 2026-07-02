"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCalendarAlt,
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

function formatDate(value) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
  const [selectedDate, setSelectedDate] = useState(getToday());
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
        total_amount,
        submitted_at,
        seen_at
      `)
      .eq("report_date", selectedDate)
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
    void loadSubmissions();

    const channel = supabase
      .channel(`admin-stock-out-submissions-${selectedDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_sales_submissions",
        },
        () => {
          void loadSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

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
      alert(error.message || "ไม่สามารถรับทราบรายการตัดสต็อกได้");
      return;
    }

    await loadSubmissions();
  }

  function handleToday() {
    setSelectedDate(getToday());
  }

  return (
    <section className="mb-6 rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <FaBell className="text-xl" />

            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              รายการตัดสต็อกจากพนักงาน
            </h2>

            <p className="mt-1 text-gray-500">
              แสดงรายการที่พนักงานส่งในวันที่ {formatDate(selectedDate)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <FaCalendarAlt className="pointer-events-none absolute left-4 top-4 text-slate-400" />

            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-slate-800 outline-none focus:border-red-500"
            />
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-red-600 hover:bg-red-100"
          >
            วันนี้
          </button>

          <button
            type="button"
            onClick={loadSubmissions}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-gray-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <FaSyncAlt className={isLoading ? "animate-spin" : ""} />
            รีเฟรชรายการ
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-4 text-left">รหัสพนักงาน</th>
              <th className="p-4 text-left">ชื่อพนักงาน</th>
              <th className="p-4 text-left">จำนวนรายการ</th>
              <th className="p-4 text-left">จำนวนสินค้า</th>
              <th className="p-4 text-left">มูลค่ารวม</th>
              <th className="p-4 text-left">เวลาส่งรายการ</th>
              <th className="p-4 text-left">สถานะ</th>
            </tr>
          </thead>

          <tbody>
            {submissions.length > 0 ? (
              submissions.map((item) => (
                <tr key={item.id} className="border-b text-gray-800">
                  <td className="p-4 font-semibold">
                    {item.employee_code || "-"}
                  </td>

                  <td className="p-4">
                    {item.employee_name || "ไม่ระบุชื่อ"}
                  </td>

                  <td className="p-4">
                    {Number(item.bill_count || 0).toLocaleString()} รายการ
                  </td>

                  <td className="p-4">
                    {Number(item.item_quantity || 0).toLocaleString()} ชิ้น
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
                          : "รับทราบรายการ"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="p-10 text-center text-gray-500"
                >
                  {isLoading
                    ? "กำลังโหลดข้อมูล..."
                    : `ไม่มีพนักงานส่งรายการตัดสต็อกในวันที่ ${formatDate(
                        selectedDate
                      )}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}