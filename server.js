 const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'kirana_secret_key',
    resave: false,
    saveUninitialized: false
}));

// Direct HTML files serving from root folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/customer.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'customer.html'));
});

app.get('/seller.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'seller.html'));
});

// Signup Route
app.post('/api/signup', (req, res) => {
    const { name, email, password, role, shop_name, phone, address } = req.body;
    const query = `INSERT INTO users (name, email, password, role, shop_name, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [name, email, password, role, shop_name || null, phone || null, address || null], (err) => {
        if (err) return res.status(400).json({ error: 'Email already exists or invalid data!' });
        res.json({ message: 'Signup successful! Please login.' });
    });
});

// Login Route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(query, [email, password], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = results[0];
        req.session.user = user;

        res.json({ role: user.role, redirect: user.role === 'seller' ? '/seller.html' : '/customer.html' });
    });
});

// Logout Route
app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Nearby Shops Route
app.get('/api/nearby-shops', (req, res) => {
    const query = "SELECT id, name, shop_name, phone, address FROM users WHERE role = 'seller'";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// Shop Products Route
app.get('/api/shop-products/:sellerId', (req, res) => {
    const sellerId = req.params.sellerId;
    db.query('SELECT * FROM products WHERE seller_id = ? AND stock > 0', [sellerId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// Add Product Route
app.post('/api/products', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'seller') return res.status(403).json({ error: 'Forbidden' });
    const { name, price, stock, image_url } = req.body;
    const seller_id = req.session.user.id;

    const query = 'INSERT INTO products (seller_id, name, price, stock, image_url) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [seller_id, name, price, stock, image_url || null], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to add product' });
        res.json({ message: 'Product added successfully!' });
    });
});

// Get Seller Products Route
app.get('/api/seller-products', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'seller') return res.status(403).json({ error: 'Forbidden' });
    db.query('SELECT * FROM products WHERE seller_id = ?', [req.session.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// Update Product Route
app.put('/api/products/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'seller') return res.status(403).json({ error: 'Forbidden' });
    const { name, price, stock, image_url } = req.body;
    db.query('UPDATE products SET name = ?, price = ?, stock = ?, image_url = ? WHERE id = ? AND seller_id = ?', 
        [name, price, stock, image_url || null, req.params.id, req.session.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Update failed' });
        res.json({ message: 'Product updated successfully!' });
    });
});

// Delete Product Route
app.delete('/api/products/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'seller') return res.status(403).json({ error: 'Forbidden' });
    db.query('DELETE FROM products WHERE id = ? AND seller_id = ?', [req.params.id, req.session.user.id], (err) => {
        if (err) return res.status(500).json({ error: 'Delete failed' });
        res.json({ message: 'Product deleted successfully!' });
    });
});


// Get All Available Products for Customers (Public API)
app.get('/api/all-products', (req, res) => {
    const query = 'SELECT products.*, users.shop_name FROM products JOIN users ON products.seller_id = users.id WHERE products.stock > 0';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

 
// Server Start
app.listen(3000, () => {
    console.log('Server is running smoothly on http://localhost:3000');
});