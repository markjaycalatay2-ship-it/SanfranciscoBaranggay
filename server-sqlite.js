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
        } else {
            console.log('Default admin already exists');
        }
    } catch (error) {
        console.error('Error creating default admin:', error.message);
    }
}

// CSS Content Inline - Blue Theme
const CSS_CONTENT = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --primary-bg: #f0f9ff;
    --secondary-bg: #e0f2fe;
    --card-bg: #ffffff;
    --primary-blue: #0ea5e9;
    --dark-blue: #0369a1;
    --light-blue: #38bdf8;
    --text-primary: #0c4a6e;
    --text-secondary: #64748b;
    --border-color: #bae6fd;
    --hover-bg: #f1f5f9;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: var(--primary-bg);
    color: var(--text-primary);
    min-height: 100vh;
}

.header {
    background: linear-gradient(135deg, var(--primary-blue) 0%, var(--dark-blue) 100%);
    color: white;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

.header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.user-info span {
    font-size: 0.9rem;
}

.layout-container {
    display: flex;
    min-height: calc(100vh - 70px);
}

.sidebar {
    width: 250px;
    background: linear-gradient(180deg, var(--light-blue) 0%, var(--primary-blue) 100%);
    padding: 1rem 0;
    border-right: 3px solid var(--dark-blue);
    box-shadow: 4px 0 12px rgba(14, 165, 233, 0.2);
}

.sidebar nav {
    display: flex;
    flex-direction: column;
}

.sidebar nav a {
    color: #f0f9ff;
    text-decoration: none;
    padding: 0.75rem 1.5rem;
    display: block;
    transition: all 0.3s ease;
    font-weight: 500;
    border-left: 3px solid transparent;
}

.sidebar nav a:hover {
    background-color: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    border-left-color: #7dd3fc;
}

.sidebar nav a.active {
    background-color: rgba(255, 255, 255, 0.25);
    color: #ffffff;
    border-left-color: #bae6fd;
    font-weight: 600;
}

.main-content {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
}

.card {
    background-color: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
}

.card h2 {
    color: #0369a1;
    margin-bottom: 1rem;
    font-size: 1.3rem;
    font-weight: 600;
}

.stats-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
    border: 1px solid #bae6fd;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
    text-align: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(14, 165, 233, 0.3);
}

.stat-card h3 {
    color: #0284c7;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    font-weight: 600;
}

.stat-card .stat-number {
    font-size: 2.5rem;
    font-weight: bold;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #0369a1;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
    background: white;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.form-group textarea {
    resize: vertical;
    min-height: 100px;
}

.btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-block;
    font-weight: 500;
}

.btn-primary {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: white;
}

.btn-primary:hover {
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
}

.btn-secondary {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
    color: white;
}

.btn-secondary:hover {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(14, 165, 233, 0.3);
}

.btn-danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
}

.btn-danger:hover {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.btn-success {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
}

.btn-success:hover {
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
}

.btn-warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
}

.btn-warning:hover {
    background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
}

.btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
}

.table-container {
    overflow-x: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    background-color: #f0f9ff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
}

th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #bae6fd;
}

th {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    font-size: 0.85rem;
    letter-spacing: 0.5px;
}

tr:hover {
    background-color: #e0f2fe;
}

tr:nth-child(even) {
    background-color: #f0f9ff;
}

tr:nth-child(even):hover {
    background-color: #e0f2fe;
}

.status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
}

.status-pending {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
    border: 1px solid #d97706;
}

.status-ongoing {
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: white;
    border: 1px solid #0369a1;
}

.status-resolved {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    border: 1px solid #15803d;
}

.auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%);
}

.auth-card {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 1px solid #bae6fd;
    padding: 2.5rem;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(14, 165, 233, 0.3);
    width: 100%;
    max-width: 450px;
}

.auth-card h2 {
    text-align: center;
    color: #0369a1;
    margin-bottom: 2rem;
    font-size: 1.8rem;
    font-weight: 600;
}

.auth-card .form-group {
    margin-bottom: 1.5rem;
}

.auth-card .btn {
    width: 100%;
    margin-bottom: 1rem;
}

.auth-links {
    text-align: center;
    margin-top: 1.5rem;
}

.auth-links a {
    color: #0369a1;
    text-decoration: none;
}

.auth-links a:hover {
    text-decoration: underline;
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
}

.alert {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
}

.alert-success {
    background-color: #d1fae5;
    color: #065f46;
    border: 1px solid #a7f3d0;
}

.alert-error {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
}

.alert-info {
    background-color: #e0f2fe;
    color: #075985;
    border: 1px solid #bae6fd;
}

@media (max-width: 768px) {
    .layout-container {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        order: 2;
    }
    
    .main-content {
        order: 1;
    }
    
    .stats-container {
        grid-template-columns: 1fr;
    }
    
    .header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
    }
    
    .action-buttons {
        flex-direction: column;
    }
}

.loading {
    text-align: center;
    padding: 2rem;
    color: #7f8c8d;
}

.empty-state {
    text-align: center;
    padding: 3rem;
    color: #7f8c8d;
}

.empty-state h3 {
    margin-bottom: 1rem;
    color: #95a5a6;
}`;

// HTML Pages with inlined CSS
const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Barangay San Francisco</title>
    <style>${CSS_CONTENT}</style>
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
</html>`;

const REGISTER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - Barangay San Francisco</title>
    <style>${CSS_CONTENT}</style>
