import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { obterFaixa, formatarPreco } from '../constants/faixas'
import { obterStatusLabel, STATUS_CONFIRMADA } from '../constants/statusCorrida'
import { cores } from '../theme/colors'
import type { Corrida } from '../types/corrida'

const INTERVALO_MS = 5000

// Espelha a CorridasMotoristaPage do front-end web: enquanto o motorista não tem corrida aceita,
// mostra a lista de pendentes (Solicitada); assim que aceita uma, troca pro painel da corrida
// atual (iniciar/finalizar) — nunca as duas coisas juntas, porque aceitar deixa o motorista
// EmCorrida no backend (não dá pra aceitar outra até finalizar).
export default function CorridasScreen() {
  const [corridaAtual, setCorridaAtual] = useState<Corrida | null>(null)
  const [pendentes, setPendentes] = useState<Corrida[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aceitandoId, setAceitandoId] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [distanciaReal, setDistanciaReal] = useState('')
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const buscar = useCallback(async () => {
    try {
      const { data: atual } = await api.get<Corrida | null>('/Corridas/atual')
      setCorridaAtual(atual)

      if (!atual) {
        const { data: lista } = await api.get<Corrida[]>('/Corridas/pendentes')
        setPendentes(lista)
      }
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscar()
    intervaloRef.current = setInterval(buscar, INTERVALO_MS)

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current)
    }
  }, [buscar])

  useEffect(() => {
    if (corridaAtual) setDistanciaReal(corridaAtual.distanciaEstimadaKm.toFixed(1))
  }, [corridaAtual?.id])

  async function handleAceitar(id: string) {
    setAceitandoId(id)
    setErro('')

    try {
      const { data } = await api.patch<Corrida>(`/Corridas/${id}/atribuir-motorista`)
      setCorridaAtual(data)
      setPendentes([])
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setAceitandoId(null)
    }
  }

  async function handleIniciar() {
    if (!corridaAtual) return
    setIniciando(true)
    setErro('')

    try {
      const { data } = await api.patch<Corrida>(`/Corridas/${corridaAtual.id}/iniciar`)
      setCorridaAtual(data)
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setIniciando(false)
    }
  }

  async function handleFinalizar() {
    if (!corridaAtual) return
    setFinalizando(true)
    setErro('')

    try {
      await api.patch(`/Corridas/${corridaAtual.id}/finalizar`, {
        distanciaReal: Number(distanciaReal),
      })
      setCorridaAtual(null)
      buscar()
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setFinalizando(false)
    }
  }

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

      {corridaAtual ? (
        <PainelCorridaAtual
          corrida={corridaAtual}
          iniciando={iniciando}
          finalizando={finalizando}
          distanciaReal={distanciaReal}
          onDistanciaChange={setDistanciaReal}
          onIniciar={handleIniciar}
          onFinalizar={handleFinalizar}
        />
      ) : pendentes.length === 0 ? (
        <View style={styles.cartaoVazio}>
          <Text style={styles.textoVazio}>Nenhuma corrida esperando motorista no momento.</Text>
        </View>
      ) : (
        pendentes.map((c) => {
          const faixa = obterFaixa(c.faixaContratada)

          return (
            <View key={c.id} style={[styles.cartaoPendente, { borderLeftColor: faixa.hex }]}>
              <View style={styles.linhaTopo}>
                <View style={[styles.badge, { backgroundColor: faixa.hex }]}>
                  <Text style={[styles.badgeTexto, { color: faixa.textoClaro ? '#1f2937' : cores.branco }]}>
                    {faixa.nome.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.valor, { color: faixa.hex }]}>{formatarPreco(c.valorReferencia)}</Text>
              </View>

              <Text style={styles.trajeto}>
                {c.origem.bairro} → {c.destino.bairro}
              </Text>
              <Text style={styles.km}>{c.distanciaEstimadaKm.toFixed(1)} km</Text>

              <Pressable
                onPress={() => handleAceitar(c.id)}
                disabled={aceitandoId !== null}
                style={({ pressed }) => [
                  styles.botao,
                  (pressed || aceitandoId !== null) && styles.botaoPressionado,
                ]}
              >
                <Text style={styles.botaoTexto}>{aceitandoId === c.id ? 'Aceitando...' : 'Aceitar corrida'}</Text>
              </Pressable>
            </View>
          )
        })
      )}
    </ScrollView>
  )
}

