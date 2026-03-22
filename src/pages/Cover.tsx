import { Link } from 'react-router-dom';

export default function Cover() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-primary/10 px-10 py-4 bg-background-light dark:bg-background-dark">
        <div className="flex items-center gap-4 text-slate-900 dark:text-slate-100">
          <div className="size-8 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">menu_book</span>
          </div>
          <h2 className="text-slate-900 dark:text-slate-100 text-xl font-display font-bold leading-tight tracking-tight">Álbum de Memórias</h2>
        </div>
        <div className="flex flex-1 justify-end gap-8">
          <nav className="flex items-center gap-9">
            <Link to="/" className="text-slate-900 dark:text-slate-100 text-sm font-medium hover:text-primary transition-colors">Início</Link>
            <Link to="/viewer" className="text-slate-900 dark:text-slate-100 text-sm font-medium hover:text-primary transition-colors">Galeria</Link>
            <a className="text-slate-900 dark:text-slate-100 text-sm font-medium hover:text-primary transition-colors" href="#">Mensagens</a>
          </nav>
          <div className="flex gap-3">
            <button className="flex items-center justify-center rounded-xl size-10 bg-primary/10 text-slate-900 dark:text-slate-100 hover:bg-primary/20 transition-all">
              <span className="material-symbols-outlined">person</span>
            </button>
            <Link to="/dashboard" className="flex items-center justify-center rounded-xl size-10 bg-primary/10 text-slate-900 dark:text-slate-100 hover:bg-primary/20 transition-all">
              <span className="material-symbols-outlined">settings</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Background Patterns */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary rounded-full blur-[150px]"></div>
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(#f4c025 0.5px, transparent 0.5px)", backgroundSize: "24px 24px" }}></div>
        </div>

        <div className="max-w-[1000px] w-full flex flex-col items-center z-10">
          {/* Luxury Book Cover Container */}
          <div className="relative group cursor-pointer transition-transform duration-500 hover:scale-[1.02]">
            {/* Book Spine Effect */}
            <div className="absolute -left-4 top-4 bottom-4 w-8 bg-[#1a150d] rounded-l-lg shadow-2xl z-0"></div>
            
            {/* Main Cover */}
            <div className="relative w-[500px] h-[650px] leather-texture rounded-r-xl rounded-l-sm shadow-[20px_20px_60px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center p-12 border-l border-black/30">
              {/* Gold Frame Decorative */}
              <div className="absolute inset-8 border-2 border-primary/40 rounded-lg pointer-events-none"></div>
              <div className="absolute inset-10 border border-primary/20 rounded-md pointer-events-none"></div>
              
              {/* Gold Corners */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
              <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
              
              {/* Cover Content */}
              <div className="text-center space-y-8 z-10">
                <div className="flex justify-center mb-4">
                  <span className="material-symbols-outlined text-6xl text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">auto_awesome</span>
                </div>
                <div className="space-y-4">
                  <h1 className="text-primary font-display text-5xl font-bold tracking-tight leading-tight drop-shadow-lg">
                    Coleção de<br/>Momentos
                  </h1>
                  <div className="w-24 h-1 bg-primary/50 mx-auto rounded-full"></div>
                  <p className="text-primary/80 font-display italic text-xl">Uma jornada através do tempo</p>
                </div>
                <div className="pt-12">
                  <div className="w-48 h-48 mx-auto rounded-lg overflow-hidden gold-border rotate-3 transition-transform group-hover:rotate-0">
                    <img alt="Foto de celebração de aniversário" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuFLfPG0J_fGN24S2JHOEYyJK_N7kzb5-87GxfPPm5os33rtbddcM1aSX3HTOEWuUuR9c3iM1zMc1BEgXj-myO4Tjv1IHNJ4oTfC-icllqlwq56qM_a_aeRhHA5xsvtAM35HVQnTCIF7vy05wV-FpKFZSJc0kLKVGo6LUSO0bZR_6nKMApMyxqoApvAbgW4IowBGVQoGkKNM3wyUfiy63j3Beh6XuMNIIZG2AeJFL9XkgfcMBc9nHNsp2nSbEMVFsYFRqyKhwTkpY"/>
                  </div>
                </div>
              </div>
              
              {/* Decorative Page Curl */}
              <div className="absolute bottom-0 right-0 w-16 h-16 page-curl rounded-br-xl opacity-80"></div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-12 text-center max-w-xl">
            <h2 className="text-slate-900 dark:text-slate-100 font-display text-3xl font-bold mb-4">Feliz Aniversário!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
              Cada página deste álbum guarda um pedaço da nossa história. Toque no botão abaixo para reviver os momentos mais especiais.
            </p>
            <Link to="/viewer" className="group relative flex min-w-[240px] mx-auto cursor-pointer items-center justify-center overflow-hidden rounded-full h-16 px-10 bg-primary text-background-dark text-xl font-bold leading-normal tracking-wide shadow-xl hover:shadow-primary/40 transition-all active:scale-95">
              <span className="mr-3">Abrir Álbum</span>
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">auto_stories</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-slate-500 dark:text-slate-500 text-sm">
        <p className="font-sans">© 2024 Álbum Interativo Digital. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
