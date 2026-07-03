"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { BookOpen, ExternalLink, LogOut } from "lucide-react";
import Image from "next/image";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (pathname === "/admin/login") { setReady(true); return; }
      if (!user) { router.replace("/admin/login"); } else { setReady(true); }
    });
    return unsub;
  }, [pathname, router]);

  if (!ready) return null;

  return (
    <div style={{ backgroundColor: "#F5EFE4", minHeight: "100vh", fontFamily: "Poppins, sans-serif" }}>
      <header style={{ backgroundColor: "#0F332B", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => router.push("/admin/dashboard")}>
          <Image src="/logo.png" alt="ChapterOne" width={36} height={36} style={{ objectFit: "contain" }} />
          <div>
            <p style={{ fontFamily: "Playfair Display, serif", color: "#FBF4E8", fontSize: "15px", fontWeight: 700, lineHeight: 1.1 }}>ChapterOne</p>
            <p style={{ color: "#C9A25F", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase" }}>Admin Panel</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid rgba(251,244,232,0.2)", borderRadius: "9999px", padding: "7px 16px", cursor: "pointer", color: "rgba(251,244,232,0.7)", fontSize: "13px" }}>
            <ExternalLink size={13} /> View Site
          </button>
          <button onClick={async () => { await signOut(auth); router.replace("/admin/login"); }} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid rgba(251,244,232,0.15)", borderRadius: "9999px", padding: "7px 14px", cursor: "pointer", color: "rgba(251,244,232,0.5)", fontSize: "13px" }}>
            <LogOut size={13} />
          </button>
        </div>
      </header>
      <main style={{ maxWidth: "1300px", margin: "0 auto", padding: "32px 24px" }}>{children}</main>
    </div>
  );
}
