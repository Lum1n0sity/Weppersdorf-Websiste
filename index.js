const express = require('express');
const cors = require('cors');
const connection = require('./db');

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


app.listen(PORT, () => {
    console.log('API is running!');
});