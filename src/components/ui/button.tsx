import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "chat:inline-flex chat:items-center chat:justify-center chat:gap-2 chat:whitespace-nowrap chat:rounded-md chat:text-sm chat:font-medium chat:transition-colors focus-visible:chat:outline-none focus-visible:chat:ring-1 focus-visible:chat:ring-ring disabled:chat:pointer-events-none disabled:chat:opacity-50 [&_svg]:chat:pointer-events-none [&_svg]:chat:size-4 [&_svg]:chat:shrink-0",
  {
    variants: {
      variant: {
        default:
          "chat:bg-primary chat:text-primary-foreground chat:shadow hover:chat:bg-primary/90",
        destructive:
          "chat:bg-destructive chat:text-destructive-foreground chat:shadow-sm hover:chat:bg-destructive/90",
        outline:
          "chat:border chat:border-border chat:bg-background chat:shadow-sm hover:chat:bg-muted hover:chat:text-foreground",
        secondary:
          "chat:bg-secondary chat:text-secondary-foreground chat:shadow-sm hover:chat:bg-secondary/80",
        ghost:
          "hover:chat:bg-muted hover:chat:text-foreground",
        link: "chat:text-primary chat:underline-offset-4 hover:chat:underline",
      },
      size: {
        default: "chat:h-9 chat:px-4 chat:py-2",
        sm: "chat:h-8 chat:rounded-md chat:px-3 chat:text-xs",
        lg: "chat:h-10 chat:rounded-md chat:px-8",
        icon: "chat:h-9 chat:w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
