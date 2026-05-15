const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DiscordRPC = require('discord-rpc');
const { io } = require('socket.io-client');

const clientId = '1504568681357775008';
let mainWindow;
let rpc;
let socket;
let isConnected = false;

const SERVER_URL = 'https://aerohubradar.com';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 550,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

DiscordRPC.register(clientId);

async function setupDiscordRPC() {
  if (rpc) {
    try { await rpc.destroy(); } catch (e) {}
  }
  rpc = new DiscordRPC.Client({ transport: 'ipc' });
  
  rpc.on('ready', () => {
    console.log('Discord RPC connected');
  });

  try {
    await rpc.login({ clientId });
  } catch (error) {
    console.error('Failed to connect to Discord:', error);
    if (mainWindow) {
      mainWindow.webContents.send('status-update', 'error', 'Erro ao conectar ao Discord. Verifique se está aberto.');
    }
  }
}

ipcMain.on('connect-radar', async (event, userId) => {
  if (isConnected) {
    if (socket) socket.disconnect();
  }

  await setupDiscordRPC();

  event.sender.send('status-update', 'connecting', 'A conectar ao servidor...');

  socket = io(`${SERVER_URL}/ws/rpc-status`, {
    transports: ['websocket'],
    reconnection: true
  });

  socket.on('connect', () => {
    isConnected = true;
    socket.emit('subscribe', userId);
    event.sender.send('status-update', 'waiting', '🟡 Conectado. A aguardar voo...');
  });

  socket.on('disconnect', () => {
    isConnected = false;
    event.sender.send('status-update', 'disconnected', '🔴 Desconectado do servidor');
    if (rpc) rpc.clearActivity();
  });

  socket.on('flight_status', (data) => {
    if (!data.is_flying) {
      event.sender.send('status-update', 'waiting', '🟡 A aguardar voo (sem voo ativo)...');
      if (rpc) rpc.clearActivity();
      return;
    }

    event.sender.send('status-update', 'flying', `🟢 Em Voo: ${data.callsign} (${data.origin} ✈ ${data.destination})`);
    
    if (rpc) {
      const detailsStr = `${data.origin} ✈ ${data.destination} | ${data.flight_phase}`;
      const stateStr = `Alt: ${data.altitude}ft | GS: ${data.groundSpeed}kts | ${data.callsign}`;
      
      const startTimestamp = data.start_time ? new Date(data.start_time) : new Date();

      rpc.setActivity({
        details: detailsStr,
        state: stateStr,
        startTimestamp,
        largeImageKey: 'logo_main',
        largeImageText: data.aircraft_icao,
        smallImageKey: 'logo_main',
        smallImageText: data.airline_name,
        instance: false,
        buttons: [
          {
            label: 'Ver Voo ao Vivo',
            url: `https://aerohubradar.com/flight/${data.callsign}`
          }
        ]
      }).catch(console.error);
    }
  });
});

ipcMain.on('disconnect-radar', (event) => {
  if (socket) {
    socket.disconnect();
  }
  if (rpc) {
    rpc.clearActivity().catch(console.error);
  }
  event.sender.send('status-update', 'disconnected', '🔴 Desconectado');
  isConnected = false;
});
