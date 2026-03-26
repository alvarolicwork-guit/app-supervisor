

import { extraerDatosCasoFlow, mejorarRedaccionFlow } from './flows';

// Registrar los flujos para que sean accesibles
// Nota: 'ai.defineFlow' autoregistra en versiones recientes, pero esto asegura la exportación para el CLI.

export { mejorarRedaccionFlow, extraerDatosCasoFlow };
