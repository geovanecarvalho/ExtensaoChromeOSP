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
            inputQtdMaterial: '//input[@id="qtdMaterial"]',
            inputLocalObra: '//input[@id="localObra"]'
        },
        
        delayEntreCadastros: 1500,
        delayPreenchimento: 200,
        delayAposBusca: 1500,
        delayAposClick: 500,
        delayAposNavegacao: 1500,
        delayAposSalvar: 3000,
        delayAposEnter: 300,
        delayAposFechar: 500,
        modoTeste: false
    };
    
    let dadosParaCadastrar = [];
    let cadastroAtual = 0;
    let estaExecutando = false;
    let podeParar = false;
    let log = [];
    let popupAberto = false;
    let relatorio = [];
    let contadores = { sucessos: 0, erros: 0, pulados: 0 };
    
    // ===== FUNÇÕES AUXILIARES =====
    
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    function waitForElement(selector, timeout = 8000) {
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
                
                setTimeout(findElement, 200);
            }
            
            findElement();
        });
    }
    
    async function waitForIdField() {
        let tentativas = 0;
        const maxTentativas = 20;
        
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
                    return inputId;
                }
            }
            
            tentativas++;
            await wait(300);
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
            await wait(200);
            
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
            
            await wait(CONFIG.delayAposClick);
            return true;
        } catch (e) {
            addLog(`❌ Erro ao clicar em ${descricao}: ${e.message}`, 'error');
            return false;
        }
    }
    
    async function preencherCampoRapido(elemento, valor, descricao = '') {
        if (!elemento) return false;
        if (valor === undefined || valor === null || valor === '') return true;
        try {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await wait(100);
            
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
                return true;
            } else if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
                elemento.value = '';
                elemento.focus();
                await wait(50);
                
                elemento.value = String(valor);
                const event = new Event('input', { bubbles: true });
                elemento.dispatchEvent(event);
                
                elemento.blur();
                await wait(50);
                
                ['change', 'blur'].forEach(eventType => {
                    const event = new Event(eventType, { bubbles: true });
                    elemento.dispatchEvent(event);
                });
                
                return true;
            }
            return false;
        } catch (e) {
            addLog(`❌ Erro ao preencher ${descricao}: ${e.message}`, 'error');
            return false;
        }
    }
    
    async function preencherId(inputId, valor) {
        if (!inputId) return false;
        if (valor === undefined || valor === null || valor === '') return false;
        
        inputId.focus();
        await wait(100);
        inputId.value = '';
        inputId.value = String(valor);
        inputId.dispatchEvent(new Event('input', { bubbles: true }));
        inputId.dispatchEvent(new Event('change', { bubbles: true }));
        inputId.blur();
        await wait(100);
        
        return inputId.value === String(valor);
    }
    
    async function pressionarEnter(elemento, descricao = '') {
        if (!elemento) return false;
        
        try {
            elemento.focus();
            await wait(100);
            
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
            
            await wait(CONFIG.delayAposEnter);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    function verificarMensagemRetorno() {
        const mensagemSucesso = document.querySelector('.alert-success');
        if (mensagemSucesso) {
            const texto = mensagemSucesso.textContent.trim();
            addLog(`✅ ${texto}`, 'success');
            return { status: 'sucesso', mensagem: texto };
        }
        
        const mensagemErro = document.querySelector('.alert-danger');
        if (mensagemErro) {
            const texto = mensagemErro.textContent.trim();
            addLog(`❌ ${texto}`, 'error');
            return { status: 'erro', mensagem: texto };
        }
        
        const mensagens = document.querySelectorAll('.alert');
        for (const msg of mensagens) {
            if (msg.textContent.includes('sucesso') || msg.textContent.includes('Sucesso')) {
                return { status: 'sucesso', mensagem: msg.textContent.trim() };
            }
            if (msg.textContent.includes('erro') || msg.textContent.includes('Erro') || msg.textContent.includes('obrigatório')) {
                return { status: 'erro', mensagem: msg.textContent.trim() };
            }
        }
        
        return null;
    }
    
    function detectarColunas(data) {
        if (!data || data.length === 0) return null;
        
        const headers = Object.keys(data[0]);
        addLog(`📋 Colunas: ${headers.join(', ')}`, 'info');
        
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
            for (const variacao of variacoes) {
                const chave = headers.find(h => 
                    h.toLowerCase().trim() === variacao.toLowerCase().trim()
                );
                if (chave) {
                    mapeamento[campo] = chave;
                    break;
                }
            }
            if (!mapeamento[campo]) {
                for (const header of headers) {
                    const headerLower = header.toLowerCase().trim();
                    for (const variacao of variacoes) {
                        if (headerLower.includes(variacao.toLowerCase().trim()) || 
                            variacao.toLowerCase().trim().includes(headerLower)) {
                            mapeamento[campo] = header;
                            break;
                        }
                    }
                    if (mapeamento[campo]) break;
                }
            }
        }
        
        if (!mapeamento['ID'] && headers.length > 0) {
            mapeamento['ID'] = headers[0];
            addLog(`⚠️ Usando primeira coluna como ID: "${headers[0]}"`, 'warning');
        }
        
        return mapeamento;
    }
    
    function addLog(mensagem, tipo = 'info') {
        const entry = {
            timestamp: new Date().toLocaleTimeString(),
            mensagem,
            tipo
        };
        log.push(entry);
        
        const logContainer = document.getElementById('auto-log');
        if (logContainer) {
            const div = document.createElement('div');
            div.className = `log-entry log-${tipo}`;
            div.textContent = `[${entry.timestamp}] ${mensagem}`;
            logContainer.appendChild(div);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }
    
    // ===== FUNÇÃO PARA MOSTRAR ALERTA DE FINALIZAÇÃO =====
    function mostrarAlertaFinalizacao() {
        const sucessos = relatorio.filter(r => r.status === 'sucesso').length;
        const erros = relatorio.filter(r => r.status === 'erro').length;
        const pulados = relatorio.filter(r => r.status === 'pulado').length;
        const total = relatorio.length;
        
        // Cria o alerta
        const alerta = document.createElement('div');
        alerta.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 99999;
            background: white;
            padding: 30px 40px;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            min-width: 400px;
            max-width: 500px;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            animation: alertaFadeIn 0.4s ease;
        `;
        
        const icon = erros > 0 ? '⚠️' : '✅';
        const cor = erros > 0 ? '#dc3545' : '#28a745';
        const titulo = erros > 0 ? 'Processo Finalizado!' : 'Processo Finalizado com Sucesso!';
        
        alerta.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 10px;">${icon}</div>
            <h2 style="color: ${cor}; margin: 0 0 15px 0; font-size: 22px;">${titulo}</h2>
            <div style="display: flex; gap: 15px; justify-content: center; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div>
                    <div style="font-size: 28px; font-weight: 600; color: #28a745;">${sucessos}</div>
                    <div style="font-size: 12px; color: #6c757d;">✅ Sucessos</div>
                </div>
                <div>
                    <div style="font-size: 28px; font-weight: 600; color: #dc3545;">${erros}</div>
                    <div style="font-size: 12px; color: #6c757d;">❌ Erros</div>
                </div>
                <div>
                    <div style="font-size: 28px; font-weight: 600; color: #ffc107;">${pulados}</div>
                    <div style="font-size: 12px; color: #6c757d;">⏭️ Pulados</div>
                </div>
                <div>
                    <div style="font-size: 28px; font-weight: 600; color: #17a2b8;">${total}</div>
                    <div style="font-size: 12px; color: #6c757d;">📊 Total</div>
                </div>
            </div>
            <div style="font-size: 13px; color: #6c757d; margin-bottom: 15px;">
                Clique em "Ver Relatório" para detalhes
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="btn-alerta-fechar" style="
                    padding: 8px 25px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                ">Fechar</button>
                <button id="btn-alerta-relatorio" style="
                    padding: 8px 25px;
                    background: #17a2b8;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                ">📊 Ver Relatório</button>
            </div>
        `;
        
        document.body.appendChild(alerta);
        
        // Adiciona estilos da animação
        if (!document.getElementById('alerta-styles')) {
            const style = document.createElement('style');
            style.id = 'alerta-styles';
            style.textContent = `
                @keyframes alertaFadeIn {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Overlay de fundo
        const overlay = document.createElement('div');
        overlay.id = 'alerta-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 99998;
            animation: alertaFadeIn 0.3s ease;
        `;
        document.body.appendChild(overlay);
        
        // Eventos dos botões
        document.getElementById('btn-alerta-fechar').addEventListener('click', () => {
            alerta.remove();
            overlay.remove();
        });
        
        document.getElementById('btn-alerta-relatorio').addEventListener('click', () => {
            alerta.remove();
            overlay.remove();
            baixarRelatorio();
        });
        
        // Fecha ao clicar no overlay
        overlay.addEventListener('click', () => {
            alerta.remove();
            overlay.remove();
        });
    }
    
    function atualizarStatusPopup() {
        const statusText = document.getElementById('popup-status-text');
        if (statusText) {
            const total = relatorio.length;
            const sucessos = relatorio.filter(r => r.status === 'sucesso').length;
            const erros = relatorio.filter(r => r.status === 'erro').length;
            const pulados = relatorio.filter(r => r.status === 'pulado').length;
            
            if (total > 0) {
                statusText.textContent = `✅ ${sucessos} OK | ❌ ${erros} ERRO | ⏭️ ${pulados} PULADO`;
                statusText.style.color = erros > 0 ? '#dc3545' : '#28a745';
            }
        }
    }
    
    function gerarRelatorio() {
        if (relatorio.length === 0) {
            addLog('⚠️ Nenhum dado para gerar relatório', 'warning');
            return;
        }
        
        const sucessos = relatorio.filter(r => r.status === 'sucesso').length;
        const erros = relatorio.filter(r => r.status === 'erro').length;
        const pulados = relatorio.filter(r => r.status === 'pulado').length;
        
        let relatorioTexto = '========================================\n';
        relatorioTexto += 'RELATÓRIO DE CADASTRO DE SERVIÇOS/MATERIAIS\n';
        relatorioTexto += `Data: ${new Date().toLocaleString()}\n`;
        relatorioTexto += `Total de registros: ${relatorio.length}\n`;
        relatorioTexto += '========================================\n\n';
        
        relatorioTexto += `✅ Sucessos: ${sucessos}\n`;
        relatorioTexto += `❌ Erros: ${erros}\n`;
        relatorioTexto += `⏭️ Pulados: ${pulados}\n`;
        relatorioTexto += `📊 Total: ${relatorio.length}\n`;
        relatorioTexto += '========================================\n\n';
        
        relatorioTexto += 'DETALHES DOS REGISTROS:\n';
        relatorioTexto += '----------------------------------------\n';
        
        relatorio.forEach((item, index) => {
            const statusEmoji = item.status === 'sucesso' ? '✅' : 
                               item.status === 'erro' ? '❌' : '⏭️';
            const statusLabel = item.status.toUpperCase();
            relatorioTexto += `${index + 1}. ID: ${item.id} - ${statusEmoji} ${statusLabel}\n`;
            if (item.mensagem) {
                relatorioTexto += `   Mensagem: ${item.mensagem}\n`;
            }
            if (item.erro) {
                relatorioTexto += `   Erro: ${item.erro}\n`;
            }
            relatorioTexto += `   Dados: ${JSON.stringify(item.dados)}\n`;
            relatorioTexto += '----------------------------------------\n';
        });
        
        relatorioTexto += '\n========================================\n';
        relatorioTexto += 'FIM DO RELATÓRIO\n';
        relatorioTexto += '========================================\n';
        
        return relatorioTexto;
    }
    
    function baixarRelatorio() {
        const relatorioTexto = gerarRelatorio();
        if (!relatorioTexto) return;
        
        const blob = new Blob([relatorioTexto], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_cadastro_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLog(`📥 Relatório baixado com ${relatorio.length} registros`, 'success');
    }
    
    async function executarCadastro(dados, index) {
        const idValue = dados['ID'] || dados['id'] || dados['Id'];
        
        if (!idValue) {
            const erro = 'ID vazio';
            addLog(`❌ Registro ${index + 1} sem ID! Pulando...`, 'error');
            relatorio.push({
                id: 'N/A',
                status: 'pulado',
                mensagem: 'ID vazio',
                dados: dados,
                erro: erro
            });
            atualizarStatusPopup();
            return { sucesso: false, erro: erro, pulado: true };
        }
        
        addLog(`📝 ID: ${idValue}`, 'info');
        
        try {
            // ===== PASSO 1: COLLAPSE =====
            const menuElement = await waitForElement('//span[@id="ott-sidebar-collapse"]', 5000);
            if (!await clickElement(menuElement, 'Menu')) {
                const erro = 'Menu não encontrado';
                relatorio.push({ id: idValue, status: 'erro', mensagem: erro, dados: dados, erro: erro });
                atualizarStatusPopup();
                return { sucesso: false, erro: erro };
            }
            await wait(200);
            
            // ===== PASSO 2: LISTA REQUISIÇÕES =====
            const listaElement = await waitForElement('//a[@routerlink="/requisicoes-eps"]', 5000);
            if (!await clickElement(listaElement, 'Lista EPS')) {
                const erro = 'Lista não encontrada';
                relatorio.push({ id: idValue, status: 'erro', mensagem: erro, dados: dados, erro: erro });
                atualizarStatusPopup();
                return { sucesso: false, erro: erro };
            }
            
            await wait(CONFIG.delayAposNavegacao);
            
            // ===== PASSO 3: PREENCHER ID =====
            const inputId = await waitForIdField();
            if (!inputId) {
                const fallback = document.querySelector('#filtroId');
                if (fallback) {
                    await preencherId(fallback, idValue);
                } else {
                    const erro = 'Campo ID não encontrado';
                    relatorio.push({ id: idValue, status: 'erro', mensagem: erro, dados: dados, erro: erro });
                    atualizarStatusPopup();
                    return { sucesso: false, erro: erro };
                }
            } else {
                await preencherId(inputId, idValue);
            }
            
            // ===== PASSO 4: BUSCAR =====
            const btnBuscar = await waitForElement('//a[contains(@class, "btn-primary") and contains(text(), "Buscar")]', 5000);
            if (!btnBuscar) {
                const btnCSS = document.querySelector('.btn-primary.btn-sm.btn-block');
                if (btnCSS) await clickElement(btnCSS, 'Buscar');
                else {
                    const erro = 'Botão Buscar não encontrado';
                    relatorio.push({ id: idValue, status: 'erro', mensagem: erro, dados: dados, erro: erro });
                    atualizarStatusPopup();
                    return { sucesso: false, erro: erro };
                }
            } else {
                await clickElement(btnBuscar, 'Buscar');
            }
            
            await wait(CONFIG.delayAposBusca);
            
            // ===== PASSO 5: EDITAR =====
            const btnEditar = await waitForElement('//a[contains(@title, "Editar Requisição")]', 4000);
            if (!btnEditar) {
                const btnCSS = document.querySelector('a[title="Editar Requisição"]');
                if (btnCSS) await clickElement(btnCSS, 'Editar');
                else {
                    addLog(`⚠️ ID ${idValue} sem Editar`, 'warning');
                    relatorio.push({ id: idValue, status: 'pulado', mensagem: 'Sem botão Editar', dados: dados });
                    atualizarStatusPopup();
                    return { sucesso: false, erro: 'Sem Editar', pulado: true };
                }
            } else {
                await clickElement(btnEditar, 'Editar');
            }
            
            // ===== PASSO 6: SERVIÇOS =====
            const btnServico = await waitForElement('//a[contains(@title, "Serviços")]', 4000);
            if (!btnServico) {
                const btnCSS = document.querySelector('a[title="Serviços"]');
                if (btnCSS) await clickElement(btnCSS, 'Serviços');
                else {
                    const erro = 'Serviços não encontrado';
                    relatorio.push({ id: idValue, status: 'erro', mensagem: erro, dados: dados, erro: erro });
                    atualizarStatusPopup();
                    return { sucesso: false, erro: erro };
                }
            } else {
                await clickElement(btnServico, 'Serviços');
            }
            
            // ===== PASSO 7: ABA MEDIÇÃO =====
            const abaMedicao = await waitForElement('//a[@role="tab" and contains(text(), "Medição de Campo")]', 4000);
            if (!abaMedicao) {
                const abas = document.querySelectorAll('a[role="tab"]');
                let encontrada = null;
                for (const aba of abas) {
                    if (aba.textContent.includes('Medição de Campo')) {
                        encontrada = aba;
                        break;
                    }
                }
                if (encontrada) await clickElement(encontrada, 'Aba Medição');
                else {
                    const erro = 'Aba não encontrada';
                    relatorio.push({ id: idValue, status: 'erro', mensagem: erro, dados: dados, erro: erro });
                    atualizarStatusPopup();
                    return { sucesso: false, erro: erro };
                }
            } else {
                await clickElement(abaMedicao, 'Aba Medição');
            }
            
            // ===== PASSO 8: INSERIR MEDIÇÃO =====
            const btnInserir = await waitForElement('//button[contains(text(), "Inserir Medição de Campo")]', 4000);
            if (!btnInserir) {
                const botoes = document.querySelectorAll('button');
                let encontrado = null;
                for (const btn of botoes) {
                    if (btn.textContent.includes('Inserir Medição')) {
                        encontrado = btn;
                        break;
                    }
                }
                if (encontrado) await clickElement(encontrado, 'Inserir');
                else {
                    const erro = 'Inserir não encontrado';
                    relatorio.push({ id: idValue, status: 'erro', mensagem: erro, dados: dados, erro: erro });
                    atualizarStatusPopup();
                    return { sucesso: false, erro: erro };
                }
            } else {
                await clickElement(btnInserir, 'Inserir');
            }
            
            await wait(500);
            
            // ===== PASSO 9: PREENCHER FORMULÁRIO =====
            const prancha = dados['PRANCHA'] || '';
            const classe = dados['CLASSE'] || '';
            const maraCode = dados['MARACODE'] || '';
            const item = dados['ITEM'] || '';
            const qtdServico = dados['QTD SERVICO EXECUTADO'] || '';
            const pesquisaMaterial = dados['PESQUISA MATERIAL'] || '';
            const qtdMaterial = dados['QTD MATERIAL'] || '';
            const localObra = dados['LOCAL EXECUCAO OBRA'] || '';
            
            const itemVazio = !item || item === '';
            
            if (itemVazio) {
                addLog(`⚠️ ITEM vazio, pulando materiais`, 'warning');
            }
            
            // Preenche campos
            const inputPrancha = await waitForElement('//input[@id="demPrancha"]', 3000);
            if (inputPrancha) await preencherCampoRapido(inputPrancha, prancha, 'Prancha');
            
            const selectClasse = await waitForElement('//select[@id="demClasse"]', 3000);
            if (selectClasse) await preencherCampoRapido(selectClasse, classe, 'Classe');
            
            const inputMaraCode = await waitForElement('//input[@placeholder="Mara Code"]', 3000);
            if (inputMaraCode && maraCode) {
                await preencherCampoRapido(inputMaraCode, maraCode, 'MaraCode');
                await pressionarEnter(inputMaraCode, 'MaraCode');
            }
            
            const selectItem = await waitForElement('//select[@id="maraCode"]', 3000);
            if (selectItem) await preencherCampoRapido(selectItem, item, 'Item');
            
            const inputQtd = await waitForElement('//input[@id="qtdServicoExecutado"]', 3000);
            if (inputQtd) await preencherCampoRapido(inputQtd, qtdServico, 'Qtd Serviço');
            
            if (!itemVazio && pesquisaMaterial) {
                const inputPesquisa = await waitForElement('//input[@placeholder="Material"]', 3000);
                if (inputPesquisa) {
                    await preencherCampoRapido(inputPesquisa, pesquisaMaterial, 'Pesquisa Material');
                    await pressionarEnter(inputPesquisa, 'Pesquisa Material');
                }
            }
            
            if (!itemVazio && qtdMaterial) {
                const inputQtdMat = await waitForElement('//input[@id="qtdMaterial"]', 3000);
                if (inputQtdMat) await preencherCampoRapido(inputQtdMat, qtdMaterial, 'Qtd Material');
            }
            
            const inputLocal = await waitForElement('//input[@id="localObra"]', 3000);
            if (inputLocal) await preencherCampoRapido(inputLocal, localObra, 'Local Obra');
            
            // ===== PASSO 10: SALVAR E VERIFICAR =====
            if (!CONFIG.modoTeste) {
                let btnSalvar = document.querySelector('button.btn.btn-primary.mt-4.float-right');
                if (!btnSalvar) btnSalvar = document.querySelector('button[type="submit"].btn-primary.float-right');
                if (!btnSalvar) {
                    const botoes = document.querySelectorAll('button');
                    for (const btn of botoes) {
                        if (btn.textContent.trim() === 'Salvar Medição') {
                            btnSalvar = btn;
                            break;
                        }
                    }
                }
                
                if (btnSalvar) {
                    btnSalvar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await wait(200);
                    btnSalvar.click();
                    addLog('💾 Salvando...', 'info');
                    await wait(CONFIG.delayAposSalvar);
                    
                    // ===== VERIFICA MENSAGEM DE RETORNO =====
                    const resultado = verificarMensagemRetorno();
                    
                    if (resultado) {
                        if (resultado.status === 'sucesso') {
                            relatorio.push({
                                id: idValue,
                                status: 'sucesso',
                                mensagem: resultado.mensagem,
                                dados: dados
                            });
                            addLog(`✅ ID ${idValue} cadastrado com sucesso!`, 'success');
                        } else {
                            relatorio.push({
                                id: idValue,
                                status: 'erro',
                                mensagem: resultado.mensagem,
                                dados: dados,
                                erro: resultado.mensagem
                            });
                            addLog(`❌ ID ${idValue} falhou: ${resultado.mensagem}`, 'error');
                        }
                    } else {
                        // Se não encontrou mensagem, considera como sucesso (fallback)
                        addLog(`⚠️ Nenhuma mensagem de retorno detectada para ID ${idValue}`, 'warning');
                        relatorio.push({
                            id: idValue,
                            status: 'sucesso',
                            mensagem: 'Cadastro realizado (sem confirmação)',
                            dados: dados
                        });
                    }
                    
                    // Atualiza status do popup
                    atualizarStatusPopup();
                    
                    // ===== FECHAR =====
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
                        await wait(200);
                        btnFechar.click();
                        await wait(CONFIG.delayAposFechar);
                    }
                    
                } else {
                    const erro = 'Botão Salvar não encontrado';
                    relatorio.push({ id: idValue, status: 'erro', mensagem: erro, dados: dados, erro: erro });
                    atualizarStatusPopup();
                    return { sucesso: false, erro: erro };
                }
            } else {
                // Modo teste
                addLog(`🧪 MODO TESTE: ID ${idValue} simulado com sucesso`, 'success');
                relatorio.push({
                    id: idValue,
                    status: 'sucesso',
                    mensagem: 'TESTE - Cadastro simulado',
                    dados: dados
                });
                atualizarStatusPopup();
                await wait(1000);
            }
            
            return { sucesso: true };
            
        } catch (error) {
            const erroMsg = error.message || 'Erro desconhecido';
            addLog(`❌ ID ${idValue}: ${erroMsg}`, 'error');
            relatorio.push({
                id: idValue,
                status: 'erro',
                mensagem: erroMsg,
                dados: dados,
                erro: erroMsg
            });
            atualizarStatusPopup();
            return { sucesso: false, erro: erroMsg };
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
        relatorio = [];
        contadores = { sucessos: 0, erros: 0, pulados: 0 };
        
        addLog(`🚀 Iniciando ${dadosParaCadastrar.length} cadastros`, 'info');
        addLog(`📋 Modo: ${CONFIG.modoTeste ? 'TESTE' : 'PRODUÇÃO'}`, 'info');
        
        const logContainer = document.getElementById('auto-log');
        if (logContainer) logContainer.innerHTML = '';
        
        for (let i = 0; i < dadosParaCadastrar.length; i++) {
            if (podeParar) {
                addLog('⏹️ Interrompido', 'warning');
                break;
            }
            
            cadastroAtual = i + 1;
            const dados = dadosParaCadastrar[i];
            const idExibicao = dados['ID'] || dados['id'] || dados['Id'] || i + 1;
            
            addLog(`📌 ${cadastroAtual}/${dadosParaCadastrar.length} - ID: ${idExibicao}`, 'info');
            atualizarProgresso(cadastroAtual, dadosParaCadastrar.length);
            
            try {
                await executarCadastro(dados, i);
            } catch (error) {
                addLog(`❌ Erro: ${error.message}`, 'error');
                relatorio.push({
                    id: idExibicao,
                    status: 'erro',
                    mensagem: error.message,
                    dados: dados,
                    erro: error.message
                });
                atualizarStatusPopup();
            }
            
            if (i < dadosParaCadastrar.length - 1 && !podeParar) {
                await wait(CONFIG.delayEntreCadastros);
            }
        }
        
        estaExecutando = false;
        
        // Calcula estatísticas finais
        const sucessos = relatorio.filter(r => r.status === 'sucesso').length;
        const erros = relatorio.filter(r => r.status === 'erro').length;
        const pulados = relatorio.filter(r => r.status === 'pulado').length;
        
        const mensagem = `✅ Finalizado! ${sucessos} sucessos, ${erros} erros, ${pulados} pulados`;
        addLog(mensagem, 'success');
        addLog(`📊 Relatório gerado com ${relatorio.length} registros`, 'info');
        
        // Atualiza botões
        document.getElementById('popup-btn-iniciar').disabled = false;
        document.getElementById('popup-btn-parar').disabled = true;
        document.getElementById('popup-btn-relatorio').disabled = false;
        
        // Atualiza status final
        atualizarStatusPopup();
        
        // ============================================
        // MOSTRA ALERTA DE FINALIZAÇÃO
        // ============================================
        mostrarAlertaFinalizacao();
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
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            min-width: 480px;
            max-width: 600px;
            max-height: 85vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            border: 1px solid #e0e0e0;
            display: none;
            flex-direction: column;
            animation: popupFadeIn 0.3s ease;
        `;
        
        popup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #e9ecef;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 22px;">⚡</span>
                    <h3 style="margin: 0; color: #212529; font-size: 16px;">Cadastramento automático (serviços/materiais)</h3>
                </div>
                <button id="btn-fechar-popup" style="
                    background: none;
                    border: none;
                    font-size: 22px;
                    cursor: pointer;
                    color: #6c757d;
                    padding: 0 6px;
                    transition: all 0.3s ease;
                    line-height: 1;
                " title="Fechar">✕</button>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px; padding: 8px 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef;">
                <span class="status-indicator" id="popup-status-indicator" style="
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #28a745;
                "></span>
                <span id="popup-status-text" style="color: #495057; font-weight: 500;">Pronto</span>
                <span style="margin-left: auto; color: #6c757d; font-size: 11px;" id="popup-tempo-estimado"></span>
            </div>
            
            <div id="popup-upload-area" style="
                border: 2px dashed #dee2e6;
                border-radius: 6px;
                padding: 15px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                background: #f8f9fa;
                margin-bottom: 10px;
            ">
                <div style="font-size: 28px; margin-bottom: 4px;">📊</div>
                <div style="font-size: 13px; color: #495057;">
                    <strong>Clique</strong> ou arraste seu Excel
                </div>
                <div style="font-size: 11px; color: #6c757d;">.xlsx, .xls, .csv</div>
                <input type="file" id="popup-file-input" accept=".xlsx,.xls,.csv" style="display:none">
            </div>
            
            <div id="popup-file-info" style="
                background: #f8fff9;
                padding: 6px 12px;
                border-radius: 4px;
                border-left: 3px solid #28a745;
                display: none;
                margin-bottom: 8px;
                font-size: 12px;
            ">
                <span id="popup-file-name" style="font-weight: 500;">arquivo.xlsx</span>
                <span id="popup-file-size" style="color: #6c757d; margin-left: 8px;">0 KB</span>
                <span id="popup-file-rows" style="color: #28a745; margin-left: 8px;">0 linhas</span>
            </div>
            
            <div id="popup-preview" style="
                max-height: 100px;
                overflow: auto;
                background: white;
                border-radius: 4px;
                border: 1px solid #e9ecef;
                padding: 6px;
                display: none;
                margin-bottom: 8px;
                font-size: 11px;
            ">
                <div id="popup-preview-content"></div>
            </div>
            
            <div id="popup-stats" style="
                display: none;
                gap: 8px;
                padding: 6px 10px;
                background: white;
                border-radius: 4px;
                border: 1px solid #e9ecef;
                margin-bottom: 8px;
            ">
                <div style="display: flex; gap: 8px; font-size: 12px;">
                    <div style="flex:1;text-align:center;">
                        <span style="font-weight:600;color:#28a745;" id="popup-total-rows">0</span>
                        <span style="color:#6c757d;"> registros</span>
                    </div>
                    <div style="flex:1;text-align:center;">
                        <span style="font-weight:600;color:#28a745;" id="popup-total-cols">0</span>
                        <span style="color:#6c757d;"> campos</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 8px;">
                <div style="height:20px;background:#e9ecef;border-radius:4px;overflow:hidden;">
                    <div id="auto-progresso" style="width:0%;height:100%;background:#28a745;transition:width 0.3s;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:bold;">0%</div>
                </div>
            </div>
            
            <div id="auto-log" style="
                flex: 1;
                overflow-y: auto;
                font-size: 11px;
                background: #f8f9fa;
                border-radius: 4px;
                padding: 6px;
                margin-bottom: 8px;
                min-height: 80px;
                max-height: 150px;
                font-family: monospace;
                border: 1px solid #e9ecef;
            ">
                <div style="color:#6c757d;">Aguardando início...</div>
            </div>
            
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
                <button id="popup-btn-iniciar" style="flex:1;padding:6px 10px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;transition:all 0.3s;" disabled>▶️ Iniciar</button>
                <button id="popup-btn-parar" style="flex:1;padding:6px 10px;background:#dc3545;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;transition:all 0.3s;" disabled>⏹️ Parar</button>
                <button id="popup-btn-limpar" style="flex:0 0 auto;padding:6px 10px;background:#6c757d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;" title="Limpar dados">🗑️</button>
            </div>
            
            <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <button id="popup-btn-relatorio" style="flex:1;padding:6px 10px;background:#17a2b8;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;transition:all 0.3s;" disabled>📊 Relatório</button>
                <button id="popup-btn-exportar-log" style="flex:1;padding:6px 10px;background:#6c757d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;transition:all 0.3s;">📥 Exportar Log</button>
            </div>
            
            <div style="display:flex;gap:8px;font-size:11px;color:#6c757d;align-items:center;margin-bottom:4px;">
                <span id="popup-info-cadastros">0 carregados</span>
                <label style="margin-left:auto;display:flex;align-items:center;gap:4px;cursor:pointer;">
                    <input type="checkbox" id="popup-modo-teste" ${CONFIG.modoTeste ? 'checked' : ''}>
                    Modo Teste
                </label>
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
                .log-entry { padding: 2px 4px; border-bottom: 1px solid #f1f3f5; font-size: 10px; }
                .log-success { color: #28a745; }
                .log-error { color: #dc3545; }
                .log-warning { color: #ffc107; }
                .log-info { color: #17a2b8; }
                #popup-upload-area:hover { border-color: #28a745; background: #f0fff4; }
                #popup-upload-area.dragover { border-color: #28a745; background: #f0fff4; }
                #popup-preview::-webkit-scrollbar, #auto-log::-webkit-scrollbar { width: 4px; }
                #popup-preview::-webkit-scrollbar-track, #auto-log::-webkit-scrollbar-track { background: #f1f1f1; border-radius:2px; }
                #popup-preview::-webkit-scrollbar-thumb, #auto-log::-webkit-scrollbar-thumb { background: #888; border-radius:2px; }
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
                document.getElementById('popup-btn-relatorio').disabled = true;
            } else {
                addLog('⚠️ Importe um arquivo primeiro!', 'error');
            }
        });
        
        document.getElementById('popup-btn-parar').addEventListener('click', () => {
            podeParar = true;
            document.getElementById('popup-btn-parar').disabled = true;
            document.getElementById('popup-btn-iniciar').disabled = false;
            addLog('⏹️ Parando...', 'warning');
        });
        
        document.getElementById('popup-btn-limpar').addEventListener('click', () => {
            dadosParaCadastrar = [];
            cadastroAtual = 0;
            relatorio = [];
            contadores = { sucessos: 0, erros: 0, pulados: 0 };
            atualizarProgresso(0, 1);
            document.getElementById('popup-info-cadastros').textContent = '0 carregados';
            document.getElementById('popup-status-text').textContent = 'Pronto';
            document.getElementById('popup-status-text').style.color = '#495057';
            document.getElementById('auto-log').innerHTML = '<div style="color:#6c757d;">Dados limpos</div>';
            document.getElementById('popup-file-info').style.display = 'none';
            document.getElementById('popup-preview').style.display = 'none';
            document.getElementById('popup-stats').style.display = 'none';
            document.getElementById('popup-btn-iniciar').disabled = true;
            document.getElementById('popup-btn-relatorio').disabled = true;
            addLog('🗑️ Dados limpos!', 'info');
            chrome.storage.local.remove('dadosUltimos');
        });
        
        document.getElementById('popup-btn-relatorio').addEventListener('click', () => {
            baixarRelatorio();
        });
        
        document.getElementById('popup-btn-exportar-log').addEventListener('click', () => {
            const logText = log.map(entry => 
                `[${entry.timestamp}] ${entry.mensagem}`
            ).join('\n');
            
            let textoCompleto = logText;
            if (relatorio.length > 0) {
                const sucessos = relatorio.filter(r => r.status === 'sucesso').length;
                const erros = relatorio.filter(r => r.status === 'erro').length;
                const pulados = relatorio.filter(r => r.status === 'pulado').length;
                
                textoCompleto += '\n\n========================================\n';
                textoCompleto += 'RESUMO DO RELATÓRIO:\n';
                textoCompleto += '========================================\n';
                textoCompleto += `✅ Sucessos: ${sucessos}\n`;
                textoCompleto += `❌ Erros: ${erros}\n`;
                textoCompleto += `⏭️ Pulados: ${pulados}\n`;
                textoCompleto += `📊 Total: ${relatorio.length}\n`;
            }
            
            const blob = new Blob([textoCompleto], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `log_completo_${new Date().toISOString().slice(0,10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addLog('📥 Log exportado!', 'success');
        });
        
        document.getElementById('popup-modo-teste').addEventListener('change', function() {
            CONFIG.modoTeste = this.checked;
            addLog(`🧪 Modo teste ${this.checked ? 'ativado' : 'desativado'}`, 'info');
            chrome.storage.local.set({ modoTeste: this.checked });
        });
    }
    
    function togglePopup() {
        const popup = document.getElementById('auto-popup');
        if (!popup) {
            criarPopup();
            setTimeout(() => {
                const newPopup = document.getElementById('auto-popup');
                if (newPopup) newPopup.style.display = 'flex';
            }, 100);
        } else {
            popup.style.display = popup.style.display === 'none' ? 'flex' : 'none';
        }
    }
    
    function fecharPopup() {
        const popup = document.getElementById('auto-popup');
        if (popup) popup.style.display = 'none';
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
            setStatusPopup('⚠️ Nenhum dado', 'error');
            return;
        }
        
        dadosParaCadastrar = data;
        relatorio = [];
        contadores = { sucessos: 0, erros: 0, pulados: 0 };
        
        document.getElementById('popup-total-rows').textContent = dadosParaCadastrar.length;
        document.getElementById('popup-total-cols').textContent = Object.keys(dadosParaCadastrar[0] || {}).length;
        document.getElementById('popup-stats').style.display = 'flex';
        document.getElementById('popup-info-cadastros').textContent = `${dadosParaCadastrar.length} carregados`;
        document.getElementById('popup-btn-iniciar').disabled = false;
        document.getElementById('popup-btn-relatorio').disabled = true;
        document.getElementById('popup-status-text').textContent = `✅ ${dadosParaCadastrar.length} registros carregados`;
        document.getElementById('popup-status-text').style.color = '#28a745';
        
        showPreviewPopup(dadosParaCadastrar);
        
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
        
        let html = '<table style="width:100%;font-size:10px;border-collapse:collapse;">';
        html += '<thead><tr>';
        headers.forEach(h => {
            html += `<th style="background:#f8f9fa;padding:2px 4px;text-align:left;border-bottom:1px solid #dee2e6;">${h}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        const maxRows = Math.min(3, data.length);
        for (let i = 0; i < maxRows; i++) {
            html += '<tr>';
            headers.forEach(h => {
                html += `<td style="padding:2px 4px;border-bottom:1px solid #e9ecef;">${data[i][h] || ''}</td>`;
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
        
        console.log('⚡ Automação com validação e relatório inicializada!');
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