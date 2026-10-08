"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isAdmin } from "@/lib/firestore";
import { CalendarDays, ExternalLink, LayoutDashboard, LogOut, Ticket } from "lucide-react";
import Image from "next/image";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/events",    label: "Events",    Icon: CalendarDays },
  { href: "/admin/bookings",  label: "Bookings",  Icon: Ticket },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (pathname === "/admin/login") { setState("ok"); return; }
      if (!user) { router.replace("/admin/login"); return; }
      setState(await isAdmin(user.uid) ? "ok" : "denied");
    });
    return unsub;
  }, [pathname, router]);

  if (pathname === "/admin/login") return <>{children}</>;
  if (state === "loading") return null;
  if (state === "denied") return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "Poppins, sans-serif", padding: 24, textAlign: "center" }}>
      <p style={{ fontSize: 18, fontWeight: 600, color: "#0F332B" }}>This account is not an administrator.</p>
      <p style={{ fontSize: 13, maxWidth: 420, color: "#2F3328" }}>Ask the site owner to add your user ID ({auth.currentUser?.uid}) to the <code>admins</code> collection in Firebase.</p>
      <button onClick={async () => { await signOut(auth); router.replace("/admin/login"); }} style={{ padding: "10px 20px", borderRadius: 999, background: "#0F332B", color: "#FBF4E8" }}>Sign out</button>
    </div>
  );

  return (
    <div style={{ backgroundColor: "#F5EFE4", minHeight: "100vh", fontFamily: "Poppins, sans-serif" }}>
      <header style={{ backgroundColor: "#0F332B", padding: "0 20px", minHeight: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 30 }}>
        <Link href="/admin/dashboard" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo.png" alt="Aval Agam" width={36} height={36} style={{ objectFit: "contain" }} />
          <div className="hidden sm:block">
            <p style={{ fontFamily: "Playfair Display, serif", color: "#FBF4E8", fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>AVAL AGAM</p>
            <p style={{ color: "#C9A25F", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase" }}>Admin Panel</p>
          </div>
        </Link>
        <nav style={{ display: "flex", gap: 4, overflowX: "auto" }}>
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, fontSize: 13, whiteSpace: "nowrap", color: active ? "#0F332B" : "rgba(251,244,232,0.75)", background: active ? "#C9A25F" : "transparent", fontWeight: active ? 600 : 400 }}>
                <Icon size={14} /> {label}
              </Link>
            );
          })}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/" target="_blank" style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(251,244,232,0.2)", borderRadius: 999, padding: "7px 14px", color: "rgba(251,244,232,0.7)", fontSize: 13 }}>
            <ExternalLink size={13} /> <span className="hidden sm:inline">View Site</span>
          </Link>
          <button aria-label="Sign out" onClick={async () => { await signOut(auth); router.replace("/admin/login"); }} style={{ display: "flex", alignItems: "center", border: "1px solid rgba(251,244,232,0.15)", borderRadius: 999, padding: "7px 12px", color: "rgba(251,244,232,0.6)" }}>
            <LogOut size={13} />
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 16px 64px" }}>{children}</main>
    </div>
  );
}
