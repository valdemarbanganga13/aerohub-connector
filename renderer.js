const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const userIdInput = document.getElementById('userId');
const statusText = document.getElementById('statusText');

let isConnected = false;

connectBtn.addEventListener('click', () => {
    const userId = userIdInput.value.trim();
    if (!userId) {
        alert('Por favor, insira o seu Infinite Flight ID ou Callsign.');
        return;
    }

    userIdInput.disabled = true;
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'block';

    window.electronAPI.connectRadar(userId);
});

disconnectBtn.addEventListener('click', () => {
    window.electronAPI.disconnectRadar();
    userIdInput.disabled = false;
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
});

window.electronAPI.onStatusUpdate((type, message) => {
    statusText.textContent = message;
    
    // Reset classes
    statusText.className = 'status';
    
    if (type === 'disconnected') {
        statusText.classList.add('disconnected');
    } else if (type === 'flying') {
        statusText.classList.add('flying');
    } else if (type === 'waiting' || type === 'connecting') {
        statusText.classList.add('waiting');
    } else if (type === 'error') {
        statusText.classList.add('error');
        // Reset UI on error
        userIdInput.disabled = false;
        connectBtn.style.display = 'block';
        disconnectBtn.style.display = 'none';
    }
});
