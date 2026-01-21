const equipIcons = {
    motor_eletrico: "/static/img/motor_eletrico.png",
    bomba_centrifuga: "/static/img/bomba_centrifuga.png",
    conjunto_motobomba: "/static/img/moto_bomba.png",
};

async function loadSensorsOnMap() {
    const userData = JSON.parse(localStorage.getItem('data'));

    if (!userData || !userData.id) {
        console.warn('Usuário não autenticado');
        return;
    }

    try {
        const response = await fetch(`/sensors/user/${userData.id}`);

        if (!response.ok) {
            console.warn('Nenhum sensor encontrado');
            return;
        }

        const sensors = await response.json();

        sensors.forEach(sensor => {
            const [lat, lng] = sensor.location.split(',').map(Number);

            const popupHtml = `
                <div style="
                    width:320px;
                    max-width:90vw;
                    font-family: Arial, sans-serif;
                ">

                    <!-- HEADER -->
                    <div style="
                        margin-bottom:8px;
                    ">
                        <span style="
                            background:#2885f9;
                            color:#ffffff;
                            font-size:13px;
                            font-weight:bold;
                            padding:4px 8px;
                            border-radius:4px;
                        ">
                            ✔ Em operação
                        </span>
                    </div>

                    <!-- BODY -->
                    <div style="
                        display:flex;
                        gap:10px;
                    ">

                        <!-- IMAGE -->
                        <div>
                            ${
                                sensor.image_url
                                ? `<a href="${sensor.image_url}" target="_blank">
                                        <img src="${sensor.image_url}" style="
                                            width:110px;
                                            height:110px;
                                            object-fit:cover;
                                            border-radius:8px;
                                            cursor:pointer;
                                        ">
                                   </a>`
                                : `<div style="
                                        width:110px;
                                        height:110px;
                                        background:#eee;
                                        border-radius:8px;
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        font-size:12px;
                                        color:#777;
                                    ">
                                        Sem imagem
                                    </div>`
                            }
                        </div>

                        <!-- INFO -->
                        <div style="flex:1;">
                            <div style="
                                font-size:16px;
                                font-weight:bold;
                                margin-bottom:4px;
                            ">
                                ${sensor.sensor_name}
                            </div>

                            <div style="
                                font-size:13px;
                                color:#555;
                                margin-bottom:6px;
                            ">
                                Equipamento: ${sensor.equip}
                            </div>

                            <div style="
                                font-size:13px;
                                color:#555;
                                margin-bottom:6px;
                            ">
                                Host: ${sensor.host}
                            </div>

                            <div style="
                                font-size:12px;
                                color:#777;
                            ">
                                Criado em:<br>
                                ${new Date(sensor.created_at).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <!-- FOOTER -->
                    <div style="
                        margin-top:12px;
                        text-align:center;
                    ">
                        <button
                            onclick="visualizarSensor('${sensor.id_sensor}')"
                            style="
                                background:#1e88e5;
                                color:white;
                                border:none;
                                padding:8px 14px;
                                border-radius:6px;
                                font-size:13px;
                                font-weight:bold;
                                cursor:pointer;
                            "
                        >
                            Visualizar dados do sensor
                            
                        </button>
                    </div>

                </div>
            `;

            // Determinar qual ícone usar baseado no equipamento
            let iconUrl;
            if (sensor.equip && equipIcons[sensor.equip]) {
                iconUrl = equipIcons[sensor.equip];
            } else {
                // Ícone padrão caso não encontre o equipamento
                iconUrl = "/static/img/motor_eletrico.png";
            }

            // Criar elemento HTML personalizado para o marcador
            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.style.cssText = `
                width: 32px;
                height: 32px;
                position: relative; /* importante */
            `;

            // Cria o ícone dentro do wrapper
            const icon = document.createElement('div');
            icon.style.cssText = `
                width: 32px;
                height: 32px;
                background-image: url('${iconUrl}');
                background-size: 20px 20px;
                background-repeat: no-repeat;
                background-position: center;
                border-radius: 50%;
                border: 2px solid #1E88E5;
                background-color: white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.25);
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            `;

            // Adiciona efeito hover no ícone interno
            icon.addEventListener('mouseenter', () => {
                icon.style.transform = 'scale(1.3)';
                icon.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
            });
            icon.addEventListener('mouseleave', () => {
                icon.style.transform = 'scale(1)';
                icon.style.boxShadow = '0 2px 5px rgba(0,0,0,0.25)';
            });

            // Adiciona o ícone ao wrapper
            el.appendChild(icon);

            // Cria o marcador Mapbox
            new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .setPopup(
                    new mapboxgl.Popup({ offset: 25, maxWidth: '400px' })
                        .setHTML(popupHtml)
                )
                .addTo(map);
        });

        updateMapStats(sensors);

    } catch (error) {
        console.error('Erro ao carregar sensores:', error);
    }
}

function updateMapStats(sensors) {
    document.getElementById('activeDevices').textContent =
        `${sensors.length} (${sensors.length > 0 ? '100%' : '0%'})`;

    document.getElementById('lastUpdate').textContent =
        new Date().toLocaleString();
}

/* Função placeholder para depois abrir gráfico / modal / rota */
const sideModal = document.getElementById('sensorSideModal');

function visualizarSensor(sensorId) {
    const content = document.getElementById('sideModalContent');
    content.innerHTML = `<p>Carregando dados do sensor ${sensorId}...</p>`;
    sideModal.style.display = 'flex'; // mostra modal
    sideModal.classList.remove('expanded'); // tamanho padrão
}

function closeSideModal() {
    sideModal.style.display = 'none'; // esconde modal
    sideModal.classList.remove('expanded'); // volta ao tamanho padrão
}

function toggleExpandSideModal() {
    sideModal.classList.toggle('expanded'); // alterna entre expandido e normal
}
