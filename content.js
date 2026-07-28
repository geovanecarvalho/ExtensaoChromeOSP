// ============================================
// AUTOMAÇÃO DE CADASTRO DE SERVIÇOS/MATERIAIS
// ============================================

(function() {
    'use strict';
    
    console.log('🤖 Automação de Serviços/Materiais carregada!');
    
    // ===== CONFIGURAÇÕES =====
    const CONFIG = {
        mapeamento: {
            'ID': 'id',
            'PRANCHA': 'prancha',
            'CLASSE': 'classe',
            'MARACODE': 'maraCode',
            'ITEM': 'item',
            'QTD SERVICO EXECUTADO': 'qtdServico',
            'PESQUISA MATERIAL': 'pesquisaMaterial',
            'MATERIAL': 'material',
            'QTD MATERIAL': 'qtdMaterial',
            'LOCAL EXECUCAO OBRA': 'localObra'
        },
        
        xpaths: {
            menuCollapse: '//span[@id="ott-sidebar-collapse"]',
            linkListaRequisicoes: '//a[@routerlink="/requisicoes-eps"]',
            inputFiltroId: '//input[@id="filtroId"]',
            btnBuscar: '//a[contains(@class, "btn-primary") and contains(text(), "Buscar")]',
            btnEditar: '//a[contains(@title, "Editar Requisição")]',
            btnServico: '//a[contains(@title, "Serviços")]',
            abaMedicaoCampo: '//a[@role="tab" and contains(text(), "Medição de Campo")]',
            btnInserirMedicao: '//button[contains(text(), "Inserir Medição de Campo")]',
            inputPrancha: '//input[@id="demPrancha"]',
            selectClasse: '//select[@id="demClasse"]',
            inputMaraCode: '//input[@placeholder="Mara Code"]',
            selectItem: '//select[@id="maraCode"]',
            inputQtdServico: '//input[@id="qtdServicoExecutado"]',
            inputPesquisaMaterial: '//input[@placeholder="Material"]',
            selectMaterial: '//select[@id="matCode"]',
            inputQtdMaterial: '//input[@id="qtdMaterial"]',
            inputLocalObra: '//input[@id="localObra"]'
        },
        
        delayEntreCadastros: 4000,
        delayPreenchimento: 500,
        delayAposBusca: 3000,
        delayAposClick: 1500,
        delayAposNavegacao: 3000,
        delayAposSalvar: 4000,
        delayAposEnter: 1000,
        delayAposFechar: 1000,
        modoTeste: false
    };
    
    let dadosParaCadastrar = [];
    let cadastroAtual = 0;
    let estaExecutando = false;
    let podeParar = false;
    let log = [];
    let popupAberto = false;
    
    // ===== FUNÇÕES AUXILIARES =====
    
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    function waitForElement(selector, timeout = 15000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            function findElement() {
                let element = null;
                
                try {
                    const result = document.evaluate(
                        selector,
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                    element = result.singleNodeValue;
                } catch (e) {}
                
                if (!element && !selector.startsWith('//')) {
                    try {
                        element = document.querySelector(selector);
                    } catch (e) {}
                }
                
                if (element && element.offsetParent !== null && element.offsetWidth > 0) {
                    resolve(element);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    resolve(null);
                    return;
                }
                
                setTimeout(findElement, 300);
            }
            
            findElement();
        });
    }
    
    async function waitForIdField() {
        console.log('⏳ Aguardando campo ID ficar disponível...');
        
        let tentativas = 0;
        const maxTentativas = 30;
        
        while (tentativas < maxTentativas) {
            let inputId = null;
            try {
                const result = document.evaluate(
                    '//input[@id="filtroId"]',
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                inputId = result.singleNodeValue;
            } catch (e) {}
            
            if (!inputId) {
                inputId = document.querySelector('#filtroId');
            }
            
            if (inputId) {
                const isVisible = inputId.offsetParent !== null && inputId.offsetWidth > 0;
                if (isVisible) {
                    console.log('✅ Campo ID encontrado e visível!');
                    return inputId;
                }
            }
            
            tentativas++;
            await wait(500);
        }
        
        return null;
    }
    
    async function clickElement(element, descricao = '') {
        if (!element) {
            addLog(`❌ Elemento não encontrado: ${descricao}`, 'error');
            return false;
        }
        try {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await wait(500);
            
            try {
                element.click();
            } catch (e) {
                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(event);
            }
            
            addLog(`✅ Clicou em: ${descricao}`, 'success');
            await wait(CONFIG.delayAposClick);
            return true;
        } catch (e) {
            addLog(`❌ Erro ao clicar em ${descricao}: ${e.message}`, 'error');
            return false;
        }
    }
    
    async function preencherCampo(elemento, valor, descricao = '') {
        if (!elemento) {
            addLog(`⚠️ Campo não encontrado: ${descricao}`, 'warning');
            return false;
        }
        if (valor === undefined || valor === null || valor === '') {
            addLog(`⏭️ Campo vazio: ${descricao}`, 'info');
            return true;
        }
        try {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await wait(300);
            
            if (elemento.tagName === 'SELECT') {
                const valorStr = String(valor).trim();
                let encontrado = false;
                for (let i = 0; i < elemento.options.length; i++) {
                    const option = elemento.options[i];
                    if (option.text.includes(valorStr) || option.value === valorStr) {
                        elemento.selectedIndex = i;
                        encontrado = true;
                        break;
                    }
                }
                if (!encontrado && valorStr) {
                    const newOption = document.createElement('option');
                    newOption.value = valorStr;
                    newOption.text = valorStr;
                    elemento.appendChild(newOption);
                    elemento.value = valorStr;
                }
                const event = new Event('change', { bubbles: true });
                elemento.dispatchEvent(event);
                addLog(`✅ Preencheu select: ${descricao} = ${valor}`, 'success');
                return true;
            } else if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
                elemento.value = '';
                elemento.focus();
                await wait(200);
                
                const chars = String(valor).split('');
                for (let i = 0; i < chars.length; i++) {
                    elemento.value += chars[i];
                    const event = new Event('input', { bubbles: true });
                    elemento.dispatchEvent(event);
                    await wait(50);
                }
                
                elemento.blur();
                await wait(200);
                
                ['change', 'blur'].forEach(eventType => {
                    const event = new Event(eventType, { bubbles: true });
                    elemento.dispatchEvent(event);
                });
                
                addLog(`✅ Preencheu campo: ${descricao} = ${valor}`, 'success');
                return true;
            }
            return false;
        } catch (e) {
            addLog(`❌ Erro ao preencher ${descricao}: ${e.message}`, 'error');
            return false;
        }
    }
    
    async function preencherId(inputId, valor) {
        if (!inputId) {
            addLog('❌ Elemento ID é nulo', 'error');
            return false;
        }
        
        if (valor === undefined || valor === null || valor === '') {
            addLog(`⚠️ Valor do ID é inválido: "${valor}"`, 'warning');
            return false;
        }
        
        addLog(`🔢 Tentando preencher ID: ${valor}`, 'info');
        
        const estrategias = [
            async () => {
                inputId.focus();
                await wait(300);
                inputId.value = '';
                inputId.value = String(valor);
                inputId.dispatchEvent(new Event('input', { bubbles: true }));
                inputId.dispatchEvent(new Event('change', { bubbles: true }));
                inputId.blur();
                return inputId.value === String(valor);
            },
            async () => {
                inputId.click();
                await wait(200);
                inputId.value = String(valor);
                inputId.dispatchEvent(new Event('change', { bubbles: true }));
                return inputId.value === String(valor);
            },
            async () => {
                inputId.value = String(valor);
                const event = new Event('change', { bubbles: true });
                inputId.dispatchEvent(event);
                return inputId.value === String(valor);
            }
        ];
        
        for (let i = 0; i < estrategias.length; i++) {
            try {
                const success = await estrategias[i]();
                if (success) {
                    addLog(`✅ ID preenchido com sucesso: ${valor} (estratégia ${i + 1})`, 'success');
                    return true;
                }
            } catch (e) {
                addLog(`⚠️ Estratégia ${i + 1} falhou: ${e.message}`, 'warning');
            }
            await wait(200);
        }
        
        if (inputId.value === String(valor)) {
            addLog(`✅ ID preenchido (verificação final): ${valor}`, 'success');
            return true;
        }
        
        addLog(`❌ Falha ao preencher ID. Valor atual: "${inputId.value}"`, 'error');
        return false;
    }
    
    // ===== FUNÇÃO PARA PRESSIONAR ENTER EM UM CAMPO =====
    async function pressionarEnter(elemento, descricao = '') {
        if (!elemento) {
            addLog(`⚠️ Elemento não encontrado para pressionar Enter: ${descricao}`, 'warning');
            return false;
        }
        
        try {
            elemento.focus();
            await wait(200);
            
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            elemento.dispatchEvent(enterEvent);
            
            const keyupEvent = new KeyboardEvent('keyup', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
            });
            elemento.dispatchEvent(keyupEvent);
            
            addLog(`✅ Enter pressionado em: ${descricao}`, 'success');
            await wait(CONFIG.delayAposEnter);
            return true;
        } catch (e) {
            addLog(`❌ Erro ao pressionar Enter em ${descricao}: ${e.message}`, 'error');
            return false;
        }
    }
    
    function detectarColunas(data) {
        if (!data || data.length === 0) {
            return null;
        }
        
        const headers = Object.keys(data[0]);
        addLog(`📋 Colunas encontradas no Excel: ${headers.join(', ')}`, 'info');
        
        const mapeamento = {};
        const colunasEsperadas = {
            'ID': ['id', 'Id', 'ID', 'Codigo', 'Código', 'Cod', 'NUMERO', 'Numero'],
            'PRANCHA': ['prancha', 'Prancha', 'PRANCHA'],
            'CLASSE': ['classe', 'Classe', 'CLASSE'],
            'MARACODE': ['maracode', 'MaraCode', 'MARACODE', 'mara code'],
            'ITEM': ['item', 'Item', 'ITEM'],
            'QTD SERVICO EXECUTADO': ['qtd servico executado', 'Qtd Servico Executado', 'servico executado'],
            'PESQUISA MATERIAL': ['pesquisa material', 'Pesquisa Material', 'material pesquisa'],
            'MATERIAL': ['material', 'Material', 'MATERIAL'],
            'QTD MATERIAL': ['qtd material', 'Qtd Material', 'quantidade material'],
            'LOCAL EXECUCAO OBRA': ['local execucao obra', 'Local Execucao Obra', 'local obra']
        };
        
        for (const [campo, variacoes] of Object.entries(colunasEsperadas)) {
            let encontrado = false;
            for (const variacao of variacoes) {
                const chave = headers.find(h => 
                    h.toLowerCase().trim() === variacao.toLowerCase().trim()
                );
                if (chave) {
                    mapeamento[campo] = chave;
                    encontrado = true;
                    addLog(`✅ Mapeou "${campo}" -> coluna "${chave}"`, 'success');
                    break;
                }
            }
            if (!encontrado) {
                for (const header of headers) {
                    const headerLower = header.toLowerCase().trim();
                    for (const variacao of variacoes) {
                        if (headerLower.includes(variacao.toLowerCase().trim()) || 
                            variacao.toLowerCase().trim().includes(headerLower)) {
                            mapeamento[campo] = header;
                            encontrado = true;
                            addLog(`✅ Mapeou "${campo}" -> coluna "${header}" (similar)`, 'success');
                            break;
                        }
                    }
                    if (encontrado) break;
                }
            }
        }
        
        if (!mapeamento['ID'] && headers.length > 0) {
            mapeamento['ID'] = headers[0];
            addLog(`⚠️ Usando primeira coluna como ID: "${headers[0]}"`, 'warning');
        }
        
        addLog(`📊 Mapeamento final: ${JSON.stringify(mapeamento, null, 2)}`, 'info');
        return mapeamento;
    }
    
    function addLog(mensagem, tipo = 'info') {
        const entry = {
            timestamp: new Date().toLocaleTimeString(),
            mensagem,
            tipo
        };
        log.push(entry);
        console.log(`[${entry.timestamp}] ${mensagem}`);
        
        const logContainer = document.getElementById('auto-log');
        if (logContainer) {
            const div = document.createElement('div');
            div.className = `log-entry log-${tipo}`;
            div.textContent = `[${entry.timestamp}] ${mensagem}`;
            logContainer.appendChild(div);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        
        const status = document.getElementById('auto-status');
        if (status) {
            status.textContent = mensagem;
        }
    }
    
    async function executarCadastro(dados, index) {
        const idValue = dados['ID'] || dados['id'] || dados['Id'];
        
        if (idValue === undefined || idValue === null || idValue === '') {
            addLog(`❌ Registro ${index + 1} sem ID! Pulando...`, 'error');
            return { sucesso: false, erro: 'ID vazio', pulado: true };
        }
        
        addLog(`📝 Iniciando cadastro do ID: ${idValue}`, 'info');
        
        try {
            // ============================================
            // PASSO 1: CLICAR NO COLLAPSE (MENU)
            // ============================================
            addLog('🔍 Passo 1: Abrindo menu (collapse)...', 'info');
            const menuElement = await waitForElement('//span[@id="ott-sidebar-collapse"]');
            if (!await clickElement(menuElement, 'Menu Collapse')) {
                return { sucesso: false, erro: 'Menu Collapse não encontrado' };
            }
            await wait(500);
            
            // ============================================
            // PASSO 2: CLICAR NO LINK LISTA REQUISIÇÕES EPS
            // ============================================
            addLog('🔍 Passo 2: Navegando para Lista Requisições EPS...', 'info');
            const listaElement = await waitForElement('//a[@routerlink="/requisicoes-eps"]');
            if (!await clickElement(listaElement, 'Link Lista Requisições EPS')) {
                return { sucesso: false, erro: 'Link Lista Requisições EPS não encontrado' };
            }
            
            addLog('⏳ Aguardando carregamento da página de requisições...', 'info');
            await wait(CONFIG.delayAposNavegacao);
            
            // ============================================
            // PASSO 3: PREENCHER ID
            // ============================================
            addLog(`🔍 Passo 3: Buscando e preenchendo ID ${idValue}...`, 'info');
            
            const inputId = await waitForIdField();
            
            if (!inputId) {
                const inputIdFallback = document.querySelector('#filtroId');
                if (inputIdFallback) {
                    const preenchido = await preencherId(inputIdFallback, idValue);
                    if (!preenchido) {
                        return { sucesso: false, erro: 'Falha ao preencher ID' };
                    }
                } else {
                    return { sucesso: false, erro: 'Campo ID não encontrado' };
                }
            } else {
                const preenchido = await preencherId(inputId, idValue);
                if (!preenchido) {
                    return { sucesso: false, erro: 'Falha ao preencher ID' };
                }
            }
            
            // ============================================
            // PASSO 4: BUSCAR
            // ============================================
            addLog('🔍 Passo 4: Buscando requisição...', 'info');
            const btnBuscar = await waitForElement('//a[contains(@class, "btn-primary") and contains(text(), "Buscar")]');
            if (!btnBuscar) {
                const btnBuscarCSS = document.querySelector('.btn-primary.btn-sm.btn-block');
                if (btnBuscarCSS) {
                    await clickElement(btnBuscarCSS, 'Botão Buscar (CSS)');
                } else {
                    return { sucesso: false, erro: 'Botão Buscar não encontrado' };
                }
            } else {
                await clickElement(btnBuscar, 'Botão Buscar');
            }
            
            await wait(CONFIG.delayAposBusca);
            
            // ============================================
            // PASSO 5: EDITAR
            // ============================================
            addLog('🔍 Passo 5: Verificando botão Editar...', 'info');
            const btnEditar = await waitForElement('//a[contains(@title, "Editar Requisição")]', 5000);
            
            if (!btnEditar) {
                const btnEditarCSS = document.querySelector('a[title="Editar Requisição"]');
                if (btnEditarCSS) {
                    await clickElement(btnEditarCSS, 'Botão Editar');
                } else {
                    addLog(`⚠️ ID ${idValue} não possui botão Editar. Pulando...`, 'warning');
                    return { sucesso: false, erro: 'Sem botão Editar', pulado: true };
                }
            } else {
                await clickElement(btnEditar, 'Botão Editar');
            }
            
            // ============================================
            // PASSO 6: SERVIÇOS
            // ============================================
            addLog('🔍 Passo 6: Acessando serviços...', 'info');
            const btnServico = await waitForElement('//a[contains(@title, "Serviços")]');
            if (!btnServico) {
                const btnServicoCSS = document.querySelector('a[title="Serviços"]');
                if (btnServicoCSS) {
                    await clickElement(btnServicoCSS, 'Botão Serviço (CSS)');
                } else {
                    return { sucesso: false, erro: 'Botão Serviço não encontrado' };
                }
            } else {
                await clickElement(btnServico, 'Botão Serviço');
            }
            
            // ============================================
            // PASSO 7: ABA MEDIÇÃO
            // ============================================
            addLog('🔍 Passo 7: Abrindo Medição de Campo...', 'info');
            const abaMedicao = await waitForElement('//a[@role="tab" and contains(text(), "Medição de Campo")]');
            if (!abaMedicao) {
                const todasAbas = document.querySelectorAll('a[role="tab"]');
                let abaEncontrada = null;
                for (const aba of todasAbas) {
                    if (aba.textContent.includes('Medição de Campo')) {
                        abaEncontrada = aba;
                        break;
                    }
                }
                if (abaEncontrada) {
                    await clickElement(abaEncontrada, 'Aba Medição (texto)');
                } else {
                    return { sucesso: false, erro: 'Aba Medição de Campo não encontrada' };
                }
            } else {
                await clickElement(abaMedicao, 'Aba Medição de Campo');
            }
            
            // ============================================
            // PASSO 8: INSERIR MEDIÇÃO
            // ============================================
            addLog('🔍 Passo 8: Inserindo medição...', 'info');
            const btnInserir = await waitForElement('//button[contains(text(), "Inserir Medição de Campo")]');
            if (!btnInserir) {
                const botoes = document.querySelectorAll('button');
                let btnEncontrado = null;
                for (const btn of botoes) {
                    if (btn.textContent.includes('Inserir Medição')) {
                        btnEncontrado = btn;
                        break;
                    }
                }
                if (btnEncontrado) {
                    await clickElement(btnEncontrado, 'Botão Inserir (texto)');
                } else {
                    return { sucesso: false, erro: 'Botão Inserir Medição não encontrado' };
                }
            } else {
                await clickElement(btnInserir, 'Botão Inserir Medição');
            }
            
            await wait(1000);
            
            // ============================================
            // PASSO 9: PREENCHER FORMULÁRIO
            // ============================================
            addLog('✏️ Passo 9: Preenchendo formulário...', 'info');
            
            const prancha = dados['PRANCHA'] || dados['Prancha'] || '';
            const classe = dados['CLASSE'] || dados['Classe'] || '';
            const maraCode = dados['MARACODE'] || dados['MaraCode'] || '';
            const item = dados['ITEM'] || dados['Item'] || '';
            const qtdServico = dados['QTD SERVICO EXECUTADO'] || dados['Qtd Servico Executado'] || '';
            const pesquisaMaterial = dados['PESQUISA MATERIAL'] || dados['Pesquisa Material'] || '';
            const qtdMaterial = dados['QTD MATERIAL'] || dados['Qtd Material'] || '';
            const localObra = dados['LOCAL EXECUCAO OBRA'] || dados['Local Execucao Obra'] || '';
            
            const itemVazio = !item || item === '' || item === null || item === undefined;
            
            if (itemVazio) {
                addLog(`⚠️ Campo ITEM vazio! Ignorando campos de PESQUISA MATERIAL e QTD MATERIAL`, 'warning');
            }
            
            // Prancha
            const inputPrancha = await waitForElement('//input[@id="demPrancha"]');
            await preencherCampo(inputPrancha, prancha, 'Prancha');
            
            // Classe
            const selectClasse = await waitForElement('//select[@id="demClasse"]');
            await preencherCampo(selectClasse, classe, 'Classe');
            
            // MaraCode com Enter
            const inputMaraCode = await waitForElement('//input[@placeholder="Mara Code"]');
            if (inputMaraCode && maraCode) {
                addLog(`✏️ Preenchendo MaraCode: ${maraCode}`, 'info');
                
                inputMaraCode.value = '';
                inputMaraCode.focus();
                await wait(300);
                
                const chars = String(maraCode).split('');
                for (let i = 0; i < chars.length; i++) {
                    inputMaraCode.value += chars[i];
                    inputMaraCode.dispatchEvent(new Event('input', { bubbles: true }));
                    await wait(50);
                }
                
                inputMaraCode.dispatchEvent(new Event('change', { bubbles: true }));
                await wait(300);
                
                addLog(`⌨️ Pressionando Enter para confirmar MaraCode: ${maraCode}`, 'info');
                await pressionarEnter(inputMaraCode, 'MaraCode');
                
                addLog(`✅ MaraCode "${maraCode}" preenchido e confirmado com Enter`, 'success');
            } else {
                addLog(`⏭️ MaraCode vazio, pulando...`, 'info');
            }
            
            // Item
            const selectItem = await waitForElement('//select[@id="maraCode"]');
            await preencherCampo(selectItem, item, 'Item');
            
            // Qtd Serviço
            const inputQtdServico = await waitForElement('//input[@id="qtdServicoExecutado"]');
            await preencherCampo(inputQtdServico, qtdServico, 'Qtd Serviço');
            
            // ============================================
            // PESQUISA MATERIAL - COM ENTER
            // ============================================
            if (!itemVazio && pesquisaMaterial) {
                const inputPesquisa = await waitForElement('//input[@placeholder="Material"]');
                if (inputPesquisa) {
                    addLog(`✏️ Preenchendo Pesquisa Material: ${pesquisaMaterial}`, 'info');
                    
                    inputPesquisa.value = '';
                    inputPesquisa.focus();
                    await wait(300);
                    
                    const chars = String(pesquisaMaterial).split('');
                    for (let i = 0; i < chars.length; i++) {
                        inputPesquisa.value += chars[i];
                        inputPesquisa.dispatchEvent(new Event('input', { bubbles: true }));
                        await wait(50);
                    }
                    
                    inputPesquisa.dispatchEvent(new Event('change', { bubbles: true }));
                    await wait(300);
                    
                    // PRESSIONA ENTER NA PESQUISA MATERIAL
                    addLog(`⌨️ Pressionando Enter para pesquisar material: ${pesquisaMaterial}`, 'info');
                    await pressionarEnter(inputPesquisa, 'Pesquisa Material');
                    
                    addLog(`✅ Pesquisa Material "${pesquisaMaterial}" preenchida e confirmada com Enter`, 'success');
                }
            } else {
                addLog(`⏭️ Pesquisa Material vazia ou ITEM vazio, pulando...`, 'info');
            }
            
            // ============================================
            // MATERIAL - IGNORADO (NÃO PREENCHE)
            // ============================================
            addLog(`⏭️ Campo MATERIAL ignorado (não será preenchido)`, 'info');
            
            // ============================================
            // QTD MATERIAL (somente se ITEM não estiver vazio)
            // ============================================
            if (!itemVazio && qtdMaterial) {
                const inputQtdMaterial = await waitForElement('//input[@id="qtdMaterial"]');
                await preencherCampo(inputQtdMaterial, qtdMaterial, 'Qtd Material');
            } else {
                addLog(`⏭️ Qtd Material vazio ou ITEM vazio, pulando...`, 'info');
            }
            
            // Local Obra
            const inputLocalObra = await waitForElement('//input[@id="localObra"]');
            await preencherCampo(inputLocalObra, localObra, 'Local Obra');
            
            // ============================================
            // PASSO 10: SALVAR MEDIÇÃO E FECHAR
            // ============================================
            if (!CONFIG.modoTeste) {
                addLog('💾 Passo 10: Salvando medição...', 'info');
                
                let btnSalvar = null;
                
                // Procura botão Salvar
                btnSalvar = document.querySelector('button.btn.btn-primary.mt-4.float-right');
                if (!btnSalvar) {
                    btnSalvar = document.querySelector('button[type="submit"].btn-primary.float-right');
                }
                if (!btnSalvar) {
                    const botoes = document.querySelectorAll('button');
                    for (const btn of botoes) {
                        if (btn.textContent.trim() === 'Salvar Medição') {
                            btnSalvar = btn;
                            break;
                        }
                    }
                }
                if (!btnSalvar) {
                    try {
                        const result = document.evaluate(
                            '//button[@type="submit" and contains(text(), "Salvar Medição")]',
                            document,
                            null,
                            XPathResult.FIRST_ORDERED_NODE_TYPE,
                            null
                        );
                        btnSalvar = result.singleNodeValue;
                    } catch (e) {}
                }
                
                if (btnSalvar) {
                    btnSalvar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await wait(500);
                    
                    try {
                        btnSalvar.click();
                        addLog('✅ Botão Salvar Medição clicado com sucesso!', 'success');
                    } catch (e) {
                        const event = new MouseEvent('click', {
                            view: window,
                            bubbles: true,
                            cancelable: true
                        });
                        btnSalvar.dispatchEvent(event);
                        addLog('✅ Botão Salvar Medição clicado via evento!', 'success');
                    }
                    
                    addLog('⏳ Aguardando processamento do salvamento...', 'info');
                    await wait(CONFIG.delayAposSalvar);
                    
                    // ============================================
                    // CLICA NO BOTÃO FECHAR
                    // ============================================
                    addLog('🔍 Procurando botão Fechar...', 'info');
                    
                    let btnFechar = null;
                    
                    btnFechar = document.querySelector('button.btn.btn-secondary.mt-4.float-left');
                    if (!btnFechar) {
                        const botoes = document.querySelectorAll('button');
                        for (const btn of botoes) {
                            if (btn.textContent.trim() === 'Fechar' || btn.textContent.includes('Fechar')) {
                                btnFechar = btn;
                                break;
                            }
                        }
                    }
                    if (!btnFechar) {
                        try {
                            const result = document.evaluate(
                                '//button[contains(text(), "Fechar")]',
                                document,
                                null,
                                XPathResult.FIRST_ORDERED_NODE_TYPE,
                                null
                            );
                            btnFechar = result.singleNodeValue;
                        } catch (e) {}
                    }
                    
                    if (btnFechar) {
                        btnFechar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await wait(500);
                        
                        try {
                            btnFechar.click();
                            addLog('✅ Botão Fechar clicado com sucesso!', 'success');
                        } catch (e) {
                            const event = new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true
                            });
                            btnFechar.dispatchEvent(event);
                            addLog('✅ Botão Fechar clicado via evento!', 'success');
                        }
                        
                        await wait(CONFIG.delayAposFechar);
                    } else {
                        addLog('⚠️ Botão Fechar não encontrado! Continuando...', 'warning');
                    }
                    
                } else {
                    addLog('⚠️ Botão Salvar não encontrado! Tentando submit...', 'warning');
                    
                    const form = document.querySelector('form');
                    if (form) {
                        form.submit();
                        addLog('📤 Formulário submetido via submit()', 'info');
                        await wait(CONFIG.delayAposSalvar);
                        
                        // Tenta encontrar o Fechar após submit
                        let btnFechar = document.querySelector('button.btn.btn-secondary.mt-4.float-left');
                        if (!btnFechar) {
                            const botoes = document.querySelectorAll('button');
                            for (const btn of botoes) {
                                if (btn.textContent.trim() === 'Fechar' || btn.textContent.includes('Fechar')) {
                                    btnFechar = btn;
                                    break;
                                }
                            }
                        }
                        
                        if (btnFechar) {
                            btnFechar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            await wait(500);
                            btnFechar.click();
                            addLog('✅ Botão Fechar clicado após submit!', 'success');
                            await wait(CONFIG.delayAposFechar);
                        }
                    } else {
                        addLog('❌ Nenhum formulário encontrado para submit', 'error');
                        return { sucesso: false, erro: 'Botão Salvar não encontrado' };
                    }
                }
            } else {
                addLog('🧪 MODO TESTE: Cadastro simulado!', 'success');
                await wait(2000);
            }
            
            addLog(`✅ Cadastro do ID ${idValue} concluído!`, 'success');
            return { sucesso: true };
            
        } catch (error) {
            addLog(`❌ Erro no cadastro do ID ${idValue}: ${error.message}`, 'error');
            return { sucesso: false, erro: error.message };
        }
    }
    
    async function executarTodosCadastros() {
        if (estaExecutando) {
            addLog('⚠️ Já está executando!', 'warning');
            return;
        }
        if (dadosParaCadastrar.length === 0) {
            addLog('⚠️ Nenhum dado para cadastrar!', 'error');
            return;
        }
        
        estaExecutando = true;
        podeParar = false;
        cadastroAtual = 0;
        
        addLog(`🚀 Iniciando ${dadosParaCadastrar.length} cadastros`, 'info');
        addLog(`📋 Modo: ${CONFIG.modoTeste ? 'TESTE' : 'PRODUÇÃO'}`, 'info');
        
        const logContainer = document.getElementById('auto-log');
        if (logContainer) logContainer.innerHTML = '';
        
        let sucessos = 0, falhas = 0, pulados = 0;
        
        for (let i = 0; i < dadosParaCadastrar.length; i++) {
            if (podeParar) {
                addLog('⏹️ Automação interrompida', 'warning');
                break;
            }
            
            cadastroAtual = i + 1;
            const dados = dadosParaCadastrar[i];
            
            const idExibicao = dados['ID'] || dados['id'] || dados['Id'] || i + 1;
            addLog(`📌 Cadastro ${cadastroAtual}/${dadosParaCadastrar.length} - ID: ${idExibicao}`, 'info');
            atualizarProgresso(cadastroAtual, dadosParaCadastrar.length);
            
            try {
                const resultado = await executarCadastro(dados, i);
                if (resultado.sucesso) sucessos++;
                else if (resultado.pulado) pulados++;
                else falhas++;
            } catch (error) {
                falhas++;
                addLog(`❌ Erro: ${error.message}`, 'error');
            }
            
            if (i < dadosParaCadastrar.length - 1 && !podeParar) {
                addLog(`⏳ Aguardando ${CONFIG.delayEntreCadastros}ms antes do próximo ID...`, 'info');
                await wait(CONFIG.delayEntreCadastros);
            }
        }
        
        estaExecutando = false;
        const mensagem = `✅ Finalizado! ${sucessos} sucessos, ${falhas} falhas, ${pulados} pulados`;
        addLog(mensagem, 'success');
        
        document.getElementById('popup-btn-iniciar').disabled = false;
        document.getElementById('popup-btn-parar').disabled = true;
    }
    
    function atualizarProgresso(atual, total) {
        const progresso = document.getElementById('auto-progresso');
        if (!progresso) return;
        const percentual = Math.round((atual / total) * 100);
        progresso.style.width = `${percentual}%`;
        progresso.textContent = `${percentual}% (${atual}/${total})`;
    }
    
    // ===== CRIA O BOTÃO NA PÁGINA =====
    function criarBotaoInput() {
        const usernameSpan = document.getElementById('ott-username');
        if (!usernameSpan) {
            setTimeout(criarBotaoInput, 1000);
            return;
        }
        
        if (document.getElementById('btn-input-servico')) return;
        
        const container = document.createElement('span');
        container.className = 'input-servico-container';
        container.style.cssText = `
            display: inline-flex;
            align-items: center;
            margin-left: 12px;
            gap: 8px;
        `;
        
        const botao = document.createElement('button');
        botao.id = 'btn-input-servico';
        botao.className = 'btn-auto-import';
        botao.textContent = '📥 Input Serviço/Materiais';
        botao.title = 'Clique para abrir o painel de automação';
        botao.style.cssText = `
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white !important;
            border: none !important;
            padding: 6px 16px !important;
            border-radius: 4px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: all 0.3s ease !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3) !important;
            height: 32px !important;
            line-height: 1 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        `;
        
        botao.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-1px)';
            this.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
        });
        
        botao.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.3)';
        });
        
        botao.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            togglePopup();
        });
        
        container.appendChild(botao);
        usernameSpan.parentNode.insertBefore(container, usernameSpan.nextSibling);
        console.log('✅ Botão "Input Serviço/Materiais" adicionado!');
    }
    
    // ===== POPUP =====
    function criarPopup() {
        const popupExistente = document.getElementById('auto-popup');
        if (popupExistente) popupExistente.remove();
        
        const popup = document.createElement('div');
        popup.id = 'auto-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            min-width: 500px;
            max-width: 650px;
            max-height: 80vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            border: 1px solid #e0e0e0;
            display: none;
            flex-direction: column;
            animation: popupFadeIn 0.3s ease;
        `;
        
        popup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e9ecef;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">🔧</span>
                    <h3 style="margin: 0; color: #212529; font-size: 18px;">Automação Serviços/Materiais</h3>
                </div>
                <button id="btn-fechar-popup" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #6c757d;
                    padding: 0 8px;
                    transition: all 0.3s ease;
                    line-height: 1;
                " title="Fechar">✕</button>
            </div>
            
            <div style="margin-bottom: 12px; font-size: 13px;">
                <span class="status-indicator" id="popup-status-indicator" style="
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #28a745;
                    margin-right: 6px;
                "></span>
                <span id="popup-status-text" style="color: #495057;">Pronto para importar</span>
            </div>
            
            <div id="popup-upload-area" style="
                border: 2px dashed #dee2e6;
                border-radius: 8px;
                padding: 25px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                background: #f8f9fa;
                margin-bottom: 12px;
            ">
                <div style="font-size: 36px; margin-bottom: 6px;">📊</div>
                <div style="font-size: 14px; color: #495057;">
                    <strong>Clique para selecionar</strong> ou arraste seu Excel
                </div>
                <div style="font-size: 12px; color: #6c757d; margin-top: 4px;">
                    Suporta: .xlsx, .xls, .csv
                </div>
                <input type="file" id="popup-file-input" accept=".xlsx,.xls,.csv" style="display:none">
            </div>
            
            <div id="popup-file-info" style="
                background: #f8fff9;
                padding: 10px 15px;
                border-radius: 6px;
                border-left: 3px solid #28a745;
                display: none;
                margin-bottom: 10px;
            ">
                <div style="font-weight: 500; color: #212529;" id="popup-file-name">arquivo.xlsx</div>
                <div style="color: #6c757d; font-size: 12px;" id="popup-file-size">0 KB</div>
                <div style="margin-top: 4px; font-size: 12px; color: #6c757d;" id="popup-file-rows">0 linhas</div>
            </div>
            
            <div id="popup-preview" style="
                max-height: 120px;
                overflow-y: auto;
                background: white;
                border-radius: 6px;
                border: 1px solid #e9ecef;
                padding: 10px;
                display: none;
                margin-bottom: 10px;
            ">
                <div style="font-size: 11px; font-weight: 500; margin-bottom: 6px; color: #495057;">
                    📋 Pré-visualização (primeiras 5 linhas)
                </div>
                <div id="popup-preview-content"></div>
            </div>
            
            <div id="popup-stats" style="
                display: none;
                gap: 10px;
                padding: 10px;
                background: white;
                border-radius: 6px;
                border: 1px solid #e9ecef;
                margin-bottom: 10px;
            ">
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1; text-align: center;">
                        <div style="font-size: 18px; font-weight: 600; color: #28a745;" id="popup-total-rows">0</div>
                        <div style="font-size: 11px; color: #6c757d;">Registros</div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div style="font-size: 18px; font-weight: 600; color: #28a745;" id="popup-total-cols">0</div>
                        <div style="font-size: 11px; color: #6c757d;">Campos</div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div style="font-size: 18px; font-weight: 600; color: #17a2b8;" id="popup-status-count">⏸️</div>
                        <div style="font-size: 11px; color: #6c757d;">Status</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <div style="
                    height: 25px;
                    background-color: #e9ecef;
                    border-radius: 4px;
                    overflow: hidden;
                ">
                    <div id="auto-progresso" style="
                        width: 0%;
                        height: 100%;
                        background-color: #28a745;
                        transition: width 0.3s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 12px;
                        font-weight: bold;
                    ">0%</div>
                </div>
            </div>
            
            <div id="auto-log" style="
                flex: 1;
                overflow-y: auto;
                font-size: 11px;
                background: #f8f9fa;
                border-radius: 4px;
                padding: 8px;
                margin-bottom: 10px;
                min-height: 80px;
                max-height: 150px;
                font-family: monospace;
                border: 1px solid #e9ecef;
            ">
                <div style="color: #6c757d;">Aguardando início...</div>
            </div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                <button id="popup-btn-iniciar" style="
                    flex: 1;
                    padding: 8px 12px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.3s ease;
                " disabled>
                    ▶️ Iniciar
                </button>
                <button id="popup-btn-parar" style="
                    flex: 1;
                    padding: 8px 12px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.3s ease;
                " disabled>
                    ⏹️ Parar
                </button>
                <button id="popup-btn-limpar" style="
                    flex: 0 0 auto;
                    padding: 8px 12px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.3s ease;
                ">
                    🗑️ Limpar
                </button>
            </div>
            
            <div style="display: flex; gap: 12px; font-size: 12px; color: #6c757d; margin-bottom: 8px; align-items: center;">
                <span id="popup-info-cadastros">0 cadastros carregados</span>
                <label style="margin-left: auto; display: flex; align-items: center; gap: 4px; cursor: pointer;">
                    <input type="checkbox" id="popup-modo-teste" ${CONFIG.modoTeste ? 'checked' : ''}>
                    Modo Teste
                </label>
            </div>
            
            <div style="display: flex; gap: 8px;">
                <button id="popup-btn-configurar" style="
                    flex: 1;
                    padding: 6px;
                    background: #e9ecef;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    color: #495057;
                    transition: all 0.3s ease;
                ">
                    ⚙️ Configurar XPATHs
                </button>
                <button id="popup-btn-exportar" style="
                    flex: 1;
                    padding: 6px;
                    background: #e9ecef;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    color: #495057;
                    transition: all 0.3s ease;
                ">
                    📥 Exportar Log
                </button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        if (!document.getElementById('popup-styles')) {
            const style = document.createElement('style');
            style.id = 'popup-styles';
            style.textContent = `
                @keyframes popupFadeIn {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                .log-entry { padding: 2px 4px; border-bottom: 1px solid #f1f3f5; font-size: 11px; }
                .log-success { color: #28a745; }
                .log-error { color: #dc3545; }
                .log-warning { color: #ffc107; }
                .log-info { color: #17a2b8; }
                #popup-upload-area:hover {
                    border-color: #28a745;
                    background: #f0fff4;
                }
                #popup-upload-area.dragover {
                    border-color: #28a745;
                    background: #f0fff4;
                }
            `;
            document.head.appendChild(style);
        }
        
        configurarEventosPopup();
        return popup;
    }
    
    function configurarEventosPopup() {
        document.getElementById('btn-fechar-popup').addEventListener('click', fecharPopup);
        
        const uploadArea = document.getElementById('popup-upload-area');
        const fileInput = document.getElementById('popup-file-input');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
        
        fileInput.addEventListener('change', function(e) {
            const file = this.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    
                    document.getElementById('popup-file-name').textContent = file.name;
                    document.getElementById('popup-file-size').textContent = (file.size / 1024).toFixed(1) + ' KB';
                    document.getElementById('popup-file-rows').textContent = jsonData.length + ' linhas';
                    document.getElementById('popup-file-info').style.display = 'block';
                    
                    const mapeamento = detectarColunas(jsonData);
                    const dadosMapeados = jsonData.map(row => {
                        const novoRow = {};
                        for (const [campo, coluna] of Object.entries(mapeamento || {})) {
                            novoRow[campo] = row[coluna] || '';
                        }
                        return novoRow;
                    });
                    processarDadosPopup(dadosMapeados);
                } catch (error) {
                    setStatusPopup('❌ Erro: ' + error.message, 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        });
        
        document.getElementById('popup-btn-iniciar').addEventListener('click', () => {
            if (dadosParaCadastrar.length > 0) {
                executarTodosCadastros();
                document.getElementById('popup-btn-iniciar').disabled = true;
                document.getElementById('popup-btn-parar').disabled = false;
            } else {
                addLog('⚠️ Importe um arquivo primeiro!', 'error');
            }
        });
        
        document.getElementById('popup-btn-parar').addEventListener('click', () => {
            podeParar = true;
            document.getElementById('popup-btn-parar').disabled = true;
            document.getElementById('popup-btn-iniciar').disabled = false;
            addLog('⏹️ Parando automação...', 'warning');
        });
        
        document.getElementById('popup-btn-limpar').addEventListener('click', () => {
            dadosParaCadastrar = [];
            cadastroAtual = 0;
            atualizarProgresso(0, 1);
            document.getElementById('popup-info-cadastros').textContent = '0 cadastros carregados';
            document.getElementById('popup-status-text').textContent = 'Pronto';
            document.getElementById('auto-log').innerHTML = '<div style="color: #6c757d;">Dados limpos</div>';
            document.getElementById('popup-file-info').style.display = 'none';
            document.getElementById('popup-preview').style.display = 'none';
            document.getElementById('popup-stats').style.display = 'none';
            document.getElementById('popup-btn-iniciar').disabled = true;
            addLog('🗑️ Dados limpos!', 'info');
            chrome.storage.local.remove('dadosUltimos');
        });
        
        document.getElementById('popup-modo-teste').addEventListener('change', function() {
            CONFIG.modoTeste = this.checked;
            addLog(`🧪 Modo teste ${this.checked ? 'ativado' : 'desativado'}`, 'info');
            chrome.storage.local.set({ modoTeste: this.checked });
        });
        
        document.getElementById('popup-btn-configurar').addEventListener('click', () => {
            const configText = prompt(
                'Cole a configuração dos XPATHs (JSON):',
                JSON.stringify(CONFIG.xpaths, null, 2)
            );
            if (configText) {
                try {
                    const newXpaths = JSON.parse(configText);
                    Object.assign(CONFIG.xpaths, newXpaths);
                    addLog('✅ Configurações atualizadas!', 'success');
                    chrome.storage.local.set({ xpathsPersonalizados: CONFIG.xpaths });
                } catch (e) {
                    addLog('❌ Erro ao parsear JSON: ' + e.message, 'error');
                }
            }
        });
        
        document.getElementById('popup-btn-exportar').addEventListener('click', () => {
            const logText = log.map(entry => 
                `[${entry.timestamp}] ${entry.mensagem}`
            ).join('\n');
            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `log-automacao-${new Date().toISOString().slice(0,10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            addLog('📥 Log exportado!', 'success');
        });
    }
    
    function togglePopup() {
        const popup = document.getElementById('auto-popup');
        if (!popup) {
            criarPopup();
            setTimeout(() => {
                const newPopup = document.getElementById('auto-popup');
                if (newPopup) {
                    newPopup.style.display = 'flex';
                    popupAberto = true;
                }
            }, 100);
        } else {
            if (popup.style.display === 'none' || popup.style.display === '') {
                popup.style.display = 'flex';
                popupAberto = true;
            } else {
                popup.style.display = 'none';
                popupAberto = false;
            }
        }
    }
    
    function fecharPopup() {
        const popup = document.getElementById('auto-popup');
        if (popup) {
            popup.style.display = 'none';
            popupAberto = false;
        }
    }
    
    function setStatusPopup(texto, tipo = 'ready') {
        const indicator = document.getElementById('popup-status-indicator');
        const text = document.getElementById('popup-status-text');
        if (text) text.textContent = texto;
        if (indicator) {
            const cores = { ready: '#28a745', running: '#ffc107', error: '#dc3545' };
            indicator.style.background = cores[tipo] || '#28a745';
        }
    }
    
    function processarDadosPopup(data) {
        if (!data || data.length === 0) {
            setStatusPopup('⚠️ Nenhum dado encontrado', 'error');
            return;
        }
        
        dadosParaCadastrar = data;
        
        document.getElementById('popup-total-rows').textContent = dadosParaCadastrar.length;
        document.getElementById('popup-total-cols').textContent = Object.keys(dadosParaCadastrar[0] || {}).length;
        document.getElementById('popup-status-count').textContent = '✅';
        document.getElementById('popup-stats').style.display = 'flex';
        document.getElementById('popup-info-cadastros').textContent = `${dadosParaCadastrar.length} cadastros carregados`;
        document.getElementById('popup-btn-iniciar').disabled = false;
        
        showPreviewPopup(dadosParaCadastrar);
        setStatusPopup(`✅ ${dadosParaCadastrar.length} registros carregados`, 'ready');
        
        chrome.storage.local.set({ dadosUltimos: dadosParaCadastrar });
        addLog(`📊 ${dadosParaCadastrar.length} registros carregados!`, 'success');
    }
    
    function showPreviewPopup(data) {
        if (!data || data.length === 0) {
            document.getElementById('popup-preview').style.display = 'none';
            return;
        }
        
        document.getElementById('popup-preview').style.display = 'block';
        const headers = Object.keys(data[0]);
        
        let html = '<table style="width:100%;font-size:11px;border-collapse:collapse;">';
        html += '<thead><tr>';
        headers.forEach(h => {
            html += `<th style="background:#f8f9fa;padding:4px 6px;text-align:left;border-bottom:2px solid #dee2e6;">${h}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        const maxRows = Math.min(5, data.length);
        for (let i = 0; i < maxRows; i++) {
            html += '<tr>';
            headers.forEach(h => {
                html += `<td style="padding:3px 6px;border-bottom:1px solid #e9ecef;">${data[i][h] || ''}</td>`;
            });
            html += '</tr>';
        }
        html += '</tbody></table>';
        document.getElementById('popup-preview-content').innerHTML = html;
    }
    
    // ===== INICIALIZA =====
    function inicializar() {
        chrome.storage.local.get(['xpathsPersonalizados', 'modoTeste', 'dadosUltimos'], (result) => {
            if (result.xpathsPersonalizados) {
                Object.assign(CONFIG.xpaths, result.xpathsPersonalizados);
            }
            if (result.modoTeste !== undefined) {
                CONFIG.modoTeste = result.modoTeste;
            }
            if (result.dadosUltimos && result.dadosUltimos.length > 0) {
                dadosParaCadastrar = result.dadosUltimos;
                console.log(`📊 ${dadosParaCadastrar.length} registros carregados do storage`);
            }
        });
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', criarBotaoInput);
        } else {
            criarBotaoInput();
        }
        
        const observer = new MutationObserver(() => {
            if (!document.getElementById('btn-input-servico')) {
                criarBotaoInput();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        console.log('🔧 Automação de Serviços/Materiais inicializada');
    }
    
    // ===== ESCUTA MENSAGENS =====
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'carregarDados') {
            if (dadosParaCadastrar.length === 0) {
                const mapeamento = detectarColunas(request.dados);
                const dadosMapeados = request.dados.map(row => {
                    const novoRow = {};
                    for (const [campo, coluna] of Object.entries(mapeamento || {})) {
                        novoRow[campo] = row[coluna] || '';
                    }
                    return novoRow;
                });
                processarDadosPopup(dadosMapeados);
            }
            sendResponse({status: 'success'});
        }
        if (request.action === 'iniciarAutomacao') {
            if (dadosParaCadastrar.length > 0) {
                executarTodosCadastros();
                sendResponse({status: 'success'});
            } else {
                sendResponse({status: 'error', message: 'Nenhum dado carregado'});
            }
        }
        if (request.action === 'pararAutomacao') {
            podeParar = true;
            sendResponse({status: 'success'});
        }
        if (request.action === 'getStatus') {
            sendResponse({
                status: estaExecutando ? 'executando' : 'parado',
                total: dadosParaCadastrar.length,
                atual: cadastroAtual
            });
        }
        if (request.action === 'togglePopup') {
            togglePopup();
            sendResponse({status: 'success'});
        }
        return true;
    });
    
    inicializar();
    
})();