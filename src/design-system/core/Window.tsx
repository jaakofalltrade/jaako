import type { CSSProperties, ReactNode } from "react";

export interface WindowProps {
  title?: string;
  controls?: boolean;
  footer?: ReactNode;
  tone?: "plate" | "void";
  padded?: boolean;
  rivets?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}

function Rivet({ pos }: { pos: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "var(--rivet)",
        boxShadow: "0 1px 0 rgba(255,255,255,.12)",
        ...pos,
      }}
    />
  );
}

export function Window({
  title = "untitled",
  controls = true,
  footer,
  tone = "plate",
  padded = true,
  rivets = true,
  style,
  children,
}: WindowProps) {
  const body = tone === "void" ? "var(--panel-gradient-dark)" : "var(--panel-gradient)";
  return (
    <div
      style={{
        position: "relative",
        background: body,
        border: "var(--border-1) solid var(--steel-300)",
        borderRadius: 0,
        boxShadow: "var(--bevel-metal), var(--shadow-plate)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "var(--titlebar-h)",
          padding: "0 var(--space-3)",
          background: "linear-gradient(180deg,#1f2119 0%,#0d0e0b 100%)",
          borderBottom: "var(--border-1) solid var(--steel-400)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-pixel)",
            fontSize: "var(--text-2xs)",
            color: "var(--text-link)",
            letterSpacing: "var(--tracking-wide)",
            textShadow: "var(--glow-green)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {controls ? (
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {["_", "□", "×"].map((g) => (
              <span
                key={g}
                style={{
                  width: 15,
                  height: 13,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--panel-gradient)",
                  border: "var(--border-1) solid var(--steel-400)",
                  boxShadow: "var(--bevel-metal)",
                  fontFamily: "var(--font-pixel-micro)",
                  fontSize: "var(--text-3xs)",
                  color: "var(--text-muted)",
                  lineHeight: 1,
                }}
              >
                {g}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {rivets ? (
        <>
          <Rivet pos={{ left: 5, top: 27 }} />
          <Rivet pos={{ right: 5, top: 27 }} />
          <Rivet pos={{ left: 5, bottom: 5 }} />
          <Rivet pos={{ right: 5, bottom: 5 }} />
        </>
      ) : null}
      <div style={{ padding: padded ? "var(--space-6) var(--space-7)" : 0, color: "var(--text-body)" }}>
        {children}
      </div>
      {footer ? (
        <div
          style={{
            borderTop: "var(--border-1) solid var(--steel-400)",
            padding: "var(--space-2) var(--space-5)",
            background: "var(--void)",
            boxShadow: "var(--inset-well)",
            fontFamily: "var(--font-pixel-micro)",
            fontSize: "var(--text-2xs)",
            color: "var(--text-muted)",
            letterSpacing: "var(--tracking-wide)",
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
