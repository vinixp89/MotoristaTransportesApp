// Espelha TipoTransacaoCarteiraMotorista (TransportesApp.Domain/Enums/Enums.cs) — serializado como
// número (sem JsonStringEnumConverter configurado na API).
export const TIPO_TRANSACAO_CREDITO_CORRIDA = 0
export const TIPO_TRANSACAO_DEBITO_SAQUE = 1
export const TIPO_TRANSACAO_ESTORNO_SAQUE = 2

// Espelha TipoSaque.
export const TIPO_SAQUE_PIX = 0
export const TIPO_SAQUE_TRANSFERENCIA = 1

// Espelha StatusSolicitacaoSaque.
export const STATUS_SAQUE_PENDENTE = 0
export const STATUS_SAQUE_CONCLUIDA = 1
export const STATUS_SAQUE_REJEITADA = 2

export type CarteiraMotorista = {
  id: string
  motoristaId: string
  saldo: number
  valorMinimoSaque: number
  dataCriacao: string
}

export type TransacaoCarteiraMotorista = {
  id: string
  tipo: number
  valor: number
  data: string
  descricao: string
}

export type SolicitacaoSaque = {
  id: string
  valor: number
  tipo: number
  chavePix: string | null
  banco: string | null
  agencia: string | null
  conta: string | null
  tipoConta: string | null
  status: number
  dataSolicitacao: string
  dataProcessamento: string | null
  motivoRejeicao: string | null
}
