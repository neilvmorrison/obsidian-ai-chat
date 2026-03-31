import { memo, useMemo } from "react";

interface ITokenUsageBarProps {
  tokenUsage: number;
  tokenLimit: number;
}

function formatTokens(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${parseFloat(k.toFixed(1))}k`;
  }
  return String(n);
}

export const TokenUsageBar = memo(function TokenUsageBar({ tokenUsage, tokenLimit }: ITokenUsageBarProps) {
  const pct = useMemo(() => Math.min((tokenUsage / tokenLimit) * 100, 100), [tokenUsage, tokenLimit]);

  const barColor =
    pct < 50
      ? "chat:bg-green-500"
      : pct <= 75
        ? "chat:bg-orange-500"
        : "chat:bg-red-500";

  return (
    <div className="chat:flex chat:items-center chat:gap-2 chat:px-3 chat:py-1.5">
      <div className="chat:flex-1 chat:h-1.5 chat:rounded-full chat:bg-muted chat:overflow-hidden">
        <div
          className={`chat:h-full chat:rounded-full chat:transition-all chat:duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="chat:text-xs chat:text-muted-foreground chat:tabular-nums chat:shrink-0">
        {formatTokens(tokenUsage)}/{formatTokens(tokenLimit)}
      </span>
    </div>
  );
});
