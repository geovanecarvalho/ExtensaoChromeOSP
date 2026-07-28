// ============================================
// POPUP - Automação de Serviços/Materiais
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ===== ELEMENTOS =====
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileRows = document.getElementById('fileRows');
    const previewContainer = document.getElementById('previewContainer');
    const previewContent = document.getElementById('previewContent');
    const previewInfo = document.getElementById('previewInfo');
    const statsContainer = document.getElementById('statsContainer');
    const totalRows = document.getElementById('totalRows');
    const totalCols = document.getElementById('totalCols');
    const statusCount = document.getElementById('statusCount');
    const btnExecutar = document.getElementById('btnExecutar');
    const btnLimpar = document.getElementById('btnLimpar');
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');
    
    // ===== VARIÁVEIS =====
    let dadosCarregados = [];
    
    // ===== FUNÇÕES =====
    
    function setStatus(texto, tipo = 'ready') {
        statusText.textContent = texto;
        statusIndicator.className = 'status-indicator ' + tipo;
    }
    
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    function showPreview(data) {
        if (!data || data.length === 0) {
            previewContainer.style.display = 'none';
            return;
        }
        
        previewContainer.style.display = 'block';
        const headers = Object.keys(data[0]);
        const maxRows = Math.min(10, data.length); // Mostra até 10 linhas
        
        // Atualiza info
        previewInfo.textContent = `${data.length} linhas, mostrando ${maxRows}`;
        
        // Calcula largura das colunas
        const colWidth = Math.max(80, Math.floor(600 / headers.length));
        
        let html = `<table>`;
        
        // Cabeçalho
        html += '<thead><tr>';
        headers.forEach(h => {
            html += `<th style="min-width: ${colWidth}px;">${h}</th>`;
        });
        html += '</tr></thead>';
        
        // Dados
        html += '<tbody>';
        for (let i = 0; i < maxRows; i++) {
            html += '<tr>';
            headers.forEach(h => {
                let value = data[i][h] || '';
                // Trunca valores longos
                if (value.length > 30) {
                    value = value.substring(0, 27) + '...';
                }
                html += `<td title="${data[i][h] || ''}">${value}</td>`;
            });
            html += '</tr>';
        }
        html += '</tbody></table>';
        
        previewContent.innerHTML = html;
    }
    
    function processarDados(data) {
        if (!data || data.length === 0) {
            setStatus('⚠️ Nenhum dado encontrado', 'error');
            return;
        }
        
        // Mapeia as colunas
        const colunasEsperadas = [
            'ID', 'PRANCHA', 'CLASSE', 'MARACODE', 'ITEM',
            'QTD SERVICO EXECUTADO', 'PESQUISA MATERIAL',
            'MATERIAL', 'QTD MATERIAL', 'LOCAL EXECUCAO OBRA'
        ];
        
        const headers = Object.keys(data[0]);
        const colunasEncontradas = colunasEsperadas.filter(col => 
            headers.some(h => h.toUpperCase() === col.toUpperCase())
        );
        
        if (colunasEncontradas.length < 3) {
            setStatus('⚠️ Colunas não encontradas. Verifique o arquivo.', 'error');
            return;
        }
        
        dadosCarregados = data.map(row => {
            const obj = {};
            colunasEsperadas.forEach(col => {
                const key = headers.find(h => h.toUpperCase() === col.toUpperCase());
                obj[col] = key ? row[key] : '';
            });
            return obj;
        });
        
        // Atualiza interface
        fileInfo.style.display = 'block';
        fileName.textContent = fileInput.files[0]?.name || 'arquivo.xlsx';
        fileSize.textContent = fileInput.files[0] ? ` - ${formatFileSize(fileInput.files[0].size)}` : '';
        fileRows.textContent = `${dadosCarregados.length} linhas`;
        
        totalRows.textContent = dadosCarregados.length;
        totalCols.textContent = colunasEncontradas.length;
        statsContainer.style.display = 'flex';
        statusCount.textContent = '✅';
        
        showPreview(dadosCarregados);
        btnExecutar.disabled = false;
        setStatus(`✅ ${dadosCarregados.length} registros carregados`, 'ready');
        
        // Salva no storage
        chrome.storage.local.set({ dadosUltimos: dadosCarregados });
        
        // Envia para o content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'carregarDados',
                    dados: dadosCarregados
                });
            }
        });
    }
    
    // ===== EVENTOS =====
    
    // Upload de arquivo
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#28a745';
        uploadArea.style.background = '#f0fff4';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#dee2e6';
        uploadArea.style.background = 'white';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#dee2e6';
        uploadArea.style.background = 'white';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });
    
    fileInput.addEventListener('change', function(e) {
        const file = this.files[0];
        if (!file) return;
        
        setStatus('⏳ Processando...', 'running');
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                
                processarDados(jsonData);
                
            } catch (error) {
                setStatus('❌ Erro ao ler arquivo: ' + error.message, 'error');
                console.error('Erro:', error);
            }
        };
        reader.readAsArrayBuffer(file);
    });
    
    // Botão Executar
    btnExecutar.addEventListener('click', function() {
        if (dadosCarregados.length === 0) {
            setStatus('⚠️ Importe um arquivo primeiro!', 'error');
            return;
        }
        
        setStatus('🚀 Executando automação...', 'running');
        btnExecutar.disabled = true;
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'iniciarAutomacao'
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        setStatus('❌ Erro: ' + chrome.runtime.lastError.message, 'error');
                        btnExecutar.disabled = false;
                    }
                });
            }
        });
        
        // Habilita novamente após um tempo
        setTimeout(() => {
            btnExecutar.disabled = false;
            setStatus('✅ Em execução...', 'ready');
        }, 5000);
    });
    
    // Botão Limpar
    btnLimpar.addEventListener('click', function() {
        dadosCarregados = [];
        fileInfo.style.display = 'none';
        statsContainer.style.display = 'none';
        previewContainer.style.display = 'none';
        btnExecutar.disabled = true;
        fileInput.value = '';
        setStatus('🗑️ Dados limpos', 'ready');
        
        chrome.storage.local.remove('dadosUltimos');
    });
    
    // ===== INICIALIZA =====
    chrome.storage.local.get(['dadosUltimos'], function(result) {
        if (result.dadosUltimos && result.dadosUltimos.length > 0) {
            dadosCarregados = result.dadosUltimos;
            totalRows.textContent = dadosCarregados.length;
            totalCols.textContent = Object.keys(dadosCarregados[0] || {}).length;
            statsContainer.style.display = 'flex';
            btnExecutar.disabled = false;
            setStatus(`📊 ${dadosCarregados.length} registros carregados`, 'ready');
            
            showPreview(dadosCarregados);
            
            // Envia para o content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'carregarDados',
                        dados: dadosCarregados
                    });
                }
            });
        }
    });
    
    console.log('🔧 Popup de Automação carregado!');
});