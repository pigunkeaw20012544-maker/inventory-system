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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUserId(userId) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    userId
  );
}

function getRole(value) {
  const role = clean(value).toLowerCase();

  return role === "admin" || role === "user" ? role : null;
}

async function findDuplicateProfile(admin, { email, employeeCode, excludeId }) {
  const { data: emailMatch, error: emailError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .neq("id", excludeId || "00000000-0000-0000-0000-000000000000")
    .limit(1)
    .maybeSingle();

  if (emailError) return { error: emailError };
  if (emailMatch) return { duplicate: "อีเมลนี้ถูกใช้งานแล้ว" };

  if (employeeCode) {
    const { data: employeeMatch, error: employeeError } = await admin
      .from("profiles")
      .select("id")
      .ilike("employee_code", employeeCode)
      .neq("id", excludeId || "00000000-0000-0000-0000-000000000000")
      .limit(1)
      .maybeSingle();

    if (employeeError) return { error: employeeError };
    if (employeeMatch) {
      return { duplicate: "รหัสพนักงานนี้ถูกใช้งานแล้ว" };
    }
  }

  return {};
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
    String(profile.role || "").toLowerCase() !== "admin" ||
    profile.is_active !== true
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
    const isActive = body.is_active !== false;

    const role = getRole(body.role);

    if (!isValidEmail(email) || !displayName) {
      return json({ error: "กรุณากรอกชื่อและอีเมลให้ถูกต้อง" }, 400);
    }

    if (password.length < 8) {
      return json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, 400);
    }

    if (!role) {
      return json({ error: "สิทธิ์ต้องเป็น admin หรือ user เท่านั้น" }, 400);
    }

    const duplicate = await findDuplicateProfile(access.admin, {
      email,
      employeeCode,
    });

    if (duplicate.error) {
      return json({ error: duplicate.error.message }, 400);
    }

    if (duplicate.duplicate) {
      return json({ error: duplicate.duplicate }, 409);
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

    if (!userId || !isValidUserId(userId)) {
      return json({ error: "ไม่พบรหัสผู้ใช้งาน" }, 400);
    }

    const action = new URL(request.url).searchParams.get("action");

    if (action === "toggle-status") {
      const body = await request.json();
      const isActive = body.is_active === true;

      if (userId === access.currentUser.id && !isActive) {
        return json(
          { error: "ไม่สามารถปิดบัญชี Admin ของตัวเองได้" },
          400
        );
      }

      const { data: targetProfile, error: targetProfileError } =
        await access.admin
          .from("profiles")
          .select("id, is_active")
          .eq("id", userId)
          .maybeSingle();

      if (targetProfileError) {
        return json({ error: targetProfileError.message }, 400);
      }

      if (!targetProfile) {
        return json({ error: "ไม่พบข้อมูลผู้ใช้งาน" }, 404);
      }

      const { error: authError } =
        await access.admin.auth.admin.updateUserById(userId, {
          ban_duration: isActive ? "none" : "876000h",
        });

      if (authError) {
        return json(
          { error: authError.message || "เปลี่ยนสถานะบัญชีล็อกอินไม่สำเร็จ" },
          400
        );
      }

      const { error: profileError } = await access.admin
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", userId);

      if (profileError) {
        await access.admin.auth.admin.updateUserById(userId, {
          ban_duration: targetProfile.is_active ? "none" : "876000h",
        });

        return json(
          {
            error:
              profileError.message ||
              "เปลี่ยนสถานะ profiles ไม่สำเร็จ ข้อมูล Auth ถูกย้อนกลับแล้ว",
          },
          400
        );
      }

      return json({
        message: isActive ? "เปิดใช้งานผู้ใช้สำเร็จ" : "ปิดใช้งานผู้ใช้สำเร็จ",
        is_active: isActive,
      });
    }

    const body = await request.json();

    const email = clean(body.email).toLowerCase();
    const password = String(body.password || "");
    const displayName = clean(body.display_name);
    const employeeCode = clean(body.employee_code) || null;
    const position = clean(body.position) || "พนักงานขาย";
    const phone = clean(body.phone);
    const role = getRole(body.role);
    const isActive = body.is_active !== false;

    if (!isValidEmail(email) || !displayName) {
      return json({ error: "กรุณากรอกชื่อและอีเมลให้ถูกต้อง" }, 400);
    }

    if (password && password.length < 8) {
      return json(
        { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" },
        400
      );
    }

    if (!role) {
      return json({ error: "สิทธิ์ต้องเป็น admin หรือ user เท่านั้น" }, 400);
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

    const { data: currentProfile, error: currentProfileError } =
      await access.admin
        .from("profiles")
        .select(
          "email, display_name, employee_code, position, phone, role, is_active"
        )
        .eq("id", userId)
        .maybeSingle();

    if (currentProfileError) {
      return json({ error: currentProfileError.message }, 400);
    }

    if (!currentProfile) {
      return json({ error: "ไม่พบข้อมูลผู้ใช้งาน" }, 404);
    }

    const duplicate = await findDuplicateProfile(access.admin, {
      email,
      employeeCode,
      excludeId: userId,
    });

    if (duplicate.error) {
      return json({ error: duplicate.error.message }, 400);
    }

    if (duplicate.duplicate) {
      return json({ error: duplicate.duplicate }, 409);
    }

    const profileData = {
      email,
      display_name: displayName,
      employee_code: employeeCode,
      position,
      phone,
      role,
      is_active: isActive,
    };

    const { error: profileError } = await access.admin
      .from("profiles")
      .update(profileData)
      .eq("id", userId);

    if (profileError) {
      return json(
        { error: profileError.message || "แก้ไขข้อมูลพนักงานไม่สำเร็จ" },
        400
      );
    }

    const authData = {
      email,
      ban_duration: isActive ? "none" : "876000h",
    };

    if (password) authData.password = password;

    const { error: authError } = await access.admin.auth.admin.updateUserById(
      userId,
      authData
    );

    if (authError) {
      await access.admin
        .from("profiles")
        .update({
          email: currentProfile.email,
          display_name: currentProfile.display_name,
          employee_code: currentProfile.employee_code,
          position: currentProfile.position,
          phone: currentProfile.phone,
          role: currentProfile.role,
          is_active: currentProfile.is_active,
        })
        .eq("id", userId);

      return json(
        {
          error:
            authError.message ||
            "แก้ไขบัญชีล็อกอินไม่สำเร็จ ข้อมูล profiles ถูกย้อนกลับแล้ว",
        },
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

    if (!userId || !isValidUserId(userId)) {
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
      .select("id, display_name, email, is_active")
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

    const { error: deactivateError } = await access.admin
      .from("profiles")
      .update({ is_active: false })
      .eq("id", userId);

    if (deactivateError) {
      return json(
        { error: deactivateError.message || "ปิดใช้งานผู้ใช้งานไม่สำเร็จ" },
        400
      );
    }

    const { error: authError } =
      await access.admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });

    if (authError) {
      await access.admin
        .from("profiles")
        .update({ is_active: profile.is_active })
        .eq("id", userId);

      return json(
        {
          error:
            authError.message ||
            "ปิดใช้งานบัญชีล็อกอินไม่สำเร็จ ข้อมูล profiles ถูกย้อนกลับแล้ว",
        },
        400
      );
    }

    return json({
      message: "ปิดใช้งานผู้ใช้งานแทนการลบถาวรสำเร็จ",
      soft_deleted: true,
    });
  } catch (error) {
    return json(
      { error: error.message || "เกิดข้อผิดพลาดบน Server" },
      500
    );
  }
}