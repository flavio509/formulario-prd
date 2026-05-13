import Anthropic from '@anthropic-ai/sdk'

// Singleton — reutilizado entre chamadas na mesma instância do servidor
let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return _client
}
