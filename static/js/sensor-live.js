async function visualizarSensor(sensorId) {
    const userData = JSON.parse(localStorage.getItem('data'));
    if (!userData || !userData.id) return;

    const modal = document.getElementById('sensorDataModal');
    const content = document.getElementById('sensorDataContent');
    modal.classList.add('active');
    content.innerHTML = '<p>Carregando dados...</p>';

    try {
        const response = await fetch(`/sensors/${userData.id}/${sensorId}/processed_data?limit=50`);
        if (!response.ok) throw new Error('Falha ao carregar dados');

        const data = await response.json();

        if (!data.data || data.data.length === 0) {
            content.innerHTML = '<p>Nenhum dado disponível</p>';
            return;
        }

        // Gerar tabela HTML simples com algumas métricas
        let html = `<table style="width:100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th>Timestamp</th>
                    <th>RMS</th>
                    <th>Peak</th>
                    <th>Crest Factor</th>
                    <th>Kurtosis</th>
                </tr>
            </thead>
            <tbody>`;

        data.data.forEach(row => {
            html += `<tr>
                <td>${new Date(row.timestamp).toLocaleString()}</td>
                <td>${row.rms.toFixed(2)}</td>
                <td>${row.peak.toFixed(2)}</td>
                <td>${row.crest_factor.toFixed(2)}</td>
                <td>${row.kurtosis.toFixed(2)}</td>
            </tr>`;
        });

        html += '</tbody></table>';

        content.innerHTML = html;

    } catch (err) {
        console.error(err);
        content.innerHTML = `<p style="color:red;">Erro ao carregar dados do sensor</p>`;
    }
}

function closeSensorDataModal() {
    const modal = document.getElementById('sensorDataModal');
    modal.classList.remove('active');
}
