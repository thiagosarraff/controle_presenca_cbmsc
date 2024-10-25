import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import path from 'path'
import fs from 'fs'

const RANGE = 'Presenças!A:I' // A:Nome, B:Matrícula/CPF, C:Código, D:Data, E:Hora, F:Latitude, G:Longitude, H:DentroDaArea, I:EventoId

// Função para calcular distância entre coordenadas
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3 // raio da Terra em metros
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lon2-lon1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // em metros
}

// Função para validar evento e localização
async function validarEvento(palavraChave: string, data: string, coordenadas: { latitude: number, longitude: number }, sheets: any) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Eventos!A:G',
    })

    const rows = response.data.values || []
    if (rows.length <= 1) return null

    // Procura evento com a palavra-chave
    const evento = rows.slice(1).find(row => row[3].toUpperCase() === palavraChave.toUpperCase())
    if (!evento) return null

    // Valida a data
    const dataEvento = new Date(evento[2] + 'T00:00:00')
    const dataRegistro = new Date(data + 'T00:00:00')

    if (
      dataEvento.getFullYear() !== dataRegistro.getFullYear() ||
      dataEvento.getMonth() !== dataRegistro.getMonth() ||
      dataEvento.getDate() !== dataRegistro.getDate()
    ) {
      return null
    }

    // Valida a localização
    const distancia = calcularDistancia(
      coordenadas.latitude,
      coordenadas.longitude,
      parseFloat(evento[4]), // latitude do evento
      parseFloat(evento[5])  // longitude do evento
    )

    const dentroDaArea = distancia <= parseFloat(evento[6]) // raio permitido do evento
    
    return {
      id: evento[0],
      dentroDaArea
    }
  } catch (error) {
    console.error('Erro ao validar evento:', error)
    return null
  }
}

// Função para obter e validar as credenciais
function getCredentials() {
  try {
    const credentialsPath = path.join(process.cwd(), 'src', 'google_secret.json')
    return JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'))
  } catch (error) {
    console.error('Erro ao carregar credenciais:', error)
    throw new Error('Erro ao carregar credenciais do Google Sheets')
  }
}

// Inicializa o cliente do Google Sheets
async function getGoogleSheetsClient() {
  try {
    const credentials = getCredentials()
    const client = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })

    return google.sheets({ version: 'v4', auth: client })
  } catch (error) {
    console.error('Erro ao inicializar cliente do Google Sheets:', error)
    throw new Error('Erro ao configurar conexão com Google Sheets')
  }
}

// Função para formatar os dados para a planilha
function formatDataForSheet(data: any) {
  return [
    [
      data.nome,
      data.matriculaCpf,
      data.codigo,
      data.data,
      data.hora,
      data.latitude.toString(),
      data.longitude.toString(),
      data.dentroDaArea ? 'Sim' : 'Não',
      data.eventoId
    ]
  ]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const sheets = await getGoogleSheetsClient()

    if (req.method === 'POST') {
      const dados = req.body

      // Valida os dados recebidos
      if (!dados.nome || !dados.codigo || !dados.matriculaCpf || !dados.latitude || !dados.longitude) {
        return res.status(400).json({ error: 'Dados incompletos' })
      }

      // Valida se matrícula/CPF contém apenas números
      if (!/^\d+$/.test(dados.matriculaCpf)) {
        return res.status(400).json({ error: 'Matrícula/CPF deve conter apenas números' })
      }

      // Valida o evento e a localização
      const resultado = await validarEvento(
        dados.codigo,
        dados.data,
        { 
          latitude: dados.latitude, 
          longitude: dados.longitude 
        },
        sheets
      )

      if (!resulta