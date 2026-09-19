import { useCallback, useEffect, useRef, useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { useConfigApp } from '../hooks/useConfigApp'
import { useEnvioLocalizacao } from '../hooks/useEnvioLocalizacao'
import api, { extrairMensagemErro } from '../api/client'
import { obterFaixa, formatarPreco } from '../constants/faixas'
import { obterStatusLabel, STATUS_CONFIRMADA } from '../constants/statusCorrida'
import { notificarCorridaNova } from '../notifications/config'
import { useTema } from '../context/ThemeContext'
import ThemeToggleButton from '../components/ThemeToggleButton'
import MenuHamburguer from '../components/MenuHamburguer'
import type { Cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'
import type { Corrida } from '../types/corrida'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

// StatusMotorista serializado como número (TransportesApp.Domain/Enums/Enums.cs):
// Offline = 0, Disponivel = 1, EmCorrida = 2.
const STATUS_DISPONIVEL = 1
const INTERVALO_MS = 5000

// Tela principal do motorista: ficar online/offline (que liga o envio de localização via GPS) e,
// enquanto online, as corridas pendentes ou a corrida atual aparecem direto aqui — sem precisar
// navegar pra outra tela — com notificação sonora assim que uma corrida nova surge.
export default function HomeScreen({ navigation }: Props) {
  const { usuario, perfil, logout } = useAuth()
  const { carteiraMotoristaLiberada } = useConfigApp()
  const { cores } = useTema()
  const styles = criarEstilos(cores)
  const [online, setOnline] = useState(false)
  const [alternando, setAlternando] = useState(false)
  const [erro, setErro] = useState('')

  const [corridaAtual, setCorridaAtual] = useState<Corrida | null>(null)
  const [pendentes, setPendentes] = useState<Corrida[]>([])
  const [carregandoCorridas, setCarregandoCorridas] = useState(false)
  const [aceitandoId, setAceitandoId] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [distanciaReal, setDistanciaReal] = useState('')
  const [codigo, setCodigo] = useState('')
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const idsPendentesConhecidosRef = useRef<Set<string> | null>(null)

  const { erro: erroLocalizacao } = useEnvioLocalizacao(online)

  const buscarCorridas = useCallback(async () => {
    try {
      const { data: atual } = await api.get<Corrida | null>('/Corridas/atual')
      setCorridaAtual(atual)

      if (!atual) {
        const { data: lista } = await api.get<Corrida[]>('/Corridas/pendentes')
        setPendentes(lista)

        // Notifica só quando aparece um id NOVO — na primeira busca (ref ainda null) só registra
        // o que já existia, sem disparar som pra corridas que já estavam lá antes de abrir o app.
        const idsAtuais = new Set(lista.map((c) => c.id))
        if (idsPendentesConhecidosRef.current) {
          const temNova = lista.some((c) => !idsPendentesConhecidosRef.current!.has(c.id))
          if (temNova) notificarCorridaNova()
        }
        idsPendentesConhecidosRef.current = idsAtuais
      } else {
        setPendentes([])
      }
    } catch (error) {
      setErro(extrairMensagemErro(error))
    }
  }, [])

  useEffect(() => {
    if (!online) {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current)
        intervaloRef.current = null
      }
      return
    }

    setCarregandoCorridas(true)
    buscarCorridas().finally(() => setCarregandoCorridas(false))
    intervaloRef.current = setInterval(buscarCorridas, INTERVALO_MS)

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current)
    }
  }, [online, buscarCorridas])

  useEffect(() => {
    if (corridaAtual) {
      setDistanciaReal(corridaAtual.distanciaEstimadaKm.toFixed(1))
      setCodigo('')
    }
  }, [corridaAtual?.id])

  async function handleAlternar() {
    setAlternando(true)
    setErro('')

    try {
      const endpoint = online ? '/Motoristas/ficar-offline' : '/Motoristas/ficar-disponivel'
      const { data } = await api.patch(endpoint)
      const novoOnline = data.status === STATUS_DISPONIVEL
      setOnline(novoOnline)

      if (!novoOnline) {
        setPendentes([])
        setCorridaAtual(null)
        idsPendentesConhecidosRef.current = null
      }
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setAlternando(false)
    }
  }

  async function handleAceitar(id: string) {
    setAceitandoId(id)
    setErro('')

    try {
      const { data } = await api.patch<Corrida>(`/Corridas/${id}/atribuir-motorista`)
      setCorridaAtual(data)
      setPendentes([])
      navigation.navigate('Navegacao', { corridaId: data.id })
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
      const { data } = await api.patch<Corrida>(`/Corridas/${corridaAtual.id}/iniciar`, { codigo })
      setCorridaAtual(data)
      setCodigo('')
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
      buscarCorridas()
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setFinalizando(false)
    }
  }

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <View style={styles.cabecalho}>
        <View style={styles.linhaLogo}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.saudacao}>Olá{perfil?.nome ? `, ${perfil.nome.split(' ')[0]}` : ''}!</Text>
            <Text style={styles.perfil}>
              Perfil: {usuario?.roles.length ? usuario.roles.join(', ') : 'sem perfil definido'}
            </Text>
          </View>
        </View>

        <View style={styles.acoesCabecalho}>
          <ThemeToggleButton />
          <MenuHamburguer navigation={navigation} />
          <Pressable onPress={logout} hitSlop={8}>
            <Text style={styles.sair}>Sair</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.linhaTopo2}>
        <Pressable
          onPress={handleAlternar}
          disabled={alternando}
          style={({ pressed }) => [
            styles.botaoOnline,
            { backgroundColor: online ? '#6b7280' : cores.primaria },
            (pressed || alternando) && styles.pressionado,
          ]}
        >
          {alternando ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <>
              <View style={[styles.bolinha, { backgroundColor: online ? '#4ade80' : 'rgba(255,255,255,0.5)' }]} />
              <Text style={styles.botaoOnlineTexto}>{online ? 'Ficar offline' : 'Ficar online'}</Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Extrato')} hitSlop={8} style={styles.linkExtrato}>
          <Text style={styles.linkExtratoTexto}>📄 Extrato</Text>
        </Pressable>
      </View>

      <View style={styles.linhaCards}>
        {carteiraMotoristaLiberada ? (
          <Pressable
            onPress={() => navigation.navigate('Carteira')}
            style={({ pressed }) => [styles.cardExecutivo, styles.cardMetade, pressed && styles.pressionado]}
          >
            <Text style={styles.cardExecutivoTexto}>💰 Saldo e saques</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => navigation.navigate('PlanoExecutivo')}
          style={({ pressed }) => [styles.cardExecutivo, styles.cardMetade, pressed && styles.pressionado]}
        >
          <Text style={styles.cardExecutivoTexto}>⭐ Executivo</Text>
        </Pressable>
      </View>

      {(erro || erroLocalizacao) ? (
        <View style={styles.erroCaixa}>
          <Text style={styles.erroTexto}>{erro || erroLocalizacao}</Text>
        </View>
      ) : null}

      {!online ? (
        <View style={styles.cartaoVazio}>
          <Text style={styles.textoVazio}>Fique online pra começar a receber corridas.</Text>
        </View>
      ) : carregandoCorridas ? (
        <View style={styles.centralizado}>
          <ActivityIndicator color={cores.primaria} />
        </View>
      ) : corridaAtual ? (
        <PainelCorridaAtual
          corrida={corridaAtual}
          iniciando={iniciando}
          finalizando={finalizando}
          distanciaReal={distanciaReal}
          codigo={codigo}
          onCodigoChange={setCodigo}
          onDistanciaChange={setDistanciaReal}
          onIniciar={handleIniciar}
          onFinalizar={handleFinalizar}
          onNavegar={() => navigation.navigate('Navegacao', { corridaId: corridaAtual.id })}
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
                <View style={styles.valores}>
                  <Text style={styles.valorTotal}>{formatarPreco(c.valorReferencia)}</Text>
                  <Text style={styles.valorGanho}>Você ganha: {formatarPreco(c.valorMotorista)} (85%)</Text>
                </View>
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
                  (pressed || aceitandoId !== null) && styles.pressionado,
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
  codigo,
  onCodigoChange,
  onDistanciaChange,
  onIniciar,
  onFinalizar,
  onNavegar,
}: {
  corrida: Corrida
  iniciando: boolean
  finalizando: boolean
  distanciaReal: string
  codigo: string
  onCodigoChange: (v: string) => void
  onDistanciaChange: (v: string) => void
  onIniciar: () => void
  onFinalizar: () => void
  onNavegar: () => void
}) {
  const { cores } = useTema()
  const styles = criarEstilos(cores)
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
        <View style={styles.valores}>
          <Text style={styles.valorTotal}>{formatarPreco(corrida.valorReferencia)}</Text>
          <Text style={styles.valorGanho}>Você ganha: {formatarPreco(corrida.valorMotorista)} (85%)</Text>
        </View>
      </View>

      <Pressable
        onPress={onNavegar}
        style={({ pressed }) => [styles.botaoNavegar, pressed && styles.pressionado]}
      >
        <Text style={styles.botaoNavegarTexto}>🧭 Abrir navegação</Text>
      </Pressable>

      {corrida.status === STATUS_CONFIRMADA ? (
        <View style={styles.formFinalizar}>
          <Text style={styles.rotulo}>Código informado pelo cliente</Text>
          <TextInput
            value={codigo}
            onChangeText={(v) => onCodigoChange(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0000"
            style={[styles.input, styles.inputCodigo]}
          />
          <Pressable
            onPress={onIniciar}
            disabled={iniciando || codigo.length !== 4}
            style={({ pressed }) => [
              styles.botao,
              (pressed || iniciando || codigo.length !== 4) && styles.pressionado,
            ]}
          >
            <Text style={styles.botaoTexto}>{iniciando ? 'Iniciando...' : 'Iniciar viagem'}</Text>
          </Pressable>
        </View>
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
              (pressed || finalizando || !distanciaReal) && styles.pressionado,
            ]}
          >
            <Text style={styles.botaoTexto}>{finalizando ? 'Finalizando...' : 'Finalizar corrida'}</Text>
          </Pressable>
        </View>
      )}
    </View>
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  linhaLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
  },
  saudacao: {
    fontSize: 22,
    fontWeight: '700',
    color: cores.texto,
  },
  perfil: {
    fontSize: 13,
    color: cores.textoSecundario,
    marginTop: 2,
  },
  acoesCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sair: {
    fontSize: 14,
    color: cores.textoSecundario,
    paddingVertical: 4,
  },
  linhaTopo2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  botaoOnline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  botaoOnlineTexto: {
    color: cores.branco,
    fontSize: 14,
    fontWeight: '700',
  },
  linkExtrato: {
    alignItems: 'center',
  },
  linkExtratoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: cores.primaria,
  },
  linhaCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cardMetade: {
    flex: 1,
    marginBottom: 0,
  },
  cardExecutivo: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  cardExecutivoTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: cores.branco,
  },
  bolinha: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  centralizado: {
    paddingVertical: 24,
    alignItems: 'center',
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
  valores: {
    alignItems: 'flex-end',
  },
  valorTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: cores.texto,
  },
  valorGanho: {
    fontSize: 12,
    fontWeight: '600',
    color: cores.primaria,
    marginTop: 2,
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
  pressionado: {
    opacity: 0.7,
  },
  botaoTexto: {
    color: cores.branco,
    fontSize: 14,
    fontWeight: '600',
  },
  botaoNavegar: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoNavegarTexto: {
    color: cores.primaria,
    fontSize: 14,
    fontWeight: '700',
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
  inputCodigo: {
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 8,
  },
  erroCaixa: {
    marginBottom: 16,
    backgroundColor: cores.erroFundo,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  erroTexto: {
    color: cores.erroTexto,
    fontSize: 13,
  },
  })
}
