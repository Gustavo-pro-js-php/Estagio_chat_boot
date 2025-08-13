const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js'); // Importe MessageMedia aqui
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const fs = require('fs'); // Para manipular arquivos

// Mapeamento de chat IDs para o estado da conversa
const userStates = {};
// Mapeamento de chat IDs para a INSTÂNCIA DA PÁGINA do Puppeteer
const userPages = {};

class WhatsAppClient {
    constructor() {
        this.client = new Client({ authStrategy: new LocalAuth() });
        this.registerEvents();
    }

    registerEvents() {
        this.client.on('qr', (qr) => {
            qrcode.generate(qr, { small: true });
            console.log('Escaneie o QR code com o WhatsApp!');
        });

        this.client.on('ready', () => {
            console.log('🤖 Bot está pronto!');
        });
    }

    onMessage(handler) {
        this.client.on('message', handler);
    }

    sendMessage(to, message) {
        return this.client.sendMessage(to, message);
    }

    initialize() {
        this.client.initialize();
    }
}

/**
 * Função para preencher o formulário de Imóvel (IPTU)
 * @param {string} codigoCadastro O código de cadastro do imóvel.
 * @returns {Promise<puppeteer.Page>} Retorna a instância da página após o login.
 */
async function preencherImovel(codigoCadastro) {
    // Definindo a URL do site como uma variável, para facilitar a manutenção
    const siteUrl = 'http://nfse.corumba.ms.gov.br:8080/servicosweb/home.jsf';
    const browser = await puppeteer.launch({ headless: false }); // Abrir navegador visível para debug
    const page = await browser.newPage();

    await page.goto(siteUrl);

    const iptuButtonSelector = '#formHome\\:j_idt1062\\:0\\:j_idt1064';
    await page.waitForSelector(iptuButtonSelector);
    await page.click(iptuButtonSelector);
    console.log('Clicou no botão IPTU (IMOBILIÁRIO).');

    const modalImovelSelector = '#compInformarImovel\\:j_idt80';
    await page.waitForSelector(modalImovelSelector, { visible: true });
    console.log('Modal "Informe os dados do imóvel" apareceu.');

    const inputImovelSelector = '#compInformarImovel\\:formNumero\\:itIdentText';
    await page.waitForSelector(inputImovelSelector, { visible: true });
    console.log('Campo de Código de Cadastro visível.');

    await page.type(inputImovelSelector, codigoCadastro);
    console.log(`Preencheu o campo com: ${codigoCadastro}`);

    const okButtonImovelSelector = '#compInformarImovel\\:formNumero\\:btnValidar';
    await page.waitForSelector(okButtonImovelSelector, { visible: true });
    await page.click(okButtonImovelSelector);
    console.log('Clicou no botão OK do modal de Imóvel.');

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('Navegação após login de IPTU concluída.');

    return page; // Retorna a página para interações futuras
}

/**
 * Função para preencher o formulário de Contribuinte (CPF)
 * @param {string} cpf O número do CPF.
 * @returns {Promise<puppeteer.Page>} Retorna a instância da página após o login.
 */
async function preencherContribuinte(cpf) {
    const siteUrl = 'http://nfse.corumba.ms.gov.br:8080/servicosweb/home.jsf';
    const browser = await puppeteer.launch({ headless: false }); // Abrir navegador visível para debug
    const page = await browser.newPage();

    await page.goto(siteUrl);

    const contribuinteButtonSelector = '#formHome\\:j_idt1062\\:3\\:j_idt1064';
    await page.waitForSelector(contribuinteButtonSelector);
    await page.click(contribuinteButtonSelector);
    console.log('Clicou no botão Contribuinte\\TRS.');

    const formContribuinteSelector = '#compInformarContribuinte\\:formNumero';
    await page.waitForSelector(formContribuinteSelector, { visible: true });
    console.log('Formulário de Contribuinte apareceu (dentro do modal).');

    const radioPessoaFisicaSelector = '#compInformarContribuinte\\:formNumero\\:radioCadastroTipoPessoa\\:0';
    const isChecked = await page.$eval(radioPessoaFisicaSelector, el => el.checked);
    if (!isChecked) {
        await page.click(radioPessoaFisicaSelector);
        console.log('Clicou no rádio button "Pessoa Física".');
        await page.waitForTimeout(500); // Pequeno atraso
    } else {
        console.log('Rádio button "Pessoa Física" já selecionado.');
    }

    const inputContribuinteSelector = '#compInformarContribuinte\\:formNumero\\:itIdent';
    await page.waitForSelector(inputContribuinteSelector, { visible: true });
    console.log('Campo de CPF/CNPJ visível.');

    await page.type(inputContribuinteSelector, cpf);
    console.log(`Preencheu o campo com: ${cpf}`);

    const okButtonContribuinteSelector = '#compInformarContribuinte\\:formNumero\\:btnValidar';
    await page.waitForSelector(okButtonContribuinteSelector, { visible: true });
    await page.click(okButtonContribuinteSelector);
    console.log('Clicou no botão OK do modal de Contribuinte.');

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('Navegação após login de Contribuinte concluída.');

    return page; // Retorna a página para interações futuras
}

