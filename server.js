require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const CALLER_ID = process.env.TELNYX_CALLER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 📞 1️⃣ Webhook para llamadas entrantes
app.post('/webhook', async (req, res) => {
    const { from } = req.body;
    console.log(`📞 Llamada entrante de: ${from}`);

    // Responder con un mensaje de voz usando Telnyx
    res.json({
        commands: [{ speak: { text: "Hola, bienvenido a nuestro sistema. ¿En qué puedo ayudarte?" } }]
    });
});

// 📞 2️⃣ API para realizar llamadas salientes
app.post('/llamada-saliente', async (req, res) => {
    const { to } = req.body;

    try {
        const response = await axios.post("https://api.telnyx.com/v2/calls", {
            connection_id: process.env.TELNYX_CONNECTION_ID,
            to: to,
            from: CALLER_ID,
            webhook_url: "https://tu-servidor.herokuapp.com/webhook"
        }, {
            headers: { Authorization: `Bearer ${TELNYX_API_KEY}` }
        });

        res.json({ status: "Llamada iniciada", call_id: response.data.data.call_control_id });
    } catch (error) {
        console.error("❌ Error al iniciar la llamada:", error.response?.data || error.message);
        res.status(500).json({ error: "No se pudo iniciar la llamada" });
    }
});

// 🎙️ 3️⃣ Generar voz neuronal con OpenAI
app.post('/voz-neuronal', async (req, res) => {
    const { texto } = req.body;

    try {
        const response = await axios.post("https://api.openai.com/v1/audio/speech", {
            model: "tts-1",
            input: texto,
            voice: "alloy"
        }, {
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
        });

        res.json({ audio_url: response.data.url });
    } catch (error) {
        console.error("❌ Error al generar voz neuronal:", error.response?.data || error.message);
        res.status(500).json({ error: "No se pudo generar la voz" });
    }
});

// 🧠 4️⃣ Consultar IA (NUEVA RUTA AGREGADA)
app.post('/ia', async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: "Debes enviar una pregunta en el cuerpo de la petición." });
    }

    try {
        const openaiResponse = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: question }],
                temperature: 0.7,
                max_tokens: 100
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const answer = openaiResponse.data.choices[0].message.content;

        res.json({ answer });

    } catch (error) {
        console.error("❌ Error en la solicitud a OpenAI:", error.response?.data || error.message);
        res.status(500).json({ error: "Error al procesar la solicitud con OpenAI." });
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));