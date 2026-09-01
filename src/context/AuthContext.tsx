import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'
import api, { extrairMensagemErro } from '../api/client'
import { apagarToken, lerToken, salvarToken } from '../api/tokenStorage'

type Usuario = {
  id: string
  email: string
  roles: string[]
}

export type DadosCadastroMotorista = {
  cnh: string
  cpf: string
  placaVeiculo: string
  modeloVeiculo: string
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
  login: (email: string, senha: string) => Promise<{ sucesso: boolean; mensagem?: string }>
  cadastrar: (
    email: string,
    senha: string,
    motorista: DadosCadastroMotorista
  ) => Promise<{ sucesso: boolean; mensagem?: string }>
  logout: () => Promise<void>
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

  useEffect(() => {
    lerToken()
      .then((token) => {
        if (!token) return
        setUsuario(decodificarUsuario(token))
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
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, verificandoSessao, login, cadastrar, logout }}>
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
