import { Navbar, Footer } from "@/components/Navbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#FBF4E8", minHeight: "100vh", fontFamily: "Poppins, sans-serif" }}>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
