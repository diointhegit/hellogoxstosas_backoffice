"use client";
import Barcode from "react-barcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

import { useParams } from "next/navigation";
import { useRef, CSSProperties, useMemo, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UnitizerPage() {
  const params = useParams();
  const orderId = params.id as string;
  const labelRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // State placeholders for unitizer data
  const [dispatchNumber, setDispatchNumber] = useState("123456");
  const [serialNumber, setSerialNumber] = useState("BRA001");
  const [flightNumber, setFlightNumber] = useState("LA123");
  const [awbNumber, setAwbNumber] = useState("123-45678901");
  const [dispatchDate, setDispatchDate] = useState(
    new Date().toLocaleDateString("pt-BR")
  );
  const [originAirport, setOriginAirport] = useState("GRU - São Paulo");
  const [destinationAirport, setDestinationAirport] = useState("Unknown");
  const [quantity, setQuantity] = useState("1");
  const [weight, setWeight] = useState("0.5");
  const [service, setService] = useState("PACKET STANDARD");
  const [barcode, setBarcode] = useState("USDHLGBRSAODANX2000100100020");

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

      if (orderItems && orderItems.length > 0) {
        // Calculate total quantity
        setQuantity(orderItems.length.toString());

        // Calculate total weight (use 0.5 kg if weight is null)
        const totalWeight = orderItems.reduce((sum, item) => {
          const itemWeight = item.weight ?? 0.5;
          return sum + itemWeight;
        }, 0);
        setWeight(totalWeight.toFixed(2));
      }

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
          return el.tagName === "BUTTON";
        },
      });

      // PDF dimensions (100mm x 150mm in portrait)
      const pdfWidth = 200;
      const pdfHeight = 210;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight] as [number, number],
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      // Calculate scaling to fit the page
      let finalWidth = imgWidth;
      let finalHeight = imgHeight;
      let xOffset = 0;
      let yOffset = 0;

      if (imgHeight > pdfHeight) {
        // Scale down to fit height
        finalHeight = pdfHeight;
        finalWidth = (canvas.width * pdfHeight) / canvas.height;
        xOffset = (pdfWidth - finalWidth) / 2;
      } else {
        // Center vertically
        yOffset = (pdfHeight - finalHeight) / 2;
      }

      pdf.addImage(imgData, "PNG", xOffset, yOffset, finalWidth, finalHeight);
      
      pdf.save(`unitizer-${orderId}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Loading unitizer details...</p>
      </div>
    );
  }



  return (
    <div style={{ all: "initial", backgroundColor: "#e0e0e0", padding: "20px" }}>
      <div>
        {/* Input Controls Section */}
        <div style={{ 
          backgroundColor: "white", 
          padding: "20px", 
          marginBottom: "20px", 
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "bold", color: "#333" }}>
            Edit Unitizer Fields
          </h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Numero do Despacho
              </label>
              <input
                type="text"
                value={dispatchNumber}
                onChange={(e) => setDispatchNumber(e.target.value)}
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
                Numero serial da Mala
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
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
                N do Vôo
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
                N AWB
              </label>
              <input
                type="text"
                value={awbNumber}
                onChange={(e) => setAwbNumber(e.target.value)}
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
                Data do despacho
              </label>
              <input
                type="text"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
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
                Aeroporto de Origem
              </label>
              <input
                type="text"
                value={originAirport}
                onChange={(e) => setOriginAirport(e.target.value)}
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
                Aeroporto de Destino
              </label>
              <input
                type="text"
                value={destinationAirport}
                onChange={(e) => setDestinationAirport(e.target.value)}
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
                Quantidade de itens (calculado)
              </label>
              <input
                type="text"
                value={quantity}
                disabled
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: "#f5f5f5",
                  color: "#666",
                  cursor: "not-allowed"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Peso KG (calculado)
              </label>
              <input
                type="text"
                value={weight}
                disabled
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: "#f5f5f5",
                  color: "#666",
                  cursor: "not-allowed"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Serviço
              </label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500", fontSize: "14px" }}>
                Barcode
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
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
        </div>

        <button
          onClick={generatePDF}
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
          Generate Unitizer PDF
        </button>

        <div ref={labelRef} className="w-scren flex justify-center items-center">
          
          <div className="border-1 grid grid-cols-10  border-black w-[900px] ">

              <div className="col-span-2 border-1 border-black size grid grid-flow-row grid-rows-15" >
                <div className="border-1 row-span-3 flex justify-center items-center border-black w-full">
                 <p>HELLO GOXTOSAS</p>
                </div>
                <div className="border-1 flex flex-col justify-center px-2 text-sm row-span-3 border-black w-full">
                 <b>Numero do Despacho</b>
                 <p>{dispatchNumber}</p>
                </div>

                <div className="row-span-2  flex flex-col justify-center px-2 text-sm border-1 border-black">
                <b>Numero serial da Mala</b>
                <p>{serialNumber}</p>
                </div>

                <div className="row-span-2  flex flex-col justify-center px-2 text-sm border-1 border-black">
                <b>Data do despacho</b>
                <p>{dispatchDate}</p>
                </div>
                
                <div className="row-span-1 border-1  flex flex-col justify-center px-2 text-sm border-black">
                <b>Quantidade de itens
                  <p>{quantity}</p>
                </b>
                              </div>
                
                <div className="row-span-1 border-1  flex flex-col justify-center px-2 text-sm border-black">
                <b>Peso KG</b>
                <p>{weight}</p>
                </div>
                
                <div className="row-span-3  flex flex-col justify-center px-2 text-sm border-1 border-black">
                <b>Serviço</b>
                <p>{service}</p>  
                </div>
              </div>

              <div className="col-span-8 border-1 border-black size grid grid-flow-row grid-rows-15" >
                <div className="row-span-3 flex justify-between">
                   <img src="/correios_logo_2.png" alt="Correios Logo" className="h-[120px] w-[150px]" />
                   <div className="flex items-center px-5">

                   <img src={`/logo_${service.trim().split(/\s+/).pop()}.png`} alt="Correios Logo" className="h-[100px] max-w-[100px]" />
                   <b className="text-lg">{service}</b>
                   </div>
                   
                </div>
                <div className="row-span-3 border-1 border border-black text-sm  flex justify-between">

                <b className="px-5 py-2">Empresa Brasileira de Correios e Telégrafos<br/>
                Centro Internacional de São Paul - SE/SPM <br/>
                Rua Mergenthaler, 568, bloco III, 5º andar, Vila Leopoldina <br/>
                CEP: 05301-000, São Paulo - SP <br/>
                CNPJ: 34.028.316/7105-85
                </b>  
                  
<div className="flex items-end justify-center w-1/3">

                  <p className="bg-black w-[100%] h-[50px] flex items-end justify-center text-white font-bold text-5xl">1</p>
</div>
                 </div>
                <div className="border-1 border-black row-span-2 grid grid-cols-2">
                    <div className="flex flex-col justify-center px-2 text-sm border-1 border-black">
                      <b>N do Vôo</b>
                      <p>{flightNumber}</p>
                    </div>
                    <div  className="flex flex-col justify-center px-2 text-sm border-1 border-black">
                      <b>N AWB</b>
                      <p>{awbNumber}</p>
                    </div>
                  
                </div>
                <div className="row-span-2 grid grid-cols-2">
                  <div className="flex flex-col justify-center px-2 text-sm border-1 border-black">
                    <b>Aeroporto de Origem</b>
                    <p>{originAirport}</p>
                  </div>
                  <div className="flex flex-col justify-center px-2 text-sm border-1 border-black">
                    <b>Aeroporto de Destino</b>
                    <p>{destinationAirport}</p>
                  </div>
                </div>
               
                <div className="row-span-5 max-h-[200px] border-1 border-black flex justify-center items-center">

              <Barcode value={barcode} />
                </div>
              </div>
             </div>
            

          
        </div>
    </div>
    </div>
  );
}

