import Link from "next/link";

import { siteConfig } from "@/config/site";
import { MARKETING_FOOTER_LINK_GROUPS } from "@/features/marketing/constants/marketing.constants";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {MARKETING_FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          © {year} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
