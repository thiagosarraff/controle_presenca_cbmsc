# Sistema de Controle de Presença

Sistema web para controle de presença em eventos, com validação de localização e gestão administrativa.

## Características

- Registro de presença com validação de localização
- Painel administrativo para gestão de eventos
- Validação por palavra-chave
- Integração com Google Sheets para armazenamento de dados
- Interface responsiva (mobile-first)

## Tecnologias

- Next.js 14
- TypeScript
- Google Sheets API
- Tailwind CSS
- Lucide React Icons

## Requisitos

- Node.js 18+
- Conta Google Cloud Platform com API Sheets habilitada
- Arquivo de credenciais do Google Service Account

## Configuração

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/controle-presenca.git
cd controle-presenca
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` com:
```env
# ID da planilha do Google Sheets
NEXT_PUBLIC_SPREADSHEET_ID=seu-spreadsheet-id

# Outras configurações necessárias
```

4. Configure as credenciais do Google:
- Coloque o arquivo `google_secret.json` em `src/`
- OU configure via variável de ambiente (recomendado para produção)

5. Execute em desenvolvimento:
```bash
npm run dev
```

## Estrutura do Projeto

```
src/
  ├── components/
  │   └── PresenceControl/
  │       ├── index.tsx
  │       ├── AdminPanel.tsx
  │       ├── EventManager.tsx
  │       ├── LoginForm.tsx
  │       └── types.ts
  ├── pages/
  │   ├── api/
  │   │   ├── presencas.ts
  │   │   └── eventos.ts
  │   └── index.tsx
  └── config/
      └── eventConfig.ts
```

## Deploy

Este projeto está configurado para deploy automático via GitHub Actions.
Para configurar o deploy:

1. Configure os seguintes secrets no GitHub:
- `GOOGLE_CREDENTIALS`: Conteúdo do arquivo google_secret.json em base64
- `NEXT_PUBLIC_SPREADSHEET_ID`: ID da sua planilha do Google Sheets

2. Faça push para a branch main para disparar o deploy automático

## Uso

### Painel Administrativo
- Acesse o botão de administrador (ícone de cadeado)
- Utilize a senha configurada em `eventConfig.ts`
- Gerencie eventos e visualize presenças

### Registro de Presença
- Acesse via dispositivo móvel
- Digite nome e matrícula/CPF
- Insira o código do evento
- A localização será verificada automaticamente

## Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE.md](LICENSE.md) para detalhes