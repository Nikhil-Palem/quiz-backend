const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser'); 
const { Pool } = require('pg'); 
require('dotenv').config();

const app = express();
const port = process.env.PORT;
// console.log(port);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors({
    origin: 'https://quiz-game-frontend-zeta.vercel.app', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true 
}));

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
})
pool.connect((err)=>{
    if(err) throw err
    console.log("Connect to postgreSQL Successfull");
});

app.get("/",(req,res)=>{
  res.send("server is running");
})


app.get('/api/quiz', async (req, res) => {
  const fetchQuestions = async (retries = 3) => {
    try {
      const response = await axios.get('https://opentdb.com/api.php?amount=10');
      return response.data.results;
    } catch (error) {
      if (error.response?.status === 429 && retries > 0) {
        console.log('Rate limited, retrying...');
        await new Promise(res => setTimeout(res, 2000));
        return fetchQuestions(retries - 1);
      } else {
        throw error;
      }
    }
  };

  try {
    const questions = await fetchQuestions();
    res.json(questions);
  } catch (error) {
    console.error("Error fetching quiz data:", error.message);
    res.status(500).send('Error fetching quiz data');
  }
});


app.post('/api/scores', async (req, res) => {
  const { username, score } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO scores (username, score) VALUES ($1, $2) RETURNING *',
      [username, score]
    );
    res.status(201).json(result.rows[0]); 
  } catch (error) {
    console.error('Error saving score:', error.message);
    res.status(500).send('Error saving score');
  }
});

app.get('/api/scores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM scores ORDER BY score DESC ');
    res.json(result.rows);
  } catch (error) {
    res.status(500).send('Error fetching scores');
  }
});

// app.listen(port, () => console.log(`Server running on port ${port}`));
module.exports = app;