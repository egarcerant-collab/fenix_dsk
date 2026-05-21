export interface PdfImages { background: string; }

export interface InformeDatos {
  encabezado: {
    proceso: string;
    formato: string;
    entidad: string;
    vigencia: string;
    lugarFecha: string;
  };
  corte: { month: number; year: number; monthName: string };
  prevalencia: {
    poblacion1869: number;
    htaEstimados: number;
    htaMeta: number;
    dmEstimados: number;
    dmMeta: number;
    htaReportados: number;
    dmReportados: number;
  };
  analisisData: {
    totalPacientes: number;
    soloHta: number;
    soloDm: number;
    htaDm: number;
    estadificados: number;
    sinEstadificarCount: number;
  };
  kpisTFG: {
    E1: number; E2: number; E3: number; E4: number; E5: number;
    total: number; sinEstadificar: number;
  };
  cumplimientos: {
    creatDenom: number; creatNum: number; range12: string;
    hba1cDenom: number; hba1cNum: number; range6: string;
    microalbDenom: number; microalbNum: number;
    inasistentesCount: number;
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
  calidadDato: string[];
  observaciones: string[];
  compromisos: string[];
  inasistentes?: Array<{
    tipo_id: string; id: string; p_nombre: string; s_nombre: string;
    p_apellido: string; s_apellido: string; tel: string; dir: string;
  }>;
  sinEstadificar?: Array<{
    tipo_id: string; id: string; p_nombre: string; s_nombre: string;
    p_apellido: string; s_apellido: string;
  }>;
}

// Helpers internos
const TH = (text: string, opts?: any) => ({
  text, bold: true, fontSize: 8, fillColor: '#1a3a5c', color: 'white',
  alignment: 'center', margin: [2, 3, 2, 3], ...opts,
});
const TD = (text: any, opts?: any) => ({
  text: String(text ?? ''), fontSize: 8, alignment: 'center',
  margin: [2, 2, 2, 2], ...opts,
});
const pct = (num: number, den: number) =>
  den > 0 ? `${(num / den * 100).toFixed(1)}%` : 'N/A';
const H = (text: string) => ({
  text, bold: true, fontSize: 11, color: '#1a3a5c',
  margin: [0, 10, 0, 4], decoration: 'underline',
});
const P = (text: string) => ({ text, fontSize: 10, margin: [0, 0, 0, 4] });

export function buildDocDefinition(data: InformeDatos, images?: PdfImages): any {
  const { corte, prevalencia: prev, analisisData: ad, kpisTFG, cumplimientos: cum } = data;

  // ── Sección 1: Encabezado ──────────────────────────────────────────────────
  const secEncabezado: any[] = [
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
  ];

  // ── Sección 2: Referencia ──────────────────────────────────────────────────
  const secReferencia: any[] = [
    H('REF. EVALUACIÓN DATA ENFERMEDADES PRECURSORAS HTA – DM'),
    P(
      `Posterior al análisis de la información reportada en la Data de Enfermedades Precursoras ` +
      `(HTA y DM) entregadas por su entidad de los usuarios atendidos a corte ${corte.monthName} ${corte.year}, ` +
      `se procede a realizar la evaluación de los indicadores de gestión del riesgo en cada uno de los componentes.`
    ),
  ];

  // ── Sección 3: Prevalencia HTA y DM ───────────────────────────────────────
  const secPrevalencia: any[] = [
    H('PREVALENCIA HTA Y DM'),
    P(
      `Afiliados con Edad entre 18 y 69 años: ${prev.poblacion1869}. ` +
      `Según Prevalencia Nacional HTA: 22,8%, se estima que la IPS debe tener ${prev.htaEstimados} Hipertensos. ` +
      `Prev. DM 3,5%, se estima que la IPS debe tener ${prev.dmEstimados} Diabéticos. ` +
      `Meta HTA: (16,26%) = ${prev.htaMeta} pacientes Hipertensos, mientras que DM (60%) = ${prev.dmMeta} pacientes con Dx de Diabetes. ` +
      `De los cuales la IPSI reporta a la fecha ${prev.htaReportados} pacientes con diagnóstico de hipertensión ` +
      `y ${prev.dmReportados} con diagnóstico de diabetes.`
    ),
  ];

  // ── Sección 4: Análisis de Data HTA-DM ────────────────────────────────────
  const secAnalisis: any[] = [
    H('ANÁLISIS DE DATA HTA – DM'),
    {
      columns: [
        {
          ul: [
            `Total pacientes: ${ad.totalPacientes}`,
            `Pacientes solo con Dx HTA: ${ad.soloHta}`,
            `Pacientes solo con Dx DM: ${ad.soloDm}`,
            `Pacientes con HTA + DM: ${ad.htaDm}`,
            `Pacientes Estadificados TFG: ${ad.estadificados}`,
            `Sin Estadificar: ${ad.sinEstadificarCount}`,
          ],
          fontSize: 10,
          margin: [0, 0, 0, 6],
        },
      ],
    },
    // Tabla estadios TFG
    {
      table: {
        headerRows: 1,
        widths: ['*', 70],
        body: [
          [TH('ESTADIO'), TH(corte.monthName)],
          [TD('Estadio I (TFG ≥ 90)', { alignment: 'left' }), TD(kpisTFG.E1)],
          [TD('Estadio II (TFG 60–89)', { alignment: 'left' }), TD(kpisTFG.E2)],
          [TD('Estadio III (TFG 30–59)', { alignment: 'left' }), TD(kpisTFG.E3)],
          [TD('Estadio IV (TFG 15–29)', { alignment: 'left' }), TD(kpisTFG.E4)],
          [TD('Estadio V (TFG < 15)', { alignment: 'left' }), TD(kpisTFG.E5)],
          [TD('SIN ESTADIFICAR', { alignment: 'left', bold: true }), TD(kpisTFG.sinEstadificar, { bold: true })],
          [TD('TOTAL CON ESTADIO', { alignment: 'left', bold: true }), TD(kpisTFG.total, { bold: true })],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 4, 0, 8],
    },
    // Cumplimientos
    P(
      `Cumplimiento creatinina: ${cum.creatDenom} pacientes tienen creatinina registrada, ` +
      `de los cuales ${cum.creatNum} tienen resultado vigente (${cum.range12}), ` +
      `equivalente al ${pct(cum.creatNum, cum.creatDenom)}.`
    ),
    P(
      `Cumplimiento hemoglobina glicosilada: de ${cum.hba1cDenom} pacientes con DM, ` +
      `${cum.hba1cNum} tienen resultado en el semestre (${cum.range6}), ` +
      `obteniéndose un ${pct(cum.hba1cNum, cum.hba1cDenom)}.`
    ),
    P(
      `Cumplimiento microalbuminuria: de ${cum.microalbDenom} pacientes, ` +
      `${cum.microalbNum} tienen resultado vigente (${cum.range12}), ` +
      `representando el ${pct(cum.microalbNum, cum.microalbDenom)}.`
    ),
    P(
      `Inasistencia a controles: se identificaron ${cum.inasistentesCount} usuarios inasistentes ` +
      `según la fecha de la última Tensión Arterial registrada en historia clínica. ` +
      `Se anexa listado. Ver ANEXO 1.`
    ),
  ];

  // ── Sección 5: Indicador Captación HTA ────────────────────────────────────
  const captHtaBody = [
    [
      TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB\n18-69'),
      TH('PREV\nHTA\n22,8%'), TH('META\n16,26%'), TH('CASOS\nDX HTA'),
      TH('% CAPT\nvs META'), TH('% CAPT\nvs PREV'),
    ],
    ...data.tablas.captacionHTA.map(r => [
      TD(r.dpto), TD(r.municipio), TD(r.ips, { alignment: 'left' }), TD(r.poblacion),
      TD(r.htaEst), TD(r.htaMeta), TD(r.htaCasos),
      TD(r.htaPctMeta), TD(r.htaPctPrev),
    ]),
  ];

  const secCaptHTA: any[] = [
    H('INDICADOR DE CAPTACIÓN PARA HIPERTENSIÓN'),
    {
      table: {
        headerRows: 1,
        widths: [50, 60, '*', 35, 35, 35, 35, 35, 35],
        body: captHtaBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    },
  ];

  // ── Sección 6: Indicador Captación DM ─────────────────────────────────────
  const captDmBody = [
    [
      TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB\n18-69'),
      TH('PREV\nDM 3,5%'), TH('META\n60%'), TH('CASOS\nDX DM'),
      TH('% CAPT\nvs META'), TH('% CAPT\nvs PREV'),
    ],
    ...data.tablas.captacionDM.map(r => [
      TD(r.dpto), TD(r.municipio), TD(r.ips, { alignment: 'left' }), TD(r.poblacion),
      TD(r.dmEst), TD(r.dmMeta), TD(r.dmCasos),
      TD(r.dmPctMeta), TD(r.dmPctPrev),
    ]),
  ];

  const secCaptDM: any[] = [
    H('INDICADOR DE CAPTACIÓN PARA DIABETES MELLITUS'),
    {
      table: {
        headerRows: 1,
        widths: [50, 60, '*', 35, 35, 35, 35, 35, 35],
        body: captDmBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    },
  ];

  // ── Sección 7: HTA Mayores y Menores ──────────────────────────────────────
  const htaMMBody = [
    [
      TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB\n18-69'),
      TH('HTA ≥60\nDENOM'), TH('HTA ≥60\nCTRL'), TH('HTA ≥60\n%'),
      TH('HTA <60\nDENOM'), TH('HTA <60\nCTRL'), TH('HTA <60\n%'),
    ],
    ...data.tablas.htaMayoresMenores.map(r => [
      TD(r.dpto), TD(r.municipio), TD(r.ips, { alignment: 'left' }), TD(r.poblacion),
      TD(r.may60Denom), TD(r.may60Num), TD(r.may60Pct),
      TD(r.men60Denom), TD(r.men60Num), TD(r.men60Pct),
    ]),
  ];

  const secHtaMM: any[] = [
    H('INDICADOR DE HIPERTENSIÓN MAYORES Y MENORES DE 60 AÑOS'),
    {
      table: {
        headerRows: 1,
        widths: [40, 55, '*', 32, 32, 32, 32, 32, 32, 32],
        body: htaMMBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 6],
    },
  ];

  // Análisis del comportamiento del indicador
  const secAnalisisComp: any[] = data.analisisComportamiento.length > 0 ? [
    { text: 'Análisis del Comportamiento del Indicador:', bold: true, fontSize: 10, margin: [0, 4, 0, 2] },
    { ul: data.analisisComportamiento.map(t => ({ text: t, fontSize: 10 })), margin: [0, 0, 0, 8] },
  ] : [];

  // ── Sección 8: Diabéticos Controlados ─────────────────────────────────────
  const dmCtrlBody = [
    [
      TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB\n18-69'),
      TH('PACIENTES\nCON DM'), TH('DM\nCONTROLADOS'), TH('%'),
    ],
    ...data.tablas.dmControlados.map(r => [
      TD(r.dpto), TD(r.municipio), TD(r.ips, { alignment: 'left' }), TD(r.poblacion),
      TD(r.denom), TD(r.num), TD(r.pct),
    ]),
  ];

  const secDmCtrl: any[] = [
    H('INDICADOR DE DIABÉTICOS CONTROLADOS'),
    {
      table: {
        headerRows: 1,
        widths: [50, 60, '*', 40, 50, 55, 40],
        body: dmCtrlBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    },
  ];

  // ── Sección 9: Cobertura Laboratorios Trazadores ──────────────────────────
  const labBody = [
    [
      TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB\n18-69'),
      TH('CREAT\nTOTAL'), TH('CREAT\nVIGENTE'), TH('CREAT\n%'),
      TH('HbA1c\nTOTAL'), TH('HbA1c\nVIGENTE'), TH('HbA1c\n%'),
      TH('MICROALB\nTOTAL'), TH('MICROALB\nVIGENTE'), TH('MICROALB\n%'),
    ],
    ...data.tablas.laboratorios.map(r => [
      TD(r.dpto), TD(r.municipio), TD(r.ips, { alignment: 'left' }), TD(r.poblacion),
      TD(r.creatDenom), TD(r.creatNum), TD(r.creatPct),
      TD(r.hba1cDenom), TD(r.hba1cNum), TD(r.hba1cPct),
      TD(r.microalbDenom), TD(r.microalbNum), TD(r.microalbPct),
    ]),
  ];

  const secLab: any[] = [
    H('COBERTURA DE LABORATORIOS TRAZADORES'),
    {
      table: {
        headerRows: 1,
        widths: [32, 42, '*', 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
        body: labBody,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    },
  ];

  // ── Sección 10–12: Calidad, Observaciones, Compromisos ────────────────────
  const secTextos: any[] = [
    H('Calidad del Dato'),
    data.calidadDato.length > 0
      ? { ul: data.calidadDato.map(t => ({ text: t, fontSize: 10 })), margin: [0, 0, 0, 6] }
      : P('Sin observaciones de calidad.'),

    H('Observaciones'),
    data.observaciones.length > 0
      ? { ul: data.observaciones.map(t => ({ text: t, fontSize: 10 })), margin: [0, 0, 0, 6] }
      : P('Sin observaciones específicas.'),

    H('Compromisos y Acciones'),
    data.compromisos.length > 0
      ? { ul: data.compromisos.map(t => ({ text: t, fontSize: 10 })), margin: [0, 0, 0, 6] }
      : P('Compromisos por definir.'),
  ];

  // ── Elaborado por ──────────────────────────────────────────────────────────
  const secElaborado: any[] = [
    {
      text: 'Elaborado por: Profesional PYM – Ruta Cardiovascular y Metabólica – Dirección del Riesgo en Salud',
      fontSize: 9, italics: true, margin: [0, 10, 0, 0],
    },
  ];

  // ── Anexo 1: Inasistentes ──────────────────────────────────────────────────
  const secInasistentes: any[] = [];
  if (data.inasistentes && data.inasistentes.length > 0) {
    const inasBody = [
      [TH('TIPO ID'), TH('N° IDENTIFICACIÓN'), TH('PRIMER NOMBRE'), TH('SEGUNDO NOMBRE'), TH('PRIMER APELLIDO'), TH('SEGUNDO APELLIDO'), TH('TELÉFONO'), TH('DIRECCIÓN')],
      ...data.inasistentes.map(p => [
        TD(p.tipo_id), TD(p.id), TD(p.p_nombre, { alignment: 'left' }), TD(p.s_nombre, { alignment: 'left' }),
        TD(p.p_apellido, { alignment: 'left' }), TD(p.s_apellido, { alignment: 'left' }),
        TD(p.tel), TD(p.dir, { alignment: 'left' }),
      ]),
    ];
    secInasistentes.push(
      { text: 'ANEXO 1 – PACIENTES INASISTENTES A CONTROL', bold: true, fontSize: 12, color: '#1a3a5c', margin: [0, 0, 0, 6], pageBreak: 'before' },
      {
        table: { headerRows: 1, widths: [30, 55, 55, 55, 55, 55, 45, '*'], body: inasBody },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 8],
      }
    );
  }

  // ── Anexo 2: Sin Estadificar ───────────────────────────────────────────────
  const secSinEstadificar: any[] = [];
  if (data.sinEstadificar && data.sinEstadificar.length > 0) {
    const sinEstBody = [
      [TH('TIPO ID'), TH('N° IDENTIFICACIÓN'), TH('PRIMER NOMBRE'), TH('SEGUNDO NOMBRE'), TH('PRIMER APELLIDO'), TH('SEGUNDO APELLIDO')],
      ...data.sinEstadificar.map(p => [
        TD(p.tipo_id), TD(p.id),
        TD(p.p_nombre, { alignment: 'left' }), TD(p.s_nombre, { alignment: 'left' }),
        TD(p.p_apellido, { alignment: 'left' }), TD(p.s_apellido, { alignment: 'left' }),
      ]),
    ];
    secSinEstadificar.push(
      { text: 'ANEXO 2 – PACIENTES PENDIENTES DE ESTADIFICACIÓN TFG', bold: true, fontSize: 12, color: '#1a3a5c', margin: [0, 0, 0, 6], pageBreak: 'before' },
      {
        table: { headerRows: 1, widths: [35, 60, '*', '*', '*', '*'], body: sinEstBody },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 8],
      }
    );
  }

  // ── Documento final ────────────────────────────────────────────────────────
  return {
    pageSize: 'A4',
    pageMargins: [50, 85, 50, 65],
    info: {
      title: `Evaluación Indicadores RCV – ${data.corte.monthName} ${data.corte.year}`,
      author: 'Dirección del Riesgo en Salud – Dusakawi EPS',
    },
    defaultStyle: { fontSize: 10, lineHeight: 1.3, font: 'Roboto' },
    styles: {
      tableHeader: { bold: true, fontSize: 8, color: 'white', fillColor: '#1a3a5c' },
    },
    background: (currentPage: number, pageSize: any) => {
      if (!images?.background) return null;
      return {
        image: images.background,
        width: pageSize.width,
        height: pageSize.height,
        absolutePosition: { x: 0, y: 0 },
        opacity: 1,
      };
    },
    content: [
      ...secEncabezado,
      ...secReferencia,
      ...secPrevalencia,
      ...secAnalisis,
      ...secCaptHTA,
      ...secCaptDM,
      ...secHtaMM,
      ...secAnalisisComp,
      ...secDmCtrl,
      ...secLab,
      ...secTextos,
      ...secElaborado,
      ...secInasistentes,
      ...secSinEstadificar,
    ],
  };
}

export async function descargarInformePDF(
  datos: InformeDatos,
  images?: PdfImages,
  nombre = 'Informe_Evaluacion_Riesgo.pdf'
) {
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const vfsFonts = (await import('pdfmake/build/vfs_fonts')).default;
  (pdfMake as any).vfs = vfsFonts;
  const docDef = buildDocDefinition(datos, images);
  pdfMake.createPdf(docDef).download(nombre);
}

export async function registerArialIfAvailable(_pdfMake: any) {}
