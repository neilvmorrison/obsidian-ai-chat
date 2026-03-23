import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "chat:flex chat:min-h-[60px] chat:w-full chat:rounded-md chat:border chat:border-border chat:bg-transparent chat:px-3 chat:py-2 chat:text-sm chat:shadow-sm placeholder:chat:text-muted-foreground focus-visible:chat:outline-none focus-visible:chat:ring-1 focus-visible:chat:ring-ring disabled:chat:cursor-not-allowed disabled:chat:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
