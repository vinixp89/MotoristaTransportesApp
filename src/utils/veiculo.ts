// Tipo de veículo do motorista — o backend (enum TipoVeiculo) serializa como número: 0 = carro, 1 = moto.
export type TipoVeiculo = 'carro' | 'moto'

export const TIPO_VEICULO_API: Record<TipoVeiculo, number> = { carro: 0, moto: 1 }

export function tipoVeiculoDaApi(valor?: number | null): TipoVeiculo {
  return valor === TIPO_VEICULO_API.moto ? 'moto' : 'carro'
}
