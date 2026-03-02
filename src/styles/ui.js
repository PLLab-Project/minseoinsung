import { cn } from "./cn";

export const layout = {
  shell: "relative min-h-screen text-slate-900",
  mainWrap: "relative z-10",
  main: "mx-auto max-w-6xl px-6 py-10",
};

export const header = {
  root: "sticky top-0 z-50",
  barBase:
    "backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b",
  barScrolled: "bg-slate-950/70 border-white/10",
  barTop: "bg-slate-950/55 border-white/5",
  inner: "mx-auto flex h-16 max-w-6xl items-center justify-between px-6",
  brand:
    "group inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-white",
  nav: "flex items-center gap-2",
  navItem:
    "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition " +
    "border border-white/10 bg-white/5 text-white/80 backdrop-blur " +
    "hover:bg-white/8 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15 focus:ring-offset-0",
  navItemActive: "bg-white/10 text-white",
  button:
    "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition " +
    "border border-white/10 bg-white/5 text-white/80 backdrop-blur " +
    "hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15",
  welcome: "hidden sm:block text-sm text-white/75",
};

export const home = {
  wrap: "mx-auto max-w-3xl",
  badge:
    "mx-auto inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 " +
    "text-xs font-medium text-white/70 shadow-sm backdrop-blur",
  title: "mt-10 text-6xl font-semibold leading-[1.05] tracking-tight text-white",
  desc:
    "mx-auto mt-6 max-w-xl text-sm leading-7 tracking-[-0.01em] text-white/70",
  ctas: "mt-12 flex flex-wrap justify-center gap-3",
  ctaBtn:
    "rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium " +
    "text-white shadow-sm backdrop-blur transition hover:border-yellow-200/20 hover:bg-yellow-200/10",
  divider:
    "mx-auto mt-80 h-px w-28 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-80",
};

export const game = {
  wrap: "mx-auto max-w-5xl",
  label: "text-xs font-medium text-white/60",
  title: "mt-2 text-3xl font-semibold tracking-tight text-white",
  line: "mt-3 h-px w-24 bg-gradient-to-r from-yellow-200/40 via-white/15 to-transparent",
  desc: "mt-4 text-sm leading-7 tracking-[-0.01em] text-white/70",
  panel: "rounded-2xl border border-white/12 bg-black/30 p-4 shadow-sm backdrop-blur",
};

export function navItemClass(active) {
  return cn(header.navItem, active && header.navItemActive);
}

export function headerBarClass(scrolled) {
  return cn(header.barBase, scrolled ? header.barScrolled : header.barTop);
}
