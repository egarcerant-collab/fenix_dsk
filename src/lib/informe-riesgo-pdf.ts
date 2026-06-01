export interface PdfImages { background: string; }

export interface InformeDatos {
  encabezado: { proceso: string; formato: string; entidad: string; vigencia: string; lugarFecha: string; };
  corte: { month: number; year: number; monthName: string };
  prevalencia: { poblacion1869: number; htaEstimados: number; htaMeta: number; dmEstimados: number; dmMeta: number; htaReportados: number; dmReportados: number; };
  analisisData: { totalPacientes: number; soloHta: number; soloDm: number; htaDm: number; estadificados: number; sinEstadificarCount: number; };
  kpisTFG: { E1: number; E2: number; E3: number; E4: number; E5: number; total: number; sinEstadificar: number; };
  cumplimientos: { creatDenom: number; creatNum: number; range12: string; hba1cDenom: number; hba1cNum: number; range6: string; microalbDenom: number; microalbNum: number; inasistentesCount: number; };
  tablas: {
    captacionHTA: Array<{ dpto: string; municipio: string; ips: string; poblacion: number; htaEst: number; htaMeta: number; htaCasos: number; htaPctMeta: string; htaPctPrev: string; }>;
    captacionDM:  Array<{ dpto: string; municipio: string; ips: string; poblacion: number; dmEst: number; dmMeta: number; dmCasos: number; dmPctMeta: string; dmPctPrev: string; }>;
    htaMayoresMenores: Array<{ dpto: string; municipio: string; ips: string; poblacion: number; may60Denom: number; may60Num: number; may60Pct: string; men60Denom: number; men60Num: number; men60Pct: string; }>;
    dmControlados:  Array<{ dpto: string; municipio: string; ips: string; poblacion: number; denom: number; num: number; pct: string; }>;
    laboratorios:   Array<{ dpto: string; municipio: string; ips: string; poblacion: number; creatDenom: number; creatNum: number; creatPct: string; hba1cDenom: number; hba1cNum: number; hba1cPct: string; microalbDenom: number; microalbNum: number; microalbPct: string; }>;
  };
  analisisComportamiento: string[];
  calidadDato: string[]; observaciones: string[]; compromisos: string[];
  inasistentes?: Array<{ tipo_id: string; id: string; p_nombre: string; s_nombre: string; p_apellido: string; s_apellido: string; tel: string; dir: string; }>;
  sinEstadificar?: Array<{ tipo_id: string; id: string; p_nombre: string; s_nombre: string; p_apellido: string; s_apellido: string; }>;
}

/* ── helpers ── */
const H  = (t: string)              => ({ text: t, style: 'h1',  margin: [0, 10, 0, 4] });
const P  = (t: string)              => ({ text: t, style: 'p',   margin: [0, 0, 0, 4]  });
const TH = (t: string)              => ({ text: String(t ?? ''), style: 'th', alignment: 'center', margin: [2, 3, 2, 3] });
const TD = (t: any, left = false)   => ({ text: String(t ?? ''), style: 'td', alignment: left ? 'left' : 'center', margin: [2, 2, 2, 2] });
const pct = (n: number, d: number)  => d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '0%';

