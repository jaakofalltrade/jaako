import type { ReactNode } from "react";

/**
 * The lab pages that get the viewport to themselves.
 *
 * No PageShell, so no ticker footer and no now-playing dock. A slot machine in an
 * arcade cabinet and a chat client are both supposed to read as something other than
 * this website, and the site's furniture around them would say the opposite.
 *
 * What this layout is for is the landmark. PageShell owned the only <main> on the
 * site, so a page that opts out of the shell has to supply its own or the document
 * has no main region at all. That is the entire job: no wrapper class, no ground, no
 * chrome. Each app paints its own background and draws its own way out, because those
 * are design decisions and this file has no business making them for three apps that
 * are meant to look nothing alike.
 *
 * A page in here still gets the root layout, so it has globals.scss, the reset and
 * both font faces. It is free to use none of them.
 */
const LabBareLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <main>{children}</main>
);

export default LabBareLayout;
