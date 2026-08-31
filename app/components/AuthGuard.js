"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const CHECK_INTERVAL_MS = 10000;
const LAST_SEEN_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);

  const checkingRef = useRef(false);
  const disabledMessageShownRef = useRef(false);
  const lastSeenUpdatedAtRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function checkAccess(eventUser, showLoading = false) {
      if (!mounted || checkingRef.current) {
        return;
      }

      checkingRef.current = true;

      if (showLoading) {
        setIsChecking(true);
      }

      let keepLoading = false;

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
        const isUserPage =
          pathname === "/user" || pathname.startsWith("/user/");

        if (!user) {
          if (!isLoginPage) {
            keepLoading = true;
            router.replace("/login");
          }

          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        const role = String(profile?.role || "").toLowerCase();

        if (
          profileError ||
          !profile ||
          profile.is_active !== true ||
          (role !== "admin" && role !== "user")
        ) {
          await supabase.auth.signOut({ scope: "local" });

          if (mounted) {
            if (
              profile?.is_active === false &&
              !disabledMessageShownRef.current
            ) {
              disabledMessageShownRef.current = true;

              alert(
                "บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
              );
            }

            keepLoading = true;
            router.replace("/login");
          }

          return;
        }

        if (
          Date.now() - lastSeenUpdatedAtRef.current >=
          LAST_SEEN_UPDATE_INTERVAL_MS
        ) {
          lastSeenUpdatedAtRef.current = Date.now();
          await supabase
            .from("profiles")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("id", user.id);
        }

        if (isLoginPage) {
          keepLoading = true;

          router.replace(
            role === "admin" ? "/dashboard" : "/user/dashboard"
          );

          return;
        }

        if (role === "user" && !isUserPage) {
          keepLoading = true;
          router.replace("/user/dashboard");
          return;
        }

        if (role === "admin" && isUserPage) {
          keepLoading = true;
          router.replace("/dashboard");
          return;
        }
      } catch {
        keepLoading = true;

        if (mounted && pathname !== "/login") {
          router.replace("/login");
        }
      } finally {
        checkingRef.current = false;

        if (mounted && !keepLoading) {
          setIsChecking(false);
        }
      }
    }

    void checkAccess(undefined, true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        void checkAccess(session?.user ?? null);
      }, 0);
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
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] text-gray-600">
        กำลังตรวจสอบสิทธิ์ผู้ใช้งาน...
      </div>
    );
  }

  return children;
}