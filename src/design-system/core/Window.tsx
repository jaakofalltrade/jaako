import type { ReactNode } from "react";
import { PANEL_TONE_CLASS } from "@/constants/ui";
import { PanelTone } from "@/models";
import { cx } from "@/utils/cx";

export type WindowProps = {
  title?: string;
  controls?: boolean;
  footer?: ReactNode;
  tone?: PanelTone;
  padded?: boolean;
  rivets?: boolean;
  className?: string;
  children?: ReactNode;
};

const RIVETS = ["tl", "tr", "bl", "br"] as const;

const CONTROL_GLYPHS = ["_", "□", "×"] as const;

export const Window = ({
  title = "untitled",
  controls = true,
  footer,
  tone = PanelTone.Plate,
  padded = true,
  rivets = true,
  className,
  children,
}: WindowProps) => (
  <div className={cx("jk-window", PANEL_TONE_CLASS[tone], className)}>
    <div className="jk-window__titlebar">
      <span className="jk-window__title">{title}</span>
      {controls ? (
        <div className="jk-window__controls">
          {CONTROL_GLYPHS.map((glyph) => (
            <span key={glyph} className="jk-window__control">
              {glyph}
            </span>
          ))}
        </div>
      ) : null}
    </div>
    {rivets
      ? RIVETS.map((position) => (
          <span
            key={position}
            aria-hidden="true"
            className={cx("jk-window__rivet", `jk-window__rivet--${position}`)}
          />
        ))
      : null}
    <div className={cx("jk-window__body", !padded && "jk-window__body--flush")}>{children}</div>
    {footer ? <div className="jk-window__footer">{footer}</div> : null}
  </div>
);
