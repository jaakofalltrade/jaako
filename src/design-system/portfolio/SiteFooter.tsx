import { Marquee } from "../core/Marquee";
import { HitCounter } from "./HitCounter";

export function SiteFooter() {
  return (
    <footer style={{ display: "grid", gap: "var(--space-5)", padding: "var(--space-7) 0 var(--space-10)" }}>
      <Marquee tone="void">
        <span>open for work</span>
        <span>manila, ph</span>
        <span>best viewed in 1024×768</span>
        <span>no cookies, no newsletter</span>
      </Marquee>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-5)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-pixel-micro)",
            fontSize: "var(--text-2xs)",
            color: "var(--text-muted)",
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
          }}
        >
          jaako.xyz · built by hand, mostly
        </span>
        <HitCounter count={1985057} label="visitors" />
      </div>
    </footer>
  );
}
