import { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { formatarPreco } from '../constants/faixas'
import { cores } from '../theme/colors'

const ANO_ATUAL = new Date().getFullYear()

// Espelha StatusAssinatura do backend (TransportesApp.Domain/Enums/Enums.cs).
const STATUS_ATIVA = 1
const STATUS_PENDENTE_PAGAMENTO = 0

type Assinatura = { id: string; precoMensal: number; status: number } | null

// Assinatura da categoria Executivo — veículo até 3 anos (sedan médio ou SUV), R$49,90, pagamento
// único via Mercado Pago (mesmo fluxo do site, ver MotoristaExecutivoPage.jsx). Abre o checkout no
// navegador do celular (Linking.openURL, sem precisar de nenhuma dependência nativa nova) — só
// depois de confirmado é que o motorista passa a ver/aceitar corridas Executivo.
export default function PlanoExecutivoScreen() {
  const [assinatura, setAssinatura] = useState<Assinatura>(null)
  const [anoVeiculo, setAnoVeiculo] = useState(String(ANO_ATUAL))
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagemSucesso, setMensagemSucesso] = useState('')

  useEffect(() => {
    api
      .get('/Motoristas/executivo/assinatura')
      .then(({ data }) => setAssinatura(data))
      .catch((error) => setErro(extrairMensagemErro(error)))
      .finally(() => setCarregando(false))
  }, [])

  const ativa = assinatura?.status === STATUS_ATIVA
  const pendente = assinatura?.status === STATUS_PENDENTE_PAGAMENTO

  async function handleAssinar() {
    setProcessando(true)
    setErro('')
    setMensagemSucesso('')

    try {
      const { data } = await api.post('/Motoristas/executivo/assinar', { anoVeiculo: Number(anoVeiculo) })

      // O backend só devolve checkoutUrl quando tem pagamento pra fazer — se o motorista já tinha
      // assinatura ativa, vem null e nada a pagar de novo.
      if (data.checkoutUrl) {
        await Linking.openURL(data.checkoutUrl)
        return
      }

      setAssinatura(data.assinatura)
      setMensagemSucesso('Assinatura Executivo confirmada!')
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setProcessando(false)
    }
  }

  async function handleCancelar() {
    setCancelando(true)
    setErro('')
    setMensagemSucesso('')

    try {
      await api.post('/Motoristas/executivo/cancelar')
      setAssinatura(null)
      setMensagemSucesso('Assinatura Executivo cancelada.')
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setCancelando(false)
    }
  }

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <View style={styles.cartaoDestaque}>
        <Text style={styles.destaqueTitulo}>EXECUTIVO</Text>
        <View style={styles.precoLinha}>
          <Text style={styles.precoValor}>{formatarPreco(49.9)}</Text>
          <Text style={styles.precoPeriodo}>/mês</Text>
        </View>
        <View style={{ gap: 4, marginTop: 12 }}>
          <Text style={styles.beneficio}>• Corridas com valor mais alto por faixa</Text>
          <Text style={styles.beneficio}>• Veículo com até 3 anos de fabricação</Text>
          <Text style={styles.beneficio}>• Sedan médio ou SUV</Text>
        </View>
      </View>

      <View style={styles.cartao}>
        {mensagemSucesso ? <Text style={styles.sucesso}>{mensagemSucesso}</Text> : null}
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        {carregando && <ActivityIndicator color={cores.primaria} style={{ marginTop: 4 }} />}

        {!carregando && ativa && (
          <View style={{ gap: 10 }}>
            <View style={styles.selo}>
              <Text style={styles.seloTexto}>Assinatura Executivo ativa</Text>
            </View>
            <Pressable onPress={handleCancelar} disabled={cancelando}>
              <Text style={styles.linkCancelar}>{cancelando ? 'Cancelando...' : 'Cancelar assinatura'}</Text>
            </Pressable>
          </View>
        )}

        {!carregando && !ativa && (
          <View style={{ gap: 14 }}>
            <View>
              <Text style={styles.rotulo}>Ano de fabricação do veículo</Text>
              <TextInput
                value={anoVeiculo}
                onChangeText={setAnoVeiculo}
                keyboardType="number-pad"
                maxLength={4}
                style={styles.input}
              />
              <Text style={styles.dica}>Precisa ser {ANO_ATUAL - 3} ou mais recente.</Text>
            </View>

            {pendente && <Text style={styles.avisoP}>Você tem um pagamento pendente — continue pra confirmar.</Text>}

            <Pressable
              onPress={handleAssinar}
              disabled={processando || !anoVeiculo}
              style={[styles.botao, (processando || !anoVeiculo) && styles.desabilitado]}
            >
              {processando ? (
                <ActivityIndicator color={cores.branco} />
              ) : (
                <Text style={styles.botaoTexto}>{pendente ? 'Continuar pagamento' : 'Assinar Executivo'}</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  cartaoDestaque: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
  },
  destaqueTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: cores.branco,
    letterSpacing: 1,
  },
  precoLinha: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 6,
  },
  precoValor: {
    fontSize: 26,
    fontWeight: '800',
    color: cores.branco,
  },
  precoPeriodo: {
    fontSize: 13,
    color: '#9ca3af',
  },
  beneficio: {
    fontSize: 13,
    color: '#d1d5db',
  },
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  sucesso: {
    backgroundColor: cores.primariaClara,
    color: cores.primariaEscura,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  erro: {
    backgroundColor: cores.erroFundo,
    color: cores.erroTexto,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  selo: {
    borderWidth: 1,
    borderColor: cores.verde,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  seloTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.verde,
  },
  linkCancelar: {
    fontSize: 12,
    color: cores.textoSecundario,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  rotulo: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.texto,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: cores.texto,
    backgroundColor: cores.fundo,
  },
  dica: {
    fontSize: 11,
    color: cores.textoSecundario,
    marginTop: 4,
  },
  avisoP: {
    fontSize: 12,
    color: '#a16207',
  },
  botao: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  desabilitado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: cores.branco,
    fontSize: 15,
    fontWeight: '700',
  },
})