</head>
<body>
    <div class="auth-container">
        <div class="auth-card">
            <h2>Resident Registration</h2>
            <div id="alert-container"></div>
            <form id="registerForm">
                <div class="form-group">
                    <label for="full_name">Full Name</label>
                    <input type="text" id="full_name" name="full_name" required>
                </div>
                <div class="form-group">
                    <label for="age">Age</label>
                    <input type="number" id="age" name="age" min="1" max="120" required>
                </div>
                <div class="form-group">
                    <label for="gender">Gender</label>
                    <select id="gender" name="gender" required>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" minlength="6" required>
                </div>
                <div class="form-group">
                    <label for="contact_number">Contact Number</label>
                    <input type="tel" id="contact_number" name="contact_number" required>
                </div>
                <div class="form-group">
                    <label for="address">Address (Purok)</label>
                    <input type="text" id="address" name="address" placeholder="e.g., Purok 1" required>
                </div>
                <button type="submit" class="btn btn-primary">Register</button>
            </form>
            <div class="auth-links">
                <p>Already have an account? <a href="/login.html">Login here</a></p>
            </div>
        </div>
    </div>
    <script>
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    showAlert('Registration successful! Redirecting to login...', 'success');
                    setTimeout(() => { window.location.href = '/login.html'; }, 2000);
                } else {
                    showAlert(result.message, 'error');
                }
            } catch (error) {
                showAlert('An error occurred. Please try again.', 'error');
            }
        });
        function showAlert(message, type) {
            document.getElementById('alert-container').innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
            setTimeout(() => { document.getElementById('alert-container').innerHTML = ''; }, 5000);
        }
    </script>
</body>
</html>`;

// Admin Dashboard HTML with embedded CSS
const ADMIN_DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Barangay San Francisco</title>
    <style>${CSS_CONTENT}</style>
</head>
<body>
    <header class="header">
        <h1>Barangay San Francisco Resident Report System</h1>
        <div class="user-info">
            <span>Welcome, <span id="userFullName">Loading...</span></span>
            <button class="btn btn-secondary btn-sm" onclick="logout()">Logout</button>
        </div>
    </header>
    <div class="layout-container">
        <aside class="sidebar">
            <nav>
                <a href="/admin-dashboard.html" class="active">Dashboard</a>
                <a href="/manage-reports.html">Manage Reports</a>
                <a href="/resident-directory.html">Resident Directory</a>
                <a href="/user-approval.html">User Approval</a>
                <a href="/transaction-history.html">Transaction History</a>
            </nav>
        </aside>
        <main class="main-content">
            <div class="card">
                <h2>Admin Dashboard</h2>
                <p>Overview of the Barangay San Francisco Resident Report System.</p>
            </div>
            <div class="stats-container">
                <div class="stat-card"><h3>Total Reports</h3><div class="stat-number" id="totalReports">0</div></div>
                <div class="stat-card"><h3>Pending Reports</h3><div class="stat-number" id="pendingReports">0</div></div>
                <div class="stat-card"><h3>Ongoing Reports</h3><div class="stat-number" id="ongoingReports">0</div></div>
                <div class="stat-card"><h3>Resolved Reports</h3><div class="stat-number" id="resolvedReports">0</div></div>
                <div class="stat-card"><h3>Approved Users</h3><div class="stat-number" id="approvedUsers">0</div></div>
            </div>
            <div class="card">
                <h2>Recent Reports</h2>
                <div id="recentReports"><div class="loading">Loading recent reports...</div></div>
            </div>
            <div class="card">
                <h2>Quick Actions</h2>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="window.location.href='/manage-reports.html'">Manage All Reports</button>
                    <button class="btn btn-secondary" onclick="window.location.href='/resident-directory.html'">View Residents</button>
                    <button class="btn btn-secondary" onclick="window.location.href='/transaction-history.html'">View Activity Logs</button>
                </div>
            </div>
        </main>
    </div>
    <script>
        async function loadUserInfo() {
            try {
                const response = await fetch('/api/user-info');
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('userFullName').textContent = user.fullName;
                } else {
                    window.location.href = '/login.html';
                }
            } catch (error) {
                window.location.href = '/login.html';
            }
        }
        async function loadStatistics() {
            try {
                const reportsResponse = await fetch('/api/reports');
                if (reportsResponse.ok) {
                    const reports = await reportsResponse.json();
                    document.getElementById('totalReports').textContent = reports.length;
                    document.getElementById('pendingReports').textContent = reports.filter(r => r.status === 'pending').length;
                    document.getElementById('ongoingReports').textContent = reports.filter(r => r.status === 'ongoing').length;
                    document.getElementById('resolvedReports').textContent = reports.filter(r => r.status === 'resolved').length;
                }
                const usersResponse = await fetch('/api/users');
                if (usersResponse.ok) {
                    const users = await usersResponse.json();
                    document.getElementById('approvedUsers').textContent = users.filter(u => u.status === 'approved' && u.role === 'resident').length;
                }
            } catch (error) {
                console.error('Error loading statistics:', error);
            }
        }
        async function loadRecentReports() {
            try {
                const response = await fetch('/api/reports');
                if (response.ok) {
                    const reports = await response.json();
                    displayRecentReports(reports.slice(0, 5));
                }
            } catch (error) {
                document.getElementById('recentReports').innerHTML = '<div class="empty-state"><p>Error loading reports</p></div>';
            }
        }
        function displayRecentReports(reports) {
            const container = document.getElementById('recentReports');
            if (reports.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No reports yet</h3><p>No reports have been submitted by residents.</p></div>';
                return;
            }
            let html = '<div class="table-container"><table><thead><tr><th>Description</th><th>Location</th><th>Date</th><th>Status</th></tr></thead><tbody>';
            reports.forEach(report => {
                html += '<tr><td>' + report.description.substring(0, 50) + (report.description.length > 50 ? '...' : '') + '<br><small style="color: #7f8c8d;">by @' + (report.username || 'Unknown') + '</small></td>';
                html += '<td>' + report.location + '</td>';
                html += '<td>' + new Date(report.created_at).toLocaleDateString() + '</td>';
                html += '<td><span class="status-badge status-' + report.status + '">' + report.status + '</span></td></tr>';
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        }
        async function logout() {
            try {
                await fetch('/logout', { method: 'POST' });
            } catch (error) {}
            window.location.href = '/login.html';
        }
        document.addEventListener('DOMContentLoaded', () => {
            loadUserInfo();
            loadStatistics();
            loadRecentReports();
        });
    </script>
</body>
</html>`;

// Resident Dashboard HTML with embedded CSS
const RESIDENT_DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resident Dashboard - Barangay San Francisco</title>
    <style>${CSS_CONTENT}</style>
