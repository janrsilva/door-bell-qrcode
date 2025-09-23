import { AddressData } from "@/contexts/AddressContext";

/**
 * Abrevia apenas o necessário, de trás pra frente, até caber em maxLen.
 * Regras:
 * - Normaliza tipos (Avenida→Av., Rua→R., etc.)
 * - Mantém a última palavra completa (ex.: "Morato")
 * - Vai abreviando da penúltima para a primeira
 * - Palavrinhas de ligação (de, da, do, das, dos, e) não são abreviadas
 * - Se já tiver ponto (ex: "R.", "Av."), mantém
 * - Fallback final com reticências preservando a última palavra
 */
function abbreviateStreet(name: string, maxLen = 25): string {
  if (!name) return "";
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;

  // dicionário de normalização
  const dict: Record<string, string> = {
    avenida: "Av.",
    av: "Av.",
    "av.": "Av.",
    rua: "R.",
    r: "R.",
    "r.": "R.",
    travessa: "Trav.",
    tv: "Trav.",
    "tv.": "Trav.",
    alameda: "Al.",
    al: "Al.",
    "al.": "Al.",
    rodovia: "Rod.",
    rod: "Rod.",
    "rod.": "Rod.",
    br: "BR",
  };

  const connectors = /^(de|da|do|das|dos|e|d|o|a)$/i;

  // helpers
  const normalize = (w: string) => {
    const key = w.toLowerCase();
    return dict[key] ?? w;
  };

  const canAbbrev = (w: string) =>
    !connectors.test(w) && !/\./.test(w) && w.length > 1;

  const abbrev = (w: string) => w[0].toUpperCase() + ".";

  // 1) normaliza primeiro
  const words = clean.split(" ").map(normalize);
  let result = words.join(" ");
  if (result.length <= maxLen) return result;

  // 2) encurta de trás pra frente, preservando a última palavra
  const work = [...words];
  for (let i = work.length - 2; i >= 0; i--) {
    if (canAbbrev(work[i])) {
      work[i] = abbrev(work[i]);
      result = work.join(" ");
      if (result.length <= maxLen) return result;
    }
  }

  // 3) ainda grande? tenta remover espaços extras entre iniciais (opcional)
  // Ex.: "Av. P. F. Morato" já é compacto; então partimos para fallback.
  if (result.length <= maxLen) return result;

  // 4) fallback: reticências preservando a última palavra
  const last = work[work.length - 1];
  const headMax = Math.max(5, maxLen - 3 - last.length);
  return `${clean.slice(0, headMax).trim()}… ${last}`;
}

export default function AddressBlock({
  addressData,
}: {
  addressData: AddressData;
}) {
  const number = addressData.number ?? "";
  const complement = addressData.complement ?? "";

  return (
    <div className="flex w-full flex-row items-start justify-between gap-3">
      {/* Coluna 1: rua/bairro/cidade — pode quebrar linha */}
      <div className="min-w-0 flex-1 pr-3 border-r border-gray-200">
        <div className="flex flex-col items-start justify-start gap-1">
          <span className="text-2xl leading-tight break-words">
            {abbreviateStreet(addressData.street)}
          </span>
          <span className="text-base leading-tight text-gray-300 break-words">
            {addressData.neighborhood} | {addressData.city}
          </span>
        </div>
      </div>

      {/* Coluna 2: número em cima do complemento — sem quebra, com destaque */}
      <div className="flex flex-col items-end justify-start gap-1 flex-none whitespace-nowrap">
        {number ? (
          <strong className="text-4xl leading-none tracking-tight">
            {number}
          </strong>
        ) : null}
        {complement ? (
          <strong className="text-xl leading-none tracking-tight">
            {complement}
          </strong>
        ) : null}
      </div>
    </div>
  );
}
