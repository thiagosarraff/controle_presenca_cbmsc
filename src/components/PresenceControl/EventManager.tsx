import { useState, useEffect } from 'react'
import { Evento, Presenca } from './types'
import { format, parse } from 'date-fns'  // Adicionado 'parse' aqui
import { ptBR } from 'date-fns/locale'
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'


type EventManagerProps = {
  onLogout: () => void
}

export function EventManager({ onLogout }: EventManagerProps) {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [presencas, setPresencas] = useState<Record<string, Presenca[]>>({})
  const [novoEvento, setNovoEvento] = useState<Partial<Evento>>({})
  const [editandoEvento, setEditandoEvento] = useState<string | null>(null)
  const [eventoExpandido, setEventoExpandido] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    carregarEventos()
  }, [])

  const carregarEventos = async () => {
    try {
      const response = await fetch('/api/eventos')
      const data = await response.json()
      setEventos(data)
    } catch (error) {
      console.error('⚠️ Não foi possível carregar os eventos. Tente novamente.:', error)
      setMensagem('⚠️ Não foi possível carregar os eventos. Tente novamente.')
    }
  }

  const carregarPresencasEvento = async (eventoId: string) => {
    try {
      console.log('Carregando presenças para evento:', eventoId) // Debug
      const response = await fetch(`/api/presencas?eventoId=${eventoId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('Presenças carregadas:', data) // Debug
      setPresencas(prev => ({
        ...prev,
        [eventoId]: Array.isArray(data) ? data : []
      }))
    } catch (error) {
      console.error('Erro ao carregar presenças:', error)
      setMensagem('Erro ao carregar presenças')
      setPresencas(prev => ({
        ...prev,
        [eventoId]: []
      }))
    }
  }

  const salvarEvento = async () => {
    try {
      if (!novoEvento.nome || !novoEvento.data || !novoEvento.palavraChave) {
        setMensagem('Preencha todos os campos')
        return
      }

      const response = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoEvento)
      })

      if (response.ok) {
        await carregarEventos()
        setNovoEvento({})
        setMensagem('✨ Evento cadastrado com sucesso!')
      } else {
        setMensagem('❌ Erro ao salvar o evento. Verifique os dados e tente novamente.')
      }
    } catch (error) {
      console.error('❌ Erro ao salvar o evento. Verifique os dados e tente novamente.:', error)
      setMensagem('❌ Erro ao salvar o evento. Verifique os dados e tente novamente.')
    }
  }

  const atualizarEvento = async (evento: Evento) => {
    try {
      if (!evento.nome || !evento.data || !evento.palavraChave) {
        setMensagem('Preencha todos os campos')
        return
      }

      const response = await fetch(`/api/eventos?id=${evento.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evento)
      })

      if (response.ok) {
        await carregarEventos()
        setEditandoEvento(null)
        setMensagem('Evento atualizado com sucesso!')
      } else {
        setMensagem('Erro ao atualizar evento')
      }
    } catch (error) {
      console.error('Erro ao atualizar evento:', error)
      setMensagem('Erro ao atualizar evento')
    }
  }

  const excluirEvento = async (eventoId: string) => {
    if (!window.confirm('⚠️ Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.')) return

    try {
      const response = await fetch(`/api/eventos?id=${eventoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await carregarEventos()
        setMensagem('🗑️ Evento removido com sucesso!')
      } else {
        setMensagem('Erro ao excluir evento')
      }
    } catch (error) {
      console.error('Erro ao excluir evento:', error)
      setMensagem('Erro ao excluir evento')
    }
  }

  const toggleEventoExpandido = async (eventoId: string) => {
    if (eventoExpandido === eventoId) {
      setEventoExpandido(null)
    } else {
      setEventoExpandido(eventoId)
      // Sempre recarrega as presenças ao expandir
      await carregarPresencasEvento(eventoId)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg mb-4">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Gerenciamento de Eventos</h2>
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
            {/* Formulário de novo evento */}
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-bold mb-4">Novo Evento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <input
                    type="text"
                    value={novoEvento.nome || ''}
                    onChange={(e) => setNovoEvento(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome do evento"
                    className="w-full p-2 border rounded"
                  />
                  <input
                    type="date"
                    value={novoEvento.data || ''}
                    onChange={(e) => setNovoEvento(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full p-2 border rounded"
                  />
                  <input
                    type="text"
                    value={novoEvento.palavraChave || ''}
                    onChange={(e) => setNovoEvento(prev => ({ 
                      ...prev, 
                      palavraChave: e.target.value.replace(/\s+/g, '').toUpperCase() 
                    }))}
                    placeholder="Palavra-chave (sem espaços)"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="space-y-4">
                  <input
                    type="number"
                    value={novoEvento.latitude || ''}
                    onChange={(e) => setNovoEvento(prev => ({ 
                      ...prev, 
                      latitude: parseFloat(e.target.value) 
                    }))}
                    placeholder="Latitude"
                    step="any"
                    className="w-full p-2 border rounded"
                  />
                  <input
                    type="number"
                    value={novoEvento.longitude || ''}
                    onChange={(e) => setNovoEvento(prev => ({ 
                      ...prev, 
                      longitude: parseFloat(e.target.value) 
                    }))}
                    placeholder="Longitude"
                    step="any"
                    className="w-full p-2 border rounded"
                  />
                  <input
                    type="number"
                    value={novoEvento.raioPermitido || ''}
                    onChange={(e) => setNovoEvento(prev => ({ 
                      ...prev, 
                      raioPermitido: parseInt(e.target.value) 
                    }))}
                    placeholder="Raio permitido (metros)"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <button
                onClick={salvarEvento}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Salvar Evento
              </button>
            </div>

            {/* Lista de eventos */}
            <div className="space-y-2">
              <h3 className="font-bold">Eventos Cadastrados</h3>
              {eventos && eventos.length > 0 ? (
                eventos.map(evento => (
                  <div key={evento.id} className="border rounded">
                    <div className="p-4">
                      {editandoEvento === evento.id ? (
                        // Modo de edição
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input
                            type="text"
                            value={evento.nome}
                            onChange={(e) => setEventos(prev => 
                              prev.map(ev => ev.id === evento.id ? 
                                { ...ev, nome: e.target.value } : ev
                              )
                            )}
                            className="p-2 border rounded"
                          />
                          <input
                            type="date"
                            value={(() => {
                              try {
                                // Se já estiver no formato ISO, retorna como está
                                if (evento.data.includes('-')) {
                                  return evento.data
                                }
                                // Se estiver no formato dd/MM/yyyy, converte para ISO
                                const [day, month, year] = evento.data.split('/')
                                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                              } catch {
                                return evento.data
                              }
                            })()}
                            onChange={(e) => setEventos(prev => 
                              prev.map(ev => ev.id === evento.id ? 
                                { ...ev, data: e.target.value } : ev
                              )
                            )}
                            className="p-2 border rounded"
                          />
                          <input
                            type="text"
                            value={evento.palavraChave}
                            onChange={(e) => setEventos(prev => 
                              prev.map(ev => ev.id === evento.id ? 
                                { ...ev, palavraChave: e.target.value.replace(/\s+/g, '').toUpperCase() } : ev
                              )
                            )}
                            className="p-2 border rounded"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => atualizarEvento(evento)}
                              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditandoEvento(null)}
                              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Modo de visualização
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold">{evento.nome}</h4>
                            <p className="text-sm text-gray-600">
                              {(() => {
                                try {
                                  const date = new Date(evento.data.includes('-') 
                                    ? evento.data 
                                    : evento.data.split('/').reverse().join('-'));
                                  
                                  // Ajusta a data considerando o fuso horário
                                  date.setUTCHours(3, 0, 0, 0);

                                  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                                } catch (error) {
                                  return evento.data;
                                }
                              })()}
                            </p>
                            <p className="text-sm text-gray-500">
                              Palavra-chave: {evento.palavraChave}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditandoEvento(evento.id)}
                              className="p-2 text-blue-500 hover:text-blue-700"
                              title="Editar"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => excluirEvento(evento.id)}
                              className="p-2 text-red-500 hover:text-red-700"
                              title="Excluir"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => toggleEventoExpandido(evento.id)}
                              className="p-2 text-gray-500 hover:text-gray-700"
                              title="Ver presenças"
                            >
                              {eventoExpandido === evento.id ? 
                                <ChevronUp className="w-5 h-5" /> : 
                                <ChevronDown className="w-5 h-5" />
                              }
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lista de presenças do evento */}
                    {eventoExpandido === evento.id && (
                      <div className="border-t p-4 bg-gray-50">
                        <h5 className="font-bold mb-2">Presenças Registradas</h5>
                        {presencas[evento.id]?.length > 0 ? (
                          <div className="space-y-2">
                            {presencas[evento.id].map((presenca, index) => (
                              <div key={index} className="flex justify-between items-center p-2 bg-white rounded shadow-sm">
                                <div>
                                  <p className="font-medium">{presenca.nome}</p>
                                  <p className="text-sm text-gray-500">
                                    Matrícula/CPF: {presenca.matriculaCpf}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">{presenca.hora}</p>
                                  <p className="text-sm text-gray-500">{presenca.data}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">👥 Nenhuma presença registrada neste evento</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 p-4">📅 Nenhum evento cadastrado ainda</p>
              )}
            </div>

            {mensagem && (
              <div className={`border-l-4 p-4 ${
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