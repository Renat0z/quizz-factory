import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import QuizListPage from './QuizListPage';
import QuizBuilderPage from './QuizBuilderPage';
import AnalyticsPage from './AnalyticsPage';
import ResponsesPage from './ResponsesPage';
import EvaluationPage from './EvaluationPage';

function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default function AdminApp() {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('qf_admin_token');
    return isTokenValid(t) ? t : null;
  });

  const handleLogin = (t) => setToken(t);
  const handleLogout = () => setToken(null);

  if (!token) {
    return (
      <Routes>
        <Route path="login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    );
  }

  return (
    <AdminLayout onLogout={handleLogout}>
      <Routes>
        <Route index element={<DashboardPage token={token} />} />
        <Route path="quizzes" element={<QuizListPage token={token} />} />
        <Route path="quizzes/new" element={<QuizBuilderPage token={token} />} />
        <Route path="quizzes/:id/edit" element={<QuizBuilderPage token={token} />} />
        <Route path="quizzes/:id/analytics" element={<AnalyticsPage token={token} />} />
        <Route path="quizzes/:id/responses" element={<ResponsesPage token={token} />} />
        <Route path="quizzes/:id/evaluation" element={<EvaluationPage token={token} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}
