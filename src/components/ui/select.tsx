import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = forwardRef<
  ElementRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "chat:flex chat:h-9 chat:w-full chat:items-center chat:justify-between chat:whitespace-nowrap chat:rounded-md chat:border chat:border-border chat:bg-transparent chat:px-3 chat:py-2 chat:text-sm chat:shadow-sm chat:ring-offset-background placeholder:chat:text-muted-foreground focus:chat:outline-none focus:chat:ring-1 focus:chat:ring-ring disabled:chat:cursor-not-allowed disabled:chat:opacity-50 [&>span]:chat:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="chat:h-4 chat:w-4 chat:opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = forwardRef<
  ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "chat:flex chat:cursor-default chat:items-center chat:justify-center chat:py-1",
      className,
    )}
    {...props}
  >
    <ChevronUp className="chat:h-4 chat:w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = forwardRef<
  ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "chat:flex chat:cursor-default chat:items-center chat:justify-center chat:py-1",
      className,
    )}
    {...props}
  >
    <ChevronDown className="chat:h-4 chat:w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = forwardRef<
  ElementRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "chat:relative chat:z-50 chat:max-h-96 chat:min-w-32 chat:overflow-hidden chat:rounded-md chat:border chat:border-border chat:bg-popover chat:text-popover-foreground chat:shadow-md",
        position === "popper" &&
          "data-[side=bottom]:chat:translate-y-1 data-[side=left]:chat:-translate-x-1 data-[side=right]:chat:translate-x-1 data-[side=top]:chat:-translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "chat:p-1",
          position === "popper" &&
            "chat:h-(--radix-select-trigger-height) chat:w-full chat:min-w-(--radix-select-trigger-width)",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = forwardRef<
  ElementRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "chat:relative chat:flex chat:w-full chat:cursor-default chat:select-none chat:items-center chat:rounded-sm chat:py-1.5 chat:pl-2 chat:pr-8 chat:text-sm chat:outline-none focus:chat:bg-muted focus:chat:text-foreground data-[disabled]:chat:pointer-events-none data-[disabled]:chat:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="chat:absolute chat:right-2 chat:flex chat:h-3.5 chat:w-3.5 chat:items-center chat:justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="chat:h-4 chat:w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = forwardRef<
  ElementRef<typeof SelectPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("chat:-mx-1 chat:my-1 chat:h-px chat:bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectSeparator,
};
