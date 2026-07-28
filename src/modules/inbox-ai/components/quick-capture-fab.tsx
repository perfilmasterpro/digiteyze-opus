import { useEffect, useState } from "react";
import { Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CaptureDialog } from "@/modules/inbox-ai/components/capture-dialog";

/**
 * Botão flutuante de captura rápida (atalho global: tecla "C").
 */
export function QuickCaptureFab() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "c" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        aria-label="Captura rápida (tecla C)"
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg"
      >
        <Mic className="size-6" aria-hidden />
      </Button>
      <CaptureDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
