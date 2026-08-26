import { useCallback, useEffect, useRef, useState } from 'react'
import * as Location from 'expo-location'
import {
  calcularBearing,
  calcularProgresso,
  calcularRota,
  distanciaMetros,
  projetarNaRota,
  type Ponto,
  type ProgressoRota,
  type RotaCalculada,
} from '../utils/navegacaoGps'

const LIMIAR_DESVIO_METROS = 60
const INTERVALO_MINIMO_RECALCULO_MS = 15000

// Junta GPS de alta frequência + trajeto do OSRM (com passos de manobra) + a posição do
// dispositivo projetada nesse trajeto, recalculando a rota sozinho se o motorista sair muito dela
// (ex: pegou um desvio). Pensado pra alimentar uma tela de navegação turn-by-turn tipo Waze/Maps.
export function useNavegacaoGps(destino: Ponto | null) {
  const [posicao, setPosicao] = useState<Ponto | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const [rota, setRota] = useState<RotaCalculada | null>(null)
  const [progresso, setProgresso] = useState<ProgressoRota | null>(null)
  const [carregandoRota, setCarregandoRota] = useState(false)
  const [erro, setErro] = useState('')

  const destinoRef = useRef(destino)
  destinoRef.current = destino
  const rotaRef = useRef<RotaCalculada | null>(null)
  const ultimoRecalculoRef = useRef(0)
  const posicaoAnteriorRef = useRef<Ponto | null>(null)

  const recalcular = useCallback(async (origem: Ponto) => {
    if (!destinoRef.current) return

    setCarregandoRota(true)
    try {
      const nova = await calcularRota(origem, destinoRef.current)
      rotaRef.current = nova
      setRota(nova)
      setErro('')
    } catch {
      setErro('Não foi possível calcular a rota. Confira sua conexão.')
    } finally {
      setCarregandoRota(false)
      ultimoRecalculoRef.current = Date.now()
    }
  }, [])

  useEffect(() => {
    let assinatura: Location.LocationSubscription | null = null
    let cancelado = false

    async function iniciar() {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        if (!cancelado) setErro('Permissão de localização negada. Ative nas configurações do celular pra navegar.')
        return
      }

      assinatura = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
        (pos) => {
          const ponto = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
          setPosicao(ponto)

          if (pos.coords.heading != null && pos.coords.heading >= 0) {
            setHeading(pos.coords.heading)
          } else if (posicaoAnteriorRef.current && distanciaMetros(posicaoAnteriorRef.current, ponto) > 3) {
            setHeading(calcularBearing(posicaoAnteriorRef.current, ponto))
          }
          posicaoAnteriorRef.current = ponto

          if (!rotaRef.current) recalcular(ponto)
        }
      )
    }

    iniciar()

    return () => {
      cancelado = true
      try {
        assinatura?.remove()
      } catch {
        // No preview web, o expo-location tem um bug conhecido nessa chamada — não deixa isso
        // derrubar o app; no dispositivo real (onde a navegação de verdade roda) funciona normal.
      }
    }
  }, [recalcular])

  // Se o destino mudar (ex: motorista ia buscar o cliente e agora, depois de iniciar a viagem, o
  // alvo passa a ser o destino final), descarta a rota antiga e recalcula do zero.
  useEffect(() => {
    rotaRef.current = null
    setRota(null)
    setProgresso(null)
    if (posicao) recalcular(posicao)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino?.latitude, destino?.longitude])

  // Recalcula o progresso (próxima manobra, distância restante) sempre que a rota OU a posição
  // mudarem — em vez de só dentro do callback do GPS — pra não ficar um ciclo atrasado quando a
  // rota termina de carregar depois da última posição recebida.
  useEffect(() => {
    if (!rota || !posicao) return

    const { distanciaAcumulada, distanciaAteRota } = projetarNaRota(rota, posicao)
    setProgresso(calcularProgresso(rota, distanciaAcumulada))

    const agora = Date.now()
    if (distanciaAteRota > LIMIAR_DESVIO_METROS && agora - ultimoRecalculoRef.current > INTERVALO_MINIMO_RECALCULO_MS) {
      recalcular(posicao)
    }
  }, [rota, posicao, recalcular])

  return { posicao, heading, rota, progresso, carregandoRota, erro }
}
