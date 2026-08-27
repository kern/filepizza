import { io } from 'socket.io-client';

const URL = 'http://localhost:8000';
const socket = io(URL, {
    autoConnect: true,
    transports: ['polling', 'websocket'],
});

socket.on('connect_error', (err) => {
    console.error("Socket Connection Error:", err);
});

export default socket;
