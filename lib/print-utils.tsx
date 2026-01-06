export type ShippingLabelData = {
  tracking_number: string
  cn35_number: string
  sender_name: string
  sender_country: string
  recipient_name: string
  recipient_address: {
    street: string
    number: string
    complement?: string | null
    district?: string | null
    city: string
    state: string
    postal_code: string
    country: string
  }
}

export type CustomsDocumentData = {
  cn35_number: string
  tracking_number: string
  sender: {
    name: string
    address: string
    country: string
  }
  recipient: {
    name: string
    address: string
    country: string
  }
  customs_contents: Array<{
    description: string
    quantity: number
    unit_value: number
    currency: string
  }>
  total_declared_value: number
  total_weight_kg: number
  shipment_purpose: string
  country_of_origin: string
  creation_timestamp: string
}

/**
 * Gera uma etiqueta de envio 10x15cm para impressão
 * Renderiza apenas os campos obrigatórios da especificação
 */
export function printShippingLabel(data: ShippingLabelData) {
  const printWindow = window.open("", "_blank", "width=800,height=600")

  if (!printWindow) {
    alert("Por favor, permita pop-ups para imprimir a etiqueta")
    return
  }

  const fullAddress = [
    `${data.recipient_address.street}, ${data.recipient_address.number}`,
    data.recipient_address.complement,
    data.recipient_address.district,
    `${data.recipient_address.city} - ${data.recipient_address.state}`,
    data.recipient_address.postal_code,
    data.recipient_address.country,
  ]
    .filter(Boolean)
    .join("\n")

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Etiqueta de Envio - ${data.tracking_number}</title>
        <style>
          @page {
            size: 10cm 15cm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0.5cm;
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.3;
            width: 10cm;
            height: 15cm;
            box-sizing: border-box;
          }
          .label {
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          .section {
            margin-bottom: 0.3cm;
          }
          .barcode {
            text-align: center;
            margin: 0.3cm 0;
          }
          .barcode-text {
            font-family: 'Courier New', monospace;
            font-size: 14pt;
            font-weight: bold;
            letter-spacing: 2px;
            margin-top: 0.2cm;
          }
          .barcode-visual {
            height: 1.2cm;
            background: linear-gradient(90deg, 
              black 0%, black 8%, white 8%, white 10%,
              black 10%, black 12%, white 12%, white 16%,
              black 16%, black 20%, white 20%, white 22%,
              black 22%, black 24%, white 24%, white 28%,
              black 28%, black 32%, white 32%, white 34%,
              black 34%, black 38%, white 38%, white 40%,
              black 40%, black 44%, white 44%, white 46%,
              black 46%, black 48%, white 48%, white 52%,
              black 52%, black 56%, white 56%, white 58%,
              black 58%, black 60%, white 60%, white 64%,
              black 64%, black 68%, white 68%, white 70%,
              black 70%, black 74%, white 74%, white 76%,
              black 76%, black 78%, white 78%, white 82%,
              black 82%, black 86%, white 86%, white 88%,
              black 88%, black 92%, white 92%, white 94%,
              black 94%, black 96%, white 96%, white 100%
            );
            margin: 0.2cm 0;
          }
          .label-title {
            font-size: 8pt;
            font-weight: bold;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 0.1cm;
          }
          .label-value {
            font-size: 11pt;
            font-weight: bold;
          }
          .from-to {
            border: 2px solid #000;
            padding: 0.3cm;
            margin-bottom: 0.3cm;
          }
          .to-section {
            flex: 1;
            border: 2px solid #000;
            padding: 0.3cm;
          }
          .address-line {
            white-space: pre-line;
          }
          @media print {
            body {
              width: 10cm;
              height: 15cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="barcode">
            <div class="barcode-visual"></div>
            <div class="barcode-text">${data.tracking_number}</div>
          </div>

          <div class="section">
            <div class="label-title">CN35</div>
            <div class="label-value">${data.cn35_number}</div>
          </div>

          <div class="from-to">
            <div class="label-title">From</div>
            <div class="label-value">${data.sender_name}</div>
            <div>${data.sender_country}</div>
          </div>

          <div class="to-section">
            <div class="label-title">To</div>
            <div class="label-value">${data.recipient_name}</div>
            <div class="address-line">${fullAddress}</div>
          </div>
        </div>
      </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
}

/**
 * Gera documentos aduaneiros A4 para impressão
 * Renderiza apenas os campos obrigatórios da especificação
 */
export function printCustomsDocuments(data: CustomsDocumentData) {
  const printWindow = window.open("", "_blank", "width=800,height=600")

  if (!printWindow) {
    alert("Por favor, permita pop-ups para imprimir os documentos")
    return
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Documentos Aduaneiros - ${data.tracking_number}</title>
        <style>
          @page {
            size: A4;
            margin: 2cm;
          }
          body {
            margin: 0;
            padding: 2cm;
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
          }
          .document {
            max-width: 21cm;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            font-size: 16pt;
            margin-bottom: 1cm;
            border-bottom: 3px solid #000;
            padding-bottom: 0.3cm;
          }
          .section {
            margin-bottom: 0.8cm;
          }
          .section-title {
            font-size: 12pt;
            font-weight: bold;
            background: #f0f0f0;
            padding: 0.2cm 0.3cm;
            border-left: 4px solid #000;
            margin-bottom: 0.3cm;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5cm;
            margin-bottom: 0.5cm;
          }
          .info-item {
            border: 1px solid #ddd;
            padding: 0.3cm;
          }
          .info-label {
            font-size: 8pt;
            color: #666;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 0.1cm;
          }
          .info-value {
            font-size: 11pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0.3cm;
          }
          th, td {
            border: 1px solid #000;
            padding: 0.3cm;
            text-align: left;
          }
          th {
            background: #f0f0f0;
            font-weight: bold;
          }
          .total-row {
            font-weight: bold;
            background: #f9f9f9;
          }
          .barcode-section {
            text-align: center;
            margin: 0.5cm 0;
            padding: 0.5cm;
            border: 2px solid #000;
          }
          .barcode-text {
            font-family: 'Courier New', monospace;
            font-size: 16pt;
            font-weight: bold;
            letter-spacing: 3px;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="document">
          <h1>DOCUMENTOS ADUANEIROS / CUSTOMS DOCUMENTS</h1>

          <div class="barcode-section">
            <div class="info-label">Tracking Number</div>
            <div class="barcode-text">${data.tracking_number}</div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">CN35 Number</div>
              <div class="info-value">${data.cn35_number}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Date / Data</div>
              <div class="info-value">${formatDate(data.creation_timestamp)}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Sender / Remetente</div>
            <div class="info-item">
              <div class="info-label">Name / Nome</div>
              <div class="info-value">${data.sender.name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Address / Endereço</div>
              <div class="info-value">${data.sender.address}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Country / País</div>
              <div class="info-value">${data.sender.country}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Recipient / Destinatário</div>
            <div class="info-item">
              <div class="info-label">Name / Nome</div>
              <div class="info-value">${data.recipient.name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Address / Endereço</div>
              <div class="info-value">${data.recipient.address}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Country / País</div>
              <div class="info-value">${data.recipient.country}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Customs Contents / Conteúdo Aduaneiro</div>
            <table>
              <thead>
                <tr>
                  <th>Description / Descrição</th>
                  <th style="width: 15%;">Quantity / Qtd</th>
                  <th style="width: 20%;">Unit Value / Valor Unit.</th>
                  <th style="width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.customs_contents
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${item.currency} ${item.unit_value.toFixed(2)}</td>
                    <td>${item.currency} ${(item.quantity * item.unit_value).toFixed(2)}</td>
                  </tr>
                `,
                  )
                  .join("")}
                <tr class="total-row">
                  <td colspan="3">Total Declared Value / Valor Total Declarado</td>
                  <td>${data.customs_contents[0]?.currency || "USD"} ${data.total_declared_value.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Total Weight / Peso Total</div>
              <div class="info-value">${data.total_weight_kg.toFixed(2)} kg</div>
            </div>
            <div class="info-item">
              <div class="info-label">Shipment Purpose / Finalidade</div>
              <div class="info-value">${data.shipment_purpose}</div>
            </div>
          </div>

          <div class="info-item">
            <div class="info-label">Country of Origin / País de Origem</div>
            <div class="info-value">${data.country_of_origin}</div>
          </div>
        </div>
      </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
}
