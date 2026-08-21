import { MarqueeTone } from "@/models";
import { Marquee } from "../core/Marquee";
import { HitCounter } from "./HitCounter";

export const SiteFooter = () => (
  <footer className="jk-footer">
    <Marquee tone={MarqueeTone.Void}>
      <span>
        <s className="jk-marquee__struck">open for work</s> happily employed
      </span>
      <span>sorsogon, ph</span>
      <span>best viewed in 1024×768</span>
      <span>no cookies, no newsletter</span>
    </Marquee>
    <div className="jk-footer__bar">
      <span className="jk-footer__credit">jaako.xyz · built by hand, mostly</span>
      <HitCounter count={1985057} label="visitors" />
    </div>
  </footer>
);
