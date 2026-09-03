import { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { formatarPreco } from '../constants/faixas'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'
import type { RootStackParamList } from '../navigation/types'
import { TIPO_SAQUE_PIX, TIPO_SAQUE_TRANSFERENCIA } from '../types/carteira'

type Props = NativeStackScreenProps<RootStackParamList, 'SolicitarSaque'>

const TIPOS_CONTA = ['Corrente', 'Poupança']

export default function SolicitarSaqueScreen({ route, navigation }: Props) {
  const { saldo, valorMinimo } = route.params
  const { cores } = useTema()
  const styles = criarEstilos(cores)

  const [tipo, setTipo] = useState<typeof TIPO_SAQUE_PIX | typeof TIPO_SAQUE_TRANSFERENCIA>(TIPO_SAQUE_PIX)
  const [valor, setValor] = useState('')
  const [chavePix, setChavePix] = useState('')
  const [banco, setBanco] = useState('')
  const [agencia, setAgencia] = useState('')
  const [conta, setConta] = useState('')
  const [tipoConta, setTipoConta] = useState(TIPOS_CONTA[0])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const valorNumerico = Number(valor.replace(',', '.'))
  const valorValido = !Number.isNaN(valorNumerico) && valorNumerico >= valorMinimo && valorNumerico <= saldo
  const dadosPreenchidos = tipo === TIPO_SAQUE_PIX ? chavePix.trim().length > 0 : banco.trim() && agencia.trim() && conta.trim()

  async function handleConfirmar() {
    setErro('')
    setEnviando(true)

    try {
      await api.post('/CarteirasMotorista/saque', {
        valor: valorNumerico,
        tipo,
        chavePix: tipo === TIPO_SAQUE_PIX ? chavePix.trim() : null,
        banco: tipo === TIPO_SAQUE_TRANSFERENCIA ? banco.trim() : null,
        agencia: tipo === TIPO_SAQUE_TRANSFERENCIA ? agencia.trim() : null,
        conta: tipo === TIPO_SAQUE_TRANSFERENCIA ? conta.trim() : null,
        tipoConta: tipo === TIPO_SAQUE_TRANSFERENCIA ? tipoConta : null,
      })
      navigation.goBack()
    } catch (error) {
      setErro(extrairMensagemErro(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={styles.saldoDisponivel}>Saldo disponível: {formatarPreco(saldo)}</Text>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Valor do saque</Text>
          <TextInput
            value={valor}
            onChangeText={setValor}
            keyboardType="decimal-pad"
            placeholder={`Mínimo ${formatarPreco(valorMinimo)}`}
            placeholderTextColor={cores.textoSecundario}
            style={styles.input}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.rotulo}>Forma de recebimento</Text>
          <View style={styles.linhaTipos}>
            <Pressable
              onPress={() => setTipo(TIPO_SAQUE_PIX)}
              style={[styles.opcaoTipo, tipo === TIPO_SAQUE_PIX && styles.opcaoTipoAtiva]}
            >
              <Text style={[styles.opcaoTipoTexto, tipo === TIPO_SAQUE_PIX && styles.opcaoTipoTextoAtivo]}>Pix</Text>
            </Pressable>
            <Pressable
              onPress={() => setTipo(TIPO_SAQUE_TRANSFERENCIA)}
              style={[styles.opcaoTipo, tipo === TIPO_SAQUE_TRANSFERENCIA && styles.opcaoTipoAtiva]}
            >
              <Text style={[styles.opcaoTipoTexto, tipo === TIPO_SAQUE_TRANSFERENCIA && styles.opcaoTipoTextoAtivo]}>
                Transferência bancária
              </Text>
            </Pressable>
          </View>
        </View>

        {tipo === TIPO_SAQUE_PIX ? (
          <View style={styles.campo}>
            <Text style={styles.rotulo}>Chave Pix</Text>
            <TextInput
              value={chavePix}
              onChangeText={setChavePix}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              placeholderTextColor={cores.textoSecundario}
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        ) : (
          <>
            <View style={styles.campo}>
              <Text style={styles.rotulo}>Banco</Text>
              <TextInput value={banco} onChangeText={setBanco} placeholder="Ex.: Nubank, Caixa, Itaú" placeholderTextColor={cores.textoSecundario} style={styles.input} />
            </View>
            <View style={styles.linhaDupla}>
              <View style={[styles.campo, { flex: 1 }]}>
                <Text style={styles.rotulo}>Agência</Text>
                <TextInput value={agencia} onChangeText={setAgencia} keyboardType="number-pad" placeholderTextColor={cores.textoSecundario} style={styles.input} />
              </View>
              <View style={[styles.campo, { flex: 1 }]}>
                <Text style={styles.rotulo}>Conta</Text>
                <TextInput value={conta} onChangeText={setConta} keyboardType="number-pad" placeholderTextColor={cores.textoSecundario} style={styles.input} />
              </View>
            </View>
            <View style={styles.campo}>
              <Text style={styles.rotulo}>Tipo de conta</Text>
              <View style={styles.linhaTipos}>
                {TIPOS_CONTA.map((opcao) => (
                  <Pressable
                    key={opcao}
                    onPress={() => setTipoConta(opcao)}
                    style={[styles.opcaoTipo, tipoConta === opcao && styles.opcaoTipoAtiva]}
                  >
                    <Text style={[styles.opcaoTipoTexto, tipoConta === opcao && styles.opcaoTipoTextoAtivo]}>{opcao}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {erro ? (
          <View style={styles.erroCaixa}>
            <Text style={styles.erroTexto}>{erro}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleConfirmar}
          disabled={enviando || !valorValido || !dadosPreenchidos}
          style={({ pressed }) => [
            styles.botao,
            (pressed || enviando || !valorValido || !dadosPreenchidos) && styles.pressionado,
          ]}
        >
          {enviando ? <ActivityIndicator color={cores.branco} /> : <Text style={styles.botaoTexto}>Confirmar saque</Text>}
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
      padding: 20,
      paddingBottom: 48,
      gap: 16,
    },
    saldoDisponivel: {
      fontSize: 13,
      fontWeight: '600',
      color: cores.textoSecundario,
    },
    campo: {
      gap: 6,
    },
    rotulo: {
      fontSize: 13,
      fontWeight: '600',
      color: cores.texto,
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
    linhaDupla: {
      flexDirection: 'row',
      gap: 12,
    },
    linhaTipos: {
      flexDirection: 'row',
      gap: 10,
    },
    opcaoTipo: {
      flex: 1,
      borderWidth: 1,
      borderColor: cores.borda,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: cores.cartao,
    },
    opcaoTipoAtiva: {
      borderColor: cores.primaria,
      backgroundColor: cores.primariaClara,
    },
    opcaoTipoTexto: {
      fontSize: 13,
      fontWeight: '600',
      color: cores.textoSecundario,
    },
    opcaoTipoTextoAtivo: {
      color: cores.primariaEscura,
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
    botao: {
      marginTop: 4,
      backgroundColor: cores.primaria,
      borderRadius: 10,
      paddingVertical: 15,
      alignItems: 'center',
    },
    pressionado: {
      opacity: 0.6,
    },
    botaoTexto: {
      color: cores.branco,
      fontSize: 15,
      fontWeight: '700',
    },
  })
}
