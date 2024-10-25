import { QrCode, CheckCircle } from 'lucide-react'
import { Presenca } from './types'

type AdminPanelProps = {
  codigoSessao: string
  presencas: Record<string, Presenca>
  onLogout: () => void
}

export function AdminPanel({ codigoSessao, presencas, onLogout }: AdminPanelProps) {
  return (
    <div className="max-w-md mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg mb-4">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Painel do Administrador</h2>
            <button
              onClick={onLogout}
              className="text-sm bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
            >
              Sair
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div className="text-center p-4 bg-gray-100 rounded">
              <p className="text-lg font-bold mb-2">Código da Sessão:</p>
              <div className="flex items-center justify-center gap-2">
                <QrCode className="w-8 h-8" />
                <span className="text-2xl font-mono">{codigoSessao}</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-2">Presenças Registradas:</h3>
              <div className="space-y-2">
                {Object.entries(presencas).map(([nome, info]) => (
                  <div key={nome} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <CheckCircle className="text-green-500 w-5 h-5" />
                    <span>{nome}</span>
                    <span className="text-sm text-gray-500 ml-auto">
                      {info.hora} - {info.data}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}