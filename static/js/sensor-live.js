const sideModal = document.getElementById('sensorSideModal');
let sensorCharts = {};
let sensorInterval = null;

async function visualizarSensor(sensorId) {
    const content = document.getElementById('sideModalContent');

    content.innerHTML = `
        <p><strong>Sensor:</strong> ${sensorId}</p>

        <div id="sensorFilter" style="margin-bottom:12px; display:flex; gap:8px; align-items:center;">
            <label>
                De:
                <input type="datetime-local" id="filterStart">
            </label>
            <label>
                Até:
                <input type="datetime-local" id="filterEnd">
            </label>
            <button id="applyFilter">Filtrar</button>
            <button id="clearFilter">Limpar</button>
        </div>

        <p id="noDataMsg" style="display:none; color:#777;">Nenhum dado disponível</p>

        <canvas id="rmsChart" width="400" height="150"></canvas>
        <canvas id="peakChart" width="400" height="150"></canvas>
    `;

    sideModal.style.display = 'flex';
    sideModal.classList.remove('expanded');

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24*60*60*1000);
    const filterStartInput = document.getElementById('filterStart');
    const filterEndInput = document.getElementById('filterEnd');

    filterStartInput.value = yesterday.toISOString().slice(0,16);
    filterEndInput.value = now.toISOString().slice(0,16);

    const fetchAndRender = async () => {
        await loadSensorData(sensorId, filterStartInput.value, filterEndInput.value);
    };

    document.getElementById('applyFilter').addEventListener('click', fetchAndRender);

    document.getElementById('clearFilter').addEventListener('click', () => {
        filterStartInput.value = yesterday.toISOString().slice(0,16);
        filterEndInput.value = now.toISOString().slice(0,16);
        fetchAndRender();
    });

    if (sensorInterval) clearInterval(sensorInterval);

    await fetchAndRender();

    sensorInterval = setInterval(fetchAndRender, 3000);
}

function toggleExpandSideModal() {
    sideModal.classList.toggle('expanded');
    if (sensorCharts.rms) sensorCharts.rms.resize();
    if (sensorCharts.peak) sensorCharts.peak.resize();
}

function closeSideModal() {
    sideModal.style.display = 'none';
    sideModal.classList.remove('expanded');
    if (sensorInterval) clearInterval(sensorInterval);
    sensorCharts = {};
}

async function loadSensorData(sensorId, start = null, end = null) {
    try {
        const userData = JSON.parse(localStorage.getItem('data'));
        let url = `/sensors/${userData.id}/${sensorId}/processed_data?limit=1000`;

        if (start) url += `&start=${new Date(start).toISOString()}`;
        if (end) url += `&end=${new Date(end).toISOString()}`;

        const response = await fetch(url);

        const noDataMsg = document.getElementById('noDataMsg');
        const rmsCanvas = document.getElementById('rmsChart');
        const peakCanvas = document.getElementById('peakChart');

        if (!response.ok) {
            noDataMsg.style.display = 'block';
            if (sensorCharts.rms) {
                sensorCharts.rms.data.labels = [];
                sensorCharts.rms.data.datasets[0].data = [];
                sensorCharts.rms.update();
            }
            if (sensorCharts.peak) {
                sensorCharts.peak.data.labels = [];
                sensorCharts.peak.data.datasets[0].data = [];
                sensorCharts.peak.update();
            }
            return;
        }

        const result = await response.json();
        const data = result.data;

        if (!data || data.length === 0) {
            noDataMsg.style.display = 'block';
            if (sensorCharts.rms) sensorCharts.rms.data.labels = [];
            if (sensorCharts.peak) sensorCharts.peak.data.labels = [];
            return;
        } else {
            noDataMsg.style.display = 'none';
        }

        const timestamps = data.map(d => new Date(d.timestamp).toLocaleTimeString());
        const rms = data.map(d => d.rms);
        const peak = data.map(d => d.peak);

        if (!sensorCharts.rms) {
            const ctx = rmsCanvas.getContext('2d');
            sensorCharts.rms = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: timestamps,
                    datasets: [{
                        label: 'RMS',
                        data: rms,
                        borderColor: '#2885F9',
                        backgroundColor: 'rgba(40, 133, 249, 0.2)',
                        tension: 0.2
                    }]
                },
                options: { animation: false, responsive: true }
            });
        } else {
            sensorCharts.rms.data.labels = timestamps;
            sensorCharts.rms.data.datasets[0].data = rms;
            sensorCharts.rms.update();
        }

        if (!sensorCharts.peak) {
            const ctx2 = peakCanvas.getContext('2d');
            sensorCharts.peak = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: timestamps,
                    datasets: [{
                        label: 'Peak',
                        data: peak,
                        borderColor: '#E53935',
                        backgroundColor: 'rgba(229, 57, 53, 0.2)',
                        tension: 0.2
                    }]
                },
                options: { animation: false, responsive: true }
            });
        } else {
            sensorCharts.peak.data.labels = timestamps;
            sensorCharts.peak.data.datasets[0].data = peak;
            sensorCharts.peak.update();
        }

    } catch (error) {
        console.error('Erro ao carregar dados do sensor:', error);
    }
}
