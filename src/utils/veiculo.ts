// Tipo de veículo do motorista — o backend (enum TipoVeiculo) serializa como número: 0 = carro, 1 = moto.
export type TipoVeiculo = 'carro' | 'moto'

export const TIPO_VEICULO_API: Record<TipoVeiculo, number> = { carro: 0, moto: 1 }

export function tipoVeiculoDaApi(valor?: number | null): TipoVeiculo {
  return valor === TIPO_VEICULO_API.moto ? 'moto' : 'carro'
}

// Declarações exigidas de quem dirige moto (transporte remunerado de passageiro) — a caixa de CNH A/EAR
// e o aceite das regras gravam data no backend (ver Motorista.AceitarRegrasMoto).
export const TEXTO_CNH_EAR = 'Minha CNH é categoria A e tem a observação EAR (exerce atividade remunerada).'

export const TEXTO_REGRAS_MOTO = [
  'Uso capacete em todas as corridas e só levo passageiro que também use capacete.',
  'Levo no máximo 1 passageiro por vez, sempre maior de 18 anos.',
  'Cumpro as regras de transporte por moto da minha cidade e sou responsável pela moto e pelos equipamentos de segurança.',
].join('\n• ')
