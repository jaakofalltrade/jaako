import { MarqueeTone } from "@/models";
import { TICKER, TICKER_STRUCK } from "@/data/site";
import { Marquee } from "../core/Marquee";

/**
 * The footer marquee, recast as an instrument's status line.
 *
 * Same lines, read out flat. The struck-through entry leads because it is the one
 * that is actually a joke, and retired copy staying struck rather than deleted is the
 * whole point of it.
 */
export const StatusTicker = () => (
  <Marquee tone={MarqueeTone.Cyan} className="jk-ticker">
    <span>
      <s className="jk-struck">{TICKER_STRUCK.retired}</s> {TICKER_STRUCK.current}
    </span>
    {TICKER.map((line) => (
      <span key={line}>{line}</span>
    ))}
  </Marquee>
);
