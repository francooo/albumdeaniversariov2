import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <span className="material-symbols-outlined text-7xl text-slate-200 block mb-4">
          sentiment_dissatisfied
        </span>
        <h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-600 mb-4">Página não encontrada</h2>
        <p className="text-slate-500 mb-8">
          O endereço que você digitou não existe ou foi removido.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition-all"
        >
          <span className="material-symbols-outlined text-lg">home</span>
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
