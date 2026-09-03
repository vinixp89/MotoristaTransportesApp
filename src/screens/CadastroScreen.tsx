import { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from 'expo-image-picker'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import EnderecoFields, { enderecoVazio, type Endereco } from '../components/EnderecoFields'
import type { Cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'

type FotoSlot = { uri: string; nome: string; tipo: string } | null

const CAMPOS_FOTO = [
  { chave: 'selfie' as const, rotulo: 'Selfie', dica: 'Seu rosto, bem visível' },
  { chave: 'fotoVeiculo' as const, rotulo: 'Foto do veículo', dica: 'De frente, o carro inteiro' },
  { chave: 'fotoPlaca' as const, rotulo: 'Foto da placa', dica: 'Placa legível, de perto' },
]

// Abre um Alert perguntando câmera ou galeria, e devolve o arquivo escolhido pronto pra mandar
// como multipart (ver handleCadastrar) — ou null se o motorista cancelar em qualquer etapa.
function escolherFoto(nomeCampo: string): Promise<FotoSlot> {
  return new Promise((resolve) => {
    Alert.alert('Adicionar foto', undefined, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      {
        text: 'Câmera',
        onPress: async () => {
          const permissao = await ImagePicker.requestCameraPermissionsAsync()
          if (!permissao.granted) {
            resolve(null)
            return
          }
          const resultado = await ImagePicker.launchCameraAsync({ quality: 0.7 })
          resolve(paraFotoSlot(resultado, nomeCampo))
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
          if (!permissao.granted) {
            resolve(null)
            return
          }
          const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] })
          resolve(paraFotoSlot(resultado, nomeCampo))
        },
      },
    ])
  })
}

function paraFotoSlot(resultado: ImagePicker.ImagePickerResult, nomeCampo: string): FotoSlot {
  if (resultado.canceled || !resultado.assets?.[0]) return null

  const asset = resultado.assets[0]
  return { uri: asset.uri, nome: `${nomeCampo}.jpg`, tipo: asset.mimeType ?? 'image/jpeg' }
}

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

  const [cnh, setCnh] = useState('')
  const [cpf, setCpf] = useState('')
  const [placaVeiculo, setPlacaVeiculo] = useState('')
  const [modeloVeiculo, setModeloVeiculo] = useState('')
  const [anoVeiculo, setAnoVeiculo] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [endereco, setEndereco] = useState<Endereco>(enderecoVazio)
  const [fotos, setFotos] = useState<Record<'selfie' | 'fotoVeiculo' | 'fotoPlaca', FotoSlot>>({
    selfie: null,
    fotoVeiculo: null,
    fotoPlaca: null,
  })
  const [enviandoFotos, setEnviandoFotos] = useState(false)
  const [erro, setErro] = useState('')

  const enderecoResolvido = Boolean(endereco.logradouro)
  const fotosPreenchidas = fotos.selfie && fotos.fotoVeiculo && fotos.fotoPlaca
  const camposObrigatoriosPreenchidos =
    cnh &&
    cpf &&
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

  async function handleCadastrar() {
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

    const resultado = await cadastrar(email, senha, {
      cnh,
      cpf,
      placaVeiculo,
      modeloVeiculo,
      anoVeiculo: anoVeiculoNumero,
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

    // As fotos só podem ser enviadas depois da conta existir (o endpoint exige motorista logado).
    // Se isso falhar, a conta já foi criada normalmente — não trava o cadastro, só avisa.
    setEnviandoFotos(true)

    try {
      const dadosFormulario = new FormData()
      for (const [campo, foto] of Object.entries(fotos)) {
        if (!foto) continue
        dadosFormulario.append(campo, { uri: foto.uri, name: foto.nome, type: foto.tipo } as unknown as Blob)
      }

      await api.post('/Motoristas/fotos', dadosFormulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } catch {
      setErro('Conta criada, mas as fotos não foram enviadas. Entre em contato com o suporte pra reenviá-las.')
    } finally {
      setEnviandoFotos(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Criar conta de motorista</Text>
        <Text style={styles.subtitulo}>Preencha seus dados pra começar a aceitar corridas.</Text>

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
            {CAMPOS_FOTO.map(({ chave, rotulo, dica }) => {
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

        {erro ? (
          <View style={styles.erroCaixa}>
            <Text style={styles.erroTexto}>{erro}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleCadastrar}
          disabled={carregando || enviandoFotos || !camposObrigatoriosPreenchidos}
          style={({ pressed }) => [
            styles.botao,
            (carregando || enviandoFotos || !camposObrigatoriosPreenchidos) && styles.botaoDesabilitado,
            pressed && styles.botaoPressionado,
          ]}
        >
          {carregando || enviandoFotos ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <Text style={styles.botaoTexto}>Criar conta</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.linkVoltar}>
          <Text style={styles.linkVoltarTexto}>Já tenho conta — Entrar</Text>
        </Pressable>
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
  botao: {
    backgroundColor: cores.primaria,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
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
    gap: 10,
  },
  fotoSlot: {
    flex: 1,
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
