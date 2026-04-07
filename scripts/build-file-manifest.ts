// scripts/build-file-manifest.ts
// This script is run during the build process to ensure the file manifest is up-to-date.
import { updateFileManifest } from '../src/lib/file-manifest';

async function build() {
    const updated = await updateFileManifest();
    if (updated) {
        console.log("Manifiesto de archivos regenerado para la compilación.");
    } else {
        console.log("Manifiesto de archivos ya estaba actualizado para la compilación.");
    }
}

build();
