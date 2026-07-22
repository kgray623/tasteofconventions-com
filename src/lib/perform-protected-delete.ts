import { deleteProtectedRow, type ProtectedDeleteInput } from "@/lib/protected-delete.functions";
import { toast } from "sonner";

export type PerformDeleteArgs = {
  table: ProtectedDeleteInput["table"];
  column?: ProtectedDeleteInput["column"];
  value: string;
  targetLabel: string;
  confirmMessage?: string;
};

/**
 * Ask the admin for a written reason (>=5 chars) and call the guarded
 * server function that runs the delete inside a session-authorized transaction.
 *
 * Returns true when the delete succeeded, false when cancelled or blocked.
 */
export async function performProtectedDelete(args: PerformDeleteArgs): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const promptText =
    args.confirmMessage ??
    `Deleting: ${args.targetLabel}\n\nWhy are you deleting this? (required, at least 5 characters)\n\nThis will be logged with your name and can be restored from Recently Deleted.`;

  const reasonRaw = window.prompt(promptText, "");
  if (reasonRaw === null) return false;
  const reason = reasonRaw.trim();
  if (reason.length < 5) {
    toast.error("Delete cancelled — a reason of at least 5 characters is required.");
    return false;
  }

  try {
    await deleteProtectedRow({
      data: {
        table: args.table,
        column: args.column ?? "id",
        value: args.value,
        reason,
      },
    });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    toast.error("Couldn't delete", { description: msg });
    return false;
  }
}
