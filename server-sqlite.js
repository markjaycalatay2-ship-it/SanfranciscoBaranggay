const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { getCollection, addDocument, setDocument, updateDocument, deleteDocument, queryCollection, db } = require('./firebase-config');

const app = express();
const PORT = process.env.PORT || 3000;

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

// Initialize default admin on startup
async function initializeDefaultAdmin() {
    try {
        const users = await getCollection('users');
        const existingAdmin = users.find(u => u.username === 'admin');
        if (!existingAdmin) {
            await setDocument('users', 'admin', {
                id: 1,
                full_name: 'Administrator',
                age: 35,
                gender: 'Other',
                username: 'admin',
                password: bcrypt.hashSync('admin123', 10),
                contact_number: '123-456-7890',
                address: 'Barangay Hall',
                role: 'admin',
                status: 'approved',
                last_login: null,
                created_at: new Date().toISOString()
            });
            console.log('Default admin created in Firestore');
        }
    } catch (error) {
        console.error('Error creating default admin:', error.message);
        // Continue with in-memory fallback
    }
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve login.html inline (bypass file access issues)
app.get('/login.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Barangay San Francisco</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="auth-container">
        <div class="auth-card">
            <h2>Barangay San Francisco Resident Report System</h2>
            <div id="alert-container"></div>
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
            <div class="auth-links">
                <p>Don't have an account? <a href="/register.html">Register here</a></p>
            </div>
        </div>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username, password})
                });
                const result = await response.json();
                if (result.success) {
                    window.location.href = result.role === 'admin' ? '/admin-dashboard.html' : '/resident-dashboard.html';
                } else {
                    document.getElementById('alert-container').innerHTML = '<div class="alert alert-error">' + result.message + '</div>';
                }
            } catch (error) {
                document.getElementById('alert-container').innerHTML = '<div class="alert alert-error">Login failed</div>';
            }
        });
    </script>
