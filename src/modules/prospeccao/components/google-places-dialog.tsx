import { useMemo, useState } from "react";
import { Check, ExternalLink, Filter, Instagram, Loader2, MapPin, Search } from "lucide-react";
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

type GooglePlace = { placeId: string; name: string; address?: string; city?: string; state?: string; phone?: string; website?: string; googleMapsUrl?: string; rating?: number; userRatingCount?: number; types: string[] };
type Enrichment = { whatsapp?: string; instagram?: string; phone?: string };
type PlacesResponse = { places?: GooglePlace[]; nextPageToken?: string; error?: string };
type ContactFilter = "todos" | "whatsapp" | "instagram" | "telefone" | "site";
type PriorityFilter = "todas" | "alta" | "boa" | "limitada";
type StatusFilter = "disponiveis" | "todos" | "cadastrados";

function normalizeUrl(value?: string) { if (!value) return undefined; return /^https?:\/\//i.test(value) ? value : `https://${value}`; }
function domainOf(value?: string) { try { return value ? new URL(normalizeUrl(value)!).hostname.replace(/^www\./, "").toLowerCase() : ""; } catch { return ""; } }
function normalizeContact(value?: string) { return (value ?? "").replace(/\D/g, ""); }
function existingPlaceId(lead: Lead) { const fields = lead.custom_fields; return typeof fields?.google_place_id === "string" ? fields.google_place_id : ""; }
function leadMatches(place: GooglePlace, contacts: Enrichment, lead: Lead) {
  const domain = domainOf(place.website); const phone = normalizeContact(place.phone || contacts.phone); const whatsapp = normalizeContact(contacts.whatsapp);
  if (place.placeId && existingPlaceId(lead) === place.placeId) return true;
  if (domain && domainOf(lead.site) === domain) return true;
  const leadPhone = normalizeContact(lead.whatsapp || lead.telefone);
  return Boolean((phone && leadPhone && phone === leadPhone) || (whatsapp && leadPhone && whatsapp === leadPhone));
}
function isDuplicate(place: GooglePlace, leads: Lead[]) { return leads.some((lead) => leadMatches(place, {}, lead)); }
function placesMatch(a: GooglePlace, aContacts: Enrichment, b: GooglePlace, bContacts: Enrichment) {
  if (a.placeId && a.placeId === b.placeId) return true;
  const domainA = domainOf(a.website); if (domainA && domainA === domainOf(b.website)) return true;
  const phoneA = normalizeContact(a.phone || aContacts.phone || aContacts.whatsapp);
  const phoneB = normalizeContact(b.phone || bContacts.phone || bContacts.whatsapp);
  return Boolean(phoneA && phoneA === phoneB);
}
const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"] as const;
type Uf = (typeof UFS)[number];
function asUf(value?: string): Uf | undefined { const upper = (value ?? "").trim().toUpperCase(); return (UFS as readonly string[]).includes(upper) ? (upper as Uf) : undefined; }

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length); let cursor = 0;
  async function worker() { while (true) { const index = cursor++; if (index >= items.length) return; results[index] = await mapper(items[index]); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker())); return results;
}

