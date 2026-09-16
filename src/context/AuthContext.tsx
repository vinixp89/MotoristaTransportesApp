import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import api, { extrairMensagemErro } from '../api/client'
import { apagarToken, lerToken, salvarToken } from '../api/tokenStorage'

type Usuario = {
  id: string
  email: string
  roles: string[]
}

// Só os campos que o app precisa pra decidir se o cadastro está completo (ver
// RootNavigator) — espelha um subconjunto de MotoristaResponse do backend.
export type MotoristaPerfil = {
  telefoneVerificado: boolean
  termosAceitos: boolean
}

export type DadosCadastroMotorista = {
  cnh: string
  cpf: string
  placaVeiculo: string
  modeloVeiculo: string
  anoVeiculo: number
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
}

type AuthContextType = {
  usuario: Usuario | null
  carregando: boolean
  verificandoSessao: boolean
  perfil: MotoristaPerfil | null
  carregandoPerfil: boolean
  recarregarPerfil: () => Promise<void>
  login: (email: string, senha: string) => Promise<{ sucesso: boolean; mensagem?: string }>
  cadastrar: (
    email: string,
    senha: string,
    motorista: DadosCadastroMotorista
  ) => Promise<{ sucesso: boolean; mensagem?: string }>
  logout: () => Promise<void>
  excluirConta: () => Promise<{ sucesso: boolean; mensagem?: string }>
}

const AuthContext = createContext<AuthContextType | null>(null)

// O AuthResponse do backend (Token, ExpiraEm, Email, UsuarioId) não traz as roles do usuário —
// elas vêm dentro do próprio JWT, então decodificamos o token pra saber se é Cliente/Motorista/Admin.
// Mesma lógica do front-end web (AuthContext.jsx) e do app do Cliente.
function decodificarUsuario(token: string): Usuario {
  const payload = jwtDecode<Record<string, unknown>>(token)

  const roleClaim =
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? payload.role

  const roles = Array.isArray(roleClaim) ? (roleClaim as string[]) : roleClaim ? [roleClaim as string] : []

  return {
    id: payload.sub as string,
    email: payload.email as string,
    roles,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(false)
  // SecureStore é assíncrono (diferente do localStorage do web), então a sessão salva só fica
  // disponível depois de um await — enquanto isso, verificandoSessao evita mostrar a tela de
  // login por um instante antes de confirmar que já tinha um token salvo.
  const [verificandoSessao, setVerificandoSessao] = useState(true)

  // Perfil do Motorista (telefoneVerificado/termosAceitos) — o RootNavigator usa isso pra travar o
  // app na tela de confirmação por SMS até completar o cadastro (ver ConfirmarSmsScreen).
  // carregandoPerfil começa true pra não deixar a Home aparecer um instante antes do perfil
  // carregar, o que mostraria o app "destravado" por engano.
  const [perfil, setPerfil] = useState<MotoristaPerfil | null>(null)
  const [carregandoPerfil, setCarregandoPerfil] = useState(true)

  async function carregarPerfil() {
    setCarregandoPerfil(true)

    try {
      const { data } = await api.get<MotoristaPerfil>('/Motoristas/meu-perfil')
      setPerfil(data)
    } catch {
      setPerfil(null)
    } finally {
      setCarregandoPerfil(false)
    }
  }

  useEffect(() => {
    lerToken()
      .then((token) => {
        if (!token) {
          setCarregandoPerfil(false)
          return
        }
        setUsuario(decodificarUsuario(token))
        return carregarPerfil()
      })
      .catch(() => apagarToken())
      .finally(() => setVerificandoSessao(false))
  }, [])

  async function login(email: string, senha: string) {
    setCarregando(true)

    try {
      const { data } = await api.post('/Auth/login', { email, senha })

      await salvarToken(data.token)
      setUsuario(decodificarUsuario(data.token))
      await carregarPerfil()

      return { sucesso: true }
    } catch (error) {
      return { sucesso: false, mensagem: extrairMensagemErro(error) }
    } finally {
      setCarregando(false)
    }
  }

  async function cadastrar(email: string, senha: string, motorista: DadosCadastroMotorista) {
    setCarregando(true)

    try {
      const { data } = await api.post('/Auth/registrar-motorista', { email, senha, motorista })

      await salvarToken(data.token)
      setUsuario(decodificarUsuario(data.token))
      await carregarPerfil()

      return { sucesso: true }
    } catch (error) {
      return { sucesso: false, mensagem: extrairMensagemErro(error) }
    } finally {
      setCarregando(false)
    }
  }

  async function logout() {
    await apagarToken()
    setUsuario(null)
    setPerfil(null)
  }

  // Anonimiza os dados da conta no backend (ver AuthController.ExcluirContaMotorista) e desloga em
  // seguida — não tem como desfazer, então quem chama isso já deve ter confirmado com o motorista antes.
  async function excluirConta() {
    setCarregando(true)

    try {
      await api.post('/Auth/excluir-conta-motorista')
      await logout()
      return { sucesso: true }
    } catch (error) {
      return { sucesso: false, mensagem: extrairMensagemErro(error) }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        carregando,
        verificandoSessao,
        perfil,
        carregandoPerfil,
        recarregarPerfil: carregarPerfil,
        login,
        cadastrar,
        logout,
        excluirConta,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(AuthContext)

  if (!contexto) {
    throw new Error('useAuth precisa ser usado dentro de um <AuthProvider>')
  }

  return contexto
}
