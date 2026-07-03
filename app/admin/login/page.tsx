"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F332B", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Poppins, sans-serif" }}>

      {/* Background pattern */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(201,162,95,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(200,115,79,0.06) 0%, transparent 40%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative" }}>

        {/* Card */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "24px", padding: "40px 36px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>

          {/* Logo + title */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <Image src="/logo.png" alt="ChapterOne" width={52} height={52} style={{ objectFit: "contain" }} />
            </div>
            <p style={{ color: "#C9A25F", fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 600, marginBottom: "6px" }}>Admin Panel</p>
            <h1 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "26px", fontWeight: 700 }}>Welcome back</h1>
            <p style={{ color: "#2F3328", fontSize: "13px", opacity: 0.55, marginTop: "4px" }}>Sign in to manage ChapterOne</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ color: "#2F3328", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em" }}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#C9A25F" }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                  style={{ width: "100%", padding: "12px 14px 12px 38px", borderRadius: "10px", border: "1.5px solid #EEE2D5", backgroundColor: "#fff", fontFamily: "Poppins, sans-serif", fontSize: "14px", color: "#2F3328", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ color: "#2F3328", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em" }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#C9A25F" }} />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "12px 42px 12px 38px", borderRadius: "10px", border: "1.5px solid #EEE2D5", backgroundColor: "#fff", fontFamily: "Poppins, sans-serif", fontSize: "14px", color: "#2F3328", outline: "none", boxSizing: "border-box" }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#2F3328", opacity: 0.4, display: "flex", alignItems: "center" }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ backgroundColor: "rgba(200,115,79,0.1)", border: "1px solid rgba(200,115,79,0.3)", borderRadius: "10px", padding: "10px 14px" }}>
                <p style={{ color: "#C8734F", fontSize: "13px" }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", borderRadius: "9999px", padding: "15px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: "4px" }}
            >
              {loading ? "SIGNING IN…" : "SIGN IN"}
            </button>
          </form>
        </div>

        {/* Back to site */}
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button onClick={() => router.push("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(251,244,232,0.5)", fontFamily: "Poppins, sans-serif", fontSize: "13px" }}>
            ← Back to site
          </button>
        </div>
      </div>
    </div>
  );
}
