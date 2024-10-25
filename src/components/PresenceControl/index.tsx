import Image from 'next/image'
import { MapPin, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminPanel } from './AdminPanel'
import { EventManager } from './EventManager'
import { LoginForm } from './LoginForm'
import { Presenca, Coordenadas } from './types'
import { eventConfig } from '@/config/eventConfig'

export function PresenceControl() {
  const [_autenticado, setAutenticado] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mostrarLoginAdmin, setMostrarLoginAdmin] = useState(false)
  const [senha, setSenha] = useState('')
  const [codigoDigitado, setCodigoDigitado] = useState('')
  const [presencas, setPresencas] = useState<Record<string, Presenca>>({})
  const [participanteAtual, setParticipanteAtual] = useState('')
  const [matriculaCpf, setMatriculaCpf] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null)
  const [dentroDaArea, setDentroDaArea] = useState(false)
  const [localizacaoVerificada, setLocalizacaoVerificada] = useState(false)
  const [verificandoLocalizacao, setVerificandoLocalizacao] = useState(false)
  const [distanciaAtual, setDistanciaAtual] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  }, [])

  const carregarPresencas = async () => {
    try {
      const response = await fetch('/api/presencas')
      const data = await response.json()
      setPresencas(data)
    } catch (error) {
      console.error('Erro ao carregar presenças:', error)
      setMensagem('Erro ao carregar presenças')
    }
  }

  const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3
    const φ1 = lat1 * Math.PI/180
    const φ2 = lat2 * Math.PI/180
    const Δφ = (lat2-lat1) * Math.PI/180
    const Δλ = (lon2-lon1) * Math.PI/180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c
  }

  const verificarLocalizacao = () => {
    setVerificandoLocalizacao(true)
    
    if (!navigator.geolocation) {
      setMensagem('Geolocalização não suportada pelo navegador')
      setVerificandoLocalizacao(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        
        const distancia = calcularDistancia(
          coords.latitude,
          coords.longitude,
          eventConfig.location.latitude,
          eventConfig.location.longitude
        )
        
        setCoordenadas(coords)
        setDistanciaAtual(distancia)
        setDentroDaArea(distancia <= eventConfig.location.raioPermitido)
        setLocalizacaoVerificada(true)
        setVerificandoLocalizacao(false)
      },
      (error) => {
        console.error('Erro ao obter localização:', error)
        setMensagem('Erro ao obter localização')
        setVerificandoLocalizacao(false)
      }
    )
  }

  const fazerLogin = () => {
    // Verifica se a senha corresponde à variável de ambiente
    if (senha === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAdmin(true)
      setAutenticado(true)
      setMostrarLoginAdmin(false)
      setSenha('')
    } else {
      setMensagem('Senha incorreta')
    }
  }

  const registrarPresenca = async () => {
    if (!participanteAtual || !codigoDigitado || !matriculaCpf) {
      setMensagem('Preencha todos os campos')
      return
    }

    if (!localizacaoVerificada) {
      setMensagem('Aguarde a verificação da localização')
      return
    }

    if (!coordenadas) {
      setMensagem('Não foi possível obter sua localização')
      return
    }

    // Formata a data atual no padrão ISO
    const dataAtual = new Date().toISOString().split('T')[0]
    const horaAtual = new Date().toLocaleTimeString()

    const presenca = {
      nome: participanteAtual,
      matriculaCpf,
      codigo: codigoDigitado,
      data: dataAtual,
      hora: horaAtual,
      latitude: coordenadas.latitude,
      longitude: coordenadas.longitude,
      dentroDaArea
    }

    try {
      console.log('Enviando dados de presença:', presenca) // Debug
      const response = await fetch('/api/presencas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(presenca),
      })

      const data = await response.json()

      if (response.ok) {
        setMensagem('Presença registrada com sucesso!')
        setParticipanteAtual('')
        setMatriculaCpf('')
        setCodigoDigitado('')
        setCoordenadas(null)
        setDentroDaArea(false)
        setLocalizacaoVerificada(false)
      } else {
        console.error('Erro na resposta:', data) // Debug
        setMensagem(data.error || 'Erro ao registrar presença')
      }
    } catch (error) {
      console.error('Erro ao registrar presença:', error)
      setMensagem('Erro ao registrar presença')
    }
  }
  if (isAdmin) {
    return (
      <EventManager 
        onLogout={() => {
          setIsAdmin(false)
          setAutenticado(false)
        }}
      />
    )
  }

  // Se for página de login de admin, mostra independente do dispositivo
  if (mostrarLoginAdmin) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg mb-4">
          <div className="border-b">
            <div className="p-4 flex items-center gap-3">
              <Image 
                src="https://www.cbm.sc.gov.br/images/imagens/O_CBMSC/logo.png"
                alt="Logo CBMSC" 
                width={32}
                height={32}
                className="h-8 w-auto"
              />
              <h2 className="text-xl font-bold flex-1">Acesso Administrativo</h2>
            </div>
          </div>
          <div className="p-4">
            <LoginForm 
              senha={senha}
              onSenhaChange={setSenha}
              onLogin={fazerLogin}
              onCancel={() => {
                setMostrarLoginAdmin(false)
                setSenha('')
                setMensagem('')
              }}
            />
            {mensagem && (
              <div className="border-l-4 border-red-500 bg-red-50 text-red-700 p-4 mt-4">
                <p>{mensagem}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Se não for mobile e não for admin, mostra mensagem de acesso mobile apenas
  if (!isMobile) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg mb-4">
          <div className="border-b">
            <div className="p-4 flex items-center gap-3">
              <Image 
                src="https://www.cbm.sc.gov.br/images/imagens/O_CBMSC/logo.png"
                alt="Logo CBMSC" 
                width={32}
                height={32}
                className="h-8 w-auto"
              />
              <h2 className="text-xl font-bold flex-1">Registro de Presença</h2>
              <button
                onClick={() => setMostrarLoginAdmin(true)}
                className="p-2 text-gray-500 hover:text-gray-700"
                title="Acesso Administrador"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-8">
            <div className="flex flex-col items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Acesso Mobile Apenas</h2>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                  <p className="text-yellow-700">
                    O registro de presença foi projetado para funcionar apenas em dispositivos móveis.
                  </p>
                  <p className="text-yellow-600 mt-2">
                    Por favor, acesse através do navegador do seu celular.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Interface mobile para registro de presença
  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg mb-4">
        <div className="border-b">
          <div className="p-4 flex items-center gap-3">
            <Image 
              src="https://www.cbm.sc.gov.br/images/imagens/O_CBMSC/logo.png"
              alt="Logo CBMSC" 
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <h2 className="text-xl font-bold flex-1">Registro de Presença</h2>
            <button
              onClick={() => setMostrarLoginAdmin(true)}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Acesso Administrador"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="space-y-4">
            <input
              type="text"
              value={participanteAtual}
              onChange={(e) => {
                setParticipanteAtual(e.target.value)
                if (e.target.value) {
                  verificarLocalizacao()
                }
              }}
              placeholder="Digite seu nome completo"
              className="w-full p-2 border rounded"
            />

            <input
              type="text"
              value={matriculaCpf}
              onChange={(e) => {
                const apenasNumeros = e.target.value.replace(/\D/g, '')
                setMatriculaCpf(apenasNumeros)
              }}
              placeholder="Matrícula/CPF (apenas números)"
              maxLength={11}
              className="w-full p-2 border rounded"
            />
            
            <input
              type="text"
              value={codigoDigitado}
              onChange={(e) => setCodigoDigitado(e.target.value.toUpperCase())}
              placeholder="Digite o código da sessão"
              className="w-full p-2 border rounded"
            />
            
            <div className="flex items-center gap-2 text-sm">
              <MapPin className={`w-5 h-5 ${dentroDaArea ? 'text-green-500' : 'text-gray-400'}`} />
              <span>
                {verificandoLocalizacao ? 'Verificando localização...' :
                  distanciaAtual !== null ? 
                    `Distância até o local: ${distanciaAtual.toFixed(0)}m ${dentroDaArea ? '✓' : ''}` : 
                    'Aguardando localização...'}
              </span>
            </div>
            
            <button
              onClick={registrarPresenca}
              disabled={verificandoLocalizacao}
              className={`w-full py-2 rounded ${
                verificandoLocalizacao 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {verificandoLocalizacao ? 'Verificando...' : 'Registrar Presença'}
            </button>
            
            {mensagem && (
              <div className={`border-l-4 p-4 my-4 ${
                mensagem.includes('sucesso') 
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-red-50 border-red-500 text-red-700'
              }`}>
                <p>{mensagem}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}