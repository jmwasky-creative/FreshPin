"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="text-sm font-semibold text-slate-600"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut();
        window.location.href = "/login";
      }}
    >
      {busy ? "退出中…" : "退出"}
    </button>
  );
}
