// ============================================
// AUTOMAÇÃO DE CADASTRO DE SERVIÇOS/MATERIAIS
// ============================================

(function() {
    'use strict';
    
    console.log('🤖 Automação de Serviços/Materiais carregada!');
    console.log('📋 Versão OTIMIZADA - Mais rápida');
    
    // ===== CONFIGURAÇÕES OTIMIZADAS =====
    const CONFIG = {
        xpaths: {
            menuCollapse: '//span[@id="ott-sidebar-collapse"]',
            linkListaRequisicoes: '//a[@routerlink="/requisicoes-eps"]',
            inputFiltroId: '//input[@id="filtroId"]',
            btnBuscar: '//a[contains(@class, "btn-primary") and contains(text(), "Buscar")]',
            btnEditar: '//a[contains(@title, "Editar Requisição")]',
            btnServico: '//a[contains(@title, "Serviços")]',
            abaMedicaoCampo: '//a[@role="tab" and contains(text(), "Medição de Campo")]',
            btnInserirMedicao: '//button[contains(text(), "Inserir Medição de Campo")]',
            inputPrancha: '//*[@id="demPrancha"]',
            selectClasse: '//*[@id="demClasse"]',
            inputMaraCode: '//input[@placeholder="Mara Code"]',
            selectItem: '//*[@id="maraCode"]',
            inputQtdServico: '//*[@id="qtdServicoExecutado"]',
            inputPesquisaMaterial: '//input[@placeholder="Material"]',
            selectMaterial: '//*[@id="matCode"]',
            inputQtdMaterial: '//*[@id="qtdMaterial"]',
            inputLocalObra: '//*[@id="localObra"]'
        },
        
        // ===== DELAYS OTIMIZADOS (MAIS RÁPIDOS) =====
        delayEntreCadastros: 2000,        // Reduzido de 3000 para 2000ms
        delayPreenchimento: 150,          // Reduzido de 300 para 150ms
        delayAposBusca: 1500,             // Reduzido de 2000 para 1500ms
        delayAposClick: 300,              // Reduzido de 500 para 300ms
        delayAposNavegacao: 1500,         // Reduzido de 2000 para 1500ms
        delayAposSalvar: 2000,            // Reduzido de 3000 para 2000ms
        delayAposEnter: 400,              // Reduzido de 800 para 400ms
        delayAposFechar: 300,             // Reduzido de 500 para 300ms
        delayExpansaoFormulario: 2000,    // Reduzido de 3000 para 2000ms
        delayAposPreencher: 200,          // Reduzido de 500 para 200ms
        modoTeste: false
    };
    
    // ============================================
    // CLASSE DADOS_CADASTRO
    // ============================================
    class DadosCadastro {
        constructor() {
            this.registros = [];
            this.registroAtual = null;
            this.indiceAtual = 0;
            this.totalRegistros = 0;
            this.relatorio = [];
            this.contadores = { sucessos: 0, erros: 0, pulados: 0 };
            this.log = [];
            this.executando = false;
            this.podeParar = false;
        }
        
        carregarDados(dados) {
            this.registros = dados;
            this.totalRegistros = dados.length;
            this.indiceAtual = 0;
            this.relatorio = [];
            this.contadores = { sucessos: 0, erros: 0, pulados: 0 };
            console.log(`📊 ${this.totalRegistros} registros carregados`);
            return this;
        }
        
        adicionarResultado(id, status, mensagem, dados, erro = null) {
            this.relatorio.push({
                id: id || 'N/A',
                status: status || 'erro',
                mensagem: mensagem || '',
                dados: dados || {},
                erro: erro || null
            });
            
            if (status === 'sucesso') this.contadores.sucessos++;
            else if (status === 'erro') this.contadores.erros++;
            else if (status === 'pulado') this.contadores.pulados++;
        }
        
        gerarRelatorio() {
            if (this.relatorio.length === 0) {
                return '⚠️ Nenhum dado para gerar relatório';
            }
            
            let texto = '========================================\n';
            texto += 'RELATÓRIO DE CADASTRO DE SERVIÇOS/MATERIAIS\n';
            texto += `Data: ${new Date().toLocaleString()}\n`;
            texto += `Total de registros: ${this.relatorio.length}\n`;
            texto += '========================================\n\n';
            texto += `✅ Sucessos: ${this.contadores.sucessos}\n`;
            texto += `❌ Erros: ${this.contadores.erros}\n`;
            texto += `⏭️ Pulados: ${this.contadores.pulados}\n`;
            texto += `📊 Total: ${this.relatorio.length}\n`;
            texto += '========================================\n\n';
            texto += 'DETALHES DOS REGISTROS:\n';
            texto += '----------------------------------------\n';
            
            this.relatorio.forEach((item, index) => {
                const statusEmoji = item.status === 'sucesso' ? '✅' : 
                                   item.status === 'erro' ? '❌' : '⏭️';
                const statusLabel = item.status.toUpperCase();
                texto += `${index + 1}. ID: ${item.id} - ${statusEmoji} ${statusLabel}\n`;
                if (item.mensagem) {
                    texto += `   Mensagem: ${item.mensagem}\n`;
                }
                if (item.erro) {
                    texto += `   Erro: ${item.erro}\n`;
                }
                texto += `   Dados: ${JSON.stringify(item.dados)}\n`;
                texto += '----------------------------------------\n';
            });
            
            texto += '\n========================================\n';
            texto += 'FIM DO RELATÓRIO\n';
            texto += '========================================\n';
            return texto;
        }
    }
    
    // ============================================
    // CLASSE PROCESSADOR_CSV - COM CORREÇÃO UTF-8
    // ============================================
    class ProcessadorCSV {
        constructor() {
            this.dados = null;
            this.headers = [];
            this.mapeamento = {};
        }
        
        processar(texto) {
            console.log('📄 Processando CSV...');
            
            // ===== CORREÇÃO UTF-8 =====
            // Remove BOM se existir
            if (texto.startsWith('\uFEFF')) {
                texto = texto.substring(1);
            }
            
            // Tenta decodificar corretamente caracteres especiais
            try {
                // Converte para o formato correto de string
                texto = decodeURIComponent(escape(texto));
            } catch (e) {
                console.log('⚠️ Não foi possível decodificar, mantendo texto original');
            }
            
            let delimitador = ',';
            const primeiraLinha = texto.split('\n')[0];
            if (primeiraLinha.includes(';') && !primeiraLinha.includes(',')) {
                delimitador = ';';
            } else if (primeiraLinha.includes('\t')) {
                delimitador = '\t';
            }
            
            console.log(`📋 Delimitador: "${delimitador}"`);
            
            const linhas = texto.split(/\r?\n/).filter(line => line.trim() !== '');
            if (linhas.length === 0) {
                throw new Error('Arquivo CSV vazio');
            }
            
            this.headers = linhas[0].split(delimitador).map(h => h.trim().replace(/^"|"$/g, ''));
            console.log(`📋 Cabeçalhos encontrados: ${this.headers.join(', ')}`);
            
            this.dados = [];
            for (let i = 1; i < linhas.length; i++) {
                const valores = linhas[i].split(delimitador).map(v => v.trim().replace(/^"|"$/g, ''));
                const linha = {};
                this.headers.forEach((header, index) => {
                    linha[header] = valores[index] || '';
                });
                this.dados.push(linha);
            }
            
            console.log(`📊 ${this.dados.length} linhas processadas`);
            return this.dados;
        }
        
        // ===== MAPEAMENTO POR NOME =====
        mapearColunas() {
            const mapeamento = {};
            
            const regras = {
                'ID': ['id', 'Id', 'ID', 'Codigo'],
                'PRANCHA': ['prancha', 'Prancha', 'PRANCHA'],
                'CLASSE': ['classe', 'Classe', 'CLASSE'],
                'MARACODE': ['maracode', 'MaraCode', 'MARACODE', 'MARACOD'],
                'QTD SERVICO EXECUTADO': ['qtd servico executado', 'Qtd Servico Executado', 'QTD_SERVICO_EXECUTADO', 'servico executado'],
                'PESQUISA MATERIAL': ['pesquisa material', 'Pesquisa Material', 'PESQUISA MATERIAL', 'PESQUISA MATERIA', 'material pesquisa'],
                'QTD MATERIAL': ['qtd material', 'Qtd Material', 'QTD MATERIAL', 'QTD MATERIA', 'quantidade material'],
                'LOCAL EXECUCAO OBRA': ['local execucao obra', 'Local Execucao Obra', 'LOCAL EXECUCAO OBRA', 'local obra', 'Local Obra']
            };
            
            for (const [campo, variacoes] of Object.entries(regras)) {
                let encontrado = false;
                
                for (const variacao of variacoes) {
                    const chave = this.headers.find(h => 
                        h.trim().toLowerCase() === variacao.toLowerCase()
                    );
                    
                    if (chave) {
                        mapeamento[campo] = chave;
                        console.log(`✅ Mapeou "${campo}" -> coluna "${chave}"`);
                        encontrado = true;
                        break;
                    }
                }
                
                if (!encontrado) {
                    for (const variacao of variacoes) {
                        const chave = this.headers.find(h => 
                            h.trim().toLowerCase().includes(variacao.toLowerCase()) ||
                            variacao.toLowerCase().includes(h.trim().toLowerCase())
                        );
                        
                        if (chave) {
                            mapeamento[campo] = chave;
                            console.log(`✅ Mapeou "${campo}" -> coluna "${chave}" (similar)`);
                            encontrado = true;
                            break;
                        }
                    }
                }
                
                if (!encontrado) {
                    console.log(`⚠️ Campo "${campo}" não encontrado!`);
                }
            }
            
            // ===== CORREÇÃO: Verifica se PESQUISA MATERIAL está vazio =====
            if (mapeamento['PESQUISA MATERIAL']) {
                const colunaPesquisa = mapeamento['PESQUISA MATERIAL'];
                let temDados = false;
                for (const row of this.dados) {
                    if (row[colunaPesquisa] && row[colunaPesquisa].trim() !== '') {
                        temDados = true;
                        break;
                    }
                }
                
                if (!temDados) {
                    for (const header of this.headers) {
                        if (header === colunaPesquisa) continue;
                        let temValor = false;
                        for (const row of this.dados) {
                            if (row[header] && row[header].trim() !== '' && row[header].includes('-')) {
                                temValor = true;
                                break;
                            }
                        }
                        if (temValor) {
                            mapeamento['PESQUISA MATERIAL'] = header;
                            console.log(`✅ Corrigiu "PESQUISA MATERIAL" -> coluna "${header}"`);
                            break;
                        }
                    }
                }
            }
            
            // ===== CORREÇÃO: Verifica se QTD MATERIAL está correto =====
            if (mapeamento['QTD MATERIAL']) {
                const colunaQtd = mapeamento['QTD MATERIAL'];
                let pareceCodigo = false;
                for (const row of this.dados) {
                    if (row[colunaQtd] && row[colunaQtd].includes('-')) {
                        pareceCodigo = true;
                        break;
                    }
                }
                
                if (pareceCodigo) {
                    for (const header of this.headers) {
                        if (header === colunaQtd) continue;
                        let temNumero = false;
                        for (const row of this.dados) {
                            if (row[header] && row[header].match(/^\d+$/)) {
                                temNumero = true;
                                break;
                            }
                        }
                        if (temNumero) {
                            const colunaPesquisa = mapeamento['PESQUISA MATERIAL'];
                            if (colunaPesquisa) {
                                mapeamento['PESQUISA MATERIAL'] = colunaQtd;
                                mapeamento['QTD MATERIAL'] = header;
                                console.log(`✅ Corrigiu: PESQUISA MATERIAL -> coluna "${colunaQtd}"`);
                                console.log(`✅ Corrigiu: QTD MATERIAL -> coluna "${header}"`);
                            }
                            break;
                        }
                    }
                }
            }
            
            this.mapeamento = mapeamento;
            console.log(`📊 Mapeamento final: ${JSON.stringify(mapeamento, null, 2)}`);
            return mapeamento;
        }
        
        getDadosMapeados() {
            if (!this.dados || !this.mapeamento) {
                throw new Error('Dados não processados ou mapeamento não realizado');
            }
            
            return this.dados.map(row => {
                const novoRow = {};
                for (const [campo, coluna] of Object.entries(this.mapeamento)) {
                    novoRow[campo] = row[coluna] || '';
                }
                return novoRow;
            });
        }
    }
    
    // ============================================
    // CLASSE AUTOMACAO - OTIMIZADA
    // ============================================
    class Automacao {
        constructor() {
            this.dados = new DadosCadastro();
            this.processador = new ProcessadorCSV();
            this.estaExecutando = false;
            this.podeParar = false;
            this.log = [];
            this.popupAberto = false;
            this.fileInput = null;
        }
        
        // ===== FUNÇÕES AUXILIARES OTIMIZADAS =====
        
        wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        waitForElement(selector, timeout = 8000) {
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
        
        async waitForIdField() {
            let tentativas = 0;
            const maxTentativas = 15;
            
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
                await this.wait(300);
            }
            
            return null;
        }
        
        async clickElement(element, descricao = '') {
            if (!element) {
                this.addLog(`❌ Elemento não encontrado: ${descricao}`, 'error');
                return false;
            }
            try {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.wait(200);
                
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
                
                this.addLog(`✅ Clicou em: ${descricao}`, 'success');
                await this.wait(CONFIG.delayAposClick);
                return true;
            } catch (e) {
                this.addLog(`❌ Erro ao clicar em ${descricao}: ${e.message}`, 'error');
                return false;
            }
        }
        
        converterNumero(valor) {
            if (valor === undefined || valor === null || valor === '') {
                return '';
            }
            let numeroStr = String(valor).trim().replace(/\s/g, '');
            if (numeroStr.includes('.') && numeroStr.includes(',')) {
                numeroStr = numeroStr.replace(/\./g, '');
                numeroStr = numeroStr.replace(',', '.');
            } else if (numeroStr.includes(',')) {
                numeroStr = numeroStr.replace(',', '.');
            }
            const numero = parseFloat(numeroStr);
            if (!isNaN(numero) && numeroStr !== '') {
                return numero.toString();
            }
            return valor;
        }
        
        async preencherCampo(elemento, valor, descricao = '') {
            if (!elemento) {
                this.addLog(`⚠️ Campo não encontrado: ${descricao}`, 'warning');
                return false;
            }
            if (valor === undefined || valor === null || valor === '') {
                this.addLog(`⏭️ Campo vazio: ${descricao}`, 'info');
                return true;
            }
            try {
                elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.wait(150);
                
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
                        encontrado = true;
                    }
                    if (encontrado) {
                        const event = new Event('change', { bubbles: true });
                        elemento.dispatchEvent(event);
                        this.addLog(`✅ Select: ${descricao} = ${valor}`, 'success');
                        return true;
                    }
                    return false;
                } else if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
                    let valorFinal = valor;
                    if (descricao.includes('Qtd') || descricao.includes('Quantidade')) {
                        valorFinal = this.converterNumero(valor);
                    }
                    
                    elemento.value = '';
                    elemento.focus();
                    await this.wait(100);
                    elemento.value = String(valorFinal);
                    const event = new Event('input', { bubbles: true });
                    elemento.dispatchEvent(event);
                    elemento.blur();
                    await this.wait(100);
                    ['change', 'blur'].forEach(eventType => {
                        const event = new Event(eventType, { bubbles: true });
                        elemento.dispatchEvent(event);
                    });
                    this.addLog(`✅ ${descricao} = ${valorFinal}`, 'success');
                    await this.wait(CONFIG.delayAposPreencher);
                    return true;
                }
                return false;
            } catch (e) {
                this.addLog(`❌ Erro ao preencher ${descricao}: ${e.message}`, 'error');
                return false;
            }
        }
        
        async preencherQtdServico(elemento, valor, descricao = '') {
            if (!elemento) {
                this.addLog(`⚠️ Campo não encontrado: ${descricao}`, 'warning');
                return false;
            }
            if (valor === undefined || valor === null || valor === '') {
                this.addLog(`⏭️ ${descricao} vazio`, 'info');
                return true;
            }
            
            let valorFinal = this.converterNumero(valor);
            this.addLog(`🔢 ${descricao}: ${valorFinal}`, 'info');
            
            try {
                elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.wait(200);
                
                elemento.click();
                await this.wait(100);
                elemento.focus();
                await this.wait(100);
                elemento.value = '';
                await this.wait(100);
                elemento.value = String(valorFinal);
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
                elemento.dispatchEvent(new Event('change', { bubbles: true }));
                elemento.blur();
                await this.wait(100);
                
                if (elemento.value === String(valorFinal) || elemento.value.replace(',', '.') === String(valorFinal)) {
                    this.addLog(`✅ ${descricao}: ${elemento.value}`, 'success');
                    await this.wait(CONFIG.delayAposPreencher);
                    return true;
                }
                
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 'value'
                ).set;
                nativeInputValueSetter.call(elemento, String(valorFinal));
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
                elemento.dispatchEvent(new Event('change', { bubbles: true }));
                await this.wait(100);
                
                if (elemento.value === String(valorFinal) || elemento.value.replace(',', '.') === String(valorFinal)) {
                    this.addLog(`✅ ${descricao}: ${elemento.value}`, 'success');
                    await this.wait(CONFIG.delayAposPreencher);
                    return true;
                }
                
                return false;
            } catch (e) {
                this.addLog(`❌ Erro ${descricao}: ${e.message}`, 'error');
                return false;
            }
        }
        
        async encontrarLocalObra() {
            this.addLog('🔍 Local Obra...', 'info');
            
            await this.wait(500);
            
            let elemento = document.querySelector('#localObra');
            if (elemento) {
                const isVisible = elemento.offsetParent !== null && elemento.offsetWidth > 0;
                if (isVisible) {
                    this.addLog('✅ Local Obra encontrado', 'success');
                    return elemento;
                }
            }
            
            try {
                const result = document.evaluate(
                    '//input[@id="localObra"]',
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                elemento = result.singleNodeValue;
                if (elemento) {
                    const isVisible = elemento.offsetParent !== null && elemento.offsetWidth > 0;
                    if (isVisible) {
                        this.addLog('✅ Local Obra encontrado (XPATH)', 'success');
                        return elemento;
                    }
                }
            } catch (e) {}
            
            const inputs = document.querySelectorAll('input[placeholder="Local Obra"]');
            for (const input of inputs) {
                const isVisible = input.offsetParent !== null && input.offsetWidth > 0;
                if (isVisible) {
                    this.addLog('✅ Local Obra encontrado (placeholder)', 'success');
                    return input;
                }
            }
            
            const inputsByName = document.querySelectorAll('input[formcontrolname="localObra"]');
            for (const input of inputsByName) {
                const isVisible = input.offsetParent !== null && input.offsetWidth > 0;
                if (isVisible) {
                    this.addLog('✅ Local Obra encontrado (formcontrol)', 'success');
                    return input;
                }
            }
            
            this.addLog('❌ Local Obra NÃO encontrado!', 'error');
            return null;
        }
        
        async preencherLocalObraEspecifico(elemento, valor, descricao = '') {
            if (!elemento) {
                this.addLog(`❌ ${descricao} é nulo`, 'error');
                return false;
            }
            if (valor === undefined || valor === null || valor === '') {
                this.addLog(`⏭️ ${descricao} vazio`, 'info');
                return true;
            }
            
            this.addLog(`📍 ${descricao}: "${valor}"`, 'info');
            
            try {
                elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.wait(300);
                
                elemento.click();
                await this.wait(150);
                elemento.focus();
                await this.wait(150);
                
                elemento.value = '';
                await this.wait(100);
                elemento.value = String(valor);
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
                elemento.dispatchEvent(new Event('change', { bubbles: true }));
                await this.wait(300);
                
                elemento.blur();
                await this.wait(150);
                
                this.addLog(`✅ ${descricao}: "${elemento.value}"`, 'success');
                await this.wait(CONFIG.delayAposPreencher);
                return true;
            } catch (e) {
                this.addLog(`❌ Erro ${descricao}: ${e.message}`, 'error');
                return false;
            }
        }
        
        async preencherId(inputId, valor) {
            if (!inputId) return false;
            if (valor === undefined || valor === null || valor === '') return false;
            inputId.focus();
            await this.wait(100);
            inputId.value = '';
            inputId.value = String(valor);
            inputId.dispatchEvent(new Event('input', { bubbles: true }));
            inputId.dispatchEvent(new Event('change', { bubbles: true }));
            inputId.blur();
            await this.wait(150);
            return inputId.value === String(valor);
        }
        
        async pressionarEnter(elemento, descricao = '') {
            if (!elemento) return false;
            try {
                elemento.focus();
                await this.wait(150);
                
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
                
                this.addLog(`⌨️ Enter em: ${descricao}`, 'info');
                await this.wait(CONFIG.delayAposEnter);
                return true;
            } catch (e) {
                return false;
            }
        }
        
        async encontrarMaraCode() {
            this.addLog('🔍 MaraCode...', 'info');
            
            let elemento = await this.waitForElement('//input[@placeholder="Mara Code"]', 2000);
            if (elemento) {
                this.addLog('✅ MaraCode encontrado', 'success');
                return elemento;
            }
            
            elemento = document.querySelector('input[placeholder="Mara Code"]');
            if (elemento) {
                this.addLog('✅ MaraCode encontrado (CSS)', 'success');
                return elemento;
            }
            
            const inputs = document.querySelectorAll('input');
            for (const input of inputs) {
                if (input.placeholder && input.placeholder.toLowerCase().includes('mara')) {
                    this.addLog(`✅ MaraCode encontrado: "${input.placeholder}"`, 'success');
                    return input;
                }
            }
            
            this.addLog('❌ MaraCode NÃO encontrado!', 'error');
            return null;
        }
        
        async encontrarPesquisaMaterial() {
            this.addLog('🔍 Pesquisa Material...', 'info');
            
            await this.wait(1000);
            
            let elemento = await this.waitForElement('//input[@placeholder="Material"]', 2000);
            if (elemento) {
                const isVisible = elemento.offsetParent !== null && elemento.offsetWidth > 0;
                if (isVisible) {
                    this.addLog('✅ Pesquisa Material encontrado', 'success');
                    return elemento;
                }
            }
            
            elemento = document.querySelector('input[placeholder="Material"]');
            if (elemento) {
                const isVisible = elemento.offsetParent !== null && elemento.offsetWidth > 0;
                if (isVisible) {
                    this.addLog('✅ Pesquisa Material encontrado (CSS)', 'success');
                    return elemento;
                }
            }
            
            const inputs = document.querySelectorAll('input');
            for (const input of inputs) {
                if (input.placeholder && input.placeholder.toLowerCase().includes('material')) {
                    const isVisible = input.offsetParent !== null && input.offsetWidth > 0;
                    if (isVisible) {
                        this.addLog(`✅ Pesquisa Material encontrado: "${input.placeholder}"`, 'success');
                        return input;
                    }
                }
            }
            
            this.addLog('❌ Pesquisa Material NÃO encontrado!', 'error');
            return null;
        }
        
        async preencherPesquisaMaterial(inputPesquisa, valor, descricao = '') {
            if (!inputPesquisa) {
                this.addLog(`❌ ${descricao} é nulo`, 'error');
                return false;
            }
            if (valor === undefined || valor === null || valor === '') {
                this.addLog(`⏭️ ${descricao} vazio`, 'info');
                return true;
            }
            
            this.addLog(`🔍 ${descricao}: "${valor}"`, 'info');
            
            try {
                inputPesquisa.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.wait(300);
                
                inputPesquisa.click();
                await this.wait(150);
                inputPesquisa.focus();
                await this.wait(150);
                
                inputPesquisa.value = '';
                await this.wait(100);
                inputPesquisa.value = String(valor);
                inputPesquisa.dispatchEvent(new Event('input', { bubbles: true }));
                inputPesquisa.dispatchEvent(new Event('change', { bubbles: true }));
                await this.wait(300);
                
                this.addLog(`⌨️ Enter para pesquisar: ${valor}`, 'info');
                await this.pressionarEnter(inputPesquisa, 'Pesquisa Material');
                
                await this.wait(1500);
                
                const selectMaterial = await this.waitForElement(CONFIG.xpaths.selectMaterial, 2000);
                if (selectMaterial && selectMaterial.value && selectMaterial.value.trim() !== '') {
                    this.addLog(`✅ Material preenchido: "${selectMaterial.value}"`, 'success');
                }
                
                await this.wait(CONFIG.delayAposPreencher);
                return true;
            } catch (e) {
                this.addLog(`❌ Erro ${descricao}: ${e.message}`, 'error');
                return false;
            }
        }
        
        async aguardarExpansaoFormulario(classe) {
            const isMaterial = classe && classe.toUpperCase().includes('MISC.TBRA');
            
            if (isMaterial) {
                this.addLog(`🔍 MATERIAL (${classe}) - expandindo...`, 'info');
                
                let pesquisaVisible = false;
                let tentativas = 0;
                const maxTentativas = 20;
                
                while (tentativas < maxTentativas && !pesquisaVisible) {
                    const inputPesquisa = document.querySelector('input[placeholder="Material"]');
                    if (inputPesquisa) {
                        const isVisible = inputPesquisa.offsetParent !== null && inputPesquisa.offsetWidth > 0;
                        if (isVisible) {
                            pesquisaVisible = true;
                            this.addLog(`✅ Formulário expandido!`, 'success');
                            break;
                        }
                    }
                    tentativas++;
                    await this.wait(300);
                }
                
                if (!pesquisaVisible) {
                    this.addLog(`⚠️ Formulário não expandiu`, 'warning');
                    await this.wait(1000);
                }
                
                await this.wait(CONFIG.delayExpansaoFormulario);
            } else {
                this.addLog(`📋 Serviço: ${classe}`, 'info');
                await this.wait(500);
            }
        }
        
        aguardarPreenchimentoAutomatico(elemento, valorEsperado, timeout = 2500) {
            return new Promise((resolve) => {
                const startTime = Date.now();
                const self = this;
                function verificar() {
                    if (elemento.value && elemento.value.trim() !== '') {
                        self.addLog(`✅ Item: "${elemento.value}"`, 'success');
                        resolve(true);
                        return;
                    }
                    if (Date.now() - startTime > timeout) {
                        self.addLog(`⚠️ Item não preenchido`, 'warning');
                        resolve(false);
                        return;
                    }
                    setTimeout(verificar, 300);
                }
                verificar();
            });
        }
        
        verificarMensagemRetorno() {
            const mensagemSucesso = document.querySelector('.alert-success');
            if (mensagemSucesso) {
                const texto = mensagemSucesso.textContent.trim();
                this.addLog(`✅ ${texto}`, 'success');
                return { status: 'sucesso', mensagem: texto };
            }
            const mensagemErro = document.querySelector('.alert-danger');
            if (mensagemErro) {
                const texto = mensagemErro.textContent.trim();
                this.addLog(`❌ ${texto}`, 'error');
                return { status: 'erro', mensagem: texto };
            }
            return null;
        }
        
        reordenarDados(dados) {
            if (!dados || dados.length === 0) return dados;
            
            const materiais = [];
            const servicos = [];
            
            for (const item of dados) {
                const classe = item['CLASSE'] || item['Classe'] || '';
                if (classe.toUpperCase().includes('MISC.TBRA')) {
                    materiais.push(item);
                } else {
                    servicos.push(item);
                }
            }
            
            const resultado = [...materiais, ...servicos];
            this.addLog(`📊 Reordenado: ${materiais.length} materiais, ${servicos.length} serviços`, 'info');
            return resultado;
        }
        
        addLog(mensagem, tipo = 'info') {
            const entry = { timestamp: new Date().toLocaleTimeString(), mensagem, tipo };
            this.log.push(entry);
            const logContainer = document.getElementById('auto-log');
            if (logContainer) {
                const div = document.createElement('div');
                div.className = `log-entry log-${tipo}`;
                div.textContent = `[${entry.timestamp}] ${mensagem}`;
                logContainer.appendChild(div);
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        }
        
        // ===== PROCESSAMENTO CSV =====
        processarCSV(texto) {
            return this.processador.processar(texto);
        }
        
        mapearColunas() {
            return this.processador.mapearColunas();
        }
        
        getDadosMapeados() {
            return this.processador.getDadosMapeados();
        }
        
        carregarDados(dados) {
            this.dados.carregarDados(dados);
            this.processador.dados = dados;
        }
        
        // ===== EXECUÇÃO PRINCIPAL OTIMIZADA =====
        async executarCadastro(dados, index) {
            const idValue = dados['ID'] || dados['id'] || dados['Id'];
            const classe = dados['CLASSE'] || dados['Classe'] || '';
            const isMaterial = classe.toUpperCase().includes('MISC.TBRA');
            
            this.addLog(`📝 ${index + 1}/${this.dados.totalRegistros} - ID: ${idValue} | ${isMaterial ? 'MATERIAL' : 'SERVIÇO'}`, 'info');
            
            if (!idValue) {
                this.dados.adicionarResultado('N/A', 'pulado', 'ID vazio', dados);
                return { sucesso: false, erro: 'ID vazio', pulado: true };
            }
            
            const prancha = dados['PRANCHA'] || '';
            const maraCode = dados['MARACODE'] || '';
            const qtdServico = dados['QTD SERVICO EXECUTADO'] || '';
            const pesquisaMaterial = dados['PESQUISA MATERIAL'] || '';
            const qtdMaterial = dados['QTD MATERIAL'] || '';
            const localObra = dados['LOCAL EXECUCAO OBRA'] || '';
            
            try {
                // PASSO 1: COLLAPSE
                const menuElement = await this.waitForElement('//span[@id="ott-sidebar-collapse"]', 3000);
                if (!await this.clickElement(menuElement, 'Menu')) {
                    this.dados.adicionarResultado(idValue, 'erro', 'Menu não encontrado', dados);
                    return { sucesso: false };
                }
                await this.wait(200);
                
                // PASSO 2: LISTA REQUISIÇÕES
                const listaElement = await this.waitForElement('//a[@routerlink="/requisicoes-eps"]', 3000);
                if (!await this.clickElement(listaElement, 'Lista EPS')) {
                    this.dados.adicionarResultado(idValue, 'erro', 'Lista não encontrada', dados);
                    return { sucesso: false };
                }
                await this.wait(CONFIG.delayAposNavegacao);
                
                // PASSO 3: ID
                const inputId = await this.waitForIdField();
                if (!inputId) {
                    const fallback = document.querySelector('#filtroId');
                    if (fallback) await this.preencherId(fallback, idValue);
                    else {
                        this.dados.adicionarResultado(idValue, 'erro', 'Campo ID não encontrado', dados);
                        return { sucesso: false };
                    }
                } else {
                    await this.preencherId(inputId, idValue);
                }
                
                // PASSO 4: BUSCAR
                const btnBuscar = await this.waitForElement('//a[contains(@class, "btn-primary") and contains(text(), "Buscar")]', 3000);
                if (btnBuscar) await this.clickElement(btnBuscar, 'Buscar');
                else {
                    const btnCSS = document.querySelector('.btn-primary.btn-sm.btn-block');
                    if (btnCSS) await this.clickElement(btnCSS, 'Buscar');
                    else {
                        this.dados.adicionarResultado(idValue, 'erro', 'Botão Buscar não encontrado', dados);
                        return { sucesso: false };
                    }
                }
                await this.wait(CONFIG.delayAposBusca);
                
                // PASSO 5: EDITAR
                const btnEditar = await this.waitForElement('//a[contains(@title, "Editar Requisição")]', 3000);
                if (!btnEditar) {
                    const btnCSS = document.querySelector('a[title="Editar Requisição"]');
                    if (btnCSS) await this.clickElement(btnCSS, 'Editar');
                    else {
                        this.dados.adicionarResultado(idValue, 'pulado', 'Sem botão Editar', dados);
                        return { sucesso: false, pulado: true };
                    }
                } else {
                    await this.clickElement(btnEditar, 'Editar');
                }
                
                // PASSO 6: SERVIÇOS
                const btnServico = await this.waitForElement('//a[contains(@title, "Serviços")]', 3000);
                if (!btnServico) {
                    const btnCSS = document.querySelector('a[title="Serviços"]');
                    if (btnCSS) await this.clickElement(btnCSS, 'Serviços');
                    else {
                        this.dados.adicionarResultado(idValue, 'erro', 'Serviços não encontrado', dados);
                        return { sucesso: false };
                    }
                } else {
                    await this.clickElement(btnServico, 'Serviços');
                }
                
                // PASSO 7: ABA MEDIÇÃO
                const abaMedicao = await this.waitForElement('//a[@role="tab" and contains(text(), "Medição de Campo")]', 3000);
                if (!abaMedicao) {
                    const abas = document.querySelectorAll('a[role="tab"]');
                    let encontrada = null;
                    for (const aba of abas) {
                        if (aba.textContent.includes('Medição de Campo')) {
                            encontrada = aba;
                            break;
                        }
                    }
                    if (encontrada) await this.clickElement(encontrada, 'Aba Medição');
                    else {
                        this.dados.adicionarResultado(idValue, 'erro', 'Aba não encontrada', dados);
                        return { sucesso: false };
                    }
                } else {
                    await this.clickElement(abaMedicao, 'Aba Medição');
                }
                
                // PASSO 8: INSERIR MEDIÇÃO
                const btnInserir = await this.waitForElement('//button[contains(text(), "Inserir Medição de Campo")]', 3000);
                if (!btnInserir) {
                    const botoes = document.querySelectorAll('button');
                    let encontrado = null;
                    for (const btn of botoes) {
                        if (btn.textContent.includes('Inserir Medição')) {
                            encontrado = btn;
                            break;
                        }
                    }
                    if (encontrado) await this.clickElement(encontrado, 'Inserir');
                    else {
                        this.dados.adicionarResultado(idValue, 'erro', 'Inserir não encontrado', dados);
                        return { sucesso: false };
                    }
                } else {
                    await this.clickElement(btnInserir, 'Inserir');
                }
                
                await this.wait(500);
                
                // ===== PREENCHER FORMULÁRIO =====
                // 1. PRANCHA
                const inputPrancha = await this.waitForElement(CONFIG.xpaths.inputPrancha, 3000);
                await this.preencherCampo(inputPrancha, prancha, 'Prancha');
                
                // 2. CLASSE
                const selectClasse = await this.waitForElement(CONFIG.xpaths.selectClasse, 3000);
                await this.preencherCampo(selectClasse, classe, 'Classe');
                
                // 3. MARACODE
                if (maraCode) {
                    const inputMaraCode = await this.encontrarMaraCode();
                    if (inputMaraCode) {
                        inputMaraCode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await this.wait(200);
                        inputMaraCode.click();
                        await this.wait(150);
                        inputMaraCode.focus();
                        await this.wait(150);
                        inputMaraCode.value = '';
                        await this.wait(100);
                        inputMaraCode.value = String(maraCode);
                        inputMaraCode.dispatchEvent(new Event('input', { bubbles: true }));
                        inputMaraCode.dispatchEvent(new Event('change', { bubbles: true }));
                        await this.wait(200);
                        await this.pressionarEnter(inputMaraCode, 'MaraCode');
                        
                        const selectItem = await this.waitForElement(CONFIG.xpaths.selectItem, 3000);
                        if (selectItem) {
                            await this.aguardarPreenchimentoAutomatico(selectItem, '');
                        }
                        await this.aguardarExpansaoFormulario(classe);
                    }
                }
                
                // 4. QTD SERVIÇO EXECUTADO
                const inputQtdServico = await this.waitForElement(CONFIG.xpaths.inputQtdServico, 3000);
                if (inputQtdServico) {
                    await this.preencherQtdServico(inputQtdServico, qtdServico, 'Qtd Serviço');
                }
                
                // 5. PESQUISA MATERIAL
                if (isMaterial && pesquisaMaterial) {
                    const inputPesquisa = await this.encontrarPesquisaMaterial();
                    if (inputPesquisa) {
                        await this.preencherPesquisaMaterial(inputPesquisa, pesquisaMaterial, 'Pesquisa Material');
                    }
                }
                
                // 6. QTD MATERIAL
                const inputQtdMaterial = await this.waitForElement(CONFIG.xpaths.inputQtdMaterial, 3000);
                if (inputQtdMaterial && isMaterial) {
                    if (qtdMaterial && !qtdMaterial.includes('-') && String(qtdMaterial) !== String(idValue)) {
                        const valorConvertido = this.converterNumero(qtdMaterial);
                        this.addLog(`📦 Qtd Material: "${valorConvertido}"`, 'info');
                        await this.preencherCampo(inputQtdMaterial, valorConvertido, 'Qtd Material');
                    }
                }
                
                // 7. LOCAL EXECUÇÃO OBRA
                if (localObra) {
                    const inputLocalObra = await this.encontrarLocalObra();
                    if (inputLocalObra) {
                        await this.preencherLocalObraEspecifico(inputLocalObra, localObra, 'Local Obra');
                    }
                }
                
                // ===== SALVAR =====
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
                        await this.wait(200);
                        btnSalvar.click();
                        this.addLog(`💾 Salvando ${idValue}...`, 'info');
                        await this.wait(CONFIG.delayAposSalvar);
                        
                        const resultado = this.verificarMensagemRetorno();
                        
                        if (resultado && resultado.status === 'sucesso') {
                            this.dados.adicionarResultado(idValue, 'sucesso', resultado.mensagem, dados);
                            this.addLog(`✅ ${idValue} OK!`, 'success');
                        } else if (resultado && resultado.status === 'erro') {
                            this.dados.adicionarResultado(idValue, 'erro', resultado.mensagem, dados, resultado.mensagem);
                            this.addLog(`❌ ${idValue} falhou: ${resultado.mensagem}`, 'error');
                        } else {
                            this.dados.adicionarResultado(idValue, 'sucesso', 'Cadastro realizado', dados);
                            this.addLog(`✅ ${idValue} OK!`, 'success');
                        }
                        
                        // FECHAR
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
                            await this.wait(200);
                            btnFechar.click();
                            await this.wait(CONFIG.delayAposFechar);
                        }
                    } else {
                        this.dados.adicionarResultado(idValue, 'erro', 'Botão Salvar não encontrado', dados);
                        return { sucesso: false };
                    }
                } else {
                    this.addLog(`🧪 TESTE: ${idValue} simulado`, 'success');
                    this.dados.adicionarResultado(idValue, 'sucesso', 'TESTE', dados);
                    await this.wait(1000);
                }
                
                return { sucesso: true };
                
            } catch (error) {
                const erroMsg = error.message || 'Erro desconhecido';
                this.addLog(`❌ ${idValue}: ${erroMsg}`, 'error');
                this.dados.adicionarResultado(idValue, 'erro', erroMsg, dados, erroMsg);
                return { sucesso: false };
            }
        }
        
        async executarTodosCadastros() {
            if (this.estaExecutando) {
                this.addLog('⚠️ Já está executando!', 'warning');
                return;
            }
            if (this.dados.totalRegistros === 0) {
                this.addLog('⚠️ Nenhum dado!', 'error');
                return;
            }
            
            this.estaExecutando = true;
            this.podeParar = false;
            this.dados.indiceAtual = 0;
            this.dados.relatorio = [];
            this.dados.contadores = { sucessos: 0, erros: 0, pulados: 0 };
            
            this.addLog(`🚀 Iniciando ${this.dados.totalRegistros} cadastros (RÁPIDO)`, 'info');
            
            const logContainer = document.getElementById('auto-log');
            if (logContainer) logContainer.innerHTML = '';
            
            for (let i = 0; i < this.dados.totalRegistros; i++) {
                if (this.podeParar) {
                    this.addLog('⏹️ Interrompido', 'warning');
                    break;
                }
                
                const dados = this.dados.registros[i];
                await this.executarCadastro(dados, i);
                
                if (i < this.dados.totalRegistros - 1 && !this.podeParar) {
                    this.atualizarProgresso(i + 1, this.dados.totalRegistros);
                    await this.wait(CONFIG.delayEntreCadastros);
                }
            }
            
            this.estaExecutando = false;
            
            this.atualizarProgresso(this.dados.totalRegistros, this.dados.totalRegistros);
            
            this.addLog(`✅ Finalizado! ${this.dados.contadores.sucessos} OK, ${this.dados.contadores.erros} ERRO, ${this.dados.contadores.pulados} PULADO`, 'success');
            this.addLog(`📊 Relatório: ${this.dados.relatorio.length} registros`, 'info');
            
            document.getElementById('popup-btn-iniciar').disabled = false;
            document.getElementById('popup-btn-parar').disabled = true;
            document.getElementById('popup-btn-relatorio').disabled = false;
            
            this.atualizarStatusPopup();
            this.mostrarAlertaFinalizacao();
        }
        
        atualizarProgresso(atual, total) {
            const progresso = document.getElementById('auto-progresso');
            if (!progresso) return;
            const percentual = Math.round((atual / total) * 100);
            progresso.style.width = `${percentual}%`;
            progresso.textContent = `${percentual}% (${atual}/${total})`;
        }
        
        atualizarStatusPopup() {
            const statusText = document.getElementById('popup-status-text');
            if (statusText) {
                const total = this.dados.relatorio.length;
                const sucessos = this.dados.contadores.sucessos;
                const erros = this.dados.contadores.erros;
                const pulados = this.dados.contadores.pulados;
                if (total > 0) {
                    statusText.textContent = `✅ ${sucessos} OK | ❌ ${erros} ERRO | ⏭️ ${pulados} PULADO`;
                    statusText.style.color = erros > 0 ? '#dc3545' : '#28a745';
                }
            }
        }
        
        mostrarAlertaFinalizacao() {
            const sucessos = this.dados.contadores.sucessos;
            const erros = this.dados.contadores.erros;
            const pulados = this.dados.contadores.pulados;
            const total = this.dados.relatorio.length;
            
            const alerta = document.createElement('div');
            alerta.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                z-index: 99999; background: white; padding: 25px 35px; border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3); min-width: 350px; max-width: 450px;
                text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                animation: alertaFadeIn 0.3s ease;
            `;
            
            const icon = erros > 0 ? '⚠️' : '✅';
            const cor = erros > 0 ? '#dc3545' : '#28a745';
            const titulo = erros > 0 ? 'Finalizado com Alertas!' : 'Finalizado com Sucesso!';
            
            alerta.innerHTML = `
                <div style="font-size: 40px; margin-bottom: 8px;">${icon}</div>
                <h2 style="color: ${cor}; margin: 0 0 12px 0; font-size: 20px;">${titulo}</h2>
                <div style="display: flex; gap: 12px; justify-content: center; margin: 15px 0; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                    <div><div style="font-size: 24px; font-weight: 600; color: #28a745;">${sucessos}</div><div style="font-size: 11px; color: #6c757d;">✅ Sucessos</div></div>
                    <div><div style="font-size: 24px; font-weight: 600; color: #dc3545;">${erros}</div><div style="font-size: 11px; color: #6c757d;">❌ Erros</div></div>
                    <div><div style="font-size: 24px; font-weight: 600; color: #ffc107;">${pulados}</div><div style="font-size: 11px; color: #6c757d;">⏭️ Pulados</div></div>
                    <div><div style="font-size: 24px; font-weight: 600; color: #17a2b8;">${total}</div><div style="font-size: 11px; color: #6c757d;">📊 Total</div></div>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-alerta-fechar" style="padding: 6px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">Fechar</button>
                    <button id="btn-alerta-relatorio" style="padding: 6px 20px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">📊 Relatório</button>
                </div>
            `;
            document.body.appendChild(alerta);
            
            const overlay = document.createElement('div');
            overlay.id = 'alerta-overlay';
            overlay.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 99998; animation: alertaFadeIn 0.3s ease;`;
            document.body.appendChild(overlay);
            
            document.getElementById('btn-alerta-fechar').addEventListener('click', () => { alerta.remove(); overlay.remove(); });
            document.getElementById('btn-alerta-relatorio').addEventListener('click', () => { alerta.remove(); overlay.remove(); this.baixarRelatorio(); });
            overlay.addEventListener('click', () => { alerta.remove(); overlay.remove(); });
        }
        
        baixarRelatorio() {
            const relatorioTexto = this.dados.gerarRelatorio();
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
            this.addLog(`📥 Relatório baixado!`, 'success');
        }
        
        // ===== INTERFACE =====
        criarBotaoInput() {
            const usernameSpan = document.getElementById('ott-username');
            if (!usernameSpan) {
                setTimeout(() => this.criarBotaoInput(), 1000);
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
            
            botao.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.togglePopup();
            });
            
            container.appendChild(botao);
            usernameSpan.parentNode.insertBefore(container, usernameSpan.nextSibling);
            console.log('✅ Botão adicionado!');
        }
        
        togglePopup() {
            const popup = document.getElementById('auto-popup');
            if (!popup) {
                this.criarPopup();
                setTimeout(() => {
                    const newPopup = document.getElementById('auto-popup');
                    if (newPopup) newPopup.style.display = 'flex';
                }, 100);
            } else {
                popup.style.display = popup.style.display === 'none' ? 'flex' : 'none';
            }
        }
        
        fecharPopup() {
            const popup = document.getElementById('auto-popup');
            if (popup) popup.style.display = 'none';
        }
        
        criarPopup() {
            const popupExistente = document.getElementById('auto-popup');
            if (popupExistente) popupExistente.remove();
            
            const popup = document.createElement('div');
            popup.id = 'auto-popup';
            popup.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                z-index: 10000; background: white; padding: 20px; border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3); min-width: 460px; max-width: 560px;
                max-height: 85vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                border: 1px solid #e0e0e0; display: none; flex-direction: column;
                animation: popupFadeIn 0.3s ease;
            `;
            
            popup.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #e9ecef;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">⚡</span>
                        <h3 style="margin: 0; color: #212529; font-size: 16px;">Automação Serviços</h3>
                    </div>
                    <button id="btn-fechar-popup" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6c757d;padding:0 6px;">✕</button>
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px; padding: 6px 12px; background: #f8f9fa; border-radius: 6px;">
                    <span class="status-indicator" id="popup-status-indicator" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#28a745;"></span>
                    <span id="popup-status-text" style="color:#495057;font-weight:500;">Pronto</span>
                </div>
                
                <div id="popup-upload-area" style="border:2px dashed #dee2e6;border-radius:6px;padding:12px;text-align:center;cursor:pointer;transition:all 0.3s;background:#f8f9fa;margin-bottom:10px;">
                    <div style="font-size:24px;margin-bottom:4px;">📊</div>
                    <div style="font-size:13px;color:#495057;"><strong>Clique</strong> ou arraste seu CSV</div>
                    <div style="font-size:11px;color:#6c757d;">.csv, .txt</div>
                    <input type="file" id="popup-file-input" accept=".csv,.txt" style="display:none">
                </div>
                
                <div id="popup-file-info" style="background:#f8fff9;padding:4px 12px;border-radius:4px;border-left:3px solid #28a745;display:none;margin-bottom:8px;font-size:12px;">
                    <span id="popup-file-name" style="font-weight:500;">arquivo.csv</span>
                    <span id="popup-file-size" style="color:#6c757d;margin-left:8px;">0 KB</span>
                    <span id="popup-file-rows" style="color:#28a745;margin-left:8px;">0 linhas</span>
                </div>
                
                <div id="popup-preview" style="max-height:80px;overflow:auto;background:white;border-radius:4px;border:1px solid #e9ecef;padding:6px;display:none;margin-bottom:8px;font-size:10px;">
                    <div id="popup-preview-content"></div>
                </div>
                
                <div id="popup-stats" style="display:none;gap:8px;padding:6px;background:white;border-radius:4px;border:1px solid #e9ecef;margin-bottom:8px;">
                    <div style="display:flex;gap:8px;font-size:12px;text-align:center;">
                        <div style="flex:1;"><span style="font-weight:600;color:#28a745;" id="popup-total-rows">0</span> registros</div>
                        <div style="flex:1;"><span style="font-weight:600;color:#28a745;" id="popup-total-cols">0</span> campos</div>
                    </div>
                </div>
                
                <div style="margin-bottom:8px;">
                    <div style="height:18px;background:#e9ecef;border-radius:4px;overflow:hidden;">
                        <div id="auto-progresso" style="width:0%;height:100%;background:#28a745;transition:width 0.3s;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold;">0%</div>
                    </div>
                </div>
                
                <div id="auto-log" style="flex:1;overflow-y:auto;font-size:10px;background:#f8f9fa;border-radius:4px;padding:4px;margin-bottom:8px;min-height:60px;max-height:120px;font-family:monospace;border:1px solid #e9ecef;">
                    <div style="color:#6c757d;">Aguardando início...</div>
                </div>
                
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
                    <button id="popup-btn-iniciar" style="flex:1;padding:5px 10px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;" disabled>▶️ Iniciar</button>
                    <button id="popup-btn-parar" style="flex:1;padding:5px 10px;background:#dc3545;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;" disabled>⏹️ Parar</button>
                    <button id="popup-btn-limpar" style="flex:0 0 auto;padding:5px 10px;background:#6c757d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">🗑️</button>
                </div>
                
                <div style="display:flex;gap:6px;margin-bottom:6px;">
                    <button id="popup-btn-relatorio" style="flex:1;padding:5px 10px;background:#17a2b8;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;" disabled>📊 Relatório</button>
                    <button id="popup-btn-exportar-log" style="flex:1;padding:5px 10px;background:#6c757d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">📥 Log</button>
                </div>
                
                <div style="display:flex;gap:8px;font-size:11px;color:#6c757d;align-items:center;">
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
                    @keyframes popupFadeIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
                    @keyframes alertaFadeIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.9); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
                    .log-entry { padding:1px 4px; border-bottom:1px solid #f1f3f5; font-size:9px; }
                    .log-success { color: #28a745; }
                    .log-error { color: #dc3545; }
                    .log-warning { color: #ffc107; }
                    .log-info { color: #17a2b8; }
                    #popup-upload-area:hover { border-color: #28a745; background: #f0fff4; }
                    #popup-upload-area.dragover { border-color: #28a745; background: #f0fff4; }
                    #popup-preview::-webkit-scrollbar, #auto-log::-webkit-scrollbar { width:3px; }
                    #popup-preview::-webkit-scrollbar-track, #auto-log::-webkit-scrollbar-track { background:#f1f1f1; border-radius:2px; }
                    #popup-preview::-webkit-scrollbar-thumb, #auto-log::-webkit-scrollbar-thumb { background:#888; border-radius:2px; }
                `;
                document.head.appendChild(style);
            }
            
            this.configurarEventosPopup();
            return popup;
        }
        
        configurarEventosPopup() {
            const self = this;
            
            document.getElementById('btn-fechar-popup').addEventListener('click', () => self.fecharPopup());
            
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
            
            fileInput.addEventListener('change', function() {
                const file = this.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const texto = e.target.result;
                        const dados = self.processarCSV(texto);
                        
                        if (dados.length === 0) {
                            self.setStatusPopup('⚠️ Nenhum dado', 'error');
                            return;
                        }
                        
                        document.getElementById('popup-file-name').textContent = file.name;
                        document.getElementById('popup-file-size').textContent = (file.size / 1024).toFixed(1) + ' KB';
                        document.getElementById('popup-file-rows').textContent = dados.length + ' linhas';
                        document.getElementById('popup-file-info').style.display = 'block';
                        
                        self.mapearColunas();
                        const dadosMapeados = self.getDadosMapeados();
                        const dadosReordenados = self.reordenarDados(dadosMapeados);
                        self.processarDadosPopup(dadosReordenados);
                    } catch (error) {
                        self.setStatusPopup('❌ Erro: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);
            });
            
            document.getElementById('popup-btn-iniciar').addEventListener('click', () => {
                if (self.dados.totalRegistros > 0) {
                    self.executarTodosCadastros();
                    document.getElementById('popup-btn-iniciar').disabled = true;
                    document.getElementById('popup-btn-parar').disabled = false;
                    document.getElementById('popup-btn-relatorio').disabled = true;
                }
            });
            
            document.getElementById('popup-btn-parar').addEventListener('click', () => {
                self.podeParar = true;
                document.getElementById('popup-btn-parar').disabled = true;
                document.getElementById('popup-btn-iniciar').disabled = false;
            });
            
            document.getElementById('popup-btn-limpar').addEventListener('click', () => {
                self.dados.registros = [];
                self.dados.totalRegistros = 0;
                self.dados.relatorio = [];
                self.dados.contadores = { sucessos: 0, erros: 0, pulados: 0 };
                self.atualizarProgresso(0, 1);
                document.getElementById('popup-info-cadastros').textContent = '0 carregados';
                document.getElementById('popup-status-text').textContent = 'Pronto';
                document.getElementById('auto-log').innerHTML = '<div style="color:#6c757d;">Dados limpos</div>';
                document.getElementById('popup-file-info').style.display = 'none';
                document.getElementById('popup-preview').style.display = 'none';
                document.getElementById('popup-stats').style.display = 'none';
                document.getElementById('popup-btn-iniciar').disabled = true;
                document.getElementById('popup-btn-relatorio').disabled = true;
                chrome.storage.local.remove('dadosUltimos');
            });
            
            document.getElementById('popup-btn-relatorio').addEventListener('click', () => {
                self.baixarRelatorio();
            });
            
            document.getElementById('popup-btn-exportar-log').addEventListener('click', () => {
                const logText = self.log.map(entry => `[${entry.timestamp}] ${entry.mensagem}`).join('\n');
                const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `log_${new Date().toISOString().slice(0,10)}.txt`;
                a.click();
                URL.revokeObjectURL(url);
            });
            
            document.getElementById('popup-modo-teste').addEventListener('change', function() {
                CONFIG.modoTeste = this.checked;
                chrome.storage.local.set({ modoTeste: this.checked });
            });
        }
        
        setStatusPopup(texto, tipo = 'ready') {
            const indicator = document.getElementById('popup-status-indicator');
            const text = document.getElementById('popup-status-text');
            if (text) text.textContent = texto;
            if (indicator) {
                const cores = { ready: '#28a745', running: '#ffc107', error: '#dc3545' };
                indicator.style.background = cores[tipo] || '#28a745';
            }
        }
        
        processarDadosPopup(data) {
            if (!data || data.length === 0) {
                this.setStatusPopup('⚠️ Nenhum dado', 'error');
                return;
            }
            
            this.dados.carregarDados(data);
            
            document.getElementById('popup-total-rows').textContent = this.dados.totalRegistros;
            document.getElementById('popup-total-cols').textContent = Object.keys(this.dados.registros[0] || {}).length;
            document.getElementById('popup-stats').style.display = 'flex';
            document.getElementById('popup-info-cadastros').textContent = `${this.dados.totalRegistros} carregados`;
            document.getElementById('popup-btn-iniciar').disabled = false;
            document.getElementById('popup-btn-relatorio').disabled = true;
            document.getElementById('popup-status-text').textContent = `✅ ${this.dados.totalRegistros} registros`;
            document.getElementById('popup-status-text').style.color = '#28a745';
            
            this.showPreviewPopup(this.dados.registros);
            chrome.storage.local.set({ dadosUltimos: this.dados.registros });
            this.addLog(`📊 ${this.dados.totalRegistros} registros carregados!`, 'success');
        }
        
        showPreviewPopup(data) {
            if (!data || data.length === 0) {
                document.getElementById('popup-preview').style.display = 'none';
                return;
            }
            
            document.getElementById('popup-preview').style.display = 'block';
            const headers = Object.keys(data[0]);
            
            let html = '<table style="width:100%;font-size:9px;border-collapse:collapse;">';
            html += '<thead><tr>';
            headers.forEach(h => {
                html += `<th style="background:#f8f9fa;padding:2px 4px;text-align:left;border-bottom:1px solid #dee2e6;">${h}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            const maxRows = Math.min(3, data.length);
            for (let i = 0; i < maxRows; i++) {
                html += '<tr>';
                headers.forEach(h => {
                    const value = data[i][h] || '';
                    html += `<td style="padding:2px 4px;border-bottom:1px solid #e9ecef;">${value}</td>`;
                });
                html += '</tr>';
            }
            html += '</tbody></table>';
            document.getElementById('popup-preview-content').innerHTML = html;
        }
    }
    
    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    
    const automacao = new Automacao();
    
    function inicializar() {
        chrome.storage.local.get(['xpathsPersonalizados', 'modoTeste', 'dadosUltimos'], (result) => {
            if (result.xpathsPersonalizados) {
                Object.assign(CONFIG.xpaths, result.xpathsPersonalizados);
            }
            if (result.modoTeste !== undefined) {
                CONFIG.modoTeste = result.modoTeste;
            }
            if (result.dadosUltimos && result.dadosUltimos.length > 0) {
                automacao.dados.carregarDados(result.dadosUltimos);
            }
        });
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => automacao.criarBotaoInput());
        } else {
            automacao.criarBotaoInput();
        }
        
        const observer = new MutationObserver(() => {
            if (!document.getElementById('btn-input-servico')) {
                automacao.criarBotaoInput();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        console.log('⚡ Automação OTIMIZADA inicializada!');
    }
    
    // ===== ESCUTA MENSAGENS =====
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'carregarDados') {
            if (automacao.dados.totalRegistros === 0) {
                const dadosReordenados = automacao.reordenarDados(request.dados);
                automacao.processarDadosPopup(dadosReordenados);
            }
            sendResponse({status: 'success'});
        }
        if (request.action === 'iniciarAutomacao') {
            if (automacao.dados.totalRegistros > 0) {
                automacao.executarTodosCadastros();
                sendResponse({status: 'success'});
            } else {
                sendResponse({status: 'error', message: 'Nenhum dado carregado'});
            }
        }
        if (request.action === 'pararAutomacao') {
            automacao.podeParar = true;
            sendResponse({status: 'success'});
        }
        if (request.action === 'getStatus') {
            sendResponse({
                status: automacao.estaExecutando ? 'executando' : 'parado',
                total: automacao.dados.totalRegistros,
                atual: automacao.dados.indiceAtual
            });
        }
        if (request.action === 'togglePopup') {
            automacao.togglePopup();
            sendResponse({status: 'success'});
        }
        return true;
    });
    
    inicializar();
    
})();