const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Inicialización del cliente con guardado de sesión local
const client = new Client({
    authStrategy: new LocalAuth()
});

// Estructura para almacenar el estado de cada usuario (Menú interactivo)
const userSessions = {};

// 1. Mostrar código QR en la consola para conectar WhatsApp
client.on('qr', (qr) => {
    console.log('Escanea este código QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
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