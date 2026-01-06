"use client";
import Barcode from "react-barcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

import { useParams } from "next/navigation";
import { useRef, CSSProperties, useMemo, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.id as string;
  const labelRef = useRef(null);
  const [items, setItems] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) {
        console.error("Error fetching order:", orderError);
        setLoading(false);
        return;
      }

      setOrder(orderData);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_internal_id", orderId);

      if (itemsError) {
        console.error("Error fetching items:", itemsError);
        setLoading(false);
        return;
      }

      const fixedItems = itemsData.map((item) => {
        return {
          ncm: item.ncm || "331090",
          qty: item.quantity,
          desc: item.title + (item.variant_title ? ` - ${item.variant_title}` : ""),
          weight: ((item.weight * item.quantity) || (0.5 * item.quantity)).toFixed(2),
          unit: item.price.toFixed(2),
          total: (item.price * item.quantity).toFixed(2),
        };
      });
      
      setItems(fixedItems);
      setLoading(false);
    }
    
    fetchData();
  }, [orderId]);

  // Split items into pages - first page fits ~3 items, subsequent pages fit ~20 items
  const ITEMS_PER_FIRST_PAGE = 3;
  const ITEMS_PER_SUPPLEMENTARY_PAGE = 20;

  const pages = useMemo(() => {
    const result: Array<{
      type: string;
      pageNumber?: number;
      items: any[];
    }> = [];

    if (items.length === 0) {
      return result;
    }

    // First page with main content
    result.push({
      type: "main",
      items: items.slice(0, ITEMS_PER_FIRST_PAGE),
    });

    // Supplementary pages
    let remainingItems = items.slice(ITEMS_PER_FIRST_PAGE);
    let pageNumber = 2;

    while (remainingItems.length > 0) {
      result.push({
        type: "supplementary",
        pageNumber: pageNumber,
        items: remainingItems.slice(0, ITEMS_PER_SUPPLEMENTARY_PAGE),
      });
      remainingItems = remainingItems.slice(ITEMS_PER_SUPPLEMENTARY_PAGE);
      pageNumber++;
    }

    return result;
  }, [items]);

  // Memoize data object to avoid recreating it on every render
  const data = useMemo(() => {
    if (!order) return null;
    
    return {
      orderNumber: order.shopify_order_id || order.id,
      trackingId: order.tracking_id || "IX 123 456 789 BR",
      contract: order.contract || "1234567890",
      recipient: {
        name: order.customer_name,
        address: order.address_json.address1,
        details: order.address_json.address2 || "",
        cityState: `${order.address_json.city}/${order.address_json.province_code || order.address_json.province}`,
        zip: order.address_json.zip,
      },
      sender: {
        nameInBrazil: "GREENFRONTIER IMPORTAÇÕES E COMÉRCIO LTDA",
        addressInBrazil: "Boulevard 28 de Setembro, 219",
        cep: "20551-030 - Rio de Janeiro/RJ",
        nameAbroad: "Hello Goxtosas",
        addressAbroad: "Boulevard 28 de Setembro, 219",
        city: "Rio de Janeiro",
        countryOfOrigin: "Brasil",
        salesSite: "hellogoxtosas.com.br",
      },
      items: items,
      insurance: "20.00",
      freight: "20.00",
    };
  }, [order, items]);

  if (loading || !order || !data) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading order details...</p>
      </div>
    );
  }

  const generatePDF = async () => {
    const element = labelRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      ignoreElements: (el) => {
        // Ignore elements outside the label
        return el.tagName === "BUTTON";
      },
    });

    console.log(canvas);
    const imageData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [400, 700],
    });

    // Calculate aspect ratio to avoid stretching
    const canvasAspectRatio = canvas.width / canvas.height;
    const pdfWidth = 400;
    const pdfHeight = 700;
    const pdfAspectRatio = pdfWidth / pdfHeight;

    let imgWidth = pdfWidth;
    let imgHeight = pdfHeight;
    let xOffset = 0;
    let yOffset = 0;

    if (canvasAspectRatio > pdfAspectRatio) {
      // Canvas is wider than PDF, fit to width
      imgHeight = pdfWidth / canvasAspectRatio;
      yOffset = (pdfHeight - imgHeight) / 2;
    } else {
      // Canvas is taller than PDF, fit to height
      imgWidth = pdfHeight * canvasAspectRatio;
      xOffset = (pdfWidth - imgWidth) / 2;
    }

    pdf.addImage(imageData, "PNG", xOffset, yOffset, imgWidth, imgHeight);
    pdf.save(`Label-${data.trackingId}.pdf`);
  };

  const s: Record<string, CSSProperties> = {
    container: {
      width: "100mm",
      minHeight: "150mm",
      padding: "2.5mm",
      backgroundColor: "white",
      fontFamily: "Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
      border: "1px solid #000",
      color: "#000",
      marginBottom: "5mm",
      pageBreakAfter: "always",
    },
    supplementaryContainer: {
      width: "100mm",
      height: "150mm",
      padding: "2.5mm",
      backgroundColor: "white",
      fontFamily: "Arial, sans-serif",
      flexDirection: "column",
      flexWrap: "wrap",
      boxSizing: "border-box",
      border: "1px solid #000",
      color: "#000",
      marginBottom: "5mm",
      pageBreakAfter: "always",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "2mm",
    },
    logoBox: {
      width: "20mm",
      height: "20mm",
      border: "1px solid #ccc",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "8px",
      textAlign: "center",
    },
    symbol: {
      width: "20mm",
      height: "20mm",
      background: "black",
      borderRadius: "0 0 50% 50%",
    },
    trackingNum: {
      fontSize: "15pt",
      fontWeight: "bold",
      textAlign: "center",
      margin: "2mm 0",
    },
    barcodeContainer: {
      display: "flex",
      justifyContent: "center",
      overflow: "hidden",
    },
    sectionTitle: {
      background: "#333",
      color: "white",
      fontWeight: "bold",
      padding: "1mm 2mm",
      marginTop: "2mm",
    },
    supplementaryHeader: {
      background: "#333",
      color: "white",
      fontWeight: "bold",
      padding: "2mm",
      textAlign: "center",
      fontSize: "10pt",
      marginBottom: "3mm",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "7pt",
      marginTop: "auto",
    },
    supplementaryTable: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "7pt",
      flex: 1,
    },
    td: { border: "1px solid black", padding: "1px 2px", maxHeight: "20px" },
    th: {
      border: "1px solid black",
      padding: "2px",
      backgroundColor: "#f0f0f0",
      fontWeight: "bold",
    },
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalWeight = items.reduce(
      (sum, item) => sum + parseFloat(String(item.weight).replace(",", ".")),
      0
    );
    const itemsValue = items.reduce(
      (sum, item) => sum + parseFloat(String(item.total).replace(",", ".")),
      0
    );
    const insurance = parseFloat(String(data.insurance).replace(",", "."));
    const freight = parseFloat(String(data.freight).replace(",", "."));
    const totalValue = itemsValue + freight + insurance;
    return {
      weight: totalWeight.toFixed(2).replace(".", ","),
      itemsValue: itemsValue.toFixed(2).replace(".", ","),
      value: totalValue.toFixed(2).replace(".", ","),
    };
  };
  const packet_type = "Standard";

  const totals = calculateTotals();

  const renderMainPage = (pageItems: typeof data.items) => (
    <div style={s.container}>
      <div style={s.headerRow}>
        <div style={s.logoBox}>Hello Goxtosas</div>
        <img
          src="/correios_logo.png"
          alt="Correios"
          style={{ height: "20mm" }}
        />
        <img
          src={`/logo_${packet_type.toLowerCase()}.png`}
          alt={packet_type}
          style={{ height: "20mm" }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "7pt",
          marginBottom: "1mm",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span>Order #: {data.orderNumber}</span>
          <span>PRC Remessa Conforme</span>
        </div>
        <div
          style={{
            textAlign: "right",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <strong style={{ fontSize: "9pt" }}>
            PACKET {packet_type.toUpperCase()}
          </strong>
          <span>Contrato {data.contract}</span>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid black",
          paddingTop: "1mm",
          display: "flex",
        }}
      >
        <div style={{ flexGrow: 1 }}>
          <div style={s.trackingNum}>{data.trackingId}</div>
          <div style={s.barcodeContainer}>
            <Barcode
              value={data.trackingId}
              width={1.2}
              height={60}
              displayValue={false}
              margin={0}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: "20pt",
                fontWeight: "bold",
                marginRight: "5mm",
              }}
            >
              CN
            </span>
            <span style={{ fontSize: "9pt" }}>23/12/25</span>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "1mm 0",
          fontSize: "9pt",
          display: "flex",
          flexDirection: "column",
          textAlign: "left",
        }}
      >
        <div style={{ marginBottom: "1mm" }}>
          Recebedor: ___________________________________________
        </div>
        <div>Assinatura: _________________________ Doc: ______________</div>
      </div>

      <div style={s.sectionTitle}>DESTINATÁRIO</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "1mm 0",
          alignItems: "left",
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            lineHeight: "1.2",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <strong>{data.recipient.name}</strong>
          <span>{data.recipient.address}</span>
          <span>{data.recipient.details}</span>
          <span>{data.recipient.cityState}</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <Barcode
            value={data.recipient.zip.replace("-", "")}
            width={1.2}
            height={30}
            displayValue={false}
          />
          <div style={{ fontSize: "12px", fontWeight: "bold" }}>
            {data.recipient.zip}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: "6pt",
          borderTop: "1px solid black",
          paddingTop: "1mm",
          marginBottom: "1mm",
        }}
      >
        <div style={{ textAlign: "left", marginBottom: "1mm" }}>
          <strong style={{ textAlign: "left" }}>
            Instrução do Remetente no caso de não nacionalização:
          </strong>
        </div>
        <div
          style={{
            display: "flex",
            textAlign: "left",
            justifyContent: "space-between",
          }}
        >
          {/* Left side - Instructions and Devolução */}
          <div
            style={{
              width: "65%",
              paddingRight: "2mm",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                marginBottom: "1mm",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span>[X] Retorno à origem</span>
              <span>
                Dúvidas e reclamações via correios.com.br - e-mail / site
              </span>
            </div>
            <div
              style={{
                paddingTop: "1mm",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <strong>DEVOLUÇÃO:</strong>
              <span style={{ fontSize: "5pt" }}>
                (Em caso de não ser possível entregar para):
              </span>
              <span>{data.sender.nameInBrazil}</span>
              <span>{data.sender.addressInBrazil}</span>
              <span>{data.sender.cep}</span>
            </div>
          </div>

          {/* Right side - Remetente */}
          <div
            style={{
              width: "35%",
              paddingLeft: "2mm",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <strong>Remetente:</strong>
            <span>{data.sender.nameAbroad}</span>
            <span>{data.sender.city}</span>
            <span>{data.sender.countryOfOrigin}</span>
            <span>{data.sender.salesSite}</span>
          </div>
        </div>
      </div>
      {/* Declaração para Alfândega */}
      <div
        style={{
          fontSize: "6pt",
          borderTop: "1px solid black",
          paddingTop: "1mm",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5mm",
          }}
        >
          <strong>Declaração para Alfândega</strong>
          <span style={{ fontSize: "5pt" }}>
            Pode ser aberto Ex Offício 1/1
          </span>
        </div>
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={{ ...s.th, width: "12%" }}>SH / NCM</th>
            <th style={{ ...s.th, width: "8%" }}>Qtde</th>
            <th style={{ ...s.th, width: "40%" }}>Descrição/nome e Conteúdo</th>
            <th style={{ ...s.th, width: "12%" }}>Peso (Kg)</th>
            <th style={{ ...s.th, width: "14%" }}>Unit BRL</th>
            <th style={{ ...s.th, width: "14%" }}>Value BRL</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((item, i) => (
            <tr key={i}>
              <td style={s.td}>{item.ncm}</td>
              <td style={s.td}>{item.qty}</td>
              <td style={s.td}>{item.desc}</td>
              <td style={s.td}>{item.weight}</td>
              <td style={s.td}>{item.unit}</td>
              <td style={s.td}>{item.total}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} style={{ ...s.td, textAlign: "left" }}>
              Frete BRL
            </td>
            <td style={s.td}>{data.freight}</td>
          </tr>
          <tr>
            <td colSpan={5} style={{ ...s.td, textAlign: "left" }}>
              Seguro BRL
            </td>
            <td style={s.td}>{data.insurance}</td>
          </tr>

          <tr>
            <td
              colSpan={5}
              style={{ ...s.td, textAlign: "left", fontWeight: "bold" }}
            >
              Total BRL - (Mercadorias + Frete + Seguro)
            </td>
            <td style={{ ...s.td, fontWeight: "bold" }}>{totals.value}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderSupplementaryPage = (
    pageItems: typeof data.items,
    pageNum: number
  ) => (
    <div style={s.supplementaryContainer}>
      <div
        style={{
          ...s.supplementaryHeader,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span>SUPPLEMENTARY</span>
        <span>CUSTOMS DECLARATION</span>
        <span>{data.trackingId}</span>
      </div>

      <table style={s.supplementaryTable}>
        <thead>
          <tr style={{height: "50px"}}>
            <th style={s.th}>SH/NCM</th>
            <th style={s.th}>QUANTITY</th>
            <th style={s.th}>DESCRIPTION</th>
            <th style={s.th}>WEIGHT (KG)</th>
            <th style={s.th}>UNIT USD</th>
            <th style={s.th}>VALUE USD</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((item, i) => (
            <tr  key={i} style={{height: "40px"}}>
              <td style={s.td}>{item.ncm}</td>
              <td style={s.td}>{item.qty}</td>
              <td style={s.td}>{item.desc}</td>
              <td style={s.td}>{item.weight}</td>
              <td style={s.td}>{item.unit}</td>
              <td style={s.td}>{item.total}</td>
            </tr>
          ))}
          {/* Add empty rows if this is the last page to show totals */}
          {pageNum === pages.length && (
            <tr style={{height: "40px"}}>
              <td
                colSpan={3}
                style={{ ...s.td, fontWeight: "bold", color: "#ff0000" }}
              >
                TOTAL (BRL) - (Mercadorias + Frete + Seguro)
              </td>
              <td style={{ ...s.td, fontWeight: "bold" }}>{totals.weight}</td>
              <td style={s.td}></td>
              <td style={{ ...s.td, fontWeight: "bold" }}>{totals.value}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <button
        onClick={generatePDF}
        style={{
          marginBottom: "20px",
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        Download PDF Label
      </button>

      {/* Printable Area */}
      <div ref={labelRef} style={{ all: "initial", backgroundColor: "white" }}>
        {pages.map((page, index) => (
          <div key={index}>
            {page.type === "main"
              ? renderMainPage(page.items)
              : renderSupplementaryPage(page.items, index + 1)}
          </div>
        ))}
      </div>
    </div>
  );
}
