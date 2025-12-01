import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        /* Mobile-first: touch-friendly 44px minimum height */
        default: "min-h-[2.75rem] px-[1rem] py-[0.5rem] gap-[0.5rem] text-base sm:min-h-[2.5rem] sm:text-sm [&_svg]:size-[1.25rem] sm:[&_svg]:size-[1rem]",
        sm: "min-h-[2.5rem] px-[0.75rem] py-[0.375rem] gap-[0.375rem] text-sm sm:min-h-[2.25rem] sm:text-xs [&_svg]:size-[1rem] sm:[&_svg]:size-[0.875rem]",
        lg: "min-h-[3rem] px-[1.5rem] py-[0.75rem] gap-[0.625rem] text-lg sm:min-h-[2.75rem] sm:text-base [&_svg]:size-[1.5rem] sm:[&_svg]:size-[1.125rem]",
        icon: "min-h-[2.75rem] min-w-[2.75rem] p-0 sm:min-h-[2.5rem] sm:min-w-[2.5rem] [&_svg]:size-[1.25rem] sm:[&_svg]:size-[1rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
