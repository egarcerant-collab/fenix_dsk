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

/* ── helpers ── */
const H  = (t: string) => ({ text: t, bold: true, fontSize: 10, color: '#1a3a5c', margin: [0, 8, 0, 3] });
const TH = (t: string) => ({ text: String(t ?? ''), bold: true, fontSize: 7.5, alignment: 'center' as const, margin: [1, 2, 1, 2] });
const TD = (t: any, left = false) => ({ text: String(t ?? ''), fontSize: 7.5, alignment: (left ? 'left' : 'center') as const, margin: [1, 2, 1, 2] });
const pct = (n: number, d: number) => d > 0 ? `${((n/d)*100).toFixed(1)}%` : '0%';
const body = (header: any[], rows: any[][]) => rows.length > 0 ? [header, ...rows] : [header, [{ text: '-', colSpan: header.length, alignment: 'center' as const, fontSize: 7, margin: [1,2,1,2] }, ...Array(header.length - 1).fill({ text:'' }) ]];

export function buildDocDefinition(data: InformeDatos, _images?: PdfImages): any {
  const { corte: c, prevalencia: pr, analisisData: ad, kpisTFG: tfg, cumplimientos: cum } = data;
  const content: any[] = [];

  /* ── Encabezado compact ── */
  content.push(
    { text: `EVALUACION INDICADORES RCV — ${c.monthName} ${c.year}`, bold: true, fontSize: 12, color: '#1a3a5c', margin: [0,0,0,4] },
    { text: `IPS: ${data.encabezado.entidad}   |   Lugar/Fecha: ${data.encabezado.lugarFecha}`, fontSize: 8, margin: [0,0,0,8] }
  );

  /* ── Resumen general ── */
  content.push(
    H('RESUMEN GENERAL'),
    { table: { widths: ['*','*','*','*','*','*'], body: [
        [TH('TOTAL PAC'), TH('SOLO HTA'), TH('SOLO DM'), TH('HTA+DM'), TH('ESTADIFICADOS'), TH('SIN ESTADIF.')],
        [TD(ad.totalPacientes), TD(ad.soloHta), TD(ad.soloDm), TD(ad.htaDm), TD(ad.estadificados), TD(ad.sinEstadificarCount)],
    ]}, layout: 'lightHorizontalLines', margin: [0,0,0,6] },

    { table: { widths: [55,55,55,55,55,'*'], body: [
        [TH('ESTADIO I'), TH('ESTADIO II'), TH('ESTADIO III'), TH('ESTADIO IV'), TH('ESTADIO V'), TH('SIN ESTADIF.')],
        [TD(tfg.E1), TD(tfg.E2), TD(tfg.E3), TD(tfg.E4), TD(tfg.E5), TD(tfg.sinEstadificar)],
    ]}, layout: 'lightHorizontalLines', margin: [0,0,0,8] }
  );

  /* ── Prevalencia ── */
  content.push(
    H('PREVALENCIA HTA Y DM'),
    { text: `Poblacion 18-69: ${pr.poblacion1869} | HTA estimados (22.8%): ${pr.htaEstimados} | Meta HTA (16.26%): ${pr.htaMeta} | HTA reportados: ${pr.htaReportados}`, fontSize: 8, margin:[0,0,0,2] },
    { text: `DM estimados (3.5%): ${pr.dmEstimados} | Meta DM (60%): ${pr.dmMeta} | DM reportados: ${pr.dmReportados}`, fontSize: 8, margin:[0,0,0,8] }
  );

  /* ── TABLA MAESTRA de indicadores ── */
  content.push(H('INDICADORES DE GESTION DEL RIESGO'));

  // Construir filas de una sola tabla consolidada
  const indRows: any[][] = [];
  for (const r of data.tablas.captacionHTA) {
    indRows.push([
      TD(r.ips, true), TD(r.municipio),
      TD(r.htaCasos), TD(r.htaMeta), TD(r.htaPctMeta),
      TD(r.dmCasos), TD(r.dmMeta), TD(r.dmPctMeta),
    ]);
  }
  // Agregar mayores/menores y DM/labs si misma IPS
  if (data.tablas.htaMayoresMenores.length > 0) {
    const hm = data.tablas.htaMayoresMenores[0];
    const dc = data.tablas.dmControlados[0];
    const lb = data.tablas.laboratorios[0];
    content.push(
      { table: { headerRows:1, widths:['*',50, 32,32,32, 32,32,32], body: body(
          [TH('IPS'), TH('MUNICIPIO'), TH('HTA\nCASOS'), TH('META\nHTA'), TH('%\nHTA'), TH('DM\nCASOS'), TH('META\nDM'), TH('%\nDM')],
          indRows
      )}, layout:'lightHorizontalLines', margin:[0,0,0,4] },

      { table: { headerRows:1, widths:['*', 32,32,32, 32,32,32], body: body(
          [TH('IPS'), TH('HTA>=60\nCTRL'), TH('HTA>=60\n%'), TH('HTA<60\nCTRL'), TH('HTA<60\n%'), TH('DM\nCTRL'), TH('DM\n%')],
          [[TD(hm.ips, true), TD(hm.may60Num), TD(hm.may60Pct), TD(hm.men60Num), TD(hm.men60Pct), TD(dc?.num??''), TD(dc?.pct??'')]]
      )}, layout:'lightHorizontalLines', margin:[0,0,0,4] },

      H('COBERTURA LABORATORIOS TRAZADORES'),
      { table: { widths: ['*','*','*'], body: [
          [TH('CREATININA'), TH('HbA1c (DM)'), TH('MICROALBUMINURIA')],
          [TD(`${lb?.creatNum??0} de ${lb?.creatDenom??0} = ${lb?.creatPct??'0%'}`), TD(`${lb?.hba1cNum??0} de ${lb?.hba1cDenom??0} = ${lb?.hba1cPct??'0%'}`), TD(`${lb?.microalbNum??0} de ${lb?.microalbDenom??0} = ${lb?.microalbPct??'0%'}`)],
      ]}, layout:'lightHorizontalLines', margin:[0,0,0,4] }
    );
  } else {
    content.push(
      { table: { headerRows:1, widths:['*',50, 32,32,32, 32,32,32], body: body(
          [TH('IPS'), TH('MUNICIPIO'), TH('HTA\nCASOS'), TH('META\nHTA'), TH('%\nHTA'), TH('DM\nCASOS'), TH('META\nDM'), TH('%\nDM')],
          indRows
      )}, layout:'lightHorizontalLines', margin:[0,0,0,8] }
    );
  }

  /* ── Cumplimientos ── */
  content.push(
    H('CUMPLIMIENTOS LABORATORIOS'),
    { text: `Creatinina: ${cum.creatNum}/${cum.creatDenom} = ${pct(cum.creatNum,cum.creatDenom)} (${cum.range12})`, fontSize: 8, margin:[0,0,0,2] },
    { text: `HbA1c: ${cum.hba1cNum}/${cum.hba1cDenom} = ${pct(cum.hba1cNum,cum.hba1cDenom)} (${cum.range6})`, fontSize: 8, margin:[0,0,0,2] },
    { text: `Microalbuminuria: ${cum.microalbNum}/${cum.microalbDenom} = ${pct(cum.microalbNum,cum.microalbDenom)} | Inasistentes: ${cum.inasistentesCount} usuarios`, fontSize: 8, margin:[0,0,0,6] }
  );

  /* ── Observaciones breves ── */
  if (data.observaciones.length > 0) {
    content.push(
      H('OBSERVACIONES'),
      { ul: data.observaciones.slice(0,10).map(t => ({ text: t, fontSize: 7.5 })), margin:[0,0,0,4] }
    );
  }

  /* ── ANEXO 1: Inasistentes ── */
  if (data.inasistentes?.length) {
    content.push(
      { text: 'ANEXO 1 - PACIENTES INASISTENTES A CONTROL', bold:true, fontSize:9, color:'#1a3a5c', margin:[0,8,0,3], pageBreak:'before' },
      { table: { headerRows:1, widths:[26,50,50,50,50,50,40,'*'], body: [
          [TH('TIPO'), TH('ID'), TH('1er NOMBRE'), TH('2do NOMBRE'), TH('1er APELLIDO'), TH('2do APELLIDO'), TH('TEL'), TH('DIR')],
          ...data.inasistentes.map(p => [TD(p.tipo_id), TD(p.id), TD(p.p_nombre,true), TD(p.s_nombre,true), TD(p.p_apellido,true), TD(p.s_apellido,true), TD(p.tel), TD(p.dir,true)]),
      ]}, layout:'lightHorizontalLines', margin:[0,0,0,6] }
    );
  }

  /* ── ANEXO 2: Sin Estadificar ── */
  if (data.sinEstadificar?.length) {
    content.push(
      { text: 'ANEXO 2 - PENDIENTES DE ESTADIFICACION TFG', bold:true, fontSize:9, color:'#1a3a5c', margin:[0,8,0,3] },
      { table: { headerRows:1, widths:[30,58,'*','*','*','*'], body: [
          [TH('TIPO'), TH('ID'), TH('1er NOMBRE'), TH('2do NOMBRE'), TH('1er APELLIDO'), TH('2do APELLIDO')],
          ...data.sinEstadificar.map(p => [TD(p.tipo_id), TD(p.id), TD(p.p_nombre,true), TD(p.s_nombre,true), TD(p.p_apellido,true), TD(p.s_apellido,true)]),
      ]}, layout:'lightHorizontalLines', margin:[0,0,0,6] }
    );
  }

  /* ── ANEXO 3: Pacientes por estadio (solo si se pide) ── */
  if (data.pacientesPorEstadio) {
    const labels: [string, string][] = [['E1','Estadio I (TFG>=90)'],['E2','Estadio II (TFG 60-89)'],['E3','Estadio III (TFG 30-59)'],['E4','Estadio IV (TFG 15-29)'],['E5','Estadio V (TFG<15)']];
    const hayPac = labels.some(([k]) => (data.pacientesPorEstadio as any)[k]?.length > 0);
    if (hayPac) {
      content.push({ text: 'ANEXO 3 - PACIENTES POR ESTADIO TFG', bold:true, fontSize:9, color:'#1a3a5c', margin:[0,8,0,3], pageBreak:'before' });
      for (const [key, label] of labels) {
        const pats: string[] = (data.pacientesPorEstadio as any)[key] ?? [];
        if (!pats.length) continue;
        content.push(
          { text: `${label} — ${pats.length} pacientes`, bold:true, fontSize:8, margin:[0,6,0,2] },
          { table: { headerRows:1, widths:[20,'*'], body: [
              [TH('N'), TH('NOMBRE — ID')],
              ...pats.map((n,i)=>[TD(i+1),TD(n,true)]),
          ]}, layout:'lightHorizontalLines', margin:[0,0,0,4] }
        );
      }
    }
  }

  return {
    pageSize: 'A4',
    pageMargins: [45, 45, 45, 45],
    info: { title: `RCV ${c.monthName} ${c.year} — ${data.encabezado.entidad}` },
    defaultStyle: { fontSize: 8, lineHeight: 1.2, font: 'Roboto' },
    styles: { },
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
