import { ChevronDown, ChevronRight, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  LEAD_STATUS,
  LEAD_STATUS_LABEL,
  type LeadStatus,
} from "../types/leads.types";

type Props = {
  current: LeadStatus;
  onChange: (status: LeadStatus) => void;
  label?: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "secondary";
  align?: "start" | "end";
};

function neighbors(current: LeadStatus) {
  const idx = LEAD_STATUS.indexOf(current);
  return {
    prev: idx > 0 ? LEAD_STATUS[idx - 1] : undefined,
    next: idx >= 0 && idx < LEAD_STATUS.length - 1 ? LEAD_STATUS[idx + 1] : undefined,
  };
}

export function LeadStatusMenu({
  current,
  onChange,
  label = "Estágio",
  size = "sm",
  variant = "outline",
  align = "end",
}: Props) {
  const { prev, next } = neighbors(current);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <ChevronsUpDown className="h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>Mover estágio</DropdownMenuLabel>
        <DropdownMenuItem
          disabled={!next}
          onSelect={() => next && onChange(next)}
          className="gap-2"
        >
          <ChevronRight className="h-4 w-4" />
          Avançar {next ? `→ ${LEAD_STATUS_LABEL[next]}` : ""}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!prev}
          onSelect={() => prev && onChange(prev)}
          className="gap-2"
        >
          <ChevronDown className="h-4 w-4 rotate-90" />
          Voltar {prev ? `→ ${LEAD_STATUS_LABEL[prev]}` : ""}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Escolher estágio
        </DropdownMenuLabel>
        {LEAD_STATUS.map((s) => (
          <DropdownMenuItem
            key={s}
            disabled={s === current}
            onSelect={() => onChange(s)}
            className={s === current ? "font-medium" : ""}
          >
            {LEAD_STATUS_LABEL[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
