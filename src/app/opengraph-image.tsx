import { ImageResponse } from "next/og";
import { LOCATION, SITE_DOMAIN, SITE_REV } from "@/constants";
import { HERO } from "@/data/site";

/**
 * The social card. The site had no OG layer at all before the redesign, so every
 * link to it unfurled as a bare URL.
 *
 * Rendered by Satori rather than a browser, which rules out most of the site's own
 * vocabulary: no background-clip:text, so the chrome ramp cannot fill the lettering,
 * and no backdrop-filter, so there is no glass. What survives translation is the part
 * that actually identifies the site anyway — the cold ground, the cyan bloom, the
 * hairline rules and the mono annotation.
 *
 * Every element needs an explicit `display: flex`; Satori has no block layout.
 */

export const alt = "jaako andes — full-stack engineer, Sorsogon, Philippines";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

const INK = "#04070a";
const ICE = "#eaf6fb";
const DIM = "#7b95a4";
const CY = "#5cf2ff";
const HAIR = "rgba(150,205,230,0.22)";

const Image = () =>
  new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: INK,
          // The page's own bloom, flattened to two radials.
          backgroundImage:
            "radial-gradient(900px 500px at 62% -8%, rgba(28,150,190,0.34), transparent), radial-gradient(700px 400px at 8% 100%, rgba(20,60,140,0.28), transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", width: 8, height: 8, backgroundColor: CY }} />
          <div
            style={{
              display: "flex",
              fontSize: 20,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: CY,
            }}
          >
            portfolio · rev {SITE_REV}
          </div>
          <div style={{ display: "flex", flex: 1, height: 1, backgroundColor: HAIR }} />
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 4, color: DIM }}>
            {HERO.coords}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 132,
              lineHeight: 1,
              letterSpacing: -2,
              color: ICE,
            }}
          >
            {HERO.title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 30,
              lineHeight: 1.4,
              color: DIM,
              maxWidth: 860,
            }}
          >
            Full-stack odd jobs — Next.js, Django, Discord bots, and whatever else the week
            needs.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", height: 1, backgroundColor: HAIR }} />
          <div style={{ display: "flex", gap: 44, fontSize: 20, letterSpacing: 4, color: DIM }}>
            <div style={{ display: "flex" }}>TECHNICAL LEAD</div>
            <div style={{ display: "flex" }}>RESTOPLUS</div>
            <div style={{ display: "flex" }}>{LOCATION.toUpperCase()}</div>
            <div style={{ display: "flex", marginLeft: "auto", color: CY }}>
              {SITE_DOMAIN.toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );

export default Image;
