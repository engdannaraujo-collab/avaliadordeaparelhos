// lib/pricing.js
// Regras de cálculo do valor de compra (troca) de um aparelho usado.
//
// Regras aplicadas (definidas na planilha original, aba "troca"):
// 1) Diagnóstico do "doc de carga" só pode ser confirmado por um técnico da
//    loja -> o front exibe um aviso quando esse defeito é marcado.
// 2) "Notificação de peça trocada" (câmera/bateria/tela): descontar o valor
//    de notificação apenas quando NÃO for necessário trocar a peça de fato.
// 3) Se o aparelho tem a notificação E ainda precisa trocar a peça, o
//    desconto passa a ser o valor de troca da peça multiplicado por 1,5.
// 4) Bônus de R$ 100 quando o cliente estiver trocando por outro seminovo
//    que a loja já tem em estoque.
//
// `selection` (enviado pelo front) tem o formato:
// {
//   tela: "ok" | "leve" | "moderada" | "trocar",
//   telaNotif: boolean,
//   bateriaTrocar: boolean,
//   bateriaNotif: boolean,
//   cameraDefeito: boolean,
//   cameraNotif: boolean,
//   traseira: boolean,
//   faceId: boolean,
//   docCarga: boolean,
//   trocaEstoque: boolean,
// }

export function calcularValor(model, selection) {
  const sel = selection || {};
  const breakdown = [];
  let total = model.baseValue;

  const desconta = (label, valor) => {
    if (!valor) return;
    total -= valor;
    breakdown.push({ label, valor: -valor });
  };

  // --- Tela: grupo mutuamente exclusivo (estado da tela) ---
  const tela = sel.tela || "ok";
  if (tela === "trocar") {
    const base = model.defects.troca_tela;
    if (sel.telaNotif && model.notif.tela != null) {
      desconta("Troca de tela (peça com notificação de troca, x1,5)", base * 1.5);
    } else {
      desconta("Troca de tela", base);
    }
  } else if (tela === "moderada") {
    desconta("Tela com manchas moderadas", model.defects.m_moderadas);
  } else if (tela === "leve") {
    desconta("Tela com manchas leves", model.defects.m_leves);
  } else if (sel.telaNotif && model.notif.tela != null) {
    desconta("Notificação de peça trocada (tela)", model.notif.tela);
  }

  // --- Bateria ---
  if (sel.bateriaTrocar) {
    const base = model.defects.bateria_85;
    if (sel.bateriaNotif && model.notif.bateria != null) {
      desconta("Bateria abaixo de 85% (peça com notificação, x1,5)", base * 1.5);
    } else {
      desconta("Bateria abaixo de 85%", base);
    }
  } else if (sel.bateriaNotif && model.notif.bateria != null) {
    desconta("Notificação de peça trocada (bateria)", model.notif.bateria);
  }

  // --- Câmera traseira ---
  if (sel.cameraDefeito) {
    const base = model.defects.cam_traseira;
    if (sel.cameraNotif && model.notif.camera != null) {
      desconta("Câmera traseira com defeito (peça com notificação, x1,5)", base * 1.5);
    } else {
      desconta("Câmera traseira com defeito", base);
    }
  } else if (sel.cameraNotif && model.notif.camera != null) {
    desconta("Notificação de peça trocada (câmera)", model.notif.camera);
  }

  // --- Defeitos simples ---
  if (sel.traseira) desconta("Traseira trincada/quebrada", model.defects.traseira);
  if (sel.faceId) desconta("Face ID não funciona", model.defects.face_id);
  if (sel.docCarga) desconta("Doc de carga com defeito", model.defects.doc_carga);

  // --- Bônus de troca por estoque ---
  if (sel.trocaEstoque) {
    total += 100;
    breakdown.push({ label: "Bônus: troca por seminovo em estoque", valor: 100 });
  }

  if (total < 0) total = 0;

  return {
    modelo: model.name,
    valorBase: model.baseValue,
    total: Math.round(total * 100) / 100,
    breakdown,
    avisoDocCarga: !!sel.docCarga,
  };
}
