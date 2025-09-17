
// scripts/build-file-manifest.ts
import fs from "fs";
import path from "path";

const baseDir = path.join(process.cwd(), "public", "BASES DE DATOS");

function main() {
  if (!fs.existsSync(baseDir)) {
    console.warn("Advertencia: No se encontró la carpeta 'public/BASES DE DATOS'. Se generará un manifiesto vacío.");
    
    // Ensure public directory exists before writing to it
    const publicDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }
    
    const outPath = path.join(publicDir, "bases-manifest.json");
    fs.writeFileSync(outPath, JSON.stringify({ folder: "BASES DE DATOS", files: [] }, null, 2), "utf8");
    return;
  }
  
  const files = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.toLowerCase().endsWith(".xlsx"))
    .map(d => d.name)
    .sort();

  const outPath = path.join(process.cwd(), "public", "bases-manifest.json");
  fs.writeFileSync(outPath, JSON.stringify({ folder: "BASES DE DATOS", files }, null, 2), "utf8");
  console.log(`Manifiesto generado: ${outPath} (${files.length} archivos)`);
}

main();
