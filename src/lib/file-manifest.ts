'use server';

import fs from "fs";
import path from "path";

const baseDir = path.join(process.cwd(), "public", "BASES DE DATOS");
const outPath = path.join(process.cwd(), "public", "bases-manifest.json");

// Recursive function to find all .xlsx files
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
    } else if (file.isFile() && (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".json"))) {
      results.push(path.relative(baseDirForRelative, fullPath).replace(/\\/g, '/'));
    }
  }
  return results;
}

/**
 * Checks for .xlsx files in public/BASES DE DATOS and updates public/bases-manifest.json if the file list has changed.
 * @returns {Promise<boolean>} A promise that resolves to true if the manifest was updated, false otherwise.
 */
export async function updateFileManifest(): Promise<boolean> {
  const publicDir = path.join(process.cwd(), "public");

  if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
  }

  let files: string[];
  if (!fs.existsSync(baseDir)) {
    console.warn("Advertencia: No se encontró la carpeta 'public/BASES DE DATOS'. Se generará un manifiesto vacío si es necesario.");
    files = [];
  } else {
    files = findXlsxFiles(baseDir, baseDir).sort();
  }
  
  const newManifestContent = JSON.stringify({ folder: "BASES DE DATOS", files }, null, 2);

  let oldManifestContent = "";
  try {
    if (fs.existsSync(outPath)) {
      oldManifestContent = fs.readFileSync(outPath, "utf8");
    }
  } catch (e) {
    // Ignore read errors, we'll just overwrite
  }

  if (newManifestContent !== oldManifestContent) {
    try {
      fs.writeFileSync(outPath, newManifestContent, "utf8");
      console.log(`Manifiesto actualizado: ${outPath} (${files.length} archivos)`);
    } catch (err) {
      console.warn(`No se pudo escribir el manifiesto en ${outPath} (esperado en entornos Serverless como Vercel)`);
    }
    return true;
  }
  
  return false;
}
