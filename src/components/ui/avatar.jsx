import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/components/Utils";

const Avatar = React.forwardRef(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8", 
    default: "h-10 w-10 sm:h-12 sm:w-12",
    lg: "h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16",
    xl: "h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24",
  };

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef(({ className, size = "default", ...props }, ref) => {
  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-xs",
    default: "text-sm sm:text-base",
    lg: "text-base sm:text-lg lg:text-xl", 
    xl: "text-lg sm:text-xl lg:text-2xl",
  };

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium",
        textSizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };