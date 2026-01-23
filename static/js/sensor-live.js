// sensor-live.js
// Garantir que as variáveis sejam globais
window.sensorCharts = {};
window.sensorInterval = null;

// Função principal para visualizar sensor
window.visualizarSensor = async function(sensorId) {
    const sideModal = document.getElementById('sensorSideModal');
    const content = document.getElementById('sideModalContent');
    
    console.log('visualizarSensor chamado para sensor:', sensorId);
    
    content.innerHTML = `
        <p><strong>Sensor:</strong> ${sensorId}</p>

        <div id="sensorFilter" style="margin-bottom:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <label style="display:flex; flex-direction:column; font-size:12px;">
                De:
                <input type="datetime-local" id="filterStart">
            </label>
            <label style="display:flex; flex-direction:column; font-size:12px;">
                Até:
                <input type="datetime-local" id="filterEnd">
            </label>
            <button id="applyFilter" style="background:#1e88e5; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:bold;">Filtrar</button>
            <button id="clearFilter" style="background:#757575; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:bold;">Limpar</button>
        </div>

        <p id="noDataMsg" style="display:none; color:#777;">Nenhum dado disponível</p>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px;">
            <!-- Aceleração -->
            <div style="grid-column: span 2;">
                <h4 style="margin: 4px 0; font-size: 14px;">Aceleração</h4>
                <canvas id="accelChart" width="400" height="150"></canvas>
            </div>

            <!-- Temperatura -->
            <div>
                <h4 style="margin: 4px 0; font-size: 14px;">Temperatura</h4>
                <canvas id="tempChart" width="400" height="150"></canvas>
            </div>

            <!-- FFT -->
            <div>
                <h4 style="margin: 4px 0; font-size: 14px;">FFT (Eixo Z)</h4>
                <canvas id="fftChart" width="800" height="200"></canvas>
            </div>
            
        </div>
    `;

    sideModal.style.display = 'flex';
    sideModal.classList.remove('expanded');

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const filterStartInput = document.getElementById('filterStart');
    const filterEndInput = document.getElementById('filterEnd');

    filterStartInput.value = yesterday.toISOString().slice(0, 16);
    filterEndInput.value = now.toISOString().slice(0, 16);

    const fetchAndRender = async () => {
        await loadSensorData(sensorId, filterStartInput.value, filterEndInput.value);
    };

    document.getElementById('applyFilter').addEventListener('click', fetchAndRender);

    document.getElementById('clearFilter').addEventListener('click', () => {
        filterStartInput.value = yesterday.toISOString().slice(0, 16);
        filterEndInput.value = now.toISOString().slice(0, 16);
        fetchAndRender();
    });

    if (window.sensorInterval) clearInterval(window.sensorInterval);

    await fetchAndRender();

    window.sensorInterval = setInterval(fetchAndRender, 2000);
};

// Função para carregar dados do sensor
async function loadSensorData(sensorId, start = null, end = null) {
    try {
        const userData = JSON.parse(localStorage.getItem('data'));
        if (!userData) {
            console.error('Usuário não autenticado');
            return;
        }
        
        // Buscar dados processados
        let processedUrl = `/sensors/${userData.id}/${sensorId}/processed_data?limit=1000`;
        if (start) processedUrl += `&start=${new Date(start).toISOString()}`;
        if (end) processedUrl += `&end=${new Date(end).toISOString()}`;

        // Buscar dados brutos
        const bucketMs = 1000; // 1 ponto por segundo (ajuste depois)

        let rawUrl = `/sensors/${userData.id}/${sensorId}/raw_data?bucket_ms=${bucketMs}`;

        if (start) rawUrl += `&start=${new Date(start).toISOString()}`;
        if (end) rawUrl += `&end=${new Date(end).toISOString()}`;

        console.log('URLs para fetch:', { processedUrl, rawUrl });

        // Fazer ambas as requisições em paralelo
        const [processedResponse, rawResponse] = await Promise.all([
            fetch(processedUrl).catch(err => {
                console.error('Erro ao buscar dados processados:', err);
                return { ok: false };
            }),
            fetch(rawUrl).catch(err => {
                console.error('Erro ao buscar dados brutos:', err);
                return { ok: false };
            })
        ]);

        const noDataMsg = document.getElementById('noDataMsg');
        
        if (!processedResponse.ok && !rawResponse.ok) {
            if (noDataMsg) noDataMsg.style.display = 'block';
            console.error('Ambas as requisições falharam');
            return;
        }

        let processedData = [];
        let rawData = [];

        if (processedResponse.ok) {
            try {
                const result = await processedResponse.json();
                processedData = result.data || [];
                console.log('Dados processados recebidos:', processedData.length);
            } catch (e) {
                console.error('Erro ao parsear dados processados:', e);
            }
        }

        if (rawResponse.ok) {
            const result = await rawResponse.json();
            rawData = result.data || result || [];
        }

        if (processedData.length === 0 && rawData.length === 0) {
            if (noDataMsg) noDataMsg.style.display = 'block';
            console.log('Nenhum dado disponível');
            return;
        } else {
            if (noDataMsg) noDataMsg.style.display = 'none';
        }

        // Preparar dados para gráficos
        if (processedData.length > 0) {
            renderProcessedCharts(processedData);
        }

        if (rawData.length > 0) {
            renderRawCharts(rawData);
        }

    } catch (error) {
        console.error('Erro ao carregar dados do sensor:', error);
    }
}

