import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Solo inicializar Google AI si la clave existe
// Sin esto, el módulo crashea en Vercel si GOOGLE_GENAI_API_KEY no está configurada
export const ai = genkit({
  plugins: process.env.GOOGLE_GENAI_API_KEY ? [googleAI()] : [],
});
