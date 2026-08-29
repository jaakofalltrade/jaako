import type { ReactNode } from "react";
import { PageShell } from "@/design-system/portfolio/PageShell";

/**
 * The portfolio's frame.
 *
 * PageShell used to be mounted in the root layout, which made the ticker footer and
 * the now-playing dock unavoidable on every route the site would ever have. That was
 * right while every route was the portfolio. It stopped being right when the lab
 * arrived: a slot machine in an arcade cabinet cannot be wearing this site's footer.
 *
 * So the shell moved down one level, and this group is what wears it. The group name
 * is in parentheses, so it contributes nothing to the URL — the homepage is still /,
 * and /work is still /work. Nothing about these pages changed except which file puts
 * the frame around them.
 *
 * The root layout keeps everything that is genuinely global: <html>, <body>, the two
 * font faces, the duotone filter and globals.scss. A bare lab page still wants the
 * reset and the type; it just does not want the furniture.
 */
const SiteLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <PageShell>{children}</PageShell>
);

export default SiteLayout;