</head>
<body>
    <header class="header">
        <h1>Barangay San Francisco Resident Report System</h1>
        <div class="user-info">
            <span>Welcome, <span id="userFullName">Loading...</span></span>
            <button class="btn btn-secondary btn-sm" onclick="logout()">Logout</button>
        </div>
    </header>
    <div class="layout-container">
        <aside class="sidebar">
            <nav>
                <a href="/resident-dashboard.html" class="active">Dashboard</a>
                <a href="/new-report.html">New Report</a>
                <a href="/my-reports.html">My Reports</a>
            </nav>
        </aside>
        <main class="main-content">
            <div class="card">
                <h2>Resident Dashboard</h2>
                <p>Welcome to the Barangay Complaint and Incident Report Monitoring System. You can submit new reports and track the status of your existing reports.</p>
            </div>
            <div class="stats-container">
                <div class="stat-card"><h3>Total Reports</h3><div class="stat-number" id="totalReports">0</div></div>
                <div class="stat-card"><h3>Pending</h3><div class="stat-number" id="pendingReports">0</div></div>
                <div class="stat-card"><h3>Ongoing</h3><div class="stat-number" id="ongoingReports">0</div></div>
                <div class="stat-card"><h3>Resolved</h3><div class="stat-number" id="resolvedReports">0</div></div>
            </div>
            <div class="card">
                <h2>Recent Reports</h2>
                <div id="recentReports"><div class="loading">Loading recent reports...</div></div>
            </div>
            <div class="card">
                <h2>Quick Actions</h2>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="window.location.href='/new-report.html'">Submit New Report</button>
                    <button class="btn btn-secondary" onclick="window.location.href='/my-reports.html'">View All Reports</button>
                </div>
            </div>
        </main>
    </div>
    <script>
        let currentUserId = null;
        async function loadUserInfo() {
            try {
                const response = await fetch('/api/user-info');
                if (response.ok) {
                    const user = await response.json();
                    currentUserId = user.userId;
                    document.getElementById('userFullName').textContent = user.fullName;
                } else {
                    window.location.href = '/login.html';
                }
            } catch (error) {
                window.location.href = '/login.html';
            }
        }
        async function loadStatistics() {
            try {
                const userReportsResponse = await fetch('/api/my-reports');
                if (userReportsResponse.ok) {
                    const userReports = await userReportsResponse.json();
                    document.getElementById('totalReports').textContent = userReports.length;
                    document.getElementById('pendingReports').textContent = userReports.filter(r => r.status === 'pending').length;
                    document.getElementById('ongoingReports').textContent = userReports.filter(r => r.status === 'ongoing').length;
                    document.getElementById('resolvedReports').textContent = userReports.filter(r => r.status === 'resolved').length;
                }
                const allReportsResponse = await fetch('/api/reports');
                if (allReportsResponse.ok) {
                    const allReports = await allReportsResponse.json();
                    displayRecentReports(allReports.slice(0, 5));
                }
            } catch (error) {
                console.error('Error loading statistics:', error);
            }
        }
        function displayRecentReports(reports) {
            const container = document.getElementById('recentReports');
            if (reports.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No reports yet</h3><p>No reports have been submitted by residents yet.</p></div>';
                return;
            }
            let html = '<div class="table-container"><table><thead><tr><th>Description</th><th>Location</th><th>Date</th><th>Status</th></tr></thead><tbody>';
            reports.forEach(report => {
                const isOwnReport = report.user_id === currentUserId;
                html += '<tr><td>' + report.description.substring(0, 50) + (report.description.length > 50 ? '...' : '') + '<br><small style="color: #7f8c8d;">by @' + (report.username || 'Unknown') + (isOwnReport ? ' (You)' : '') + '</small></td>';
                html += '<td>' + report.location + '</td>';
                html += '<td>' + new Date(report.created_at).toLocaleDateString() + '</td>';
                html += '<td><span class="status-badge status-' + report.status + '">' + report.status + '</span></td></tr>';
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        }
        async function logout() {
            try {
                await fetch('/logout', { method: 'POST' });
            } catch (error) {}
            window.location.href = '/login.html';
        }
        document.addEventListener('DOMContentLoaded', () => {
            loadUserInfo();
            loadStatistics();
        });
    </script>
</body>
</html>`;

// Manage Reports HTML with embedded CSS
const MANAGE_REPORTS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Reports - Barangay San Francisco</title>
    <style>${CSS_CONTENT}</style>
</head>
<body>
    <header class="header">
        <h1>Barangay San Francisco Resident Report System</h1>
        <div class="user-info">
            <span>Welcome, <span id="userFullName">Loading...</span></span>
            <button class="btn btn-secondary btn-sm" onclick="logout()">Logout</button>
        </div>
    </header>
    <div class="layout-container">
        <aside class="sidebar">
            <nav>
                <a href="/admin-dashboard.html">Dashboard</a>
                <a href="/manage-reports.html" class="active">Manage Reports</a>
                <a href="/resident-directory.html">Resident Directory</a>
                <a href="/user-approval.html">User Approval</a>
                <a href="/transaction-history.html">Transaction History</a>
            </nav>
        </aside>
        <main class="main-content">
            <div class="card">
                <h2>Manage Reports</h2>
                <p>View and manage all resident reports. Update status and delete reports as needed.</p>
            </div>
            <div class="card">
                <div id="alert-container"></div>
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <input type="text" id="searchInput" placeholder="Search reports..." style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="min-width: 150px;">
                        <select id="statusFilter" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                </div>
                <div id="reportsContainer"><div class="loading">Loading reports...</div></div>
            </div>
        </main>
    </div>
    <script>
        let allReports = [], filteredReports = [];
        async function loadUserInfo() {
            try {
                const response = await fetch('/api/user-info');
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('userFullName').textContent = user.fullName;
                } else { window.location.href = '/login.html'; }
            } catch (error) { window.location.href = '/login.html'; }
        }
        async function loadReports() {
            try {
                const response = await fetch('/api/reports');
                if (response.ok) {
                    allReports = await response.json();
                    filteredReports = [...allReports];
                    displayReports(filteredReports);
                } else { showAlert('Failed to load reports', 'error'); }
            } catch (error) { showAlert('An error occurred while loading reports', 'error'); }
        }
        function displayReports(reportsToDisplay) {
            const container = document.getElementById('reportsContainer');
            if (reportsToDisplay.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No reports found</h3><p>' + (allReports.length === 0 ? 'No reports have been submitted yet.' : 'No reports match your filters.') + '</p></div>';
                return;
            }
            let html = '<div class="table-container"><table><thead><tr><th>Incident</th><th>Resident Name</th><th>Location</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
            reportsToDisplay.forEach(report => {
                html += '<tr><td>' + (report.description.length > 80 ? report.description.substring(0, 80) + '...' : report.description) + '</td>';
                html += '<td>' + report.resident_name + '</td><td>' + report.location + '</td>';
                html += '<td>' + new Date(report.created_at).toLocaleDateString() + '</td>';
                html += '<td><select class="status-badge status-' + report.status + '" onchange="updateStatus(' + report.id + ', this.value)" style="border: none; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; text-transform: uppercase; cursor: pointer;">';
                html += '<option value="pending"' + (report.status === 'pending' ? ' selected' : '') + '>Pending</option>';
                html += '<option value="ongoing"' + (report.status === 'ongoing' ? ' selected' : '') + '>Ongoing</option>';
                html += '<option value="resolved"' + (report.status === 'resolved' ? ' selected' : '') + '>Resolved</option></select></td>';
                html += '<td><div class="action-buttons"><button class="btn btn-sm btn-danger" onclick="deleteReport(' + report.id + ')">Delete</button></div></td></tr>';
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        }
        async function updateStatus(reportId, newStatus) {
            try {
                const response = await fetch('/api/reports/' + reportId + '/status', {
                    method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status: newStatus})
                });
                const result = await response.json();
                if (result.success) { showAlert('Report status updated successfully', 'success'); loadReports(); }
                else { showAlert(result.message, 'error'); loadReports(); }
            } catch (error) { showAlert('An error occurred while updating status', 'error'); loadReports(); }
        }
        async function deleteReport(reportId) {
            if (!confirm('Are you sure you want to delete this report?')) return;
            try {
                const response = await fetch('/api/reports/' + reportId, {method: 'DELETE'});
                const result = await response.json();
                if (result.success) { showAlert('Report deleted successfully', 'success'); loadReports(); }
                else { showAlert(result.message, 'error'); }
            } catch (error) { showAlert('An error occurred while deleting the report', 'error'); }
        }
        function filterReports() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const statusFilter = document.getElementById('statusFilter').value;
            filteredReports = allReports.filter(report => {
                const matchesSearch = report.description.toLowerCase().includes(searchTerm) || report.resident_name.toLowerCase().includes(searchTerm) || report.location.toLowerCase().includes(searchTerm);
                return matchesSearch && (!statusFilter || report.status === statusFilter);
            });
            displayReports(filteredReports);
        }
        function showAlert(message, type) {
            document.getElementById('alert-container').innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
            setTimeout(() => { document.getElementById('alert-container').innerHTML = ''; }, 5000);
        }
        async function logout() {
            try { await fetch('/logout', {method: 'POST'}); } catch (e) {}
            window.location.href = '/login.html';
        }
        document.getElementById('searchInput').addEventListener('input', filterReports);
        document.getElementById('statusFilter').addEventListener('change', filterReports);
        document.addEventListener('DOMContentLoaded', () => { loadUserInfo(); loadReports(); });
    </script>
</body>
</html>`;

// User Approval HTML with embedded CSS
const USER_APPROVAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Approval - Barangay San Francisco</title>
    <style>${CSS_CONTENT}</style>
</head>
<body>
    <header class="header">
        <h1>Barangay San Francisco Resident Report System</h1>
        <div class="user-info">
            <span>Welcome, <span id="userFullName">Loading...</span></span>
            <button class="btn btn-secondary btn-sm" onclick="logout()">Logout</button>
        </div>
    </header>
    <div class="layout-container">
        <aside class="sidebar">
            <nav>
                <a href="/admin-dashboard.html">Dashboard</a>
                <a href="/manage-reports.html">Manage Reports</a>
                <a href="/user-approval.html" class="active">User Approval</a>
                <a href="/resident-directory.html">Resident Directory</a>
                <a href="/transaction-history.html">Transaction History</a>
            </nav>
        </aside>
        <main class="main-content">
            <div class="card">
                <h2>User Approval Management</h2>
                <p>Review and approve or reject new resident registration requests.</p>
            </div>
            <div class="card">
                <div id="alert-container"></div>
                <div style="margin-bottom: 1.5rem;">
                    <input type="text" id="searchInput" placeholder="Search pending users by name, username, or address..." style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div id="pendingUsersContainer"><div class="loading">Loading pending users...</div></div>
            </div>
        </main>
    </div>
    <script>
        let allPendingUsers = [], filteredUsers = [];
        async function loadUserInfo() {
            try {
                const response = await fetch('/api/user-info');
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('userFullName').textContent = user.fullName;
                } else { window.location.href = '/login.html'; }
            } catch (error) { window.location.href = '/login.html'; }
        }
        async function loadPendingUsers() {
            try {
                const response = await fetch('/api/pending-users');
                if (response.ok) {
                    allPendingUsers = await response.json();
                    filteredUsers = [...allPendingUsers];
                    displayPendingUsers(filteredUsers);
                } else { showAlert('Failed to load pending users', 'error'); }
            } catch (error) { showAlert('An error occurred while loading pending users', 'error'); }
        }
        function displayPendingUsers(usersToDisplay) {
            const container = document.getElementById('pendingUsersContainer');
            if (usersToDisplay.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No pending users</h3><p>' + (allPendingUsers.length === 0 ? 'No users are currently pending approval.' : 'No users match your search.') + '</p></div>';
                return;
            }
            let html = '<div class="table-container"><table><thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Username</th><th>Contact</th><th>Address</th><th>Registration Date</th><th>Actions</th></tr></thead><tbody>';
            usersToDisplay.forEach(user => {
                html += '<tr><td><strong>' + user.full_name + '</strong></td>';
                html += '<td>' + user.age + '</td><td>' + user.gender + '</td><td>' + user.username + '</td>';
                html += '<td>' + user.contact_number + '</td><td>' + user.address + '</td>';
                html += '<td>' + new Date(user.created_at).toLocaleDateString() + '</td>';
                html += '<td><div class="action-buttons">';
                html += '<button class="btn btn-sm btn-success" onclick="approveUser(' + user.id + ')">Approve</button>';
                html += '<button class="btn btn-sm btn-danger" onclick="rejectUser(' + user.id + ')">Reject</button>';
                html += '<button class="btn btn-sm btn-warning" onclick="deleteUser(' + user.id + ')">Delete</button>';
                html += '</div></td></tr>';
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        }
        async function approveUser(userId) {
            if (!confirm('Are you sure you want to approve this user?')) return;
            try {
                const response = await fetch('/api/users/' + userId + '/approve', {method: 'PUT'});
                const result = await response.json();
                if (result.success) { showAlert('User approved successfully', 'success'); loadPendingUsers(); }
                else { showAlert(result.message, 'error'); }
            } catch (error) { showAlert('An error occurred while approving the user', 'error'); }
        }
        async function rejectUser(userId) {
            if (!confirm('Are you sure you want to reject this user?')) return;
            try {
                const response = await fetch('/api/users/' + userId + '/reject', {method: 'PUT'});
                const result = await response.json();
                if (result.success) { showAlert('User rejected successfully', 'success'); loadPendingUsers(); }
                else { showAlert(result.message, 'error'); }
            } catch (error) { showAlert('An error occurred while rejecting the user', 'error'); }
        }
        async function deleteUser(userId) {
            if (!confirm('Are you sure you want to delete this user?')) return;
            try {
                const response = await fetch('/api/users/' + userId, {method: 'DELETE'});
                const result = await response.json();
                if (result.success) { showAlert('User deleted successfully', 'success'); loadPendingUsers(); }
                else { showAlert(result.message, 'error'); }
            } catch (error) { showAlert('An error occurred while deleting the user', 'error'); }
        }
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filteredUsers = allPendingUsers.filter(user => {
                return user.full_name.toLowerCase().includes(searchTerm) || user.username.toLowerCase().includes(searchTerm) || user.address.toLowerCase().includes(searchTerm) || user.contact_number.includes(searchTerm);
            });
            displayPendingUsers(filteredUsers);
        });
        function showAlert(message, type) {
            document.getElementById('alert-container').innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
            setTimeout(() => { document.getElementById('alert-container').innerHTML = ''; }, 5000);
        }
        async function logout() {
            try { await fetch('/logout', {method: 'POST'}); } catch (e) {}
            window.location.href = '/login.html';
        }
        document.addEventListener('DOMContentLoaded', () => { loadUserInfo(); loadPendingUsers(); });
    </script>
</body>
</html>`;

// Resident Directory HTML with embedded CSS
const RESIDENT_DIRECTORY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resident Directory - Barangay San Francisco</title>
    <style>${CSS_CONTENT}</style>
</head>
<body>
    <header class="header">
        <h1>Barangay San Francisco Resident Report System</h1>
        <div class="user-info">
            <span>Welcome, <span id="userFullName">Loading...</span></span>
            <button class="btn btn-secondary btn-sm" onclick="logout()">Logout</button>
        </div>
    </header>
    <div class="layout-container">
        <aside class="sidebar">
            <nav>
                <a href="/admin-dashboard.html">Dashboard</a>
                <a href="/manage-reports.html">Manage Reports</a>
                <a href="/user-approval.html">User Approval</a>
                <a href="/resident-directory.html" class="active">Resident Directory</a>
                <a href="/transaction-history.html">Transaction History</a>
            </nav>
        </aside>
        <main class="main-content">
            <div class="card">
                <h2>Resident Directory</h2>
                <p>View all registered residents in the barangay system.</p>
            </div>
            <div class="card">
                <div id="alert-container"></div>
                <div style="margin-bottom: 1.5rem;">
                    <input type="text" id="searchInput" placeholder="Search residents by name, username, or address..." style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div id="residentsContainer"><div class="loading">Loading residents...</div></div>
            </div>
        </main>
    </div>
    <script>
        let allResidents = [], filteredResidents = [];
        async function loadUserInfo() {
            try {
                const response = await fetch('/api/user-info');
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('userFullName').textContent = user.fullName;
                } else { window.location.href = '/login.html'; }
            } catch (error) { window.location.href = '/login.html'; }
        }
        async function loadResidents() {
            try {
                const response = await fetch('/api/residents');
                if (response.ok) {
                    allResidents = await response.json();
                    filteredResidents = [...allResidents];
                    displayResidents(filteredResidents);
                } else { showAlert('Failed to load residents', 'error'); }
            } catch (error) { showAlert('An error occurred while loading residents', 'error'); }
        }
        function displayResidents(residentsToDisplay) {
            const container = document.getElementById('residentsContainer');
            if (residentsToDisplay.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No residents found</h3><p>' + (allResidents.length === 0 ? 'No residents have registered yet.' : 'No residents match your search.') + '</p></div>';
                return;
            }
            let html = '<div class="table-container"><table><thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Username</th><th>Contact Number</th><th>Address</th><th>Last Login</th><th>Actions</th></tr></thead><tbody>';
            residentsToDisplay.forEach(resident => {
                html += '<tr><td><strong>' + resident.full_name + '</strong></td>';
                html += '<td>' + resident.age + '</td><td>' + resident.gender + '</td><td>' + resident.username + '</td>';
                html += '<td>' + resident.contact_number + '</td><td>' + resident.address + '</td>';
                html += '<td>' + (resident.last_login ? new Date(resident.last_login).toLocaleDateString() : 'Never') + '</td>';
                html += '<td><div class="action-buttons"><button class="btn btn-sm btn-danger" onclick="deleteUser(' + resident.id + ', \'' + resident.full_name + '\')">Delete</button></div></td></tr>';
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        }
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filteredResidents = allResidents.filter(resident => {
                return resident.full_name.toLowerCase().includes(searchTerm) || resident.username.toLowerCase().includes(searchTerm) || resident.address.toLowerCase().includes(searchTerm) || resident.contact_number.includes(searchTerm);
            });
            displayResidents(filteredResidents);
        });
        async function deleteUser(userId, userName) {
            if (!confirm('Are you sure you want to delete ' + userName + '?')) return;
            try {
                const response = await fetch('/api/users/' + userId, {method: 'DELETE'});
                const result = await response.json();
                if (result.success) { showAlert(userName + ' deleted successfully', 'success'); loadResidents(); }
                else { showAlert(result.message, 'error'); }
            } catch (error) { showAlert('An error occurred while deleting the user', 'error'); }
        }
        function showAlert(message, type) {
            document.getElementById('alert-container').innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
            setTimeout(() => { document.getElementById('alert-container').innerHTML = ''; }, 5000);
        }
        async function logout() {
            try { await fetch('/logout', {method: 'POST'}); } catch (e) {}
            window.location.href = '/login.html';
        }
        document.addEventListener('DOMContentLoaded', () => { loadUserInfo(); loadResidents(); });
    </script>
</body>
</html>`;

// Transaction History HTML with embedded CSS
const TRANSACTION_HISTORY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transaction History - Barangay San Francisco</title>
    <style>${CSS_CONTENT}</style>
</head>
<body>
    <header class="header">
        <h1>Barangay San Francisco Resident Report System</h1>
        <div class="user-info">
            <span>Welcome, <span id="userFullName">Loading...</span></span>
            <button class="btn btn-secondary btn-sm" onclick="logout()">Logout</button>
        </div>
    </header>
    <div class="layout-container">
        <aside class="sidebar">
            <nav>
                <a href="/admin-dashboard.html">Dashboard</a>
                <a href="/manage-reports.html">Manage Reports</a>
                <a href="/user-approval.html">User Approval</a>
                <a href="/resident-directory.html">Resident Directory</a>
                <a href="/transaction-history.html" class="active">Transaction History</a>
            </nav>
        </aside>
        <main class="main-content">
            <div class="card">
                <h2>Transaction History / System Logs</h2>
                <p>View all system activities and user actions.</p>
            </div>
            <div class="card">
                <div id="alert-container"></div>
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <input type="text" id="searchInput" placeholder="Search logs..." style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="min-width: 150px;">
                        <select id="actionFilter" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">All Actions</option>
                            <option value="Login">Login</option>
                            <option value="Logout">Logout</option>
                            <option value="Registration">Registration</option>
                            <option value="Created report">Created Report</option>
                            <option value="Deleted report">Deleted Report</option>
                            <option value="Updated report">Updated Report</option>
                        </select>
                    </div>
                </div>
                <div id="logsContainer"><div class="loading">Loading transaction history...</div></div>
            </div>
        </main>
    </div>
    <script>
        let allLogs = [], filteredLogs = [];
        async function loadUserInfo() {
            try {
                const response = await fetch('/api/user-info');
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('userFullName').textContent = user.fullName;
                } else { window.location.href = '/login.html'; }
            } catch (error) { window.location.href = '/login.html'; }
        }
        async function loadLogs() {
            try {
                const response = await fetch('/api/logs');
                if (response.ok) {
                    allLogs = await response.json();
                    filteredLogs = [...allLogs];
                    displayLogs(filteredLogs);
                } else { showAlert('Failed to load transaction history', 'error'); }
            } catch (error) { showAlert('An error occurred while loading transaction history', 'error'); }
        }
        function displayLogs(logsToDisplay) {
            const container = document.getElementById('logsContainer');
            if (logsToDisplay.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No logs found</h3><p>' + (allLogs.length === 0 ? 'No system activities recorded yet.' : 'No logs match your filters.') + '</p></div>';
                return;
            }
            let html = '<div class="table-container"><table><thead><tr><th>Date & Time</th><th>User</th><th>Username</th><th>Action</th></tr></thead><tbody>';
            logsToDisplay.forEach(log => {
                html += '<tr><td>' + new Date(log.timestamp).toLocaleString() + '</td>';
                html += '<td><strong>' + log.full_name + '</strong></td><td>' + log.username + '</td><td>' + log.action + '</td></tr>';
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        }
        function filterLogs() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const actionFilter = document.getElementById('actionFilter').value;
            filteredLogs = allLogs.filter(log => {
                const matchesSearch = log.full_name.toLowerCase().includes(searchTerm) || log.username.toLowerCase().includes(searchTerm) || log.action.toLowerCase().includes(searchTerm);
                const matchesAction = !actionFilter || log.action.includes(actionFilter);
                return matchesSearch && matchesAction;
            });
            displayLogs(filteredLogs);
        }
        function showAlert(message, type) {
            document.getElementById('alert-container').innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
            setTimeout(() => { document.getElementById('alert-container').innerHTML = ''; }, 5000);
        }
        async function logout() {
            try { await fetch('/logout', {method: 'POST'}); } catch (e) {}
            window.location.href = '/login.html';
        }
        document.getElementById('searchInput').addEventListener('input', filterLogs);
        document.getElementById('actionFilter').addEventListener('change', filterLogs);
        document.addEventListener('DOMContentLoaded', () => { loadUserInfo(); loadLogs(); });
    </script>
</body>
</html>`;

// New Report HTML with embedded CSS
const NEW_REPORT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Report - Barangay San Francisco</title>
    <style>${CSS_CONTENT}</style>
</head>
<body>
    <header class="header">
        <h1>Barangay San Francisco Resident Report System</h1>
        <div class="user-info">
            <span>Welcome, <span id="userFullName">Loading...</span></span>
            <button class="btn btn-secondary btn-sm" onclick="logout()">Logout</button>
        </div>
    </header>
    <div class="layout-container">
        <aside class="sidebar">
            <nav>
                <a href="/resident-dashboard.html">Dashboard</a>
                <a href="/new-report.html" class="active">New Report</a>
                <a href="/my-reports.html">My Reports</a>
            </nav>
        </aside>
        <main class="main-content">
            <div class="card">
                <h2>Submit New Report</h2>
                <p>Please provide detailed information about the incident or complaint you wish to report.</p>
            </div>
            <div class="card">
                <div id="alert-container"></div>
                <form id="reportForm">
                    <div class="form-group">
                        <label for="description">What happened? (Description)</label>
                        <textarea id="description" name="description" required placeholder="Please describe the incident or complaint in detail..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="date_time">When did it happen?</label>
                        <input type="datetime-local" id="date_time" name="date_time" required>
                    </div>
                    <div class="form-group">
                        <label for="location">Where did it happen? (Location/Purok)</label>
                        <input type="text" id="location" name="location" required placeholder="e.g., Purok 1, Near Barangay Hall">
                    </div>
                    <div class="form-group">
                        <label for="involved_persons">Who was involved?</label>
                        <input type="text" id="involved_persons" name="involved_persons" placeholder="Names of people involved (if known)">
                    </div>
                    <div class="form-group">
                        <label for="cause">Possible cause</label>
                        <textarea id="cause" name="cause" placeholder="What do you think caused this incident?"></textarea>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button type="submit" class="btn btn-primary">Submit Report</button>
                        <button type="button" class="btn btn-secondary" onclick="window.location.href='/resident-dashboard.html'">Cancel</button>
                    </div>
                </form>
            </div>
        </main>
    </div>
    <script>
        async function loadUserInfo() {
            try {
                const response = await fetch('/api/user-info');
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('userFullName').textContent = user.fullName;
                } else { window.location.href = '/login.html'; }
            } catch (error) { window.location.href = '/login.html'; }
        }
        function setDefaultDateTime() {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const localTime = new Date(now - offset);
            document.getElementById('date_time').value = localTime.toISOString().slice(0, 16);
        }
        document.getElementById('reportForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            try {
                const response = await fetch('/api/reports', {
                    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    showAlert('Report submitted successfully! Redirecting to dashboard...', 'success');
                    setTimeout(() => { window.location.href = '/resident-dashboard.html'; }, 2000);
                } else { showAlert(result.message, 'error'); }
            } catch (error) { showAlert('An error occurred. Please try again.', 'error'); }
        });
        function showAlert(message, type) {
            document.getElementById('alert-container').innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
            setTimeout(() => { document.getElementById('alert-container').innerHTML = ''; }, 5000);
        }
        async function logout() {
            try { await fetch('/logout', {method: 'POST'}); } catch (e) {}
            window.location.href = '/login.html';
        }
        document.addEventListener('DOMContentLoaded', () => { loadUserInfo(); setDefaultDateTime(); });
    </script>
</body>
</html>`;

// My Reports HTML with embedded CSS
const MY_REPORTS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Reports - Barangay San Francisco</title>
    <style>${CSS_CONTENT}</style>
</head>
<body>
    <header class="header">
        <h1>Barangay San Francisco Resident Report System</h1>
        <div class="user-info">
            <span>Welcome, <span id="userFullName">Loading...</span></span>
            <button class="btn btn-secondary btn-sm" onclick="logout()">Logout</button>
        </div>
    </header>
    <div class="layout-container">
        <aside class="sidebar">
            <nav>
                <a href="/resident-dashboard.html">Dashboard</a>
                <a href="/new-report.html">New Report</a>
                <a href="/my-reports.html" class="active">My Reports</a>
            </nav>
        </aside>
        <main class="main-content">
            <div class="card">
                <h2>My Reports</h2>
                <p>View and manage all your submitted reports.</p>
            </div>
            <div class="card">
                <div id="alert-container"></div>
                <div id="reportsContainer"><div class="loading">Loading your reports...</div></div>
            </div>
        </main>
    </div>
    <div id="editModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <h2>Edit Report</h2>
            <div id="editAlertContainer"></div>
            <form id="editForm">
                <input type="hidden" id="editReportId">
                <div class="form-group"><label for="editDescription">Description</label><textarea id="editDescription" required></textarea></div>
                <div class="form-group"><label for="editDateTime">Date & Time</label><input type="datetime-local" id="editDateTime" required></div>
                <div class="form-group"><label for="editLocation">Location</label><input type="text" id="editLocation" required></div>
                <div class="form-group"><label for="editInvolvedPersons">Involved Persons</label><input type="text" id="editInvolvedPersons"></div>
                <div class="form-group"><label for="editCause">Cause</label><input type="text" id="editCause"></div>
                <div style="display: flex; gap: 1rem;">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                </div>
            </form>
        </div>
    </div>
    <script>
        let reports = [], currentUserId = null;
        async function loadUserInfo() {
            try {
                const response = await fetch('/api/user-info');
                if (response.ok) {
                    const user = await response.json();
                    currentUserId = user.userId;
                    document.getElementById('userFullName').textContent = user.fullName;
                } else { window.location.href = '/login.html'; }
            } catch (error) { window.location.href = '/login.html'; }
        }
        async function loadReports() {
            try {
                const response = await fetch('/api/my-reports');
                if (response.ok) {
                    reports = await response.json();
                    displayReports(reports);
                } else { showAlert('Failed to load your reports', 'error'); }
            } catch (error) { showAlert('An error occurred while loading your reports', 'error'); }
        }
        function displayReports(reportsToDisplay) {
            const container = document.getElementById('reportsContainer');
            if (reportsToDisplay.length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No reports found</h3><p>You haven\'t submitted any reports yet.</p><button class="btn btn-primary" onclick="window.location.href=\'/new-report.html\'">Submit Your First Report</button></div>';
                return;
            }
            let html = '<div class="table-container"><table><thead><tr><th>Description</th><th>Location</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
            reportsToDisplay.forEach(report => {
                html += '<tr><td>' + (report.description.length > 100 ? report.description.substring(0, 100) + '...' : report.description) + '</td>';
                html += '<td>' + report.location + '</td>';
                html += '<td>' + new Date(report.created_at).toLocaleDateString() + '</td>';
                html += '<td><span class="status-badge status-' + report.status + '">' + report.status + '</span></td>';
                html += '<td><div class="action-buttons"><button class="btn btn-sm btn-primary" onclick="editReport(' + report.id + ')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteReport(' + report.id + ')">Delete</button></div></td></tr>';
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        }
        function editReport(reportId) {
            const report = reports.find(r => r.id === reportId);
            if (!report) return;
            document.getElementById('editReportId').value = report.id;
            document.getElementById('editDescription').value = report.description;
            document.getElementById('editDateTime').value = report.date_time;
            document.getElementById('editLocation').value = report.location;
            document.getElementById('editInvolvedPersons').value = report.involved_persons || '';
            document.getElementById('editCause').value = report.cause || '';
            document.getElementById('editModal').style.display = 'block';
        }
        function closeEditModal() {
            document.getElementById('editModal').style.display = 'none';
            document.getElementById('editAlertContainer').innerHTML = '';
        }
        document.getElementById('editForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const reportId = document.getElementById('editReportId').value;
            const data = {
                description: document.getElementById('editDescription').value,
                date_time: document.getElementById('editDateTime').value,
                location: document.getElementById('editLocation').value,
                involved_persons: document.getElementById('editInvolvedPersons').value,
                cause: document.getElementById('editCause').value
            };
            try {
                const response = await fetch('/api/reports/' + reportId, {
                    method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) { showEditAlert('Report updated successfully', 'success'); closeEditModal(); loadReports(); }
                else { showEditAlert(result.message, 'error'); }
            } catch (error) { showEditAlert('An error occurred. Please try again.', 'error'); }
        });
        async function deleteReport(reportId) {
            if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;
            try {
                const response = await fetch('/api/reports/' + reportId, {method: 'DELETE'});
                const result = await response.json();
                if (result.success) { showAlert('Report deleted successfully', 'success'); loadReports(); }
                else { showAlert(result.message, 'error'); }
            } catch (error) { showAlert('An error occurred while deleting the report', 'error'); }
        }
        function showAlert(message, type) {
            document.getElementById('alert-container').innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
            setTimeout(() => { document.getElementById('alert-container').innerHTML = ''; }, 5000);
        }
        function showEditAlert(message, type) {
            document.getElementById('editAlertContainer').innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
            setTimeout(() => { document.getElementById('editAlertContainer').innerHTML = ''; }, 5000);
        }
        async function logout() {
            try { await fetch('/logout', {method: 'POST'}); } catch (e) {}
            window.location.href = '/login.html';
        }
        document.addEventListener('DOMContentLoaded', () => { loadUserInfo(); loadReports(); });
    </script>
</body>
</html>`;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve login.html inline with embedded CSS
app.get('/login.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(LOGIN_HTML);
});

// Serve register.html inline with embedded CSS
app.get('/register.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(REGISTER_HTML);
});

// Serve CSS directly from inline constant
app.get('/style.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.send(CSS_CONTENT);
});

// Redirect root to login.html
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Serve admin-dashboard.html inline with embedded CSS
app.get('/admin-dashboard.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(ADMIN_DASHBOARD_HTML);
});

// Serve admin dashboard clean URL
app.get('/admin-dashboard', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(ADMIN_DASHBOARD_HTML);
});

// Serve resident-dashboard.html inline with embedded CSS
app.get('/resident-dashboard.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(RESIDENT_DASHBOARD_HTML);
});

// Serve resident dashboard clean URL
app.get('/resident-dashboard', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(RESIDENT_DASHBOARD_HTML);
});

// Serve manage-reports.html
app.get('/manage-reports.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(MANAGE_REPORTS_HTML);
});

// Serve manage-reports clean URL
app.get('/manage-reports', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(MANAGE_REPORTS_HTML);
});

// Serve user-approval.html
app.get('/user-approval.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(USER_APPROVAL_HTML);
});

// Serve user-approval clean URL
app.get('/user-approval', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(USER_APPROVAL_HTML);
});

// Serve resident-directory.html
app.get('/resident-directory.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(RESIDENT_DIRECTORY_HTML);
});

// Serve resident-directory clean URL
app.get('/resident-directory', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(RESIDENT_DIRECTORY_HTML);
});

// Serve transaction-history.html
app.get('/transaction-history.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(TRANSACTION_HISTORY_HTML);
});

// Serve transaction-history clean URL
app.get('/transaction-history', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(TRANSACTION_HISTORY_HTML);
});

// Serve new-report.html
app.get('/new-report.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(NEW_REPORT_HTML);
});

// Serve new-report clean URL
app.get('/new-report', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(NEW_REPORT_HTML);
});

// Serve my-reports.html
app.get('/my-reports.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(MY_REPORTS_HTML);
});

// Serve my-reports clean URL
app.get('/my-reports', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(MY_REPORTS_HTML);
});

// Serve all other HTML files from public folder with inline CSS
app.get('/:page(*).html', (req, res) => {
    const page = req.params.page;
    const possiblePaths = [
        path.join(__dirname, 'public', `${page}.html`),
        path.join(process.cwd(), 'public', `${page}.html`),
        `./public/${page}.html`,
        `public/${page}.html`
    ];
    
    for (const filePath of possiblePaths) {
        try {
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                // Inline the CSS using the constant
                content = content.replace('<link rel="stylesheet" href="style.css">', `<style>${CSS_CONTENT}</style>`);
                res.setHeader('Content-Type', 'text/html');
                return res.send(content);
            }
        } catch (err) {
            // Try next path
        }
    }
    res.status(404).send(`Page not found: ${page}.html`);
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
        console.log('DEBUG: Total users fetched:', users.length);
        console.log('DEBUG: All users:', users.map(u => ({ id: u.id, username: u.username, role: u.role, status: u.status })));
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
        console.log('DEBUG: Filtered residents:', residents.length);
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
        console.log('DEBUG pending-users: Total users:', users.length);
        console.log('DEBUG pending-users: Users data:', users.map(u => ({ id: u.id, username: u.username, role: u.role, status: u.status })));
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
        console.log('DEBUG pending-users: Filtered pending:', pendingUsers.length);
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
