export interface PdfImages { background: string; }

export interface InformeDatos {
  encabezado: {
    proceso: string; formato: string; entidad: string;
    vigencia: string; lugarFecha: string;
  };
  corte: { month: number; year: number; monthName: string };
  prevalencia: {
    poblacion1869: number; htaEstimados: number; htaMeta: number;
    dmEstimados: number; dmMeta: number; htaReportados: number; dmReportados: number;
  };
  analisisData: {
    totalPacientes: number; soloHta: number; soloDm: number; htaDm: number;
    estadificados: number; sinEstadificarCount: number;
  };
  kpisTFG: {
    E1: number; E2: number; E3: number; E4: number; E5: number;
    total: number; sinEstadificar: number;
  };
  cumplimientos: {
    creatDenom: number; creatNum: number; range12: string;
    hba1cDenom: number; hba1cNum: number; range6: string;
    microalbDenom: number; microalbNum: number; inasistentesCount: number;
  };
  tablas: {
    captacionHTA: Array<{
      dpto: string; municipio: string; ips: string; poblacion: number;
      htaEst: number; htaMeta: number; htaCasos: number;
      htaPctMeta: string; htaPctPrev: string;
    }>;
    captacionDM: Array<{
      dpto: string; municipio: string; ips: string; poblacion: number;
      dmEst: number; dmMeta: number; dmCasos: number;
      dmPctMeta: string; dmPctPrev: string;
    }>;
    htaMayoresMenores: Array<{
      dpto: string; municipio: string; ips: string; poblacion: number;
      may60Denom: number; may60Num: number; may60Pct: string;
      men60Denom: number; men60Num: number; men60Pct: string;
    }>;
    dmControlados: Array<{
      dpto: string; municipio: string; ips: string; poblacion: number;
      denom: number; num: number; pct: string;
    }>;
    laboratorios: Array<{
      dpto: string; municipio: string; ips: string; poblacion: number;
      creatDenom: number; creatNum: number; creatPct: string;
      hba1cDenom: number; hba1cNum: number; hba1cPct: string;
      microalbDenom: number; microalbNum: number; microalbPct: string;
    }>;
  };
  analisisComportamiento: string[];
  calidadDato: string[]; observaciones: string[]; compromisos: string[];
  inasistentes?: Array<{
    tipo_id: string; id: string; p_nombre: string; s_nombre: string;
    p_apellido: string; s_apellido: string; tel: string; dir: string;
  }>;
  sinEstadificar?: Array<{
    tipo_id: string; id: string; p_nombre: string; s_nombre: string;
    p_apellido: string; s_apellido: string;
  }>;
}

