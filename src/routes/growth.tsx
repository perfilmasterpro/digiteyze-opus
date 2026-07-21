import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutDashboard, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/growth")({
  head: () => ({ meta: [{ title: "Growth — Growth OS" }] }),
  component: GrowthIndex,
});

function GrowthIndex() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Growth"
        description="Centro operacional de aquisição — metas, indicadores e prospecção."
        icon={<Sparkles className="h-5 w-5" />}
        actions={
          <Button asChild size="sm" className="gap-2">
            <Link to="/growth/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Abrir dashboard
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Acesse o <Link to="/growth/dashboard" className="text-primary hover:underline">dashboard comercial</Link>{" "}
          para KPIs de leads, contatos, propostas e pipeline financeiro. A gestão de leads acontece no
          {" "}<Link to="/prospeccao" className="text-primary hover:underline">módulo de Prospecção</Link>.
        </CardContent>
      </Card>
    </div>
  );
}
