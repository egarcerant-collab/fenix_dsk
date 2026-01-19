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
  const outPath = path.join(process.cwd(), "public", "bases-manifest.json");

  if (!fs.existsSync(baseDir)) {
    console.warn("Advertencia: No se encontró la carpeta 'public/BASES DE DATOS'. Se generará un manifiesto vacío si es necesario.");
    
    const publicDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    const newManifestContent = JSON.stringify({ folder: "BASES DE DATOS", files: [] }, null, 2);
    let oldManifestContent = "";

    try {
        if (fs.existsSync(outPath)) {
            oldManifestContent = fs.readFileSync(outPath, "utf8");
        }
    } catch (e) {
        // Ignorar
    }

    if (newManifestContent !== oldManifestContent) {
        fs.writeFileSync(outPath, newManifestContent, "utf8");
        console.log(`Manifiesto vacío generado: ${outPath}`);
    }
    return;
  }
  
  const files = findXlsxFiles(baseDir, baseDir).sort();
  const newManifestContent = JSON.stringify({ folder: "BASES DE DATOS", files }, null, 2);

  let oldManifestContent = "";
  try {
    if (fs.existsSync(outPath)) {
      oldManifestContent = fs.readFileSync(outPath, "utf8");
    }
  } catch (e) {
    // Ignorar errores de lectura, simplemente sobreescribiremos
  }

  if (newManifestContent !== oldManifestContent) {
    fs.writeFileSync(outPath, newManifestContent, "utf8");
    console.log(`Manifiesto generado: ${outPath} (${files.length} archivos)`);
  } else {
    // Opcional: puedes descomentar la siguiente línea si quieres ver un mensaje cuando no hay cambios.
    // console.log(`Manifiesto sin cambios. No se actualizó el archivo.`);
  }
}

main();
