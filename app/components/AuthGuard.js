"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AuthGuard({ children }) {
const pathname = usePathname();
const router = useRouter();
const [isChecking, setIsChecking] = useState(true);

useEffect(() => {
let isActive = true;


async function checkAccess(eventUser) {
  if (!isActive) return;

  setIsChecking(true);

  let user = eventUser;

  if (user === undefined) {
    const { data, error } = await supabase.auth.getUser();

    if (!isActive) return;

    user = error ? null : data.user;
  }

  const isLoginPage = pathname === "/login";

  if (!user) {
    if (!isLoginPage) {
      router.replace("/login");
    }

    if (isActive) {
      setIsChecking(false);
    }

    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isActive) return;

  if (profileError || !profile) {
    console.error(profileError);

    await supabase.auth.signOut({ scope: "local" });

    router.replace("/login");
    return;
  }

  const role = profile.role;

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
    return;
  }

  setIsChecking(false);
}

void checkAccess();

const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((_event, session) => {
  void checkAccess(session?.user ?? null);
});

return () => {
  isActive = false;
  subscription.unsubscribe();
};


}, [pathname, router]);

if (isChecking) {
return ( <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb] text-gray-600">
กำลังตรวจสอบสิทธิ์ผู้ใช้งาน... </div>
);
}

return children;
}
