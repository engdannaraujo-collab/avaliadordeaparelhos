// POST /api/calc
// Body: { modelId: string, selection: {...} }
// Recalcula o valor final no servidor (fonte de verdade), a partir da
// planilha publicada, para o modelo e os defeitos marcados pelo vendedor.

import { fetchCatalog, getCsvUrl } from "../../lib/catalog.js";
import { calcularValor } from "../../lib/pricing.js";

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { modelId, selection } = body || {};
  if (!modelId) {
    return Response.json({ error: "modelId é obrigatório." }, { status: 400 });
  }

  try {
    const csvUrl = getCsvUrl(context.env);
    const models = await fetchCatalog(csvUrl);
    const model = models.find((m) => m.id === modelId);
    if (!model) {
      return Response.json({ error: "Modelo não encontrado." }, { status: 404 });
    }
    const resultado = calcularValor(model, selection);
    return Response.json(resultado);
  } catch (err) {
    return Response.json(
      { error: err.message || "Erro ao calcular o valor." },
      { status: 502 }
    );
  }
}
