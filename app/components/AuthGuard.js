"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const CHECK_INTERVAL_MS = 10000;

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    let checking = false;
    let hasShownDisabledMessage = false;

    async function checkAccess(eventUser, showLoading = false) {
      if (!mounted || checking) return;

      checking = true;

      if (showLoading) {
        setIsChecking(true);
      }

      try {
        let user = eventUser;

        if (user === undefined) {
          const {
            data: { user: currentUser },
            error,
          } = await supabase.auth.getUser();

          user = error ? null : currentUser;
        }

        const isLoginPage = pathname === "/login";

        if (!user) {
          if (!isLoginPage) {
            router.replace("/login");
          }

          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (profileError || !profile || profile.is_active === false) {
          await supabase.auth.signOut({ scope: "local" });

          if (mounted) {
            if (
              profile?.is_active === false &&
              !hasShownDisabledMessage
            ) {
              hasShownDisabledMessage = true;

              alert(
                "บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
              );
            }

            router.replace("/login");
          }

          return;
        }

        const role = profile.role === "admin" ? "admin" : "user";

        if (isLoginPage) {
          router.replace(
            role === "admin" ? "/dashboard" : "/user/dashboard"
          );
          return;
        }

        if (role === "user" && !pathname.startsWith("/user")) {
          router.replace("/user/dashboard");
          return;
        }

        if (role === "admin" && pathname.startsWith("/user")) {
          router.replace("/dashboard");
        }
      } catch (error) {
        console.error("ตรวจสอบสิทธิ์ไม่สำเร็จ:", error);
      } finally {
        checking = false;

        if (mounted) {
          setIsChecking(false);
        }
      }
    }

    void checkAccess(undefined, true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void checkAccess(session?.user ?? null);
    });

    const timer = window.setInterval(() => {
      void checkAccess();
    }, CHECK_INTERVAL_MS);

    function handleFocus() {
      void checkAccess();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkAccess();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] text-gray-600">
        กำลังตรวจสอบสิทธิ์ผู้ใช้งาน...
      </div>
    );
  }

  return children;
}