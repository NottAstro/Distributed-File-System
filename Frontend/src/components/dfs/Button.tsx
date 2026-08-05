import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export const dfsButton = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong",
  {
    variants: {
      variant: {
        primary: "ak-pill-btn",
        authSubmit: "ak-violet-btn w-full",
        secondary:
          "text-foreground rounded-full border border-[rgba(186,215,247,0.1)] hover:bg-[rgba(186,214,247,0.06)]",
        ghost:
          "text-[var(--ak-moon)] hover:text-white rounded-full hover:bg-[rgba(186,214,247,0.08)]",
        danger:
          "border border-destructive text-destructive rounded-full bg-transparent hover:bg-destructive/10",
        accent: "bg-accent text-accent-foreground rounded-full hover:brightness-105",
        icon: "size-8 rounded-full text-[var(--ak-moon)] hover:text-white hover:bg-[rgba(186,214,247,0.08)]",
      },
      size: {
        sm: "h-9 px-3 text-[14px]",
        md: "h-[41px]", // padding/font-size is handled by ak-pill-btn mostly, but we can leave this
        lg: "h-12",
        none: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Props = ComponentProps<"button"> &
  VariantProps<typeof dfsButton> & { asChild?: boolean; full?: boolean };

export function Button({ className, variant, size, asChild, full, ...props }: Props) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        dfsButton({ variant, size: variant === "icon" ? "none" : size }),
        full && "w-full",
        className,
      )}
      {...props}
    />
  );
}
