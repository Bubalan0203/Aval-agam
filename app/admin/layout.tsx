"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isAdmin } from "@/lib/firestore";
import { confirmLeave } from "@/lib/unsaved";
import { CalendarDays, ExternalLink, LayoutDashboard, LogOut, Menu, Plus, Ticket, X } from "lucide-react";
import { Button, C } from "@/components/admin/ui";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/events",    label: "Events",    Icon: CalendarDays },
  { href: "/admin/bookings",  label: "Bookings",  Icon: Ticket },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (pathname === "/admin/login") { setState("ok"); return; }
      if (!u) { router.replace("/admin/login"); return; }
      setState(await isAdmin(u.uid) ? "ok" : "denied");
    });
    return unsub;
  }, [pathname, router]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function logout() {
    if (!confirmLeave()) return;
    await signOut(auth); router.replace("/admin/login");
  }

  if (pathname === "/admin/login") return <>{children}</>;
  if (state === "loading") return <div className="admin-root" style={{ minHeight: "100vh" }} />;
  if (state === "denied") return (
    <div className="admin-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
      <p style={{ fontSize: 18, fontWeight: 600 }}>This account doesn&rsquo;t have admin access</p>
      <p style={{ fontSize: 14, color: C.ink, maxWidth: 440 }}>Signed in as <strong>{user?.email}</strong>. Add this email to <code>NEXT_PUBLIC_ADMIN_EMAILS</code> in Vercel and redeploy, or sign in with an admin account.</p>
      <Button onClick={logout}>Sign out</Button>
    </div>
  );

  const nav = (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {NAV.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="admin-nav-link" data-active={pathname.startsWith(href)}
          onClick={e => { if (!confirmLeave()) e.preventDefault(); }}>
          <Icon size={18} /> {label}
        </Link>
      ))}
    </nav>
  );

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "20px 16px" }}>
      <Link href="/admin/dashboard" onClick={e => { if (!confirmLeave()) e.preventDefault(); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 20px" }}>
        <Image src="/logo.png" alt="" width={32} height={32} style={{ objectFit: "contain" }} />
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>Aval Agam</p>
          <p style={{ fontSize: 12, color: C.muted }}>Admin</p>
        </div>
      </Link>
      <Link href="/admin/events/create" onClick={e => { if (!confirmLeave()) e.preventDefault(); }} style={{ marginBottom: 16 }}>
        <Button style={{ width: "100%" }}><Plus size={16} /> New event</Button>
      </Link>
      {nav}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 2, borderTop: `1px solid ${C.sand}`, paddingTop: 12 }}>
        <a href="/" target="_blank" rel="noopener noreferrer" className="admin-nav-link"><ExternalLink size={18} /> View website</a>
        <button onClick={logout} className="admin-nav-link" style={{ width: "100%", textAlign: "left" }}><LogOut size={18} /> Sign out</button>
        <p style={{ fontSize: 12, color: C.muted, padding: "8px 12px 0", overflow: "hidden", textOverflow: "ellipsis" }} title={user?.email ?? ""}>{user?.email}</p>
      </div>
    </div>
  );

  return (
    <div className="admin-root" style={{ minHeight: "100vh" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block" style={{ position: "fixed", top: 0, bottom: 0, left: 0, width: 260, background: "#fff", borderRight: `1px solid ${C.sand}`, zIndex: 40 }}>{sidebar}</aside>

      {/* Mobile top bar */}
      <header className="lg:hidden" style={{ position: "sticky", top: 0, zIndex: 40, background: "#fff", borderBottom: `1px solid ${C.sand}`, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo.png" alt="" width={28} height={28} style={{ objectFit: "contain" }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Aval Agam</span>
        </div>
        <button aria-label="Open menu" onClick={() => setMenuOpen(true)} style={{ padding: 8 }}><Menu size={22} /></button>
      </header>
      {menuOpen && (
        <div className="lg:hidden" style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          <div onClick={() => setMenuOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(16,24,40,.45)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 280, background: "#fff" }}>
            <button aria-label="Close menu" onClick={() => setMenuOpen(false)} style={{ position: "absolute", top: 18, right: 14, color: C.muted }}><X size={20} /></button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="lg:pl-[260px]">
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 16px 80px" }} className="lg:px-8">{children}</div>
      </main>
    </div>
  );
}
