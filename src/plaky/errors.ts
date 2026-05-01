import { PlakyApiError } from './client.js'

export function toMcpErrorMessage(error: unknown): string {
  if (error instanceof PlakyApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Credencial Plaky inválida ou sem permissão para este recurso.'
    }
    if (error.status === 404) {
      return 'Recurso não encontrado no Plaky.'
    }
    if (error.status === 429) {
      return 'Limite de requisições do Plaky atingido. Tente novamente em alguns segundos.'
    }
    return `Erro na API do Plaky: ${error.message}`
  }
  return 'Erro inesperado ao comunicar com o Plaky.'
}
