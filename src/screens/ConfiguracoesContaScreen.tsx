import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import api, { extrairMensagemErro } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTema } from '../context/ThemeContext'
import type { Cores } from '../theme/colors'

export default function ConfiguracoesContaScreen() {
  const { usuario, excluirConta } = useAuth()
  const { cores } = useTema()
  const styles = criarEstilos(cores)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [trocandoSenha, setTrocandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [sucessoSenha, setSucessoSenha] = useState(false)

  async function handleTrocarSenha() {
    setErroSenha('')
    setSucessoSenha(false)

    if (novaSenha !== confirmarSenha) {
      setErroSenha('A confirmação não bate com a nova senha.')
      return
    }

    setTrocandoSenha(true)

    try {
      await api.post('/Auth/trocar-senha', { senhaAtual, novaSenha })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
      setSucessoSenha(true)
    } catch (error) {
      setErroSenha(extrairMensagemErro(error))
    } finally {
      setTrocandoSenha(false)
    }
  }

  function confirmarExclusao() {
    Alert.alert(
      'Excluir conta',
      'Isso remove seus dados pessoais (CNH, CPF, placa, endereço e fotos de verificação) e bloqueia o login definitivamente. Não é possível desfazer essa ação. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir conta', style: 'destructive', onPress: handleExcluir },
      ]
    )
  }

  async function handleExcluir() {
    setErro('')
    setExcluindo(true)

    const resultado = await excluirConta()

    if (!resultado.sucesso) {
      setErro(resultado.mensagem ?? 'Não foi possível excluir sua conta agora.')
      setExcluindo(false)
    }
    // Sucesso: o AuthContext já desloga, o RootNavigator troca de tela sozinho.
  }

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <View style={styles.cartao}>
        <Text style={styles.rotulo}>E-mail da conta</Text>
        <Text style={styles.valor}>{usuario?.email}</Text>
      </View>

      <View style={styles.cartao}>
        <Text style={styles.secaoTitulo}>Trocar senha</Text>

        <TextInput
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          placeholder="Senha atual"
          placeholderTextColor={cores.textoSecundario}
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          value={novaSenha}
          onChangeText={setNovaSenha}
          placeholder="Nova senha"
          placeholderTextColor={cores.textoSecundario}
          secureTextEntry
          style={styles.input}
        />
        <TextInput
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          placeholder="Confirmar nova senha"
          placeholderTextColor={cores.textoSecundario}
          secureTextEntry
          style={styles.input}
        />

        {erroSenha ? <Text style={styles.erroTexto}>{erroSenha}</Text> : null}
        {sucessoSenha ? <Text style={styles.sucessoTexto}>Senha alterada com sucesso!</Text> : null}

        <Pressable
          onPress={handleTrocarSenha}
          disabled={trocandoSenha || !senhaAtual || !novaSenha || !confirmarSenha}
          style={[
            styles.botaoTrocarSenha,
            { backgroundColor: cores.primaria },
            (trocandoSenha || !senhaAtual || !novaSenha || !confirmarSenha) && styles.desabilitado,
          ]}
        >
          {trocandoSenha ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <Text style={styles.botaoTrocarSenhaTexto}>Trocar senha</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.cartao}>
        <Text style={styles.secaoTitulo}>Sobre seus dados</Text>
        <Text style={styles.texto}>
          Você pode pedir a exclusão da sua conta a qualquer momento. Ao excluir: seus dados
          pessoais (CNH, CPF, placa, modelo do veículo, endereço e fotos de verificação) são
          removidos e o login é bloqueado definitivamente.
        </Text>
        <Text style={styles.texto}>
          Por exigência legal/fiscal, o histórico de corridas e transações da carteira é mantido de
          forma anonimizada por até 5 anos — sem nenhum dado que identifique você.
        </Text>
      </View>

      {erro ? (
        <View style={styles.erroCaixa}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={confirmarExclusao}
        disabled={excluindo}
        style={[styles.botaoExcluir, excluindo && styles.desabilitado]}
      >
        {excluindo ? (
          <ActivityIndicator color={cores.erroTexto} />
        ) : (
          <Text style={styles.botaoExcluirTexto}>Excluir minha conta</Text>
        )}
      </Pressable>
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
    cartao: {
      backgroundColor: cores.cartao,
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    rotulo: {
      fontSize: 12,
      color: cores.textoSecundario,
    },
    valor: {
      fontSize: 15,
      fontWeight: '600',
      color: cores.texto,
    },
    secaoTitulo: {
      fontSize: 13,
      fontWeight: '700',
      color: cores.texto,
      marginBottom: 2,
    },
    texto: {
      fontSize: 13,
      color: cores.textoSecundario,
      lineHeight: 19,
    },
    erroCaixa: {
      backgroundColor: cores.erroFundo,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    erroTexto: {
      color: cores.erroTexto,
      fontSize: 13,
    },
    sucessoTexto: {
      color: cores.primaria,
      fontSize: 13,
      fontWeight: '600',
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
    botaoTrocarSenha: {
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 4,
    },
    botaoTrocarSenhaTexto: {
      color: cores.branco,
      fontSize: 14,
      fontWeight: '700',
    },
    botaoExcluir: {
      borderWidth: 1,
      borderColor: cores.erroTexto,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    botaoExcluirTexto: {
      color: cores.erroTexto,
      fontSize: 14,
      fontWeight: '700',
    },
    desabilitado: {
      opacity: 0.6,
    },
  })
}
