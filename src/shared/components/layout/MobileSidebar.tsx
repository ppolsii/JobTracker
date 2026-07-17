"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { SidebarNav } from "@/shared/components/layout/SidebarNav";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

// Mobile equivalent of Sidebar (UI_SYSTEM.md: "Mobile ... Sidebar becomes a
// Drawer"). Only rendered below lg via Tailwind classes on the trigger.
export function MobileSidebar({ footer }: { footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation menu"
        className="lg:hidden"
        render={<Button variant="ghost" size="icon" />}
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <SidebarNav footer={footer} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
