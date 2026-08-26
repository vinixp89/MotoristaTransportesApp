import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'

// Mostra a notificação (com som) mesmo com o app aberto em primeiro plano — sem isso, por padrão
// o expo-notifications engole notificações locais enquanto o app está em uso, e o motorista
// precisa ver/ouvir isso mesmo olhando pro app na hora.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Pede permissão de notificação e cria o canal padrão no Android com som — sem canal, o Android
// ignora o som mesmo com a permissão concedida. Chamar uma vez, ao abrir o app.
export async function configurarNotificacoes(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Corridas',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const permissaoAtual = await Notifications.getPermissionsAsync()

  if (permissaoAtual.status !== 'granted') {
    await Notifications.requestPermissionsAsync()
  }
}

// Dispara a notificação (som + pop-up) de corrida nova — chamado sempre que o polling da Home
// detecta um id de corrida pendente que não estava na lista anterior.
export async function notificarCorridaNova(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Nova corrida disponível!',
      body: 'Tem um cliente esperando motorista. Toque pra ver.',
      sound: 'default',
    },
    trigger: null,
  })
}
