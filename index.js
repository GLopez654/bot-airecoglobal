const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcodeImage = require('qrcode');
const express = require('express');

// Configurar servidor web Express para mostrar el QR en una URL
const app = express();
const PORT = process.env.PORT || 8080;

let latestQR = '';

app.get('/', (req, res) => {
    if (!latestQR) {
        return res.send('<h2>El bot todavía no ha generado un código QR o ya está conectado. Actualiza en unos segundos.</h2>');
    }
    // Muestra el QR como imagen directamente en el navegador
    qrcodeImage.toDataURL(latestQR, (err, src) => {
        if (err) res.send('Error al generar la imagen del QR');
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: Arial;">
                <h2>Escanea este código QR para conectar el Bot de Airecoglobal</h2>
                <img src="${src}" alt="WhatsApp QR Code" style="width: 300px; height: 300px;" />
                <p>La página se actualizará automáticamente si hay cambios.</p>
            </div>
            <script>setTimeout(() => window.location.reload(), 10000);</script>
        `);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor web escuchando en el puerto ${PORT}`);
});

// Inicialización del cliente con configuración para Linux (Railway)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

// Estructura para almacenar el estado de cada usuario (Menú interactivo)
const userSessions = {};

// 1. Mostrar código QR en la consola y guardarlo para la web
client.on('qr', (qr) => {
    latestQR = qr;
    console.log('Escanea este código QR con tu WhatsApp o entra a tu URL pública /');
    qrcodeTerminal.generate(qr, { small: true });
    
    // Guarda también como archivo local opcional
    qrcodeImage.toFile('./qr.png', qr, (err) => {
        if (!err) console.log('Imagen del QR guardada como qr.png');
    });
});

client.on('ready', () => {
    latestQR = ''; // Limpiar QR al conectar
    console.log('🤖 Bot de Airecoglobal listo y conectado.');
});

// 2. Lógica principal del Bot
client.on('message', async (msg) => {
    const from = msg.from;
    const body = msg.body.trim().toLowerCase();

    // Inicializar sesión del usuario si no existe
    if (!userSessions[from]) {
        userSessions[from] = { step: 'START', isHuman: false };
    }

    const session = userSessions[from];

    // Si la atención fue transferida a un humano, el bot no responde
    if (session.isHuman) {
        if (body === '#salir') {
            session.isHuman = false;
            session.step = 'START';
            await msg.reply('🤖 *Bot reactivado.* Escribe *Hola* para ver el menú principal.');
        }
        return;
    }

    // Flujo de respuestas según el estado actual
    if (session.step === 'START' || body === 'hola' || body === 'menu') {
        session.step = 'MENU';
        await msg.reply(
            `¡Hola! Bienvenid@ a *Airecoglobal* ❄️⚡\n` +
            `Es un gusto saludarte. Por favor responde con el *número* de la opción que necesitas:\n\n` +
            `1️⃣ Cotizar un servicio\n` +
            `2️⃣ Consultas técnicas / Soporte\n` +
            `3️⃣ Estado de una solicitud\n` +
            `4️⃣ Hablar con un asesor`
        );
        return;
    }

    if (session.step === 'MENU') {
        switch (body) {
            case '1':
                await msg.reply(
                    `*Cotizaciones - Airecoglobal* 📋\n\n` +
                    `Por favor indícanos:\n` +
                    `• Nombre o Empresa\n` +
                    `• Servicio requerido (Climatización, Energía Solar, Soporte Logístico, etc.)\n` +
                    `• Ciudad / Ubicación`
                );
                session.step = 'AWAITING_QUOTE_INFO';
                break;

            case '2':
                await msg.reply(
                    `*Soporte Técnico* 🛠️\n\n` +
                    `Nuestro horario de atención técnica es de Lunes a Viernes de 8:00 AM a 5:00 PM.\n` +
                    `Déjanos tu requerimiento detallado y te responderemos en breve.`
                );
                break;

            case '3':
                await msg.reply(`*Consulta de Solicitud* 🔎\n\nPor favor digita tu número de Orden, Contrato o NIT.`);
                break;

            case '4':
                session.isHuman = true;
                await msg.reply(
                    `👤 *Transferiendo con un asesor...*\n\n` +
                    `Un miembro de nuestro equipo tomará el control de este chat a partir de este momento. El bot automático se ha pausado.\n\n` +
                    `*(Escribe #salir si deseas volver al menú automático)*`
                );
                break;

            default:
                await msg.reply(`❌ Opción no válida. Por favor responde marcando un número del *1 al 4*, o escribe *Hola*.`);
                break;
        }
    } else if (session.step === 'AWAITING_QUOTE_INFO') {
        await msg.reply(`✅ *Gracias por la información.* Hemos registrado tus datos. Un asesor comercial revisará tu requerimiento a la brevedad.`);
        session.step = 'MENU';
    }
});

client.initialize();