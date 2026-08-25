import * as SecureStore from 'expo-secure-store'

export const CHAVE_TOKEN = 'token'

// expo-secure-store não tem suporte completo no preview web (só funciona de verdade em
// iOS/Android) — essas funções engolem esse caso pra não derrubar a versão web com um "is not a
// function", sem afetar o comportamento real no celular.
export async function lerToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export async function salvarToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(CHAVE_TOKEN, token)
  } catch {
    // Sem persistência no web preview — a sessão só dura enquanto o estado em memória existir.
  }
}

export async function apagarToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CHAVE_TOKEN)
  } catch {
    // Idem.
  }
}
