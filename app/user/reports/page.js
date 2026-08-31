"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AccountHeader from "../../components/AccountHeader";
import BrandLogo from "../../components/BrandLogo";
import LogoutButton from "../../components/LogoutButton";
import UserDailySalesSubmission from "../../components/UserDailySalesSubmission";
import { supabase } from "../../lib/supabase";

import {
  FaBars,
  FaArrowUp,
  FaBarcode,
  FaBox,
  FaBoxOpen,
  FaCalendarAlt,
  FaChartBar,
  FaFileExcel,
  FaHistory,
  FaHome,
  FaPrint,
  FaShoppingCart,
  FaSyncAlt,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

/* =========================================================
   DATE / FORMAT HELPERS
========================================================= */

function getLocalDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function getDaysAfterString(value, daysAfter = 1) {
  const [year, month, day] = String(value).split("-").map(Number);

  const date = new Date(
    year,
    month - 1,
    day + daysAfter
  );

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

/*
  stock_in.receive_date เป็น timestamp without time zone
  จึงแปลงขอบเขตวันของไทย UTC+7 ก่อนนำไปค้นหา
*/
function toStockInBoundary(dateStr) {
  const [year, month, day] = dateStr
    .split("-")
    .map(Number);

  const utcMs =
    Date.UTC(
      year,
      month - 1,
      day,
      0,
      0,
      0
    ) -
    7 * 60 * 60 * 1000;

  return new Date(utcMs)
    .toISOString()
    .slice(0, 19);
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

    return {
      startDate: `${year}-${String(month).padStart(
        2,
        "0"
      )}-01`,

      endDate: getLocalDateString(
        new Date(year, month, 0)
      ),
    };
  }

  const year = Number(selectedYear);

  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
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
  if (!value) {
    return "-";
  }

  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

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
  const startDate = new Date(
    `${range.startDate}T00:00:00`
  );

  if (type === "daily") {
    return `รายวัน: ${formatDate(
      range.startDate
    )}`;
  }

  if (type === "monthly") {
    return `รายเดือน: ${startDate.toLocaleDateString(
      "th-TH",
      {
        month: "long",
        year: "numeric",
      }
    )}`;
  }

  return `รายปี: ${startDate.toLocaleDateString(
    "th-TH",
    {
      year: "numeric",
    }
  )}`;
}

function csvCell(value) {
  const text = String(
    value ?? ""
  ).replaceAll('"', '""');

  return `"${text}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
   STOCK HELPERS
========================================================= */

function getStockStatus(stock) {
  const quantity = toNumber(stock);

  if (quantity <= 0) {
    return "หมด";
  }

  if (quantity < 10) {
    return "ใกล้หมด";
  }

  return "มีสินค้า";
}

function getDynamicValue(
  row,
  patterns
) {
  const entry = Object.entries(
    row || {}
  ).find(([key, value]) => {
    return (
      value !== null &&
      value !== undefined &&
      patterns.some((pattern) =>
        pattern.test(key)
      )
    );
  });

  return entry?.[1];
}

function getStockInDate(row) {
  return getDynamicValue(row, [
    /received_at/i,
    /created_at/i,
    /date/i,
  ]);
}

function formatStockInDateTime(row) {
  const value =
    getStockInDate(row);

  if (!value) {
    return "-";
  }

  return formatDateTime(
    /[zZ]|[+-]\d{2}:\d{2}$/.test(
      value
    )
      ? value
      : `${value}Z`
  );
}

function getStockInQuantity(row) {
  return toNumber(
    getDynamicValue(row, [
      /quantity/i,
      /qty/i,
      /amount/i,
    ])
  );
}

function getStockInProductId(row) {
  return getDynamicValue(row, [
    /^product_id$/i,
    /productid/i,
  ]);
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
    initial_stock:
      "สต็อกเริ่มต้น",

    stock_in:
      "รับสินค้าเข้า",

    sale_out:
      "ขายสินค้า",

    stock_out:
      "ตัดสต็อก",

    adjustment_in:
      "ปรับเพิ่ม",

    adjustment_out:
      "ปรับลด",
  };

  return (
    labels[type] ||
    type ||
    "ไม่ระบุ"
  );
}

/* =========================================================
   USER REPORTS PAGE
========================================================= */

export default function UserReportsPage() {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const reportTitles = {
    sales:
      "รายงานยอดขาย",

    lowStock:
      "รายงานสินค้าใกล้หมด",

    outOfStock:
      "รายงานสินค้าหมด",

    movements:
      "รายงานการเคลื่อนไหวสต็อก",

    daily:
      "ส่งยอดขายประจำวัน",
  };

  /*
    null = เปิดหน้าเข้ามา
    จะยังไม่แสดงรายงานจนกดเลือก
  */
  const [
    selectedReport,
    setSelectedReport,
  ] = useState(null);

  const [
    reportType,
    setReportType,
  ] = useState("daily");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    getLocalDateString()
  );

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState(
    getMonthValue()
  );

  const [
    selectedYear,
    setSelectedYear,
  ] = useState(
    String(
      new Date().getFullYear()
    )
  );

  const [
    sales,
    setSales,
  ] = useState([]);

  const [
    saleItems,
    setSaleItems,
  ] = useState([]);

  const [
    stockMovements,
    setStockMovements,
  ] = useState([]);

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    stockInRows,
    setStockInRows,
  ] = useState([]);

  const [
    stockInMovements,
    setStockInMovements,
  ] = useState([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    reporterName,
    setReporterName,
  ] = useState("");

  const [
    dailySummary,
    setDailySummary,
  ] = useState(null);

  const periodRange =
    useMemo(() => {
      return getPeriodRange(
        reportType,
        selectedDate,
        selectedMonth,
        selectedYear
      );
    }, [
      reportType,
      selectedDate,
      selectedMonth,
      selectedYear,
    ]);

  /* =======================================================
     LOAD REAL DATA FROM SUPABASE
  ======================================================= */

  const loadReport =
    useCallback(async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (
          authError ||
          !user
        ) {
          throw new Error(
            "ไม่พบข้อมูลผู้ใช้งาน"
          );
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            `
            display_name,
            employee_code,
            role,
            is_active
          `
          )
          .eq("id", user.id)
          .maybeSingle();

        if (
          profileError ||
          !profile ||
          profile.role !==
            "user" ||
          profile.is_active !==
            true
        ) {
          throw new Error(
            "ไม่พบสิทธิ์ผู้ใช้งานที่ถูกต้อง"
          );
        }

        setReporterName(
          profile.display_name ||
            "-"
        );

        const nextEndDate =
          getDaysAfterString(
            periodRange.endDate
          );

        const [
          salesResponse,
          stockMovementsResponse,
          productsResponse,
          stockInResponse,
          stockInMovementsResponse,
        ] =
          await Promise.all([
            /* =========================
               SALES OF THIS USER
            ========================= */

            supabase
              .from("sales")
              .select(`
                id,
                sale_number,
                sale_date,
                seller_name,
                note,
                total_amount,
                subtotal_amount,
                discount_amount,
                created_at
              `)
              .gte(
                "sale_date",
                periodRange.startDate
              )
              .lte(
                "sale_date",
                periodRange.endDate
              )
              .eq(
                "seller_name",
                profile.display_name
              )
              .order(
                "created_at",
                {
                  ascending: false,
                }
              ),

            /* =========================
               STOCK MOVEMENT OF USER
            ========================= */

            supabase
              .from(
                "stock_movements"
              )
              .select(`
                id,
                product_id,
                product_code,
                product_name,
                unit,
                movement_type,
                quantity,
                stock_before,
                stock_after,
                note,
                performed_by_user_id,
                performed_by_name,
                performed_by_code,
                created_at
              `)
              .eq(
                "performed_by_user_id",
                user.id
              )
              .gte(
                "created_at",
                `${periodRange.startDate}T00:00:00+07:00`
              )
              .lt(
                "created_at",
                `${nextEndDate}T00:00:00+07:00`
              )
              .order(
                "created_at",
                {
                  ascending: false,
                }
              ),

            /* =========================
               PRODUCTS
            ========================= */

            supabase
              .from("products")
              .select(`
                id,
                product_code,
                name,
                category_id,
                stock,
                unit,
                status,
                category:categories(name)
              `)
              .order("name", {
                ascending: true,
              }),

            /* =========================
               STOCK IN
            ========================= */

            supabase
              .from("stock_in")
              .select(`
                id,
                product_id,
                qty,
                receive_date
              `)
              .gte(
                "receive_date",
                toStockInBoundary(
                  periodRange.startDate
                )
              )
              .lt(
                "receive_date",
                toStockInBoundary(
                  nextEndDate
                )
              )
              .order(
                "receive_date",
                {
                  ascending: false,
                }
              )
              .limit(1000),

            /* =========================
               STOCK IN MOVEMENT
            ========================= */

            supabase
              .from(
                "stock_movements"
              )
              .select(`
                id,
                product_id,
                quantity,
                note,
                performed_by_name,
                performed_by_code,
                created_at
              `)
              .eq(
                "movement_type",
                "stock_in"
              )
              .gte(
                "created_at",
                `${periodRange.startDate}T00:00:00+07:00`
              )
              .lt(
                "created_at",
                `${nextEndDate}T00:00:00+07:00`
              )
              .order(
                "created_at",
                {
                  ascending: false,
                }
              )
              .limit(1000),
          ]);

        if (
          salesResponse.error
        ) {
          throw salesResponse.error;
        }

        if (
          stockMovementsResponse.error
        ) {
          throw stockMovementsResponse.error;
        }

        if (
          productsResponse.error
        ) {
          throw productsResponse.error;
        }

        if (
          stockInResponse.error
        ) {
          throw stockInResponse.error;
        }

        if (
          stockInMovementsResponse.error
        ) {
          throw stockInMovementsResponse.error;
        }

        const salesList =
          salesResponse.data ||
          [];

        const saleIds =
          salesList.map(
            (sale) => sale.id
          );

        let items = [];

        if (
          saleIds.length > 0
        ) {
          const {
            data: itemData,
            error: itemError,
          } = await supabase
            .from("sale_items")
            .select(`
              sale_id,
              product_code,
              product_name,
              quantity,
              price,
              subtotal
            `)
            .in(
              "sale_id",
              saleIds
            );

          if (itemError) {
            throw itemError;
          }

          items =
            itemData || [];
        }

        setSales(
          salesList
        );

        setSaleItems(
          items
        );

        setStockMovements(
          stockMovementsResponse.data ||
            []
        );

        setProducts(
          productsResponse.data ||
            []
        );

        setStockInRows(
          stockInResponse.data ||
            []
        );

        setStockInMovements(
          stockInMovementsResponse.data ||
            []
        );
      } catch (error) {
        console.error(error);

        setSales([]);
        setSaleItems([]);
        setStockMovements([]);
        setProducts([]);
        setStockInRows([]);
        setStockInMovements([]);

        setErrorMessage(
          error?.message ||
            "ไม่สามารถโหลดข้อมูลรายงานได้"
        );
      } finally {
        setIsLoading(false);
      }
    }, [periodRange]);

  /* =======================================================
     REALTIME
  ======================================================= */

  useEffect(() => {
    void loadReport();

    const channel =
      supabase
        .channel(
          "user-stock-reports-live"
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sales",
          },
          () => {
            void loadReport();
          }
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "sale_items",
          },
          () => {
            void loadReport();
          }
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "stock_movements",
          },
          () => {
            void loadReport();
          }
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "stock_in",
          },
          () => {
            void loadReport();
          }
        )

        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [loadReport]);

  /* =======================================================
     CALCULATE REPORT DATA
  ======================================================= */

  const summaryBySale =
    useMemo(() => {
      return saleItems.reduce(
        (result, item) => {
          if (
            !result[
              item.sale_id
            ]
          ) {
            result[
              item.sale_id
            ] = {
              quantity: 0,
              lines: 0,
            };
          }

          result[
            item.sale_id
          ].quantity +=
            toNumber(
              item.quantity
            );

          result[
            item.sale_id
          ].lines += 1;

          return result;
        },
        {}
      );
    }, [saleItems]);

  const totals =
    useMemo(() => {
      const totalValue =
        sales.reduce(
          (sum, sale) =>
            sum +
            toNumber(
              sale.total_amount
            ),
          0
        );

      const totalQuantity =
        saleItems.reduce(
          (sum, item) =>
            sum +
            toNumber(
              item.quantity
            ),
          0
        );

      const totalDiscount =
        sales.reduce(
          (sum, sale) =>
            sum +
            toNumber(
              sale.discount_amount
            ),
          0
        );

      return {
        totalValue,
        totalQuantity,
        totalDiscount,
      };
    }, [
      sales,
      saleItems,
    ]);
      const inventoryProducts = useMemo(() => {
    return products.map((product) => ({
      ...product,

      category:
        Array.isArray(product.category)
          ? product.category[0]?.name || "-"
          : product.category?.name || "-",

      status: getStockStatus(product.stock),
    }));
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return inventoryProducts.filter((product) => {
      const stock = toNumber(product.stock);

      return stock > 0 && stock < 10;
    });
  }, [inventoryProducts]);

  const outOfStockProducts = useMemo(() => {
    return inventoryProducts.filter((product) => {
      return toNumber(product.stock) <= 0;
    });
  }, [inventoryProducts]);

  const incomingQuantity = useMemo(() => {
    return stockMovements.reduce((sum, movement) => {
      if (!isIncomingMovement(movement.movement_type)) {
        return sum;
      }

      return sum + toNumber(movement.quantity);
    }, 0);
  }, [stockMovements]);

  const outgoingQuantity = useMemo(() => {
    return stockMovements.reduce((sum, movement) => {
      if (isIncomingMovement(movement.movement_type)) {
        return sum;
      }

      return sum + toNumber(movement.quantity);
    }, 0);
  }, [stockMovements]);

  const stockInProductMap = useMemo(() => {
    const result = {};

    products.forEach((product) => {
      result[String(product.id)] = product;
    });

    return result;
  }, [products]);

  const stockInRowsWithProduct = useMemo(() => {
    return stockInRows.map((row) => {
      const productId = getStockInProductId(row);

      const product =
        stockInProductMap[String(productId)] || null;

      const matchingMovement = stockInMovements.find((movement) => {
        return (
          String(movement.product_id) === String(productId) &&
          toNumber(movement.quantity) === getStockInQuantity(row)
        );
      });

      return {
        ...row,

        product_code:
          product?.product_code || "-",

        product_name:
          product?.name || "-",

        unit:
          product?.unit || "ชิ้น",

        performed_by_name:
          matchingMovement?.performed_by_name ||
          reporterName ||
          "-",

        performed_by_code:
          matchingMovement?.performed_by_code ||
          "-",

        note:
          matchingMovement?.note || "-",
      };
    });
  }, [
    stockInRows,
    stockInMovements,
    stockInProductMap,
    reporterName,
  ]);

  const totalStockInQuantity = useMemo(() => {
    return stockInRowsWithProduct.reduce((sum, row) => {
      return sum + getStockInQuantity(row);
    }, 0);
  }, [stockInRowsWithProduct]);

  /* =======================================================
     REFRESH
  ======================================================= */

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await loadReport();
    } finally {
      setIsRefreshing(false);
    }
  }
  /* เพิ่มตรงนี้ */
const handleDailySummaryChange = useCallback((summary) => {
  setDailySummary(summary || null);
}, []);

  /* =======================================================
     EXPORT CSV
  ======================================================= */

  function exportCsv() {
    if (!selectedReport) {
      alert("กรุณาเลือกรายงานก่อน Export CSV");
      return;
    }

    let headers = [];
    let rows = [];
    let fileName = `user-${selectedReport}`;

    if (selectedReport === "sales") {
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

      rows = sales.map((sale, index) => {
        const itemSummary =
          summaryBySale[sale.id] || {
            quantity: 0,
          };

        return [
          index + 1,
          sale.sale_number || "-",
          formatDate(sale.sale_date),
          sale.seller_name || reporterName || "-",
          itemSummary.quantity,
          toNumber(sale.subtotal_amount),
          toNumber(sale.discount_amount),
          toNumber(sale.total_amount),
          sale.note || "-",
        ];
      });

      fileName = "user-sales";
    }

    if (selectedReport === "lowStock") {
      headers = [
        "ลำดับ",
        "รหัสสินค้า",
        "ชื่อสินค้า",
        "หมวดหมู่",
        "คงเหลือ",
        "หน่วย",
        "สถานะ",
      ];

      rows = lowStockProducts.map((product, index) => [
        index + 1,
        product.product_code || "-",
        product.name || "-",
        product.category || "-",
        toNumber(product.stock),
        product.unit || "ชิ้น",
        product.status || "-",
      ]);

      fileName = "user-low-stock";
    }

    if (selectedReport === "outOfStock") {
      headers = [
        "ลำดับ",
        "รหัสสินค้า",
        "ชื่อสินค้า",
        "หมวดหมู่",
        "คงเหลือ",
        "หน่วย",
        "สถานะ",
      ];

      rows = outOfStockProducts.map((product, index) => [
        index + 1,
        product.product_code || "-",
        product.name || "-",
        product.category || "-",
        toNumber(product.stock),
        product.unit || "ชิ้น",
        product.status || "-",
      ]);

      fileName = "user-out-of-stock";
    }

    if (selectedReport === "movements") {
      headers = [
        "ลำดับ",
        "วันที่/เวลา",
        "รหัสสินค้า",
        "สินค้า",
        "ประเภท",
        "จำนวน",
        "สต็อกก่อน",
        "สต็อกหลัง",
        "ผู้ดำเนินการ",
        "หมายเหตุ",
      ];

      rows = stockMovements.map((movement, index) => [
        index + 1,
        formatDateTime(movement.created_at),
        movement.product_code || "-",
        movement.product_name || "-",
        getMovementLabel(movement.movement_type),

        `${
          isIncomingMovement(movement.movement_type)
            ? "+"
            : "-"
        }${toNumber(movement.quantity)}`,

        toNumber(movement.stock_before),
        toNumber(movement.stock_after),

        movement.performed_by_name ||
          reporterName ||
          "-",

        movement.note || "-",
      ]);

      fileName = "user-stock-movements";
    }

    if (selectedReport === "daily") {
      headers = [
        "วันที่รายงาน",
        "ผู้จัดทำรายงาน",
        "จำนวนบิล",
        "จำนวนสินค้า",
        "ส่วนลดรวม",
        "ยอดขายรวม",
        "วันที่ส่ง",
        "สถานะ",
      ];

      if (dailySummary) {
        rows = [
          [
            formatDate(dailySummary.report_date),
            reporterName || "-",
            toNumber(dailySummary.bill_count),
            toNumber(dailySummary.item_quantity),
            toNumber(dailySummary.discount_amount),
            toNumber(dailySummary.total_amount),
            formatDateTime(dailySummary.submitted_at),
            dailySummary.seen_at
              ? "ตรวจสอบแล้ว"
              : "รอตรวจสอบ",
          ],
        ];
      }

      fileName = "user-daily-sales";
    }

    if (rows.length === 0) {
      alert("ไม่มีข้อมูลสำหรับ Export CSV");
      return;
    }

    const csv =
      "\ufeff" +
      [headers, ...rows]
        .map((row) =>
          row.map(csvCell).join(",")
        )
        .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `${fileName}-${periodRange.startDate}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  }

  /* =======================================================
     PRINT REPORT
     รูปแบบเดียวกับ Admin
  ======================================================= */

  function printReport() {
    if (!selectedReport) {
      alert("กรุณาเลือกรายงานก่อนพิมพ์");
      return;
    }

    let reportTitle =
      reportTitles[selectedReport] || "รายงาน";

    let headers = [];
    let rows = [];

    if (selectedReport === "sales") {
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

      rows = sales.map((sale, index) => {
        const itemSummary =
          summaryBySale[sale.id] || {
            quantity: 0,
          };

        return [
          index + 1,
          sale.sale_number || "-",
          formatDate(sale.sale_date),
          sale.seller_name || reporterName || "-",

          `${itemSummary.quantity} ชิ้น`,

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
        ];
      });
    }

    if (selectedReport === "lowStock") {
      headers = [
        "ลำดับ",
        "รหัสสินค้า",
        "ชื่อสินค้า",
        "หมวดหมู่",
        "คงเหลือ",
        "หน่วย",
        "สถานะ",
      ];

      rows = lowStockProducts.map((product, index) => [
        index + 1,
        product.product_code || "-",
        product.name || "-",
        product.category || "-",
        toNumber(product.stock),
        product.unit || "ชิ้น",
        product.status || "-",
      ]);
    }

    if (selectedReport === "outOfStock") {
      headers = [
        "ลำดับ",
        "รหัสสินค้า",
        "ชื่อสินค้า",
        "หมวดหมู่",
        "คงเหลือ",
        "หน่วย",
        "สถานะ",
      ];

      rows = outOfStockProducts.map((product, index) => [
        index + 1,
        product.product_code || "-",
        product.name || "-",
        product.category || "-",
        toNumber(product.stock),
        product.unit || "ชิ้น",
        product.status || "-",
      ]);
    }

    if (selectedReport === "movements") {
      headers = [
        "ลำดับ",
        "วันที่/เวลา",
        "รหัสสินค้า",
        "ชื่อสินค้า",
        "ประเภท",
        "จำนวน",
        "สต็อกก่อน",
        "สต็อกหลัง",
        "ผู้ดำเนินการ",
        "หมายเหตุ",
      ];

      rows = stockMovements.map((movement, index) => [
        index + 1,
        formatDateTime(movement.created_at),
        movement.product_code || "-",
        movement.product_name || "-",

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

        movement.performed_by_name ||
          reporterName ||
          "-",

        movement.note || "-",
      ]);
    }

    if (selectedReport === "daily") {
      headers = [
        "วันที่รายงาน",
        "ผู้จัดทำรายงาน",
        "จำนวนบิล",
        "จำนวนสินค้า",
        "ส่วนลดรวม",
        "ยอดขายรวม",
        "วันที่ส่ง",
        "สถานะ",
      ];

      if (dailySummary) {
        rows = [
          [
            formatDate(
              dailySummary.report_date
            ),

            reporterName || "-",

            `${toNumber(
              dailySummary.bill_count
            )} บิล`,

            `${toNumber(
              dailySummary.item_quantity
            )} ชิ้น`,

            `${formatMoney(
              dailySummary.discount_amount
            )} บาท`,

            `${formatMoney(
              dailySummary.total_amount
            )} บาท`,

            formatDateTime(
              dailySummary.submitted_at
            ),

            dailySummary.seen_at
              ? "ตรวจสอบแล้ว"
              : "รอตรวจสอบ",
          ],
        ];
      }
    }

    if (rows.length === 0) {
      alert("ไม่มีข้อมูลสำหรับพิมพ์รายงาน");
      return;
    }

    const tableHead = headers
      .map(
        (header) =>
          `<th>${escapeHtml(header)}</th>`
      )
      .join("");

    const tableBody = rows
      .map(
        (row) => `
          <tr>
            ${row
              .map(
                (value) =>
                  `<td>${escapeHtml(value)}</td>`
              )
              .join("")}
          </tr>
        `
      )
      .join("");

    let summaryHtml = "";

    if (selectedReport === "sales") {
      summaryHtml = `
        <div class="summary-grid">
          <div class="summary-card">
            <span>จำนวนบิล</span>
            <strong>${sales.length.toLocaleString(
              "th-TH"
            )} บิล</strong>
          </div>

          <div class="summary-card">
            <span>จำนวนสินค้าที่ขาย</span>
            <strong>${totals.totalQuantity.toLocaleString(
              "th-TH"
            )} ชิ้น</strong>
          </div>

          <div class="summary-card">
            <span>ส่วนลดรวม</span>
            <strong>${formatMoney(
              totals.totalDiscount
            )} บาท</strong>
          </div>

          <div class="summary-card">
            <span>ยอดขายสุทธิ</span>
            <strong>${formatMoney(
              totals.totalValue
            )} บาท</strong>
          </div>
        </div>
      `;
    }

    if (selectedReport === "movements") {
      summaryHtml = `
        <div class="summary-grid">
          <div class="summary-card">
            <span>จำนวนการเคลื่อนไหว</span>
            <strong>${stockMovements.length.toLocaleString(
              "th-TH"
            )} รายการ</strong>
          </div>

          <div class="summary-card">
            <span>จำนวนเพิ่มเข้า</span>
            <strong>${incomingQuantity.toLocaleString(
              "th-TH"
            )} ชิ้น</strong>
          </div>

          <div class="summary-card">
            <span>จำนวนตัดออก</span>
            <strong>${outgoingQuantity.toLocaleString(
              "th-TH"
            )} ชิ้น</strong>
          </div>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>

      <html lang="th">
        <head>
          <meta charset="UTF-8" />

          <title>
            ${escapeHtml(reportTitle)}
          </title>

          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: white;
              color: #111827;

              font-family:
                Tahoma,
                Arial,
                sans-serif;
            }

            body {
              padding: 8px;
              font-size: 10px;
            }

            .report-header {
              text-align: center;

              padding-bottom: 10px;
              margin-bottom: 12px;

              border-bottom: 2px solid #111827;
            }

            .report-header h1 {
              margin: 0;

              font-size: 18px;
              font-weight: 700;
            }

            .report-header h2 {
              margin: 5px 0 0;

              font-size: 15px;
            }

            .report-meta {
              margin-top: 4px;

              color: #475569;

              font-size: 8px;
            }

            .summary-grid {
              display: grid;

              grid-template-columns:
                repeat(4, 1fr);

              gap: 7px;

              margin-bottom: 12px;
            }

            .summary-card {
              padding: 7px;

              border: 1px solid #cbd5e1;

              border-radius: 5px;
            }

            .summary-card span {
              display: block;

              margin-bottom: 3px;

              color: #64748b;

              font-size: 8px;
            }

            .summary-card strong {
              font-size: 10px;
            }

            .count {
              margin-bottom: 7px;

              font-weight: 700;

              font-size: 8px;
            }

            table {
              width: 100%;

              border-collapse: collapse;

              table-layout: auto;
            }

            thead {
              display: table-header-group;
            }

            th {
              padding: 5px 4px;

              border: 1px solid #64748b;

              background: #f1f5f9;

              text-align: left;

              font-size: 7px;

              font-weight: 700;
            }

            td {
              padding: 4px;

              border: 1px solid #94a3b8;

              vertical-align: top;

              font-size: 7px;

              word-break: break-word;
            }

            tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            tbody tr:nth-child(even) {
              background: #f8fafc;
            }

            .signature {
              width: 180px;

              margin:
                32px
                0
                0
                auto;

              text-align: center;

              font-size: 8px;
            }

            .signature-line {
              height: 24px;

              margin-bottom: 4px;

              border-bottom:
                1px
                solid
                #111827;
            }

            .footer {
              display: flex;

              justify-content:
                space-between;

              margin-top: 12px;

              padding-top: 5px;

              border-top:
                1px
                solid
                #94a3b8;

              color: #64748b;

              font-size: 7px;
            }
          </style>
        </head>

        <body>

          <header class="report-header">

            <h1>
              ระบบบริหารจัดการร้านค้าปลีกอุปกรณ์และเครื่องดื่ม
            </h1>

            <h2>
              ${escapeHtml(reportTitle)}
            </h2>

            <div class="report-meta">
              ${escapeHtml(
                formatPeriodTitle(
                  reportType,
                  periodRange
                )
              )}
            </div>

            <div class="report-meta">
              ผู้จัดทำรายงาน:
              ${escapeHtml(
                reporterName || "-"
              )}
            </div>

            <div class="report-meta">
              วันที่พิมพ์:
              ${escapeHtml(
                formatDateTime(
                  new Date().toISOString()
                )
              )}
            </div>

          </header>

          ${summaryHtml}

          <div class="count">
            จำนวนทั้งหมด
            ${rows.length.toLocaleString(
              "th-TH"
            )}
            รายการ
          </div>

          <table>

            <thead>
              <tr>
                ${tableHead}
              </tr>
            </thead>

            <tbody>
              ${tableBody}
            </tbody>

          </table>

          <div class="signature">

            <div class="signature-line"></div>

            ผู้จัดทำรายงาน

          </div>

          <footer class="footer">

            <span>
              ${escapeHtml(reportTitle)}
            </span>

            <span>
              ระบบบริหารจัดการร้านค้าปลีกอุปกรณ์และเครื่องดื่ม
            </span>

          </footer>

        </body>
      </html>
    `;

    /*
      พิมพ์ผ่าน iframe แยก
      เพื่อให้ผลเหมือนฝั่ง Admin
    */

    const oldFrame =
      document.getElementById(
        "user-report-print-frame"
      );

    if (oldFrame) {
      oldFrame.remove();
    }

    const iframe =
      document.createElement(
        "iframe"
      );

    iframe.id =
      "user-report-print-frame";

    iframe.style.position =
      "fixed";

    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents =
      "none";

    document.body.appendChild(
      iframe
    );

    const printDocument =
      iframe.contentDocument ||
      iframe.contentWindow?.document;

    if (!printDocument) {
      iframe.remove();

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
        iframe.contentWindow;

      if (!printWindow) {
        iframe.remove();

        alert(
          "ไม่สามารถเปิดหน้าพิมพ์ได้"
        );

        return;
      }

      printWindow.focus();

      printWindow.print();

      setTimeout(() => {
        iframe.remove();
      }, 1500);
    }, 400);
  }
    /* =======================================================
     USER INTERFACE
  ======================================================= */

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ===================================================
          MOBILE MENU BUTTON
      =================================================== */}

      <button
        type="button"
        onClick={() => setSidebarOpen((value) => !value)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-200 bg-white p-2 text-slate-900 shadow-lg md:hidden"
        aria-label="เปิดเมนู"
      >
        {sidebarOpen ? (
          <FaTimes size={20} />
        ) : (
          <FaBars size={20} />
        )}
      </button>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="ปิดเมนู"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`
          fixed left-0 top-0 z-40
          h-screen w-[280px]
          bg-[#182232] text-white
          transition-transform duration-300
          md:relative md:min-h-screen md:w-[290px]
          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        <div className="rounded-br-[42px] bg-red-600 px-7 py-8 shadow-lg">
          <div className="flex items-center gap-3">
            <BrandLogo />

            <div>
              <h2 className="text-lg font-bold">
                ระบบบริหารจัดการ
              </h2>

              <p className="text-xs text-white/80">
                ร้านค้าปลีกอุปกรณ์เครื่องดื่ม
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-2 p-5">
          <p className="px-4 pb-1 pt-2 text-xs text-slate-400">
            เมนูพนักงาน
          </p>

          <UserMenu
            icon={<FaHome />}
            text="หน้าหลัก"
            href="/user/dashboard"
            onNavigate={() => setSidebarOpen(false)}
          />

          <UserMenu
            icon={<FaBox />}
            text="สินค้า"
            href="/user/products"
            onNavigate={() => setSidebarOpen(false)}
          />

          <UserMenu
            icon={<FaBarcode />}
            text="สแกนบาร์โค้ด"
            href="/user/barcode"
            onNavigate={() => setSidebarOpen(false)}
          />

          <UserMenu
            icon={<FaArrowUp />}
            text="รับสินค้าเข้า"
            href="/user/stock-in"
            onNavigate={() => setSidebarOpen(false)}
          />

          <UserMenu
            icon={<FaShoppingCart />}
            text="ขายสินค้า"
            href="/user/sales"
            onNavigate={() => setSidebarOpen(false)}
          />

          <UserMenu
            active
            icon={<FaChartBar />}
            text="รายงาน"
            href="/user/reports"
            onNavigate={() => setSidebarOpen(false)}
          />

          <div className="pt-5">
            <LogoutButton />
          </div>
        </nav>
      </aside>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6 xl:p-10">
        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
                รายงานของฉัน
              </h1>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                พนักงาน
              </span>
            </div>

            <p className="mt-2 text-slate-500">
              เลือกประเภทรายงานเพื่อดูข้อมูลของผู้ใช้งานปัจจุบัน
            </p>
          </div>

          <AccountHeader />
        </header>

        {/* ===================================================
            REPORT CONTROLS
        =================================================== */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* ================= REPORT TYPE ================= */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <UserReportButton
              active={selectedReport === "sales"}
              title="รายงานยอดขาย"
              onClick={() => setSelectedReport("sales")}
            />

            <UserReportButton
              active={selectedReport === "lowStock"}
              title="สินค้าใกล้หมด"
              onClick={() => setSelectedReport("lowStock")}
            />

            <UserReportButton
              active={selectedReport === "outOfStock"}
              title="สินค้าหมด"
              onClick={() => setSelectedReport("outOfStock")}
            />

            <UserReportButton
              active={selectedReport === "movements"}
              title="การเคลื่อนไหวสต็อก"
              onClick={() => setSelectedReport("movements")}
            />

            <UserReportButton
              active={selectedReport === "daily"}
              title="ส่งยอดขายประจำวัน"
              onClick={() => setSelectedReport("daily")}
            />
          </div>

          {/* ================= PERIOD TYPE ================= */}

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <UserPeriodButton
              active={reportType === "daily"}
              title="รายวัน"
              detail="ดูข้อมูลของวันที่เลือก"
              onClick={() => setReportType("daily")}
            />

            <UserPeriodButton
              active={reportType === "monthly"}
              title="รายเดือน"
              detail="ดูข้อมูลรวมทั้งเดือน"
              onClick={() => setReportType("monthly")}
            />

            <UserPeriodButton
              active={reportType === "yearly"}
              title="รายปี"
              detail="ดูข้อมูลรวมทั้งปี"
              onClick={() => setReportType("yearly")}
            />
          </div>

          {/* ================= ACTION BAR ================= */}

          <div className="mt-6 grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-4">
            {reportType === "daily" && (
              <UserDateField
                label="เลือกวันที่"
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
              />
            )}

            {reportType === "monthly" && (
              <UserDateField
                label="เลือกเดือน"
                type="month"
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(event.target.value)
                }
              />
            )}

            {reportType === "yearly" && (
              <UserDateField
                label="เลือกปี ค.ศ."
                type="number"
                value={selectedYear}
                onChange={(event) =>
                  setSelectedYear(event.target.value)
                }
              />
            )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
              disabled={!selectedReport}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4 font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <FaFileExcel />

              Export CSV
            </button>

            <button
              type="button"
              onClick={printReport}
              disabled={!selectedReport}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <FaPrint />

              พิมพ์รายงาน
            </button>
          </div>
        </section>

        {/* ===================================================
            ERROR
        =================================================== */}

        {errorMessage && (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {errorMessage}
          </section>
        )}

        {/* ===================================================
            NO REPORT SELECTED
        =================================================== */}

        {!selectedReport && (
          <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <FaChartBar className="mx-auto text-5xl text-slate-300" />

            <h2 className="mt-5 text-xl font-bold text-slate-700">
              เลือกประเภทรายงาน
            </h2>

            <p className="mt-2 text-slate-500">
              ตารางจะแสดงเมื่อกดเลือกรายงานด้านบน
            </p>
          </section>
        )}

        {/* ===================================================
            SALES REPORT
        =================================================== */}

        {selectedReport === "sales" && (
          <>
            <UserReportHeading
              title="รายงานยอดขาย"
              detail={formatPeriodTitle(
                reportType,
                periodRange
              )}
            />

            <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <UserSummaryCard
                title="จำนวนบิล"
                value={`${sales.length.toLocaleString(
                  "th-TH"
                )} บิล`}
                detail="จำนวนบิลของฉันในช่วงเวลาที่เลือก"
                icon={<FaShoppingCart />}
                color="red"
              />

              <UserSummaryCard
                title="จำนวนสินค้าที่ขาย"
                value={`${totals.totalQuantity.toLocaleString(
                  "th-TH"
                )} ชิ้น`}
                detail="รวมจำนวนสินค้าทุกรายการ"
                icon={<FaBox />}
                color="orange"
              />

              <UserSummaryCard
                title="ส่วนลดรวม"
                value={`${formatMoney(
                  totals.totalDiscount
                )} บาท`}
                detail="ส่วนลดทั้งหมดของรายการขาย"
                icon={<FaChartBar />}
                color="blue"
              />

              <UserSummaryCard
                title="ยอดขายสุทธิ"
                value={`${formatMoney(
                  totals.totalValue
                )} บาท`}
                detail="ยอดขายหลังหักส่วนลด"
                icon={<FaShoppingCart />}
                color="green"
              />
            </section>

            <UserSalesTable
              sales={sales}
              summaryBySale={summaryBySale}
              isLoading={isLoading}
              reporterName={reporterName}
            />
          </>
        )}

        {/* ===================================================
            LOW STOCK
        =================================================== */}

        {selectedReport === "lowStock" && (
          <>
            <UserReportHeading
              title="รายงานสินค้าใกล้หมด"
              detail="สินค้าที่มีจำนวนคงเหลือมากกว่า 0 และน้อยกว่า 10 ชิ้น"
            />

            <UserSummaryCardRow>
              <UserSummaryCard
                title="สินค้าใกล้หมด"
                value={`${lowStockProducts.length.toLocaleString(
                  "th-TH"
                )} รายการ`}
                detail="คงเหลือ 1–9 ชิ้น"
                icon={<FaBoxOpen />}
                color="orange"
              />
            </UserSummaryCardRow>

            <UserProductTable
              title="รายการสินค้าใกล้หมด"
              products={lowStockProducts}
              emptyText="ไม่มีสินค้าใกล้หมด"
            />
          </>
        )}

        {/* ===================================================
            OUT OF STOCK
        =================================================== */}

        {selectedReport === "outOfStock" && (
          <>
            <UserReportHeading
              title="รายงานสินค้าหมด"
              detail="สินค้าที่มีจำนวนคงเหลือ 0 ชิ้นหรือน้อยกว่า"
            />

            <UserSummaryCardRow>
              <UserSummaryCard
                title="สินค้าหมด"
                value={`${outOfStockProducts.length.toLocaleString(
                  "th-TH"
                )} รายการ`}
                detail="ไม่มีสินค้าคงเหลือ"
                icon={<FaBoxOpen />}
                color="red"
              />
            </UserSummaryCardRow>

            <UserProductTable
              title="รายการสินค้าหมด"
              products={outOfStockProducts}
              emptyText="ไม่มีสินค้าหมด"
            />
          </>
        )}

        {/* ===================================================
            STOCK MOVEMENT
        =================================================== */}

        {selectedReport === "movements" && (
          <>
            <UserReportHeading
              title="รายงานการเคลื่อนไหวสต็อก"
              detail={formatPeriodTitle(
                reportType,
                periodRange
              )}
            />

            <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              <UserSummaryCard
                title="รายการเคลื่อนไหว"
                value={`${stockMovements.length.toLocaleString(
                  "th-TH"
                )} รายการ`}
                detail="เฉพาะรายการที่ผู้ใช้งานดำเนินการ"
                icon={<FaHistory />}
                color="blue"
              />

              <UserSummaryCard
                title="จำนวนเพิ่มเข้า"
                value={`${incomingQuantity.toLocaleString(
                  "th-TH"
                )} ชิ้น`}
                detail="รับเข้าและปรับเพิ่ม"
                icon={<FaArrowUp />}
                color="green"
              />

              <UserSummaryCard
                title="จำนวนตัดออก"
                value={`${outgoingQuantity.toLocaleString(
                  "th-TH"
                )} ชิ้น`}
                detail="ขายออกและปรับลด"
                icon={<FaShoppingCart />}
                color="red"
              />
            </section>

            <UserMovementTable
              rows={stockMovements}
              isLoading={isLoading}
              reporterName={reporterName}
            />
          </>
        )}

        {/* ===================================================
            DAILY SALES SUBMISSION
        =================================================== */}

        {selectedReport === "daily" && (
          <>
            <UserReportHeading
              title="ส่งยอดขายประจำวัน"
              detail={formatPeriodTitle(
                reportType,
                periodRange
              )}
            />

            <section className="mt-6">
              <UserDailySalesSubmission
                onSummaryChange={handleDailySummaryChange}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/* =========================================================
   BASIC UI COMPONENTS
========================================================= */

function UserMenu({
  icon,
  text,
  href,
  active,
  onNavigate,
}) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      className={`flex items-center gap-4 rounded-xl px-4 py-3.5 transition ${
        active
          ? "bg-red-600 text-white shadow-lg"
          : "text-slate-200 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span>{icon}</span>

      <span className="font-medium">
        {text}
      </span>
    </Link>
  );
}

