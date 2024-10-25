import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import path from 'path'
import fs from 'fs'
import { format, parse } from 'date-fns'

const EVENTS_RANGE = 'Eventos!A:G' // A:ID, B:Nome, C:Data, D:Palavra-chave, E:Latitude, F:Longitude, G:Raio

// Função para formatar data para o padrão brasileiro
function formatDateToBR(dateStr: string) {
  try {
    // Se a data estiver no formato ISO
    if (dateStr.includes('-')) {
      const date = new Date(dateStr)
      return format(date, 'dd/MM/yyyy')
    }
    // Se já estiver no formato brasileiro, remove o apóstrofo se houver
    return dateStr.replace("'", '')
  } catch (error) {
    return dateStr
  }
}

// Função para garantir formato consistente de data
function normalizeDate(dateStr: string) {
  try {
    // Se a data vier no formato brasileiro (dd/MM/yyyy)
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.replace("'", '').split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    // Se já estiver no formato ISO, retorna como está
    return dateStr
  } catch (error) {
    return dateStr
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

// Função para formatar os dados do evento
function formatEventData(data: any) {
  return [
    [
      data.id,
      data.nome,
      data.data,
      data.palavraChave,
      data.latitude.toString(),
      data.longitude.toString(),
      data.raioPermitido.toString()
    ]
  ]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const sheets = await getGoogleSheetsClient()

    // GET - Lista todos os eventos
    if (req.method === 'GET') {
      // Primeiro verifica se a aba existe, se não, cria
      try {
        await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range: 'Eventos!A1:G1',
        })
      } catch (error) {
        // Se a aba não existir, cria com o cabeçalho
        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.SPREADSHEET_ID,
          range: 'Eventos!A1:G1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [['ID', 'Nome', 'Data', 'Palavra-chave', 'Latitude', 'Longitude', 'Raio']]
          }
        })
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: EVENTS_RANGE,
      })

      const rows = response.data.values || []

      // Se não houver dados além do cabeçalho, retorna array vazio
      if (rows.length <= 1) {
        return res.status(200).json([])
      }

      // Converte os dados para um formato mais amigável
      const eventos = rows.slice(1)
        .filter(row => row[0]) // Remove linhas vazias
        .map(row => ({
          id: row[0],
          nome: row[1],
          data: row[2],
          palavraChave: row[3],
          latitude: parseFloat(row[4]),
          longitude: parseFloat(row[5]),
          raioPermitido: parseInt(row[6])
        }))

      res.status(200).json(eventos)
    }
    
    // POST - Cria um novo evento
    else if (req.method === 'POST') {
      const { nome, data, palavraChave, latitude, longitude, raioPermitido } = req.body

      if (!nome || !data || !palavraChave || !latitude || !longitude || !raioPermitido) {
        return res.status(400).json({ error: 'Dados incompletos' })
      }

      // Gera um ID único
      const id = `ev_${Date.now()}`

      // Normaliza a data para o formato correto antes de salvar
      const normalizedDate = normalizeDate(data)

      const values = formatEventData({
        id,
        nome,
        data: normalizedDate,
        palavraChave: palavraChave.toUpperCase(),
        latitude,
        longitude,
        raioPermitido
      })
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: EVENTS_RANGE,
        valueInputOption: 'RAW',
        requestBody: { values }
      })

      res.status(200).json({ message: 'Evento criado com sucesso', id })
    }
    
    // PUT - Atualiza um evento existente
    else if (req.method === 'PUT') {
      const { id } = req.query
      const { nome, data, palavraChave, latitude, longitude, raioPermitido } = req.body

      if (!id || !nome || !data || !palavraChave || !latitude || !longitude || !raioPermitido) {
        return res.status(400).json({ error: 'Dados incompletos' })
      }

      // Normaliza a data para o formato correto
      const normalizedDate = normalizeDate(data)

      // Primeiro, encontra o índice da linha do evento
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: EVENTS_RANGE,
      })

      const rows = response.data.values || []
      const rowIndex = rows.findIndex(row => row[0] === id)

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Evento não encontrado' })
      }

      // Atualiza a linha
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `Eventos!A${rowIndex + 1}:G${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: formatEventData({
            id,
            nome,
            data: normalizedDate,
            palavraChave: palavraChave.toUpperCase(),
            latitude,
            longitude,
            raioPermitido
          })
        }
      })

      res.status(200).json({ message: 'Evento atualizado com sucesso' })
    }
    
    // DELETE - Remove um evento
    else if (req.method === 'DELETE') {
      const { id } = req.query

      if (!id) {
        return res.status(400).json({ error: 'ID do evento não fornecido' })
      }

      // Primeiro, encontra o índice da linha do evento
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: EVENTS_RANGE,
      })

      const rows = response.data.values || []
      const rowIndex = rows.findIndex(row => row[0] === id)

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Evento não encontrado' })
      }

      // Limpa a linha do evento
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `Eventos!A${rowIndex + 1}:G${rowIndex + 1}`,
      })

      res.status(200).json({ message: 'Evento removido com sucesso' })
    }
    
    else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Erro na API:', error)
    res.status(500).json({ error: 'Erro ao processar requisição: ' + (error as Error).message })
  }
}