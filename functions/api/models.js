// GET /api/models
// Devolve o catálogo de modelos (valor base + defeitos + notificações
// disponíveis) lido da planilha publicada. O front usa isso para montar
// os campos dinamicamente para cada modelo escolhido.

import { fetchCatalog, getCsvUrl } from "../../lib/catalog.js";

export async function onRequestGet(context) {
  try {
    const csvUrl = getCsvUrl(context.env);
    const models = await fetchCatalog(csvUrl);
    return Response.json(
      { models },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch (err) {
    return Response.json(
      { error: err.message || "Erro ao carregar o catálogo." },
      { status: 502 }
    );
  }
}
