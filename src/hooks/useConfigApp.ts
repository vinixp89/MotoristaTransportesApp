import { useEffect, useState } from 'react'
import api from '../api/client'

type ConfigApp = { carteiraMotoristaLiberada: boolean }

// Configuração remota vinda do backend (ver ConfigController.App) — liga/desliga recursos sem
// precisar de novo build. Hoje só controla a tela de saldo/saque (recurso financeiro), escondida
// até a conta do Google Play virar Organização (ver Financial Features Declaration do Google).
// Começa em false (esconde por padrão enquanto carrega ou se a chamada falhar) — só mostra o
// recurso quando o backend confirmar que está liberado.
export function useConfigApp() {
  const [config, setConfig] = useState<ConfigApp>({ carteiraMotoristaLiberada: false })
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api
      .get<ConfigApp>('/Config/app')
      .then(({ data }) => setConfig(data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  return { ...config, carregando }
}
