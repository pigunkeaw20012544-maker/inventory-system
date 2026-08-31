"use client";

import { useCallback, useEffect, useState } from "react";
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

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function UserDailySalesSubmission({ onSummaryChange }) {
  const today = getToday();

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previousSubmissions, setPreviousSubmissions] = useState([]);

  // Calculate total amounts already submitted for the day
  function calculateSubmittedTotals() {
    return previousSubmissions.reduce(
      (totals, submission) => ({
        billCount: totals.billCount + toNumber(submission.bill_count),
        itemQuantity: totals.itemQuantity + toNumber(submission.item_quantity),
        totalAmount: totals.totalAmount + toNumber(submission.total_amount),
        discountAmount: totals.discountAmount + toNumber(submission.discount_amount),
      }),
      { billCount: 0, itemQuantity: 0, totalAmount: 0, discountAmount: 0 }
    );
  }

  // Calculate unsubmitted amounts (current - previously submitted)
  function calculateUnsubmittedAmounts() {
    if (!summary) {
      return { billCount: 0, itemQuantity: 0, totalAmount: 0, discountAmount: 0 };
    }

    const submitted = calculateSubmittedTotals();

    return {
      billCount: Math.max(0, toNumber(summary.bill_count) - submitted.billCount),
      itemQuantity: Math.max(0, toNumber(summary.item_quantity) - submitted.itemQuantity),
      totalAmount: Math.max(0, toNumber(summary.total_amount) - submitted.totalAmount),
      discountAmount: Math.max(0, toNumber(summary.discount_amount) - submitted.discountAmount),
    };
  }

  // Check if there are any unsubmitted amounts
  function hasUnsubmittedData() {
    const unsubmitted = calculateUnsubmittedAmounts();
    return (
      unsubmitted.billCount > 0 ||
      unsubmitted.itemQuantity > 0 ||
      unsubmitted.totalAmount > 0
    );
  }

  // Load all previous submissions for this user + date to calculate unsubmitted amounts
  const loadPreviousSubmissions = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return;

      const { data: submissions, error } = await supabase
        .from("daily_sales_submissions")
        .select("*")
        .eq("submitted_by", user.user.id)
        .eq("report_date", today)
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("Error loading previous submissions:", error);
        setPreviousSubmissions([]);
        return;
      }

      setPreviousSubmissions(submissions || []);
    } catch (err) {
      console.error("Error in loadPreviousSubmissions:", err);
      setPreviousSubmissions([]);
    }
  }, [today]);

  const loadSummary = useCallback(async () => {
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
          error.message || "ไม่สามารถโหลดสรุปยอดขายได้"
      );
      setSummary(null);
    } else {
      const nextSummary = data?.[0] || null;
      setSummary(nextSummary);
      onSummaryChange?.(nextSummary);
    }

    // Load all previous submissions to calculate unsubmitted amounts
    await loadPreviousSubmissions();

    setIsLoading(false);
  }, [onSummaryChange, today, loadPreviousSubmissions]);

  useEffect(() => {
    void loadSummary();

    const channel = supabase
      .channel(`user-daily-stock-out-${today}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => {
          // When sales change, reload summary and previous submissions
          void loadSummary();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sale_items" },
        () => {
          // When sale items change, reload summary and previous submissions
          void loadSummary();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_sales_submissions",
        },
        () => {
          // When a new submission is created, reload previous submissions to recalculate unsubmitted
          void loadPreviousSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSummary, loadPreviousSubmissions, today]);

  async function handleSubmit() {
    // Check if there are any unsubmitted amounts
    if (!hasUnsubmittedData()) {
      alert("ไม่มียอดขายใหม่ที่ยังไม่ได้ส่งในขณะนี้");
      return;
    }

    const unsubmitted = calculateUnsubmittedAmounts();
    const submitted = calculateSubmittedTotals();

    let confirmMessage = "ต้องการส่งสรุปยอดขายใหม่ใช่หรือไม่?\n\n";
    confirmMessage += `ยอดรวมทั้งหมดวันนี้:\n`;
    confirmMessage += `- บิล: ${toNumber(summary?.bill_count) || 0} รายการ\n`;
    confirmMessage += `- สินค้า: ${toNumber(summary?.item_quantity) || 0} ชิ้น\n`;
    confirmMessage += `- มูลค่า: ${formatMoney(summary?.total_amount)} บาท\n\n`;
    confirmMessage += `ส่งแล้วก่อนหน้านี้:\n`;
    confirmMessage += `- บิล: ${submitted.billCount} รายการ\n`;
    confirmMessage += `- สินค้า: ${submitted.itemQuantity} ชิ้น\n`;
    confirmMessage += `- มูลค่า: ${formatMoney(submitted.totalAmount)} บาท\n\n`;
    confirmMessage += `ยอดที่จะส่งในครั้งนี้ (ใหม่เท่านั้น):\n`;
    confirmMessage += `- บิล: ${unsubmitted.billCount} รายการ\n`;
    confirmMessage += `- สินค้า: ${unsubmitted.itemQuantity} ชิ้น\n`;
    confirmMessage += `- มูลค่า: ${formatMoney(unsubmitted.totalAmount)} บาท`;

    const confirmed = window.confirm(confirmMessage);

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
      alert(error.message || "ส่งยอดขายประจำวันไม่สำเร็จ");
      return;
    }

    await loadSummary();
    alert("ส่งยอดขายประจำวันให้ผู้ดูแลระบบสำเร็จ");
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
                สรุปยอดขายของฉันวันนี้
              </h2>

              <p className="mt-1 text-gray-500">
                วันที่ {formatDate(today)}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="mt-6 text-gray-500">
              กำลังโหลดสรุปยอดขาย...
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
                  {summary?.employee_name || "-"}
                </span>
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MiniCard
                  label="จำนวนบิลขาย (รวม)"
                  value={`${summary?.bill_count || 0} รายการ`}
                />

                <MiniCard
                  label="จำนวนสินค้าที่ตัด (รวม)"
                  value={`${summary?.item_quantity || 0} ชิ้น`}
                />

                <MiniCard
                  label="มูลค่ารวม (รวม)"
                  value={`${formatMoney(summary?.total_amount)} บาท`}
                  strong
                />
                <MiniCard
                  label="ส่วนลดรวม (รวม)"
                  value={`${formatMoney(summary?.discount_amount)} บาท`}
                />
              </div>

              {previousSubmissions.length > 0 && (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniCard
                    label="ส่งแล้ว: บิล"
                    value={`${calculateSubmittedTotals().billCount} รายการ`}
                    muted
                  />

                  <MiniCard
                    label="ส่งแล้ว: สินค้า"
                    value={`${calculateSubmittedTotals().itemQuantity} ชิ้น`}
                    muted
                  />

                  <MiniCard
                    label="ส่งแล้ว: มูลค่า"
                    value={`${formatMoney(calculateSubmittedTotals().totalAmount)} บาท`}
                    muted
                  />
                  <MiniCard
                    label="ส่งแล้ว: ส่วนลด"
                    value={`${formatMoney(calculateSubmittedTotals().discountAmount)} บาท`}
                    muted
                  />
                </div>
              )}

              {hasUnsubmittedData() && (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniCard
                    label="ยังไม่ส่ง: บิล"
                    value={`${calculateUnsubmittedAmounts().billCount} รายการ`}
                    highlight
                  />

                  <MiniCard
                    label="ยังไม่ส่ง: สินค้า"
                    value={`${calculateUnsubmittedAmounts().itemQuantity} ชิ้น`}
                    highlight
                  />

                  <MiniCard
                    label="ยังไม่ส่ง: มูลค่า"
                    value={`${formatMoney(calculateUnsubmittedAmounts().totalAmount)} บาท`}
                    highlight
                    strong
                  />
                  <MiniCard
                    label="ยังไม่ส่ง: ส่วนลด"
                    value={`${formatMoney(calculateUnsubmittedAmounts().discountAmount)} บาท`}
                    highlight
                  />
                </div>
              )}
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
            disabled={isSubmitting || isLoading || !hasUnsubmittedData()}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-white disabled:bg-red-300"
          >
            {hasUnsubmittedData() ? <FaPaperPlane /> : <FaCheckCircle />}

            {isSubmitting
              ? "กำลังส่งสรุป..."
              : hasUnsubmittedData()
              ? "ส่งสรุปใหม่"
              : "ไม่มีข้อมูลใหม่"}
          </button>
        </div>
      </div>

      {previousSubmissions.length > 0 && (
        <p className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-blue-700">
          ส่งแล้ว {previousSubmissions.length} ครั้ง ครั้งล่าสุด: {formatDateTime(previousSubmissions[0]?.submitted_at)}
        </p>
      )}

      <p className="mt-4 text-sm text-gray-500">
        ระบบรับส่งยอดขายหลายครั้งต่อวัน แต่ละครั้งจะบันทึกเฉพาะยอดขายใหม่ที่ยังไม่ได้ส่งครั้งก่อนหน้า
      </p>
    </section>
  );
}

function MiniCard({ label, value, strong, muted, highlight }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-yellow-200 bg-yellow-50 text-yellow-800"
          : muted
          ? "border-gray-300 bg-gray-100 text-gray-600"
          : strong
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-gray-200 bg-gray-50 text-gray-800"
      }`}
    >
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}