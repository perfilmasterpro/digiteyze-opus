import { z } from "zod";

const addressComponentSchema = z.object({
  longText: z.string().optional(),
  shortText: z.string().optional(),
  types: z.array(z.string()).optional(),
});

const placeSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  displayName: z.object({ text: z.string().optional() }).optional(),
  formattedAddress: z.string().optional(),
  addressComponents: z.array(addressComponentSchema).optional(),
  nationalPhoneNumber: z.string().optional(),
  internationalPhoneNumber: z.string().optional(),
  websiteUri: z.string().optional(),
  googleMapsUri: z.string().optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  types: z.array(z.string()).optional(),
});

const responseSchema = z.object({
  places: z.array(placeSchema).default([]),
  nextPageToken: z.string().optional(),
});

type AddressComponent = z.infer<typeof addressComponentSchema>;

export type GooglePlaceProspect = {
  placeId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  website?: string;
  googleMapsUrl?: string;
  rating?: number;
  userRatingCount?: number;
  types: string[];
};

export type SearchGooglePlacesInput = {
  textQuery: string;
  pageSize?: number;
  pageToken?: string;
};

export type SearchGooglePlacesResult = {
  places: GooglePlaceProspect[];
  nextPageToken?: string;
};

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.types",
  "nextPageToken",
].join(",");

function getApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY não configurada.");
  return key;
}

function findComponent(components: AddressComponent[], types: string[]) {
  return components.find((component) => types.some((type) => component.types?.includes(type)))?.longText;
}

function locationFromComponents(components?: AddressComponent[]) {
  if (!components?.length) return {};
  return {
    city: findComponent(components, ["locality", "postal_town"]),
    state: findComponent(components, ["administrative_area_level_1"]),
  };
}

export async function searchGooglePlaces(
  input: SearchGooglePlacesInput,
): Promise<SearchGooglePlacesResult> {
  const textQuery = input.textQuery.trim();
  if (!textQuery) throw new Error("textQuery é obrigatório.");

  const body: Record<string, unknown> = {
    textQuery,
    pageSize: Math.min(Math.max(input.pageSize ?? 20, 1), 20),
    languageCode: "pt-BR",
  };
  if (input.pageToken?.trim()) body.pageToken = input.pageToken.trim();

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getApiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Places retornou ${response.status}: ${detail.slice(0, 500)}`);
  }

  const parsed = responseSchema.parse(await response.json());

  return {
    places: parsed.places
      .map((place) => ({
        placeId: place.id ?? place.name?.replace(/^places\//, "") ?? "",
        name: place.displayName?.text ?? "",
        address: place.formattedAddress,
        ...locationFromComponents(place.addressComponents),
        phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber,
        website: place.websiteUri,
        googleMapsUrl: place.googleMapsUri,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        types: place.types ?? [],
      }))
      .filter((place) => Boolean(place.placeId && place.name)),
    nextPageToken: parsed.nextPageToken,
  };
}
