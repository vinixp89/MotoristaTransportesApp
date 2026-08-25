// Espelha a tabela de faixas do backend (TransportesApp.Domain/ValueObjects/FaixaDistancia.cs) só
// pra nome/cor de exibição — o valor em si (preço) vem sempre da API.
export type Faixa = {
  valor: number
  nome: string
  km: string
  hex: string
  textoClaro: boolean
}

export const FAIXAS: Faixa[] = [
  { valor: 0, nome: 'Azul', km: '1 a 5 km', hex: '#3b82f6', textoClaro: false },
  { valor: 1, nome: 'Amarela', km: '5,1 a 10 km', hex: '#facc15', textoClaro: true },
  { valor: 2, nome: 'Laranja', km: '10,1 a 15 km', hex: '#f97316', textoClaro: false },
  { valor: 3, nome: 'Vermelha', km: '15,1 a 20 km', hex: '#ef4444', textoClaro: false },
  { valor: 4, nome: 'Rosa', km: '20,1 a 30 km', hex: '#f472b6', textoClaro: true },
  { valor: 5, nome: 'Verde', km: '30,1 a 40 km', hex: '#22c55e', textoClaro: false },
  { valor: 6, nome: 'Roxa', km: '40,1 a 50 km', hex: '#a855f7', textoClaro: false },
]

export function obterFaixa(valor: number): Faixa {
  return FAIXAS.find((f) => f.valor === valor) ?? FAIXAS[0]
}

export function formatarPreco(preco: number): string {
  return Number(preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
