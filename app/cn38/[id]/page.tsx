"use client";

import { useParams } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export default function CN38Page() {
  const params = useParams();
  const orderId = params.id as string;
  const labelRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Header fields
  const [eOfE, setEOfE] = useState("1 DE 1");
  
  // Left side fields
  const [officeOfOrigin, setOfficeOfOrigin] = useState("");
  const [originN, setOriginN] = useState("");
  const [airline, setAirline] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("pt-BR"));
  const [departureDate, setDepartureDate] = useState(new Date().toLocaleDateString("pt-BR"));
  
  // Right side fields
  const [deliveryBillNumber, setDeliveryBillNumber] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [time, setTime] = useState("");
  const [serviceMode, setServiceMode] = useState("standard"); // standard or express
  const [paymentType, setPaymentType] = useState("DDU"); // DDU, DRC, or tributo
  
  // Airport fields
  const [departureAirport, setDepartureAirport] = useState("");
  const [transitAirport, setTransitAirport] = useState("");
  const [arrivalAirport, setArrivalAirport] = useState("");
  
  // Dispatch data - array of rows
  const [dispatchRows, setDispatchRows] = useState([
    { dispatchNumber: "", serialNumber: "", weight: "", sealNumber: "", observations: "" },
    { dispatchNumber: "", serialNumber: "", weight: "", sealNumber: "", observations: "" },
    { dispatchNumber: "", serialNumber: "", weight: "", sealNumber: "", observations: "" },
    { dispatchNumber: "", serialNumber: "", weight: "", sealNumber: "", observations: "" },
    { dispatchNumber: "", serialNumber: "", weight: "", sealNumber: "", observations: "" },
  ]);
  
  const [subtotal, setSubtotal] = useState("");
  const [total, setTotal] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch order to get shopify_order_id
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

      if (!orderData?.shopify_order_id) {
        console.error("No shopify_order_id found for this order");
        setLoading(false);
        return;
      }

      // Fetch order items using shopify_order_id
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderData.shopify_order_id);

      if (orderItemsError) {
        console.error("Error fetching order items:", orderItemsError);
        setLoading(false);
        return;
      }

      // TODO: Process order items and populate state
      console.log("Order data:", orderData);
      console.log("Order items:", orderItems);

      setLoading(false);
    }

    fetchData();
  }, [orderId]);

  const generatePDF = async () => {
    const element = labelRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        ignoreElements: (el) => {
          return el.tagName === "BUTTON" || el.classList.contains("no-print");
        },
      });

      // A4 dimensions
      const pdfWidth = 210;
      const pdfHeight = 297;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Add image to fill A4 page
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`cn38-${orderId}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };
  
  const updateDispatchRow = (index: number, field: string, value: string) => {
    const newRows = [...dispatchRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setDispatchRows(newRows);
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading CN38 details...</p>
      </div>
    );
  }

  return (
    <div style={{ all: "initial", backgroundColor: "#e0e0e0", padding: "20px" }}>
      <div>
        {/* Input Controls Section */}
        <div
          className="no-print"
          style={{
            backgroundColor: "white",
            padding: "20px",
            marginBottom: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              marginBottom: "20px",
              fontSize: "20px",
              fontWeight: "bold",
              color: "#333",
            }}
          >
            Edit CN38 Fields
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                E de E
              </label>
              <input
                type="text"
                value={eOfE}
                onChange={(e) => setEOfE(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Office of Origin
              </label>
              <input
                type="text"
                value={officeOfOrigin}
                onChange={(e) => setOfficeOfOrigin(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                N
              </label>
              <input
                type="text"
                value={originN}
                onChange={(e) => setOriginN(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Delivery Bill Number
              </label>
              <input
                type="text"
                value={deliveryBillNumber}
                onChange={(e) => setDeliveryBillNumber(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Contract Number
              </label>
              <input
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                CIA AEREA (Airline)
              </label>
              <input
                type="text"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Flight Number
              </label>
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Date
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Time
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Departure Date
              </label>
              <input
                type="text"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Service Mode
              </label>
              <select
                value={serviceMode}
                onChange={(e) => setServiceMode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              >
                <option value="standard">Packet Standard</option>
                <option value="express">Packet Express</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Payment Type
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              >
                <option value="DDU">DDU</option>
                <option value="DRC">DRC</option>
                <option value="tributo">Tributo Antecipado</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Departure Airport
              </label>
              <input
                type="text"
                value={departureAirport}
                onChange={(e) => setDepartureAirport(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Transit Airport
              </label>
              <input
                type="text"
                value={transitAirport}
                onChange={(e) => setTransitAirport(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Arrival Airport
              </label>
              <input
                type="text"
                value={arrivalAirport}
                onChange={(e) => setArrivalAirport(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Subtotal
              </label>
              <input
                type="text"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Total
              </label>
              <input
                type="text"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>

          <h3 style={{ marginTop: "30px", marginBottom: "15px", fontSize: "16px", fontWeight: "600" }}>
            Dispatch Rows
          </h3>
          {dispatchRows.map((row, index) => (
            <div key={index} style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(5, 1fr)", 
              gap: "10px",
              marginBottom: "10px",
              padding: "10px",
              backgroundColor: "#f8f9fa",
              borderRadius: "4px"
            }}>
              <input
                type="text"
                placeholder="Dispatch #"
                value={row.dispatchNumber}
                onChange={(e) => updateDispatchRow(index, "dispatchNumber", e.target.value)}
                style={{
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}
              />
              <input
                type="text"
                placeholder="Serial #"
                value={row.serialNumber}
                onChange={(e) => updateDispatchRow(index, "serialNumber", e.target.value)}
                style={{
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}
              />
              <input
                type="text"
                placeholder="Weight (Kg)"
                value={row.weight}
                onChange={(e) => updateDispatchRow(index, "weight", e.target.value)}
                style={{
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}
              />
              <input
                type="text"
                placeholder="Seal #"
                value={row.sealNumber}
                onChange={(e) => updateDispatchRow(index, "sealNumber", e.target.value)}
                style={{
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}
              />
              <input
                type="text"
                placeholder="Observations"
                value={row.observations}
                onChange={(e) => updateDispatchRow(index, "observations", e.target.value)}
                style={{
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={generatePDF}
          className="no-print"
          style={{
            marginBottom: "20px",
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          Generate CN38 PDF
        </button>

        {/* CN38 Form */}
        <div ref={labelRef} style={{ backgroundColor: "white", padding: "0", display: "flex", justifyContent: "center" }}>
          <div style={{ 
            width: "210mm",
            height: "297mm",
            padding: "10mm",
            backgroundColor: "white",
            fontFamily: "Arial, sans-serif",
            fontSize: "10pt",
            boxSizing: "border-box",
            overflow: "hidden"
          }}>
            
            {/* Header */}
            <table style={{ width: "100%", border: "2px solid black", borderCollapse: "collapse", marginBottom: "0" }}>
              <tbody>
                <tr>
                  <td style={{ border: "2px solid black", padding: "8px", width: "40%" }}>
                    <div style={{ fontSize: "9pt" }}>Logo da Empresa</div>
                  </td>
                  <td style={{ border: "2px solid black", padding: "8px", textAlign: "center", width: "40%" }}>
                    <div style={{ fontWeight: "bold", fontSize: "11pt" }}>FATURA DE ENTREGA</div>
                    <div style={{ fontSize: "9pt", fontStyle: "italic" }}>(Delivery Bill)</div>
                  </td>
                  <td style={{ border: "2px solid black", padding: "8px", width: "20%", textAlign: "center" }}>
                    <div style={{ fontSize: "9pt" }}>{eOfE}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Main content section */}
            <table style={{ width: "100%", border: "2px solid black", borderCollapse: "collapse", borderTop: "none" }}>
              <tbody>
                <tr>
                  <td style={{ border: "2px solid black", padding: "8px", width: "40%", verticalAlign: "top" }}>
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ fontSize: "9pt", fontWeight: "bold" }}>OPERADOR DE ORIGEM</div>
                      <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Office of Origin)</div>
                      <div style={{ marginTop: "5px" }}>{officeOfOrigin}</div>
                    </div>
                    <div style={{ fontSize: "8pt", marginTop: "5px" }}>
                      <div>N: {originN}</div>
                    </div>
                  </td>
                  <td style={{ border: "2px solid black", padding: "8px", width: "60%", verticalAlign: "top" }} colSpan={2}>
                    <div style={{ marginBottom: "8px" }}>
                      <div style={{ fontSize: "9pt", fontWeight: "bold" }}>Nº FATURA DE ENTREGA</div>
                      <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Delivery Bill #) </div>
                      <div style={{ marginTop: "3px" }}>{deliveryBillNumber}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9pt", fontWeight: "bold" }}>Nº DO CONTRATO</div>
                      <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Contract Number)</div>
                      <div style={{ marginTop: "3px" }}>{contractNumber}</div>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style={{ border: "2px solid black", padding: "8px" }}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>CIA AÉREA</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Airline) </div>
                    <div style={{ marginTop: "3px" }}>{airline}</div>
                  </td>
                  <td style={{ border: "2px solid black", padding: "8px" }} colSpan={2}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>Nº VOO</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Flight #) </div>
                    <div style={{ marginTop: "3px" }}>{flightNumber}</div>
                  </td>
                </tr>

                <tr>
                  <td style={{ border: "2px solid black", padding: "8px" }}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>DATA</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Date) </div>
                    <div style={{ marginTop: "3px" }}>{date}</div>
                  </td>
                  <td style={{ border: "2px solid black", padding: "8px" }} colSpan={2}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>HORA</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Time) </div>
                    <div style={{ marginTop: "3px" }}>{time}</div>
                  </td>
                </tr>

                <tr>
                  <td style={{ border: "2px solid black", padding: "8px" }}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>DATA DE PARTIDA</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Date of Departure)</div>
                    <div style={{ marginTop: "3px" }}>{departureDate}</div>
                  </td>
                  <td style={{ border: "2px solid black", padding: "8px" }} colSpan={2}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>MODALIDADE DE SERVIÇO</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic", marginBottom: "8px" }}>(Service mode no.)</div>
                    <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "9pt" }}>
                        <input type="checkbox" checked={serviceMode === "standard"} readOnly style={{ width: "15px", height: "15px" }} />
                        Packet Standard
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "9pt" }}>
                        <input type="checkbox" checked={serviceMode === "express"} readOnly style={{ width: "15px", height: "15px" }} />
                        Packet Express
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: "15px", marginTop: "10px", fontSize: "9pt" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <input type="checkbox" checked={paymentType === "DDU"} readOnly style={{ width: "15px", height: "15px" }} />
                        DDU
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <input type="checkbox" checked={paymentType === "DRC"} readOnly style={{ width: "15px", height: "15px" }} />
                        DRC
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <input type="checkbox" checked={paymentType === "tributo"} readOnly style={{ width: "15px", height: "15px" }} />
                        Tributo Antecipado / Tax Anticipation 
                      </label>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Airports section */}
            <table style={{ width: "100%", border: "2px solid black", borderCollapse: "collapse", borderTop: "none" }}>
              <tbody>
                <tr>
                  <td style={{ border: "2px solid black", padding: "8px", textAlign: "center", width: "33.33%" }}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>AEROPORTO DE PARTIDA</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Airport of departure)</div>
                    <div style={{ fontSize: "8pt" }}></div>
                    <div style={{ marginTop: "10px", minHeight: "30px" }}>{departureAirport}</div>
                  </td>
                  <td style={{ border: "2px solid black", padding: "8px", textAlign: "center", width: "33.33%" }}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>AEROPORTO DE TRANSBORDO</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Airport of transshipment)</div>
                    <div style={{ fontSize: "8pt" }}></div>
                    <div style={{ marginTop: "10px", minHeight: "30px" }}>{transitAirport}</div>
                  </td>
                  <td style={{ border: "2px solid black", padding: "8px", textAlign: "center", width: "33.33%" }}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>AEROPORTO DE CHEGADA</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Airport of Offloading)</div>
                    <div style={{ fontSize: "8pt" }}></div>
                    <div style={{ marginTop: "10px", minHeight: "30px" }}>{arrivalAirport}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Dispatch data section */}
            <table style={{ width: "100%", border: "2px solid black", borderCollapse: "collapse", borderTop: "none" }}>
              <thead>
                <tr>
                  <td colSpan={5} style={{ border: "2px solid black", padding: "5px", textAlign: "center", backgroundColor: "#f0f0f0" }}>
                    <div style={{ fontSize: "10pt", fontWeight: "bold" }}>DADOS DO DESPACHO</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Dispatch Data)</div>
                  </td>
                </tr>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <th style={{ border: "2px solid black", padding: "6px", fontSize: "8pt", textAlign: "center", width: "20%" }}>
                    <div style={{ fontWeight: "bold" }}>Nº DO DESPACHO</div>
                    <div style={{ fontStyle: "italic" }}>(Dispatch #)</div>
                   
                  </th>
                  <th style={{ border: "2px solid black", padding: "6px", fontSize: "8pt", textAlign: "center", width: "20%" }}>
                    <div style={{ fontWeight: "bold" }}>Nº SERIAL DE MALA</div>
                    <div style={{ fontStyle: "italic" }}>(Receptacle Serial #)</div>
                 
                  </th>
                  <th style={{ border: "2px solid black", padding: "6px", fontSize: "8pt", textAlign: "center", width: "20%" }}>
                    <div style={{ fontWeight: "bold" }}>PESO BRUTO DA MALA Kg</div>
                    <div style={{ fontStyle: "italic" }}>(Gross Weight of Bags Kg)</div>
                   
                  </th>
                  <th style={{ border: "2px solid black", padding: "6px", fontSize: "8pt", textAlign: "center", width: "20%" }}>
                    <div style={{ fontWeight: "bold" }}>Nº DO LACRE DA MALA</div>
                    <div style={{ fontStyle: "italic" }}>(Bag Seal #)</div>
                   
                  </th>
                  <th style={{ border: "2px solid black", padding: "6px", fontSize: "8pt", textAlign: "center", width: "20%" }}>
                    <div style={{ fontWeight: "bold" }}>OBSERVAÇÕES</div>
                    <div style={{ fontStyle: "italic" }}>(Observations)</div>
               
                  </th>
                </tr>
              </thead>
              <tbody>
                {dispatchRows.map((row, index) => (
                  <tr key={index} style={{ height: "25px" }}>
                    <td style={{ border: "2px solid black", padding: "4px", fontSize: "9pt", textAlign: "center", height: "25px" }}>
                      {row.dispatchNumber}
                    </td>
                    <td style={{ border: "2px solid black", padding: "4px", fontSize: "9pt", textAlign: "center", height: "25px" }}>
                      {row.serialNumber}
                    </td>
                    <td style={{ border: "2px solid black", padding: "4px", fontSize: "9pt", textAlign: "center", height: "25px" }}>
                      {row.weight}
                    </td>
                    <td style={{ border: "2px solid black", padding: "4px", fontSize: "9pt", textAlign: "center", height: "25px" }}>
                      {row.sealNumber}
                    </td>
                    <td style={{ border: "2px solid black", padding: "4px", fontSize: "9pt", textAlign: "center", height: "25px" }}>
                      {row.observations}
                    </td>
                  </tr>
                ))}
                {[...Array(8)].map((_, index) => (
                  <tr key={`empty-${index}`} style={{ height: "25px" }}>
                    <td style={{ border: "2px solid black", padding: "4px", height: "25px" }}>&nbsp;</td>
                    <td style={{ border: "2px solid black", padding: "4px", height: "25px" }}>&nbsp;</td>
                    <td style={{ border: "2px solid black", padding: "4px", height: "25px" }}>&nbsp;</td>
                    <td style={{ border: "2px solid black", padding: "4px", height: "25px" }}>&nbsp;</td>
                    <td style={{ border: "2px solid black", padding: "4px", height: "25px" }}>&nbsp;</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <td colSpan={2} style={{ border: "2px solid black", padding: "6px", fontWeight: "bold", textAlign: "right" }}>
                    SUBTOTAL 
                  </td>
                  <td style={{ border: "2px solid black", padding: "6px", textAlign: "center" }}>{subtotal}</td>
                  <td colSpan={2} style={{ border: "2px solid black", padding: "6px" }}>&nbsp;</td>
                </tr>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <td colSpan={2} style={{ border: "2px solid black", padding: "6px", fontWeight: "bold", textAlign: "right" }}>
                    TOTAL 
                  </td>
                  <td style={{ border: "2px solid black", padding: "6px", textAlign: "center", fontWeight: "bold" }}>{total}</td>
                  <td colSpan={2} style={{ border: "2px solid black", padding: "6px" }}>&nbsp;</td>
                </tr>
              </tbody>
            </table>

            {/* Signature section */}
            <table style={{ width: "100%", border: "2px solid black", borderCollapse: "collapse", borderTop: "none" }}>
              <thead>
                <tr>
                  <td colSpan={3} style={{ border: "2px solid black", padding: "5px", textAlign: "center", backgroundColor: "#f0f0f0" }}>
                    <div style={{ fontSize: "10pt", fontWeight: "bold" }}>ASSINATURA DOS OPERADORES</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Signature)</div>
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: "2px solid black", padding: "20px", textAlign: "center", width: "33.33%", verticalAlign: "bottom" }}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>OPERADOR DE ORIGEM</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Dispatching Office of Exchange)</div>
                    <div style={{ marginTop: "40px", borderTop: "1px solid #666", paddingTop: "5px" }}>
                      <div style={{ fontSize: "8pt" }}>Assinatura / Signature</div>
                    </div>
                  </td>
                  <td style={{ border: "2px solid black", padding: "20px", textAlign: "center", width: "33.33%", verticalAlign: "bottom" }}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>TRANSPORTADOR</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(The Official of the Carrier or Airport)</div>
                    <div style={{ marginTop: "40px", borderTop: "1px solid #666", paddingTop: "5px" }}>
                      <div style={{ fontSize: "8pt" }}>Assinatura / Signature</div>
                    </div>
                  </td>
                  <td style={{ border: "2px solid black", padding: "20px", textAlign: "center", width: "33.33%", verticalAlign: "bottom" }}>
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>OPERADOR DE DESTINO</div>
                    <div style={{ fontSize: "8pt", fontStyle: "italic" }}>(Office of Exchange of destination)</div>
                    <div style={{ marginTop: "40px", borderTop: "1px solid #666", paddingTop: "5px" }}>
                      <div style={{ fontSize: "8pt" }}>Assinatura / Signature</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

          </div>
        </div>
      </div>
    </div>
  );
}

