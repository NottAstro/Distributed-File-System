import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export const dfsButton = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong",
  {
    variants: {
      variant: {
        primary:
          "bg-foreground text-background rounded-md hover:brightness-95 hover:scale-[1.02] active:scale-100",
        secondary:
          "glass text-foreground rounded-full border border-border-strong hover:bg-white/12 hover:border-white/25",
        ghost: "text-muted-foreground hover:text-foreground rounded-md",
        danger:
          "border border-destructive text-destructive rounded-md bg-transparent hover:bg-destructive/10",
        accent: "bg-accent text-accent-foreground rounded-md hover:brightness-105",
        icon: "size-8 rounded-md text-faint hover:text-foreground hover:bg-hover",
      },
      size: {
        sm: "h-9 px-3 text-[14px]",
        md: "h-[41px] px-4 text-[15px] tracking-[0.15px]",
        lg: "h-12 px-5 text-[15px] tracking-[0.15px]",
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
