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
      setErrorMessage(
        error.message || "ไม่สามารถโหลดสรุปรายการตัดสต็อกได้"
      );
      setSummary(null);
    } else {
      setSummary(data?.[0] || null);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    void loadSummary();

    const channel = supabase
      .channel(`user-daily-stock-out-${today}`)
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
        {
          event: "*",
          schema: "public",
          table: "daily_sales_submissions",
        },
        loadSummary
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleSubmit() {
    const confirmed = window.confirm(
      "ต้องการส่งสรุปรายการตัดสต็อกวันนี้ให้ผู้ดูแลระบบใช่หรือไม่?"
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
      alert(error.message || "ส่งรายการตัดสต็อกไม่สำเร็จ");
      return;
    }

    await loadSummary();
    alert("ส่งสรุปรายการตัดสต็อกให้ผู้ดูแลระบบสำเร็จ");
  }

  return (
    <section className="mb-6 rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <FaUserCheck className="text-xl" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                สรุปรายการตัดสต็อกของฉันวันนี้
              </h2>

              <p className="mt-1 text-gray-500">
                วันที่ {formatDate(today)}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="mt-6 text-gray-500">
              กำลังโหลดสรุปรายการตัดสต็อก...
            </p>
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
                ผู้ดำเนินการ:{" "}
                <span className="font-bold">
                  {summary?.employee_name || "User"}
                </span>
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MiniCard
                  label="จำนวนรายการตัดสต็อก"
                  value={`${summary?.bill_count || 0} รายการ`}
                />

                <MiniCard
                  label="จำนวนสินค้าที่ตัด"
                  value={`${summary?.item_quantity || 0} ชิ้น`}
                />

                <MiniCard
                  label="มูลค่ารวม"
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
            className="flex items-center gap-2 rounded-xl border px-5 py-3 text-gray-700 disabled:opacity-60"
          >
            <FaSyncAlt className={isLoading ? "animate-spin" : ""} />
            รีเฟรชรายการ
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white disabled:bg-red-300"
          >
            {summary?.submitted_at ? <FaCheckCircle /> : <FaPaperPlane />}

            {isSubmitting
              ? "กำลังส่งสรุป..."
              : summary?.submitted_at
              ? "ส่งสรุปอีกครั้ง"
              : "ส่งสรุปวันนี้"}
          </button>
        </div>
      </div>

      {summary?.submitted_at && (
        <p className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-green-700">
          ส่งสรุปล่าสุดเมื่อ {formatDateTime(summary.submitted_at)}
        </p>
      )}

      <p className="mt-4 text-sm text-gray-500">
        หากมีการตัดสต็อกเพิ่มหลังส่งสรุป สามารถกดส่งอีกครั้งได้
        ระบบจะอัปเดตข้อมูลของวันนั้นให้ผู้ดูแลระบบเห็นทันที
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
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}