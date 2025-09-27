const express = require('express');
const session = require('express-session')
const rate = require("express-rate-limit")
const cors = require('cors');
const app = express();
const db = require("./database")
app.use(cors({ origin: 'https://testfinal-production.up.railway.app', credentials: true }));
app.use(express.json());
app.use(session({
  secret: 'a9a7A6A7',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

app.use("/", (req, res, next) =>{
  const isFetch = req.headers['sec-fetch-mode'] === 'cors' || req.headers['x-requested-with'] === 'XMLHttpRequest';
  if (!isFetch) {
    return res.status(403).send("You Don't Have Access !!")
  }
  next()
})

app.post('/api/__insert_user', (req, res) => {
  const { username, code } = req.body
  db.query(`select * from users where username_U = '${ username }'`, (err, results)=>{
    if (err) return res.json({ error: 'Error In DataBase', statu: true })
    if (results.length == 0) {
      db.query(`select * from rooms where code_R = '${ code }'`, (err, results)=>{
        if (results.length == 1) {
          db.query(`INSERT into users(username_U, code_R) values ('${username}', '${code}' ) `, (err, results) => {
            if (err) return res.json({ error: 'Error In DataBase', statu: true })
            db.query(`select player from combats where code_R = '${ code }'`, (err, results)=>{
              let player_list = results[0].player
              player_list.push(username)
              db.query(`update combats set player='${JSON.stringify(player_list)}'`, (err, results) => {
                if (err) return res.json({ error: 'Error In DataBase', statu: true })
                req.session.user = username;
                return res.json({
                  error: 'Success',
                  statu: false
                })
              })
            })
          })
        }else{
          return res.json({
            error: 'This Code Room No Mutch',
            statu: true
          })
        }
      })
    }else{
      return res.json({
        error: 'This Username Exist',
        statu: true
      })
    }
  })
});

app.post('/api/verif_auth', (req, res) => {
  const username = req.session.user
  if (!username) {
    res.json({ statu: true })
  }else{
    const code = req.body.code
    db.query(`select * from users where username_U = '${username}'` , (err, results) => {
      if (err)  return res.status(500).json({ error: 'Error In DataBase'})
      if (results[0]) {
        if (results[0].code_R == code) {
          res.json({ statu: false })
        }else{
          res.json({ statu: true })
        }
      }
    })
  }
})

app.post("/api/verif_auth_index",(req, res) => {
  const username = req.session.user
  if (!username) {
    res.json({ statu: true })
  }else{
    db.query(`select * from users where username_U = '${username}'` , (err, results) => {
      if (results[0]) {
        const code = results[0].code_R
        res.json({ statu: false , code: code })
      }else{
        res.json({ statu: true })
      }
    })
  }
})


app.listen(3005, () => console.log('Server running on port 3005'));
