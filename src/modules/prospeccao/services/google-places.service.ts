import { z } from "zod";

const placeSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  displayName: z.object({ text: z.string().optional() }).optional(),
  formattedAddress: z.string().optional(),
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

export type GooglePlaceProspect = {
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

export type SearchGooglePlacesInput = {
  textQuery: string;
  pageSize?: number;
};

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.types",
].join(",");

function getApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY não configurada.");
  return key;
}

export async function searchGooglePlaces(
  input: SearchGooglePlacesInput,
): Promise<GooglePlaceProspect[]> {
  const textQuery = input.textQuery.trim();
  if (!textQuery) throw new Error("textQuery é obrigatório.");

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getApiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      pageSize: Math.min(Math.max(input.pageSize ?? 20, 1), 20),
      languageCode: "pt-BR",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Places retornou ${response.status}: ${detail.slice(0, 500)}`);
  }

  const parsed = responseSchema.parse(await response.json());

  return parsed.places
    .map((place) => ({
      placeId: place.id ?? place.name?.replace(/^places\//, "") ?? "",
      name: place.displayName?.text ?? "",
      address: place.formattedAddress,
      phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber,
      website: place.websiteUri,
      googleMapsUrl: place.googleMapsUri,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      types: place.types ?? [],
    }))
    .filter((place) => Boolean(place.placeId && place.name));
}
