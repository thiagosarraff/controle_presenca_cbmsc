import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import path from 'path'
import fs from 'fs'

// Types
type SheetRow = string[]
type EventoRow = [string, string, string, string, string, string, string] // [id, nome, data, palavraChave, latitude, longitude, raio]

const RANGE = 'Presenças!A:I'


// Função para calcular distância entre coordenadas
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
async function validarEvento(
  palavraChave: string, 
  data: string, 
  coordenadas: { latitude: number; longitude: number }, 
  sheets: any
): Promise<{ id: string; dentroDaArea: boolean } | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Eventos!A:G',
    })

    const rows = (response.data.values || []) as SheetRow[]
    if (rows.length <= 1) return null

    // 1. Primeiro encontra o evento específico pela palavra-chave
    const evento = rows.slice(1).find((row: SheetRow) => {
      const palavraChaveEvento = row[3]?.toUpperCase() || ''
      return palavraChaveEvento === palavraChave.toUpperCase()
    })

    // 2. Se não encontrou o evento ou faltam dados, retorna null
    if (!evento || !evento[4] || !evento[5] || !evento[6]) {
      console.log('Evento não encontrado ou 📋 Por favor, preencha todos os campos necessários.')
      return null
    }

    // 3. Valida a data específica deste evento
    const dataEvento = new Date(evento[2] + 'T00:00:00')
    const dataRegistro = new Date(data + 'T00:00:00')

    if (
      dataEvento.getFullYear() !== dataRegistro.getFullYear() ||
      dataEvento.getMonth() !== dataRegistro.getMonth() ||
      dataEvento.getDate() !== dataRegistro.getDate()
    ) {
      console.log('Data inválida para o evento')
      return null
    }

    // 4. Calcula a distância usando APENAS as coordenadas deste evento específico
    const distancia = calcularDistancia(
      coordenadas.latitude,
      coordenadas.longitude,
      parseFloat(evento[4]), // latitude do evento encontrado pela palavra-chave
      parseFloat(evento[5])  // longitude do evento encontrado pela palavra-chave
    )

    // 5. Verifica se está dentro do raio permitido DESTE evento
    const raioPermitido = parseFloat(evento[6])
    const dentroDaArea = distancia <= raioPermitido

    // 6. Log para debug
    console.log({
      evento: evento[1],
      palavraChave,
      distanciaCalculada: distancia,
      raioPermitido,
      dentroDaArea,
      coordenadasUsuario: coordenadas,
      coordenadasEvento: {
        latitude: parseFloat(evento[4]),
        longitude: parseFloat(evento[5])
      }
    })

    // 7. Se não estiver dentro da área DESTE evento, retorna null
    if (!dentroDaArea) {
      console.log('Usuário fora da área do evento')
      return null
    }
    
    return {
      id: evento[0],
      dentroDaArea: true // Se chegou aqui, está dentro da área
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
function formatDataForSheet(data: Record<string, any>): SheetRow[] {
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
        return res.status(400).json({ error: '📋 Por favor, preencha todos os campos necessários.' })
      }

      // Valida se matrícula/CPF contém apenas números
      if (!/^\d+$/.test(dados.matriculaCpf)) {
        return res.status(400).json({ error: '🔢 A matrícula/CPF deve conter apenas números.' })
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

      if (!resultado) {
        return res.status(400).json({ 
          error: '⚠️📍 Código inválido para esta data ou você não está no local do evento.'
        })
      }

      // Adiciona o ID do evento aos dados
      dados.eventoId = resultado.id
      dados.dentroDaArea = resultado.dentroDaArea

      // Prepara e envia os dados para a planilha
      const values = formatDataForSheet(dados)
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: RANGE,
        valueInputOption: 'RAW',
        requestBody: { values }
      })

      res.status(200).json({ message: '🎉 Presença registrada com sucesso!' })
    } 
    else if (req.method === 'GET') {
      const { eventoId } = req.query

      // Busca os dados da planilha
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: RANGE,
      })

      const rows = response.data.values || []

      // Se não houver dados, retorna array vazio
      if (rows.length <= 1) {
        return res.status(200).json(eventoId ? [] : {})
      }

      // Se foi fornecido um eventoId, filtra as presenças daquele evento
      if (eventoId) {
        const presencasEvento = rows.slice(1)
          .filter(row => row[8] === eventoId)
          .map(row => ({
            nome: row[0],
            matriculaCpf: row[1],
            codigo: row[2],
            data: row[3],
            hora: row[4],
            latitude: parseFloat(row[5]),
            longitude: parseFloat(row[6]),
            dentroDaArea: row[7] === 'Sim',
            eventoId: row[8]
          }))

        return res.status(200).json(presencasEvento)
      }

      // Caso contrário, retorna todas as presenças no formato anterior
      const presencas = rows.slice(1).reduce((acc: any, row) => {
        if (row[0]) {
          acc[row[0]] = {
            nome: row[0],
            matriculaCpf: row[1],
            codigo: row[2],
            data: row[3],
            hora: row[4],
            latitude: parseFloat(row[5]),
            longitude: parseFloat(row[6]),
            dentroDaArea: row[7] === 'Sim',
            eventoId: row[8]
          }
        }
        return acc
      }, {})

      res.status(200).json(presencas)
    }
    else {
      res.setHeader('Allow', ['POST', 'GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Erro na API:', error)
    res.status(500).json({ error: '🔧 Ops! Tivemos um problema técnico. Tente novamente em alguns instantes.' })
  }
}