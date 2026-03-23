import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModelSelectorProps {
  model: string;
  onModelChange: (model: string) => void;
  availableModels: string[];
}

export function ModelSelector({
  model,
  onModelChange,
  availableModels,
}: ModelSelectorProps) {
  return (
    <Select value={model} onValueChange={onModelChange}>
      <SelectTrigger className="chat:h-7 chat:w-auto chat:min-w-0 chat:gap-1 chat:border-0 chat:bg-transparent chat:px-2 chat:text-xs chat:text-muted-foreground chat:shadow-none focus:chat:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableModels.map((m) => (
          <SelectItem key={m} value={m}>
            {m}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