function renderProcessedCharts(data) {
    console.log('Renderizando gráficos processados:', data.length);

    const timestamps = data.map(d =>
        new Date(d.timestamp).toLocaleTimeString()
    );

    //const rms = data.map(d => d.rms);
    //const peak = data.map(d => d.peak);
    //const crest = data.map(d => d.crest_factor);

    let fftReal = null;

    if (
        data.length > 0 &&
        data[data.length - 1].fft_az &&
        Array.isArray(data[data.length - 1].fft_az.real)
    ) {
        fftReal = data[data.length - 1].fft_az.real;
        console.log('FFT REAL AZ:', fftReal.length);
    }

    // RMS
    // updateOrCreateChart('rmsChart', timestamps, rms, 'RMS', '#2885F9');

    // Peak
    // updateOrCreateChart('peakChart', timestamps, peak, 'Peak', '#E53935');

    // Crest
    // updateOrCreateChart('crestChart', timestamps, crest, 'Crest Factor', '#43A047');

    // FFT (REAL)
    if (fftReal && fftReal.length > 0) {
        const frequencies = Array.from(
            { length: fftReal.length },
            (_, i) => i
        );

        updateOrCreateChart(
            'fftChart',
            frequencies,
            fftReal,
            'FFT Real - AZ',
            '#7B1FA2',
            true
        );
    }
}


function updateOrCreateAccelBandChart(
    canvasId,
    labels,
    mean,
    min,
    max
) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');

    if (!window.sensorCharts[canvasId]) {
        window.sensorCharts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'AZ Máx',
                        data: max,
                        borderColor: 'rgba(33,150,243,0.3)',
                        backgroundColor: 'rgba(33,150,243,0.15)',
                        fill: '+1',
                        pointRadius: 0
                    },
                    {
                        label: 'AZ Mín',
                        data: min,
                        borderColor: 'rgba(33,150,243,0.3)',
                        backgroundColor: 'rgba(33,150,243,0.15)',
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'AZ Média',
                        data: mean,
                        borderColor: '#2196F3',
                        borderWidth: 1.5,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Hora' } },
                    y: { title: { display: true, text: 'Aceleração (g)' } }
                }
            }
        });
    } else {
        const chart = window.sensorCharts[canvasId];
        chart.data.labels = labels;
        chart.data.datasets[0].data = max;
        chart.data.datasets[1].data = min;
        chart.data.datasets[2].data = mean;
        chart.update();
    }
}


function renderRawCharts(data) {
    console.log('Renderizando gráficos RAW:', data.length);

    const timestamps = data.map(d =>
        new Date(d.timestamp).toLocaleTimeString()
    );

    // Detecta se é agregado
    const isAggregated = data[0].ax_mean !== undefined;

    if (isAggregated) {
        const azMean = data.map(d => d.az_mean);
        const azMin  = data.map(d => d.az_min);
        const azMax  = data.map(d => d.az_max);
        const temps  = data.map(d => d.temp);

        updateOrCreateAccelBandChart(
            'accelChart',
            timestamps,
            azMean,
            azMin,
            azMax
        );

        if (temps.some(t => t !== null && t !== undefined)) {
            updateOrCreateChart(
                'tempChart',
                timestamps,
                temps,
                'Temperatura (°C)',
                '#FF9800'
            );
        }

    } else {
        // fallback: bruto antigo
        const ax = data.map(d => d.ax);
        const ay = data.map(d => d.ay);
        const az = data.map(d => d.az);
        const temps = data.map(d => d.temp);

        updateOrCreateAccelChart('accelChart', timestamps, ax, ay, az);

        if (temps.some(t => t !== null && t !== undefined)) {
            updateOrCreateChart(
                'tempChart',
                timestamps,
                temps,
                'Temperatura (°C)',
                '#FF9800'
            );
        }
    }
}


function updateOrCreateAccelChart(canvasId, labels, axData, ayData, azData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas não encontrado:', canvasId);
        return;
    }

    const ctx = canvas.getContext('2d');
    
    if (!window.sensorCharts[canvasId]) {
        console.log('Criando novo chart de aceleração');
        window.sensorCharts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'AX',
                        data: axData,
                        borderColor: '#FF5722',
                        backgroundColor: 'rgba(255, 87, 34, 0.1)',
                        tension: 0.2,
                        borderWidth: 1,
                        fill: true
                    },
                    {
                        label: 'AY',
                        data: ayData,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.2,
                        borderWidth: 1,
                        fill: true
                    },
                    {
                        label: 'AZ',
                        data: azData,
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        tension: 0.2,
                        borderWidth: 1,
                        fill: true
                    }
                ]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Hora'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Aceleração (g)'
                        }
                    }
                }
            }
        });
    } else {
        console.log('Atualizando chart de aceleração');
        window.sensorCharts[canvasId].data.labels = labels;
        window.sensorCharts[canvasId].data.datasets[0].data = axData;
        window.sensorCharts[canvasId].data.datasets[1].data = ayData;
        window.sensorCharts[canvasId].data.datasets[2].data = azData;
        window.sensorCharts[canvasId].update();
    }
}

function updateOrCreateChart(canvasId, labels, data, label, color, isFFT = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!window.sensorCharts[canvasId]) {
        window.sensorCharts[canvasId] = new Chart(ctx, {
            type: 'line', // 👈 SEMPRE line
            data: {
                labels,
                datasets: [{
                    label,
                    data,
                    borderColor: color,
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    tension: isFFT ? 0 : 0.2, // FFT reta, tempo suave
                    pointRadius: isFFT ? 0 : 2,          // 👈 remove bolinhas
                    pointHoverRadius: isFFT ? 4 : 4,
                    pointBackgroundColor: color,
                    fill: false
                }]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,

            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false,
            },

                plugins: {
                    legend: { display: true }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: isFFT ? 'Frequência (Hz)' : 'Hora'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: label
                        }
                        // 👇 opcional (recomendado para FFT)
                        // type: 'logarithmic'
                    }
                }
            }
        }); 
    } else {
        const chart = window.sensorCharts[canvasId];
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    }
}


// Funções de controle do modal
window.toggleExpandSideModal = function() {
    const sideModal = document.getElementById('sensorSideModal');
    sideModal.classList.toggle('expanded');
    
    // Redimensionar todos os charts
    Object.values(window.sensorCharts).forEach(chart => {
        if (chart && chart.resize) {
            chart.resize();
        }
    });
};

window.closeSideModal = function() {
    const sideModal = document.getElementById('sensorSideModal');
    sideModal.style.display = 'none';
    sideModal.classList.remove('expanded');
    
    if (window.sensorInterval) {
        clearInterval(window.sensorInterval);
        window.sensorInterval = null;
    }
    
    // Destruir todos os charts
    Object.values(window.sensorCharts).forEach(chart => {
        if (chart && chart.destroy) {
            chart.destroy();
        }
    });
    window.sensorCharts = {};
};

// Função para depuração - verificar se o script carregou
console.log('sensor-live.js carregado com sucesso');