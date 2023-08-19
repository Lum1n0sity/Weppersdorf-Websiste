const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

app.use(corst())
app.use(express.json());


app.listen(PORT, () => {
    console.log('API is running!');
});