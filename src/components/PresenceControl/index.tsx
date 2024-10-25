import { MapPin, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AdminPanel } from './AdminPanel'
import { EventManager } from './EventManager'
import { LoginForm } from './LoginForm'
import { Presenca, Coordenadas } from './types'
import Image from 'next/image'

export function PresenceControl() {
  const [autenticado, setAutenticado] = useState(false)
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

  const verificarLocalizacao = () => {
    setVerificandoLocalizacao(true)
    
    if (!navigator.geolocation) {
      setMensagem('😕 Seu navegador não suporta geolocalização. Tente usar um navegador mais recente.')
      setVerificandoLocalizacao(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        
        setCoordenadas(coords)
        // Não calculamos mais a distância aqui, pois depende do evento específico
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
    if (senha === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAdmin(true)
      setAutenticado(true)
      setMostrarLoginAdmin(false)
      setSenha('')
    } else {
      setMensagem('🔐 Senha incorreta. Verifique e tente novamente.')
    }
  }

  const registrarPresenca = async () => {
    if (!participanteAtual || !codigoDigitado || !matriculaCpf) {
      setMensagem('📝 Ops! Precisamos de todas as informações para registrar sua presença.')
      return
    }

    if (!localizacaoVerificada) {
      setMensagem('📍 Só um momento, estamos verificando sua localização...')
      return
    }

    if (!coordenadas) {
      setMensagem('🚫 Não conseguimos acessar sua localização. Verifique se você permitiu o acesso no seu navegador.')
      return
    }

    const presenca = {
      nome: participanteAtual,
      matriculaCpf,
      codigo: codigoDigitado.toUpperCase(),
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString(),
      latitude: coordenadas.latitude,
      longitude: coordenadas.longitude,
      dentroDaArea: false  // Será determinado pelo backend
    }

    try {
      const response = await fetch('/api/presencas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(presenca),
      })

      const data = await response.json()

      if (response.ok) {
        setMensagem('🎉 Tudo certo! Sua presença foi registrada com sucesso!')
        setParticipanteAtual('')
        setMatriculaCpf('')
        setCodigoDigitado('')
        setCoordenadas(null)
        setDentroDaArea(false)
        setLocalizacaoVerificada(false)
      } else {
        setMensagem(data.error || '❌ Não foi possível registrar sua presença. Tente novamente.')
      }
    } catch (error) {
      console.error('❌ Não foi possível registrar sua presença. Tente novamente.:', error)
      setMensagem('❌ Não foi possível registrar sua presença. Tente novamente.')
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
                src="/images/logo.png"
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
                src="/images/logo.png"
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
                    Este sistema foi desenvolvido para uso em dispositivos móveis.
                  </p>
                  <p className="text-yellow-600 mt-2">
                    Use seu smartphone para acessar e registrar sua presença.
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
              src="/images/logo.png"
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
              <MapPin className={`w-5 h-5 ${localizacaoVerificada ? 'text-green-500' : 'text-gray-400'}`} />
              <span>
                {verificandoLocalizacao ? '🔍 Verificando sua localização...' :
                  localizacaoVerificada ? 
                    'Localização verificada ✓' : 
                    'Ative a localização do seu dispositivo para continuar'}
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