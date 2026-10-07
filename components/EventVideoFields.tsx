"use client";

export function EventVideoFields({ values, onChange }: { values: [string, string]; onChange: (values: [string, string]) => void }) {
  return (
    <section style={{ background: "#FBF4E8", borderRadius: "16px", padding: "22px 24px" }}>
      <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "18px", fontWeight: 700 }}>YouTube videos</h2>
      <p style={{ fontSize: "12px", margin: "8px 0 14px", color: "#2F3328" }}>Add up to two YouTube links. Leave either field empty if you don’t need it.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {values.map((value, i) => (
          <label key={i} style={{ fontSize: "12px", fontWeight: 600, color: "#2F3328" }}>
            YouTube link {i + 1} (optional)
            <input type="url" value={value} placeholder="https://www.youtube.com/watch?v=…" onChange={(e) => { const next: [string, string] = [...values]; next[i] = e.target.value; onChange(next); }} style={{ width: "100%", marginTop: "6px", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #EEE2D5", background: "white", fontWeight: 400 }} />
          </label>
        ))}
      </div>
    </section>
  );
}