</body>
</html>`);
});

// Redirect root to login.html
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'barangay-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        secure: isVercel
    }
}));

// Initialize default admin
initializeDefaultAdmin();

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (req.session.role === 'admin') {
        next();
    } else {
        res.redirect('/resident-dashboard');
    }
}

// Routes
app.get('/', (req, res) => {
    if (req.session.userId) {
        if (req.session.role === 'admin') {
            res.redirect('/admin-dashboard');
        } else {
            res.redirect('/resident-dashboard');
        }
    } else {
        res.sendFile(__dirname + '/public/login.html');
    }
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log('Login attempt:', username);
    
    try {
        const users = await getCollection('users');
        console.log('Users found:', users.length);
        console.log('Usernames:', users.map(u => u.username));
        
        const user = users.find(u => u.username === username);
        
        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        
        console.log('User found:', user.username, 'ID:', user.id);
        
        const isValid = bcrypt.compareSync(password, user.password);
        console.log('Password valid:', isValid);
        
        if (isValid) {
            if (user.status === 'pending') {
                return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
            } else if (user.status === 'rejected') {
                return res.status(403).json({ success: false, message: 'Your registration has been rejected.' });
            }
            
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.fullName = user.full_name;
            req.session.role = user.role;
            
            // Update last login (don't fail if this errors)
            try {
                await updateDocument('users', user.username, { last_login: new Date().toISOString() });
            } catch (updateError) {
                console.log('Could not update last_login, but login continues');
            }
            
            // Log login activity
            await addDocument('logs', {
                user_id: user.id,
                action: 'Login',
                timestamp: new Date().toISOString()
            });
            
            console.log('Login successful:', username);
            res.json({ success: true, role: user.role });
        } else {
            console.log('Password mismatch for:', username);
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

app.post('/register', async (req, res) => {
    const { full_name, age, gender, username, password, contact_number, address } = req.body;
    
    try {
        const users = await getCollection('users');
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
        
        const newUser = {
            id: newId,
            full_name,
            age: parseInt(age),
            gender,
            username,
            password: hashedPassword,
            contact_number,
            address,
            role: 'resident',
            status: 'pending',
            last_login: null,
            created_at: new Date().toISOString()
        };
        
        await setDocument('users', username, newUser);
        
        // Log registration
        await addDocument('logs', {
            user_id: newId,
            action: 'Registration - Pending Approval',
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true, message: 'Registration successful! Your account is pending admin approval.' });
    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

app.get('/admin-dashboard', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/admin-dashboard.html');
});

app.get('/resident-dashboard', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/public/resident-dashboard.html');
});

app.get('/new-report', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/public/new-report.html');
});

app.get('/my-reports', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/public/my-reports.html');
});

app.get('/manage-reports', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/manage-reports.html');
});

app.get('/resident-directory', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/resident-directory.html');
});

app.get('/transaction-history', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/transaction-history.html');
});

app.get('/user-approval', isAuthenticated, isAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/user-approval.html');
});

// API Routes
app.get('/api/user-info', isAuthenticated, (req, res) => {
    res.json({
        userId: req.session.userId,
        username: req.session.username,
        fullName: req.session.fullName,
        role: req.session.role
    });
});

app.post('/api/reports', isAuthenticated, async (req, res) => {
    const { description, date_time, location, involved_persons, cause } = req.body;
    
    try {
        const reports = await getCollection('reports');
        const newId = reports.length > 0 ? Math.max(...reports.map(r => r.id)) + 1 : 1;
        
        const newReport = {
            id: newId,
            user_id: req.session.userId,
            description,
            date_time,
            location,
            involved_persons: involved_persons || '',
            cause: cause || '',
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        await setDocument('reports', newId.toString(), newReport);
        
        await addDocument('logs', {
            user_id: req.session.userId,
            action: 'Created report',
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true, message: 'Report created successfully' });
    } catch (error) {
        console.error('Error creating report:', error.message);
        res.status(500).json({ success: false, message: 'Failed to create report' });
    }
});

app.get('/api/reports', isAuthenticated, async (req, res) => {
    try {
        const [reports, users] = await Promise.all([
            getCollection('reports'),
            getCollection('users')
        ]);
        
        let result = reports.map(r => {
            const user = users.find(u => u.id === r.user_id);
            return {
                ...r,
                resident_name: user?.full_name || 'Unknown',
                username: user?.username || 'Unknown'
            };
        });
        
        if (req.session.role !== 'admin') {
            result = result.filter(r => {
                const user = users.find(u => u.id === r.user_id);
                return user?.status === 'approved';
            });
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching reports:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch reports' });
    }
});

// API endpoint for user's own reports only
app.get('/api/my-reports', isAuthenticated, async (req, res) => {
    try {
        const reports = await getCollection('reports');
        const userReports = reports
            .filter(r => r.user_id === req.session.userId)
            .map(r => ({ ...r, username: req.session.username }));
        
        res.json(userReports);
    } catch (error) {
        console.error('Error fetching user reports:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch your reports' });
    }
});

app.put('/api/reports/:id', isAuthenticated, async (req, res) => {
    const reportId = parseInt(req.params.id);
    const { description, date_time, location, involved_persons, cause } = req.body;
    
    try {
        const reports = await getCollection('reports');
        const reportIndex = reports.findIndex(r => r.id === reportId);
        
        if (reportIndex === -1) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        
        const report = reports[reportIndex];
        if (req.session.role !== 'admin' && report.user_id !== req.session.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        
        const updatedReport = {
            ...report,
            description,
            date_time,
            location,
            involved_persons,
            cause
        };
        
        await setDocument('reports', reportId.toString(), updatedReport);
        
        await addDocument('logs', {
            user_id: req.session.userId,
            action: `Updated report ${reportId}`,
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true, message: 'Report updated successfully' });
    } catch (error) {
        console.error('Error updating report:', error.message);
        res.status(500).json({ success: false, message: 'Failed to update report' });
    }
});

app.put('/api/reports/:id/status', isAuthenticated, isAdmin, async (req, res) => {
    const { status } = req.body;
    const reportId = parseInt(req.params.id);
    
    try {
        const reports = await getCollection('reports');
        const report = reports.find(r => r.id === reportId);
        
        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        
        await setDocument('reports', reportId.toString(), { ...report, status });
        
        await addDocument('logs', {
            user_id: req.session.userId,
            action: `Updated report ${reportId} status to ${status}`,
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true, message: 'Report updated successfully' });
    } catch (error) {
        console.error('Error updating report status:', error.message);
        res.status(500).json({ success: false, message: 'Failed to update report' });
    }
});

app.delete('/api/reports/:id', isAuthenticated, async (req, res) => {
    const reportId = parseInt(req.params.id);
    
    try {
        const reports = await getCollection('reports');
        const reportIndex = reports.findIndex(r => r.id === reportId);
        
        if (reportIndex === -1) {
            return res.status(404).json({ success: false, message: 'Report not found' });
        }
        
        const report = reports[reportIndex];
        if (req.session.role !== 'admin' && report.user_id !== req.session.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        
        await deleteDocument('reports', reportId.toString());
        
        await addDocument('logs', {
            user_id: req.session.userId,
            action: `Deleted report ${reportId}`,
            timestamp: new Date().toISOString()
        });
        
        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Error deleting report:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete report' });
    }
});

app.get('/api/residents', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await getCollection('users');
        const residents = users
            .filter(u => u.role === 'resident' && u.status === 'approved')
            .map(u => ({
                id: u.id,
                full_name: u.full_name,
                age: u.age,
                gender: u.gender,
                username: u.username,
                last_login: u.last_login,
                contact_number: u.contact_number,
                address: u.address
            }));
        res.json(residents);
    } catch (error) {
        console.error('Error fetching residents:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch residents' });
    }
});

app.get('/api/logs', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const [logs, users] = await Promise.all([
            getCollection('logs'),
            getCollection('users')
        ]);
        
        const logsWithUsers = logs
            .map(l => {
                const user = users.find(u => u.id === l.user_id);
                return {
                    ...l,
                    full_name: user?.full_name || 'Unknown',
                    username: user?.username || 'Unknown'
                };
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json(logsWithUsers);
    } catch (error) {
        console.error('Error fetching logs:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
});

app.get('/api/statistics', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const reports = await getCollection('reports');
        const stats = {
            total_reports: reports.length,
            pending_reports: reports.filter(r => r.status === 'pending').length,
            ongoing_reports: reports.filter(r => r.status === 'ongoing').length,
            resolved_reports: reports.filter(r => r.status === 'resolved').length
        };
        res.json(stats);
    } catch (error) {
        console.error('Error fetching statistics:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
    }
});

// User Approval API endpoints
app.get('/api/pending-users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await getCollection('users');
        const pendingUsers = users
            .filter(u => u.status === 'pending' && u.role !== 'admin')
            .map(u => ({
                id: u.id,
                full_name: u.full_name,
                age: u.age,
                gender: u.gender,
                username: u.username,
                contact_number: u.contact_number,
                address: u.address,
                created_at: u.created_at
            }));
        res.json(pendingUsers);
    } catch (error) {
        console.error('Error fetching pending users:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch pending users' });
    }
});

// Get all users for statistics
app.get('/api/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await getCollection('users');
        const allUsers = users.map(u => ({
            id: u.id,
            full_name: u.full_name,
            username: u.username,
            role: u.role,
            status: u.status
        }));
        res.json(allUsers);
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

app.put('/api/users/:id/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const users = await getCollection('users');
        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        await updateDocument('users', user.username, { status: 'approved' });
        await addDocument('logs', {
            user_id: req.session.userId,
            action: `Approved user ${user.username}`,
            timestamp: new Date().toISOString()
        });
        res.json({ success: true, message: 'User approved successfully' });
    } catch (error) {
        console.error('Error approving user:', error.message);
        res.status(500).json({ success: false, message: 'Failed to approve user' });
    }
});

app.put('/api/users/:id/reject', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const users = await getCollection('users');
        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        await updateDocument('users', user.username, { status: 'rejected' });
        await addDocument('logs', {
            user_id: req.session.userId,
            action: `Rejected user ${user.username}`,
            timestamp: new Date().toISOString()
        });
        res.json({ success: true, message: 'User rejected successfully' });
    } catch (error) {
        console.error('Error rejecting user:', error.message);
        res.status(500).json({ success: false, message: 'Failed to reject user' });
    }
});

app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const users = await getCollection('users');
        const user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const username = user.username;
        // Delete user's reports
        const reports = await getCollection('reports');
        for (const report of reports) {
            if (report.user_id === userId) {
                await deleteDocument('reports', report.id.toString());
            }
        }
        // Delete user's logs
        const logs = await getCollection('logs');
        for (const log of logs) {
            if (log.user_id === userId) {
                await deleteDocument('logs', log.id.toString());
            }
        }
        await deleteDocument('users', username);
        await addDocument('logs', {
            user_id: req.session.userId,
            action: `Deleted user ${username}`,
            timestamp: new Date().toISOString()
        });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});

app.post('/logout', async (req, res) => {
    if (req.session.userId) {
        try {
            await addDocument('logs', {
                user_id: req.session.userId,
                action: 'Logout',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error logging logout:', error.message);
        }
    }
    
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Logout failed' });
        } else {
            res.json({ success: true, message: 'Logged out successfully' });
        }
    });
});

// Setup endpoint - create admin user
app.get('/setup', async (req, res) => {
    try {
        console.log('Setup endpoint called - creating admin user...');
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        console.log('Password hashed, attempting to write to Firestore...');
        
        await setDocument('users', 'admin', {
            id: 1,
            full_name: 'Administrator',
            age: 35,
            gender: 'Other',
            username: 'admin',
            password: hashedPassword,
            contact_number: '123-456-7890',
            address: 'Barangay Hall',
            role: 'admin',
            status: 'approved',
            last_login: null,
            created_at: new Date().toISOString()
        });
        
        // Verify the user was created
        const users = await getCollection('users');
        console.log('Users after setup:', users.length);
        
        res.json({ success: true, message: `Admin user created! Total users: ${users.length}`, users: users.map(u => u.username) });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
});

// Start server (only if not on Vercel)
if (!isVercel) {
    app.listen(PORT, async () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log('📊 Database: Firebase Firestore');
        console.log('👤 Default admin: username=admin, password=admin123');
        console.log('\n🌐 Open your browser and navigate to: http://localhost:3000');
        
        // Initialize default admin
        try {
            await initializeDefaultAdmin();
        } catch (error) {
            console.error('Failed to initialize default admin:', error.message);
        }
    });
}

// Export for Vercel serverless functions
module.exports = app;
