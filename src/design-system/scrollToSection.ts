/** Smoothly scrolls to an on-page section and updates the URL hash without a full navigation. */
export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.pushState(null, "", `/#${id}`);
}
