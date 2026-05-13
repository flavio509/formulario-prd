/**
 * Utilitário de parsing por delimitadores.
 * Elimina completamente a dependência de JSON para respostas do Claude —
 * qualquer conteúdo interno (markdown, aspas, dois-pontos, emojis) é tratado como texto puro.
 *
 * Formato esperado:
 *   ===FIELD: nome===
 *   conteúdo livre (pode ter múltiplas linhas)
 *   ===END===
 */

/**
 * Extrai todos os campos delimitados de uma resposta do Claude.
 * Tolerante a CRLF e espaços extras ao redor do nome do campo.
 */
export function parseFields(texto: string): Record<string, string> {
  const campos: Record<string, string> = {}

  // \r?\n? — newline após o delimitador é opcional (Claude pode colocar conteúdo na mesma linha)
  const regex = /===FIELD:\s*([^=\r\n]+?)\s*===\r?\n?([\s\S]*?)===END===/g
  let m: RegExpExecArray | null

  while ((m = regex.exec(texto)) !== null) {
    campos[m[1].trim()] = m[2].trim()
  }

  if (Object.keys(campos).length === 0) {
    throw new Error(
      'Formato de resposta inválido — zero campos encontrados. ' +
      'O Claude não seguiu o formato de delimitadores esperado.'
    )
  }

  return campos
}

/**
 * Converte um campo de texto multi-linha em array de strings.
 * Strip automático de bullets comuns (-, •, *, 1., 2) etc.).
 */
export function toList(valor: string): string[] {
  if (!valor) return []
  return valor
    .split(/\r?\n/)
    .map((s) => s.replace(/^[-•*\d]+[.)]\s*/, '').trim())
    .filter(Boolean)
}
