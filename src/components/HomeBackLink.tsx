"use client";

import Link from "next/link";
import { MouseEvent } from "react";
import { useRouter } from "next/navigation";

export function HomeBackLink() {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (window.history.length > 1 && document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        if (referrer.origin === window.location.origin && referrer.pathname === "/") {
          event.preventDefault();
          router.back();
        }
      } catch {
        // Keep the normal home link as the safe fallback.
      }
    }
  }

  return <Link href="/" onClick={handleClick} className="button-secondary px-3 py-2 text-sm">返回首页</Link>;
}
