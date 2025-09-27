const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const cors = require('cors');
const rate = require('express-rate-limit');
const db = require('./database');

const app = express();

// Redis client setup
const redisClient = redis.createClient({
  url: 'redis://default:tFBRcqRXLGiMWYJfEaIvwcsqCUgFTpEY@gondola.proxy.rlwy.net:45377'
});
redisClient.on('error', err => console.error('Redis Client Error:', err));
redisClient.connect().catch(console.error);

// CORS setup
app.use(cors({
  origin: 'https://testfinal-production.up.railway.app',
  credentials: true
}));
app.options('*', cors()); // Handle preflight

app.use(express.json());

// Session setup
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'a9a7A6A7',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none'
  }
}));

// Protect non-fetch requests
app.use("/", (req, res, next) => {
  const isFetch = req.headers['sec-fetch-mode'] === 'cors' || req.headers['x-requested-with'] === 'XMLHttpRequest';
  if (!isFetch) {
    return res.status(403).send("You Don't Have Access !!");
  }
  next();
});

// Rate limiter for sensitive routes
const limiter = rate({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests', statu: true }
});
app.use('/api/__insert_user', limiter);

// Insert user route
app.post('/api/__insert_user', (req, res) => {
  const { username, code } = req.body;
  if (!username || !code) return res.json({ error: 'Missing fields', statu: true });

  db.query('SELECT * FROM users WHERE username_U = ?', [username], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error', statu: true });

    if (results.length === 0) {
      db.query('SELECT * FROM rooms WHERE code_R = ?', [code], (err, results) => {
        if (err || results.length !== 1) {
          return res.json({ error: 'This Code Room No Match', statu: true });
        }

        db.query('INSERT INTO users(username_U, code_R) VALUES (?, ?)', [username, code], (err) => {
          if (err) return res.status(500).json({ error: 'Insert failed', statu: true });

          db.query('SELECT player FROM combats WHERE code_R = ?', [code], (err, results) => {
            if (err || !results[0]) return res.status(500).json({ error: 'Combat fetch failed', statu: true });

            let player_list = [];
            try {
              player_list = JSON.parse(results[0].player || '[]');
            } catch {
              return res.json({ error: 'Invalid player format', statu: true });
            }

            player_list.push(username);
            db.query('UPDATE combats SET player = ? WHERE code_R = ?', [JSON.stringify(player_list), code], (err) => {
              if (err) return res.status(500).json({ error: 'Combat update failed', statu: true });

              req.session.user = username;
              return res.json({ error: 'Success', statu: false });
            });
          });
        });
      });
    } else {
      return res.json({ error: 'This Username Exists', statu: true });
    }
  });
});

// Auth verification for room
app.post('/api/verif_auth', (req, res) => {
  const username = req.session.user;
  const code = req.body.code;

  if (!username || !code) return res.json({ statu: true });

  db.query('SELECT code_R FROM users WHERE username_U = ?', [username], (err, results) => {
    if (err || !results[0]) return res.status(500).json({ error: 'DB error' });

    res.json({ statu: results[0].code_R !== code });
  });
});

// Auth verification for index
app.post('/api/verif_auth_index', (req, res) => {
  const username = req.session.user;
  if (!username) return res.json({ statu: true });

  db.query('SELECT code_R FROM users WHERE username_U = ?', [username], (err, results) => {
    if (err || !results[0]) return res.json({ statu: true });

    res.json({ statu: false, code: results[0].code_R });
  });
});

app.listen(3005, () => console.log('Server running on port 3005'));
