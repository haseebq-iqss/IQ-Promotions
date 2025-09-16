import { BrowserWindow, app } from 'electron';

const create_window = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: true }
    });

    win.loadFile("client/views/index.html");
    const animation_timeout = setTimeout(() => {
        win.maximize();
        return clearTimeout(animation_timeout);
    }, 1750);

    // -- for dev mode
    // win.webContents.openDevTools();
};

app.whenReady().then(() => {
    create_window();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});