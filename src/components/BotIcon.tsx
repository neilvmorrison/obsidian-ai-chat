import { BotMessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface BotIconProps {
  className?: string;
}

export function BotIcon({ className }: BotIconProps) {
  return (
    <BotMessageSquare
      className={cn("chat:h-10 chat:w-10 chat:text-[#3b82f6]", className)}
    />
  );
}
