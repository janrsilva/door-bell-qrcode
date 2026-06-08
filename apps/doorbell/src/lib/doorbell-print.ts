type OpenDoorbellPrintPageOptions = {
  addressUuid: string;
  residentName?: string;
  autoPrint?: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function openDoorbellPrintPage({
  addressUuid,
  residentName,
  autoPrint = false,
}: OpenDoorbellPrintPageOptions) {
  const qrUrl = `${window.location.origin}/api/qr?${new URLSearchParams({
    addressUuid,
  }).toString()}`;
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Permita pop-ups para abrir a página de impressão.");
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Campainha eletrônica</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      color: #111827;
      background: white;
      text-align: center;
    }
    main {
      min-height: calc(297mm - 40mm);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 28px;
    }
    h1 {
      margin: 0;
      font-size: 56px;
      line-height: 0.95;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .qr-box {
      width: 142mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 12mm;
      border: 2px solid #111827;
      border-radius: 8px;
    }
    img {
      display: block;
      width: 100%;
      height: auto;
    }
    .instructions {
      max-width: 150mm;
      margin: 0 auto;
      padding: 12px 16px;
      border-left: 5px solid #2563eb;
      background: #eff6ff;
      text-align: left;
      font-size: 18px;
      line-height: 1.45;
      color: #1e3a8a;
    }
    .resident {
      margin: 0;
      font-size: 16px;
      color: #4b5563;
    }
    .actions {
      position: fixed;
      top: 12px;
      right: 12px;
      display: flex;
      gap: 8px;
    }
    button {
      border: 0;
      border-radius: 6px;
      padding: 10px 14px;
      background: #111827;
      color: white;
      font-size: 14px;
      cursor: pointer;
    }
    button.secondary { background: #6b7280; }
    @media print {
      .actions { display: none; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Imprimir</button>
    <button class="secondary" onclick="window.close()">Fechar</button>
  </div>
  <main>
    <header>
      <h1>Campainha<br />Eletrônica</h1>
      ${residentName ? `<p class="resident">${escapeHtml(residentName)}</p>` : ""}
    </header>
    <section class="qr-box">
      <img src="${qrUrl}" alt="QR Code da Campainha" />
    </section>
    <section class="instructions">
      ENTREGADOR, SEMPRE CONFIRME O ENDEREÇO E OS DADOS DO DESTINATÁRIO.
      Escaneie o QR Code para tocar a campainha do morador.
    </section>
  </main>
  ${
    autoPrint
      ? `<script>
    const image = document.querySelector("img");
    image.addEventListener("load", () => setTimeout(() => window.print(), 250), { once: true });
  </script>`
      : ""
  }
</body>
</html>`);
  printWindow.document.close();
}
