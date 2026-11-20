// Gerador de "Pix Copia e Cola" (BR Code EMV) — padrão Banco Central.

// Monta um campo EMV: id + tamanho (2 dígitos) + valor
function field(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

// CRC16-CCITT (polinômio 0x1021, init 0xFFFF)
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Remove acentos e limita tamanho (nome/cidade do recebedor)
function sanitize(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .slice(0, max)
    .trim();
}

export type PixParams = {
  key: string; // chave Pix (telefone no formato +5599991553836)
  merchantName: string;
  merchantCity: string;
  amountCents?: number | null; // valor em centavos (opcional)
  txid?: string; // identificador (<= 25, alfanumérico)
};

// Gera a string "Pix Copia e Cola"
export function buildPixPayload(params: PixParams): string {
  const gui = field("00", "br.gov.bcb.pix");
  const key = field("01", params.key);
  const merchantAccount = field("26", gui + key);

  const parts = [
    field("00", "01"), // Payload Format Indicator
    merchantAccount,
    field("52", "0000"), // Merchant Category Code
    field("53", "986"), // Moeda: BRL
  ];

  if (params.amountCents && params.amountCents > 0) {
    parts.push(field("54", (params.amountCents / 100).toFixed(2)));
  }

  parts.push(field("58", "BR"));
  parts.push(field("59", sanitize(params.merchantName, 25) || "RECEBEDOR"));
  parts.push(field("60", sanitize(params.merchantCity, 15) || "IMPERATRIZ"));

  const txid = (params.txid || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  parts.push(field("62", field("05", txid)));

  const payload = parts.join("") + "6304";
  return payload + crc16(payload);
}

// Dados fixos do recebedor Rafa Laser
export const PIX_RECEIVER = {
  key: "+5599991553836",
  merchantName: "FRANCISCO RAFAEL A SILVA",
  merchantCity: "IMPERATRIZ",
};
