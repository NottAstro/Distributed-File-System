import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: LucideIcon | undefined;
  hint?: string;
  danger?: boolean;
  onSelect: () => void;
}

/** Dropdown menu in the dashboard's glass style. Pass `null` for a divider. */
export function Menu({
  trigger,
  items,
  align = "end",
  side = "bottom",
  className,
}: {
  trigger: ReactNode;
  items: (MenuItem | null)[];
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={6}
          className={cn(
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-[70] min-w-[200px] rounded-xl border p-1.5",
            className,
          )}
          style={{
            background: "rgba(12,14,30,0.98)",
            borderColor: "rgba(186,215,247,0.12)",
            boxShadow: "0 16px 48px -12px rgba(0,0,0,0.7)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) =>
            item === null ? (
              <DropdownMenu.Separator key={`sep-${i}`} className="my-1 h-px bg-white/[0.06]" />
            ) : (
              <DropdownMenu.Item
                key={item.label}
                onSelect={item.onSelect}
                className={cn(
                  "flex h-9 cursor-pointer select-none items-center gap-3 rounded-lg px-2.5 text-[14px] outline-none transition-colors",
                  item.danger
                    ? "text-[#fca5a5] data-[highlighted]:bg-[rgba(248,113,113,0.10)]"
                    : "text-[var(--ak-moon)] data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white",
                )}
              >
                {item.icon && <item.icon className="size-4 shrink-0 opacity-80" />}
                <span className="flex-1">{item.label}</span>
                {item.hint && (
                  <span className="text-[12px] text-[var(--ak-fog)]/70">{item.hint}</span>
                )}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
