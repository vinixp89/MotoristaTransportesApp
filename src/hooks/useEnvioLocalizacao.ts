import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import api from '../api/client'

// Enquanto `ativo`, pede permissão de localização e manda a posição pro backend (PATCH
// /Motoristas/localizacao) sempre que o dispositivo reportar uma posição nova — mesma ideia do
// watchPosition usado no front-end web (MotoristaOnlineCard.jsx), só que com expo-location em vez
// da Geolocation API do navegador. Usada tanto pra listagem de motoristas próximos
// (disponiveis-resumo) quanto pro cliente acompanhar o motorista numa corrida em andamento.
export function useEnvioLocalizacao(ativo: boolean) {
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!ativo) return

    let assinatura: Location.LocationSubscription | null = null
    let cancelado = false

    async function iniciar() {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        if (!cancelado) setErro('Permissão de localização negada. Ative nas configurações do celular pra ficar online.')
        return
      }

      assinatura = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 8000, distanceInterval: 25 },
        (posicao) => {
          api
            .patch('/Motoristas/localizacao', {
              latitude: posicao.coords.latitude,
              longitude: posicao.coords.longitude,
            })
            .catch(() => {
              // Falha isolada de uma atualização não trava o app — a próxima posição reportada
              // tenta de novo.
            })
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
        // derrubar o app; no dispositivo real funciona normal.
      }
    }
  }, [ativo])

  return { erro }
}
