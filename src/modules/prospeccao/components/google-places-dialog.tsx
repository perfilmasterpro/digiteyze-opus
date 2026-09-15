import { useState } from "react";
import { Check, ExternalLink, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCreateLead } from "../hooks/use-leads";
import type { LeadInput } from "../types/leads.types";

type GooglePlace = {
  placeId: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  googleMapsUrl?: string;
  rating?: number;
  userRatingCount?: number;
  types: string[];
};

function normalizeUrl(value?: string) {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function GooglePlacesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [category, setCategory] = useState("hotéis e pousadas");
  const [location, setLocation] = useState("");
  const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const createLead = useCreateLead();

  function toggle(placeId: string) {
    setSelected((current) =>
      current.includes(placeId) ? current.filter((id) => id !== placeId) : [...current, placeId],
    );
  }

  async function search() {
    const target = location.trim();
    if (!target) {
      toast.error("Informe a cidade ou região.");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sua sessão expirou. Entre novamente no Growth OS.");

      const response = await fetch("/api/prospeccao/google-places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ textQuery: `${category.trim()} em ${target}`, pageSize: 20 }),
      });
      const body = (await response.json()) as { places?: GooglePlace[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível pesquisar no Google Maps.");

      setPlaces(body.places ?? []);
      setSelected([]);
      if ((body.places?.length ?? 0) === 0) toast.info("Nenhum estabelecimento encontrado para essa busca.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao pesquisar.");
    } finally {
      setLoading(false);
    }
  }

  async function addSelected() {
    const chosen = places.filter((place) => selected.includes(place.placeId));
    if (!chosen.length) return;

    let created = 0;
    let failed = 0;

    for (const place of chosen) {
      const input: LeadInput = {
        nome_empresa: place.name,
        status: "novo_lead",
        origem: "google_maps",
        responsavel: "",
        telefone: place.phone,
        site: normalizeUrl(place.website),
        observacoes: place.address,
        segmento: "Hotel e Pousada",
        custom_fields: {
          google_place_id: place.placeId,
          google_maps_url: place.googleMapsUrl ?? "",
          google_rating: place.rating?.toString() ?? "",
          google_reviews: place.userRatingCount?.toString() ?? "",
          google_types: place.types.join(", "),
        },
      };

      try {
        await createLead.mutateAsync(input);
        created += 1;
      } catch {
        failed += 1;
      }
    }

    if (created) toast.success(`${created} prospect${created === 1 ? " foi adicionado" : "s foram adicionados"} ao Growth.`);
    if (failed) toast.warning(`${failed} prospect${failed === 1 ? " não pôde ser adicionado" : "s não puderam ser adicionados"}.`);
    if (created === chosen.length) {
      setSelected([]);
      onOpenChange(false);
    }
  }

  const allSelected = places.length > 0 && selected.length === places.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Encontrar prospects no Google Maps</DialogTitle>
          <DialogDescription>
            Pesquise empresas por segmento e localização. Escolha quais quer trazer para o pipeline de Prospecção.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="google-category">Categoria</Label>
            <Input id="google-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: hotéis e pousadas" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="google-location">Cidade ou região</Label>
            <Input id="google-location" value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Ex.: Guarapari - ES" />
          </div>
          <Button onClick={search} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </Button>
        </div>

        {places.length > 0 ? (
          <div className="min-h-0 overflow-y-auto rounded-md border">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
              <label className="flex items-center gap-3 text-sm font-medium">
                <Checkbox checked={allSelected} onCheckedChange={(checked) => setSelected(checked ? places.map((p) => p.placeId) : [])} />
                Selecionar todos
              </label>
              <Badge variant="secondary">{selected.length} selecionado{selected.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="divide-y">
              {places.map((place) => {
                const checked = selected.includes(place.placeId);
                return (
                  <div key={place.placeId} className="flex gap-3 px-4 py-3">
                    <Checkbox className="mt-1" checked={checked} onCheckedChange={() => toggle(place.placeId)} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="text-left font-medium hover:underline" onClick={() => toggle(place.placeId)}>
                          {place.name}
                        </button>
                        {place.rating ? <Badge variant="outline">★ {place.rating.toFixed(1)}{place.userRatingCount ? ` · ${place.userRatingCount}` : ""}</Badge> : null}
                      </div>
                      {place.address ? <div className="flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{place.address}</div> : null}
                      <div className="flex flex-wrap gap-3 text-sm">
                        {place.phone ? <span>{place.phone}</span> : null}
                        {place.website ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={normalizeUrl(place.website)} target="_blank" rel="noreferrer">Site <ExternalLink className="h-3 w-3" /></a> : null}
                        {place.googleMapsUrl ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={place.googleMapsUrl} target="_blank" rel="noreferrer">Maps <ExternalLink className="h-3 w-3" /></a> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={addSelected} disabled={selected.length === 0 || createLead.isPending} className="gap-2">
            {createLead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Adicionar selecionados ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
