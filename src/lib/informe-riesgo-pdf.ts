

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
  inasistentes?: Array<{ [key: string]: string }>;
  kpisTFG?: {
    TFG_E1: number;
    TFG_E2: number;
    TFG_E3: number;
    TFG_E4: number;
    TFG_E5: number;
    TFG_TOTAL: number;
  };
}

export interface PdfImages {
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

  let mainContent: any[] = [
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
      { ul: data.compromisos.map((t) => ({ text: t, style: "p" })) },
    ];
    
    if (data.kpisTFG) {
    mainContent.push(
      h("Resultados TFG por Estadio"),
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto'],
          body: [
            [{ text: "Estadio", style: "tableHeader" }, { text: "N° Pacientes", style: "tableHeader" }],
            ["Estadio 1 (TFG >= 90)", data.kpisTFG.TFG_E1],
            ["Estadio 2 (TFG 60-89)", data.kpisTFG.TFG_E2],
            ["Estadio 3 (TFG 30-59)", data.kpisTFG.TFG_E3],
            ["Estadio 4 (TFG 15-29)", data.kpisTFG.TFG_E4],
            ["Estadio 5 (TFG < 15)", data.kpisTFG.TFG_E5],
            [{text: "Total con Estadio Informado", bold: true}, {text: data.kpisTFG.TFG_TOTAL, bold: true}],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 8],
      }
    );
  }

  if (data.inasistentes && data.inasistentes.length > 0) {
    mainContent.push(
      h("Listado de Pacientes Inasistentes a Control"),
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', '*', '*'],
          body: [
            [
              { text: 'Tipo ID', style: 'tableHeader' },
              { text: 'N° ID', style: 'tableHeader' },
              { text: '1er Nombre', style: 'tableHeader' },
              { text: '2do Nombre', style: 'tableHeader' },
              { text: '1er Apellido', style: 'tableHeader' },
              { text: '2do Apellido', style: 'tableHeader' },
              { text: 'Teléfono', style: 'tableHeader' },
              { text: 'Dirección', style: 'tableHeader' },
            ],
            ...data.inasistentes.map(p => [
                p.tipo_id, p.id, p.p_nombre, p.s_nombre, p.p_apellido, p.s_apellido, p.tel, p.dir
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 8],
        fontSize: 8,
      }
    );
  }


  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [60, 88, 60, 74], 
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
      tableHeader: { bold: true, fontSize: 10, color: 'black' },
    },
    background: function(currentPage: number, pageSize: any) {
        if (!images?.background) return null;
        return {
            image: images.background,
            width: pageSize.width,
            height: pageSize.height,
            absolutePosition: { x: 0, y: 0 },
            opacity: 1
        };
    },
    content: mainContent
  };
  
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

    