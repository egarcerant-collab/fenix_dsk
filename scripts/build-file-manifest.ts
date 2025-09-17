// scripts/build-file-manifest.ts
import fs from "fs";
import path from "path";

const baseDir = path.join(process.cwd(), "public", "BASES DE DATOS");

// Función recursiva para encontrar todos los archivos .xlsx
function findXlsxFiles(dir: string, baseDirForRelative: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  let results: string[] = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of list) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(findXlsxFiles(fullPath, baseDirForRelative));
    } else if (file.isFile() && file.name.toLowerCase().endsWith(".xlsx")) {
      // Guardamos la ruta relativa a la carpeta base "BASES DE DATOS"
      results.push(path.relative(baseDirForRelative, fullPath));
    }
  }
  return results;
}

function main() {
  if (!fs.existsSync(baseDir)) {
    console.warn("Advertencia: No se encontró la carpeta 'public/BASES DE DATOS'. Se generará un manifiesto vacío.");
    
    const publicDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }
    
    const outPath = path.join(publicDir, "bases-manifest.json");
    fs.writeFileSync(outPath, JSON.stringify({ folder: "BASES DE DATOS", files: [] }, null, 2), "utf8");
    return;
  }
  
  const files = findXlsxFiles(baseDir, baseDir).sort();

  const outPath = path.join(process.cwd(), "public", "bases-manifest.json");
  fs.writeFileSync(outPath, JSON.stringify({ folder: "BASES DE DATOS", files }, null, 2), "utf8");
  console.log(`Manifiesto generado: ${outPath} (${files.length} archivos)`);
}

main();