function UserReportButton({
  active,
  title,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
        active
          ? "border-red-600 bg-red-600 text-white shadow-md ring-2 ring-red-200"
          : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50"
      }`}
    >
      {title}
    </button>
  );
}

function UserPeriodButton({
  active,
  title,
  detail,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        active
          ? "border-red-600 bg-red-600 text-white shadow-md"
          : "border-slate-200 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50"
      }`}
    >
      <p className="text-xl font-bold">
        {title}
      </p>

      <p
        className={`mt-1 text-sm ${
          active
            ? "text-red-100"
            : "text-slate-500"
        }`}
      >
        {detail}
      </p>
    </button>
  );
}

function UserDateField({
  label,
  value,
  onChange,
  type,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="relative">
        <FaCalendarAlt className="pointer-events-none absolute left-4 top-4 text-slate-400" />

        <input
          type={type}
          value={value}
          onChange={onChange}
          className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-11 pr-4 text-slate-800 outline-none focus:border-red-500"
        />
      </div>
    </div>
  );
}

function UserReportHeading({
  title,
  detail,
}) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-slate-500">
        {detail}
      </p>
    </section>
  );
}

function UserSummaryCardRow({
  children,
}) {
  return (
    <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </section>
  );
}

function UserSummaryCard({
  title,
  value,
  detail,
  icon,
  color = "blue",
}) {
  const styles = {
    red: {
      border:
        "border-t-red-500",
      icon:
        "bg-red-100 text-red-600",
    },

    orange: {
      border:
        "border-t-orange-500",
      icon:
        "bg-orange-100 text-orange-600",
    },

    green: {
      border:
        "border-t-emerald-500",
      icon:
        "bg-emerald-100 text-emerald-600",
    },

    blue: {
      border:
        "border-t-blue-500",
      icon:
        "bg-blue-100 text-blue-600",
    },
  };

  const style =
    styles[color] ||
    styles.blue;

  return (
    <div
      className={`rounded-3xl border border-t-4 border-slate-200 bg-white p-6 shadow-sm ${style.border}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <h3 className="mt-3 text-2xl font-bold text-slate-900">
            {value}
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            {detail}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
/* =========================================================
   SALES TABLE
========================================================= */

function UserSalesTable({
  sales,
  summaryBySale,
  isLoading,
  reporterName,
}) {
  return (
    <UserTableCard
      title="รายการขาย"
      subtitle={`${sales.length.toLocaleString("th-TH")} รายการ`}
    >
      <table className="w-full min-w-[1050px] text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <UserTh>#</UserTh>

            <UserTh>
              วันที่ / เวลา
            </UserTh>

            <UserTh>
              เลขที่บิล
            </UserTh>

            <UserTh>
              ผู้ขาย
            </UserTh>

            <UserTh className="text-center">
              จำนวนสินค้า
            </UserTh>

            <UserTh className="text-right">
              ยอดก่อนส่วนลด
            </UserTh>

            <UserTh className="text-right">
              ส่วนลด
            </UserTh>

            <UserTh className="text-right">
              ยอดสุทธิ
            </UserTh>

            <UserTh>
              หมายเหตุ
            </UserTh>
          </tr>
        </thead>

        <tbody>
          {sales.map(
            (sale, index) => {
              const summary =
                summaryBySale[
                  sale.id
                ] || {
                  quantity: 0,
                };

              return (
                <tr
                  key={sale.id}
                  className="border-t border-slate-100 transition hover:bg-slate-50"
                >
                  <UserTd>
                    {index + 1}
                  </UserTd>

                  <UserTd>
                    <p>
                      {formatDate(
                        sale.sale_date
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateTime(
                        sale.created_at
                      )}
                    </p>
                  </UserTd>

                  <UserTd>
                    <span className="font-semibold text-slate-900">
                      {sale.sale_number ||
                        "-"}
                    </span>
                  </UserTd>

                  <UserTd>
                    {sale.seller_name ||
                      reporterName ||
                      "-"}
                  </UserTd>

                  <UserTd className="text-center">
                    {toNumber(
                      summary.quantity
                    ).toLocaleString(
                      "th-TH"
                    )}{" "}
                    ชิ้น
                  </UserTd>

                  <UserTd className="text-right">
                    {formatMoney(
                      sale.subtotal_amount
                    )}{" "}
                    บาท
                  </UserTd>

                  <UserTd className="text-right">
                    {formatMoney(
                      sale.discount_amount
                    )}{" "}
                    บาท
                  </UserTd>

                  <UserTd className="text-right font-bold text-red-600">
                    {formatMoney(
                      sale.total_amount
                    )}{" "}
                    บาท
                  </UserTd>

                  <UserTd>
                    {sale.note || "-"}
                  </UserTd>
                </tr>
              );
            }
          )}

          {sales.length === 0 && (
            <UserEmptyRow
              span={9}
              text={
                isLoading
                  ? "กำลังโหลดข้อมูล..."
                  : "ไม่พบรายการขายในช่วงเวลาที่เลือก"
              }
            />
          )}
        </tbody>
      </table>
    </UserTableCard>
  );
}

/* =========================================================
   PRODUCT TABLE
========================================================= */

function UserProductTable({
  title,
  products,
  emptyText,
}) {
  return (
    <UserTableCard
      title={title}
      subtitle={`${products.length.toLocaleString(
        "th-TH"
      )} รายการ`}
    >
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <UserTh>
              รหัสสินค้า
            </UserTh>

            <UserTh>
              ชื่อสินค้า
            </UserTh>

            <UserTh>
              หมวดหมู่
            </UserTh>

            <UserTh className="text-right">
              คงเหลือ
            </UserTh>

            <UserTh>
              หน่วย
            </UserTh>

            <UserTh className="text-center">
              สถานะ
            </UserTh>
          </tr>
        </thead>

        <tbody>
          {products.map(
            (product) => (
              <tr
                key={product.id}
                className="border-t border-slate-100 transition hover:bg-slate-50"
              >
                <UserTd>
                  {product.product_code ||
                    "-"}
                </UserTd>

                <UserTd>
                  <span className="font-semibold text-slate-900">
                    {product.name ||
                      "-"}
                  </span>
                </UserTd>

                <UserTd>
                  {product.category ||
                    "-"}
                </UserTd>

                <UserTd className="text-right font-semibold">
                  {toNumber(
                    product.stock
                  ).toLocaleString(
                    "th-TH"
                  )}
                </UserTd>

                <UserTd>
                  {product.unit ||
                    "ชิ้น"}
                </UserTd>

                <UserTd className="text-center">
                  <UserStockBadge
                    status={
                      product.status ||
                      getStockStatus(
                        product.stock
                      )
                    }
                  />
                </UserTd>
              </tr>
            )
          )}

          {products.length === 0 && (
            <UserEmptyRow
              span={6}
              text={emptyText}
            />
          )}
        </tbody>
      </table>
    </UserTableCard>
  );
}

/* =========================================================
   STOCK MOVEMENT TABLE
========================================================= */

function UserMovementTable({
  rows,
  isLoading,
  reporterName,
}) {
  return (
    <UserTableCard
      title="ประวัติการเคลื่อนไหวสต็อก"
      subtitle={`${rows.length.toLocaleString(
        "th-TH"
      )} รายการ`}
    >
      <table className="w-full min-w-[1150px] text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <UserTh>#</UserTh>

            <UserTh>
              วันที่ / เวลา
            </UserTh>

            <UserTh>
              รหัสสินค้า
            </UserTh>

            <UserTh>
              สินค้า
            </UserTh>

            <UserTh>
              ประเภท
            </UserTh>

            <UserTh className="text-center">
              จำนวน
            </UserTh>

            <UserTh className="text-center">
              ก่อน
            </UserTh>

            <UserTh className="text-center">
              หลัง
            </UserTh>

            <UserTh>
              ผู้ดำเนินการ
            </UserTh>

            <UserTh>
              หมายเหตุ
            </UserTh>
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (movement, index) => {
              const incoming =
                isIncomingMovement(
                  movement.movement_type
                );

              return (
                <tr
                  key={movement.id}
                  className="border-t border-slate-100 transition hover:bg-slate-50"
                >
                  <UserTd>
                    {index + 1}
                  </UserTd>

                  <UserTd>
                    {formatDateTime(
                      movement.created_at
                    )}
                  </UserTd>

                  <UserTd>
                    {movement.product_code ||
                      "-"}
                  </UserTd>

                  <UserTd>
                    <span className="font-semibold text-slate-900">
                      {movement.product_name ||
                        "-"}
                    </span>
                  </UserTd>

                  <UserTd>
                    <UserMovementBadge
                      incoming={
                        incoming
                      }
                    >
                      {getMovementLabel(
                        movement.movement_type
                      )}
                    </UserMovementBadge>
                  </UserTd>

                  <UserTd
                    className={`text-center font-bold ${
                      incoming
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {incoming
                      ? "+"
                      : "-"}
                    {toNumber(
                      movement.quantity
                    ).toLocaleString(
                      "th-TH"
                    )}
                  </UserTd>

                  <UserTd className="text-center">
                    {toNumber(
                      movement.stock_before
                    ).toLocaleString(
                      "th-TH"
                    )}
                  </UserTd>

                  <UserTd className="text-center font-semibold">
                    {toNumber(
                      movement.stock_after
                    ).toLocaleString(
                      "th-TH"
                    )}
                  </UserTd>

                  <UserTd>
                    {movement.performed_by_name ||
                      reporterName ||
                      "-"}
                  </UserTd>

                  <UserTd>
                    {movement.note ||
                      "-"}
                  </UserTd>
                </tr>
              );
            }
          )}

          {rows.length === 0 && (
            <UserEmptyRow
              span={10}
              text={
                isLoading
                  ? "กำลังโหลดข้อมูล..."
                  : "ไม่พบประวัติการเคลื่อนไหวสต็อกในช่วงเวลาที่เลือก"
              }
            />
          )}
        </tbody>
      </table>
    </UserTableCard>
  );
}