/**
 * Função para interagir com as opções pós-login de contribuinte
 * @param {string} option A opção escolhida pelo usuário (1 ou 2).
 * @param {puppeteer.Page} page A instância da página do Puppeteer.
 * @param {string} chatId O ID do chat para enviar o PDF.
 */
async function lidarOpcoesContribuinte(option, page, chatId) {
    let messageToUser = '';
    try {
        if (option === '1') {
            // Seu código atual para opção 1 (Débitos em Aberto)
            const debitosAbertoSelector = '#formContribuinte\\:repeat\\:0\\:clLinkImobiliario';
            await page.waitForSelector(debitosAbertoSelector, { visible: true });
            await page.click(debitosAbertoSelector);
            console.log('Clicou em "DÉBITOS EM ABERTO".');
            messageToUser = 'Clicou em "DÉBITOS EM ABERTO". Agora você pode interagir com essa tela no navegador.';
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            console.log('Navegação para Débitos em Aberto concluída.');
        } else if (option === '2') {
            // Opção Certidão Negativa - capturando PDF da nova aba via resposta da rede
            const certidaoNegativaSelector = '#formContribuinte\\:repeat\\:1\\:clLinkImobiliario';
            await page.waitForSelector(certidaoNegativaSelector, { visible: true });
            await page.click(certidaoNegativaSelector);
            console.log('Clicou em "CERTIDÃO NEGATIVA DE DÉBITOS".');

            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            console.log('Navegação para tela de Certidão Negativa de Débitos concluída.');

            const imprimirCertidaoButtonSelector = '#formCertidaoNegativaDebitos\\:tabView\\:j_idt396\\:j_idt443';
            await page.waitForSelector(imprimirCertidaoButtonSelector, { visible: true });
            console.log('Botão "Imprimir Certidão" visível.');

            // Captura a nova aba que abre o PDF
            const [pdfPage] = await Promise.all([
                new Promise(resolve => page.browser().once('targetcreated', async target => {
                    if (target.type() === 'page') {
                        const newPage = await target.page();
                        await newPage.bringToFront();
                        resolve(newPage);
                    }
                })),
                page.click(imprimirCertidaoButtonSelector)
            ]);

            if (pdfPage) {
                console.log('Nova aba para o PDF detectada.');

                // Escuta as respostas para capturar o PDF
                const pdfBuffer = await new Promise(async (resolve, reject) => {
                    pdfPage.on('response', async (response) => {
                        const headers = response.headers();
                        if (headers['content-type'] && headers['content-type'].includes('application/pdf')) {
                            try {
                                const buffer = await response.buffer();
                                resolve(buffer);
                            } catch (err) {
                                reject(err);
                            }
                        }
                    });

                    // Timeout caso não receba o PDF em x segundos
                    setTimeout(() => reject(new Error('Timeout esperando o PDF')), 10000);
                });

                const pdfPath = `./certidao_${Date.now()}.pdf`;
                fs.writeFileSync(pdfPath, pdfBuffer);
                console.log(`PDF salvo em: ${pdfPath}`);

                await pdfPage.close();
                console.log('Aba do PDF fechada.');

                try {
                    const media = MessageMedia.fromFilePath(pdfPath);
                    await bot.client.sendMessage(chatId, media, { caption: 'Sua certidão negativa de débitos está aqui!' });
                    messageToUser = '✅ Sua certidão negativa de débitos foi gerada e enviada para você!';
                } catch (sendError) {
                    console.error('Erro ao enviar o PDF pelo WhatsApp:', sendError);
                    messageToUser = '❌ Ocorreu um erro ao enviar a certidão pelo WhatsApp.';
                } finally {
                    fs.unlinkSync(pdfPath);
                    console.log('Arquivo PDF local deletado.');
                }
            } else {
                messageToUser = '❌ Não foi possível gerar ou encontrar a certidão PDF.';
                console.error('Não foi possível obter a instância da nova página do PDF.');
            }

        } else {
            messageToUser = 'Opção inválida. Por favor, digite "1" para "Débitos em Aberto" ou "2" para "Certidão Negativa de Débitos".';
        }
    } catch (error) {
        console.error('Erro ao lidar com as opções de contribuinte:', error);
        messageToUser = '❌ Ocorreu um erro ao tentar acessar a opção. Por favor, tente novamente.';
    }
    return messageToUser;
}


