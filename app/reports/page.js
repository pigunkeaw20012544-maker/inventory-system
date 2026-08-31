"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../components/AccountHeader";
import BrandLogo from "../components/BrandLogo";
import AdminDailySalesSubmissions from "../components/AdminDailySalesSubmissions";
import LogoutButton from "../components/LogoutButton";
import { supabase } from "../lib/supabase";

import {
  FaArrowUp,
  FaBars,
  FaBox,
  FaCalendarAlt,
  FaChartBar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileExcel,
  FaHistory,
  FaHome,
  FaLock,
  FaPrint,
  FaShoppingCart,
  FaSyncAlt,
  FaThLarge,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

/* =========================================================
   HELPERS
========================================================= */

function getLocalDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function getMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getDaysAfterString(value, days = 1) {
  const [year, month, day] = String(value)
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day + days
  );

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getPeriodRange(
  type,
  selectedDate,
  selectedMonth,
  selectedYear
) {
  if (type === "daily") {
    return {
      startDate: selectedDate,
      endDate: selectedDate,
    };
  }

  if (type === "monthly") {
    const [year, month] = selectedMonth
      .split("-")
      .map(Number);

    const lastDay = new Date(
      year,
      month,
      0
    ).getDate();

    return {
      startDate: `${year}-${String(month).padStart(
        2,
        "0"
      )}-01`,

      endDate: `${year}-${String(month).padStart(
        2,
        "0"
      )}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  return {
    startDate: `${selectedYear}-01-01`,
    endDate: `${selectedYear}-12-31`,
  };
}

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatMoney(value) {
  return toNumber(value).toLocaleString(
    "th-TH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatDate(value) {
  if (!value) return "-";

  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString(
    "th-TH",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatPeriodTitle(type, range) {
  if (type === "daily") {
    return `รายวัน: ${formatDate(
      range.startDate
    )}`;
  }

  const date = new Date(
    `${range.startDate}T00:00:00`
  );

  if (type === "monthly") {
    return `รายเดือน: ${date.toLocaleDateString(
      "th-TH",
      {
        month: "long",
        year: "numeric",
      }
    )}`;
  }

  return `รายปี: ${date.toLocaleDateString(
    "th-TH",
    {
      year: "numeric",
    }
  )}`;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll(
    '"',
    '""'
  )}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStockStatus(stock) {
  const amount = toNumber(stock);

  if (amount <= 0) return "หมด";
  if (amount < 10) return "ใกล้หมด";

  return "มีสินค้า";
}

function isIncomingMovement(type) {
  return [
    "initial_stock",
    "stock_in",
    "adjustment_in",
  ].includes(type);
}

function getMovementLabel(type) {
  const labels = {
    initial_stock: "สต็อกเริ่มต้น",
    stock_in: "รับสินค้าเข้า",
    sale_out: "ขายสินค้า",
    stock_out: "ตัดสต็อก",
    adjustment_in: "ปรับเพิ่ม",
    adjustment_out: "ปรับลด",
  };

  return labels[type] || type || "ไม่ระบุ";
}

/* =========================================================
   ADMIN REPORT PAGE
========================================================= */

export default function ReportsPage() {
  // null = เปิดหน้าแล้วไม่แสดงรายงาน
  const [selectedReport, setSelectedReport] =
    useState(null);

  const [reportType, setReportType] =
    useState("daily");

  const [selectedDate, setSelectedDate] =
    useState(getLocalDateString());

  const [selectedMonth, setSelectedMonth] =
    useState(getMonthValue());

  const [selectedYear, setSelectedYear] =
    useState(
      String(new Date().getFullYear())
    );

  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [
    stockMovements,
    setStockMovements,
  ] = useState([]);

  const [
    dailySubmissions,
    setDailySubmissions,
  ] = useState([]);

  const [closingInfo, setClosingInfo] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [isClosing, setIsClosing] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const periodRange = useMemo(
    () =>
      getPeriodRange(
        reportType,
        selectedDate,
        selectedMonth,
        selectedYear
      ),
    [
      reportType,
      selectedDate,
      selectedMonth,
      selectedYear,
    ]
  );

  /* =======================================================
     LOAD SUPABASE
  ======================================================= */

  const loadReport = useCallback(
    async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { startDate, endDate } =
          periodRange;

        const nextEnd =
          getDaysAfterString(endDate);

        const [
          salesResult,
          productsResult,
          movementsResult,
          submissionsResult,
          closingResult,
        ] = await Promise.all([
          supabase
            .from("sales")
            .select(`
              id,
              sale_number,
              sale_date,
              seller_name,
              note,
              subtotal_amount,
              discount_amount,
              total_amount,
              created_at
            `)
            .gte("sale_date", startDate)
            .lte("sale_date", endDate)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("products")
            .select(`
              id,
              product_code,
              barcode,
              name,
              category_id,
              price,
              stock,
              unit,
              status,
              created_at,
              updated_at,
              category:categories(name)
            `)
            .order("name", {
              ascending: true,
            }),

          supabase
            .from("stock_movements")
            .select(`
              id,
              product_id,
              product_code,
              product_name,
              movement_type,
              quantity,
              stock_before,
              stock_after,
              reference_no,
              note,
              employee_code,
              employee_name,
              created_at,
              unit,
              performed_by_name,
              performed_by_code
            `)
            .gte(
              "created_at",
              `${startDate}T00:00:00+07:00`
            )
            .lt(
              "created_at",
              `${nextEnd}T00:00:00+07:00`
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from(
              "daily_sales_submissions"
            )
            .select(`
              id,
              submitted_by,
              employee_code,
              employee_name,
              report_date,
              bill_count,
              item_quantity,
              discount_amount,
              total_amount,
              submitted_at,
              seen_at,
              seen_by
            `)
            .gte("report_date", startDate)
            .lte("report_date", endDate)
            .order("submitted_at", {
              ascending: false,
            }),

          supabase
            .from("report_closings")
            .select(`
              id,
              period_type,
              period_start,
              period_end,
              total_amount,
              bill_count,
              item_quantity,
              closed_by,
              closed_at
            `)
            .eq(
              "period_type",
              reportType
            )
            .eq(
              "period_start",
              startDate
            )
            .eq(
              "period_end",
              endDate
            )
            .maybeSingle(),
        ]);

        if (salesResult.error) {
          throw salesResult.error;
        }

        if (productsResult.error) {
          throw productsResult.error;
        }

        if (movementsResult.error) {
          throw movementsResult.error;
        }

        if (submissionsResult.error) {
          throw submissionsResult.error;
        }

        const salesData =
          salesResult.data || [];

        setSales(salesData);

        setProducts(
          productsResult.data || []
        );

        setStockMovements(
          movementsResult.data || []
        );

        setDailySubmissions(
          submissionsResult.data || []
        );

        setClosingInfo(
          closingResult.error
            ? null
            : closingResult.data || null
        );

        const saleIds = salesData.map(
          (sale) => sale.id
        );

        if (saleIds.length === 0) {
          setSaleItems([]);
        } else {
          const {
            data,
            error,
          } = await supabase
            .from("sale_items")
            .select(`
              id,
              sale_id,
              product_id,
              product_code,
              product_name,
              unit,
              quantity,
              price,
              discount,
              subtotal,
              created_at
            `)
            .in("sale_id", saleIds);

          if (error) {
            throw error;
          }

          setSaleItems(data || []);
        }
      } catch (error) {
        console.error(error);

        setErrorMessage(
          error?.message ||
            "ไม่สามารถโหลดข้อมูลรายงานได้"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [periodRange, reportType]
  );

  useEffect(() => {
    void loadReport();

    const channel = supabase
      .channel("admin-reports-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => void loadReport()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => void loadReport()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock_movements",
        },
        () => void loadReport()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "daily_sales_submissions",
        },
        () => void loadReport()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReport]);
    /* =======================================================
     CALCULATIONS
  ======================================================= */

  const itemSummaryBySale =
    useMemo(() => {
      return saleItems.reduce(
        (result, item) => {
          if (!result[item.sale_id]) {
            result[item.sale_id] = {
              quantity: 0,
            };
          }

          result[
            item.sale_id
          ].quantity += toNumber(
            item.quantity
          );

          return result;
        },
        {}
      );
    }, [saleItems]);

  const totalValue = useMemo(
    () =>
      sales.reduce(
        (sum, sale) =>
          sum +
          toNumber(
            sale.total_amount
          ),
        0
      ),
    [sales]
  );

  const totalQuantity = useMemo(
    () =>
      saleItems.reduce(
        (sum, item) =>
          sum +
          toNumber(item.quantity),
        0
      ),
    [saleItems]
  );

  const totalDiscount = useMemo(
    () =>
      sales.reduce(
        (sum, sale) =>
          sum +
          toNumber(
            sale.discount_amount
          ),
        0
      ),
    [sales]
  );

  const averagePerBill =
    sales.length > 0
      ? totalValue / sales.length
      : 0;

  const topProducts = useMemo(() => {
    const grouped = {};

    saleItems.forEach((item) => {
      const key =
        item.product_code ||
        item.product_name ||
        "unknown";

      if (!grouped[key]) {
        grouped[key] = {
          code:
            item.product_code || "-",
          name:
            item.product_name || "-",
          quantity: 0,
          amount: 0,
        };
      }

      grouped[key].quantity +=
        toNumber(item.quantity);

      grouped[key].amount +=
        toNumber(item.subtotal);
    });

    return Object.values(
      grouped
    ).sort(
      (a, b) =>
        b.quantity - a.quantity
    );
  }, [saleItems]);

  const topProduct = topProducts[0];

  const inventoryProducts =
    useMemo(() => {
      return products.map(
        (product) => ({
          ...product,

          category:
            Array.isArray(
              product.category
            )
              ? product.category[0]
                  ?.name || "-"
              : product.category
                  ?.name || "-",

          displayStatus:
            getStockStatus(
              product.stock
            ),
        })
      );
    }, [products]);

  const lowStockProducts =
    useMemo(
      () =>
        inventoryProducts.filter(
          (product) => {
            const stock =
              toNumber(
                product.stock
              );

            return (
              stock > 0 &&
              stock < 10
            );
          }
        ),
      [inventoryProducts]
    );

  const outOfStockProducts =
    useMemo(
      () =>
        inventoryProducts.filter(
          (product) =>
            toNumber(
              product.stock
            ) <= 0
        ),
      [inventoryProducts]
    );

  const totalInventoryQuantity =
    useMemo(
      () =>
        inventoryProducts.reduce(
          (sum, product) =>
            sum +
            toNumber(
              product.stock
            ),
          0
        ),
      [inventoryProducts]
    );

  const incomingQuantity =
    useMemo(
      () =>
        stockMovements.reduce(
          (sum, movement) =>
            isIncomingMovement(
              movement.movement_type
            )
              ? sum +
                toNumber(
                  movement.quantity
                )
              : sum,
          0
        ),
      [stockMovements]
    );

  const outgoingQuantity =
    useMemo(
      () =>
        stockMovements.reduce(
          (sum, movement) =>
            isIncomingMovement(
              movement.movement_type
            )
              ? sum
              : sum +
                toNumber(
                  movement.quantity
                ),
          0
        ),
      [stockMovements]
    );

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await loadReport();
    } finally {
      setIsRefreshing(false);
    }
  }

  /* =======================================================
     CLOSE PERIOD
  ======================================================= */

  async function handleClosePeriod() {
    if (
      selectedReport !== "closing"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `ยืนยันการปิดรอบ ${formatPeriodTitle(
          reportType,
          periodRange
        )} ?`
      );

    if (!confirmed) return;

    setIsClosing(true);

    try {
      const { error } =
        await supabase.rpc(
          "close_report_period",
          {
            p_period_type:
              reportType,

            p_start_date:
              periodRange.startDate,

            p_end_date:
              periodRange.endDate,
          }
        );

      if (error) {
        throw error;
      }

      await loadReport();

      alert(
        "ปิดรอบรายงานเรียบร้อย"
      );
    } catch (error) {
      console.error(error);

      alert(
        error?.message ||
          "ไม่สามารถปิดรอบรายงานได้"
      );
    } finally {
      setIsClosing(false);
    }
  }

  /* =======================================================
     EXPORT CSV
  ======================================================= */

  function exportCsv() {
    if (!selectedReport) {
      alert(
        "กรุณาเลือกรายงานก่อน"
      );
      return;
    }

    let headers = [];
    let rows = [];
    let filename = "report";

    if (
      selectedReport === "sales"
    ) {
      headers = [
        "ลำดับ",
        "เลขที่บิล",
        "วันที่ขาย",
        "ผู้ขาย",
        "จำนวนสินค้า",
        "ยอดก่อนส่วนลด",
        "ส่วนลด",
        "ยอดสุทธิ",
        "หมายเหตุ",
      ];

      rows = sales.map(
        (sale, index) => [
          index + 1,
          sale.sale_number || "-",
          formatDate(
            sale.sale_date
          ),
          sale.seller_name || "-",

          itemSummaryBySale[
            sale.id
          ]?.quantity || 0,

          toNumber(
            sale.subtotal_amount
          ),

          toNumber(
            sale.discount_amount
          ),

          toNumber(
            sale.total_amount
          ),

          sale.note || "",
        ]
      );

      filename = "sales";
    }

    if (
      selectedReport ===
      "inventory"
    ) {
      headers = [
        "รหัสสินค้า",
        "สินค้า",
        "หมวดหมู่",
        "ราคาขาย",
        "คงเหลือ",
        "หน่วย",
        "สถานะ",
      ];

      rows =
        inventoryProducts.map(
          (product) => [
            product.product_code ||
              "-",

            product.name || "-",

            product.category || "-",

            toNumber(
              product.price
            ),

            toNumber(
              product.stock
            ),

            product.unit ||
              "ชิ้น",

            product.displayStatus,
          ]
        );

      filename = "inventory";
    }

    if (
      selectedReport ===
      "lowStock"
    ) {
      headers = [
        "รหัสสินค้า",
        "สินค้า",
        "หมวดหมู่",
        "คงเหลือ",
        "หน่วย",
        "สถานะ",
      ];

      rows =
        lowStockProducts.map(
          (product) => [
            product.product_code ||
              "-",
            product.name || "-",
            product.category || "-",
            toNumber(
              product.stock
            ),
            product.unit ||
              "ชิ้น",
            product.displayStatus,
          ]
        );

      filename = "low-stock";
    }

    if (
      selectedReport ===
      "outOfStock"
    ) {
      headers = [
        "รหัสสินค้า",
        "สินค้า",
        "หมวดหมู่",
        "คงเหลือ",
        "หน่วย",
        "สถานะ",
      ];

      rows =
        outOfStockProducts.map(
          (product) => [
            product.product_code ||
              "-",
            product.name || "-",
            product.category || "-",
            toNumber(
              product.stock
            ),
            product.unit ||
              "ชิ้น",
            product.displayStatus,
          ]
        );

      filename = "out-of-stock";
    }

    if (
      selectedReport ===
      "movements"
    ) {
      headers = [
        "วันเวลา",
        "รหัสสินค้า",
        "สินค้า",
        "ประเภท",
        "จำนวน",
        "ก่อน",
        "หลัง",
        "ผู้ดำเนินการ",
        "หมายเหตุ",
      ];

      rows =
        stockMovements.map(
          (movement) => [
            formatDateTime(
              movement.created_at
            ),

            movement.product_code ||
              "-",

            movement.product_name ||
              "-",

            getMovementLabel(
              movement.movement_type
            ),

            `${
              isIncomingMovement(
                movement.movement_type
              )
                ? "+"
                : "-"
            }${toNumber(
              movement.quantity
            )}`,

            toNumber(
              movement.stock_before
            ),

            toNumber(
              movement.stock_after
            ),

            movement
              .performed_by_name ||
              movement.employee_name ||
              "-",

            movement.note || "-",
          ]
        );

      filename =
        "stock-movements";
    }

    if (
      selectedReport === "daily"
    ) {
      headers = [
        "วันที่",
        "รหัสพนักงาน",
        "ชื่อพนักงาน",
        "จำนวนบิล",
        "จำนวนสินค้า",
        "ส่วนลดรวม",
        "ยอดรวม",
        "เวลาส่ง",
        "สถานะ",
      ];

      rows =
        dailySubmissions.map(
          (item) => [
            formatDate(
              item.report_date
            ),

            item.employee_code ||
              "-",

            item.employee_name ||
              "-",

            toNumber(
              item.bill_count
            ),

            toNumber(
              item.item_quantity
            ),

            toNumber(
              item.discount_amount
            ),

            toNumber(
              item.total_amount
            ),

            formatDateTime(
              item.submitted_at
            ),

            item.seen_at
              ? "ตรวจสอบแล้ว"
              : "รอตรวจสอบ",
          ]
        );

      filename = "daily-sales";
    }

    if (
      selectedReport ===
      "closing"
    ) {
      headers = [
        "ประเภทรอบ",
        "วันที่เริ่ม",
        "วันที่สิ้นสุด",
        "จำนวนบิล",
        "จำนวนสินค้า",
        "ยอดรวม",
        "วันที่ปิด",
      ];

      rows = closingInfo
        ? [
            [
              closingInfo.period_type ||
                reportType,

              formatDate(
                closingInfo.period_start
              ),

              formatDate(
                closingInfo.period_end
              ),

              toNumber(
                closingInfo.bill_count
              ),

              toNumber(
                closingInfo.item_quantity
              ),

              toNumber(
                closingInfo.total_amount
              ),

              formatDateTime(
                closingInfo.closed_at
              ),
            ],
          ]
        : [];

      filename = "closing";
    }

    if (rows.length === 0) {
      alert(
        "ไม่มีข้อมูลสำหรับ Export CSV"
      );
      return;
    }

    const csv =
      "\ufeff" +
      [headers, ...rows]
        .map((row) =>
          row
            .map(csvCell)
            .join(",")
        )
        .join("\n");

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download = `${filename}-${periodRange.startDate}.csv`;

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  /* =======================================================
     PRINT REPORT
  ======================================================= */

  function printReport() {
    if (!selectedReport) {
      alert(
        "กรุณาเลือกรายงานก่อนพิมพ์"
      );
      return;
    }

    let title = "";
    let subtitle = "";
    let headers = [];
    let rows = [];

    if (
      selectedReport === "sales"
    ) {
      title = "รายงานยอดขาย";

      subtitle =
        formatPeriodTitle(
          reportType,
          periodRange
        );

      headers = [
        "ลำดับ",
        "เลขที่บิล",
        "วันที่ขาย",
        "ผู้ขาย",
        "จำนวนสินค้า",
        "ยอดก่อนส่วนลด",
        "ส่วนลด",
        "ยอดสุทธิ",
        "หมายเหตุ",
      ];

      rows = sales.map(
        (sale, index) => [
          index + 1,
          sale.sale_number || "-",
          formatDate(
            sale.sale_date
          ),
          sale.seller_name || "-",

          `${
            itemSummaryBySale[
              sale.id
            ]?.quantity || 0
          } ชิ้น`,

          `${formatMoney(
            sale.subtotal_amount
          )} บาท`,

          `${formatMoney(
            sale.discount_amount
          )} บาท`,

          `${formatMoney(
            sale.total_amount
          )} บาท`,

          sale.note || "-",
        ]
      );
    }

    if (
      selectedReport ===
      "inventory"
    ) {
      title =
        "รายงานสินค้าในคลัง";

      subtitle =
        "ข้อมูลสินค้าปัจจุบัน";

      headers = [
        "ลำดับ",
        "รหัสสินค้า",
        "สินค้า",
        "หมวดหมู่",
        "ราคาขาย",
        "คงเหลือ",
        "หน่วย",
        "สถานะ",
      ];

      rows =
        inventoryProducts.map(
          (product, index) => [
            index + 1,
            product.product_code ||
              "-",
            product.name || "-",
            product.category || "-",
            `${formatMoney(
              product.price
            )} บาท`,
            toNumber(
              product.stock
            ),
            product.unit ||
              "ชิ้น",
            product.displayStatus,
          ]
        );
    }

    if (
      selectedReport ===
      "lowStock"
    ) {
      title =
        "รายงานสินค้าใกล้หมด";

      subtitle =
        "สินค้าที่มีจำนวนคงเหลือ 1–9 ชิ้น";

      headers = [
        "ลำดับ",
        "รหัสสินค้า",
        "สินค้า",
        "หมวดหมู่",
        "คงเหลือ",
        "หน่วย",
        "สถานะ",
      ];

      rows =
        lowStockProducts.map(
          (product, index) => [
            index + 1,
            product.product_code ||
              "-",
            product.name || "-",
            product.category || "-",
            toNumber(
              product.stock
            ),
            product.unit ||
              "ชิ้น",
            product.displayStatus,
          ]
        );
    }

    if (
      selectedReport ===
      "outOfStock"
    ) {
      title =
        "รายงานสินค้าหมด";

      subtitle =
        "สินค้าที่ไม่มีจำนวนคงเหลือ";

      headers = [
        "ลำดับ",
        "รหัสสินค้า",
        "สินค้า",
        "หมวดหมู่",
        "คงเหลือ",
        "หน่วย",
        "สถานะ",
      ];

      rows =
        outOfStockProducts.map(
          (product, index) => [
            index + 1,
            product.product_code ||
              "-",
            product.name || "-",
            product.category || "-",
            toNumber(
              product.stock
            ),
            product.unit ||
              "ชิ้น",
            product.displayStatus,
          ]
        );
    }
        if (
      selectedReport ===
      "movements"
    ) {
      title =
        "รายงานการเคลื่อนไหวสต็อก";

      subtitle =
        formatPeriodTitle(
          reportType,
          periodRange
        );

      headers = [
        "ลำดับ",
        "วันเวลา",
        "รหัสสินค้า",
        "สินค้า",
        "ประเภท",
        "จำนวน",
        "ก่อน",
        "หลัง",
        "ผู้ดำเนินการ",
        "หมายเหตุ",
      ];

      rows =
        stockMovements.map(
          (movement, index) => [
            index + 1,

            formatDateTime(
              movement.created_at
            ),

            movement.product_code ||
              "-",

            movement.product_name ||
              "-",

            getMovementLabel(
              movement.movement_type
            ),

            `${
              isIncomingMovement(
                movement.movement_type
              )
                ? "+"
                : "-"
            }${toNumber(
              movement.quantity
            )}`,

            toNumber(
              movement.stock_before
            ),

            toNumber(
              movement.stock_after
            ),

            movement
              .performed_by_name ||
              movement.employee_name ||
              "-",

            movement.note || "-",
          ]
        );
    }

    if (
      selectedReport === "daily"
    ) {
      title =
        "รายงานยอดขายประจำวัน";

      subtitle =
        formatPeriodTitle(
          reportType,
          periodRange
        );

      headers = [
        "ลำดับ",
        "วันที่",
        "รหัสพนักงาน",
        "ชื่อพนักงาน",
        "จำนวนบิล",
        "จำนวนสินค้า",
        "ส่วนลดรวม",
        "ยอดรวม",
        "เวลาส่ง",
        "สถานะ",
      ];

      rows =
        dailySubmissions.map(
          (item, index) => [
            index + 1,

            formatDate(
              item.report_date
            ),

            item.employee_code ||
              "-",

            item.employee_name ||
              "-",

            toNumber(
              item.bill_count
            ),

            `${toNumber(
              item.item_quantity
            )} ชิ้น`,

            `${formatMoney(
              item.discount_amount
            )} บาท`,

            `${formatMoney(
              item.total_amount
            )} บาท`,

            formatDateTime(
              item.submitted_at
            ),

            item.seen_at
              ? "ตรวจสอบแล้ว"
              : "รอตรวจสอบ",
          ]
        );
    }

    if (
      selectedReport ===
      "closing"
    ) {
      title =
        "รายงานการปิดรอบ";

      subtitle =
        formatPeriodTitle(
          reportType,
          periodRange
        );

      headers = [
        "ประเภทรอบ",
        "วันที่เริ่ม",
        "วันที่สิ้นสุด",
        "จำนวนบิล",
        "จำนวนสินค้า",
        "ยอดรวม",
        "วันที่ปิด",
      ];

      rows = closingInfo
        ? [
            [
              closingInfo.period_type ||
                reportType,

              formatDate(
                closingInfo.period_start
              ),

              formatDate(
                closingInfo.period_end
              ),

              `${toNumber(
                closingInfo.bill_count
              )} บิล`,

              `${toNumber(
                closingInfo.item_quantity
              )} ชิ้น`,

              `${formatMoney(
                closingInfo.total_amount
              )} บาท`,

              formatDateTime(
                closingInfo.closed_at
              ),
            ],
          ]
        : [];
    }

    if (rows.length === 0) {
      alert(
        "ไม่มีข้อมูลสำหรับพิมพ์รายงาน"
      );
      return;
    }

    const head = headers
      .map(
        (item) =>
          `<th>${escapeHtml(
            item
          )}</th>`
      )
      .join("");

    const body = rows
      .map(
        (row) => `
          <tr>
            ${row
              .map(
                (value) =>
                  `<td>${escapeHtml(
                    value
                  )}</td>`
              )
              .join("")}
          </tr>
        `
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">

<title>${escapeHtml(
      title
    )}</title>

<style>
@page {
  size: A4 landscape;
  margin: 12mm;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: #111827;
  background: white;
  font-family: Tahoma, Arial, sans-serif;
  font-size: 11px;
}

.header {
  text-align: center;
  border-bottom: 2px solid #111827;
  padding-bottom: 14px;
  margin-bottom: 18px;
}

.header h1 {
  margin: 0;
  font-size: 20px;
}

.header h2 {
  margin: 7px 0 0;
  font-size: 17px;
}

.subtitle {
  margin-top: 6px;
  color: #475569;
}

.date {
  margin-top: 5px;
  color: #64748b;
  font-size: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  display: table-header-group;
}

th {
  background: #f1f5f9;
  border: 1px solid #94a3b8;
  padding: 7px 6px;
  text-align: left;
  font-size: 9px;
}

td {
  border: 1px solid #cbd5e1;
  padding: 6px;
  vertical-align: top;
  font-size: 9px;
}

tr {
  page-break-inside: avoid;
}

tbody tr:nth-child(even) {
  background: #f8fafc;
}

.count {
  margin-bottom: 10px;
  font-weight: bold;
}

.signature {
  width: 220px;
  margin: 50px 0 0 auto;
  text-align: center;
}

.signature-line {
  height: 30px;
  border-bottom: 1px solid #111827;
  margin-bottom: 5px;
}

.footer {
  margin-top: 20px;
  padding-top: 8px;
  border-top: 1px solid #94a3b8;
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: 9px;
}
</style>
</head>

<body>

<div class="header">

<h1>
ระบบบริหารจัดการร้านค้าปลีกอุปกรณ์และเครื่องดื่ม
</h1>

<h2>
${escapeHtml(title)}
</h2>

<div class="subtitle">
${escapeHtml(subtitle)}
</div>

<div class="date">
วันที่พิมพ์:
${escapeHtml(
  formatDateTime(
    new Date().toISOString()
  )
)}
</div>

</div>

<div class="count">
จำนวนทั้งหมด
${rows.length}
รายการ
</div>

<table>

<thead>
<tr>
${head}
</tr>
</thead>

<tbody>
${body}
</tbody>

</table>

<div class="signature">
<div class="signature-line"></div>
ผู้จัดทำรายงาน
</div>

<div class="footer">

<span>
${escapeHtml(title)}
</span>

<span>
ระบบบริหารจัดการร้านค้าปลีกอุปกรณ์และเครื่องดื่ม
</span>

</div>

</body>
</html>
`;

    /*
     * สร้าง iframe แยกสำหรับพิมพ์
     * ไม่ใช้ window.print() ของหน้า reports
     */

    const previousFrame =
      document.getElementById(
        "admin-report-print-frame"
      );

    if (previousFrame) {
      previousFrame.remove();
    }

    const frame =
      document.createElement(
        "iframe"
      );

    frame.id =
      "admin-report-print-frame";

    frame.style.position =
      "fixed";

    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.border = "0";
    frame.style.opacity = "0";

    document.body.appendChild(
      frame
    );

    const printDocument =
      frame.contentDocument ||
      frame.contentWindow?.document;

    if (!printDocument) {
      frame.remove();

      alert(
        "ไม่สามารถสร้างเอกสารสำหรับพิมพ์ได้"
      );

      return;
    }

    printDocument.open();
    printDocument.write(html);
    printDocument.close();

    setTimeout(() => {
      const printWindow =
        frame.contentWindow;

      if (!printWindow) {
        frame.remove();
        return;
      }

      printWindow.focus();
      printWindow.print();

      setTimeout(() => {
        frame.remove();
      }, 1500);
    }, 400);
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="flex min-h-screen bg-slate-50">
      <button
        type="button"
        onClick={() =>
          setSidebarOpen(
            (value) => !value
          )
        }
        className="fixed left-4 top-4 z-50 rounded-lg border bg-white p-2 shadow md:hidden"
      >
        {sidebarOpen ? (
          <FaTimes />
        ) : (
          <FaBars />
        )}
      </button>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="ปิดเมนู"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-40
          h-screen w-[280px]
          bg-[#182232] text-white
          transition-transform
          md:relative md:min-h-screen md:w-[290px]

          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        <div className="rounded-br-[42px] bg-red-600 px-7 py-8">
          <div className="flex items-center gap-3">
            <BrandLogo />

            <div>
              <h2 className="font-bold">
                ระบบบริหารจัดการ
              </h2>

              <p className="text-xs text-white/80">
                ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-2 p-5">
          <Menu
            icon={<FaHome />}
            text="Dashboard"
            href="/dashboard"
          />

          <Menu
            icon={<FaBox />}
            text="สินค้า"
            href="/products"
          />

          <Menu
            icon={<FaThLarge />}
            text="หมวดหมู่สินค้า"
            href="/categories"
          />

          <Menu
            icon={
              <FaShoppingCart />
            }
            text="การขาย"
            href="/sales"
          />

          <Menu
            icon={<FaArrowUp />}
            text="รับสินค้าเข้า"
            href="/stock-in"
          />

          <Menu
            icon={<FaHistory />}
            text="ประวัติสต็อก"
            href="/stock-movements"
          />

          <Menu
            active
            icon={<FaChartBar />}
            text="รายงาน"
            href="/reports"
          />

          <Menu
            icon={<FaUsers />}
            text="ผู้ใช้งาน"
            href="/users"
          />

          <div className="pt-5">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8 xl:p-10">
        <header className="flex flex-col justify-between gap-5 lg:flex-row">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                รายงานยอดขายและสินค้า
              </h1>

              <span className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-600">
                Admin
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              เลือกประเภทรายงานเพื่อแสดงข้อมูล
            </p>
          </div>

          <AccountHeader />
        </header>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportButton
              title="รายงานยอดขาย"
              active={
                selectedReport ===
                "sales"
              }
              onClick={() =>
                setSelectedReport(
                  "sales"
                )
              }
            />

            <ReportButton
              title="รายงานสินค้าในคลัง"
              active={
                selectedReport ===
                "inventory"
              }
              onClick={() =>
                setSelectedReport(
                  "inventory"
                )
              }
            />

            <ReportButton
              title="รายงานสินค้าใกล้หมด"
              active={
                selectedReport ===
                "lowStock"
              }
              onClick={() =>
                setSelectedReport(
                  "lowStock"
                )
              }
            />

            <ReportButton
              title="รายงานสินค้าหมด"
              active={
                selectedReport ===
                "outOfStock"
              }
              onClick={() =>
                setSelectedReport(
                  "outOfStock"
                )
              }
            />

            <ReportButton
              title="รายงานการเคลื่อนไหว"
              active={
                selectedReport ===
                "movements"
              }
              onClick={() =>
                setSelectedReport(
                  "movements"
                )
              }
            />

            <ReportButton
              title="ตรวจสอบยอดขายประจำวัน"
              active={
                selectedReport ===
                "daily"
              }
              onClick={() =>
                setSelectedReport(
                  "daily"
                )
              }
            />

            <ReportButton
              title="ปิดรอบรายงาน"
              active={
                selectedReport ===
                "closing"
              }
              onClick={() =>
                setSelectedReport(
                  "closing"
                )
              }
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <PeriodButton
              title="รายวัน"
              detail="ดูข้อมูลวันที่เลือก"
              active={
                reportType === "daily"
              }
              onClick={() =>
                setReportType("daily")
              }
            />

            <PeriodButton
              title="รายเดือน"
              detail="ดูข้อมูลรวมทั้งเดือน"
              active={
                reportType ===
                "monthly"
              }
              onClick={() =>
                setReportType(
                  "monthly"
                )
              }
            />

            <PeriodButton
              title="รายปี"
              detail="ดูข้อมูลรวมทั้งปี"
              active={
                reportType === "yearly"
              }
              onClick={() =>
                setReportType(
                  "yearly"
                )
              }
            />
          </div>
                    <div className="mt-6 grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-5">
            {reportType ===
              "daily" && (
              <DateInput
                label="เลือกวันที่"
                type="date"
                value={
                  selectedDate
                }
                onChange={(
                  event
                ) =>
                  setSelectedDate(
                    event.target
                      .value
                  )
                }
              />
            )}

            {reportType ===
              "monthly" && (
              <DateInput
                label="เลือกเดือน"
                type="month"
                value={
                  selectedMonth
                }
                onChange={(
                  event
                ) =>
                  setSelectedMonth(
                    event.target
                      .value
                  )
                }
              />
            )}

            {reportType ===
              "yearly" && (
              <DateInput
                label="เลือกปี ค.ศ."
                type="number"
                value={
                  selectedYear
                }
                onChange={(
                  event
                ) =>
                  setSelectedYear(
                    event.target
                      .value
                  )
                }
              />
            )}

            <button
              type="button"
              onClick={
                handleRefresh
              }
              disabled={
                isRefreshing
              }
              className="flex items-center justify-center gap-2 rounded-xl border p-4"
            >
              <FaSyncAlt
                className={
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }
              />

              รีเฟรชข้อมูล
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={
                !selectedReport
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-700 disabled:opacity-40"
            >
              <FaFileExcel />
              Export CSV
            </button>

            <button
              type="button"
              onClick={
                printReport
              }
              disabled={
                !selectedReport
              }
              className="flex items-center justify-center gap-2 rounded-xl border p-4 disabled:opacity-40"
            >
              <FaPrint />
              พิมพ์รายงาน
            </button>

            {selectedReport ===
              "closing" && (
              <button
                type="button"
                onClick={
                  handleClosePeriod
                }
                disabled={
                  isClosing
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 p-4 text-white disabled:opacity-40"
              >
                <FaLock />

                {isClosing
                  ? "กำลังปิดรอบ..."
                  : "ปิดรอบรายงาน"}
              </button>
            )}
          </div>
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {!selectedReport && (
          <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center">
            <FaChartBar className="mx-auto text-5xl text-slate-300" />

            <h2 className="mt-4 text-xl font-bold">
              เลือกประเภทรายงาน
            </h2>

            <p className="mt-2 text-slate-500">
              ตารางจะแสดงเมื่อกดเลือกรายงานด้านบน
            </p>
          </section>
        )}

        {selectedReport ===
          "sales" && (
          <>
            <Heading
              title="รายงานยอดขาย"
              detail={formatPeriodTitle(
                reportType,
                periodRange
              )}
            />

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <Summary
                title="ยอดขายสุทธิ"
                value={`${formatMoney(
                  totalValue
                )} บาท`}
              />

              <Summary
                title="จำนวนสินค้า"
                value={`${totalQuantity.toLocaleString()} ชิ้น`}
              />

              <Summary
                title="สินค้าขายมากที่สุด"
                value={
                  topProduct?.name ||
                  "-"
                }
              />

              <Summary
                title="ค่าเฉลี่ยต่อบิล"
                value={`${formatMoney(
                  averagePerBill
                )} บาท`}
              />
            </div>

            <SalesTable
              sales={sales}
              itemSummaryBySale={
                itemSummaryBySale
              }
              isLoading={
                isLoading
              }
            />
          </>
        )}

        {selectedReport ===
          "inventory" && (
          <>
            <Heading
              title="รายงานสินค้าในคลัง"
              detail="ข้อมูลสินค้าปัจจุบัน"
            />

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-4">
              <Summary
                title="สินค้าทั้งหมด"
                value={`${inventoryProducts.length} รายการ`}
              />

              <Summary
                title="จำนวนคงเหลือรวม"
                value={`${totalInventoryQuantity.toLocaleString()} ชิ้น`}
              />

              <Summary
                title="สินค้าใกล้หมด"
                value={`${lowStockProducts.length} รายการ`}
              />

              <Summary
                title="สินค้าหมด"
                value={`${outOfStockProducts.length} รายการ`}
              />
            </div>

            <ProductTable
              products={
                inventoryProducts
              }
              showPrice
              emptyText="ไม่พบสินค้า"
            />
          </>
        )}

        {selectedReport ===
          "lowStock" && (
          <>
            <Heading
              title="รายงานสินค้าใกล้หมด"
              detail="สินค้าคงเหลือ 1–9 ชิ้น"
            />

            <ProductTable
              products={
                lowStockProducts
              }
              emptyText="ไม่มีสินค้าใกล้หมด"
            />
          </>
        )}

        {selectedReport ===
          "outOfStock" && (
          <>
            <Heading
              title="รายงานสินค้าหมด"
              detail="สินค้าคงเหลือ 0 ชิ้นหรือน้อยกว่า"
            />

            <ProductTable
              products={
                outOfStockProducts
              }
              emptyText="ไม่มีสินค้าหมด"
            />
          </>
        )}

        {selectedReport ===
          "movements" && (
          <>
            <Heading
              title="รายงานการเคลื่อนไหวสต็อก"
              detail={formatPeriodTitle(
                reportType,
                periodRange
              )}
            />

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              <Summary
                title="จำนวนการเคลื่อนไหว"
                value={`${stockMovements.length} รายการ`}
              />

              <Summary
                title="จำนวนเพิ่มเข้า"
                value={`${incomingQuantity} ชิ้น`}
              />

              <Summary
                title="จำนวนตัดออก"
                value={`${outgoingQuantity} ชิ้น`}
              />
            </div>

            <MovementTable
              rows={
                stockMovements
              }
            />
          </>
        )}

        {selectedReport ===
          "daily" && (
          <>
            <Heading
              title="ตรวจสอบยอดขายประจำวัน"
              detail={formatPeriodTitle(
                reportType,
                periodRange
              )}
            />

            <div className="mt-6">
              <AdminDailySalesSubmissions />
            </div>
          </>
        )}

        {selectedReport ===
          "closing" && (
          <>
            <Heading
              title="ปิดรอบรายงาน"
              detail={formatPeriodTitle(
                reportType,
                periodRange
              )}
            />

            <section className="mt-6 rounded-3xl border bg-white p-6">
              {closingInfo ? (
                <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-700">
                  <FaCheckCircle />

                  <h3 className="mt-2 font-bold">
                    ปิดรอบแล้ว
                  </h3>

                  <p className="mt-2">
                    {toNumber(
                      closingInfo.bill_count
                    )}{" "}
                    บิล ·{" "}
                    {toNumber(
                      closingInfo.item_quantity
                    )}{" "}
                    ชิ้น
                  </p>

                  <p>
                    ยอดรวม{" "}
                    {formatMoney(
                      closingInfo.total_amount
                    )}{" "}
                    บาท
                  </p>

                  <p className="mt-1 text-sm">
                    {formatDateTime(
                      closingInfo.closed_at
                    )}
                  </p>
                </div>
              ) : (
                <p className="py-10 text-center text-slate-500">
                  ยังไม่มีข้อมูลการปิดรอบ
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Menu({
  icon,
  text,
  href,
  active,
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-xl px-4 py-3 ${
        active
          ? "bg-red-600 text-white"
          : "text-slate-200 hover:bg-white/10"
      }`}
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
}

function ReportButton({
  title,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left font-semibold ${
        active
          ? "border-red-600 bg-red-600 text-white"
          : "bg-white hover:bg-red-50"
      }`}
    >
      {title}
    </button>
  );
}

function PeriodButton({
  title,
  detail,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left ${
        active
          ? "bg-red-600 text-white"
          : "bg-white"
      }`}
    >
      <p className="font-bold">
        {title}
      </p>

      <p className="mt-1 text-sm opacity-70">
        {detail}
      </p>
    </button>
  );
}

function DateInput({
  label,
  type,
  value,
  onChange,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <div className="relative">
        <FaCalendarAlt className="absolute left-4 top-4 text-slate-400" />

        <input
          type={type}
          value={value}
          onChange={onChange}
          className="w-full rounded-xl border py-4 pl-11 pr-4"
        />
      </div>
    </div>
  );
}

function Heading({
  title,
  detail,
}) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold">
        {title}
      </h2>

      <p className="mt-1 text-slate-500">
        {detail}
      </p>
    </section>
  );
}

function Summary({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

function SalesTable({
  sales,
  itemSummaryBySale,
  isLoading,
}) {
  return (
    <TableCard title="รายการขาย">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>#</Th>
            <Th>วันที่</Th>
            <Th>เลขที่บิล</Th>
            <Th>ผู้ขาย</Th>
            <Th>จำนวน</Th>
            <Th>ยอดสุทธิ</Th>
          </tr>
        </thead>

        <tbody>
          {sales.map(
            (sale, index) => (
              <tr
                key={sale.id}
                className="border-t"
              >
                <Td>{index + 1}</Td>

                <Td>
                  {formatDate(
                    sale.sale_date
                  )}
                </Td>

                <Td>
                  {sale.sale_number ||
                    "-"}
                </Td>

                <Td>
                  {sale.seller_name ||
                    "-"}
                </Td>

                <Td>
                  {itemSummaryBySale[
                    sale.id
                  ]?.quantity || 0}
                </Td>

                <Td>
                  {formatMoney(
                    sale.total_amount
                  )}{" "}
                  บาท
                </Td>
              </tr>
            )
          )}

          {sales.length === 0 && (
            <EmptyRow
              span={6}
              text={
                isLoading
                  ? "กำลังโหลด..."
                  : "ไม่พบข้อมูล"
              }
            />
          )}
        </tbody>
      </table>
    </TableCard>
  );
}

function ProductTable({
  products,
  showPrice = false,
  emptyText,
}) {
  return (
    <TableCard title="รายการสินค้า">
      <table className="w-full min-w-[850px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>รหัสสินค้า</Th>
            <Th>สินค้า</Th>
            <Th>หมวดหมู่</Th>

            {showPrice && (
              <Th>ราคาขาย</Th>
            )}

            <Th>คงเหลือ</Th>
            <Th>หน่วย</Th>
            <Th>สถานะ</Th>
          </tr>
        </thead>

        <tbody>
          {products.map(
            (product) => (
              <tr
                key={product.id}
                className="border-t"
              >
                <Td>
                  {product.product_code ||
                    "-"}
                </Td>

                <Td>
                  {product.name}
                </Td>

                <Td>
                  {product.category}
                </Td>

                {showPrice && (
                  <Td>
                    {formatMoney(
                      product.price
                    )}
                  </Td>
                )}

                <Td>
                  {toNumber(
                    product.stock
                  )}
                </Td>

                <Td>
                  {product.unit ||
                    "ชิ้น"}
                </Td>

                <Td>
                  {product.displayStatus}
                </Td>
              </tr>
            )
          )}

          {products.length ===
            0 && (
            <EmptyRow
              span={
                showPrice ? 7 : 6
              }
              text={emptyText}
            />
          )}
        </tbody>
      </table>
    </TableCard>
  );
}

function MovementTable({ rows }) {
  return (
    <TableCard title="ประวัติการเคลื่อนไหวสต็อก">
      <table className="w-full min-w-[1000px] text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>วันเวลา</Th>
            <Th>รหัสสินค้า</Th>
            <Th>สินค้า</Th>
            <Th>ประเภท</Th>
            <Th>จำนวน</Th>
            <Th>ก่อน</Th>
            <Th>หลัง</Th>
            <Th>ผู้ดำเนินการ</Th>
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (movement) => (
              <tr
                key={movement.id}
                className="border-t"
              >
                <Td>
                  {formatDateTime(
                    movement.created_at
                  )}
                </Td>

                <Td>
                  {movement.product_code ||
                    "-"}
                </Td>

                <Td>
                  {movement.product_name ||
                    "-"}
                </Td>

                <Td>
                  {getMovementLabel(
                    movement.movement_type
                  )}
                </Td>

                <Td>
                  {isIncomingMovement(
                    movement.movement_type
                  )
                    ? "+"
                    : "-"}
                  {toNumber(
                    movement.quantity
                  )}
                </Td>

                <Td>
                  {toNumber(
                    movement.stock_before
                  )}
                </Td>

                <Td>
                  {toNumber(
                    movement.stock_after
                  )}
                </Td>

                <Td>
                  {movement
                    .performed_by_name ||
                    movement.employee_name ||
                    "-"}
                </Td>
              </tr>
            )
          )}

          {rows.length === 0 && (
            <EmptyRow
              span={8}
              text="ไม่พบข้อมูลการเคลื่อนไหว"
            />
          )}
        </tbody>
      </table>
    </TableCard>
  );
}

function TableCard({
  title,
  children,
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <h3 className="text-xl font-bold">
          {title}
        </h3>
      </div>

      <div className="overflow-x-auto">
        {children}
      </div>
    </section>
  );
}

function Th({ children }) {
  return (
    <th className="px-5 py-4 text-left font-semibold text-slate-600">
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td className="px-5 py-4 text-slate-700">
      {children}
    </td>
  );
}

function EmptyRow({
  span,
  text,
}) {
  return (
    <tr>
      <td
        colSpan={span}
        className="p-12 text-center text-slate-500"
      >
        {text}
      </td>
    </tr>
  );
}