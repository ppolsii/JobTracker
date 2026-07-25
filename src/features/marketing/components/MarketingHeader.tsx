"use client";

import { Briefcase, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ROUTES } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { MARKETING_NAV_LINKS } from "@/features/marketing/constants/marketing.constants";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

// "RESPONSIVE": desktop shows the full nav inline; below `md` it collapses
// into a Sheet drawer, mirroring MobileSidebar's own trigger/Sheet pattern
// from the dashboard shell (a different component, since the dashboard's
// own Sidebar/TopNav are explicitly out of scope this phase).
export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-2 font-semibold"
        >
          <Briefcase className="size-5 text-primary" aria-hidden="true" />
          {siteConfig.name}
        </Link>

        <nav
          aria-label="Main"
          className="ml-6 hidden items-center gap-6 md:flex"
        >
          {MARKETING_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm text-muted-foreground hover:text-foreground",
                pathname === link.href && "font-medium text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href={ROUTES.LOGIN} />}
          >
            Log in
          </Button>
          <Button nativeButton={false} render={<Link href={ROUTES.REGISTER} />}>
            Sign up free
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open navigation menu"
            className="ml-auto md:hidden"
            render={<Button variant="ghost" size="icon" />}
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetHeader>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
            </SheetHeader>
            <nav
              aria-label="Main"
              className="flex flex-1 flex-col gap-1 px-4 pb-4"
            >
              {MARKETING_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={ROUTES.LOGIN} onClick={() => setOpen(false)} />}
                >
                  Log in
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link href={ROUTES.REGISTER} onClick={() => setOpen(false)} />}
                >
                  Sign up free
                </Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
