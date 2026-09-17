import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/prospeccao/follow-up")({
  component: () => <div className="p-6">Follow-up</div>,
});
