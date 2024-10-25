import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import path from 'path'
import fs from 'fs'
import { eventConfig } from '@/config/eventConfig'

const RANGE = 'Presenças!A:I' // Atualizado para incluir eventoId

// Função para validar evento e data
async function validarEvento(palavraChave: string, data: string, sheets: any) {
  try {
    console.log('Validando evento - palavra-chave:', palavraChave.toUpperCase(), 'data:', data) // Debug

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: eventConfig.spreadsheetId,
      range: 'Eventos!A:D',
    })

    const rows = response.data.values || []
    if (rows.length <= 1) {
      console.log('Nenhum evento encontrado') // Debug
      return null
    }

    console.log('Eventos disponíveis:', rows.slice(1)) // Debug

    // Procura um evento com a palavra-chave fornecida
    const evento = rows.slice(1).find(row => row[3].toUpperCase() === palavraChave.toUpperCase())
    if (!evento) {
      console.log('Nenhum evento encontrado com a palavra-chave:', palavraChave.toUpperCase()) // Debug
      return null
    }

    console.log('Evento encontrado:', evento) // Debug

    // Normaliza as datas para comparação
    const dataEvento = new Date(evento[2] + 'T00:00:00')
    const dataRegistro = new Date(data + 'T00:00:00')

    console.log('Comparando datas:', {
      dataEvento: dataEvento.toISOString(),
      dataRegistro: dataRegistro.toISOString()
    }) // Debug

    // Compara apenas as datas, ignorando o horário
    if (
      dataEvento.getFullYear() === dataRegistro.getFullYear() &&
      dataEvento.getMonth() === dataRegistro.getMonth() &&
      dataEvento.getDate() === dataRegistro.getDate()
    ) {
      console.log('Data válida, retornando ID do evento:', evento[0]) // Debug
      return evento[0] // Retorna o ID do evento
    }

    console.log('Data inválida') // Debug
    return null
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
      data.eventoId // Novo campo
    ]
  ]
}

// Handler principal da API
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const sheets = await getGoogleSheetsClient()

  if (req.method === 'POST') {
    const dados = req.body
    console.log('Dados recebidos:', dados) // Debug

    // Valida os dados recebidos
    if (!dados.nome || !dados.codigo || !dados.matriculaCpf) {
      return res.status(400).json({ error: 'Dados incompletos' })
    }

    // Valida se matrícula/CPF contém apenas números
    if (!/^\d+$/.test(dados.matriculaCpf)) {
      return res.status(400).json({ error: 'Matrícula/CPF deve conter apenas números' })
    }

    // Valida o evento e a data
    const eventoId = await validarEvento(dados.codigo, dados.data, sheets)
    if (!eventoId) {
      return res.status(400).json({ 
        error: 'Código inválido ou fora da data do evento'
      })
    }

    // Adiciona o ID do evento aos dados
    dados.eventoId = eventoId

    // Prepara e envia os dados para a planilha
    const values = formatDataForSheet(dados)
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: eventConfig.spreadsheetId,
      range: RANGE,
      valueInputOption: 'RAW',
      requestBody: { values }
    })

    res.status(200).json({ message: 'Presença registrada com sucesso' })
  }
 
    else if (req.method === 'GET') {
      const { eventoId } = req.query

      // Busca os dados da planilha
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: eventConfig.spreadsheetId,
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
          .filter(row => row[8] === eventoId) // Filtra pelo eventoId
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
        if (row[0]) { // Verifica se tem nome
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
    res.status(500).json({ error: 'Erro ao processar requisição' })
  }
}