/* ── buildDocDefinition ── */
export function buildDocDefinition(data: InformeDatos, images?: PdfImages): any {
  const { corte: c, prevalencia: pr, analisisData: ad, kpisTFG: tfg, cumplimientos: cum } = data;

  const rows = <T extends any[]>(header: any[], dataRows: T[]) =>
    dataRows.length > 0 ? [header, ...dataRows] : [header];

  const content: any[] = [

    /* 1 — Encabezado */
    { table: { widths: ['auto','*'], body: [
        [{ text:'Proceso:',         bold:true, fontSize:9 }, { text: data.encabezado.proceso,    fontSize:9 }],
        [{ text:'Formato:',         bold:true, fontSize:9 }, { text: data.encabezado.formato,    fontSize:9 }],
        [{ text:'Entidad:',         bold:true, fontSize:9 }, { text: data.encabezado.entidad,    fontSize:9 }],
        [{ text:'Vigencia:',        bold:true, fontSize:9 }, { text: data.encabezado.vigencia,   fontSize:9 }],
        [{ text:'Lugar/Fecha:',     bold:true, fontSize:9 }, { text: data.encabezado.lugarFecha, fontSize:9 }],
    ]}, layout:'lightHorizontalLines', margin:[0,0,0,8] },

    /* 2 — Referencia */
    H('REF. EVALUACION DATA ENFERMEDADES PRECURSORAS HTA - DM'),
    P(`Posterior al analisis de la informacion reportada en la Data de Enfermedades Precursoras (HTA y DM) de los usuarios atendidos a corte ${c.monthName} ${c.year}, se realiza la evaluacion de indicadores de gestion del riesgo.`),

    /* 3 — Prevalencia */
    H('PREVALENCIA HTA Y DM'),
    P(`Afiliados 18-69 anos: ${pr.poblacion1869}.  HTA estimados (22.8%): ${pr.htaEstimados} | Meta HTA (16.26%): ${pr.htaMeta}.  DM estimados (3.5%): ${pr.dmEstimados} | Meta DM (60%): ${pr.dmMeta}.  La IPSI reporta ${pr.htaReportados} pacientes con HTA y ${pr.dmReportados} con DM.`),

    /* 4 — Analisis Data */
    H('ANALISIS DE DATA HTA - DM'),
    { ul: [
        `Total pacientes: ${ad.totalPacientes}`,
        `Solo HTA: ${ad.soloHta}   |   Solo DM: ${ad.soloDm}   |   HTA + DM: ${ad.htaDm}`,
        `Estadificados TFG: ${ad.estadificados}   |   Sin Estadificar: ${ad.sinEstadificarCount}`,
    ], style:'p', margin:[0,0,0,6] },

    /* Tabla TFG */
    { table: { headerRows:1, widths:['*',70], body: [
        [TH('ESTADIO'), TH(c.monthName)],
        [TD('Estadio I  (TFG >= 90)',  true), TD(tfg.E1)],
        [TD('Estadio II (TFG 60-89)',  true), TD(tfg.E2)],
        [TD('Estadio III (TFG 30-59)', true), TD(tfg.E3)],
        [TD('Estadio IV (TFG 15-29)',  true), TD(tfg.E4)],
        [TD('Estadio V  (TFG < 15)',   true), TD(tfg.E5)],
        [{ text:'SIN ESTADIFICAR', style:'td', bold:true }, { text:String(tfg.sinEstadificar), style:'td', bold:true, alignment:'center' }],
        [{ text:'TOTAL CON ESTADIO', style:'td', bold:true }, { text:String(tfg.total), style:'td', bold:true, alignment:'center' }],
    ]}, layout:'lightHorizontalLines', margin:[0,4,0,6] },

    P(`Creatinina: ${cum.creatNum} de ${cum.creatDenom} vigentes (${cum.range12}) = ${pct(cum.creatNum, cum.creatDenom)}.`),
    P(`HbA1c: ${cum.hba1cNum} de ${cum.hba1cDenom} en semestre (${cum.range6}) = ${pct(cum.hba1cNum, cum.hba1cDenom)}.`),
    P(`Microalbuminuria: ${cum.microalbNum} de ${cum.microalbDenom} vigentes (${cum.range12}) = ${pct(cum.microalbNum, cum.microalbDenom)}.`),
    P(`Inasistentes a control: ${cum.inasistentesCount} usuarios. Ver ANEXO 1.`),

    /* 5 — Captacion HTA */
    H('INDICADOR DE CAPTACION PARA HIPERTENSION'),
    { table: { headerRows:1, widths:[40,50,'*',32,32,32,35,32,32], body: rows(
        [TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB\n18-69'), TH('PREV\n22.8%'), TH('META\n16.26%'), TH('CASOS\nHTA'), TH('%\nvs META'), TH('%\nvs PREV')],
        data.tablas.captacionHTA.map(r => [TD(r.dpto), TD(r.municipio), TD(r.ips,true), TD(r.poblacion), TD(r.htaEst), TD(r.htaMeta), TD(r.htaCasos), TD(r.htaPctMeta), TD(r.htaPctPrev)])
    )}, layout:'lightHorizontalLines', margin:[0,0,0,8] },

    /* 6 — Captacion DM */
    H('INDICADOR DE CAPTACION PARA DIABETES MELLITUS'),
    { table: { headerRows:1, widths:[40,50,'*',32,32,32,35,32,32], body: rows(
        [TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB\n18-69'), TH('PREV\n3.5%'), TH('META\n60%'), TH('CASOS\nDM'), TH('%\nvs META'), TH('%\nvs PREV')],
        data.tablas.captacionDM.map(r => [TD(r.dpto), TD(r.municipio), TD(r.ips,true), TD(r.poblacion), TD(r.dmEst), TD(r.dmMeta), TD(r.dmCasos), TD(r.dmPctMeta), TD(r.dmPctPrev)])
    )}, layout:'lightHorizontalLines', margin:[0,0,0,8] },

    /* 7 — HTA Mayores / Menores */
    H('INDICADOR HTA MAYORES Y MENORES DE 60 ANOS'),
    { table: { headerRows:1, widths:[38,48,'*',28,30,30,28,30,30,28], body: rows(
        [TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB'), TH('>=60\nDEN'), TH('>=60\nCTRL'), TH('>=60\n%'), TH('<60\nDEN'), TH('<60\nCTRL'), TH('<60\n%')],
        data.tablas.htaMayoresMenores.map(r => [TD(r.dpto), TD(r.municipio), TD(r.ips,true), TD(r.poblacion), TD(r.may60Denom), TD(r.may60Num), TD(r.may60Pct), TD(r.men60Denom), TD(r.men60Num), TD(r.men60Pct)])
    )}, layout:'lightHorizontalLines', margin:[0,0,0,6] },

    ...(data.analisisComportamiento.length ? [
      { text:'Analisis del Comportamiento:', bold:true, fontSize:10, margin:[0,4,0,2] },
      { ul: data.analisisComportamiento.map(t => ({ text:t, fontSize:9 })), margin:[0,0,0,8] },
    ] : []),

    /* 8 — DM Controlados */
    H('INDICADOR DE DIABETICOS CONTROLADOS'),
    { table: { headerRows:1, widths:[45,55,'*',38,48,52,38], body: rows(
        [TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB'), TH('PAC.\nCON DM'), TH('DM\nCONTROLADOS'), TH('%')],
        data.tablas.dmControlados.map(r => [TD(r.dpto), TD(r.municipio), TD(r.ips,true), TD(r.poblacion), TD(r.denom), TD(r.num), TD(r.pct)])
    )}, layout:'lightHorizontalLines', margin:[0,0,0,8] },

    /* 9 — Laboratorios */
    H('COBERTURA DE LABORATORIOS TRAZADORES'),
    { table: { headerRows:1, widths:[30,40,'*',24,26,26,26,26,26,26,26,26,26], body: rows(
        [TH('DPTO'), TH('MUN'), TH('IPS'), TH('POB'), TH('CR\nTOT'), TH('CR\nVIG'), TH('CR\n%'), TH('HbA\nTOT'), TH('HbA\nVIG'), TH('HbA\n%'), TH('ALB\nTOT'), TH('ALB\nVIG'), TH('ALB\n%')],
        data.tablas.laboratorios.map(r => [TD(r.dpto), TD(r.municipio), TD(r.ips,true), TD(r.poblacion), TD(r.creatDenom), TD(r.creatNum), TD(r.creatPct), TD(r.hba1cDenom), TD(r.hba1cNum), TD(r.hba1cPct), TD(r.microalbDenom), TD(r.microalbNum), TD(r.microalbPct)])
    )}, layout:'lightHorizontalLines', margin:[0,0,0,8] },

    /* 10-12 — Textos */
    H('Calidad del Dato'),
    data.calidadDato.length ? { ul: data.calidadDato.map(t => ({ text:t, style:'p' })), margin:[0,0,0,6] } : P('Sin observaciones.'),

    H('Observaciones'),
    data.observaciones.length ? { ul: data.observaciones.map(t => ({ text:t, style:'p' })), margin:[0,0,0,6] } : P('Sin observaciones especificas.'),

    H('Compromisos y Acciones'),
    data.compromisos.length ? { ul: data.compromisos.map(t => ({ text:t, style:'p' })), margin:[0,0,0,6] } : P('Compromisos por definir.'),

    { text:'Elaborado por: Profesional PYM - Ruta Cardiovascular y Metabolica - Direccion del Riesgo en Salud', fontSize:8, italics:true, margin:[0,12,0,0] },
  ];

  /* Anexo 1 — Inasistentes */
  if (data.inasistentes?.length) {
    content.push(
      { text:'ANEXO 1 - PACIENTES INASISTENTES A CONTROL', style:'h1', margin:[0,0,0,6], pageBreak:'before' },
      { table: { headerRows:1, widths:[26,50,50,50,50,50,40,'*'], body: [
          [TH('TIPO'), TH('ID'), TH('1er NOMBRE'), TH('2do NOMBRE'), TH('1er APELLIDO'), TH('2do APELLIDO'), TH('TEL'), TH('DIR')],
          ...data.inasistentes.map(p => [TD(p.tipo_id), TD(p.id), TD(p.p_nombre,true), TD(p.s_nombre,true), TD(p.p_apellido,true), TD(p.s_apellido,true), TD(p.tel), TD(p.dir,true)]),
      ]}, layout:'lightHorizontalLines', margin:[0,0,0,8] }
    );
  }

  /* Anexo 2 — Sin Estadificar */
  if (data.sinEstadificar?.length) {
    content.push(
      { text:'ANEXO 2 - PACIENTES PENDIENTES DE ESTADIFICACION TFG', style:'h1', margin:[0,0,0,6], pageBreak:'before' },
      { table: { headerRows:1, widths:[30,58,'*','*','*','*'], body: [
          [TH('TIPO'), TH('ID'), TH('1er NOMBRE'), TH('2do NOMBRE'), TH('1er APELLIDO'), TH('2do APELLIDO')],
          ...data.sinEstadificar.map(p => [TD(p.tipo_id), TD(p.id), TD(p.p_nombre,true), TD(p.s_nombre,true), TD(p.p_apellido,true), TD(p.s_apellido,true)]),
      ]}, layout:'lightHorizontalLines', margin:[0,0,0,8] }
    );
  }

  return {
    pageSize: 'A4',
    pageMargins: [50, 85, 50, 65],
    info: { title:`Evaluacion RCV - ${c.monthName} ${c.year}`, author:'Dusakawi EPS' },
    defaultStyle: { fontSize:10, lineHeight:1.3, font:'Roboto' },
    styles: {
      h1: { bold:true, fontSize:11, color:'#1a3a5c' },
      p:  { fontSize:10 },
      th: { bold:true, fontSize:8 },
      td: { fontSize:8 },
    },
    background: (currentPage: number, pageSize: any) => {
      if (!images?.background) return null;
      return { image: images.background, width: pageSize.width, height: pageSize.height, absolutePosition:{ x:0, y:0 } };
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
