import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'

// Mesmo texto publicado em vainaboamobilidade.com.br/privacidade, só que renderizado nativo dentro
// do app em vez de abrir uma página externa (mesmo padrão do app Cliente — ver
// PoliticaPrivacidadeScreen.tsx do MobileTransportesApp).
const SECOES: { titulo: string; paragrafos: string[]; itens?: string[] }[] = [
  {
    titulo: '1. Quem somos',
    paragrafos: [
      'Esta política é publicada por VZY Tecnologia da Informação, inscrita no CNPJ sob o nº 68.923.558/0001-82 ("Vai na Boa", "nós"), responsável pelo tratamento dos dados pessoais coletados através dos aplicativos Vai na Boa e Vai na Boa Motorista e do site vainaboamobilidade.com.br.',
    ],
  },
  {
    titulo: '2. Dados que coletamos',
    paragrafos: [
      'Coletamos diretamente de você, no momento do cadastro e do uso do app:',
    ],
    itens: [
      'Nome completo, e-mail e senha (armazenada com hash) — pra criar e autenticar a conta',
      'CPF e telefone — pra identificação e contato entre as partes de uma corrida',
      'Endereço (logradouro, número, bairro, cidade, estado) — pra definir origem/destino e sugerir endereços',
      'Localização GPS em tempo real — pra estimar rota/preço e acompanhar a corrida em andamento',
      'CNH, placa, modelo e ano do veículo — pra habilitação como motorista parceiro e categorias de corrida',
      'Histórico de corridas, avaliações, saldo e transações da carteira — pra operação do serviço e suporte',
    ],
  },
  {
    titulo: '3. Localização',
    paragrafos: [
      'O app pede acesso à sua localização enquanto em uso para calcular rota/preço das corridas e, enquanto você estiver "disponível" ou em corrida, pra que o passageiro veja seu veículo se aproximando no mapa durante uma corrida ativa.',
      'A sua localização só é enviada aos nossos servidores enquanto o app estiver aberto e você estiver "disponível" ou em corrida, e só é exibida ao passageiro da corrida em andamento — nunca a terceiros ou outros usuários.',
      'Você pode revogar a permissão de localização a qualquer momento nas configurações do aparelho; sem ela, você não recebe corridas novas nem o passageiro consegue acompanhar sua chegada no mapa.',
    ],
  },
  {
    titulo: '4. Como usamos os dados',
    paragrafos: ['Usamos os dados coletados para:'],
    itens: [
      'Viabilizar o pedido, aceite e acompanhamento de corridas entre passageiros e motoristas',
      'Processar pagamentos das corridas, saques e assinatura do plano Executivo',
      'Enviar e-mails transacionais e notificações push sobre corridas novas e o andamento delas',
      'Prevenir fraude e uso indevido da plataforma',
      'Cumprir obrigações legais e fiscais',
    ],
  },
  {
    titulo: '5. Com quem compartilhamos',
    paragrafos: ['Compartilhamos dados apenas com prestadores de serviço estritamente necessários à operação:'],
    itens: [
      'Mercado Pago — processamento de pagamentos e assinaturas (não temos acesso a números de cartão)',
      'Banco Inter — envio via Pix dos valores sacados da sua carteira de motorista',
      'Google Maps Platform — geocodificação de endereços e cálculo de rotas',
      'Provedor de e-mail (SMTP) — envio de e-mails transacionais da conta',
      'Entre passageiro e motorista — nome, localização em tempo real e dados do veículo são compartilhados entre as duas partes de uma mesma corrida, pelo tempo necessário a ela',
    ],
  },
  {
    titulo: '6. Armazenamento e segurança',
    paragrafos: [
      'Os dados são armazenados em banco de dados hospedado em servidor próprio, com senhas protegidas por hash e comunicação entre app e servidor criptografada (HTTPS/TLS). Acesso interno aos dados é restrito à equipe responsável pela operação da plataforma.',
    ],
  },
  {
    titulo: '7. Retenção e exclusão',
    paragrafos: [
      'Mantemos seus dados enquanto sua conta estiver ativa e pelo prazo adicional exigido por obrigações legais e fiscais (ex.: histórico de transações financeiras e saques). Ao solicitar a exclusão da conta, removemos ou anonimizamos os dados pessoais que não precisem ser retidos por lei.',
    ],
  },
  {
    titulo: '8. Seus direitos (LGPD)',
    paragrafos: ['Nos termos dos artigos 17 a 22 da LGPD, você pode solicitar, a qualquer momento:'],
    itens: [
      'Confirmação de que tratamos seus dados, e acesso a eles',
      'Correção de dados incompletos, inexatos ou desatualizados',
      'Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei',
      'Portabilidade dos dados a outro fornecedor',
      'Eliminação dos dados tratados com base no seu consentimento',
      'Revogação do consentimento, a qualquer momento',
    ],
  },
  {
    titulo: '9. Menores de idade',
    paragrafos: [
      'Os aplicativos são destinados a maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade. Se identificarmos uma conta criada por um menor, ela será removida.',
    ],
  },
  {
    titulo: '10. Cookies e identificadores',
    paragrafos: [
      'O aplicativo usa um token de sessão local (armazenado no aparelho) para manter você conectado, e um identificador de notificações push (Expo/Firebase) para o envio de alertas sobre corridas novas. Não usamos cookies de rastreamento publicitário.',
    ],
  },
  {
    titulo: '11. Alterações desta política',
    paragrafos: [
      'Podemos atualizar esta política periodicamente. Mudanças relevantes serão avisadas dentro do app ou por e-mail antes de entrarem em vigor.',
    ],
  },
  {
    titulo: '12. Contato e encarregado',
    paragrafos: [
      'Dúvidas, solicitações sobre seus dados ou exercício dos direitos da LGPD podem ser enviadas para contato@vainaboamobilidade.com.br.',
      'Encarregado de proteção de dados (DPO): VZY Tecnologia da Informação, contato pelo mesmo e-mail.',
    ],
  },
  {
    titulo: '13. Como excluir sua conta',
    paragrafos: [
      'Para excluir sua conta nos aplicativos Vai na Boa ou Vai na Boa Motorista, siga os passos abaixo:',
    ],
    itens: [
      'Envie um e-mail para contato@vainaboamobilidade.com.br, a partir do e-mail cadastrado na conta, informando qual app e pedindo a exclusão da conta',
      'Confirmamos o recebimento em até 2 dias úteis e concluímos a exclusão em até 15 dias',
      'Também é possível pedir a exclusão de dados específicos, sem excluir a conta inteira, pelo mesmo canal',
    ],
  },
]

