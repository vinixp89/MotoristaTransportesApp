import { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import EnderecoFields, { enderecoVazio, type Endereco } from '../components/EnderecoFields'
import { cores } from '../theme/colors'
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

  const [cnh, setCnh] = useState('')
  const [cpf, setCpf] = useState('')
  const [placaVeiculo, setPlacaVeiculo] = useState('')
  const [modeloVeiculo, setModeloVeiculo] = useState('')
  const [anoVeiculo, setAnoVeiculo] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [endereco, setEndereco] = useState<Endereco>(enderecoVazio)
  const [erro, setErro] = useState('')

  const enderecoResolvido = Boolean(endereco.logradouro)
  const camposObrigatoriosPreenchidos =
    cnh && cpf && placaVeiculo && modeloVeiculo && anoVeiculo && email && senha && confirmarSenha && enderecoResolvido

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

        {erro ? (
          <View style={styles.erroCaixa}>
            <Text style={styles.erroTexto}>{erro}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleCadastrar}
          disabled={carregando || !camposObrigatoriosPreenchidos}
          style={({ pressed }) => [
            styles.botao,
            (carregando || !camposObrigatoriosPreenchidos) && styles.botaoDesabilitado,
            pressed && styles.botaoPressionado,
          ]}
        >
          {carregando ? <ActivityIndicator color={cores.branco} /> : <Text style={styles.botaoTexto}>Criar conta</Text>}
        </Pressable>

        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.linkVoltar}>
          <Text style={styles.linkVoltarTexto}>Já tenho conta — Entrar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
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
})
