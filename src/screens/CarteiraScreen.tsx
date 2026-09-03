import { useCallback, useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { formatarPreco } from '../constants/faixas'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'
import {
  STATUS_SAQUE_CONCLUIDA,
  STATUS_SAQUE_PENDENTE,
  STATUS_SAQUE_REJEITADA,
  TIPO_TRANSACAO_CREDITO_CORRIDA,
  type CarteiraMotorista,
  type SolicitacaoSaque,
  type TransacaoCarteiraMotorista,
} from '../types/carteira'

type Props = NativeStackScreenProps<RootStackParamList, 'Carteira'>

function statusSaqueLabel(status: number) {
  if (status === STATUS_SAQUE_CONCLUIDA) return { texto: 'Pago', corFundo: '#dcfce7', corTexto: '#15803d' }
  if (status === STATUS_SAQUE_REJEITADA) return { texto: 'Rejeitado', corFundo: '#fee2e2', corTexto: '#b91c1c' }
  return { texto: 'Pendente', corFundo: '#fef3c7', corTexto: '#a16207' }
}

// Saldo do motorista (repasse automático das corridas finalizadas) + histórico + solicitações de
// saque. O saque em si é pedido na SolicitarSaqueScreen; aqui só mostra o resultado.
export default function CarteiraScreen({ navigation }: Props) {
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  const [carteira, setCarteira] = useState<CarteiraMotorista | null>(null)
  const [extrato, setExtrato] = useState<TransacaoCarteiraMotorista[]>([])
  const [saques, setSaques] = useState<SolicitacaoSaque[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [{ data: minhaCarteira }, { data: minhoExtrato }, { data: meusSaques }] = await Promise.all([
        api.get<CarteiraMotorista>('/CarteirasMotorista/minha-carteira'),
        api.get<TransacaoCarteiraMotorista[]>('/CarteirasMotorista/extrato'),
        api.get<SolicitacaoSaque[]>('/CarteirasMotorista/saques'),
      ])
      setCarteira(minhaCarteira)
      setExtrato(minhoExtrato)
      setSaques(meusSaques)
    } catch (error) {
      setErro(extrairMensagemErro(error))
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setCarregando(true)
      carregar().finally(() => setCarregando(false))
    }, [carregar]),
  )

  async function handleAtualizar() {
    setAtualizando(true)
    await carregar()
    setAtualizando(false)
  }

  if (carregando) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator color={cores.primaria} size="large" />
      </View>
    )
  }

  const saldo = carteira?.saldo ?? 0
  const podeSacar = carteira !== null && saldo >= carteira.valorMinimoSaque

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={handleAtualizar} tintColor={cores.primaria} />}
    >
      {erro ? (
        <View style={styles.erroCaixa}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      ) : null}

      <View style={styles.cartaoSaldo}>
        <Text style={styles.saldoRotulo}>Saldo disponível</Text>
        <Text style={styles.saldoValor}>{formatarPreco(saldo)}</Text>

        <Pressable
          onPress={() => navigation.navigate('SolicitarSaque', { saldo, valorMinimo: carteira?.valorMinimoSaque ?? 0 })}
          disabled={!podeSacar}
          style={({ pressed }) => [styles.botaoSaque, (pressed || !podeSacar) && styles.pressionado]}
        >
          <Text style={styles.botaoSaqueTexto}>💸 Solicitar saque</Text>
        </Pressable>

        {!podeSacar && carteira ? (
          <Text style={styles.dicaMinimo}>Saque mínimo: {formatarPreco(carteira.valorMinimoSaque)}</Text>
        ) : null}
      </View>

      {saques.length > 0 ? (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Meus saques</Text>
          <View style={styles.lista}>
            {saques.map((s, indice) => {
              const status = statusSaqueLabel(s.status)
              return (
                <View key={s.id} style={[styles.linha, indice > 0 && styles.linhaComBorda]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linhaValor}>{formatarPreco(s.valor)}</Text>
                    <Text style={styles.linhaData}>{new Date(s.dataSolicitacao).toLocaleString('pt-BR')}</Text>
                    {s.status === STATUS_SAQUE_REJEITADA && s.motivoRejeicao ? (
                      <Text style={styles.linhaMotivo}>{s.motivoRejeicao}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.corFundo }]}>
                    <Text style={[styles.statusTexto, { color: status.corTexto }]}>{status.texto}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Extrato</Text>
        {extrato.length === 0 ? (
          <View style={styles.cartaoVazio}>
            <Text style={styles.textoVazio}>Nenhuma movimentação ainda.</Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {extrato.map((t, indice) => {
              const positivo = t.tipo === TIPO_TRANSACAO_CREDITO_CORRIDA
              return (
                <View key={t.id} style={[styles.linha, indice > 0 && styles.linhaComBorda]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linhaDescricao}>{t.descricao}</Text>
                    <Text style={styles.linhaData}>{new Date(t.data).toLocaleString('pt-BR')}</Text>
                  </View>
                  <Text style={[styles.linhaValorExtrato, { color: positivo ? cores.verde : cores.erroTexto }]}>
                    {positivo ? '+' : '-'} {formatarPreco(t.valor)}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
      </View>
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
      padding: 16,
      paddingBottom: 40,
      gap: 16,
    },
    centralizado: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: cores.fundo,
    },
    erroCaixa: {
      backgroundColor: cores.erroFundo,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    erroTexto: {
      color: cores.erroTexto,
      fontSize: 13,
    },
    cartaoSaldo: {
      backgroundColor: '#111827',
      borderRadius: 16,
      padding: 22,
      alignItems: 'center',
    },
    saldoRotulo: {
      fontSize: 13,
      color: '#9ca3af',
      fontWeight: '600',
    },
    saldoValor: {
      fontSize: 34,
      fontWeight: '800',
      color: cores.branco,
      marginTop: 6,
    },
    botaoSaque: {
      marginTop: 18,
      backgroundColor: cores.primaria,
      borderRadius: 10,
      paddingVertical: 13,
      paddingHorizontal: 24,
      alignItems: 'center',
      width: '100%',
    },
    pressionado: {
      opacity: 0.6,
    },
    botaoSaqueTexto: {
      color: cores.branco,
      fontSize: 14,
      fontWeight: '700',
    },
    dicaMinimo: {
      marginTop: 10,
      fontSize: 12,
      color: '#9ca3af',
    },
    secao: {
      gap: 8,
    },
    secaoTitulo: {
      fontSize: 14,
      fontWeight: '700',
      color: cores.texto,
    },
    lista: {
      backgroundColor: cores.cartao,
      borderRadius: 16,
      overflow: 'hidden',
    },
    cartaoVazio: {
      backgroundColor: cores.cartao,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
    },
    textoVazio: {
      color: cores.textoSecundario,
      fontSize: 13,
    },
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    linhaComBorda: {
      borderTopWidth: 1,
      borderTopColor: cores.borda,
    },
    linhaDescricao: {
      fontSize: 13,
      fontWeight: '500',
      color: cores.texto,
    },
    linhaValor: {
      fontSize: 14,
      fontWeight: '700',
      color: cores.texto,
    },
    linhaData: {
      fontSize: 11,
      color: cores.textoSecundario,
      marginTop: 2,
    },
    linhaMotivo: {
      fontSize: 11,
      color: cores.erroTexto,
      marginTop: 2,
    },
    linhaValorExtrato: {
      fontSize: 13,
      fontWeight: '700',
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusTexto: {
      fontSize: 11,
      fontWeight: '600',
    },
  })
}
