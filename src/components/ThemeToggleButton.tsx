import { Pressable, StyleSheet, Text } from 'react-native'
import { useTema } from '../context/ThemeContext'

// Botão de alternar claro/escuro — mesmo componente do app Cliente.
export default function ThemeToggleButton() {
  const { tema, cores, alternarTema } = useTema()

  return (
    <Pressable
      onPress={alternarTema}
      hitSlop={8}
      style={[styles.botao, { borderColor: cores.borda, backgroundColor: cores.cartao }]}
    >
      <Text style={styles.emoji}>{tema === 'dark' ? '☀️' : '🌙'}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  botao: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 15,
  },
})
