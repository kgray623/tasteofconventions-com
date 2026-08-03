import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copyText, downloadTextFile, openTextInNewTab } from "@/lib/download-file";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
  text: string;
  title?: string;
};

/**
 * Shown when the browser refuses a file download (common on phones inside a
 * framed preview). Always gives a way to get the data out: copy, open in a new
 * tab to long-press/share, or try the download again.
 */
export function ExportFallbackDialog({
  open,
  onOpenChange,
  filename,
  text,
  title = "Your report is ready",
}: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription>
            Your browser wouldn't save the file directly. Copy the report below, or open it in a new
            tab to save or share it from your phone.
          </DialogDescription>
        </DialogHeader>

        <Textarea readOnly value={text} rows={10} className="font-mono text-xs" />

        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-pink-500 text-white hover:bg-pink-600"
            onClick={async () => {
              const res = await copyText(text);
              if (res.ok) {
                setCopied(true);
                toast.success("Report copied — paste it anywhere");
              } else {
                toast.error("Couldn't copy", { description: res.reason });
              }
            }}
          >
            <Copy className="w-4 h-4 mr-1.5" /> {copied ? "Copied" : "Copy report"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const res = openTextInNewTab(text);
              if (!res.ok) toast.error("Couldn't open a new tab", { description: res.reason });
            }}
          >
            <ExternalLink className="w-4 h-4 mr-1.5" /> Open in new tab
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const res = downloadTextFile(filename, text);
              if (res.ok) toast.success("Download started");
              else toast.error("Download blocked", { description: res.reason });
            }}
          >
            <Download className="w-4 h-4 mr-1.5" /> Try download again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
