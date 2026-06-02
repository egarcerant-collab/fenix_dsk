// Carga imagen desde /public — browser fetch con encoding correcto para espacios en path
export async function loadImageAsBase64(imagePath: string): Promise<string> {
  try {
    // Codificar cada segmento del path para manejar espacios correctamente
    const encoded = imagePath.split('/').map(s => encodeURIComponent(s)).join('/');
    const response = await fetch(encoded);
    if (!response.ok) return '';
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}
