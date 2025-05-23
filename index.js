const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const WebSocket = require('ws');
const http = require('http');
const fetch = require('node-fetch');
const { OpenAI } = require('openai');


require('dotenv').config();

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;  
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const deepgram = createClient(DEEPGRAM_API_KEY);

const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
const openai = new OpenAIA(configuration);

wss.on('connection', async (ws) => {
  console.log('Client connected');  

  const dgConnection = deepgram.listen.live({
    language: "en",
    model: 'nova',
    interim_results: true,
    punctuate: true,
    encoding: 'linear16',
    sample_rate: 16000,
    channels: 1,
  });

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log('Deepgram connection opened');
    dgConnection.on(LiveTranscriptionEvents.Transcript, (msg) => {
    const transcript = msg.channel?.alternatives?.[0]?.transcript;
    if (transcript) {
      console.log('Transcript:', transcript);
      ws.send(JSON.stringify({ type: 'transcript', text: transcript }));

      try {
        const completion = openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful voice assistant.' },
            { role: 'user', content: transcript },
          ],
        });

        const reply = completion.data.choices[0].message.content;
        ws.send(JSON.stringify({ type: 'gpt', text: reply }));
      } catch (err) {
        console.error('GPT error:', err);
      }
    }
  });


      dgConnection.addListener(LiveTranscriptionEvents.Close, async () => {
        console.log("deepgram: disconnected");
        //clearInterval(keepAlive);
        dgConnection.finish();
      });
  
      dgConnection.addListener(LiveTranscriptionEvents.Error, async (error) => {
        console.log("deepgram: error received");
        console.error(error);
      });
  
      dgConnection.addListener(LiveTranscriptionEvents.Warning, async (warning) => {
        console.log("deepgram: warning received");
        console.warn(warning);
      });
  

      dgConnection.addListener(LiveTranscriptionEvents.Metadata, (data) => {
        console.log("deepgram: packet received");
        console.log("deepgram: metadata received");
        console.log("ws: metadata sent to client"), JSON.stringify(data);
        ws.send(JSON.stringify({ metadata: data }));
      });
  });
  


  ws.on('message', (audio) => {
    console.log('Received audio chunk from client', Buffer.byteLength(audio), ' bytes');
    if (dgConnection.getReadyState() === 1) {
        dgConnection.send(audio);
      }
  });

  ws.on('close', () => {
    dgConnection.requestClose();
    console.log('Client disconnected');
  });
});

server.listen(8000, () => {
  console.log('Server running on http://localhost:8000');
});
