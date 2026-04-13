import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import JobOpenings from './pages/JobOpenings';
import Candidates from './pages/Candidates';
import Interviews from './pages/Interviews';
import Clients from './pages/Clients';
import Contacts from './pages/Contacts';
import Analysis from './pages/Analysis';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="job-openings" element={<JobOpenings />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="clients" element={<Clients />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="analysis" element={<Analysis />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
