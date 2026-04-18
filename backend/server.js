const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.set('trust proxy', true);

// Setup MongoDB Model (if using MongoDB)
const pollSchema = new mongoose.Schema({
  options: {
    ADMK: { type: Number, default: 0 },
    DMK: { type: Number, default: 0 },
    NTK: { type: Number, default: 0 },
    TVK: { type: Number, default: 0 },
    Others: { type: Number, default: 0 }
  },
  voters: [{ type: String }]
});
const Poll = mongoose.model('Poll', pollSchema);

const DB_FILE = path.join(__dirname, 'database.json');
let useMongo = false;

// Initialize Database Function
const initDB = async () => {
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Connected to MongoDB successfully');
      useMongo = true;
      
      const count = await Poll.countDocuments();
      if (count === 0) {
        await Poll.create({
          options: { ADMK: 0, DMK: 0, NTK: 0, TVK: 0, Others: 0 },
          voters: []
        });
        console.log('Created initial poll document in MongoDB');
      }
      return;
    } catch (err) {
      console.error('MongoDB connection error, falling back to local JSON:', err);
    }
  }

  // Fallback to local JSON Database
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
  if (useMongo) {
    return await Poll.findOne();
  }
  const data = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(data);
};

const writeDB = async (data, mongoDoc = null) => {
  if (useMongo && mongoDoc) {
    await mongoDoc.save();
  } else {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
  }
};

// API Routes
app.get('/api/poll', async (req, res) => {
  try {
    const poll = await readDB();
    res.json(poll);
  } catch (err) {
    console.error(err);
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
      // Create plain duplicate for socket to avoid emitting Mongoose meta
      const emitData = useMongo ? poll.toObject() : poll;
      
      poll.options[option] += 1;
      poll.voters.push(voterId);
      
      await writeDB(poll, useMongo ? poll : null);

      if (useMongo) {
        emitData.options[option] += 1;
        emitData.voters.push(voterId);
      }

      // Broadcast updated poll
      io.emit('pollUpdate', useMongo ? emitData : poll);
      res.json({ message: 'Vote recorded', poll: useMongo ? emitData : poll });
    } else {
      res.status(400).json({ error: 'Invalid option' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
