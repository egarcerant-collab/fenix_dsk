// src/lib/informe-riesgo-pdf.ts
// Genera un PDF con el esquema solicitado usando pdfmake.
// A4, cuerpo 12 pt, títulos en negrilla. Si registras Arial, la usará;
// de lo contrario usará la fuente por defecto (Roboto).

export type Texto = string | (string | { text: string; bold?: boolean })[];

export interface InformeDatos {
  encabezado: {
    proceso: string;
    formato: string;
    entidad: string;
    vigencia: string;
    lugarFecha: string;
  };
  referencia: Texto;
  analisisResumido: Texto[];
  datosAExtraer: Array<{ label: string; valor: string }>;
  calidadDato: Texto[];
  observaciones: Texto[];
  compromisos: Texto[];
  creditos: {
    elaboro: string;
    reviso: string;
    aprobo: string;
    participantes?: string[];
  };
}

export interface PdfImages {
  header: string;
  footer: string;
  background: string;
}


// ------------------------------------------------------------
// (Opcional) Registrar Arial. Sustituye las constantes con tus TTF en base64.
// Si no las defines, pdfmake usará Roboto y todo seguirá funcionando.
export async function registerArialIfAvailable(pdfMake: any) {
  // Coloca tus TTF en base64 (sin encabezado data:) si quieres Arial real.
  const ARIAL = "";            // <-- "AAEAAA..." (Arial.ttf en base64)
  const ARIAL_BOLD = "";       // <-- (Arial Bold.ttf en base64)
  const ARIAL_ITALIC = "";     // <-- (Arial Italic.ttf en base64)
  const ARIAL_BOLDITALIC = ""; // <-- (Arial Bold Italic.ttf en base64)

  if (ARIAL && ARIAL_BOLD) {
    pdfMake.vfs = pdfMake.vfs || {};
    pdfMake.vfs["Arial.ttf"] = ARIAL;
    pdfMake.vfs["Arial-Bold.ttf"] = ARIAL_BOLD;
    if (ARIAL_ITALIC) pdfMake.vfs["Arial-Italic.ttf"] = ARIAL_ITALIC;
    if (ARIAL_BOLDITALIC) pdfMake.vfs["Arial-BoldItalic.ttf"] = ARIAL_BOLDITALIC;

    pdfMake.fonts = {
      ...(pdfMake.fonts || {}),
      Arial: {
        normal: "Arial.ttf",
        bold: "Arial-Bold.ttf",
        italics: ARIAL_ITALIC ? "Arial-Italic.ttf" : "Arial.ttf",
        bolditalics: ARIAL_BOLDITALIC ? "Arial-BoldItalic.ttf" : "Arial-Bold.ttf",
      },
    };
  }
}

// ------------------------------------------------------------
export function buildDocDefinition(data: InformeDatos, images?: PdfImages): any {
  const h = (t: string) => ({ text: t, style: "h1", margin: [0, 10, 0, 4] });
  const p = (t: Texto) => ({ text: t as any, style: "p", margin: [0, 0, 0, 4] });

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60], // izq, sup, der, inf
    info: {
      title: "Evaluación de Indicadores – Gestión del Riesgo",
      author: "Dirección del Riesgo en Salud",
      subject: "Informe de evaluación HTA/DM/Gestantes",
      keywords: "salud pública, riesgo, indicadores, HTA, DM",
    },
    defaultStyle: { fontSize: 12, lineHeight: 1.2, font: "Roboto", alignment: 'justify' },
    styles: {
      h1: { bold: true, fontSize: 12 },
      h2: { bold: true, fontSize: 12, margin: [0, 8, 0, 4] },
      p: { fontSize: 12 },
      small: { fontSize: 10 },
      tableHeader: { bold: true, fontSize: 12 },
    },
    content: [
      // Encabezado
      h("Encabezado"),
      {
        style: "p",
        margin: [0, 0, 0, 6],
        table: {
          widths: ["auto", "*"],
          body: [
            [{ text: "Proceso:", bold: true }, data.encabezado.proceso],
            [{ text: "Formato:", bold: true }, data.encabezado.formato],
            [{ text: "Entidad evaluada:", bold: true }, data.encabezado.entidad],
            [{ text: "Vigencia del análisis:", bold: true }, data.encabezado.vigencia],
            [{ text: "Lugar/Fecha de evaluación:", bold: true }, data.encabezado.lugarFecha],
          ],
        },
        layout: "lightHorizontalLines",
      },

      // Referencia
      h("Referencia"),
      p(data.referencia),

      // Análisis resumido
      h("Análisis resumido"),
      {
        ul: data.analisisResumido.map((t) => ({ text: t, style: "p" })),
        margin: [0, 0, 0, 8],
      },

      // Datos a extraer
      h("Datos a extraer"),
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto"],
          body: [
            [
              { text: "Campo", style: "tableHeader" },
              { text: "Valor", style: "tableHeader" },
            ],
            ...data.datosAExtraer.map((r) => [r.label, r.valor]),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 8],
      },

      // Calidad del dato
      h("Calidad del dato (hallazgos)"),
      { ul: data.calidadDato.map((t) => ({ text: t, style: "p" })) },

      // Observaciones específicas
      h("Observaciones específicas"),
      { ul: data.observaciones.map((t) => ({ text: t, style: "p" })) },

      // Compromisos y acciones
      h("Compromisos y acciones"),
      { ol: data.compromisos.map((t) => ({ text: t, style: "p" })) },

      // Créditos / Firmas
      h("Créditos / Firmas"),
      {
        columns: [
          { width: "*", text: `Elaboró: ${data.creditos.elaboro}`, style: "p" },
          { width: "*", text: `Revisó: ${data.creditos.reviso}`, style: "p" },
          { width: "*", text: `Aprobó: ${data.creditos.aprobo}`, style: "p" },
        ],
        margin: [0, 4, 0, 6],
      },
      data.creditos.participantes?.length
        ? p([
            { text: "Participantes: ", bold: true },
            data.creditos.participantes.join(", "),
          ])
        : {},
    ],
  };

  if(images) {
    if (images.background) {
      docDefinition.background = {
        image: images.background,
        width: 100,
        alignment: 'right',
        margin: [0, 0, 20, 0]
      };
    }
    if(images.header) {
        docDefinition.header = {
            image: images.header,
            width: 150,
            alignment: 'right',
            margin: [0, 20, 40, 0]
        };
    }
    if(images.footer) {
        docDefinition.footer = {
            image: images.footer,
            width: 595, // A4 width
            height: 50,
            margin: [0, 0, 0, 0]
        };
    }
  }
  return docDefinition;
}

// ------------------------------------------------------------
export async function descargarInformePDF(
  datos: InformeDatos,
  images?: PdfImages,
  nombre = "Informe_Evaluacion_Riesgo.pdf"
) {
  // Import dinámico para evitar problemas de SSR en Next/Firebase Studio
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const vfsFonts = (await import("pdfmake/build/vfs_fonts")).default;

  // vfs por defecto (Roboto); si registras Arial, se añadirá encima
  (pdfMake as any).vfs = vfsFonts;

  // Registrar Arial si proporcionaste las TTF en base64
  await registerArialIfAvailable(pdfMake);

  const docDef = buildDocDefinition(datos, images);
  pdfMake.createPdf(docDef).download(nombre);
}
