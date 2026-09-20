import { useMemo, useState } from "react";
import { Building2, Check, ExternalLink, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCreateLead, useLeads } from "../hooks/use-leads";
import { qualifyProspect } from "../services/prospect-qualification";
import { UFS, type Lead, type LeadInput, type UF } from "../types/leads.types";

type OpenPlace = {
  sourceId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  cnpj?: string;
  mapUrl?: string;
  category?: string;
  segmentLabel: string;
};

type ReceitaCompany = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacao?: string;
  dataAbertura?: string;
  porte?: string;
  cnaePrincipal?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
};

const SEGMENT_SUGGESTIONS = [
  "Hotel e pousada",
  "Restaurante",
  "Clínica e saúde",
  "Salão de beleza",
  "Academia",
  "Oficina automotiva",
  "Material de construção",
  "Imobiliária",
  "Escritório de contabilidade",
  "Loja e varejo",
  "Escola e curso",
];

function onlyDigits(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeUrl(value?: string) {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function domainOf(value?: string) {
  try {
    return value ? new URL(normalizeUrl(value)!).hostname.replace(/^www\./, "").toLowerCase() : "";
  } catch {
    return "";
  }
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return value;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function asUf(value?: string): UF | undefined {
  const upper = (value ?? "").trim().toUpperCase();
  return (UFS as readonly string[]).includes(upper) ? (upper as UF) : undefined;
}

function isDuplicate(place: OpenPlace, leads: Lead[]) {
  const phone = onlyDigits(place.phone);
  const domain = domainOf(place.website);
  const name = place.name.trim().toLowerCase();
  return leads.some((lead) => {
    if (lead.nome_empresa.trim().toLowerCase() === name) return true;
    if (place.cnpj && onlyDigits(lead.cnpj) === place.cnpj) return true;
    if (domain && domainOf(lead.site) === domain) return true;
    const leadPhone = onlyDigits(lead.whatsapp || lead.telefone);
    return Boolean(phone && leadPhone && phone.slice(-8) === leadPhone.slice(-8));
  });
}

async function authorizedPost<T>(url: string, payload: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sua sessão expirou. Entre novamente no Growth OS.");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Não foi possível concluir a consulta.");
  return body;
}

export function OpenPlacesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [segment, setSegment] = useState("Hotel e pousada");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("ES");
  const [places, setPlaces] = useState<OpenPlace[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [onlyWithContact, setOnlyWithContact] = useState(false);

  const [cnpjInput, setCnpjInput] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [company, setCompany] = useState<ReceitaCompany | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);

  const { data: leads = [] } = useLeads();
  const createLead = useCreateLead();

  const duplicateIds = useMemo(
    () => new Set(places.filter((place) => isDuplicate(place, leads)).map((place) => place.sourceId)),
    [places, leads],
  );

  const visiblePlaces = useMemo(
    () => (onlyWithContact ? places.filter((place) => place.phone || place.website) : places),
    [places, onlyWithContact],
  );

  const selectablePlaces = visiblePlaces.filter((place) => !duplicateIds.has(place.sourceId));
  const allSelected =
    selectablePlaces.length > 0 && selectablePlaces.every((place) => selected.includes(place.sourceId));

  function toggle(sourceId: string) {
    if (duplicateIds.has(sourceId)) return;
    setSelected((current) =>
      current.includes(sourceId) ? current.filter((id) => id !== sourceId) : [...current, sourceId],
    );
  }

  async function search() {
    if (!city.trim()) {
      toast.error("Informe a cidade.");
      return;
    }
    setLoading(true);
    try {
      const body = await authorizedPost<{ places?: OpenPlace[]; resolvedCity?: string }>(
        "/api/prospeccao/open-places",
        { segment: segment.trim(), city: city.trim(), uf, limit: 120 },
      );
      const found = body.places ?? [];
      setPlaces(found);
      setSelected([]);
      if (!found.length) toast.info("Nenhuma empresa encontrada nessa cidade para esse segmento.");
      else toast.success(`${found.length} empresas encontradas em ${body.resolvedCity ?? city}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao pesquisar.");
    } finally {
      setLoading(false);
    }
  }

  async function addSelected() {
    const chosen = places.filter(
      (place) => selected.includes(place.sourceId) && !duplicateIds.has(place.sourceId),
    );
    if (!chosen.length || adding) return;

    setAdding(true);
    let created = 0;
    let failed = 0;
    try {
      for (const place of chosen) {
        const website = normalizeUrl(place.website);
        const qualification = qualifyProspect({ website, phone: place.phone });
        const input: LeadInput = {
          nome_empresa: place.name,
          status: "novo_lead",
          origem: "outbound",
          responsavel: "",
          telefone: place.phone,
          site: website,
          cnpj: place.cnpj,
          segmento: place.segmentLabel,
          cidade: place.city,
          estado: asUf(place.state),
          observacoes: place.address,
          custom_fields: {
            fonte_prospeccao: "base_publica_aberta",
            fonte_id: place.sourceId,
            fonte_categoria: place.category ?? "",
            fonte_mapa: place.mapUrl ?? "",
            prospeccao_score: String(qualification.score),
            prospeccao_prioridade: qualification.label,
            prospeccao_score_motivos: qualification.reasons.join(" · "),
          },
        };
        try {
          await createLead.mutateAsync(input);
          created += 1;
        } catch {
          failed += 1;
        }
      }
    } finally {
      setAdding(false);
    }

    if (created) toast.success(`${created} empresa${created === 1 ? "" : "s"} adicionada${created === 1 ? "" : "s"} ao pipeline.`);
    if (failed) toast.warning(`${failed} empresa${failed === 1 ? " não pôde" : "s não puderam"} ser adicionada${failed === 1 ? "" : "s"}.`);
    if (!failed) {
      setSelected([]);
      onOpenChange(false);
    }
  }

  async function lookupCnpj() {
    const digits = onlyDigits(cnpjInput);
    if (digits.length !== 14) {
      toast.error("Informe um CNPJ com 14 dígitos.");
      return;
    }
    setCnpjLoading(true);
    try {
      const body = await authorizedPost<{ company: ReceitaCompany }>("/api/prospeccao/receita-cnpj", {
        cnpj: digits,
      });
      setCompany(body.company);
    } catch (error) {
      setCompany(null);
      toast.error(error instanceof Error ? error.message : "Erro ao consultar a Receita Federal.");
    } finally {
      setCnpjLoading(false);
    }
  }

  async function addCompany() {
    if (!company || savingCompany) return;
    const exists = leads.some((lead) => onlyDigits(lead.cnpj) === onlyDigits(company.cnpj));
    if (exists) {
      toast.info("Essa empresa já está cadastrada nos seus leads.");
      return;
    }

    setSavingCompany(true);
    try {
      const qualification = qualifyProspect({ phone: company.telefone });
      const input: LeadInput = {
        nome_empresa: company.nomeFantasia || company.razaoSocial,
        status: "novo_lead",
        origem: "outbound",
        responsavel: "",
        cnpj: company.cnpj,
        telefone: company.telefone,
        contato_email: company.email,
        segmento: company.cnaePrincipal,
        cidade: company.cidade,
        estado: asUf(company.uf),
        observacoes: [company.endereco, company.cep].filter(Boolean).join(" · "),
        custom_fields: {
          fonte_prospeccao: "receita_federal",
          receita_razao_social: company.razaoSocial,
          receita_situacao: company.situacao ?? "",
          receita_porte: company.porte ?? "",
          receita_abertura: company.dataAbertura ?? "",
          receita_cnae: company.cnaePrincipal ?? "",
          prospeccao_score: String(qualification.score),
          prospeccao_prioridade: qualification.label,
        },
      };
      await createLead.mutateAsync(input);
      toast.success(`${input.nome_empresa} foi adicionada ao pipeline.`);
      setCompany(null);
      setCnpjInput("");
    } catch {
      toast.error("Não foi possível adicionar a empresa.");
    } finally {
      setSavingCompany(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Buscar empresas em bases públicas</DialogTitle>
          <DialogDescription>
            Pesquisa gratuita de empresas por segmento e cidade, com consulta aos dados oficiais da Receita
            Federal por CNPJ. Sem custo e sem chave de API.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="segmento" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="segmento" className="flex-1">
              Por segmento e cidade
            </TabsTrigger>
            <TabsTrigger value="cnpj" className="flex-1">
              Por CNPJ (Receita Federal)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="segmento" className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="open-segment">Segmento</Label>
                <Input
                  id="open-segment"
                  list="open-segment-options"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  placeholder="Ex.: hotel e pousada"
                />
                <datalist id="open-segment-options">
                  {SEGMENT_SUGGESTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="open-city">Cidade</Label>
                <Input
                  id="open-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void search();
                  }}
                  placeholder="Ex.: Marataízes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="open-uf">UF</Label>
                <select
                  id="open-uf"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                >
                  {UFS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={() => void search()} disabled={loading || adding} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </Button>
            </div>

            {places.length > 0 ? (
              <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
                <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-3">
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        setSelected(
                          checked
                            ? [...new Set([...selected, ...selectablePlaces.map((p) => p.sourceId)])]
                            : selected.filter((id) => !visiblePlaces.some((p) => p.sourceId === id)),
                        )
                      }
                    />
                    Selecionar todas disponíveis
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={onlyWithContact}
                        onCheckedChange={(checked) => setOnlyWithContact(Boolean(checked))}
                      />
                      Só com telefone ou site
                    </label>
                    <Badge variant="secondary">
                      {visiblePlaces.length}/{places.length} empresas
                    </Badge>
                    <Badge variant="secondary">{selected.length} selecionada{selected.length === 1 ? "" : "s"}</Badge>
                    {duplicateIds.size ? (
                      <Badge variant="outline">{duplicateIds.size} já cadastrada{duplicateIds.size === 1 ? "" : "s"}</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="divide-y">
                  {visiblePlaces.map((place) => {
                    const duplicate = duplicateIds.has(place.sourceId);
                    return (
                      <div key={place.sourceId} className={`flex gap-3 px-4 py-3 ${duplicate ? "opacity-60" : ""}`}>
                        <Checkbox
                          className="mt-1"
                          checked={selected.includes(place.sourceId)}
                          disabled={duplicate || adding}
                          onCheckedChange={() => toggle(place.sourceId)}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="text-left font-medium hover:underline"
                              onClick={() => toggle(place.sourceId)}
                              disabled={duplicate || adding}
                            >
                              {place.name}
                            </button>
                            {place.category ? <Badge variant="outline">{place.category}</Badge> : null}
                            {duplicate ? <Badge variant="secondary">Já cadastrada</Badge> : null}
                          </div>
                          {place.address ? (
                            <div className="flex items-start gap-1 text-sm text-muted-foreground">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                              {place.address}
                            </div>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            {place.phone ? (
                              <a className="hover:underline" href={`tel:${place.phone}`}>
                                {place.phone}
                              </a>
                            ) : null}
                            {place.website ? (
                              <a
                                className="inline-flex items-center gap-1 hover:underline"
                                href={normalizeUrl(place.website)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Site
                              </a>
                            ) : null}
                            {place.mapUrl ? (
                              <a
                                className="inline-flex items-center gap-1 hover:underline"
                                href={place.mapUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MapPin className="h-4 w-4" />
                                Mapa
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Informe o segmento e a cidade para encontrar empresas gratuitamente.
              </div>
            )}

            {places.length > 0 ? (
              <DialogFooter>
                <Button onClick={() => void addSelected()} disabled={!selected.length || adding}>
                  {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  {adding ? "Adicionando..." : `Adicionar ${selected.length} empresa${selected.length === 1 ? "" : "s"}`}
                </Button>
              </DialogFooter>
            ) : null}
          </TabsContent>

          <TabsContent value="cnpj" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="open-cnpj">CNPJ</Label>
                <Input
                  id="open-cnpj"
                  value={cnpjInput}
                  onChange={(e) => setCnpjInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void lookupCnpj();
                  }}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <Button onClick={() => void lookupCnpj()} disabled={cnpjLoading} className="gap-2">
                {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                Consultar
              </Button>
            </div>

            {company ? (
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{company.nomeFantasia || company.razaoSocial}</span>
                  {company.situacao ? (
                    <Badge variant={company.situacao.toUpperCase() === "ATIVA" ? "default" : "outline"}>
                      {company.situacao}
                    </Badge>
                  ) : null}
                  {company.porte ? <Badge variant="outline">{company.porte}</Badge> : null}
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">CNPJ</dt>
                    <dd>{formatCnpj(company.cnpj)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Razão social</dt>
                    <dd>{company.razaoSocial}</dd>
                  </div>
                  {company.cnaePrincipal ? (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Atividade principal</dt>
                      <dd>{company.cnaePrincipal}</dd>
                    </div>
                  ) : null}
                  {company.telefone ? (
                    <div>
                      <dt className="text-muted-foreground">Telefone</dt>
                      <dd>{company.telefone}</dd>
                    </div>
                  ) : null}
                  {company.email ? (
                    <div>
                      <dt className="text-muted-foreground">E-mail</dt>
                      <dd className="truncate">{company.email}</dd>
                    </div>
                  ) : null}
                  {company.endereco ? (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Endereço</dt>
                      <dd>
                        {company.endereco}
                        {company.cidade ? ` — ${company.cidade}/${company.uf ?? ""}` : ""}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <Button onClick={() => void addCompany()} disabled={savingCompany} className="gap-2">
                  {savingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Adicionar aos leads
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Digite um CNPJ para consultar os dados oficiais da Receita Federal.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
