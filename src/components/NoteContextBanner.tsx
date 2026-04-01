import { memo, useCallback } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useObsidianApp } from "@/contexts/ObsidianAppContext";

interface INoteContextBannerProps {
  filename: string;
  filePath: string;
}

export const NoteContextBanner = memo(function NoteContextBanner({
  filename,
  filePath,
}: INoteContextBannerProps) {
  const app = useObsidianApp();

  const handleOpen = useCallback(() => {
    app.workspace.openLinkText(filePath, "", false);
  }, [app, filePath]);

  const displayName = filename || filePath || "Untitled";

  return (
    <div className="chat:px-3 chat:py-2 chat:border-b chat:border-border">
      <Button
        size="sm"
        onClick={handleOpen}
        className="chat:bg-[#A7F3D0] chat:text-[#065F46] hover:chat:bg-[#6EE7B7] chat:border-0 chat:shadow-none chat:font-normal chat:h-auto chat:py-1 chat:px-2"
      >
        <FileText className="chat:size-3.5 chat:shrink-0" />
        <span className="chat:text-xs">In reference to: <strong>{displayName}</strong></span>
      </Button>
    </div>
  );
});
