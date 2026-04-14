import { Routes, Route } from 'react-router-dom';
import HomePage from './presentation/pages/HomePage';
import QuizPage from './presentation/pages/QuizPage';
import AdminApp from './presentation/pages/admin/AdminApp';

export default function App() {
  return (
    <Routes>
      {/* Painel admin */}
      <Route path="/admin/*" element={<AdminApp />} />

      {/* Páginas públicas */}
      <Route path="/" element={<HomePage />} />
      <Route path="/:slug" element={<QuizPage />} />
    </Routes>
  );
}
