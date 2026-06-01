
// Carga una imagen desde /public usando fetch del browser
// (reemplaza el 'use server' + fs.readFile que falla en Vercel)
export async function loadImageAsBase64(imagePath: string): Promise<string> {
  try {
    const response = await fetch(imagePath);
    if (!response.ok) return '';
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror   = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error cargando imagen ${imagePath}:`, error);
    return '';
  }
}
