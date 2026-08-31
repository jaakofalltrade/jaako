/**
 * The barrel for oras's own constants. `import { Timezone } from "@/oras/constants"`.
 *
 * Separate from src/constants rather than folded into it, because these are the
 * vocabulary of this folder rather than of the site: a format token means nothing
 * without the function that consumes it, and Timezone is the argument type half of
 * oras takes. Keeping them adjacent is what makes the folder readable end to end.
 *
 * NOTHING HERE IMPORTS LUXON, and that is load-bearing rather than incidental. A
 * client component can name a Timezone or reach for a format token without dragging
 * the library into its bundle. See the note in ../index.ts about the seam.
 */

export * from "./formats";
export * from "./timezone";
