"use client";

import { NAV_ITEMS, APP_NAME, type Role, type NavItem } from "@/lib/constants";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppLogo } from "@/components/layout/AppLogo";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

// ─── Sub-menu link (tanpa children) ───────────────────────────────────────────
function SubNavLink({
  item,
  pathname,
}: {
  item: Omit<NavItem, "children">;
  pathname: string;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "relative flex items-center gap-2.5 pl-9 pr-3 py-2 rounded-lg text-sm font-medium",
          "transition-all duration-150",
          isActive
            ? "bg-white/15 text-white"
            : "text-primary-200 hover:bg-white/10 hover:text-white"
        )}
      >
        {isActive && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-lg bg-white/15"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent rounded-r-full" />
        )}
        <Icon
          className={cn(
            "w-3.5 h-3.5 shrink-0 relative z-10",
            isActive ? "text-accent" : "text-primary-400"
          )}
        />
        <span className="relative z-10">{item.label}</span>
      </Link>
    </li>
  );
}

// ─── Collapsible nav item dengan children ────────────────────────────────────
function CollapsibleNavItem({
  item,
  role,
  pathname,
}: {
  item: NavItem;
  role: Role;
  pathname: string;
}) {
  const visibleChildren = (item.children ?? []).filter(
    (c) => !c.roles || c.roles.includes(role)
  );
  const isParentActive = pathname.startsWith(item.href + "/") || pathname === item.href;
  const [open, setOpen] = useState(isParentActive);

  // Auto-expand bila route aktif berubah
  useEffect(() => {
    if (isParentActive) setOpen(true);
  }, [isParentActive]);

  const Icon = item.icon;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
          "transition-all duration-150",
          isParentActive
            ? "bg-white/10 text-white"
            : "text-primary-100 hover:bg-white/10 hover:text-white"
        )}
      >
        <Icon
          className={cn(
            "w-4 h-4 shrink-0",
            isParentActive ? "text-accent" : "text-primary-300"
          )}
        />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-transform duration-200 text-primary-400",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && visibleChildren.length > 0 && (
          <motion.ul
            key="submenu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden space-y-0.5 mt-0.5"
          >
            {visibleChildren.map((child) => (
              <SubNavLink key={child.href} item={child} pathname={pathname} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

// ─── Main Sidebar ────────────────────────────────────────────────────────────
export function Sidebar({ role, logoUrl }: { role: Role; logoUrl?: string | null }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 bg-primary flex flex-col z-30 shadow-xl"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Logo + App Name */}
      <div className="flex flex-col items-center px-5 py-5 border-b border-primary-700/50">
        <AppLogo logoUrl={logoUrl} className="w-36 h-11 mb-2" priority />
        <p className="text-xs text-primary-200 font-medium tracking-wide mt-1">
          {APP_NAME}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-3">
        <p className="section-label text-primary-300 px-3 mb-2">MENU UTAMA</p>

        <ul className="space-y-0.5">
          {items.map((item) => {
            // Item dengan children → collapsible
            if (item.children && item.children.length > 0) {
              return (
                <CollapsibleNavItem
                  key={item.href}
                  item={item}
                  role={role}
                  pathname={pathname}
                />
              );
            }

            const isActive =
              !item.external &&
              (pathname === item.href || pathname.startsWith(item.href + "/"));
            const Icon = item.icon;

            // Menu eksternal (mis. Prisma Studio) dibuka di tab baru.
            if (item.external) {
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-primary-100 hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="w-4 h-4 shrink-0 relative z-10 text-primary-300" />
                    <span className="relative z-10">{item.label}</span>
                  </a>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    "transition-all duration-150",
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-primary-100 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-lg bg-white/15"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-r-full" />
                  )}
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 relative z-10",
                      isActive ? "text-accent" : "text-primary-300"
                    )}
                  />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: versi */}
      <div className="px-5 py-3 border-t border-primary-700/50">
        <p className="text-xs text-primary-400 text-center">fq-Report v1.0</p>
      </div>
    </aside>
  );
}
