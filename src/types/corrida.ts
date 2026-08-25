export type Endereco = {
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  latitude: number
  longitude: number
  complemento?: string | null
}

export type Corrida = {
  id: string
  clienteId: string
  motoristaId: string | null
  origem: Endereco
  destino: Endereco
  distanciaEstimadaKm: number
  distanciaRealKm: number | null
  faixaContratada: number
  valorReferencia: number
  tipoConsumo: number
  status: number
  dataSolicitacao: string
}
