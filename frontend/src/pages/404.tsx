import React from "react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-900 text-white text-center px-4">
      <h1 className="text-6xl font-extrabold text-yellow-400 mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page non trouvée</h2>
      <p className="text-blue-200 mb-8">
        La page que vous cherchez n’existe pas ou a été déplacée.
      </p>
      <a
        href="/home"
        className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-full hover:bg-yellow-300 transition-all shadow-lg"
      >
        Retour à l’accueil
      </a>
    </div>
  );
}
