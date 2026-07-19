import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getCommitteeRoster } from "@/lib/invitations.functions";

type Member = { id: string; name: string };

export function CommitteePicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (name: string) => void;
  id?: string;
}) {
  const load = useServerFn(getCommitteeRoster);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await load();
        if (alive) setMembers(res.members ?? []);
      } catch {
        if (alive) setMembers([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const selected = members.find((m) => m.name.toLowerCase() === value.trim().toLowerCase());
  const hasStaleValue = value.trim().length > 0 && !selected && !loading;

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 text-left font-normal"
          >
            <span className={cn(!selected && "text-muted-foreground")}>
              {selected
                ? selected.name
                : loading
                  ? "Loading committee members…"
                  : "Select the committee member who invited you"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search committee members…" />
            <CommandList>
              <CommandEmpty>No committee member found.</CommandEmpty>
              <CommandGroup>
                {members.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.name}
                    onSelect={() => {
                      onChange(m.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected?.id === m.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {m.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {hasStaleValue && (
        <p className="text-xs text-terracotta">
          "{value}" isn't on the committee list — please pick a committee member.
        </p>
      )}
    </div>
  );
}
