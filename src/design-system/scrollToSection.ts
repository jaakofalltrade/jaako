/** Smoothly scrolls to an on-page section and updates the URL hash without a full navigation. */
export const scrollToSection = (args: { id: string }) => {
  const { id } = args;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.pushState(null, "", `/#${id}`);
};
