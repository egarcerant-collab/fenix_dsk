
export interface KpiInput {
    edad: number | null;
    htaN: string;
    dmN: string;
    pas: number | null;
    pad: number | null;
    fPA: Date | null;
    fechaOkPA: boolean;
    hba1c: number | null;
    fechaHbOk: boolean;
    fechaCOk: boolean;
    fechaAlbOk: boolean;
}

export interface KpiResults {
    NUMERADOR_HTA: number;
    NUMERADOR_HTA_MAYORES: number;
    DENOMINADOR_HTA_MAYORES: number;
    NUMERADOR_DM_CONTROLADOS: number;
    DENOMINADOR_DM_CONTROLADOS: number; 
    POBLACION_DM_TOTAL: number;
    NUMERADOR_DM: number;
    NUMERADOR_HTA_MENORES: number;
    DENOMINADOR_HTA_MENORES: number; 
    DENOMINADOR_HTA_MENORES_ARCHIVO: number;
    NUMERADOR_CREATININA: number;
    NUMERADOR_HBA1C: number;
    NUMERADOR_MICROALBUMINURIA: number;
    NUMERADOR_INASISTENTE: number;
}

// --- Individual KPI Calculator Functions ---

function calculateHtaControlado(input: KpiInput): number {
    const { edad, htaN, pas, pad, fechaOkPA } = input;
    if (htaN === 'SI' && edad != null && edad >= 18 && edad <= 69) {
        const presOk = (pas != null && pas < 140) && (pad != null && pad < 90);
        if (presOk && fechaOkPA) {
            return 1;
        }
    }
    return 0;
}

function calculateHtaMayores(input: KpiInput): { numerador: number, denominador: number } {
    const { edad, htaN, dmN, pas, pad, fechaOkPA } = input;
    const edadOk60 = (edad != null && edad >= 60);
    let numerador = 0;
    let denominador = 0;

    if (edadOk60 && htaN === 'SI' && dmN === 'NO') {
        denominador = 1;
        const presOk60 = (pas != null && pas > 0 && pas <= 149) && (pad != null && pad > 0 && pad < 90);
        if (presOk60 && fechaOkPA) {
            numerador = 1;
        }
    }
    return { numerador, denominador };
}

function calculateDmControlados(input: KpiInput): { numerador: number, denominador: number } {
    const { dmN, fechaHbOk, hba1c } = input;
    let numerador = 0;
    let denominador = 0;

    if (dmN === 'SI') {
        denominador = 1; 
        if (fechaHbOk && hba1c != null && hba1c >= 3 && hba1c < 7) {
            numerador = 1;
        }
    }
    return { numerador, denominador };
}

function calculateNumeradorDm(input: KpiInput): number {
    const { dmN, edad } = input;
    if (dmN === 'SI' && edad != null && edad >= 18 && edad <= 69) {
        return 1;
    }
    return 0;
}

function calculateHtaMenoresNumerador(input: KpiInput): number {
    const { edad, htaN, pas, pad, fechaOkPA } = input;
    const edadOkMenores = (edad != null && edad >= 18 && edad < 60);
    if (edadOkMenores && htaN === 'SI') {
        const presOkMenores = (pas != null && pas < 140) && (pad != null && pad < 90);
        if (presOkMenores && fechaOkPA) {
            return 1;
        }
    }
    return 0;
}

function calculateDenominadorHtaMenoresArchivo(input: KpiInput): number {
    const { edad, htaN } = input;
    if (edad != null && edad >= 18 && edad <= 59 && htaN === 'SI') {
        return 1;
    }
    return 0;
}

function calculateNumeradorCreatinina(input: KpiInput): number {
    const { fechaCOk, dmN } = input;
    if (dmN === 'SI' && fechaCOk) {
        return 1;
    }
    return 0;
}

function calculateNumeradorHba1c(input: KpiInput): number {
    const { dmN, fechaHbOk } = input;
    if (dmN === 'SI' && fechaHbOk) {
        return 1;
    }
    return 0;
}

function calculateNumeradorMicroalbuminuria(input: KpiInput): number {
    const { fechaAlbOk, dmN } = input;
    if (dmN === 'SI' && fechaAlbOk) {
        return 1;
    }
    return 0;
}

function calculateInasistenteAControles(input: KpiInput): number {
    const { fPA, fechaOkPA } = input;
    if (fPA instanceof Date && !fechaOkPA) {
        return 1;
    }
    return 0;
}


// --- Orchestrator Function ---

export function computeAllKpisForRow(input: KpiInput): Omit<KpiResults, 'DENOMINADOR_HTA_MENORES' | 'POBLACION_DM_TOTAL'> {
    const htaMayoresResult = calculateHtaMayores(input);
    const dmControladosResult = calculateDmControlados(input);

    return {
        NUMERADOR_HTA: calculateHtaControlado(input),
        NUMERADOR_HTA_MAYORES: htaMayoresResult.numerador,
        DENOMINADOR_HTA_MAYORES: htaMayoresResult.denominador,
        NUMERADOR_DM_CONTROLADOS: dmControladosResult.numerador,
        DENOMINADOR_DM_CONTROLADOS: dmControladosResult.denominador,
        NUMERADOR_DM: calculateNumeradorDm(input),
        NUMERADOR_HTA_MENORES: calculateHtaMenoresNumerador(input),
        DENOMINADOR_HTA_MENORES_ARCHIVO: calculateDenominadorHtaMenoresArchivo(input),
        NUMERADOR_CREATININA: calculateNumeradorCreatinina(input),
        NUMERADOR_HBA1C: calculateNumeradorHba1c(input),
        NUMERADOR_MICROALBUMINURIA: calculateNumeradorMicroalbuminuria(input),
        NUMERADOR_INASISTENTE: calculateInasistenteAControles(input),
    };
}
