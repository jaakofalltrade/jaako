import { Marquee } from "../core/Marquee";
import { HitCounter } from "./HitCounter";

export function SiteFooter() {
  return (
    <footer className="jk-footer">
      <Marquee tone="void">
        <span>open for work</span>
        <span>manila, ph</span>
        <span>best viewed in 1024×768</span>
        <span>no cookies, no newsletter</span>
      </Marquee>
      <div className="jk-footer__bar">
        <span className="jk-footer__credit">jaako.xyz · built by hand, mostly</span>
        <HitCounter count={1985057} label="visitors" />
      </div>
    </footer>
  );
}
