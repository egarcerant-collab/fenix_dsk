import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

const baseDir = path.join(process.cwd(), "public", "BASES DE DATOS");

function findXlsxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  let results: string[] = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of list) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(findXlsxFiles(fullPath));
    } else if (file.isFile() && file.name.toLowerCase().endsWith(".xlsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

async function convertAll() {
    const files = findXlsxFiles(baseDir);
    console.log(`Encontrados ${files.length} archivos .xlsx para convertir.`);

    for (const filePath of files) {
        console.log(`Convirtiendo ${filePath}...`);
        const fileBuffer = fs.readFileSync(filePath);
        const wb = xlsx.read(fileBuffer, { type: 'buffer' });
        const mainWs = wb.Sheets[wb.SheetNames[0]];
        const json = xlsx.utils.sheet_to_json(mainWs, { header: 1, defval: null });
        
        const jsonPath = filePath.replace(/\.xlsx$/i, '.json');
        fs.writeFileSync(jsonPath, JSON.stringify(json), 'utf-8');
        
        // Eliminar el archivo .xlsx
        fs.unlinkSync(filePath);
        console.log(`Convertido y eliminado original: ${path.basename(filePath)}`);
    }
    
    console.log("¡Todas las bases de datos han sido convertidas a JSON!");
}

convertAll().catch(console.error);
