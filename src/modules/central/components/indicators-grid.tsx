import { CheckCircle2, Clock, Flag, Headphones, Megaphone, MessageSquare, Rocket, Target, Video } from "lucide-react";

import { KpiCard } from "@/components/common/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";

import { useIndicators } from "../hooks/use-central";

export function IndicatorsGrid() {
  const { data, isLoading } = useIndicators();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Para agora", value: data.paraAgora, hint: "Urgentes e alta prioridade", icon: <Flag className="h-4 w-4" /> },
    { label: "Atrasadas", value: data.atrasadas, hint: "Prazo vencido", icon: <Clock className="h-4 w-4" /> },
    { label: "Aguardando retorno", value: data.aguardandoRetorno, hint: "Você espera resposta", icon: <MessageSquare className="h-4 w-4" /> },
    { label: "Homologações", value: data.homologacoes, hint: "Para aprovar", icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Leads para contatar", value: data.leadsParaContatar, hint: `${data.followupsAtrasados} vencidos`, icon: <Target className="h-4 w-4" /> },
    { label: "Projetos ativos", value: data.projetosAtivos, hint: "Com pendências", icon: <Rocket className="h-4 w-4" /> },
    { label: "Videoaulas", value: data.videosPendentes, hint: "A produzir", icon: <Video className="h-4 w-4" /> },
    { label: "Conteúdo/Marketing", value: data.postsPendentes, hint: "Posts abertos", icon: <Megaphone className="h-4 w-4" /> },
    { label: "Chamados", value: data.chamados, hint: "Suporte aberto", icon: <Headphones className="h-4 w-4" /> },
    { label: "Tarefas abertas", value: data.tarefasAbertas, hint: "Total geral", icon: <Flag className="h-4 w-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {cards.map((c) => (
        <KpiCard key={c.label} label={c.label} value={String(c.value)} hint={c.hint} icon={c.icon} />
      ))}
    </div>
  );
}
