// src/config/openaiConfig.js
require('dotenv').config();

module.exports = {
  apiKey: process.env.OPENAI_API_KEY,
  assistantId: process.env.OPENAI_ASSISTANT_ID,
  timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10)
};