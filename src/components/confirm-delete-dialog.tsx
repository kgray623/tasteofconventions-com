import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  targetLabel?: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Delete this record?",
  description,
  targetLabel,
  confirmLabel = "Delete",
  busy,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const disabled = busy || trimmed.length < 5;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setReason("");
        onOpenChange(v);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              {targetLabel && (
                <div className="rounded border bg-muted/50 px-2 py-1 font-medium text-ink">
                  {targetLabel}
                </div>
              )}
              {description ?? (
                <span>
                  This will be logged with your name and can be restored from{" "}
                  <strong>Recently Deleted</strong>. A written reason is required.
                </span>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1">
          <Label htmlFor="delete-reason" className="text-xs">
            Why are you deleting this? (required, min 5 chars)
          </Label>
          <Textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate row from CSV upload"
            rows={3}
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={disabled}
            onClick={(e) => {
              e.preventDefault();
              if (disabled) return;
              void onConfirm(trimmed);
            }}
          >
            {busy ? "Deleting…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
