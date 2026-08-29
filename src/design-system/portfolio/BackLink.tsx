import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonVariant } from "@/models";
import { Button } from "../core/Button";

export type BackLinkProps = {
  href: string;
  children: ReactNode;
};

/**
 * The way out of a sub-page, at the top of it.
 *
 * It used to be at the foot of /experience and of /work/[slug], written out separately
 * in each, and /work had none at all. At the bottom it is a control you reach by
 * finishing the page, which is backwards: someone who wants out wants out now, and on
 * /experience "now" was several thousand pixels of scrolling away.
 *
 * The arrow belongs to the component rather than to the label. It is the same arrow on
 * every page and there is no call site that would want a different one, so passing it
 * in as part of the text was three chances to get one of them wrong.
 */
export const BackLink = ({ href, children }: BackLinkProps) => (
  <div className="jk-back">
    <Link href={href} className="jk-back__link">
      <Button as="span" variant={ButtonVariant.Glass}>
        ← {children}
      </Button>
    </Link>
  </div>
);
