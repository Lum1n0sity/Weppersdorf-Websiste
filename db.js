const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'wepp_web_api',
    password: '$6^@VHzQP@-=#tfC@%AGXwq_+zegWqGr&5wpR=92FPk2PxW#8jjfbSYmVnD-vZu8B69^csf%LSvmFgxUCtG5-n6YbR*YFmf46tk^',
    database: 'WeppersdorfDB'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL!');
});

module.exports = connection;
