import { useCallback, useEffect, useRef, useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import MapaNavegacao from '../components/MapaNavegacao'
import { useNavegacaoGps } from '../hooks/useNavegacaoGps'
import { obterFaixa, formatarPreco } from '../constants/faixas'
import { STATUS_CONFIRMADA, STATUS_FINALIZADA } from '../constants/statusCorrida'
import {
  formatarDistancia,
  formatarDuracaoRestante,
  obterIconeInstrucao,
} from '../utils/navegacaoGps'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'
import type { Corrida } from '../types/corrida'

type Props = NativeStackScreenProps<RootStackParamList, 'Navegacao'>

const STATUS_CANCELADA = 5
const INTERVALO_MS = 5000

// Navegação turn-by-turn tipo Maps/Waze: enquanto o motorista ainda não iniciou a viagem, guia
// ele até o CLIENTE (origem da corrida); depois de iniciar, guia até o DESTINO. Aberta sozinha
// assim que ele aceita uma corrida (ver HomeScreen) — o motorista fica aqui até finalizar.
export default function NavegacaoScreen({ route, navigation }: Props) {
  const { corridaId } = route.params
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  const [corrida, setCorrida] = useState<Corrida | null>(null)
  const [erro, setErro] = useState('')
  const [iniciando, setIniciando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [distanciaReal, setDistanciaReal] = useState('')
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const buscar = useCallback(async () => {
    try {
      const { data } = await api.get<Corrida>(`/Corridas/${corridaId}`)
      setCorrida(data)

      if (data.status === STATUS_FINALIZADA || data.status === STATUS_CANCELADA) {
        if (intervaloRef.current) clearInterval(intervaloRef.current)
        navigation.replace('Home')
      }
    } catch (error) {
      setErro(extrairMensagemErro(error))
    }
  }, [corridaId, navigation])

  useEffect(() => {
    buscar()
    intervaloRef.current = setInterval(buscar, INTERVALO_MS)
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current)
    }
  }, [buscar])

  useEffect(() => {
    if (corrida) setDistanciaReal(corrida.distanciaEstimadaKm.toFixed(1))
  }, [corrida?.id])

  const destinoAlvo = corrida
    ? corrida.status === STATUS_CONFIRMADA
      ? { latitude: corrida.origem.latitude, longitude: corrida.origem.longitude }
      : { latitude: corrida.destino.latitude, longitude: corrida.destino.longitude }
    : null

  const { posicao, heading, rota, progresso, erro: erroNavegacao } = useNavegacaoGps(destinoAlvo)

  async function handleIniciar() {
    if (!corrida) return
    setIniciando(true)
    setErro('')

    try {
      const { data } = await api.patch<Corrida>(`/Corridas/${corrida.id}/iniciar`, { codigo })
      setCorrida(data)
      setCodigo('')
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setIniciando(false)
    }
  }

  async function handleFinalizar() {
    if (!corrida) return
    setFinalizando(true)
    setErro('')

    try {
      await api.patch(`/Corridas/${corrida.id}/finalizar`, { distanciaReal: Number(distanciaReal) })
      navigation.replace('Home')
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setFinalizando(false)
    }
  }

  if (!corrida) {
    return (
      <View style={styles.centralizado}>
        {erro ? <Text style={styles.erroTextoSolo}>{erro}</Text> : <ActivityIndicator color={cores.primaria} size="large" />}
      </View>
    )
  }

  const faixa = obterFaixa(corrida.faixaContratada)
  const buscandoCliente = corrida.status === STATUS_CONFIRMADA
  const passoProximo = rota && progresso ? rota.passos[progresso.indiceProximo] : undefined

  return (
    <View style={styles.tela}>
      <View style={styles.mapa}>
        {rota && posicao ? (
          <MapaNavegacao pontosRota={rota.pontos} destino={destinoAlvo!} corHex={faixa.hex} posicao={posicao} heading={heading} />
        ) : (
          <View style={styles.mapaCarregando}>
            <ActivityIndicator color={cores.primaria} size="large" />
            <Text style={styles.mapaCarregandoTexto}>
              {erroNavegacao || 'Calculando rota...'}
            </Text>
          </View>
        )}
      </View>

      <Pressable onPress={() => navigation.navigate('Home')} style={styles.botaoVoltar} hitSlop={10}>
        <Text style={styles.botaoVoltarTexto}>←</Text>
      </Pressable>

      {progresso && passoProximo ? (
        <View style={styles.banner}>
          <Text style={styles.bannerIcone}>{obterIconeInstrucao(passoProximo)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerDistancia}>{formatarDistancia(progresso.distanciaProximaManobra)}</Text>
            <Text style={styles.bannerInstrucao}>{passoProximo.instrucao}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.painel}>
        <View style={styles.painelTopo}>
          <Text style={styles.painelAlvo}>
            {buscandoCliente ? '📍 Indo buscar o cliente' : '🏁 Levando ao destino'}
          </Text>
          {progresso ? (
            <Text style={styles.painelResumo}>
              {formatarDistancia(progresso.distanciaRestanteTotal)} · {formatarDuracaoRestante(progresso.duracaoRestanteTotalSegundos)}
            </Text>
          ) : null}
        </View>

        <Text style={styles.painelEndereco}>
          {buscandoCliente
            ? `${corrida.origem.logradouro}, ${corrida.origem.numero} — ${corrida.origem.bairro}`
            : `${corrida.destino.logradouro}, ${corrida.destino.numero} — ${corrida.destino.bairro}`}
        </Text>

        <Text style={styles.painelValor}>Você ganha: {formatarPreco(corrida.valorMotorista)} (85%)</Text>

        {erro ? <Text style={styles.erroTexto}>{erro}</Text> : null}

        {buscandoCliente ? (
          <View style={styles.formLinha}>
            <TextInput
              value={codigo}
              onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="Código do cliente"
              placeholderTextColor={cores.textoSecundario}
              style={[styles.input, styles.inputCodigo]}
            />
            <Pressable
              onPress={handleIniciar}
              disabled={iniciando || codigo.length !== 4}
              style={({ pressed }) => [styles.botao, (pressed || iniciando || codigo.length !== 4) && styles.pressionado]}
            >
              <Text style={styles.botaoTexto}>{iniciando ? 'Iniciando...' : 'Iniciar viagem'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.formLinha}>
            <TextInput
              value={distanciaReal}
              onChangeText={setDistanciaReal}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <Pressable
              onPress={handleFinalizar}
              disabled={finalizando || !distanciaReal}
              style={({ pressed }) => [
                styles.botao,
                { backgroundColor: cores.verde },
                (pressed || finalizando || !distanciaReal) && styles.pressionado,
              ]}
            >
              <Text style={styles.botaoTexto}>{finalizando ? 'Finalizando...' : 'Finalizar corrida'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  mapa: {
    flex: 1,
  },
  mapaCarregando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#e5e7eb',
  },
  mapaCarregandoTexto: {
    fontSize: 13,
    color: cores.textoSecundario,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  centralizado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo,
    padding: 20,
  },
  erroTextoSolo: {
    color: cores.erroTexto,
    fontSize: 14,
    textAlign: 'center',
  },
  botaoVoltar: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.branco,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  botaoVoltarTexto: {
    fontSize: 20,
    color: cores.texto,
  },
  banner: {
    position: 'absolute',
    top: 48,
    left: 68,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: cores.primariaEscura,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bannerIcone: {
    fontSize: 26,
  },
  bannerDistancia: {
    fontSize: 18,
    fontWeight: '800',
    color: cores.branco,
  },
  bannerInstrucao: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },
  painel: {
    backgroundColor: cores.cartao,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  painelTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  painelAlvo: {
    fontSize: 14,
    fontWeight: '700',
    color: cores.texto,
  },
  painelResumo: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.textoSecundario,
  },
  painelEndereco: {
    marginTop: 6,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  painelValor: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: cores.primaria,
  },
  formLinha: {
    marginTop: 14,
    gap: 10,
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
  inputCodigo: {
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 6,
  },
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressionado: {
    opacity: 0.7,
  },
  botaoTexto: {
    color: cores.branco,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  erroTexto: {
    marginTop: 10,
    color: cores.erroTexto,
    fontSize: 12,
  },
  })
}
