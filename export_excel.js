const xlsx = require('xlsx');
const db = require('./db');

db.query('SELECT * FROM users', (err, results) => {
    if (err) throw err;

    // JSON data ko worksheet me convert karein
    const worksheet = xlsx.utils.json_to_sheet(results);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "UsersData");

    // Excel file save karein
    xlsx.writeFile(workbook, 'users_report.xlsx');
    console.log('Excel file successfully ban gayi!');
    process.exit();
});