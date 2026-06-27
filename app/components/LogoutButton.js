"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaSignOutAlt } from "react-icons/fa";
import { supabase } from "../lib/supabase";

export default function LogoutButton() {
const router = useRouter();
const [isLoggingOut, setIsLoggingOut] = useState(false);

async function handleLogout() {
const confirmed = window.confirm("ต้องการออกจากระบบใช่หรือไม่?");


if (!confirmed) return;

setIsLoggingOut(true);

const { error } = await supabase.auth.signOut();

if (error) {
  console.error(error);
  alert("ออกจากระบบไม่สำเร็จ");
  setIsLoggingOut(false);
  return;
}

router.replace("/login");
router.refresh();


}

return ( <button
   onClick={handleLogout}
   disabled={isLoggingOut}
   className="w-full flex items-center gap-4 px-5 py-4 rounded-xl hover:bg-white/10 text-left disabled:opacity-60"
 > <span className="text-xl"> <FaSignOutAlt /> </span>


  <span>
    {isLoggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
  </span>
</button>


);
}
