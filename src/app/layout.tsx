import type { Metadata } from "next";
import "../styles/globals.scss";
import { PageShell } from "@/design-system/portfolio/PageShell";

export const metadata: Metadata = {
  title: "jaako andes — full-stack odd jobs",
  description: "I think therefore I am. Next.js, Django, Discord bots, and whatever else the week needs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PageShell>{children}</PageShell>
      </body>
    </html>
  );
}