export default function PoliticaPrivacidadeScreen() {
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Política de Privacidade</Text>
      <Text style={styles.meta}>Vigência: 2 de setembro de 2026 · Versão 1.0</Text>

      <Text style={styles.lede}>
        Como tratamos os dados de quem usa os aplicativos Vai na Boa (passageiros) e Vai na Boa
        Motorista (motoristas parceiros), em conformidade com a Lei Geral de Proteção de Dados (Lei
        nº 13.709/2018 — LGPD).
      </Text>

      <View style={styles.resumo}>
        <Text style={styles.resumoTitulo}>RESUMO RÁPIDO</Text>
        {[
          'Coletamos só o necessário pra ligar passageiro, motorista e corrida: identificação, contato, endereço e localização em tempo real durante uma corrida.',
          'Pagamentos e saques passam pelo Mercado Pago e Banco Inter — não guardamos número de cartão nem dados bancários completos nos nossos servidores.',
          'Sua localização só é compartilhada com o passageiro da corrida em andamento, e só enquanto ela durar.',
          'Você pode pedir a exclusão da sua conta e dos seus dados a qualquer momento pelo e-mail de contato.',
          'Não vendemos dados pessoais a terceiros.',
        ].map((item) => (
          <View key={item} style={styles.itemLinha}>
            <Text style={styles.itemMarcador}>•</Text>
            <Text style={styles.itemTexto}>{item}</Text>
          </View>
        ))}
      </View>

      {SECOES.map((secao) => (
        <View key={secao.titulo} style={styles.secao}>
          <Text style={styles.secaoTitulo}>{secao.titulo}</Text>
          {secao.paragrafos.map((paragrafo) => (
            <Text key={paragrafo} style={styles.paragrafo}>
              {paragrafo}
            </Text>
          ))}
          {secao.itens?.map((item) => (
            <View key={item} style={styles.itemLinha}>
              <Text style={styles.itemMarcador}>•</Text>
              <Text style={styles.itemTexto}>{item}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text
        style={styles.contato}
        onPress={() => Linking.openURL('mailto:contato@vainaboamobilidade.com.br')}
      >
        contato@vainaboamobilidade.com.br
      </Text>

      <Text style={styles.rodape}>Vai na Boa Mobilidade — política de privacidade v1.0</Text>
    </ScrollView>
  )
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
    tela: {
      flex: 1,
      backgroundColor: cores.fundo,
    },
    conteudo: {
      padding: 20,
      paddingBottom: 40,
    },
    titulo: {
      fontSize: 22,
      fontWeight: '700',
      color: cores.texto,
    },
    meta: {
      fontSize: 12,
      color: cores.textoSecundario,
      marginTop: 4,
    },
    lede: {
      fontSize: 14,
      color: cores.textoSecundario,
      lineHeight: 20,
      marginTop: 14,
    },
    resumo: {
      backgroundColor: cores.primariaClara,
      borderRadius: 14,
      padding: 16,
      marginTop: 20,
      gap: 8,
    },
    resumoTitulo: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: cores.primariaEscura,
      marginBottom: 4,
    },
    secao: {
      marginTop: 26,
    },
    secaoTitulo: {
      fontSize: 16,
      fontWeight: '700',
      color: cores.texto,
      marginBottom: 8,
    },
    paragrafo: {
      fontSize: 14,
      color: cores.textoSecundario,
      lineHeight: 20,
      marginBottom: 8,
    },
    itemLinha: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
      paddingRight: 4,
    },
    itemMarcador: {
      fontSize: 14,
      color: cores.primaria,
      lineHeight: 20,
    },
    itemTexto: {
      flex: 1,
      fontSize: 14,
      color: cores.texto,
      lineHeight: 20,
    },
    contato: {
      marginTop: 28,
      fontSize: 14,
      color: cores.primaria,
      fontWeight: '600',
    },
    rodape: {
      marginTop: 24,
      fontSize: 11,
      color: cores.textoSecundario,
    },
  })
}
