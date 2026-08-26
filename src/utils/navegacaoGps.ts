export type Ponto = { latitude: number; longitude: number }

export type PassoRota = {
  tipo: string
  modificador?: string
  instrucao: string
  nomeVia: string
  distanciaMetros: number
  coordenada: Ponto
}

export type RotaCalculada = {
  pontos: Ponto[]
  distanciaTotalMetros: number
  duracaoTotalSegundos: number
  passos: PassoRota[]
}

export type ProgressoRota = {
  indiceProximo: number
  distanciaProximaManobra: number
  distanciaRestanteTotal: number
  duracaoRestanteTotalSegundos: number
  chegou: boolean
}

const RAIO_TERRA_M = 6371000

function paraRadianos(graus: number): number {
  return (graus * Math.PI) / 180
}

export function distanciaMetros(a: Ponto, b: Ponto): number {
  const dLat = paraRadianos(b.latitude - a.latitude)
  const dLon = paraRadianos(b.longitude - a.longitude)
  const lat1 = paraRadianos(a.latitude)
  const lat2 = paraRadianos(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return RAIO_TERRA_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

const MODIFICADOR_TEXTO: Record<string, string> = {
  uturn: 'Faça o retorno',
  'sharp right': 'Vire à direita',
  right: 'Vire à direita',
  'slight right': 'Mantenha-se à direita',
  straight: 'Siga em frente',
  'slight left': 'Mantenha-se à esquerda',
  left: 'Vire à esquerda',
  'sharp left': 'Vire à esquerda',
}

function gerarInstrucao(tipo: string, modificador: string | undefined, nomeVia: string): string {
  const via = nomeVia ? ` na ${nomeVia}` : ''
  const acaoModificador = MODIFICADOR_TEXTO[modificador ?? ''] ?? 'Continue'

  switch (tipo) {
    case 'depart':
      return `Siga em frente${via}`
    case 'arrive':
      return 'Você chegou ao destino'
    case 'roundabout':
    case 'rotary':
      return 'Entre na rotatória'
    case 'merge':
    case 'on ramp':
      return `Entre na via${via}`
    case 'off ramp':
      return `Saia${via}`
    case 'fork':
    case 'end of road':
    case 'new name':
    case 'continue':
    case 'turn':
    default:
      return `${acaoModificador}${via}`
  }
}

// Busca a rota real seguindo ruas no OSRM público (sem chave de API — mesmo servidor usado nos
// mapas estáticos do app), pedindo também os passos de manobra (steps=true) pra montar as
// instruções turn-by-turn.
export async function calcularRota(origem: Ponto, destino: Ponto): Promise<RotaCalculada> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/${origem.longitude},${origem.latitude};` +
    `${destino.longitude},${destino.latitude}?overview=full&geometries=geojson&steps=true`

  const resposta = await fetch(url)
  if (!resposta.ok) throw new Error('Não foi possível calcular a rota.')

  const dados = await resposta.json()
  const rota = dados?.routes?.[0]
  if (!rota) throw new Error('Nenhuma rota encontrada.')

  const pontos: Ponto[] = rota.geometry.coordinates.map(([lon, lat]: [number, number]) => ({
    latitude: lat,
    longitude: lon,
  }))

  const passos: PassoRota[] = []
  for (const perna of rota.legs ?? []) {
    for (const passo of perna.steps ?? []) {
      const [lon, lat] = passo.maneuver.location
      passos.push({
        tipo: passo.maneuver.type,
        modificador: passo.maneuver.modifier,
        instrucao: gerarInstrucao(passo.maneuver.type, passo.maneuver.modifier, passo.name),
        nomeVia: passo.name || '',
        distanciaMetros: passo.distance,
        coordenada: { latitude: lat, longitude: lon },
      })
    }
  }

  return {
    pontos,
    distanciaTotalMetros: rota.distance,
    duracaoTotalSegundos: rota.duration,
    passos,
  }
}

// Projeta a posição atual no segmento mais próximo do trajeto (aproximação plana — suficiente
// pra distâncias curtas de rua) e devolve tanto a distância já percorrida ao longo da rota quanto
// a distância perpendicular até ela (usada pra detectar desvio de rota).
export function projetarNaRota(rota: RotaCalculada, posicao: Ponto): { distanciaAcumulada: number; distanciaAteRota: number } {
  let melhorDistancia = Infinity
  let melhorAcumulada = 0
  let acumuladoAteSegmento = 0

  for (let i = 0; i < rota.pontos.length - 1; i++) {
    const a = rota.pontos[i]
    const b = rota.pontos[i + 1]
    const distanciaSegmento = distanciaMetros(a, b)
    const { distancia, fracao } = distanciaAoSegmento(posicao, a, b)

    if (distancia < melhorDistancia) {
      melhorDistancia = distancia
      melhorAcumulada = acumuladoAteSegmento + fracao * distanciaSegmento
    }

    acumuladoAteSegmento += distanciaSegmento
  }

  return { distanciaAcumulada: melhorAcumulada, distanciaAteRota: melhorDistancia }
}

function distanciaAoSegmento(p: Ponto, a: Ponto, b: Ponto): { distancia: number; fracao: number } {
  const latMedia = paraRadianos((a.latitude + b.latitude) / 2)
  const escala = Math.cos(latMedia)

  const px = p.longitude * escala
  const py = p.latitude
  const ax = a.longitude * escala
  const ay = a.latitude
  const bx = b.longitude * escala
  const by = b.latitude

  const dx = bx - ax
  const dy = by - ay
  const comprimentoQuadrado = dx * dx + dy * dy

  let fracao = comprimentoQuadrado === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / comprimentoQuadrado
  fracao = Math.max(0, Math.min(1, fracao))

  const projLon = (ax + fracao * dx) / escala
  const projLat = ay + fracao * dy

  return { distancia: distanciaMetros(p, { latitude: projLat, longitude: projLon }), fracao }
}

// A partir de quanto já foi percorrido ao longo da rota, acha qual é a PRÓXIMA manobra (o passo
// atual já foi executado) e quanto falta até ela. Os `steps` do OSRM encadeiam: a distância de
// cada passo é o trecho a percorrer a partir da manobra dele até a manobra do próximo passo.
export function calcularProgresso(rota: RotaCalculada, distanciaAcumuladaAtual: number): ProgressoRota {
  const inicioDoPasso: number[] = []
  let acumulado = 0
  for (const passo of rota.passos) {
    inicioDoPasso.push(acumulado)
    acumulado += passo.distanciaMetros
  }

  let indiceAtual = 0
  for (let i = 0; i < inicioDoPasso.length; i++) {
    if (inicioDoPasso[i] <= distanciaAcumuladaAtual) indiceAtual = i
    else break
  }

  const indiceProximo = Math.min(indiceAtual + 1, rota.passos.length - 1)
  const distanciaProximaManobra = Math.max(0, inicioDoPasso[indiceProximo] - distanciaAcumuladaAtual)
  const distanciaRestanteTotal = Math.max(0, rota.distanciaTotalMetros - distanciaAcumuladaAtual)
  const proporcaoRestante = rota.distanciaTotalMetros > 0 ? distanciaRestanteTotal / rota.distanciaTotalMetros : 0

  return {
    indiceProximo,
    distanciaProximaManobra,
    distanciaRestanteTotal,
    duracaoRestanteTotalSegundos: rota.duracaoTotalSegundos * proporcaoRestante,
    chegou: indiceAtual >= rota.passos.length - 1 && distanciaRestanteTotal < 15,
  }
}

const SETAS_POR_MODIFICADOR: Record<string, string> = {
  left: '⬅️',
  'sharp left': '↩️',
  'slight left': '↖️',
  right: '➡️',
  'sharp right': '↪️',
  'slight right': '↗️',
  straight: '⬆️',
  uturn: '🔄',
}

export function obterIconeInstrucao(passo: PassoRota | undefined): string {
  if (!passo) return '⬆️'
  if (passo.tipo === 'arrive') return '🏁'
  if (passo.tipo === 'roundabout' || passo.tipo === 'rotary') return '🔄'
  return SETAS_POR_MODIFICADOR[passo.modificador ?? ''] ?? '⬆️'
}

export function formatarDistancia(metros: number): string {
  if (metros < 1000) return `${Math.max(0, Math.round(metros / 10) * 10)} m`
  return `${(metros / 1000).toFixed(1)} km`
}

export function formatarDuracaoRestante(segundos: number): string {
  const minutos = Math.round(segundos / 60)
  if (minutos < 1) return '< 1 min'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return `${horas}h${resto > 0 ? ` ${resto}min` : ''}`
}

export function calcularBearing(a: Ponto, b: Ponto): number {
  const lat1 = paraRadianos(a.latitude)
  const lat2 = paraRadianos(b.latitude)
  const dLon = paraRadianos(b.longitude - a.longitude)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}
