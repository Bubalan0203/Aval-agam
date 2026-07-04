"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ExternalLink, LogOut, Monitor } from "lucide-react";
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

  // Login page is full-screen — no admin header/frame
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <>
      {/* Mobile block — admin is desktop-only */}
      <div className="flex md:hidden" style={{ minHeight: "100vh", backgroundColor: "#0F332B", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", textAlign: "center", fontFamily: "Poppins, sans-serif" }}>
        <div style={{ width: "88px", height: "88px", borderRadius: "50%", backgroundColor: "#FBF4E8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
          <Image src="/logo.png" alt="Aval Agam" width={64} height={64} style={{ objectFit: "contain" }} />
        </div>
        <p style={{ color: "#C9A25F", fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 600, marginBottom: "10px" }}>Aval Agam · Admin Panel</p>
        <h1 style={{ fontFamily: "Playfair Display, serif", color: "#FBF4E8", fontSize: "24px", fontWeight: 700, lineHeight: 1.35, marginBottom: "14px" }}>Best viewed on a desktop</h1>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "rgba(201,162,95,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
          <Monitor size={24} style={{ color: "#C9A25F" }} />
        </div>
        <p style={{ color: "rgba(251,244,232,0.65)", fontSize: "14px", lineHeight: 1.7, maxWidth: "300px", marginBottom: "28px" }}>
          The admin panel is designed for larger screens. Please open this page on a laptop or desktop to manage your events and bookings.
        </p>
        <button onClick={() => router.push("/")} style={{ backgroundColor: "#C9A25F", color: "#0F332B", fontFamily: "Poppins, sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", borderRadius: "9999px", padding: "13px 28px", cursor: "pointer" }}>
          Go to Website
        </button>
      </div>

      {/* Desktop admin */}
      <div className="hidden md:block" style={{ backgroundColor: "#F5EFE4", minHeight: "100vh", fontFamily: "Poppins, sans-serif" }}>
        <header style={{ backgroundColor: "#0F332B", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => router.push("/admin/dashboard")}>
            <Image src="/logo.png" alt="Aval Agam" width={36} height={36} style={{ objectFit: "contain" }} />
            <div>
              <p style={{ fontFamily: "Playfair Display, serif", color: "#FBF4E8", fontSize: "15px", fontWeight: 700, lineHeight: 1.1 }}>Aval Agam</p>
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
    </>
  );
}
