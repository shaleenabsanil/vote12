const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql/msnodesqlv8');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Corrected SQL Server config
const config = {
  server: 'LAPTOP-7N6BA8SQ\\SQLEXPRESS',       // <-- Note the \\ for named instance
  database: 'voting1' ,       // <-- Your DB name
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true              // Using Windows Authentication
  }
};

// Global pool variable
let pool;

// Connect once and reuse
sql.connect(config).then(p => {
  pool = p;
  console.log('✅ Connected to SQL Server');
}).catch(err => {
  console.error('❌ Connection failed:', err);
});

// Routes
app.get('/', (req, res) => {
  console.log("77");
  res.sendFile(path.join(__dirname, 'public', 'vote.html'));
});

app.get('/candidates', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM Candidate');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving candidates');
  }
});

app.post('/vote', async (req, res) => {
  try {
    const { aadhaar, email, candidateId } = req.body;

    // Insert voter if not exists
    await pool.request()
      .input('aadhaar', sql.VarChar, aadhaar)
      .input('email', sql.VarChar, email)
      .query(`
        IF NOT EXISTS (
          SELECT * FROM Voter WHERE AadhaarNumber = @aadhaar AND Email = @email
        )
        BEGIN
          INSERT INTO Voter (AadhaarNumber, Email)
          VALUES (@aadhaar, @email)
        END
      `);

    // Get VoterID
    const voterQuery = await pool.request()
      .input('aadhaar', sql.VarChar, aadhaar)
      .input('email', sql.VarChar, email)
      .query('SELECT VoterID FROM Voter WHERE AadhaarNumber = @aadhaar AND Email = @email');

    const voterId = voterQuery.recordset[0].VoterID;

    // Cast the vote
    await pool.request()
      .input('voterId', sql.Int, voterId)
      .input('candidateId', sql.Int, candidateId)
      .query('INSERT INTO Vote (VoterID, CandidateID) VALUES (@voterId, @candidateId)');

    res.status(200).json({ message: '✅ Vote cast successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Failed to cast vote' });
  }
});

app.post('/results', async (req, res) => {
  console.log("try");
  try {
    console.log("try");
    const result = await pool.request().query(`
      SELECT c.Name, COUNT(v.VoteID) AS VoteCount
      FROM Candidate c
      LEFT JOIN Vote v ON c.CandidateID = v.CandidateID
      GROUP BY c.Name
    `);
    console.log("try2");

    // res.json(result.recordset);
    res.status(200).json(result.recordset);
    console.log("try3");

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '❌ Error fetching results' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Voting app running at http://localhost:${port}`);
});
