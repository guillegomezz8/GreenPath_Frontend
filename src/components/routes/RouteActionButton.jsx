import { Button } from "@/components/ui/button";
import { cn } from "@/components/Utils";

const TONE_CONFIG = {
  primary: {
    variant: "hero",
    className: "h-10 rounded-2xl px-4 shadow-green",
  },
  secondary: {
    variant: "outline",
    className: "h-10 rounded-2xl border-border/80 bg-background/95 px-4 text-foreground hover:bg-accent/60 hover:text-foreground",
  },
  accent: {
    variant: "success",
    className: "h-10 rounded-2xl px-4 shadow-elegant",
  },
  danger: {
    variant: "destructive",
    className: "h-10 rounded-2xl px-4",
  },
};

export default function RouteActionButton({
  tone = "secondary",
  icon: Icon,
  className,
  children,
  ...props
}) {
  const config = TONE_CONFIG[tone] || TONE_CONFIG.secondary;

  return (
    <Button
      variant={config.variant}
      className={cn("gap-2", config.className, className)}
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </Button>
  );
}