// ── Layout de tabla con cabecera azul ─────────────────────────────────────────
const headerLayout = {
  hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
  vLineWidth: () => 0.5,
  hLineColor: (i: number) => i === 0 || i === 1 ? '#1a3a5c' : '#cccccc',
  vLineColor: () => '#cccccc',
  fillColor: (i: number) => i === 0 ? '#1a3a5c' : (i % 2 === 0 ? '#f9f9f9' : null),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const th = (text: string) => ({
  text: String(text ?? ''), style: 'tableHeader',
  alignment: 'center', margin: [2, 3, 2, 3],
});
const td = (text: any, left = false) => ({
  text: String(text ?? ''), style: 'tableCell',
  alignment: left ? 'left' : 'center', margin: [2, 2, 2, 2],
});
const h1 = (text: string) => ({
  text, bold: true, fontSize: 11, color: '#1a3a5c', margin: [0, 10, 0, 4],
});
const p = (text: string) => ({ text, fontSize: 10, margin: [0, 0, 0, 4] });

// Evita body vacío que cuelga pdfMake
const safeBody = (header: any[], rows: any[][]): any[][] =>
  rows.length > 0
    ? [header, ...rows]
    : [header, [{ text: 'Sin datos', colSpan: header.length, alignment: 'center', fontSize: 8, margin: [2, 2, 2, 2] }, ...Array(header.length - 1).fill({}) ]];

// ── buildDocDefinition ────────────────────────────────────────────────────────
export function buildDocDefinition(data: InformeDatos, images?: PdfImages): any {
  const { corte, prevalencia: prev, analisisData: ad, kpisTFG, cumplimientos: cum } = data;

  const content: any[] = [

    // ── 1. Encabezado ─────────────────────────────────────────────────────
    {
      table: {
        widths: ['auto', '*'],
        body: [
          [{ text: 'Proceso:', bold: true, fontSize: 10 }, { text: data.encabezado.proceso, fontSize: 10 }],
          [{ text: 'Formato:', bold: true, fontSize: 10 }, { text: data.encabezado.formato, fontSize: 10 }],
          [{ text: 'Entidad evaluada:', bold: true, fontSize: 10 }, { text: data.encabezado.entidad, fontSize: 10 }],
          [{ text: 'Vigencia:', bold: true, fontSize: 10 }, { text: data.encabezado.vigencia, fontSize: 10 }],
          [{ text: 'Lugar/Fecha:', bold: true, fontSize: 10 }, { text: data.encabezado.lugarFecha, fontSize: 10 }],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    },

    // ── 2. Referencia ─────────────────────────────────────────────────────
    h1('REF. EVALUACION DATA ENFERMEDADES PRECURSORAS HTA - DM'),
    p(
      `Posterior al analisis de la informacion reportada en la Data de Enfermedades Precursoras ` +
      `(HTA y DM) entregadas por su entidad de los usuarios atendidos a corte ${corte.monthName} ${corte.year}, ` +
      `se procede a realizar la evaluacion de los indicadores de gestion del riesgo.`
    ),

    // ── 3. Prevalencia ────────────────────────────────────────────────────
    h1('PREVALENCIA HTA Y DM'),
    p(
      `Afiliados con Edad entre 18 y 69 anos: ${prev.poblacion1869}. ` +
      `Prevalencia Nacional HTA 22.8%: se estima ${prev.htaEstimados} Hipertensos. ` +
      `Meta HTA 16.26%: ${prev.htaMeta} pacientes. ` +
      `Prevalencia DM 3.5%: se estima ${prev.dmEstimados} Diabeticos. ` +
      `Meta DM 60%: ${prev.dmMeta} pacientes. ` +
      `La IPSI reporta ${prev.htaReportados} pacientes con HTA y ${prev.dmReportados} con DM.`
    ),

    // ── 4. Analisis Data HTA-DM ───────────────────────────────────────────
    h1('ANALISIS DE DATA HTA - DM'),
    {
      ul: [
        `Total pacientes: ${ad.totalPacientes}`,
        `Solo HTA: ${ad.soloHta}`,
        `Solo DM: ${ad.soloDm}`,
        `HTA + DM: ${ad.htaDm}`,
        `Estadificados TFG: ${ad.estadificados}`,
        `Sin Estadificar: ${ad.sinEstadificarCount}`,
      ],
      fontSize: 10, margin: [0, 0, 0, 6],
    },

    // Tabla TFG
    {
      table: {
        headerRows: 1,
        widths: ['*', 70],
        body: [
          [th('ESTADIO'), th(corte.monthName)],
          [td('Estadio I  (TFG >= 90)', true), td(kpisTFG.E1)],
          [td('Estadio II (TFG 60-89)', true), td(kpisTFG.E2)],
          [td('Estadio III (TFG 30-59)', true), td(kpisTFG.E3)],
          [td('Estadio IV (TFG 15-29)', true), td(kpisTFG.E4)],
          [td('Estadio V  (TFG < 15)', true), td(kpisTFG.E5)],
          [{ text: 'SIN ESTADIFICAR', bold: true, fontSize: 8, margin: [2, 2, 2, 2] }, { text: String(kpisTFG.sinEstadificar), bold: true, fontSize: 8, alignment: 'center', margin: [2, 2, 2, 2] }],
          [{ text: 'TOTAL CON ESTADIO', bold: true, fontSize: 8, margin: [2, 2, 2, 2] }, { text: String(kpisTFG.total), bold: true, fontSize: 8, alignment: 'center', margin: [2, 2, 2, 2] }],
        ],
      },
      layout: headerLayout,
      margin: [0, 4, 0, 8],
    },

    p(
      `Creatinina: ${cum.creatNum} de ${cum.creatDenom} con resultado vigente (${cum.range12}) = ${cum.creatDenom > 0 ? ((cum.creatNum / cum.creatDenom) * 100).toFixed(1) : 0}%.`
    ),
    p(
      `HbA1c: ${cum.hba1cNum} de ${cum.hba1cDenom} pacientes DM en semestre (${cum.range6}) = ${cum.hba1cDenom > 0 ? ((cum.hba1cNum / cum.hba1cDenom) * 100).toFixed(1) : 0}%.`
    ),
    p(
      `Microalbuminuria: ${cum.microalbNum} de ${cum.microalbDenom} con resultado vigente (${cum.range12}) = ${cum.microalbDenom > 0 ? ((cum.microalbNum / cum.microalbDenom) * 100).toFixed(1) : 0}%.`
    ),
    p(`Inasistentes a control: ${cum.inasistentesCount} usuarios. Ver ANEXO 1.`),

    // ── 5. Indicador Captacion HTA ────────────────────────────────────────
    h1('INDICADOR DE CAPTACION PARA HIPERTENSION'),
    {
      table: {
        headerRows: 1,
        widths: [45, 55, '*', 32, 32, 32, 32, 32, 32],
        body: safeBody(
          [th('DPTO'), th('MUNICIPIO'), th('IPS'), th('POB\n18-69'), th('PREV\n22.8%'), th('META\n16.26%'), th('CASOS\nHTA'), th('%\nvs META'), th('%\nvs PREV')],
          data.tablas.captacionHTA.map(r => [
            td(r.dpto), td(r.municipio), td(r.ips, true), td(r.poblacion),
            td(r.htaEst), td(r.htaMeta), td(r.htaCasos), td(r.htaPctMeta), td(r.htaPctPrev),
          ])
        ),
      },
      layout: headerLayout,
      margin: [0, 0, 0, 8],
    },

    // ── 6. Indicador Captacion DM ─────────────────────────────────────────
    h1('INDICADOR DE CAPTACION PARA DIABETES MELLITUS'),
    {
      table: {
        headerRows: 1,
        widths: [45, 55, '*', 32, 32, 32, 32, 32, 32],
        body: safeBody(
          [th('DPTO'), th('MUNICIPIO'), th('IPS'), th('POB\n18-69'), th('PREV\n3.5%'), th('META\n60%'), th('CASOS\nDM'), th('%\nvs META'), th('%\nvs PREV')],
          data.tablas.captacionDM.map(r => [
            td(r.dpto), td(r.municipio), td(r.ips, true), td(r.poblacion),
            td(r.dmEst), td(r.dmMeta), td(r.dmCasos), td(r.dmPctMeta), td(r.dmPctPrev),
          ])
        ),
      },
      layout: headerLayout,
      margin: [0, 0, 0, 8],
    },

    // ── 7. HTA Mayores y Menores ──────────────────────────────────────────
    h1('INDICADOR HTA MAYORES Y MENORES DE 60 ANOS'),
    {
      table: {
        headerRows: 1,
        widths: [40, 50, '*', 30, 32, 32, 30, 32, 32, 30],
        body: safeBody(
          [th('DPTO'), th('MUNICIPIO'), th('IPS'), th('POB'), th('HTA\n>=60\nDEN'), th('HTA\n>=60\nCTRL'), th('HTA\n>=60\n%'), th('HTA\n<60\nDEN'), th('HTA\n<60\nCTRL'), th('HTA\n<60\n%')],
          data.tablas.htaMayoresMenores.map(r => [
            td(r.dpto), td(r.municipio), td(r.ips, true), td(r.poblacion),
            td(r.may60Denom), td(r.may60Num), td(r.may60Pct),
            td(r.men60Denom), td(r.men60Num), td(r.men60Pct),
          ])
        ),
      },
      layout: headerLayout,
      margin: [0, 0, 0, 6],
    },

    ...(data.analisisComportamiento.length > 0 ? [
      { text: 'Analisis del Comportamiento:', bold: true, fontSize: 10, margin: [0, 4, 0, 2] },
      { ul: data.analisisComportamiento.map(t => ({ text: t, fontSize: 10 })), margin: [0, 0, 0, 8] },
    ] : []),

    // ── 8. DM Controlados ─────────────────────────────────────────────────
    h1('INDICADOR DE DIABETICOS CONTROLADOS'),
    {
      table: {
        headerRows: 1,
        widths: [50, 60, '*', 40, 50, 55, 40],
        body: safeBody(
          [th('DPTO'), th('MUNICIPIO'), th('IPS'), th('POB'), th('PACIENTES\nCON DM'), th('DM\nCONTROLADOS'), th('%')],
          data.tablas.dmControlados.map(r => [
            td(r.dpto), td(r.municipio), td(r.ips, true), td(r.poblacion),
            td(r.denom), td(r.num), td(r.pct),
          ])
        ),
      },
      layout: headerLayout,
      margin: [0, 0, 0, 8],
    },

    // ── 9. Laboratorios ───────────────────────────────────────────────────
    h1('COBERTURA DE LABORATORIOS TRAZADORES'),
    {
      table: {
        headerRows: 1,
        widths: [32, 42, '*', 26, 26, 26, 26, 26, 26, 26, 26, 26, 26],
        body: safeBody(
          [th('DPTO'), th('MUNICIPIO'), th('IPS'), th('POB'), th('CR\nTOT'), th('CR\nVIG'), th('CR\n%'), th('HbA\nTOT'), th('HbA\nVIG'), th('HbA\n%'), th('ALB\nTOT'), th('ALB\nVIG'), th('ALB\n%')],
          data.tablas.laboratorios.map(r => [
            td(r.dpto), td(r.municipio), td(r.ips, true), td(r.poblacion),
            td(r.creatDenom), td(r.creatNum), td(r.creatPct),
            td(r.hba1cDenom), td(r.hba1cNum), td(r.hba1cPct),
            td(r.microalbDenom), td(r.microalbNum), td(r.microalbPct),
          ])
        ),
      },
      layout: headerLayout,
      margin: [0, 0, 0, 8],
    },

    // ── 10-12. Textos ─────────────────────────────────────────────────────
    h1('Calidad del Dato'),
    data.calidadDato.length > 0
      ? { ul: data.calidadDato.map(t => ({ text: t, fontSize: 10 })), margin: [0, 0, 0, 6] }
      : p('Sin observaciones.'),

    h1('Observaciones'),
    data.observaciones.length > 0
      ? { ul: data.observaciones.map(t => ({ text: t, fontSize: 10 })), margin: [0, 0, 0, 6] }
      : p('Sin observaciones especificas.'),

    h1('Compromisos y Acciones'),
    data.compromisos.length > 0
      ? { ul: data.compromisos.map(t => ({ text: t, fontSize: 10 })), margin: [0, 0, 0, 6] }
      : p('Compromisos por definir.'),

    { text: 'Elaborado por: Profesional PYM - Ruta Cardiovascular y Metabolica - Direccion del Riesgo en Salud', fontSize: 9, italics: true, margin: [0, 10, 0, 0] },
  ];

  // ── Anexo 1: Inasistentes ─────────────────────────────────────────────────
  if (data.inasistentes && data.inasistentes.length > 0) {
    content.push(
      { text: 'ANEXO 1 - PACIENTES INASISTENTES A CONTROL', bold: true, fontSize: 12, color: '#1a3a5c', margin: [0, 0, 0, 6], pageBreak: 'before' },
      {
        table: {
          headerRows: 1,
          widths: [28, 52, 52, 52, 52, 52, 42, '*'],
          body: [
            [th('TIPO ID'), th('NUM ID'), th('1er NOMBRE'), th('2do NOMBRE'), th('1er APELLIDO'), th('2do APELLIDO'), th('TELEFONO'), th('DIRECCION')],
            ...data.inasistentes.map(pat => [
              td(pat.tipo_id), td(pat.id), td(pat.p_nombre, true), td(pat.s_nombre, true),
              td(pat.p_apellido, true), td(pat.s_apellido, true), td(pat.tel), td(pat.dir, true),
            ]),
          ],
        },
        layout: headerLayout,
        margin: [0, 0, 0, 8],
      }
    );
  }

  // ── Anexo 2: Sin Estadificar ──────────────────────────────────────────────
  if (data.sinEstadificar && data.sinEstadificar.length > 0) {
    content.push(
      { text: 'ANEXO 2 - PACIENTES PENDIENTES DE ESTADIFICACION TFG', bold: true, fontSize: 12, color: '#1a3a5c', margin: [0, 0, 0, 6], pageBreak: 'before' },
      {
        table: {
          headerRows: 1,
          widths: [35, 60, '*', '*', '*', '*'],
          body: [
            [th('TIPO ID'), th('NUM ID'), th('1er NOMBRE'), th('2do NOMBRE'), th('1er APELLIDO'), th('2do APELLIDO')],
            ...data.sinEstadificar.map(pat => [
              td(pat.tipo_id), td(pat.id),
              td(pat.p_nombre, true), td(pat.s_nombre, true),
              td(pat.p_apellido, true), td(pat.s_apellido, true),
            ]),
          ],
        },
        layout: headerLayout,
        margin: [0, 0, 0, 8],
      }
    );
  }

  return {
    pageSize: 'A4',
    pageMargins: [50, 85, 50, 65],
    info: { title: `Evaluacion Indicadores RCV - ${corte.monthName} ${corte.year}`, author: 'Dusakawi EPS' },
    defaultStyle: { fontSize: 10, lineHeight: 1.3, font: 'Roboto' },
    styles: {
      tableHeader: { bold: true, fontSize: 8, color: 'white' },
      tableCell:   { fontSize: 8 },
    },
    background: (currentPage: number, pageSize: any) => {
      if (!images?.background) return null;
      return { image: images.background, width: pageSize.width, height: pageSize.height, absolutePosition: { x: 0, y: 0 } };
    },
    content,
  };
}

export async function descargarInformePDF(datos: InformeDatos, images?: PdfImages, nombre = 'Informe_RCV.pdf') {
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const vfsFonts = (await import('pdfmake/build/vfs_fonts')).default;
  (pdfMake as any).vfs = vfsFonts;
  pdfMake.createPdf(buildDocDefinition(datos, images)).download(nombre);
}

export async function registerArialIfAvailable(_pdfMake: any) {}
