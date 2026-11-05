import { useEffect, useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import EnderecoFields, { enderecoVazio, type Endereco } from '../components/EnderecoFields'
import { camposFoto, escolherFoto, type ChaveFoto, type FotoSlot } from '../utils/fotosVerificacao'
import { TEXTO_CNH_EAR, TEXTO_REGRAS_MOTO, TIPO_VEICULO_API, type TipoVeiculo } from '../utils/veiculo'
import type { Cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Cadastro'>

const ANO_ATUAL = new Date().getFullYear()
// Espelha Motorista.IdadeMaximaVeiculoAnos no backend — mantém os dois em sincronia manualmente,
// já que são projetos separados.
const IDADE_MAXIMA_VEICULO_ANOS = 12

// Formulário de cadastro de Motorista — espelha os campos exigidos pelo backend
// (POST /Auth/registrar-motorista: email, senha, motorista{cnh,cpf,placaVeiculo,modeloVeiculo,anoVeiculo,endereço}).
export default function CadastroScreen({ navigation }: Props) {
  const { carregando, cadastrar } = useAuth()
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  // Sem valor inicial de propósito: o motorista precisa escolher, pra ninguém cair em "carro" por esquecimento
  // (motorista de moto só recebe corrida de moto e o de carro só de carro).
  const [tipoVeiculo, setTipoVeiculo] = useState<TipoVeiculo | null>(null)
  const [nome, setNome] = useState('')
  const [cnh, setCnh] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [placaVeiculo, setPlacaVeiculo] = useState('')
  const [modeloVeiculo, setModeloVeiculo] = useState('')
  const [anoVeiculo, setAnoVeiculo] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [endereco, setEndereco] = useState<Endereco>(enderecoVazio)
  const [fotos, setFotos] = useState<Record<ChaveFoto, FotoSlot>>({
    selfie: null,
    fotoVeiculo: null,
    fotoPlaca: null,
    fotoCnh: null,
  })
  // Só pra moto: declaração de CNH A/EAR (no formulário) e aceite das regras da moto (na etapa dos termos).
  const [cnhAEar, setCnhAEar] = useState(false)
  const [regrasMotoAceitas, setRegrasMotoAceitas] = useState(false)
  const [enviandoFotos, setEnviandoFotos] = useState(false)
  const [erro, setErro] = useState('')

  // 2ª etapa, só de termos — o resto do cadastro (dados + fotos) continua numa página só, igual já
  // era. Confirmação por SMS não entra aqui: acontece DEPOIS da conta criada (ver
  // ConfirmarSmsScreen), forçada pelo RootNavigator quando perfil.telefoneVerificado vier false.
  const [etapa, setEtapa] = useState<'form' | 'termos'>('form')
  const [termosTexto, setTermosTexto] = useState('')
  const [carregandoTermos, setCarregandoTermos] = useState(false)
  const [termosAceitos, setTermosAceitos] = useState(false)

  useEffect(() => {
    if (etapa !== 'termos' || termosTexto) return

    setCarregandoTermos(true)
    api
      .get<{ texto: string }>('/Config/termos')
      .then(({ data }) => setTermosTexto(data.texto))
      .catch(() => setErro('Não foi possível carregar os termos de uso. Tente de novo.'))
      .finally(() => setCarregandoTermos(false))
  }, [etapa, termosTexto])

  const enderecoResolvido = Boolean(endereco.logradouro)
  const ehMoto = tipoVeiculo === 'moto'
  const fotosPreenchidas = fotos.selfie && fotos.fotoVeiculo && fotos.fotoPlaca && (!ehMoto || fotos.fotoCnh)
  const termosEtapaOk = termosAceitos && (!ehMoto || regrasMotoAceitas)
  const camposObrigatoriosPreenchidos =
    tipoVeiculo &&
    (!ehMoto || cnhAEar) &&
    nome &&
    cnh &&
    cpf &&
    telefone &&
    placaVeiculo &&
    modeloVeiculo &&
    anoVeiculo &&
    email &&
    senha &&
    confirmarSenha &&
    enderecoResolvido &&
    fotosPreenchidas

  async function handleEscolherFoto(campo: keyof typeof fotos) {
    const foto = await escolherFoto(campo)
    if (foto) setFotos((atual) => ({ ...atual, [campo]: foto }))
  }

  function handleProximoForm() {
    setErro('')

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    const anoVeiculoNumero = Number(anoVeiculo)

    if (!Number.isInteger(anoVeiculoNumero) || anoVeiculoNumero < ANO_ATUAL - IDADE_MAXIMA_VEICULO_ANOS || anoVeiculoNumero > ANO_ATUAL) {
      setErro(`O veículo precisa ter no máximo ${IDADE_MAXIMA_VEICULO_ANOS} anos de fabricação (a partir de ${ANO_ATUAL - IDADE_MAXIMA_VEICULO_ANOS}).`)
      return
    }

    setEtapa('termos')
  }

  // Só chega aqui com os termos aceitos — cria a conta e, com ela criada, manda as fotos e registra
  // o aceite. Lenient com falha nesses dois últimos passos: a conta já existe, então não trava o
  // cadastro por um upload que falhou.
  async function handleFinalizar() {
    setErro('')

    if (!termosAceitos) {
      setErro('Você precisa aceitar os termos de uso pra continuar.')
      return
    }

    if (ehMoto && !regrasMotoAceitas) {
      setErro('Você precisa aceitar as regras da moto pra continuar.')
      return
    }

    const anoVeiculoNumero = Number(anoVeiculo)

    const resultado = await cadastrar(email, senha, {
      nome,
      cnh,
      cpf,
      telefone,
      placaVeiculo,
      modeloVeiculo,
      anoVeiculo: anoVeiculoNumero,
      tipoVeiculo: TIPO_VEICULO_API[tipoVeiculo ?? 'carro'],
      cnhCategoriaAEar: ehMoto && cnhAEar,
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      complemento: endereco.complemento,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
    })

    if (!resultado.sucesso) {
      setErro(resultado.mensagem ?? 'Não foi possível criar sua conta.')
      return
    }

    setEnviandoFotos(true)
    const falhas: string[] = []

    try {
      const dadosFormulario = new FormData()
      const chavesDoTipo = camposFoto(tipoVeiculo).map((c) => c.chave)
      for (const [campo, foto] of Object.entries(fotos)) {
        // Só manda as fotos que o tipo de veículo pede (a da CNH é só de moto).
        if (!foto || !chavesDoTipo.includes(campo as ChaveFoto)) continue
        dadosFormulario.append(campo, { uri: foto.uri, name: foto.nome, type: foto.tipo } as unknown as Blob)
      }

      await api.post('/Motoristas/fotos', dadosFormulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } catch {
      // Sem aviso aqui: a conta já existe e perfil.fotosEnviadas fica falso, então o RootNavigator
      // trava o app na tela de envio de fotos (ver EnviarFotosScreen) até elas serem enviadas.
    }

    try {
      await api.post('/Auth/aceitar-termos')
    } catch {
      falhas.push('o aceite dos termos')
    }

    if (ehMoto) {
      try {
        await api.post('/Motoristas/regras-moto', { cnhCategoriaAEar: true, aceitoRegras: true })
      } catch {
        // Sem aviso: perfil.cadastroCompleto fica falso e a tela de pendências pede de novo.
      }
    }

    setEnviandoFotos(false)

    if (falhas.length > 0) {
      setErro(`Conta criada, mas ${falhas.join(' e ')} não foram registrados. Tente de novo mais tarde.`)
    }

    // Sem navigation aqui de propósito: a conta já existe (usuario setado no AuthContext), o
    // RootNavigator já trocou de stack sozinho — daqui em diante quem decide a próxima tela
    // (ConfirmarSmsScreen ou Home) é ele, olhando perfil.telefoneVerificado.
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Criar conta de motorista</Text>
        <Text style={styles.subtitulo}>
          {etapa === 'form' ? 'Preencha seus dados pra começar a aceitar corridas.' : 'Só falta aceitar os termos de uso.'}
        </Text>

        {etapa === 'form' && (
        <>
        <View style={styles.campo}>
          <Text style={styles.rotulo}>Você dirige</Text>
          <View style={styles.linhaTipoVeiculo}>
            {(['carro', 'moto'] as const).map((tipo) => {
              const selecionado = tipoVeiculo === tipo
              return (
                <Pressable
                  key={tipo}
                  onPress={() => setTipoVeiculo(tipo)}
                  style={[styles.opcaoVeiculo, selecionado && styles.opcaoVeiculoSelecionada]}
                >
                  <Text style={styles.opcaoVeiculoIcone}>{tipo === 'carro' ? '🚗' : '🏍️'}</Text>
                  <Text style={[styles.opcaoVeiculoTexto, selecionado && styles.opcaoVeiculoTextoSelecionado]}>
                    {tipo === 'carro' ? 'Carro' : 'Moto'}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Text style={styles.ajuda}>
            Quem dirige moto recebe só corridas de moto, e quem dirige carro só corridas de carro.
          </Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Nome completo</Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome"
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
        </View>

        <View style={styles.linhaDupla}>
          <View style={[styles.campo, styles.campoMetade]}>
            <Text style={styles.rotulo}>CNH</Text>
            <TextInput
              value={cnh}
              onChangeText={setCnh}
              placeholder="Número da CNH"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
          <View style={[styles.campo, styles.campoMetade]}>
            <Text style={styles.rotulo}>CPF</Text>
            <TextInput
              value={cpf}
              onChangeText={setCpf}
              placeholder="000.000.000-00"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
        </View>

        {ehMoto ? (
          <View style={styles.campo}>
            <Pressable onPress={() => setCnhAEar((atual) => !atual)} style={styles.checkboxLinha}>
              <View style={[styles.checkbox, cnhAEar && styles.checkboxMarcado]}>
                {cnhAEar ? <Text style={styles.checkboxMarca}>✓</Text> : null}
              </View>
              <Text style={styles.checkboxTexto}>{TEXTO_CNH_EAR}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Telefone</Text>
          <TextInput
            value={telefone}
            onChangeText={setTelefone}
            placeholder="(00) 00000-0000"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        <View style={styles.linhaDupla}>
          <View style={[styles.campo, styles.campoMetade]}>
            <Text style={styles.rotulo}>Placa do veículo</Text>
            <TextInput
              value={placaVeiculo}
              onChangeText={setPlacaVeiculo}
              placeholder="ABC1D23"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>
          <View style={[styles.campo, styles.campoMetade]}>
            <Text style={styles.rotulo}>Modelo do veículo</Text>
            <TextInput
              value={modeloVeiculo}
              onChangeText={setModeloVeiculo}
              placeholder="Ex: Onix"
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Ano de fabricação do veículo</Text>
          <TextInput
            value={anoVeiculo}
            onChangeText={setAnoVeiculo}
            placeholder={`Ex: ${ANO_ATUAL}`}
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={4}
            style={styles.input}
          />
          <Text style={styles.ajuda}>
            Aceitamos veículos com até {IDADE_MAXIMA_VEICULO_ANOS} anos de fabricação (a partir de {ANO_ATUAL - IDADE_MAXIMA_VEICULO_ANOS}).
          </Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>E-mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.linhaDupla}>
          <View style={[styles.campo, styles.campoMetade]}>
            <Text style={styles.rotulo}>Senha</Text>
            <TextInput
              value={senha}
              onChangeText={setSenha}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              style={styles.input}
            />
          </View>
          <View style={[styles.campo, styles.campoMetade]}>
            <Text style={styles.rotulo}>Confirmar senha</Text>
            <TextInput
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              style={styles.input}
            />
          </View>
        </View>

        <EnderecoFields titulo="Endereço" valores={endereco} onChange={setEndereco} />

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Fotos de verificação</Text>
          <View style={styles.linhaFotos}>
            {camposFoto(tipoVeiculo).map(({ chave, rotulo, dica }) => {
              const foto = fotos[chave]
              return (
                <Pressable key={chave} onPress={() => handleEscolherFoto(chave)} style={styles.fotoSlot}>
                  {foto ? (
                    <>
                      <Image source={{ uri: foto.uri }} style={styles.fotoPreview} />
                      <View style={styles.fotoSelo}>
                        <Text style={styles.fotoSeloTexto}>✓ {rotulo}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.fotoIcone}>📷</Text>
                      <Text style={styles.fotoRotulo}>{rotulo}</Text>
                      <Text style={styles.fotoDica}>{dica}</Text>
                    </>
                  )}
                </Pressable>
              )
            })}
          </View>
        </View>
        </>
        )}

        {etapa === 'termos' && (
          <View style={styles.campo}>
            <View style={styles.termosCaixa}>
              {carregandoTermos ? (
                <ActivityIndicator color={cores.primaria} />
              ) : (
                <ScrollView style={styles.termosScroll} nestedScrollEnabled>
                  <Text style={styles.termosTexto}>{termosTexto}</Text>
                </ScrollView>
              )}
            </View>

            <Pressable onPress={() => setTermosAceitos((atual) => !atual)} style={styles.checkboxLinha}>
              <View style={[styles.checkbox, termosAceitos && styles.checkboxMarcado]}>
                {termosAceitos ? <Text style={styles.checkboxMarca}>✓</Text> : null}
              </View>
              <Text style={styles.checkboxTexto}>Li e aceito os termos de uso e o contrato de prestação de serviços.</Text>
            </Pressable>

            {ehMoto ? (
              <>
                <View style={[styles.termosCaixa, { marginTop: 16 }]}>
                  <Text style={styles.termosTexto}>Regras para motoristas de moto{'\n\n'}• {TEXTO_REGRAS_MOTO}</Text>
                </View>
                <Pressable onPress={() => setRegrasMotoAceitas((atual) => !atual)} style={styles.checkboxLinha}>
                  <View style={[styles.checkbox, regrasMotoAceitas && styles.checkboxMarcado]}>
                    {regrasMotoAceitas ? <Text style={styles.checkboxMarca}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkboxTexto}>Li e aceito as regras para motoristas de moto.</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        )}

        {erro ? (
          <View style={styles.erroCaixa}>
            <Text style={styles.erroTexto}>{erro}</Text>
          </View>
        ) : null}

        <View style={styles.linhaBotoes}>
          {etapa === 'termos' && (
            <Pressable onPress={() => setEtapa('form')} style={styles.botaoVoltar}>
              <Text style={styles.botaoVoltarTexto}>Voltar</Text>
            </Pressable>
          )}

          <Pressable
            onPress={etapa === 'form' ? handleProximoForm : handleFinalizar}
            disabled={
              carregando ||
              enviandoFotos ||
              (etapa === 'form' ? !camposObrigatoriosPreenchidos : !termosEtapaOk)
            }
            style={({ pressed }) => [
              styles.botao,
              (carregando ||
                enviandoFotos ||
                (etapa === 'form' ? !camposObrigatoriosPreenchidos : !termosEtapaOk)) &&
                styles.botaoDesabilitado,
              pressed && styles.botaoPressionado,
            ]}
          >
            {carregando || enviandoFotos ? (
              <ActivityIndicator color={cores.branco} />
            ) : (
              <Text style={styles.botaoTexto}>{etapa === 'form' ? 'Próximo' : 'Criar conta'}</Text>
            )}
          </Pressable>
        </View>

        {etapa === 'form' && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.linkVoltar}>
            <Text style={styles.linkVoltarTexto}>Já tenho conta — Entrar</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function criarEstilos(cores: Cores) {
  return StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: cores.texto,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 13,
    color: cores.textoSecundario,
    marginBottom: 24,
  },
  campo: {
    marginBottom: 16,
  },
  linhaDupla: {
    flexDirection: 'row',
    gap: 12,
  },
  campoMetade: {
    flex: 1,
  },
  rotulo: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.texto,
    marginBottom: 6,
  },
  linhaTipoVeiculo: {
    flexDirection: 'row',
    gap: 10,
  },
  opcaoVeiculo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    backgroundColor: cores.cartao,
  },
  opcaoVeiculoSelecionada: {
    borderColor: cores.primaria,
    backgroundColor: cores.primaria,
  },
  opcaoVeiculoIcone: {
    fontSize: 20,
  },
  opcaoVeiculoTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: cores.texto,
  },
  opcaoVeiculoTextoSelecionado: {
    color: cores.branco,
  },
  ajuda: {
    fontSize: 12,
    color: cores.textoSecundario,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: cores.texto,
    backgroundColor: cores.cartao,
  },
  erroCaixa: {
    backgroundColor: cores.erroFundo,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  erroTexto: {
    color: cores.erroTexto,
    fontSize: 13,
  },
  linhaBotoes: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  botaoVoltar: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoVoltarTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: cores.texto,
  },
  termosCaixa: {
    height: 260,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 10,
    backgroundColor: cores.cartao,
    padding: 12,
    justifyContent: 'center',
  },
  termosScroll: {
    flex: 1,
  },
  termosTexto: {
    fontSize: 12,
    lineHeight: 18,
    color: cores.texto,
  },
  checkboxLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxMarcado: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  checkboxMarca: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  checkboxTexto: {
    flex: 1,
    fontSize: 13,
    color: cores.texto,
    lineHeight: 18,
  },
  botao: {
    flex: 2,
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoPressionado: {
    backgroundColor: cores.primariaEscura,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: cores.branco,
    fontSize: 15,
    fontWeight: '600',
  },
  linkVoltar: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkVoltarTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: cores.primaria,
  },
  linhaFotos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fotoSlot: {
    // 3 por linha: a 4ª foto (CNH, só moto) quebra pra linha de baixo com o mesmo tamanho.
    flexBasis: '30%',
    flexGrow: 0,
    flexShrink: 0,
    aspectRatio: 0.85,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.borda,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 4,
    overflow: 'hidden',
    backgroundColor: cores.cartao,
  },
  fotoPreview: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  fotoIcone: {
    fontSize: 22,
  },
  fotoRotulo: {
    fontSize: 11,
    fontWeight: '600',
    color: cores.texto,
    textAlign: 'center',
  },
  fotoDica: {
    fontSize: 9,
    color: cores.textoSecundario,
    textAlign: 'center',
  },
  fotoSelo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 4,
  },
  fotoSeloTexto: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  })
}
