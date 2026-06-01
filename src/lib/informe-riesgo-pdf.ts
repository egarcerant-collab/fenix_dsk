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
  pacientesPorEstadio?: { E1: string[]; E2: string[]; E3: string[]; E4: string[]; E5: string[]; };
}

/* helpers */
const H  = (t: string) => ({ text: t, bold: true, fontSize: 11, color: '#1a3a5c', margin: [0,10,0,3] });
const TH = (t: string) => ({ text: String(t ?? ''), bold: true, fontSize: 8, alignment: 'center' as const, margin: [2,3,2,3] });
const TD = (t: any, left = false) => ({ text: String(t ?? ''), fontSize: 8, alignment: (left ? 'left' : 'center') as const, margin: [2,2,2,2] });
const pct = (n: number, d: number) => d > 0 ? `${((n/d)*100).toFixed(1)}%` : '0%';
const safeRows = (hdr: any[], rows: any[][]) =>
  rows.length > 0 ? [hdr, ...rows]
    : [hdr, [{ text:'-', colSpan: hdr.length, alignment:'center' as const, fontSize:7, margin:[1,2,1,2] },
              ...Array(hdr.length-1).fill({text:''}) ]];

export function buildDocDefinition(data: InformeDatos, images?: PdfImages): any {
  const { corte: c, prevalencia: pr, analisisData: ad, kpisTFG: tfg, cumplimientos: cum } = data;
  const content: any[] = [];

  /* 1 — Encabezado */
  content.push({
    table: { widths: ['auto','*'], body: [
      [{ text:'Proceso:', bold:true, fontSize:9 }, { text:data.encabezado.proceso, fontSize:9 }],
      [{ text:'Entidad:', bold:true, fontSize:9 }, { text:data.encabezado.entidad, fontSize:9 }],
      [{ text:'Vigencia:', bold:true, fontSize:9 }, { text:data.encabezado.vigencia, fontSize:9 }],
      [{ text:'Lugar/Fecha:', bold:true, fontSize:9 }, { text:data.encabezado.lugarFecha, fontSize:9 }],
    ]}, layout:'lightHorizontalLines', margin:[0,0,0,8]
  });

  /* 2 — Referencia */
  content.push(
    H('REF. EVALUACION DATA ENFERMEDADES PRECURSORAS HTA - DM'),
    { text:`Analisis a corte ${c.monthName} ${c.year}. Evaluacion de indicadores de gestion del riesgo cardiovascular.`, fontSize:9, margin:[0,0,0,8] }
  );

  /* 3 — Prevalencia */
  content.push(
    H('PREVALENCIA HTA Y DM'),
    { text:`Poblacion 18-69: ${pr.poblacion1869} | HTA estimados (22.8%): ${pr.htaEstimados} | Meta HTA (16.26%): ${pr.htaMeta} | Reportados: ${pr.htaReportados}`, fontSize:9, margin:[0,0,0,3] },
    { text:`DM estimados (3.5%): ${pr.dmEstimados} | Meta DM (60%): ${pr.dmMeta} | DM reportados: ${pr.dmReportados}`, fontSize:9, margin:[0,0,0,8] }
  );

  /* 4 — Analisis data */
  content.push(
    H('ANALISIS DE DATA HTA - DM'),
    { table: { widths:['*','*','*','*','*','*'], body: [
        [TH('TOTAL PAC'), TH('SOLO HTA'), TH('SOLO DM'), TH('HTA+DM'), TH('ESTADIFICADOS'), TH('SIN ESTADIF.')],
        [TD(ad.totalPacientes), TD(ad.soloHta), TD(ad.soloDm), TD(ad.htaDm), TD(tfg.total), TD(tfg.sinEstadificar)],
    ]}, layout:'lightHorizontalLines', margin:[0,0,0,4] },
    { table: { widths:[50,50,50,50,50,'*'], body: [
        [TH(`ESTADIO I\n(>=90)`), TH(`ESTADIO II\n(60-89)`), TH(`ESTADIO III\n(30-59)`), TH(`ESTADIO IV\n(15-29)`), TH(`ESTADIO V\n(<15)`), TH('SIN\nESTADIF.')],
        [TD(tfg.E1), TD(tfg.E2), TD(tfg.E3), TD(tfg.E4), TD(tfg.E5), TD(tfg.sinEstadificar)],
    ]}, layout:'lightHorizontalLines', margin:[0,0,0,4] },
    { text:`Creatinina: ${cum.creatNum}/${cum.creatDenom} = ${pct(cum.creatNum,cum.creatDenom)} (${cum.range12})`, fontSize:9, margin:[0,0,0,2] },
    { text:`HbA1c: ${cum.hba1cNum}/${cum.hba1cDenom} = ${pct(cum.hba1cNum,cum.hba1cDenom)} (${cum.range6}) | Microalbuminuria: ${cum.microalbNum}/${cum.microalbDenom} = ${pct(cum.microalbNum,cum.microalbDenom)}`, fontSize:9, margin:[0,0,0,2] },
    { text:`Inasistentes a control: ${cum.inasistentesCount} usuarios. Ver ANEXO 1.`, fontSize:9, margin:[0,0,0,8] }
  );

  /* 5 — Captacion HTA */
  content.push(
    H('INDICADOR DE CAPTACION HTA'),
    { table: { headerRows:1, widths:[40,50,'*',32,32,32,32,32], body: safeRows(
        [TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB'), TH('PREV\n22.8%'), TH('META\n16.26%'), TH('CASOS'), TH('%\nMETA')],
        data.tablas.captacionHTA.map(r=>[TD(r.dpto), TD(r.municipio), TD(r.ips,true), TD(r.poblacion), TD(r.htaEst), TD(r.htaMeta), TD(r.htaCasos), TD(r.htaPctMeta)])
    )}, layout:'lightHorizontalLines', margin:[0,0,0,6] }
  );

  /* 6 — Captacion DM */
  content.push(
    H('INDICADOR DE CAPTACION DM'),
    { table: { headerRows:1, widths:[40,50,'*',32,32,32,32,32], body: safeRows(
        [TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB'), TH('PREV\n3.5%'), TH('META\n60%'), TH('CASOS'), TH('%\nMETA')],
        data.tablas.captacionDM.map(r=>[TD(r.dpto), TD(r.municipio), TD(r.ips,true), TD(r.poblacion), TD(r.dmEst), TD(r.dmMeta), TD(r.dmCasos), TD(r.dmPctMeta)])
    )}, layout:'lightHorizontalLines', margin:[0,0,0,6] }
  );

  /* 7 — HTA Mayores/Menores */
  content.push(
    H('INDICADOR HTA MAYORES Y MENORES DE 60 ANOS'),
    { table: { headerRows:1, widths:[38,48,'*',28,32,30,28,32,30], body: safeRows(
        [TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB'), TH('>=60\nDEN'), TH('>=60\n%'), TH('<60\nDEN'), TH('<60\nCTRL'), TH('<60\n%')],
        data.tablas.htaMayoresMenores.map(r=>[TD(r.dpto), TD(r.municipio), TD(r.ips,true), TD(r.poblacion), TD(r.may60Denom), TD(r.may60Pct), TD(r.men60Denom), TD(r.men60Num), TD(r.men60Pct)])
    )}, layout:'lightHorizontalLines', margin:[0,0,0,6] }
  );

  /* 8 — DM Controlados */
  content.push(
    H('INDICADOR DIABETICOS CONTROLADOS'),
    { table: { headerRows:1, widths:[45,55,'*',38,50,55,38], body: safeRows(
        [TH('DPTO'), TH('MUNICIPIO'), TH('IPS'), TH('POB'), TH('PAC\nCON DM'), TH('DM\nCONTROLADOS'), TH('%')],
        data.tablas.dmControlados.map(r=>[TD(r.dpto), TD(r.municipio), TD(r.ips,true), TD(r.poblacion), TD(r.denom), TD(r.num), TD(r.pct)])
    )}, layout:'lightHorizontalLines', margin:[0,0,0,6] }
  );

  /* 9 — Laboratorios vertical */
  content.push(
    H('COBERTURA LABORATORIOS TRAZADORES'),
    { table: { headerRows:1, widths:['*',55,60,60,50], body: safeRows(
        [TH('IPS / MUNICIPIO'), TH('INDICADOR'), TH('TOTAL\nREGISTRADOS'), TH('VIGENTES'), TH('%')],
        data.tablas.laboratorios.flatMap(r=>[
          [TD(`${r.ips} — ${r.municipio}`,true), TD('Creatinina'),       TD(r.creatDenom),   TD(r.creatNum),   TD(r.creatPct)],
          [TD('',true),                           TD('HbA1c (DM)'),       TD(r.hba1cDenom),   TD(r.hba1cNum),   TD(r.hba1cPct)],
          [TD('',true),                           TD('Microalbuminuria'), TD(r.microalbDenom), TD(r.microalbNum), TD(r.microalbPct)],
        ])
    )}, layout:'lightHorizontalLines', margin:[0,0,0,6] }
  );

  /* 10 — Observaciones */
  if (data.observaciones.length) content.push(
    H('OBSERVACIONES'),
    { ul: data.observaciones.map(t=>({text:t, fontSize:9})), margin:[0,0,0,6] }
  );

  /* 11 — Compromisos */
  if (data.compromisos.length) content.push(
    H('COMPROMISOS Y ACCIONES'),
    { ul: data.compromisos.map(t=>({text:t, fontSize:9})), margin:[0,0,0,6] }
  );

  content.push({ text:'Elaborado por: Profesional PYM - Ruta Cardiovascular y Metabolica', fontSize:8, italics:true, margin:[0,10,0,0] });

  /* ANEXO 1 — Inasistentes */
  if (data.inasistentes?.length) {
    content.push(
      { text:'ANEXO 1 - PACIENTES INASISTENTES A CONTROL', bold:true, fontSize:10, color:'#1a3a5c', margin:[0,0,0,4], pageBreak:'before' },
      { table: { headerRows:1, widths:[26,50,50,50,50,50,40,'*'], body:[
          [TH('TIPO'), TH('ID'), TH('1er NOMBRE'), TH('2do NOMBRE'), TH('1er APELLIDO'), TH('2do APELLIDO'), TH('TEL'), TH('DIR')],
          ...data.inasistentes.map(p=>[TD(p.tipo_id), TD(p.id), TD(p.p_nombre,true), TD(p.s_nombre,true), TD(p.p_apellido,true), TD(p.s_apellido,true), TD(p.tel), TD(p.dir,true)]),
      ]}, layout:'lightHorizontalLines', margin:[0,0,0,6] }
    );
  }

  /* ANEXO 2 — Sin Estadificar */
  if (data.sinEstadificar?.length) {
    content.push(
      { text:'ANEXO 2 - PENDIENTES DE ESTADIFICACION TFG', bold:true, fontSize:10, color:'#1a3a5c', margin:[0,8,0,4] },
      { table: { headerRows:1, widths:[30,58,'*','*','*','*'], body:[
          [TH('TIPO'), TH('ID'), TH('1er NOMBRE'), TH('2do NOMBRE'), TH('1er APELLIDO'), TH('2do APELLIDO')],
          ...data.sinEstadificar.map(p=>[TD(p.tipo_id), TD(p.id), TD(p.p_nombre,true), TD(p.s_nombre,true), TD(p.p_apellido,true), TD(p.s_apellido,true)]),
      ]}, layout:'lightHorizontalLines', margin:[0,0,0,6] }
    );
  }

  /* ANEXO 3 — Pacientes por estadio (solo PDF individual) */
  if (data.pacientesPorEstadio) {
    const labs: [string,string][] = [['E1','Estadio I (TFG >= 90)'],['E2','Estadio II (TFG 60-89)'],['E3','Estadio III (TFG 30-59)'],['E4','Estadio IV (TFG 15-29)'],['E5','Estadio V (TFG < 15)']];
    if (labs.some(([k]) => (data.pacientesPorEstadio as any)[k]?.length)) {
      content.push({ text:'ANEXO 3 - PACIENTES POR ESTADIO TFG', bold:true, fontSize:10, color:'#1a3a5c', margin:[0,0,0,4], pageBreak:'before' });
      for (const [key, label] of labs) {
        const pats: string[] = (data.pacientesPorEstadio as any)[key] ?? [];
        if (!pats.length) continue;
        content.push(
          { text:`${label} — ${pats.length} pacientes`, bold:true, fontSize:9, margin:[0,6,0,2] },
          { table: { headerRows:1, widths:[20,'*'], body:[
              [TH('N'), TH('NOMBRE — ID')],
              ...pats.map((n,i)=>[TD(i+1), TD(n,true)]),
          ]}, layout:'lightHorizontalLines', margin:[0,0,0,4] }
        );
      }
    }
  }

  return {
    pageSize: 'A4',
    pageMargins: [50, 85, 50, 60],
    info: { title:`RCV ${c.monthName} ${c.year}`, author:'Dusakawi EPS' },
    defaultStyle: { fontSize:9, lineHeight:1.25, font:'Roboto' },
    styles: {},
    background: (currentPage: number, pageSize: any) => {
      if (!images?.background) return null;
      return { image: images.background, width: pageSize.width, height: pageSize.height, absolutePosition: { x: 0, y: 0 } };
    },
    content,
  };
}

export async function descargarInformePDF(datos: InformeDatos, images?: PdfImages, nombre = 'Informe_RCV.pdf') {
  const pm = (await import('pdfmake/build/pdfmake')).default;
  const vf = (await import('pdfmake/build/vfs_fonts')).default;
  (pm as any).vfs = vf;
  pm.createPdf(buildDocDefinition(datos, images)).download(nombre);
}
export async function registerArialIfAvailable(_: any) {}
