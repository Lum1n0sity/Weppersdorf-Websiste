const express = require('express');
const cors = require('cors');
const connection = require('./db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

app.post('/Mitgliederbereich/Auth', (req, res) => {
    const password = req.body.password;

    let password_cor = false;

    connection.query('SELECT password FROM Mitgliederbereich WHERE password = ?', [password], (err, resu) => {
        if (err)
        {
            console.error('Error executing password authentication: ', err);
            res.status(500).json({ error: 'Error executing query!' });
        }
        else
        {
            const query_data = resu[0];

            if (resu.length === 0)
            {
                return res.status(401).json({ message: 'Invalid password' });
            }
            else
            {
                if (query_data.password === password)
                {
                    password_cor = true;
                    console.log(password_cor);
                    res.json({ ok: password_cor });
                }
            }
        }
    });
});

app.post('/Termine/CreateTermin', (req, res) => {
    const date = req.body.date;
    const title = req.body.title;

    let title_exists = false;
    let date_created = false;

    connection.query('SELECT * FROM Dates WHERE title = ? AND date = ?', [title, date], (err, result) => {
        if (err) 
        {
            console.error('Error executing Query: ', err);
            return res.status(500).json({ error: 'Error executing Query' });
        } 
        else 
        {
            if (result.length > 0 && result[0].title === title) 
            {
                title_exists = true;
                console.log('title exists');
            }

            if (!title_exists) 
            {
                connection.query('INSERT INTO Dates (title, date) VALUES (?, ?)', [title, date], (err) => {
                    if (err) 
                    {
                        console.error('Error inserting Date: ', err);
                        return res.status(500).json({ error: 'Error inserting Date' });
                    } 
                    else 
                    {
                        date_created = true;
                        res.json({ created: date_created });
                    }
                });
            }
        }
    });
});

app.get('/Termine/GetTermin', (req, res) => {
    connection.query('SELECT * FROM Dates', (err, result) => {
        if (err) 
        {
            console.error('Error executing Query: ', err);
            return res.status(500).json({ error: 'Error executing Query' });
        } 
        else 
        {
            if (result.length !== 0) 
            {
                const data = result.map(row => ({
                    title: row.title,
                    date: row.date
                }));

                console.log(data);
                res.json({ data: data });
            } 
            else 
            {
                res.json({ data: [] });
            }
        }
    });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './AudioFiles');
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.originalname}`;
        cb(null, filename);
    },
});

const upload = multer({ storage });

app.post('/Repertoire/addaudio', upload.array('metal-pipe'), (req, res) => {
    const uploadedFiles = req.files;

    if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    const file = uploadedFiles[0];

    const title = req.body.title;
    const duration = req.body.duration;

    connection.query('INSERT INTO AudioFiles (filename, title, duration) VALUES (?, ?, ?)', [file.filename, title, duration], (err, result) => {
        if (err) 
        {
            console.error('Error inserting Data: ', err);
            return res.status(500).json({ error: 'Error inserting Data' });
        } 
        else 
        {
            res.status(200).json({ inserted: true });
        }
    });
});

app.get('/Repertoire/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'AudioFiles', filename);

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  const range = req.headers.range;
  
  if (range)
{
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    const fileStream = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg',
    };

    res.writeHead(206, head);
    fileStream.pipe(res);
  } 
  else 
  {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'audio/mpeg',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

app.listen(PORT, () => {
    console.log('API is running!');
});