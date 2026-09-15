# Google Places discovery

The prospecting integration uses Google Places API (New) Text Search from the server side.

Required environment variable:

`GOOGLE_PLACES_API_KEY`

Before enabling the feature in production:

1. Create or select a Google Cloud project.
2. Enable Places API (New).
3. Enable billing for the project.
4. Create an API key and restrict it to Places API (New).
5. Configure `GOOGLE_PLACES_API_KEY` in the server environment.

The integration intentionally uses a FieldMask instead of `*` to reduce response size and unnecessary billing.

Current endpoint:

`POST /api/prospeccao/google-places`

Request body:

```json
{"textQuery":"hotéis e pousadas em Guarapari - ES","pageSize":20}
```

The endpoint is only a discovery layer at this stage. It does not create leads automatically; selected results should be connected to the existing lead import/deduplication flow in the next implementation step.
