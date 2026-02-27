import { useEffect, useState, useRef, FormEvent } from 'react';
import { io, Socket } from 'socket.io-client';
import { Users, Plus, Trash2, Globe, Activity, Search, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PageCount {
  path: string;
  count: number;
}

export default function App() {
  const [monitoredPages, setMonitoredPages] = useState<PageCount[]>([]);
  const [newPath, setNewPath] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const socketRef = useRef<Socket | null>(null);

  // Load saved pages from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('monitored_pages');
    if (saved) {
      try {
        const paths = JSON.parse(saved) as string[];
        setMonitoredPages(paths.map(p => ({ path: p, count: 0 })));
      } catch (e) {
        console.error("Failed to parse saved pages", e);
      }
    }
  }, []);

  // Save pages to localStorage when they change
  useEffect(() => {
    const paths = monitoredPages.map(p => p.path);
    localStorage.setItem('monitored_pages', JSON.stringify(paths));
  }, [monitoredPages.length]);

  useEffect(() => {
    const newSocket = io();
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setStatus('connected');
      // Re-join all monitored pages on reconnect
      monitoredPages.forEach(p => {
        newSocket.emit('monitor-page', p.path);
      });
    });

    newSocket.on('update-count', (data: { pagePath: string, count: number }) => {
      setMonitoredPages(prev => prev.map(p => 
        p.path === data.pagePath ? { ...p, count: data.count } : p
      ));
    });

    newSocket.on('disconnect', () => {
      setStatus('disconnected');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const addPage = (e?: FormEvent) => {
    if (e) e.preventDefault();
    let path = newPath.trim();
    if (!path) return;

    // Try to extract path if it's a full URL
    try {
      if (path.startsWith('http')) {
        const url = new URL(path);
        path = url.pathname;
      }
    } catch (e) {
      // Not a valid URL, treat as path
    }
    
    // Ensure path starts with /
    if (!path.startsWith('/')) path = '/' + path;
    
    // Check if already monitored
    if (monitoredPages.some(p => p.path === path)) {
      setNewPath('');
      return;
    }

    const newPage = { path, count: 0 };
    setMonitoredPages(prev => [...prev, newPage]);
    
    if (socketRef.current) {
      socketRef.current.emit('monitor-page', path);
    }
    
    setNewPath('');
  };

  const removePage = (path: string) => {
    setMonitoredPages(prev => prev.filter(p => p.path !== path));
    // Note: Socket.IO handles leaving rooms automatically if we wanted, 
    // but here we just stop tracking it in state.
  };

  const totalOnline = monitoredPages.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-500/60">Real-Time Monitor</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight mb-2">Dashboard de Visitantes</h1>
            <p className="text-white/40 max-w-md">Monitore múltiplas páginas simultaneamente. Insira o caminho da página (ex: /home) para começar.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex items-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-400">{totalOnline}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Total Online</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-black">{monitoredPages.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Páginas</div>
            </div>
          </div>
        </header>

        {/* Input Section */}
        <div className="mb-12">
          <form onSubmit={addPage} className="relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
            </div>
            <input 
              type="text" 
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="Digite o caminho da página (ex: /vendas, /checkout, /obrigado)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-32 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-lg placeholder:text-white/10"
            />
            <button 
              type="submit"
              className="absolute right-3 top-3 bottom-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 rounded-xl transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </form>
        </div>

        {/* Grid of Monitored Pages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {monitoredPages.map((page) => (
              <motion.div
                key={page.path}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-3xl p-8 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => removePage(page.path)}
                    className="p-2 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/5 rounded-lg">
                    <Globe className="w-4 h-4 text-white/40" />
                  </div>
                  <span className="text-sm font-mono text-white/60 truncate max-w-[150px]">{page.path}</span>
                </div>

                <div className="flex items-baseline gap-3 mb-2">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={page.count}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      className="text-6xl font-black tracking-tighter text-white"
                    >
                      {page.count}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-emerald-500/50 font-bold text-sm">LIVE</span>
                </div>
                
                <div className="text-xs font-bold uppercase tracking-widest text-white/20">Visitantes Ativos</div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Sincronizado</span>
                  </div>
                  <a 
                    href={page.path} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-white/20 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    Ver Página <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {monitoredPages.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
              <div className="inline-flex p-4 bg-white/5 rounded-full mb-4">
                <Users className="w-8 h-8 text-white/10" />
              </div>
              <h3 className="text-xl font-bold text-white/40 mb-2">Nenhuma página monitorada</h3>
              <p className="text-white/20 text-sm">Adicione uma URL acima para começar a ver os dados em tempo real.</p>
            </div>
          )}
        </div>

        {/* Integration Help */}
        <footer className="mt-24 pt-12 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h4 className="text-lg font-bold mb-4">Como funciona?</h4>
              <p className="text-white/40 text-sm leading-relaxed">
                Este dashboard se conecta via WebSocket ao servidor central. Ele "escuta" as atualizações de todas as páginas que você adicionar à lista. Quando um visitante entra em uma dessas páginas (usando o widget), o contador aqui sobe instantaneamente.
              </p>
            </div>
            <div className="bg-emerald-500/5 rounded-3xl p-8 border border-emerald-500/10">
              <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Script de Integração
              </h4>
              <p className="text-white/40 text-xs mb-4">Copie e cole este script nas páginas que deseja monitorar:</p>
              <code className="block bg-black/40 p-4 rounded-xl text-[10px] font-mono text-emerald-300/80 break-all border border-white/5">
                {`<script src="${window.location.origin}/counter-widget.js"></script>`}
              </code>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
