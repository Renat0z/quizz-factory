import { useState, useEffect } from 'react';
import { QuizApiRepository } from '../../infrastructure/api/QuizApiRepository';
import { makeGetQuizBySlug } from '../../core/usecases/GetQuizBySlug';

const repo = new QuizApiRepository();
const getQuizBySlug = makeGetQuizBySlug(repo);

/**
 * Hook para carregar um quiz por slug.
 */
export function useQuiz(slug) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    getQuizBySlug(slug)
      .then(setQuiz)
      .catch(err => setError(err.statusCode === 404 ? 'not_found' : 'error'))
      .finally(() => setLoading(false));
  }, [slug]);

  return { quiz, loading, error };
}
