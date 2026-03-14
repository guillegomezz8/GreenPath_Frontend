import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/components/Utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-hero text-primary-foreground hover:shadow-green",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  const classNameString = typeof className === "string" ? className : "";
  const hasCustomBg = /\bbg-[^\s]+/.test(classNameString);
  const hasCustomHoverBg = /\bhover:bg-[^\s]+/.test(classNameString);
  const resolvedVariant = hasCustomBg ? "outline" : variant;
  const resolvedClassName = hasCustomBg && !hasCustomHoverBg
    ? cn(classNameString, "hover:opacity-90")
    : className;

  return (
    <div className={cn(badgeVariants({ variant: resolvedVariant }), resolvedClassName)} {...props} />
  );
}

export { Badge, badgeVariants };
