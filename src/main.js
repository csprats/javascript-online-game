import { Player } from "./player";

// Variables de estado del juego
let players = [];
let assignedPlayerId = null; // Usamos un ID en lugar de un índice para ser más robustos
let mx = 0;
let my = 0;
let lastUpdate = 0;

// Configuración del canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Función de redimensionamiento del canvas
const resize = () => {
    canvas.width = window.innerWidth - 20;
    canvas.height = window.innerHeight - 20;
};
resize();
window.addEventListener('resize', resize);

// Obtiene todos los jugadores del servidor y los actualiza localmente
const fetchPlayers = async () => {
    try {
        const response = await fetch('http://localhost:3001/online-game');
        if (!response.ok) {
            throw new Error('Error al obtener datos de los jugadores.');
        }
        const data = await response.json();
        players = data.map(p => new Player(p.x, p.y, p.id, p.using));

        // Intenta asignar un jugador si aún no hay uno
        if (assignedPlayerId === null) {
            const freePlayer = players.find(p => !p.using);
            if (freePlayer) {
                assignedPlayerId = freePlayer.id;
                // Envía la actualización al servidor para marcarlo como 'en uso'
                updatePlayerState(assignedPlayerId, { using: true });
                console.log(`Jugador ${assignedPlayerId} asignado.`);
            }
            else {
                console.log('Sin jugadores libres, espectador')
            }
        }
    } catch (error) {
        console.error('Error en fetchPlayers:', error);
    }
};

// Actualiza un jugador en el servidor con los nuevos datos
const updatePlayerState = async (id, data) => {
    try {
        const response = await fetch(`http://localhost:3001/online-game/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`Error al actualizar el jugador ${id}.`);
        }
    } catch (error) {
        console.error('Error en updatePlayerState:', error);
    }
};


// Bucle principal: lógica y renderizado
const draw = () => {
    // 1. Limpia el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Dibuja a todos los jugadores
    players.forEach(p => p.draw(ctx));

    // 3. Lógica de movimiento y actualización del jugador local
    if (assignedPlayerId !== null && (mx !== 0 || my !== 0)) {
        const currentPlayer = players.find(p => p.id === assignedPlayerId);
        if (currentPlayer) {
            // Actualiza la posición local del jugador
            currentPlayer.x += mx;
            currentPlayer.y += my;

            // Envía la actualización al servidor para sincronizar
            updatePlayerState(currentPlayer.id, { x: currentPlayer.x, y: currentPlayer.y });
        }
    }

    // 4. Sincronización con el servidor
    const currentTime = Date.now();
    if (currentTime - lastUpdate > 1000 / 30) { // Sincroniza cada 30 ms (30 FPS)
        fetchPlayers();
        lastUpdate = currentTime;
    }
    
    // 5. Llama al siguiente fotograma
    requestAnimationFrame(draw);
};

// Manejo del movimiento del teclado
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'd': mx = 5; break;
        case 'a': mx = -5; break;
        case 'w': my = -5; break;
        case 's': my = 5; break;
    }
});

document.addEventListener('keyup', (e) => {
    // Detiene el movimiento solo para la tecla que se soltó
    if (e.key === 'd' || e.key === 'a') mx = 0;
    if (e.key === 'w' || e.key === 's') my = 0;
});

// Libera al jugador cuando el usuario cierra o recarga la página
window.addEventListener('beforeunload', () => {
    if (assignedPlayerId !== null) {
        // Usa `navigator.sendBeacon` para una llamada asíncrona no bloqueante
        const data = { using: false };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon(`http://localhost:3001/online-game/${assignedPlayerId}`, blob);
    }
});

// Iniciar el juego
fetchPlayers().then(() => {
    draw();
});