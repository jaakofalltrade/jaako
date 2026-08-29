import type { ReactNode } from "react";
import { PageShell } from "@/design-system/portfolio/PageShell";

/**
 * The lab pages that keep the site's frame.
 *
 * Two of the four are in here: the index, which is a page about this site and should
 * look like it, and /lab/suggest, which is about music the dock is already playing.
 * The other two are in (bare) next door and get the viewport to themselves.
 *
 * Same shell as src/app/(site)/layout.tsx and deliberately not shared with it. They
 * are one line each, they are allowed to diverge, and a `LabFramedLayout` that
 * re-exported the site's would only hide which pages have a footer.
 */
const LabFramedLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <PageShell>{children}</PageShell>
);

export default LabFramedLayout;
