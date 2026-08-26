// StatusCorrida vem serializado como número (TransportesApp.Domain/Enums/Enums.cs):
// 0 Solicitada, 1 Confirmada, 2 MotoristaACaminho (não usado ainda), 3 EmAndamento,
// 4 Finalizada, 5 Cancelada.
export const STATUS_LABEL: Record<number, { texto: string; corFundo: string; corTexto: string }> = {
  0: { texto: 'Solicitada', corFundo: '#f3f4f6', corTexto: '#374151' },
  1: { texto: 'Motorista a caminho', corFundo: '#f3e8ff', corTexto: '#7e22ce' },
  2: { texto: 'A caminho', corFundo: '#f3e8ff', corTexto: '#7e22ce' },
  3: { texto: 'Em andamento', corFundo: '#fef9c3', corTexto: '#854d0e' },
  4: { texto: 'Finalizada', corFundo: '#dcfce7', corTexto: '#15803d' },
  5: { texto: 'Cancelada', corFundo: '#fee2e2', corTexto: '#b91c1c' },
}

export function obterStatusLabel(status: number) {
  return STATUS_LABEL[status] ?? STATUS_LABEL[0]
}

// Status com motorista já atribuído e ainda não finalizado (Confirmada ou EmAndamento).
export const STATUS_CONFIRMADA = 1
export const STATUS_EM_ANDAMENTO = 3
export const STATUS_FINALIZADA = 4
