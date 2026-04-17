const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.set('trust proxy', true);

const DB_FILE = path.join(__dirname, 'database.json');

// Initialize local JSON DB
const initDB = async () => {
  try {
    await fs.access(DB_FILE);
    console.log('Using existing local database.json');
  } catch (error) {
    const defaultData = {
      options: { ADMK: 0, DMK: 0, NTK: 0, TVK: 0, Others: 0 },
      voters: []
    };
    await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2));
    console.log('Created new local database.json');
  }
};
initDB();

const readDB = async () => {
  const data = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeDB = async (data) => {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
};

// API Routes
app.get('/api/poll', async (req, res) => {
  try {
    const poll = await readDB();
    res.json(poll);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.post('/api/vote', async (req, res) => {
  try {
    const { option, userIdentifier } = req.body;
    const ipInfo = req.ip || req.connection?.remoteAddress || 'unknown';
    const voterId = userIdentifier || ipInfo;

    const poll = await readDB();
    
    // Checking duplicate voter
    if (poll.voters.includes(voterId)) {
      return res.status(400).json({ error: 'You have already voted!' });
    }

    if (poll.options[option] !== undefined) {
      poll.options[option] += 1;
      poll.voters.push(voterId);
      
      await writeDB(poll);

      // Broadcast updated poll
      io.emit('pollUpdate', poll);
      res.json({ message: 'Vote recorded', poll });
    } else {
      res.status(400).json({ error: 'Invalid option' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
