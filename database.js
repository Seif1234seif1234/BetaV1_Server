const mysql = require('mysql2');

const db = mysql.createConnection({
  host : 'maglev.proxy.rlwy.net',
  user : 'root',
  password : "IcbHjXfZYlgDFoFYRmgRgGOimWOfxJsc",
  database : 'railway',
  port : 46555
});

module.exports = db;