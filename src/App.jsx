import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { MapPin, LayoutDashboard, PlusCircle, Trophy, Settings } from 'lucide-react';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="logo-container">
            <MapPin className="logo-icon" size={28} />
            <span>CivicFix</span>
          </div>
          
          <nav className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              Dashboard
            </NavLink>
            <NavLink to="/report" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <PlusCircle size={20} />
              Report Issue
            </NavLink>
            <NavLink to="/leaderboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Trophy size={20} />
              Civic Score
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Settings size={20} />
              Settings
            </NavLink>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={
              <div>
                <h2>Welcome to CivicFix</h2>
                <div className="glass-panel" style={{ marginTop: '24px' }}>
                  <h3>Agent Status</h3>
                  <p style={{ color: 'var(--text-muted)' }}>AI monitoring infrastructure reports in your area...</p>
                </div>
              </div>
            } />
            <Route path="/report" element={<h2>Report an Issue</h2>} />
            <Route path="/leaderboard" element={<h2>Civic Score</h2>} />
            <Route path="/settings" element={<h2>Settings</h2>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
