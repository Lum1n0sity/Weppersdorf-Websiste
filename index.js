const express = require('express');
const cors = require('cors');
const connection = require('./db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

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
                    res.json({ login: password_cor });
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

app.post('/Repertoire/addaudio', upload.array('audio'), (req, res) => {
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

app.post('/Mitgliederbereich/Add-Kontakt-Liste', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;

    connection.query('INSERT INTO Mitgliederbereich (name, email) VALUES (?, ?)', [name, email], (err, result) => {
        if (err)
        {
            console.error('Error inserting data: ', err);+
            res.status(500).json({ error: 'Error inserting data!' });
        }
        else
        {
            res.status(200).json({ message: 'Mitglied Added' });
        }
    })
});

app.get('/Migliederbereich/Kontakt-Liste', (req, res) => {
    connection.query('SELECT name, email FROM Mitgliederbereich WHERE id > 1', (err, result) => {
        if (err) 
        {
            console.error('Error executing query: ', err);
            res.status(500).json({ error: 'Error executing query!' });
        } 
        else 
        {
            const names = result.map(row => row.name);
            const emails = result.map(row => row.email);

            console.log('Names: ', names);
            console.log('Emails: ', emails);

            res.status(200).json({ names, emails });
        }
    });
});

const storage_pb = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './PB_Images/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload_pb = multer({ storage: storage_pb });

app.post('/Presseberichte/Add', upload_pb.single('pb_img'), (req, res) => {
    const img = req.file;
    const title = req.body.title;
    const prev_text = req.body.prev;
    const link = req.body.link;

    if (!img) 
    {
        return res.status(400).json({ error: "Error uploading Image!" });
    }

    const { originalname, mimetype, size } = img;

    const imageInfo = {
        filename: originalname,
        mimetype,
        size,
        title,
        prev_text,
        link
    };

    connection.query('INSERT INTO Presseberichte SET ?', imageInfo, (err, result) => {
        if (err) 
        {
            console.error('Error inserting data: ', err);
            res.status(500).json({ error: "Error inserting data!" });
        } 
        else 
        {
            res.status(200).json({ message: 'Data Uploaded!' });
        }
    });
});

const imageDirectory = './PB_Images/';

app.get('/Presseberichte/Load', (req, res) => {
    let isImageURLDone = false;
    let isQueryDone = false;

    let imageUrls = []; // Declare these variables outside of the callback functions
    let titles = [];
    let prev_texts = [];
    let links = [];

    fs.readdir(imageDirectory, (err, files) => {
        if (err) {
            console.error('Error reading directory: ', err);
            return res.status(500).json({ error: "Error reading directory!" });
        }

        const imageFiles = files.filter(file => {
            const extname = path.extname(file).toLowerCase();
            return extname === '.jpg' || extname === '.jpeg' || extname === '.png' || extname === '.gif';
        });

        if (imageFiles.length === 0) {
            res.status(404).json({ error: "No images found!" });
        } else {
            imageUrls = imageFiles.map(file => {
                return {
                    filename: file,
                    url: `/PB_Images/${file}`
                };
            });

            isImageURLDone = true;

            if (isQueryDone) {
                res.status(200).json({ imageUrls, titles, prev_texts, links });
            }
        }
    });

    connection.query('SELECT title, prev_text, link FROM Presseberichte', (err, result) => {
        if (err) {
            console.error('Error executing query: ', err);
            res.status(500).json({ error: "Error executing query!" });
        } else {
            titles = result.map(row => row.title);
            prev_texts = result.map(row => row.prev_text);
            links = result.map(row => row.link);

            isQueryDone = true;

            if (isImageURLDone) {
                res.status(200).json({ imageUrls, titles, prev_texts, links });
            }
        }
    });
});

const transporter = nodemailer.createTransport({
    service: 'Outlook',
    auth: {
      user: 'raphael221@outlook.de',
      pass: 'Mama221gvOma1321'
    }
  });

app.post('/Kontakt', (req, res) => {
    const { email, subject, message } = req.body;
  
    const mailOptions = {
      from: 'raphael221@outlook.de',
      to: 'raphael221@outlook.de',
      subject: subject,
      text: `From: ${email}\n\n${message}`,
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) 
      {
        console.error('Error sending email: ', error);
        res.status(500).json({ error: 'Error sending email' });
      } 
      else 
      {
        console.log('Email sent: ', info.response);
        res.status(200).json({ message: 'Email sent successfully' });
      }
    });
  });

app.listen(PORT, () => {
    console.log('API is running!');
});