function PainelCorridaAtual({
  corrida,
  iniciando,
  finalizando,
  distanciaReal,
  onDistanciaChange,
  onIniciar,
  onFinalizar,
}: {
  corrida: Corrida
  iniciando: boolean
  finalizando: boolean
  distanciaReal: string
  onDistanciaChange: (v: string) => void
  onIniciar: () => void
  onFinalizar: () => void
}) {
  const faixa = obterFaixa(corrida.faixaContratada)
  const status = obterStatusLabel(corrida.status)

  return (
    <View style={[styles.cartaoAtual, { borderLeftColor: faixa.hex }]}>
      <View style={styles.linhaTopo}>
        <View style={[styles.badge, { backgroundColor: faixa.hex }]}>
          <Text style={[styles.badgeTexto, { color: faixa.textoClaro ? '#1f2937' : cores.branco }]}>
            {faixa.nome.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.corFundo }]}>
          <Text style={[styles.statusTexto, { color: status.corTexto }]}>{status.texto}</Text>
        </View>
      </View>

      <View style={styles.enderecos}>
        <View style={styles.linhaEndereco}>
          <View style={[styles.bolinhaEndereco, { backgroundColor: '#38bdf8' }]} />
          <Text style={styles.enderecoTexto}>
            {corrida.origem.logradouro}, {corrida.origem.numero} — {corrida.origem.bairro}
          </Text>
        </View>
        <View style={styles.linhaTracejada} />
        <View style={styles.linhaEndereco}>
          <View style={[styles.bolinhaEndereco, { backgroundColor: faixa.hex }]} />
          <Text style={styles.enderecoTexto}>
            {corrida.destino.logradouro}, {corrida.destino.numero} — {corrida.destino.bairro}
          </Text>
        </View>
      </View>

      <View style={styles.linhaTopo}>
        <Text style={styles.km}>{corrida.distanciaEstimadaKm.toFixed(1)} km estimados</Text>
        <Text style={[styles.valor, { color: faixa.hex }]}>{formatarPreco(corrida.valorReferencia)}</Text>
      </View>

      {corrida.status === STATUS_CONFIRMADA ? (
        <Pressable
          onPress={onIniciar}
          disabled={iniciando}
          style={({ pressed }) => [styles.botao, (pressed || iniciando) && styles.botaoPressionado]}
        >
          <Text style={styles.botaoTexto}>{iniciando ? 'Iniciando...' : 'Iniciar viagem'}</Text>
        </Pressable>
      ) : (
        <View style={styles.formFinalizar}>
          <Text style={styles.rotulo}>Distância percorrida (km)</Text>
          <TextInput
            value={distanciaReal}
            onChangeText={onDistanciaChange}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Pressable
            onPress={onFinalizar}
            disabled={finalizando || !distanciaReal}
            style={({ pressed }) => [
              styles.botao,
              { backgroundColor: cores.verde },
              (pressed || finalizando || !distanciaReal) && styles.botaoPressionado,
            ]}
          >
            <Text style={styles.botaoTexto}>{finalizando ? 'Finalizando...' : 'Finalizar corrida'}</Text>
          </Pressable>
        </View>
      )}
    </View>
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
    textAlign: 'center',
  },
  cartaoPendente: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cartaoAtual: {
    backgroundColor: cores.cartao,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTexto: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
  valor: {
    fontSize: 18,
    fontWeight: '700',
  },
  trajeto: {
    marginTop: 12,
    fontSize: 14,
    color: cores.texto,
  },
  km: {
    marginTop: 4,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  enderecos: {
    marginTop: 14,
    gap: 4,
  },
  linhaEndereco: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bolinhaEndereco: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  linhaTracejada: {
    marginLeft: 4,
    height: 12,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.borda,
  },
  enderecoTexto: {
    flex: 1,
    fontSize: 13,
    color: cores.texto,
  },
  botao: {
    marginTop: 16,
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  botaoPressionado: {
    opacity: 0.7,
  },
  botaoTexto: {
    color: cores.branco,
    fontSize: 14,
    fontWeight: '600',
  },
  formFinalizar: {
    marginTop: 16,
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
})
