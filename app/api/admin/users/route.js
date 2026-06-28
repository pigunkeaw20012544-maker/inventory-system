import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 90 * 1000;

function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function clean(value) {
  return String(value ?? "").trim();
}

function isOnline(lastSeenAt, isActive) {
  if (isActive === false || !lastSeenAt) return false;

  const lastSeenMs = new Date(lastSeenAt).getTime();
  const elapsedMs = Date.now() - lastSeenMs;

  return (
    Number.isFinite(lastSeenMs) &&
    elapsedMs >= 0 &&
    elapsedMs <= ONLINE_WINDOW_MS
  );
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("ไม่พบ SUPABASE_SECRET_KEY บน Server");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireAdmin(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace("Bearer ", "").trim();

  if (!token) {
    return {
      error: json({ error: "กรุณาเข้าสู่ระบบใหม่" }, 401),
    };
  }

  const admin = getAdminClient();

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return {
      error: json({ error: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่" }, 401),
    };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "admin" ||
    profile.is_active === false
  ) {
    return {
      error: json(
        { error: "เฉพาะ Admin เท่านั้นที่จัดการผู้ใช้งานได้" },
        403
      ),
    };
  }

  return { admin, currentUser: user };
}

export async function GET(request) {
  try {
    const access = await requireAdmin(request);

    if (access.error) return access.error;

    const { data, error } = await access.admin
      .from("profiles")
      .select(`
        id,
        email,
        display_name,
        employee_code,
        position,
        phone,
        role,
        is_active,
        last_seen_at,
        created_at
      `)
      .order("created_at", { ascending: true });

    if (error) {
      return json({ error: error.message }, 400);
    }

    const users = (data || []).map((user) => ({
      ...user,
      is_online: isOnline(user.last_seen_at, user.is_active),
    }));

    return json({ users });
  } catch (error) {
    return json(
      { error: error.message || "โหลดข้อมูลผู้ใช้งานไม่สำเร็จ" },
      500
    );
  }
}

export async function POST(request) {
  try {
    const access = await requireAdmin(request);

    if (access.error) return access.error;

    const body = await request.json();

    const email = clean(body.email).toLowerCase();
    const password = String(body.password || "");
    const displayName = clean(body.display_name);
    const employeeCode = clean(body.employee_code) || null;
    const position = clean(body.position) || "พนักงานขาย";
    const phone = clean(body.phone);
    const role = body.role === "admin" ? "admin" : "user";
    const isActive = body.is_active !== false;

    if (!email.includes("@") || !displayName) {
      return json({ error: "กรุณากรอกชื่อและอีเมลให้ถูกต้อง" }, 400);
    }

    if (password.length < 8) {
      return json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, 400);
    }

    const {
      data: { user },
      error: createError,
    } = await access.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    });

    if (createError || !user) {
      return json(
        { error: createError?.message || "สร้างบัญชีไม่สำเร็จ" },
        400
      );
    }

    const { error: profileError } = await access.admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email,
          display_name: displayName,
          employee_code: employeeCode,
          position,
          phone,
          role,
          is_active: isActive,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      await access.admin.auth.admin.deleteUser(user.id);

      return json(
        { error: profileError.message || "บันทึกข้อมูลพนักงานไม่สำเร็จ" },
        400
      );
    }

    return json({ message: "เพิ่มพนักงานสำเร็จ" }, 201);
  } catch (error) {
    return json(
      { error: error.message || "เกิดข้อผิดพลาดบน Server" },
      500
    );
  }
}

export async function PATCH(request) {
  try {
    const access = await requireAdmin(request);

    if (access.error) return access.error;

    const userId = new URL(request.url).searchParams.get("id");

    if (!userId) {
      return json({ error: "ไม่พบรหัสผู้ใช้งาน" }, 400);
    }

    const body = await request.json();

    const email = clean(body.email).toLowerCase();
    const password = String(body.password || "");
    const displayName = clean(body.display_name);
    const employeeCode = clean(body.employee_code) || null;
    const position = clean(body.position) || "พนักงานขาย";
    const phone = clean(body.phone);
    const role = body.role === "admin" ? "admin" : "user";
    const isActive = body.is_active !== false;

    if (!email.includes("@") || !displayName) {
      return json({ error: "กรุณากรอกชื่อและอีเมลให้ถูกต้อง" }, 400);
    }

    if (password && password.length < 8) {
      return json(
        { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" },
        400
      );
    }

    if (
      userId === access.currentUser.id &&
      (role !== "admin" || !isActive)
    ) {
      return json(
        { error: "ไม่สามารถลดสิทธิ์หรือปิดบัญชี Admin ของตัวเองได้" },
        400
      );
    }

    const authData = {
  email,
  ban_duration: isActive ? "none" : "876000h",
};

if (password) {
  authData.password = password;
}

const { error: authError } =
  await access.admin.auth.admin.updateUserById(userId, authData);

    if (authError) {
      return json(
        { error: authError.message || "แก้ไขบัญชีล็อกอินไม่สำเร็จ" },
        400
      );
    }

    const { error: profileError } = await access.admin
      .from("profiles")
      .update({
        email,
        display_name: displayName,
        employee_code: employeeCode,
        position,
        phone,
        role,
        is_active: isActive,
      })
      .eq("id", userId);

    if (profileError) {
      return json(
        { error: profileError.message || "แก้ไขข้อมูลพนักงานไม่สำเร็จ" },
        400
      );
    }

    return json({ message: "แก้ไขข้อมูลพนักงานสำเร็จ" });
  } catch (error) {
    return json(
      { error: error.message || "เกิดข้อผิดพลาดบน Server" },
      500
    );
  }
}

export async function DELETE(request) {
  try {
    const access = await requireAdmin(request);

    if (access.error) return access.error;

    const userId = new URL(request.url).searchParams.get("id");

    if (!userId) {
      return json({ error: "ไม่พบรหัสผู้ใช้งาน" }, 400);
    }

    if (userId === access.currentUser.id) {
      return json(
        { error: "ไม่สามารถลบบัญชี Admin ของตัวเองได้" },
        400
      );
    }

    const { data: profile, error: profileError } = await access.admin
      .from("profiles")
      .select("id, display_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return json(
        { error: profileError.message || "ค้นหาข้อมูลผู้ใช้งานไม่สำเร็จ" },
        400
      );
    }

    if (!profile) {
      return json({ error: "ไม่พบข้อมูลผู้ใช้งาน" }, 404);
    }

    const { error: authError } =
      await access.admin.auth.admin.deleteUser(userId);

    const authUserMissing = /user not found/i.test(
      authError?.message || ""
    );

    if (authError && !authUserMissing) {
      return json(
        { error: authError.message || "ลบบัญชีล็อกอินไม่สำเร็จ" },
        400
      );
    }

    const { error: deleteProfileError } = await access.admin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (deleteProfileError) {
      return json(
        {
          error:
            deleteProfileError.message ||
            "ลบข้อมูลผู้ใช้งานจาก profiles ไม่สำเร็จ",
        },
        400
      );
    }

    return json({
      message: authUserMissing
        ? "ลบข้อมูลผู้ใช้งานเก่าที่ค้างอยู่สำเร็จ"
        : "ลบบัญชีผู้ใช้งานสำเร็จ",
    });
  } catch (error) {
    return json(
      { error: error.message || "เกิดข้อผิดพลาดบน Server" },
      500
    );
  }
}