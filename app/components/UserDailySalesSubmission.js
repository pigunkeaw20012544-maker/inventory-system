"use client";

import { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaPaperPlane,
  FaSyncAlt,
  FaUserCheck,
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

export default function UserDailySalesSubmission() {
  const today = getToday();

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadSummary() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "get_my_daily_sales_summary",
      {
        p_report_date: today,
      }
    );

    if (error) {
      console.error(error);
      setErrorMessage(error.message || "ไม่สามารถโหลดสรุปยอดขายได้");
      setSummary(null);
    } else {
      setSummary(data?.[0] || null);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadSummary();

    const channel = supabase
      .channel(`user-daily-sales-${today}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        loadSummary
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sale_items" },
        loadSummary
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_sales_submissions" },
        loadSummary
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleSubmit() {
    const confirmed = window.confirm(
      "ต้องการส่งสรุปยอดวันนี้ให้ผู้ดูแลระบบใช่หรือไม่?"
    );

    if (!confirmed) return;

    setIsSubmitting(true);

    const { error } = await supabase.rpc(
      "submit_my_daily_sales_summary",
      {
        p_report_date: today,
      }
    );

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      alert(error.message || "ส่งยอดขายไม่สำเร็จ");
      return;
    }

    await loadSummary();
    alert("ส่งสรุปยอดวันนี้ให้ผู้ดูแลระบบสำเร็จ");
  }

  return (
    <section className="bg-white rounded-3xl border shadow-sm p-6 mb-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <FaUserCheck className="text-xl" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                สรุปยอดขายของฉันวันนี้
              </h2>

              <p className="text-gray-500 mt-1">
                วันที่ {formatDate(today)}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="mt-6 text-gray-500">กำลังโหลดสรุปยอดขาย...</p>
          ) : errorMessage ? (
            <p className="mt-6 text-red-600">{errorMessage}</p>
          ) : (
            <>
              <p className="mt-5 text-gray-700">
                รหัสพนักงาน:{" "}
                <span className="font-bold">
                  {summary?.employee_code || "-"}
                </span>
                {" · "}
                พนักงานขาย:{" "}
                <span className="font-bold">
                  {summary?.employee_name || "User"}
                </span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                <MiniCard
                  label="จำนวนบิลขาย"
                  value={`${summary?.bill_count || 0} บิล`}
                />

                <MiniCard
                  label="จำนวนสินค้าที่ขาย"
                  value={`${summary?.item_quantity || 0} ชิ้น`}
                />

                <MiniCard
                  label="ยอดขายสุทธิ"
                  value={`${formatMoney(summary?.total_amount)} บาท`}
                  strong
                />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadSummary}
            disabled={isLoading}
            className="border rounded-xl px-5 py-3 text-gray-700 flex items-center gap-2 disabled:opacity-60"
          >
            <FaSyncAlt className={isLoading ? "animate-spin" : ""} />
            รีเฟรชยอด
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="bg-red-600 text-white rounded-xl px-5 py-3 flex items-center gap-2 disabled:bg-red-300"
          >
            {summary?.submitted_at ? <FaCheckCircle /> : <FaPaperPlane />}
            {isSubmitting
                ? "กำลังส่งสรุปยอด..."
                : summary?.submitted_at
                ? "ส่งสรุปยอดอีกครั้ง"
                : "ส่งสรุปยอดวันนี้"}
          </button>
        </div>
      </div>

      {summary?.submitted_at && (
        <p className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-green-700">
          ส่งยอดล่าสุดเมื่อ {formatDateTime(summary.submitted_at)}
        </p>
      )}

      <p className="mt-4 text-sm text-gray-500">
        หากมีการขายเพิ่มหลังส่งยอด สามารถกดส่งยอดอีกครั้งได้
        ระบบจะอัปเดตยอดเดิมของวันนั้นให้ Admin เห็นทันที
      </p>
    </section>
  );
}

function MiniCard({ label, value, strong }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        strong
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-gray-200 bg-gray-50 text-gray-800"
      }`}
    >
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-xl font-bold mt-2">{value}</p>
    </div>
  );
}