(function() {
    // Configuration
    const SERVER_URL = window.location.origin; // In a real scenario, this would be your deployed app URL
    const SOCKET_IO_SCRIPT = "https://cdn.socket.io/4.7.2/socket.io.min.js";

    function init() {
        const socket = io(SERVER_URL);
        
        // Create the UI element
        const widget = document.createElement('div');
        widget.id = 'visitor-counter-widget';
        widget.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 10px 20px;
            border-radius: 50px;
            font-family: sans-serif;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        `;
        widget.innerHTML = `
            <span style="width: 8px; height: 8px; background: white; border-radius: 50%; display: inline-block; animation: pulse 2s infinite;"></span>
            <span id="visitor-count-text">Calculando...</span>
        `;

        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulse {
                0% { transform: scale(0.95); opacity: 0.5; }
                50% { transform: scale(1.05); opacity: 1; }
                100% { transform: scale(0.95); opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(widget);

        socket.on('connect', () => {
            socket.emit('join-page', window.location.pathname);
        });

        socket.on('update-count', (data) => {
            if (data.pagePath === window.location.pathname) {
                document.getElementById('visitor-count-text').innerText = `${data.count} online agora`;
            }
        });
    }

    // Load Socket.IO if not already present
    if (typeof io === 'undefined') {
        const script = document.createElement('script');
        script.src = SOCKET_IO_SCRIPT;
        script.onload = init;
        document.head.appendChild(script);
    } else {
        init();
    }
})();
