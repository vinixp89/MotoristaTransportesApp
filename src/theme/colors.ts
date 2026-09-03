// Paleta da "Vai na Boa" — perfil Motorista usa a mesma cor de marca roxa do front-end web
// (FrontTransportesApp/src/pages/HomePage.jsx: bg-purple-* pro perfil motorista), com uma versão
// clara e uma escura (ver ThemeContext) — mesmo padrão do app Cliente, os nomes das chaves são os
// mesmos nas duas, só o valor muda.
export const coresClaras = {
  primaria: '#9333ea',
  primariaEscura: '#7e22ce',
  primariaClara: '#faf5ff',
  amarelo: '#eab308',
  verde: '#16a34a',
  fundo: '#faf5ff',
  cartao: '#ffffff',
  texto: '#1f2430',
  textoSecundario: '#6b7280',
  borda: '#d1d5db',
  erroFundo: '#fef2f2',
  erroTexto: '#b91c1c',
  branco: '#ffffff',
}

export const coresEscuras: Cores = {
  primaria: '#a855f7',
  primariaEscura: '#9333ea',
  primariaClara: '#241c38',
  amarelo: '#eab308',
  verde: '#22c55e',
  fundo: '#0f0b17',
  cartao: '#1c1826',
  texto: '#f3f4f6',
  textoSecundario: '#9ca3af',
  borda: '#374151',
  erroFundo: '#450a0a',
  erroTexto: '#fca5a5',
  branco: '#ffffff',
}

export type Cores = typeof coresClaras
