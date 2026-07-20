import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Notifications — placeholder (Fase 0).
 */
export function NotificationsPanel() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Notificações</p>
          <span className="text-xs text-muted-foreground">0 não lidas</span>
        </div>
        <div className="mt-4 rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma notificação por enquanto.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
