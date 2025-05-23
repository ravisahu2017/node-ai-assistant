// File: server/index.js
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { getTogetherReply } = require('./ai/togetherAI');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

dotenv.config();
const app = express();
app.use(cors());

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const deepgram = createClient(DEEPGRAM_API_KEY);
const AI_API_KEY = process.env.TOGETHER_API_KEY;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Deepgram connection configuration
const deepgramConfig = {
  language: "en",
  model: 'nova',
  encoding: 'linear16',
  sample_rate: 16000,
  channels: 1,
  interim_results: true,
  punctuate: true,
};

function createDeepgramConnection(ws) {
  console.log('Creating new Deepgram connection');
  const dgConnection = deepgram.listen.live(deepgramConfig);

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log('Deepgram connection opened');
    ws.send(JSON.stringify({ type: 'dgConnected' }));
  });

  dgConnection.on(LiveTranscriptionEvents.Transcript, async (msg) => {
    const transcript = msg.channel?.alternatives?.[0]?.transcript;
    if (!transcript) return;

    console.log('Transcript:', transcript);
    ws.send(JSON.stringify({ type: 'transcript', text: transcript }));

    try {
      const reply = await getTogetherReply(transcript, AI_API_KEY);
      ws.send(JSON.stringify({ type: 'tts', text: reply }));
    } catch (err) {
      console.error('AI error:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'AI service error' }));
    }
  });

  dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error('Deepgram error:', err);
    ws.send(JSON.stringify({ type: 'error', message: 'Deepgram error occurred' }));
  });

  dgConnection.on(LiveTranscriptionEvents.Close, (e) => {
    console.warn('Deepgram WS closed:', e.code, e.reason);
    socket.send(JSON.stringify({ type: 'dgDisconnected' }));
    
    // Only attempt reconnection if WebSocket is still open
    if (ws.readyState === WebSocket.OPEN) {
      console.log('Attempting to reconnect to Deepgram...');
      ws.send(JSON.stringify({ type: 'status', message: 'Reconnecting to Deepgram...' }));
      
      // Add a small delay before reconnecting to avoid rapid reconnection loops
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const newConnection = createDeepgramConnection(ws);
          ws.dgConnection = newConnection;
        }
      }, 10);
    }
  });

  return dgConnection;
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Create initial Deepgram connection
  ws.dgConnection = createDeepgramConnection(ws);

  ws.on('message', (audio) => {
    if (ws.dgConnection && ws.dgConnection.getReadyState() === 1) {
      ws.dgConnection.send(audio);
    } else {
      console.log('Deepgram connection not ready, buffering audio...');
      // Optionally implement audio buffering here if needed
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (ws.dgConnection) {
      ws.dgConnection.finish();
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    if (ws.dgConnection) {
      ws.dgConnection.finish();
    }
  });
});

server.listen(8000, () => {
  console.log('Server running on http://localhost:8000');
});