/* =========================================================
   STOCK-IN TABLE
   เตรียมไว้ใช้กับข้อมูลรับสินค้าเข้าจริง
========================================================= */

function UserStockInTable({
  rows,
  isLoading,
  totalQuantity,
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-emerald-100 bg-emerald-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            รายการรับสินค้าเข้า
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {rows.length.toLocaleString(
              "th-TH"
            )}{" "}
            รายการ
          </p>
        </div>

        <div className="rounded-xl bg-white px-4 py-2 text-sm shadow-sm">
          <span className="text-slate-500">
            จำนวนรับเข้ารวม
          </span>

          <strong className="ml-2 text-emerald-600">
            {toNumber(
              totalQuantity
            ).toLocaleString(
              "th-TH"
            )}{" "}
            ชิ้น
          </strong>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <UserTh>
                วันที่ / เวลา
              </UserTh>

              <UserTh>
                รหัสสินค้า
              </UserTh>

              <UserTh>
                สินค้า
              </UserTh>

              <UserTh className="text-center">
                จำนวน
              </UserTh>

              <UserTh>
                หน่วย
              </UserTh>

              <UserTh>
                ผู้ดำเนินการ
              </UserTh>

              <UserTh>
                หมายเหตุ
              </UserTh>
            </tr>
          </thead>

          <tbody>
            {rows.map(
              (row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-100 transition hover:bg-slate-50"
                >
                  <UserTd>
                    {formatStockInDateTime(
                      row
                    )}
                  </UserTd>

                  <UserTd>
                    {row.product_code ||
                      "-"}
                  </UserTd>

                  <UserTd>
                    <span className="font-semibold text-slate-900">
                      {row.product_name ||
                        "-"}
                    </span>
                  </UserTd>

                  <UserTd className="text-center font-bold text-emerald-600">
                    +
                    {getStockInQuantity(
                      row
                    ).toLocaleString(
                      "th-TH"
                    )}
                  </UserTd>

                  <UserTd>
                    {row.unit ||
                      "ชิ้น"}
                  </UserTd>

                  <UserTd>
                    {row.performed_by_name ||
                      "-"}
                  </UserTd>

                  <UserTd>
                    {row.note ||
                      "-"}
                  </UserTd>
                </tr>
              )
            )}

            {rows.length === 0 && (
              <UserEmptyRow
                span={7}
                text={
                  isLoading
                    ? "กำลังโหลดข้อมูล..."
                    : "ไม่พบรายการรับสินค้าเข้า"
                }
              />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================
   TABLE WRAPPER
========================================================= */

function UserTableCard({
  title,
  subtitle,
  children,
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h3 className="text-xl font-bold text-slate-900">
          {title}
        </h3>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   TABLE CELLS
========================================================= */

function UserTh({
  children,
  className = "",
}) {
  return (
    <th
      className={`whitespace-nowrap px-5 py-4 text-left font-semibold ${className}`}
    >
      {children}
    </th>
  );
}

function UserTd({
  children,
  className = "",
}) {
  return (
    <td
      className={`px-5 py-4 align-top text-slate-700 ${className}`}
    >
      {children}
    </td>
  );
}

function UserEmptyRow({
  span,
  text,
}) {
  return (
    <tr>
      <td
        colSpan={span}
        className="px-6 py-16 text-center text-slate-500"
      >
        <div className="mx-auto flex max-w-md flex-col items-center">
          <FaBoxOpen className="mb-3 text-3xl text-slate-300" />

          <p>{text}</p>
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   STATUS BADGES
========================================================= */

function UserStockBadge({
  status,
}) {
  const styles = {
    มีสินค้า:
      "bg-emerald-100 text-emerald-700",

    ใกล้หมด:
      "bg-orange-100 text-orange-700",

    หมด:
      "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        styles[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {status || "-"}
    </span>
  );
}

function UserMovementBadge({
  incoming,
  children,
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        incoming
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {children}
    </span>
  );
}