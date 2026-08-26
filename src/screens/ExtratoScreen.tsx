import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { obterFaixa, formatarPreco } from '../constants/faixas'
import { obterStatusLabel, STATUS_FINALIZADA } from '../constants/statusCorrida'
import { cores } from '../theme/colors'
import type { Corrida } from '../types/corrida'

// Espelha a ExtratoCorridasPage do front-end web: histórico de corridas do motorista logado,
// mais recentes primeiro (GET /Corridas/minhas).
export default function ExtratoScreen() {
  const [corridas, setCorridas] = useState<Corrida[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api
      .get<Corrida[]>('/Corridas/minhas')
      .then(({ data }) => setCorridas(data))
      .catch((error) => setErro(extrairMensagemErro(error)))
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator color={cores.primaria} size="large" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      {erro ? (
        <View style={styles.erroCaixa}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      ) : null}

      {!erro && corridas.length === 0 && (
        <View style={styles.cartaoVazio}>
          <Text style={styles.textoVazio}>Nenhuma corrida no seu histórico ainda.</Text>
        </View>
      )}

      {corridas.length > 0 && (
        <View style={styles.lista}>
          {corridas.map((c, indice) => {
            const faixa = obterFaixa(c.faixaContratada)
            const status = obterStatusLabel(c.status)

            return (
              <View key={c.id} style={[styles.linha, indice > 0 && styles.linhaComBorda]}>
                <View style={styles.linhaEsquerda}>
                  <View style={[styles.bolinha, { backgroundColor: faixa.hex }]} />
                  <View>
                    <Text style={styles.trajeto}>
                      {c.origem.bairro} → {c.destino.bairro}
                    </Text>
                    <Text style={styles.data}>{new Date(c.dataSolicitacao).toLocaleString('pt-BR')}</Text>
                  </View>
                </View>

                <View style={styles.linhaDireita}>
                  <Text style={styles.valor}>{formatarPreco(c.valorReferencia)}</Text>
                  {c.status === STATUS_FINALIZADA && (
                    <Text style={styles.valorGanho}>Você ganhou: {formatarPreco(c.valorMotorista)}</Text>
                  )}
                  <View style={[styles.statusBadge, { backgroundColor: status.corFundo }]}>
                    <Text style={[styles.statusTexto, { color: status.corTexto }]}>{status.texto}</Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      )}
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
    marginBottom: 12,
  },
  erroTexto: {
    color: cores.erroTexto,
    fontSize: 13,
  },
  cartaoVazio: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  textoVazio: {
    color: cores.textoSecundario,
    fontSize: 14,
  },
  lista: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    overflow: 'hidden',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  linhaComBorda: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  linhaEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  bolinha: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trajeto: {
    fontSize: 13,
    fontWeight: '500',
    color: cores.texto,
  },
  data: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  linhaDireita: {
    alignItems: 'flex-end',
    gap: 4,
  },
  valor: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.texto,
  },
  valorGanho: {
    fontSize: 11,
    fontWeight: '600',
    color: cores.primaria,
    marginTop: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusTexto: {
    fontSize: 11,
    fontWeight: '500',
  },
})
