import { useMemo, useState } from "react";
import { Check, ExternalLink, Instagram, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCreateLead, useLeads } from "../hooks/use-leads";
import { qualifyProspect } from "../services/prospect-qualification";
import type { Lead, LeadInput } from "../types/leads.types";

type GooglePlace = { placeId: string; name: string; address?: string; phone?: string; website?: string; googleMapsUrl?: string; rating?: number; userRatingCount?: number; types: string[] };
type Enrichment = { whatsapp?: string; instagram?: string; phone?: string };
type PlacesResponse = { places?: GooglePlace[]; nextPageToken?: string; error?: string };

function normalizeUrl(value?: string) { if (!value) return undefined; return /^https?:\/\//i.test(value) ? value : `https://${value}`; }
function domainOf(value?: string) { try { return value ? new URL(normalizeUrl(value)!).hostname.replace(/^www\./, "").toLowerCase() : ""; } catch { return ""; } }
function normalizeContact(value?: string) { return (value ?? "").replace(/\D/g, ""); }
function existingPlaceId(lead: Lead) { const fields = lead.custom_fields; return typeof fields?.google_place_id === "string" ? fields.google_place_id : ""; }
function leadMatches(place: GooglePlace, contacts: Enrichment, lead: Lead) {
  const domain = domainOf(place.website);
  const phone = normalizeContact(place.phone || contacts.phone);
  const whatsapp = normalizeContact(contacts.whatsapp);
  if (place.placeId && existingPlaceId(lead) === place.placeId) return true;
  if (domain && domainOf(lead.site) === domain) return true;
  const leadPhone = normalizeContact(lead.whatsapp || lead.telefone);
  return Boolean((phone && leadPhone && phone === leadPhone) || (whatsapp && leadPhone && whatsapp === leadPhone));
}
function isDuplicate(place: GooglePlace, leads: Lead[]) { return leads.some((lead) => leadMatches(place, {}, lead)); }

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export function GooglePlacesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [category, setCategory] = useState("hotéis e pousadas");
  const [location, setLocation] = useState("");
  const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [selected, setSelected] = useState<string[]>([]);
  const [enrichment, setEnrichment] = useState<Record<string, Enrichment>>({});
  const [enrichingIds, setEnrichingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [adding, setAdding] = useState(false);
  const { data: leads = [] } = useLeads();
  const createLead = useCreateLead();

  const duplicateIds = useMemo(() => new Set(places.filter((place) => isDuplicate(place, leads)).map((place) => place.placeId)), [places, leads]);
  const availablePlaces = useMemo(() => places.filter((place) => !duplicateIds.has(place.placeId)), [places, duplicateIds]);
  const qualifications = useMemo(() => new Map(places.map((place) => {
    const contacts = enrichment[place.placeId] ?? {};
    return [place.placeId, qualifyProspect({ website: place.website, phone: place.phone || contacts.phone, whatsapp: contacts.whatsapp, instagram: contacts.instagram, rating: place.rating, userRatingCount: place.userRatingCount })];
  })), [places, enrichment]);

  function toggle(placeId: string) { if (duplicateIds.has(placeId)) return; setSelected((current) => current.includes(placeId) ? current.filter((id) => id !== placeId) : [...current, placeId]); }

  async function requestPlaces(pageToken?: string) {
    const target = location.trim(); const segment = category.trim();
    if (!target) return toast.error("Informe a cidade ou região.");
    if (!segment) return toast.error("Informe o segmento que deseja pesquisar.");
    const { data: sessionData } = await supabase.auth.getSession(); const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sua sessão expirou. Entre novamente no Growth OS.");
    const response = await fetch("/api/prospeccao/google-places", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ textQuery: `${segment} em ${target}`, pageSize: 20, ...(pageToken ? { pageToken } : {}) }) });
    const body = (await response.json()) as PlacesResponse;
    if (!response.ok) throw new Error(body.error ?? "Não foi possível pesquisar no Google Maps.");
    return body;
  }

  async function enrich(place: GooglePlace): Promise<Enrichment> {
    const website = normalizeUrl(place.website); if (!website) return {};
    try {
      const { data: sessionData } = await supabase.auth.getSession(); const token = sessionData.session?.access_token;
      if (!token) return {};
      const response = await fetch("/api/prospeccao/enrich-website", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ website }) });
      if (!response.ok) return {};
      const body = (await response.json()) as { contacts?: Enrichment };
      return body.contacts ?? {};
    } catch { return {}; }
  }

  async function enrichVisiblePlaces(targetPlaces: GooglePlace[]) {
    const candidates = targetPlaces.filter((place) => !duplicateIds.has(place.placeId) && place.website && !enrichment[place.placeId]);
    if (!candidates.length) return;
    const ids = candidates.map((place) => place.placeId);
    setEnrichingIds((current) => Array.from(new Set([...current, ...ids])));
    try {
      const results = await mapWithConcurrency(candidates, 4, async (place) => [place.placeId, await enrich(place)] as const);
      const found: Record<string, Enrichment> = Object.fromEntries(results);
      setEnrichment((current) => ({ ...current, ...found }));
    } finally {
      setEnrichingIds((current) => current.filter((id) => !ids.includes(id)));
    }
  }

  async function search() {
    setLoading(true);
    try {
      const body = await requestPlaces();
      const newPlaces = body.places ?? [];
      setPlaces(newPlaces); setNextPageToken(body.nextPageToken); setSelected([]); setEnrichment({});
      if (!newPlaces.length) toast.info("Nenhum estabelecimento encontrado para essa busca.");
      else void enrichVisiblePlaces(newPlaces);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao pesquisar."); } finally { setLoading(false); }
  }

  async function loadMore() {
    if (!nextPageToken || loadingMore || loading || adding) return;
    setLoadingMore(true);
    try {
      const body = await requestPlaces(nextPageToken);
      const existingIds = new Set(places.map((place) => place.placeId));
      const newPlaces = (body.places ?? []).filter((place) => !existingIds.has(place.placeId));
      setPlaces((current) => [...current, ...newPlaces]);
      setNextPageToken(body.nextPageToken);
      if (newPlaces.length) void enrichVisiblePlaces(newPlaces);
      else if (!body.nextPageToken) toast.info("Não há mais resultados para essa busca.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao carregar mais resultados."); } finally { setLoadingMore(false); }
  }

  async function addSelected() {
    const chosen = places.filter((place) => selected.includes(place.placeId) && !duplicateIds.has(place.placeId));
    if (!chosen.length || adding) return;
    setAdding(true); let created = 0; let failed = 0; let enrichedCount = 0; let skippedAfterEnrichment = 0;
    try {
      const missing = chosen.filter((place) => place.website && !enrichment[place.placeId]);
      const results = missing.length ? await mapWithConcurrency(missing, 4, async (place) => [place.placeId, await enrich(place)] as const) : [];
      const found: Record<string, Enrichment> = { ...enrichment, ...Object.fromEntries(results) };
      setEnrichment(found);
      enrichedCount = chosen.filter((place) => { const item = found[place.placeId]; return Boolean(item?.whatsapp || item?.instagram || item?.phone); }).length;

      const pending: Array<{ place: GooglePlace; contacts: Enrichment }> = [];
      for (const place of chosen) {
        const contacts = found[place.placeId] ?? {};
        const duplicateAfterEnrichment = leads.some((lead) => leadMatches(place, contacts, lead)) || pending.some((item) => leadMatches(place, contacts, item.place));
        if (duplicateAfterEnrichment) { skippedAfterEnrichment += 1; continue; }
        pending.push({ place, contacts });
      }

      for (const { place, contacts } of pending) {
        const website = normalizeUrl(place.website);
        const qualification = qualifyProspect({ website, phone: place.phone || contacts.phone, whatsapp: contacts.whatsapp, instagram: contacts.instagram, rating: place.rating, userRatingCount: place.userRatingCount });
        const input: LeadInput = {
          nome_empresa: place.name, status: "novo_lead", origem: "google_maps", responsavel: "", telefone: place.phone || contacts.phone,
          whatsapp: contacts.whatsapp, instagram: contacts.instagram, site: website, observacoes: place.address,
          segmento: category.trim() || "Hotel e Pousada",
          custom_fields: { google_place_id: place.placeId, google_maps_url: place.googleMapsUrl ?? "", google_rating: place.rating?.toString() ?? "", google_reviews: place.userRatingCount?.toString() ?? "", google_types: place.types.join(", "), google_website_domain: domainOf(website), phone_enriched_from_website: Boolean(contacts.phone && !place.phone), prospeccao_score: qualification.score, prospeccao_prioridade: qualification.label, prospeccao_score_motivos: qualification.reasons.join(" · ") },
        };
        try { await createLead.mutateAsync(input); created += 1; } catch { failed += 1; }
      }
    } finally { setAdding(false); }
    if (created) toast.success(`${created} prospect${created === 1 ? " foi adicionado" : "s foram adicionados"} ao Growth${enrichedCount ? ` · ${enrichedCount} com contato público encontrado` : ""}.`);
    if (skippedAfterEnrichment) toast.info(`${skippedAfterEnrichment} prospect${skippedAfterEnrichment === 1 ? " foi ignorado" : "s foram ignorados"} por duplicidade encontrada no enriquecimento.`);
    if (failed) toast.warning(`${failed} prospect${failed === 1 ? " não pôde ser adicionado" : "s não puderam ser adicionados"}.`);
    if (created === chosen.length - skippedAfterEnrichment) { setSelected([]); onOpenChange(false); }
  }

  const allSelected = availablePlaces.length > 0 && availablePlaces.every((place) => selected.includes(place.placeId));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden"><DialogHeader><DialogTitle>Encontrar prospects no Google Maps</DialogTitle><DialogDescription>Pesquise empresas por segmento e localização. O Growth analisa automaticamente o site público para encontrar WhatsApp, Instagram e telefone e indica a prioridade de prospecção antes do cadastro.</DialogDescription></DialogHeader>
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"><div className="space-y-2"><Label htmlFor="google-category">Categoria</Label><Input id="google-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: hotéis e pousadas" /></div><div className="space-y-2"><Label htmlFor="google-location">Cidade ou região</Label><Input id="google-location" value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="Ex.: Guarapari - ES" /></div><Button onClick={() => void search()} disabled={loading || loadingMore || adding} className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Buscar</Button></div>
    {places.length > 0 ? <div className="min-h-0 overflow-y-auto rounded-md border"><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3"><label className="flex items-center gap-3 text-sm font-medium"><Checkbox checked={allSelected} onCheckedChange={(checked) => setSelected(checked ? availablePlaces.map((p) => p.placeId) : [])} />Selecionar disponíveis</label><div className="flex items-center gap-2"><Badge variant="secondary">{selected.length} selecionado{selected.length === 1 ? "" : "s"}</Badge>{enrichingIds.length ? <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Analisando {enrichingIds.length} site{enrichingIds.length === 1 ? "" : "s"}</Badge> : null}{duplicateIds.size ? <Badge variant="outline">{duplicateIds.size} já cadastrado{duplicateIds.size === 1 ? "" : "s"}</Badge> : null}</div></div>
      <div className="divide-y">{places.map((place) => { const duplicate = duplicateIds.has(place.placeId); const checked = selected.includes(place.placeId); const contacts = enrichment[place.placeId] ?? {}; const displayPhone = place.phone || contacts.phone; const enriching = enrichingIds.includes(place.placeId); const qualification = qualifications.get(place.placeId); return <div key={place.placeId} className={`flex gap-3 px-4 py-3 ${duplicate ? "opacity-60" : ""}`}><Checkbox className="mt-1" checked={checked} disabled={duplicate || adding} onCheckedChange={() => toggle(place.placeId)} /><div className="min-w-0 flex-1 space-y-1"><div className="flex flex-wrap items-center gap-2"><button type="button" className="text-left font-medium hover:underline" onClick={() => toggle(place.placeId)} disabled={duplicate || adding}>{place.name}</button>{qualification ? <Badge variant={qualification.score >= 65 ? "default" : "outline"}>{qualification.score >= 65 ? "🔥 " : ""}{qualification.label} · {qualification.score}</Badge> : null}{place.rating ? <Badge variant="outline">★ {place.rating.toFixed(1)}{place.userRatingCount ? ` · ${place.userRatingCount}` : ""}</Badge> : null}{duplicate ? <Badge variant="secondary">Já cadastrado</Badge> : null}</div>{place.address ? <div className="flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{place.address}</div> : null}<div className="flex flex-wrap items-center gap-3 text-sm">{displayPhone ? <a className="hover:underline" href={`tel:${normalizeContact(displayPhone)}`}>{displayPhone}{contacts.phone && !place.phone ? " · site" : ""}</a> : null}{contacts.whatsapp ? <a className="font-medium text-primary hover:underline" href={contacts.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a> : null}{contacts.instagram ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={contacts.instagram} target="_blank" rel="noreferrer"><Instagram className="h-3 w-3" />Instagram</a> : null}{enriching ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />analisando contatos</span> : null}{place.website ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={normalizeUrl(place.website)} target="_blank" rel="noreferrer">Site <ExternalLink className="h-3 w-3" /></a> : null}{place.googleMapsUrl ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={place.googleMapsUrl} target="_blank" rel="noreferrer">Maps <ExternalLink className="h-3 w-3" /></a> : null}</div></div></div>; })}</div>
      {nextPageToken ? <div className="flex justify-center border-t p-3"><Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore || adding} className="gap-2">{loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{loadingMore ? "Carregando..." : "Carregar mais resultados"}</Button></div> : null}
    </div> : null}
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={adding || loadingMore}>Cancelar</Button><Button onClick={() => void addSelected()} disabled={selected.length === 0 || adding || loadingMore} className="gap-2">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Adicionar selecionados ({selected.length})</Button></DialogFooter></DialogContent></Dialog>;
}