import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Sparkles, 
  Send,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  LayoutDashboard,
  Wallet,
  CheckSquare,
  Trophy,
  Target,
  Bot
} from 'lucide-react';
import { Card } from './components/ui/Card';
import { AnimatedNumber } from './components/ui/AnimatedNumber';
import { 
  Priority, 
  Rank, 
  Transaction, 
  Task, 
  UserStats 
} from './types';
import { 
  XP_REQUIREMENTS 
} from './constants';
import confetti from 'canvas-confetti';

interface FloatingChange {
  id: number;
  value: number;
}

const App: React.FC = () => {
  // --- Persistência e Onboarding ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [userName, setUserName] = useState('');
  const [tempName, setTempName] = useState('');

  // --- State do App ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<UserStats>({
    xp: 0,
    rank: Rank.INICIANTE,
    level: 1,
    totalRevenue: 0,
    totalExpenses: 0,
    balance: 0
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metas, setMetas] = useState([
    { id: '1', title: 'Reserva de Emergência', emoji: '💰', target: 1000, current: 0, color: 'emerald' },
  ]);
  const [floatingChanges, setFloatingChanges] = useState<FloatingChange[]>([]);

  // Efeito de Carregamento Inicial
  useEffect(() => {
    const savedName = localStorage.getItem('nexus_user_name');
    const savedStats = localStorage.getItem('nexus_user_stats');
    const savedTasks = localStorage.getItem('nexus_user_tasks');
    const savedTransactions = localStorage.getItem('nexus_user_transactions');

    if (savedName) {
      setUserName(savedName);
      setIsOnboarding(false);
      if (savedStats) setStats(JSON.parse(savedStats));
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    }
    setIsLoaded(true);
  }, []);

  // Persistência Automática
  useEffect(() => {
    if (!isOnboarding && isLoaded) {
      localStorage.setItem('nexus_user_name', userName);
      localStorage.setItem('nexus_user_stats', JSON.stringify(stats));
      localStorage.setItem('nexus_user_tasks', JSON.stringify(tasks));
      localStorage.setItem('nexus_user_transactions', JSON.stringify(transactions));
    }
  }, [userName, stats, tasks, transactions, isOnboarding, isLoaded]);

  // --- Lógica de Nível ---
  useEffect(() => {
    let newRank = Rank.INICIANTE;
    if (stats.xp >= XP_REQUIREMENTS[Rank.ELITE]) newRank = Rank.ELITE;
    else if (stats.xp >= XP_REQUIREMENTS[Rank.AVANCADO]) newRank = Rank.AVANCADO;
    else if (stats.xp >= XP_REQUIREMENTS[Rank.INTERMEDIARIO]) newRank = Rank.INTERMEDIARIO;

    const newLevel = Math.floor(Math.sqrt(stats.xp / 200)) + 1;
    
    if (newRank !== stats.rank || newLevel !== stats.level) {
      if (newLevel > stats.level && stats.level > 0) triggerFireworks('#10b981');
      setStats(prev => ({ ...prev, rank: newRank, level: newLevel }));
    }
  }, [stats.xp]);

  const triggerFireworks = (color: string = '#10b981') => {
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { y: 0.6 },
      colors: [color],
      disableForReducedMotion: true
    });
  };

  const handleStartJourney = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setIsOnboarding(false);
      triggerFireworks();
      
      // Adiciona uma tarefa de boas-vindas
      setTasks([
        { id: 'welcome', title: 'Explorar o Nexus Performance', priority: Priority.HIGH, completed: false, xpValue: 50, emoji: '🚀' }
      ]);
    }
  };

  const handleAdjustBalance = (amount: number, description: string = "Ajuste manual", category: string = "Geral") => {
    const isPositive = amount > 0;
    if (isPositive) triggerFireworks('#10b981');
    
    const changeId = Date.now();
    setFloatingChanges(prev => [...prev, { id: changeId, value: amount }]);
    
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: isPositive ? 'REVENUE' : 'EXPENSE',
      amount: Math.abs(amount),
      category: category,
      date: new Date().toISOString().split('T')[0],
      description: description,
      emoji: isPositive ? '📈' : '📉'
    };

    setTransactions(prev => [newTransaction, ...prev]);
    setStats(prev => ({
      ...prev,
      balance: prev.balance + amount,
      totalRevenue: isPositive ? prev.totalRevenue + amount : prev.totalRevenue,
      totalExpenses: !isPositive ? prev.totalExpenses + Math.abs(amount) : prev.totalExpenses,
      xp: prev.xp + (isPositive ? 10 : 5)
    }));

    setTimeout(() => {
      setFloatingChanges(prev => prev.filter(c => c.id !== changeId));
    }, 1000);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (!t.completed) {
          triggerFireworks('#10b981');
          setStats(s => ({ ...s, xp: s.xp + t.xpValue }));
        }
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
  };

  if (!isLoaded) return null;

  // --- Render Onboarding ---
  if (isOnboarding) {
    return (
      <div className="min-height-screen flex items-center justify-center p-6 bg-black">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-emerald-900/10 rounded-full blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-emerald-900/10 rounded-full blur-[120px]" />
        </div>

        <Card className="w-full max-w-md bg-neutral-900/50 backdrop-blur-xl border-neutral-800 p-8 space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-4">
              <Sparkles className="text-emerald-500" size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white">BEM-VINDO AO NEXUS</h1>
            <p className="text-neutral-400 text-sm">Inicie sua jornada de alta performance. Como devemos chamar você?</p>
          </div>

          <form onSubmit={handleStartJourney} className="space-y-4">
            <div className="relative group">
              <input 
                type="text" 
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Seu nome ou apelido"
                className="w-full bg-black border-2 border-neutral-800 focus:border-emerald-500 text-white px-4 py-4 rounded-xl outline-none transition-all font-bold placeholder:text-neutral-700"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                <Send size={18} className="text-emerald-500" />
              </div>
            </div>

            <button 
              type="submit"
              disabled={!tempName.trim()}
              className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              Iniciar Sistema
            </button>
          </form>

          <p className="text-[10px] text-neutral-600 text-center uppercase tracking-widest font-black">
            Seus dados serão salvos localmente neste dispositivo.
          </p>
        </Card>
      </div>
    );
  }

  // --- Render Dashboard Principal ---
  return (
    <div className="min-h-screen bg-black text-white pb-24 lg:pb-8 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-neutral-900 p-6 fixed h-full bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Sparkles size={18} className="text-black" />
          </div>
          <span className="font-black tracking-tighter text-xl">NEXUS</span>
        </div>
        
        <nav className="space-y-2 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'finances', icon: Wallet, label: 'Finanças' },
            { id: 'tasks', icon: CheckSquare, label: 'Tarefas' },
            { id: 'metas', icon: Target, label: 'Metas' },
            { id: 'rank', icon: Trophy, label: 'Ranking' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold uppercase tracking-widest text-[11px] ${
                activeTab === item.id ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-neutral-500 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 bg-neutral-900/50 rounded-2xl border border-neutral-800/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center font-black text-black">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-black truncate">{userName}</p>
              <p className="text-[10px] text-emerald-500 font-bold">Lvl {stats.level}</p>
            </div>
          </div>
          <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${(stats.xp % 200) / 2}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <header className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl lg:text-5xl font-black tracking-tighter mb-1">
                    Olá <span className="animate-wave">👋</span>, <span className="text-emerald-500">{userName}</span>
                  </h2>
                  <p className="text-neutral-200 font-black uppercase tracking-[0.35em] text-[11px] drop-shadow-sm">
                    {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join(' / ')}
                  </p>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wallet size={80} />
                </div>
                <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Saldo Nexus</h4>
                <div className="text-3xl font-black tracking-tighter flex items-center gap-1">
                  R$ <AnimatedNumber value={stats.balance} />
                </div>
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => handleAdjustBalance(100, "Depósito rápido")}
                    className="flex-1 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
                  >
                    <Plus size={14} className="inline mr-1" /> Receita
                  </button>
                  <button 
                    onClick={() => handleAdjustBalance(-50, "Saída rápida")}
                    className="flex-1 py-2 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all"
                  >
                    <Plus size={14} className="inline mr-1 rotate-45" /> Gasto
                  </button>
                </div>
              </Card>

              <Card className="relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity size={80} />
                </div>
                <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">XP Progress</h4>
                <div className="text-3xl font-black tracking-tighter">
                  {stats.xp} <span className="text-sm text-neutral-500">XP</span>
                </div>
                <p className={`text-[11px] font-bold mt-2 uppercase tracking-widest ${stats.rank === Rank.INICIANTE ? 'text-gray-400' : 'text-emerald-400'}`}>
                  Rank: {stats.rank}
                </p>
                <div className="mt-4 w-full bg-black h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (stats.xp % 200) / 2)}%` }} />
                </div>
              </Card>

              <Card className="md:col-span-2 lg:col-span-1">
                <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-4">Tarefas do Dia</h4>
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <p className="text-[11px] text-neutral-600 font-bold uppercase italic">Nenhuma tarefa para hoje.</p>
                  ) : (
                    tasks.map(task => (
                      <div 
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          task.completed 
                            ? 'bg-emerald-500/5 border-emerald-500/20 opacity-50' 
                            : 'bg-black border-neutral-800 hover:border-emerald-500/50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${
                          task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-800'
                        }`}>
                          {task.completed && <Sparkles size={12} className="text-black" />}
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-tight flex-1 ${task.completed ? 'line-through text-neutral-600' : 'text-neutral-200'}`}>
                          {task.emoji} {task.title}
                        </span>
                        <span className="text-[10px] font-black text-emerald-500">+{task.xpValue} XP</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Metas / Objectives */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <Target size={14} className="text-emerald-500" /> Objetivos Estratégicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {metas.map(meta => (
                  <Card key={meta.id} className="group hover:border-emerald-500/30 transition-all">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <h5 className="text-[11px] font-black text-white uppercase tracking-wider">{meta.emoji} {meta.title}</h5>
                        <p className="text-2xl font-black tracking-tighter mt-1">
                          R$ <AnimatedNumber value={meta.current} /> <span className="text-xs text-neutral-500 font-bold">/ R$ {meta.target}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-500">{Math.round((meta.current / meta.target) * 100)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-black h-3 rounded-full overflow-hidden border border-neutral-800/50">
                      <div 
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (meta.current / meta.target) * 100)}%` }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'dashboard' && (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <Bot size={48} className="text-neutral-800 animate-pulse" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Módulo em Desenvolvimento</h2>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Sincronizando dados neurais...</p>
            </div>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="px-6 py-2 bg-emerald-500 text-black font-black text-[10px] uppercase tracking-widest rounded-full"
            >
              Voltar ao Nexus
            </button>
          </div>
        )}
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 p-2 rounded-2xl shadow-2xl z-50">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'finances', icon: Wallet },
          { id: 'tasks', icon: CheckSquare },
          { id: 'metas', icon: Target },
          { id: 'rank', icon: Trophy }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`p-4 rounded-xl transition-all ${
              activeTab === item.id ? 'bg-emerald-500 text-black scale-110' : 'text-neutral-500'
            }`}
          >
            <item.icon size={20} />
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;