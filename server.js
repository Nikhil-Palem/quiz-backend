const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Route to fetch quiz questions
app.get('/api/quiz', async (req, res) => {
  const fetchQuestions = async (retries = 3) => {
    try {
      const response = await axios.get('https://opentdb.com/api.php?amount=10');
      return response.data.results;
    } catch (error) {
      if (error.response?.status === 429 && retries > 0) {
        console.log('Rate limited, retrying...');
        await new Promise(res => setTimeout(res, 2000)); // Wait for 2 seconds before retrying
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


// Route to get all scores
app.get('/api/scores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM scores ORDER BY score DESC ');
    res.json(result.rows);
  } catch (error) {
    res.status(500).send('Error fetching scores');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
