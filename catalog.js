// lib/catalog.js
// Busca a planilha publicada (CSV) e transforma em um catálogo estruturado.
//
// Colunas esperadas no CSV (aba "catalogo_publico" da planilha):
// modelo,valor_base,m_leves,m_moderadas,bateria_85,troca_tela,traseira,
// face_id,doc_carga,cam_traseira,notif_camera,notif_bateria,notif_tela

const DEFAULT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTRTwHp2AjFL0DaxZ10I6QE6x_cUB6j9HWQpHljA5gibN3-YtprcBFwah8LwIFkS2Pkl5u3Qpalehra/pub?gid=634260873&single=true&output=csv";

export function getCsvUrl(env) {
  return (env && env.CSV_URL) || DEFAULT_CSV_URL;
}

// Parser simples de CSV com suporte a campos entre aspas (RFC4180 básico).
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r[0] && r[0].trim() !== ""));
}

// Converte "R$ 1.099,00" (ou " R$ 300,00 ") em 1099.00
function parseBRL(str) {
  if (str == null) return 0;
  const cleaned = String(str).replace(/[^0-9,]/g, "");
  const normalized = cleaned.replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function parseNum(str) {
  const n = Number(String(str).trim());
  return Number.isFinite(n) ? n : 0;
}

// Valor "---" (ou vazio) significa que o modelo não tem notificação
// de peça trocada rastreada para essa categoria.
function parseNotif(str) {
  if (str == null) return null;
  const v = String(str).trim();
  if (v === "" || v === "---" || v === "-") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function fetchCatalog(csvUrl) {
  const res = await fetch(csvUrl, {
    cf: { cacheTtl: 30, cacheEverything: true },
  });
  if (!res.ok) {
    throw new Error(
      `Não foi possível ler a planilha publicada (status ${res.status}).`
    );
  }
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim());
  const idx = (name) => header.indexOf(name);

  const col = {
    modelo: idx("modelo"),
    valor_base: idx("valor_base"),
    m_leves: idx("m_leves"),
    m_moderadas: idx("m_moderadas"),
    bateria_85: idx("bateria_85"),
    troca_tela: idx("troca_tela"),
    traseira: idx("traseira"),
    face_id: idx("face_id"),
    doc_carga: idx("doc_carga"),
    cam_traseira: idx("cam_traseira"),
    notif_camera: idx("notif_camera"),
    notif_bateria: idx("notif_bateria"),
    notif_tela: idx("notif_tela"),
  };

  const models = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const nome = (r[col.modelo] || "").trim();
    if (!nome) continue;

    models.push({
      id: slugify(nome),
      name: nome,
      baseValue: parseBRL(r[col.valor_base]),
      defects: {
        m_leves: parseNum(r[col.m_leves]),
        m_moderadas: parseNum(r[col.m_moderadas]),
        bateria_85: parseNum(r[col.bateria_85]),
        troca_tela: parseNum(r[col.troca_tela]),
        traseira: parseNum(r[col.traseira]),
        face_id: parseNum(r[col.face_id]),
        doc_carga: parseNum(r[col.doc_carga]),
        cam_traseira: parseNum(r[col.cam_traseira]),
      },
      notif: {
        camera: parseNotif(r[col.notif_camera]),
        bateria: parseNotif(r[col.notif_bateria]),
        tela: parseNotif(r[col.notif_tela]),
      },
    });
  }
  return models;
}
