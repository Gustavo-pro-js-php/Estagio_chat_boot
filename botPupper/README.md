# 🤖 Bot WhatsApp com whatsapp-web.js

Este projeto é um bot para WhatsApp usando a biblioteca [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js), junto com **Puppeteer** para automação do navegador e **Node.js** como ambiente de execução.

Ele permite conectar ao WhatsApp pelo navegador, enviar e receber mensagens, além de trabalhar com envio de mídias como imagens, áudios e documentos.

---

## 📋 Pré-requisitos

Antes de começar, instale no seu computador:

- [Node.js](https://nodejs.org/) **versão 16 ou superior** (necessário para rodar o projeto)
- **Google Chrome** ou **Chromium** (o Puppeteer baixa uma versão própria automaticamente)
- WhatsApp instalado no celular para escanear o QR Code de conexão

## 📥 Instalação

1. Abra o terminal e vá até a pasta do projeto:
```bash
npm install whatsapp-web.js qrcode-terminal puppeteer fs ##pode executar um por ves caso tenha erros
