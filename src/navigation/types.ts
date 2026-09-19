export type RootStackParamList = {
  Login: undefined
  Cadastro: undefined
  ConfirmarSms: undefined
  Home: undefined
  Extrato: undefined
  Navegacao: { corridaId: string }
  ChatCorrida: { corridaId: string }
  PlanoExecutivo: undefined
  Carteira: undefined
  SolicitarSaque: { saldo: number; valorMinimo: number }
  PoliticaPrivacidade: undefined
  Notificacoes: undefined
  SobreApp: undefined
  ConfiguracoesConta: undefined
}