const bot = new WhatsAppClient();

bot.onMessage(async message => {
    const chatId = message.from;
    const text = message.body.trim().toLowerCase();

    if (!userStates[chatId]) {
        await bot.sendMessage(chatId,
            'Olá! Por qual tipo de dado você gostaria de acessar?\n' +
            '1. Código de Cadastro (IPTU)\n' +
            '2. CPF (Contribuinte)'
        );
        userStates[chatId] = 'awaiting_option';
        return;
    }

    if (userStates[chatId] === 'awaiting_option') {
        if (text === '1' || text.includes('iptu') || text.includes('cadastro')) {
            await bot.sendMessage(chatId, 'Certo! Por favor, informe o Código de Cadastro do imóvel.');
            userStates[chatId] = 'awaiting_iptu_code';
        } else if (text === '2' || text.includes('cpf') || text.includes('contribuinte')) {
            await bot.sendMessage(chatId, 'Ok! Por favor, informe o número do seu CPF (somente números).');
            userStates[chatId] = 'awaiting_cpf';
        } else {
            await bot.sendMessage(chatId, 'Opção inválida. Por favor, digite "1" para Código de Cadastro ou "2" para CPF.');
        }
        return;
    }

    if (userStates[chatId] === 'awaiting_iptu_code') {
        const codigoCadastro = message.body.trim();
        await bot.sendMessage(chatId, `Recebi o código: ${codigoCadastro}. Tentando preencher o site para IPTU...`);
        try {
            const page = await preencherImovel(codigoCadastro);
            userPages[chatId] = page;
            userStates[chatId] = 'logged_in_iptu';
            await bot.sendMessage(chatId, '✅ Código de cadastro preenchido no site com sucesso para IPTU! Você está logado no ambiente de IPTU.');
        } catch (error) {
            console.error('Erro ao preencher o site (IPTU):', error);
            await bot.sendMessage(chatId, '❌ Erro ao preencher o código de cadastro no site para IPTU. Por favor, verifique o console do servidor para mais detalhes.');
            delete userStates[chatId];
            if (userPages[chatId]) {
                await userPages[chatId].browser().close();
                delete userPages[chatId];
            }
        }
        return;
    }

    if (userStates[chatId] === 'awaiting_cpf') {
        const cpf = message.body.trim();
        if (!/^\d{11}$/.test(cpf)) {
            await bot.sendMessage(chatId, 'CPF inválido. Por favor, digite apenas os 11 números do CPF.');
            return;
        }
        await bot.sendMessage(chatId, `Recebi o CPF: ${cpf}. Tentando preencher o site para Contribuinte...`);
        try {
            const page = await preencherContribuinte(cpf);
            userPages[chatId] = page;
            userStates[chatId] = 'awaiting_contribuinte_option';
            await bot.sendMessage(chatId,
                '✅ CPF preenchido no site com sucesso para Contribuinte! Por favor, escolha uma opção:\n' +
                '1. Débitos em Aberto\n' +
                '2. Certidão Negativa de Débitos'
            );
        } catch (error) {
            console.error('Erro ao preencher o site (CPF):', error);
            await bot.sendMessage(chatId, '❌ Erro ao preencher o CPF no site para Contribuinte. Por favor, verifique o console do servidor para mais detalhes.');
            delete userStates[chatId];
            if (userPages[chatId]) {
                await userPages[chatId].browser().close();
                delete userPages[chatId];
            }
        }
        return;
    }

    if (userStates[chatId] === 'awaiting_contribuinte_option') {
        const option = text;
        if (userPages[chatId]) {
            const page = userPages[chatId];
            const responseMessage = await lidarOpcoesContribuinte(option, page, chatId);
            await bot.sendMessage(chatId, responseMessage);

            if (option === '2') {
                if (userPages[chatId]) {
                    await userPages[chatId].browser().close();
                    delete userPages[chatId];
                }
                delete userStates[chatId];
            } else {
                delete userStates[chatId];
            }

        } else {
            await bot.sendMessage(chatId, '❌ Parece que a sessão do navegador foi perdida. Por favor, comece novamente.');
            delete userStates[chatId];
        }
        return;
    }

    if (userStates[chatId]) {
        await bot.sendMessage(chatId, 'Não entendi. Por favor, siga as instruções ou digite "reset" para recomeçar.');
        if (text === 'reset') {
            delete userStates[chatId];
            if (userPages[chatId]) {
                await userPages[chatId].browser().close();
                delete userPages[chatId];
            }
            await bot.sendMessage(chatId, 'Sessão resetada. Por favor, comece novamente.');
        }
    } else {
        await bot.sendMessage(chatId, 'Bem-vindo! Digite qualquer coisa para começar e escolher uma opção de login.');
    }
});

bot.initialize();