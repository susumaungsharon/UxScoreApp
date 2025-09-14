import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminUsers from './components/AdminUsers';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role');
    const savedUsername = localStorage.getItem('username');
    
    if (savedToken) {
      setToken(savedToken);
      setRole(savedRole);
      setUsername(savedUsername || '');
    }
  }, []);

  return (
    <Router
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true
      }}
    >
      <Navbar token={token} role={role} setToken={setToken} setRole={setRole} username={username} />
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
          <Route path="/login" element={<Login setToken={setToken} setRole={setRole} setUsername={setUsername} />} />
          <Route
            path="/dashboard"
            element={token ? <Dashboard token={token} role={role} setToken={setToken} setRole={setRole} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/categories"
            element={token && role === 'Admin' ? <AdminCategories token={token} setToken={setToken} setRole={setRole} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/users"
            element={token && role === 'Admin' ? <AdminUsers token={token} setToken={setToken} setRole={setRole} /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;