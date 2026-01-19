function openSensorModal() {
    document.getElementById('sensorModal').style.display = 'flex';
}

function closeSensorModal() {
    document.getElementById('sensorModal').style.display = 'none';
}

document.getElementById('sensorForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const userData = JSON.parse(localStorage.getItem('data'));

    if (!userData || !userData.id) {
        alert('Usuário não autenticado');
        window.location.href = '/';
        return;
    }

    const userId = userData.id;
    console.log('User ID:', userId);

    try {
        const response = await fetch(`/sensors/add?user_id=${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sensor_name: document.getElementById('deviceId').value,
                latitude: parseFloat(document.getElementById('latitude').value),
                longitude: parseFloat(document.getElementById('longitude').value),
                equip: document.getElementById('equipmentType').value,
                host: document.getElementById('host').value
            })
        });

        if (!response.ok) {
            const err = await response.json();
            alert(err.detail || 'Erro ao cadastrar sensor');
            return;
        }

        const data = await response.json();
        console.log('Sensor criado:', data);

        closeSensorModal();
        document.getElementById('sensorForm').reset();

    } catch (error) {
        console.error('Erro de conexão:', error);
        alert('Erro ao conectar com o servidor');
    }
});