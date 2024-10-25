export type Evento = {
  id: string
  nome: string
  data: string
  palavraChave: string
}

export type Presenca = {
  nome: string
  matriculaCpf: string
  codigo: string
  data: string
  hora: string
  latitude: number
  longitude: number
  dentroDaArea: boolean
  eventoId: string
}

export type Coordenadas = {
  latitude: number
  longitude: number
}