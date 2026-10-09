"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isAdmin } from "@/lib/firestore";
import { isUnsaved, leaveThen, registerLeavePrompt } from "@/lib/unsaved";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, LayoutDashboard, LogOut, Menu, Plus, Ticket, X } from "lucide-react";
import { Button, C, ConfirmDialog } from "@/components/admin/ui";

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
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname; // closes automatically after navigating
  const setMenuOpen = (v: boolean) => setMenuPath(v ? pathname : null);
  const [collapsed, setCollapsed] = useState(() => { try { return typeof window !== "undefined" && localStorage.getItem("admin-sidebar") === "collapsed"; } catch { return false; } });
  const toggleCollapsed = () => setCollapsed(v => { try { localStorage.setItem("admin-sidebar", v ? "open" : "collapsed"); } catch { /* storage blocked */ } return !v; });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (pathname === "/admin/login") { setState("ok"); return; }
      if (!u) { router.replace("/admin/login"); return; }
      setState(await isAdmin(u.uid) ? "ok" : "denied");
    });
    return unsub;
  }, [pathname, router]);

  const [leave, setLeave] = useState<null | (() => void)>(null);
  useEffect(() => { registerLeavePrompt(go => setLeave(() => go)); return () => registerLeavePrompt(null); }, []);
  const guard = (e: React.MouseEvent, href: string) => { if (isUnsaved()) { e.preventDefault(); leaveThen(() => router.push(href)); } };

  async function logout() {
    leaveThen(async () => { await signOut(auth); router.replace("/admin/login"); });
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

  const navLink = (href: string, label: string, Icon: typeof Plus, compact: boolean) => (
    <Link key={href} href={href} className="admin-nav-link" data-active={pathname.startsWith(href)} title={compact ? label : undefined}
      style={compact ? { justifyContent: "center", padding: "10px 0" } : undefined}
      onClick={e => guard(e, href)}>
      <Icon size={18} /> {!compact && label}
    </Link>
  );

  const sidebar = (compact: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: compact ? "20px 12px" : "20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: compact ? "center" : "space-between", gap: 8, padding: compact ? "0 0 20px" : "0 4px 20px 8px" }}>
        <Link href="/admin/dashboard" onClick={e => guard(e, "/admin/dashboard")} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Image src="/logo.png" alt="" width={32} height={32} style={{ objectFit: "contain", flexShrink: 0 }} />
          {!compact && <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.1 }}>Aval Agam</p>
            <p style={{ fontSize: 12, color: C.muted }}>Admin</p>
          </div>}
        </Link>
      </div>
      <Link href="/admin/events/create" title={compact ? "New event" : undefined} onClick={e => guard(e, "/admin/events/create")} style={{ marginBottom: 16 }}>
        <Button style={{ width: "100%", padding: compact ? 0 : undefined }}><Plus size={16} />{!compact && " New event"}</Button>
      </Link>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>{NAV.map(({ href, label, Icon }) => navLink(href, label, Icon, compact))}</nav>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 2, borderTop: `1px solid ${C.sand}`, paddingTop: 12 }}>
        <a href="/" target="_blank" rel="noopener noreferrer" className="admin-nav-link" title={compact ? "View website" : undefined} style={compact ? { justifyContent: "center", padding: "10px 0" } : undefined}><ExternalLink size={18} />{!compact && " View website"}</a>
        <button onClick={logout} className="admin-nav-link" title={compact ? "Sign out" : undefined} style={{ width: "100%", textAlign: "left", ...(compact ? { justifyContent: "center", padding: "10px 0" } : {}) }}><LogOut size={18} />{!compact && " Sign out"}</button>
        {!compact && <p style={{ fontSize: 12, color: C.muted, padding: "8px 12px 0", overflow: "hidden", textOverflow: "ellipsis" }} title={user?.email ?? ""}>{user?.email}</p>}
      </div>
    </div>
  );

  const width = collapsed ? 76 : 260;

  return (
    <div className="admin-root" style={{ minHeight: "100vh", ["--side" as string]: `${width}px` }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block" style={{ position: "fixed", top: 0, bottom: 0, left: 0, width, background: "#fff", borderRight: `1px solid ${C.sand}`, zIndex: 40, transition: "width .2s" }}>
        {sidebar(collapsed)}
        <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ position: "absolute", top: 26, right: -13, width: 26, height: 26, borderRadius: 999, background: "#fff", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, boxShadow: "0 1px 3px rgba(16,24,40,.1)" }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="flex lg:hidden" style={{ position: "sticky", top: 0, zIndex: 40, background: "#fff", borderBottom: `1px solid ${C.sand}`, height: 60, alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
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
            {sidebar(false)}
          </div>
        </div>
      )}

      <main className="lg:pl-[var(--side)]" style={{ transition: "padding .2s" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "28px 16px 80px" }} className="lg:px-8">{children}</div>
      </main>

      <ConfirmDialog open={!!leave} danger title="Leave without saving?" confirmLabel="Leave page"
        message="You have unsaved changes on this event. If you leave now, they'll be lost."
        onCancel={() => setLeave(null)} onConfirm={() => { const go = leave; setLeave(null); go?.(); }} />
    </div>
  );
}