export function GooglePlacesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [category, setCategory] = useState("hotéis e pousadas"); const [location, setLocation] = useState(""); const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(); const [selected, setSelected] = useState<string[]>([]);
  const [enrichment, setEnrichment] = useState<Record<string, Enrichment>>({}); const [enrichingIds, setEnrichingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); const [loadingMore, setLoadingMore] = useState(false); const [adding, setAdding] = useState(false);
  const [resultSearch, setResultSearch] = useState(""); const [contactFilter, setContactFilter] = useState<ContactFilter>("todos");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("todas"); const [statusFilter, setStatusFilter] = useState<StatusFilter>("disponiveis");
  const { data: leads = [] } = useLeads(); const createLead = useCreateLead();

  const duplicateIds = useMemo(() => new Set(places.filter((place) => isDuplicate(place, leads)).map((place) => place.placeId)), [places, leads]);
  const availablePlaces = useMemo(() => places.filter((place) => !duplicateIds.has(place.placeId)), [places, duplicateIds]);
  const qualifications = useMemo(() => new Map(places.map((place) => { const contacts = enrichment[place.placeId] ?? {}; return [place.placeId, qualifyProspect({ website: place.website, phone: place.phone || contacts.phone, whatsapp: contacts.whatsapp, instagram: contacts.instagram, rating: place.rating, userRatingCount: place.userRatingCount })]; })), [places, enrichment]);
  const filteredPlaces = useMemo(() => places.filter((place) => {
    const contacts = enrichment[place.placeId] ?? {}; const duplicate = duplicateIds.has(place.placeId); const qualification = qualifications.get(place.placeId);
    const text = `${place.name} ${place.address ?? ""}`.toLowerCase(); const matchesText = !resultSearch.trim() || text.includes(resultSearch.trim().toLowerCase());
    const matchesContact = contactFilter === "todos" || (contactFilter === "whatsapp" ? Boolean(contacts.whatsapp) : contactFilter === "instagram" ? Boolean(contacts.instagram) : contactFilter === "telefone" ? Boolean(place.phone || contacts.phone) : Boolean(place.website));
    const matchesPriority = priorityFilter === "todas" || (priorityFilter === "alta" ? qualification?.score === undefined ? false : qualification.score >= 65 : priorityFilter === "boa" ? qualification?.label === "Boa oportunidade" : qualification?.label === "Dados limitados");
    const matchesStatus = statusFilter === "todos" || (statusFilter === "cadastrados" ? duplicate : !duplicate);
    return matchesText && matchesContact && matchesPriority && matchesStatus;
  }), [places, enrichment, duplicateIds, qualifications, resultSearch, contactFilter, priorityFilter, statusFilter]);
  const contactCounts = useMemo(() => ({ whatsapp: places.filter((p) => Boolean(enrichment[p.placeId]?.whatsapp)).length, instagram: places.filter((p) => Boolean(enrichment[p.placeId]?.instagram)).length, telefone: places.filter((p) => Boolean(p.phone || enrichment[p.placeId]?.phone)).length, site: places.filter((p) => Boolean(p.website)).length }), [places, enrichment]);

  function toggle(placeId: string) { if (duplicateIds.has(placeId)) return; setSelected((current) => current.includes(placeId) ? current.filter((id) => id !== placeId) : [...current, placeId]); }
  async function requestPlaces(pageToken?: string) {
    const target = location.trim(); const segment = category.trim(); if (!target) throw new Error("Informe a cidade ou região."); if (!segment) throw new Error("Informe o segmento que deseja pesquisar.");
    const { data: sessionData } = await supabase.auth.getSession(); const token = sessionData.session?.access_token; if (!token) throw new Error("Sua sessão expirou. Entre novamente no Growth OS.");
    const response = await fetch("/api/prospeccao/google-places", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ textQuery: `${segment} em ${target}`, pageSize: 20, ...(pageToken ? { pageToken } : {}) }) });
    const body = (await response.json()) as PlacesResponse; if (!response.ok) throw new Error(body.error ?? "Não foi possível pesquisar no Google Maps."); return body;
  }
  async function enrich(place: GooglePlace): Promise<Enrichment> {
    const website = normalizeUrl(place.website); if (!website) return {};
    try { const { data: sessionData } = await supabase.auth.getSession(); const token = sessionData.session?.access_token; if (!token) return {};
      const response = await fetch("/api/prospeccao/enrich-website", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ website }) }); if (!response.ok) return {};
      const body = (await response.json()) as { contacts?: Enrichment }; return body.contacts ?? {};
    } catch { return {}; }
  }
  async function enrichVisiblePlaces(targetPlaces: GooglePlace[]) {
    const candidates = targetPlaces.filter((place) => !duplicateIds.has(place.placeId) && place.website && !enrichment[place.placeId]); if (!candidates.length) return;
    const ids = candidates.map((place) => place.placeId); setEnrichingIds((current) => Array.from(new Set([...current, ...ids])));
    try { const results = await mapWithConcurrency(candidates, 4, async (place) => [place.placeId, await enrich(place)] as const); setEnrichment((current) => ({ ...current, ...Object.fromEntries(results) })); }
    finally { setEnrichingIds((current) => current.filter((id) => !ids.includes(id))); }
  }
  async function search() {
    setLoading(true); try { const body = await requestPlaces(); const newPlaces = body.places ?? []; setPlaces(newPlaces); setNextPageToken(body.nextPageToken); setSelected([]); setEnrichment({}); setResultSearch("");
      if (!newPlaces.length) toast.info("Nenhum estabelecimento encontrado para essa busca."); else void enrichVisiblePlaces(newPlaces);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao pesquisar."); } finally { setLoading(false); }
  }
  async function loadMore() {
    if (!nextPageToken || loadingMore || loading || adding) return; setLoadingMore(true);
    try { const body = await requestPlaces(nextPageToken); const existingIds = new Set(places.map((place) => place.placeId)); const newPlaces = (body.places ?? []).filter((place) => !existingIds.has(place.placeId)); setPlaces((current) => [...current, ...newPlaces]); setNextPageToken(body.nextPageToken); if (newPlaces.length) void enrichVisiblePlaces(newPlaces); else if (!body.nextPageToken) toast.info("Não há mais resultados para essa busca."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Erro ao carregar mais resultados."); } finally { setLoadingMore(false); }
  }
  async function addSelected() {
    const chosen = places.filter((place) => selected.includes(place.placeId) && !duplicateIds.has(place.placeId)); if (!chosen.length || adding) return; setAdding(true); let created = 0; let failed = 0; let enrichedCount = 0; let skippedAfterEnrichment = 0;
    try { const missing = chosen.filter((place) => place.website && !enrichment[place.placeId]); const results = missing.length ? await mapWithConcurrency(missing, 4, async (place) => [place.placeId, await enrich(place)] as const) : []; const found: Record<string, Enrichment> = { ...enrichment, ...Object.fromEntries(results) }; setEnrichment(found);
      enrichedCount = chosen.filter((place) => { const item = found[place.placeId]; return Boolean(item?.whatsapp || item?.instagram || item?.phone); }).length; const pending: Array<{ place: GooglePlace; contacts: Enrichment }> = [];
      for (const place of chosen) { const contacts = found[place.placeId] ?? {}; const duplicateAfterEnrichment = leads.some((lead) => leadMatches(place, contacts, lead)) || pending.some((item) => leadMatches(place, contacts, item.place)); if (duplicateAfterEnrichment) { skippedAfterEnrichment += 1; continue; } pending.push({ place, contacts }); }
      for (const { place, contacts } of pending) { const website = normalizeUrl(place.website); const qualification = qualifyProspect({ website, phone: place.phone || contacts.phone, whatsapp: contacts.whatsapp, instagram: contacts.instagram, rating: place.rating, userRatingCount: place.userRatingCount }); const input: LeadInput = { nome_empresa: place.name, status: "novo_lead", origem: "google_maps", responsavel: "", telefone: place.phone || contacts.phone, whatsapp: contacts.whatsapp, instagram: contacts.instagram, site: website, observacoes: place.address, segmento: category.trim() || "Hotel e Pousada", cidade: place.city, estado: place.state, custom_fields: { google_place_id: place.placeId, google_maps_url: place.googleMapsUrl ?? "", google_rating: place.rating?.toString() ?? "", google_reviews: place.userRatingCount?.toString() ?? "", google_types: place.types.join(", "), google_website_domain: domainOf(website), phone_enriched_from_website: Boolean(contacts.phone && !place.phone), prospeccao_score: qualification.score, prospeccao_prioridade: qualification.label, prospeccao_score_motivos: qualification.reasons.join(" · ") } };
        try { await createLead.mutateAsync(input); created += 1; } catch { failed += 1; }
      }
    } finally { setAdding(false); }
    if (created) toast.success(`${created} prospect${created === 1 ? " foi adicionado" : "s foram adicionados"} ao Growth${enrichedCount ? ` · ${enrichedCount} com contato público encontrado` : ""}.`); if (skippedAfterEnrichment) toast.info(`${skippedAfterEnrichment} prospect${skippedAfterEnrichment === 1 ? " foi ignorado" : "s foram ignorados"} por duplicidade encontrada no enriquecimento.`); if (failed) toast.warning(`${failed} prospect${failed === 1 ? " não pôde ser adicionado" : "s não puderam ser adicionados"}.`); if (created === chosen.length - skippedAfterEnrichment) { setSelected([]); onOpenChange(false); }
  }

  const allSelected = filteredPlaces.filter((place) => !duplicateIds.has(place.placeId)).length > 0 && filteredPlaces.filter((place) => !duplicateIds.has(place.placeId)).every((place) => selected.includes(place.placeId));
  const resetFilters = () => { setResultSearch(""); setContactFilter("todos"); setPriorityFilter("todas"); setStatusFilter("disponiveis"); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden"><DialogHeader><DialogTitle>Encontrar prospects no Google Maps</DialogTitle><DialogDescription>Pesquise empresas por segmento e localização. O Growth analisa automaticamente o site público para encontrar WhatsApp, Instagram e telefone e indica a prioridade de prospecção antes do cadastro.</DialogDescription></DialogHeader>
    <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"><div className="space-y-2"><Label htmlFor="google-category">Categoria</Label><Input id="google-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: hotéis e pousadas" /></div><div className="space-y-2"><Label htmlFor="google-location">Cidade ou região</Label><Input id="google-location" value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="Ex.: Guarapari - ES" /></div><Button onClick={() => void search()} disabled={loading || loadingMore || adding} className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Buscar</Button></div>
    {places.length > 0 ? <div className="min-h-0 overflow-y-auto rounded-md border"><div className="sticky top-0 z-10 space-y-3 border-b bg-background px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-3 text-sm font-medium"><Checkbox checked={allSelected} onCheckedChange={(checked) => setSelected(checked ? [...new Set([...selected, ...filteredPlaces.filter((p) => !duplicateIds.has(p.placeId)).map((p) => p.placeId)])] : selected.filter((id) => !filteredPlaces.some((p) => p.placeId === id)))} />Selecionar filtrados</label><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{filteredPlaces.length}/{places.length} resultados</Badge><Badge variant="secondary">{selected.length} selecionado{selected.length === 1 ? "" : "s"}</Badge>{enrichingIds.length ? <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Analisando {enrichingIds.length}</Badge> : null}{duplicateIds.size ? <Badge variant="outline">{duplicateIds.size} já cadastrado{duplicateIds.size === 1 ? "" : "s"}</Badge> : null}</div></div>
      <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_1fr]"><Input value={resultSearch} onChange={(e) => setResultSearch(e.target.value)} placeholder="Filtrar por empresa ou endereço" aria-label="Filtrar resultados" /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={contactFilter} onChange={(e) => setContactFilter(e.target.value as ContactFilter)}><option value="todos">Contato: todos ({places.length})</option><option value="whatsapp">WhatsApp ({contactCounts.whatsapp})</option><option value="instagram">Instagram ({contactCounts.instagram})</option><option value="telefone">Telefone ({contactCounts.telefone})</option><option value="site">Site ({contactCounts.site})</option></select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}><option value="todas">Prioridade: todas</option><option value="alta">🔥 Alta prioridade</option><option value="boa">Boa oportunidade</option><option value="limitada">Dados limitados</option></select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}><option value="disponiveis">Somente disponíveis</option><option value="todos">Todos</option><option value="cadastrados">Já cadastrados</option></select></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Filter className="h-3.5 w-3.5" />Filtros rápidos para selecionar somente os prospects que interessam. <button type="button" className="ml-auto underline" onClick={resetFilters}>Limpar filtros</button></div></div>
      <div className="divide-y">{filteredPlaces.map((place) => { const duplicate = duplicateIds.has(place.placeId); const checked = selected.includes(place.placeId); const contacts = enrichment[place.placeId] ?? {}; const displayPhone = place.phone || contacts.phone; const enriching = enrichingIds.includes(place.placeId); const qualification = qualifications.get(place.placeId); return <div key={place.placeId} className={`flex gap-3 px-4 py-3 ${duplicate ? "opacity-60" : ""}`}><Checkbox className="mt-1" checked={checked} disabled={duplicate || adding} onCheckedChange={() => toggle(place.placeId)} /><div className="min-w-0 flex-1 space-y-1"><div className="flex flex-wrap items-center gap-2"><button type="button" className="text-left font-medium hover:underline" onClick={() => toggle(place.placeId)} disabled={duplicate || adding}>{place.name}</button>{qualification ? <Badge variant={qualification.score >= 65 ? "default" : "outline"}>{qualification.score >= 65 ? "🔥 " : ""}{qualification.label} · {qualification.score}</Badge> : null}{place.rating ? <Badge variant="outline">★ {place.rating.toFixed(1)}{place.userRatingCount ? ` · ${place.userRatingCount}` : ""}</Badge> : null}{duplicate ? <Badge variant="secondary">Já cadastrado</Badge> : null}</div>{place.address ? <div className="flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{place.address}</div> : null}<div className="flex flex-wrap items-center gap-3 text-sm">{displayPhone ? <a className="hover:underline" href={`tel:${displayPhone}`}>{displayPhone}</a> : null}{contacts.whatsapp ? <a className="hover:underline" href={contacts.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a> : null}{contacts.instagram ? <a className="inline-flex items-center gap-1 hover:underline" href={contacts.instagram} target="_blank" rel="noreferrer"><Instagram className="h-4 w-4" />Instagram</a> : null}{enriching ? <span className="text-muted-foreground">analisando contatos...</span> : null}{place.website ? <a className="inline-flex items-center gap-1 hover:underline" href={normalizeUrl(place.website)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Site</a> : null}{place.googleMapsUrl ? <a className="inline-flex items-center gap-1 hover:underline" href={place.googleMapsUrl} target="_blank" rel="noreferrer"><MapPin className="h-4 w-4" />Maps</a> : null}</div></div></div>})}</div></div> : <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Informe o segmento e a cidade/região para encontrar novos prospects.</div>}
    {places.length > 0 ? <DialogFooter><Button variant="outline" onClick={loadMore} disabled={!nextPageToken || loadingMore || loading || adding}>{loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{nextPageToken ? "Carregar mais resultados" : "Fim dos resultados"}</Button><Button onClick={() => void addSelected()} disabled={!selected.length || adding}>{adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{adding ? "Adicionando..." : `Adicionar ${selected.length} prospect${selected.length === 1 ? "" : "s"}`}</Button></DialogFooter> : null}
  </DialogContent></Dialog>;
}
