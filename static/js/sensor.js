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

    const formData = new FormData();

    formData.append("sensor_name", document.getElementById('deviceId').value);
    formData.append("latitude", document.getElementById('latitude').value);
    formData.append("longitude", document.getElementById('longitude').value);
    formData.append("equip", document.getElementById('equipmentType').value);
    formData.append("host", document.getElementById('host').value);
    formData.append("user_id", userData.id);  
     
    const imageInput = document.getElementById('image');
    if (imageInput.files.length > 0) {
        formData.append("image", imageInput.files[0]);
    }

    const response = await fetch('/sensors/add', { 
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const err = await response.json();
        console.error(err);
        alert(JSON.stringify(err.detail));
        return;
    }

    const data = await response.json();
    console.log('Sensor criado:', data);

    closeSensorModal();
    document.getElementById('sensorForm').reset();

    setTimeout(() => {
    window.location.reload();
    }, 800);
});
