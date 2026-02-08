
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  CheckSquare, 
  RotateCcw, 
  Target, 
  BarChart3, 
  Trophy,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Zap,
  Star,
  Activity,
  MessageSquare,
  Send,
  Bot,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote
} from 'lucide-react';
import { Card } from './components/ui/Card';
import { AnimatedNumber } from './components/ui/AnimatedNumber';
import { AnimatedChart } from './components/ui/AnimatedChart';
import { RadarScoreChart } from './components/ui/RadarScoreChart';
import { WeeklyTaskChart } from './components/ui/WeeklyTaskChart';
import { 
  Priority, 
  Rank, 
  Transaction, 
  Task, 
  Habit, 
  Achievement, 
  UserStats 
} from './types';
import { 
  INITIAL_ACHIEVEMENTS, 
  CATEGORIES, 
  XP_REQUIREMENTS, 
  RANK_COLORS 
} from './constants';
import { GoogleGenAI } from "@google/genai";
import { getSmartInsights } from './services/geminiService';
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userName] = useState('Kamilla');

  // State
  const [stats, setStats] = useState<UserStats>({
    xp: 850,
    rank: Rank.INICIANTE,
    level: 2,
    totalRevenue: 5200.00,
    totalExpenses: 2150.00,
    balance: 3050.00
  });

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', type: 'REVENUE', amount: 5000, category: 'Salário', date: '2024-03-01', description: 'Pagamento Mensal', emoji: '💵' },
    { id: '2', type: 'EXPENSE', amount: 1500, category: 'Moradia', date: '2024-03-02', description: 'Aluguel', emoji: '🏠' },
    { id: '3', type: 'EXPENSE', amount: 200, category: 'Alimentação', date: '2024-03-03', description: 'Supermercado', emoji: '🛒' },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Revisar portfólio', priority: Priority.HIGH, completed: false, xpValue: 50, emoji: '📂' },
    { id: '2', title: 'Academia', priority: Priority.MEDIUM, completed: true, xpValue: 30, emoji: '💪' },
    { id: '3', title: 'Ler 20 páginas', priority: Priority.LOW, completed: false, xpValue: 20, emoji: '📚' },
    { id: '4', title: 'Ajustar orçamento Nexus', priority: Priority.HIGH, completed: false, xpValue: 40, emoji: '⚙️' },
  ]);

  const [habits, setHabits] = useState<Habit[]>([
    { id: '1', name: 'Beber 2L água', positive: true, streak: 5, lastCompleted: '2024-03-03', xpValue: 15 },
    { id: '2', name: 'Acordar às 06:00', positive: true, streak: 2, lastCompleted: '2024-03-04', xpValue: 25 },
    { id: '3', name: 'Comprar besteiras', positive: false, streak: 0, lastCompleted: null, xpValue: -10 },
  ]);

  const [metas, setMetas] = useState([
    { id: '1', title: 'Reserva de Emergência', emoji: '💰', target: 5000, current: 3050, color: 'emerald' },
    { id: '2', title: 'Hábito Mestre (30 dias)', emoji: '🔥', target: 30, current: 12, color: 'blue' },
    { id: '3', title: 'XP Mensal', emoji: '⭐', target: 2000, current: 850, color: 'purple' },
  ]);

  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [floatingIndicator, setFloatingIndicator] = useState<{ amount: number; type: 'REVENUE' | 'EXPENSE' } | null>(null);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Olá Kamilla! Como posso ajudar na sua performance financeira hoje?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // Simulation data for chart
  const xpHistory = [120, 250, 400, 380, 520, 680, 850];
  const weeklyTaskStats = [3, 5, 2, 4, 6, 8, 4]; // Seg-Dom tasks completed

  // Logic: XP and Rank
  useEffect(() => {
    let newRank = Rank.INICIANTE;
    if (stats.xp >= XP_REQUIREMENTS[Rank.ELITE]) newRank = Rank.ELITE;
    else if (stats.xp >= XP_REQUIREMENTS[Rank.AVANCADO]) newRank = Rank.AVANCADO;
    else if (stats.xp >= XP_REQUIREMENTS[Rank.INTERMEDIARIO]) newRank = Rank.INTERMEDIARIO;

    const newLevel = Math.floor(stats.xp / 500) + 1;
    
    if (newRank !== stats.rank || newLevel !== stats.level) {
      setStats(prev => ({ ...prev, rank: newRank, level: newLevel }));
    }
  }, [stats.xp, stats.rank, stats.level]);

  const fetchInsights = useCallback(async () => {
    setIsLoadingInsights(true);
    const data = {
      balance: stats.balance,
      tasksCompleted: tasks.filter(t => t.completed).length,
      habitStreaks: habits.reduce((acc, h) => acc + h.streak, 0),
      xp: stats.xp,
      leisureSpending: transactions.filter(t => t.category === 'Lazer').reduce((acc, t) => acc + t.amount, 0)
    };
    const newInsights = await getSmartInsights(data);
    setInsights(newInsights);
    setIsLoadingInsights(false);
  }, [stats.balance, stats.xp, tasks, habits, transactions]);

  useEffect(() => {
    fetchInsights();
  }, []);

  const addXP = (amount: number) => {
    setStats(prev => ({ ...prev, xp: prev.xp + amount }));
  };

  const handleAddTransaction = (type: 'REVENUE' | 'EXPENSE', amount: number) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type,
      amount,
      category: 'Outros',
      date: new Date().toISOString().split('T')[0],
      description: type === 'REVENUE' ? 'Nova Receita' : 'Nova Despesa',
      emoji: type === 'REVENUE' ? '📈' : '📉'
    };

    setTransactions([newTransaction, ...transactions]);
    setStats(prev => ({
      ...prev,
      totalRevenue: type === 'REVENUE' ? prev.totalRevenue + amount : prev.totalRevenue,
      totalExpenses: type === 'EXPENSE' ? prev.totalExpenses + amount : prev.totalExpenses,
      balance: type === 'REVENUE' ? prev.balance + amount : prev.balance - amount
    }));

    addXP(10);
    setFloatingIndicator({ amount, type });
    setTimeout(() => setFloatingIndicator(null), 2000);
  };

  const triggerFireworks = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#059669', '#ffffff']
    });
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (!t.completed) {
          addXP(t.xpValue);
          triggerFireworks();
        }
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Você é o Nexus, uma IA assistente de performance financeira e pessoal. 
        O usuário é Kamilla. Ela tem R$ ${stats.balance} de saldo e nível ${stats.level} no app. 
        Responda de forma curta, séria e motivadora. 
        Pergunta do usuário: ${userMsg}`,
      });
      setChatMessages(prev => [...prev, { role: 'bot', text: response.text || 'Entendido. Vamos focar no progresso.' }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Desculpe, tive uma oscilação na rede Nexus. Tente novamente.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Logic for Radar Performance Data
  const radarData = useMemo(() => {
    const finScore = Math.min(100, (stats.balance / 10000) * 100);
    const discScore = Math.min(100, (habits.reduce((acc, h) => acc + h.streak, 0) / 20) * 100);
    const prodScore = Math.min(100, (tasks.filter(t => t.completed).length / (tasks.length || 1)) * 100);
    const intellectualScore = Math.min(100, (stats.level / 10) * 100);
    const physicalScore = habits.some(h => h.name.toLowerCase().includes('academia')) ? 85 : 45;
    const mentalScore = 70 + (habits.filter(h => h.streak > 3).length * 5);

    return [
      { label: 'Finanças', value: finScore, color: '#10b981' },
      { label: 'Disciplina', value: discScore, color: '#a855f7' },
      { label: 'Produtividade', value: prodScore, color: '#3b82f6' },
      { label: 'Mental', value: mentalScore, color: '#ec4899' },
      { label: 'Intelecto', value: intellectualScore, color: '#f59e0b' },
      { label: 'Físico', value: physicalScore, color: '#f43f5e' },
    ];
  }, [stats.balance, stats.level, habits, tasks]);

  // Shared UI Components
  const TaskItem = ({ task }: { task: Task }) => (
    <div 
      onClick={() => toggleTask(task.id)}
      className={`flex items-center gap-3 p-4 rounded-[16px] bg-[#121212] border transition-all duration-300 cursor-pointer group hover:scale-[1.01] active:scale-[0.98] shadow-lg ${task.completed ? 'border-emerald-500/20 bg-[#121212]/80' : 'border-neutral-800/80 hover:border-emerald-500/30'}`}
    >
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${task.completed ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-neutral-700 group-hover:border-emerald-500'}`}>
        {task.completed && <Check size={14} className="text-black" strokeWidth={4} />}
      </div>
      <div className="flex-1 overflow-hidden flex items-center gap-2">
        {task.emoji && <span className="text-lg flex-shrink-0" role="img" aria-label="task-emoji">{task.emoji}</span>}
        <span className={`text-sm font-semibold block truncate transition-all duration-300 ${task.completed ? 'line-through text-neutral-600 italic' : 'text-neutral-200'}`}>
          {task.title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {task.completed && (
          <span className="text-[10px] font-black text-emerald-500 animate-in fade-in slide-in-from-right-2 duration-700">
            +{task.xpValue} XP
          </span>
        )}
      </div>
    </div>
  );

  const DailyProgressIndicator = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return (
      <div className="mt-6 pt-5 border-t border-neutral-800/50">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Activity size={12} className="text-emerald-500" /> Progresso Diário
          </p>
          <span className="text-sm font-black text-emerald-500 italic">{percentage}%</span>
        </div>
        <div className="w-full h-2.5 bg-neutral-900 rounded-full border border-neutral-800 overflow-hidden p-0.5">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(16,185,129,0.5)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const OverviewRow = ({ icon: Icon, label, value, valueColor = 'text-white' }: { icon: any, label: string, value: string | number, valueColor?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-neutral-800/40 last:border-0 group transition-colors duration-300 hover:bg-white/5 px-2 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-neutral-950 flex items-center justify-center text-neutral-400 group-hover:text-emerald-500 transition-colors duration-300">
          <Icon size={16} />
        </div>
        <span className="text-xs font-medium text-neutral-400">{label}</span>
      </div>
      <span className={`text-sm font-bold tracking-tight transition-all duration-300 ${valueColor}`}>
        {typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value}
      </span>
    </div>
  );

  const renderDashboard = () => {
    const todayStr = new Date().toLocaleDateString('pt-BR');

    return (
      <div className="space-y-10 transition-all duration-700">
        {/* Welcome Section */}
        <section className="space-y-8">
          <div className="animate-in fade-in slide-in-from-top-6 duration-1000 ease-out">
            <h2 className="text-3xl lg:text-6xl font-black tracking-tighter mb-2">
              Bem-vinda: <span className="text-emerald-500">{userName}</span>
            </h2>
            <p className="text-neutral-500 font-black uppercase tracking-[0.4em] text-[10px]">{todayStr}</p>
          </div>

          <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-left-4 duration-1000 ease-out delay-200">
            <button 
              onClick={() => setActiveTab('chat')}
              className="group relative flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs rounded-[20px] shadow-[0_15px_40px_-15px_rgba(16,185,129,0.5)] transition-all duration-300 active:scale-95"
            >
              <Bot size={20} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
              Falar com Nexus
            </button>
          </div>

          {/* Atividades de Hoje */}
          <div className="pt-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out delay-400">
            <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" /> Atividades de Hoje
            </h3>
            <div className="grid lg:grid-cols-2 gap-3">
              {tasks.map((task, idx) => (
                <div key={task.id} className={`animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out`} style={{ transitionDelay: `${idx * 100}ms` }}>
                  <TaskItem task={task} />
                </div>
              ))}
            </div>
            <DailyProgressIndicator />
          </div>

          {/* Radar Performance Central Element */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-12 px-5 lg:px-12 bg-gradient-to-b from-neutral-900/40 to-transparent rounded-[32px] border border-neutral-800/30 animate-in fade-in duration-1000 ease-out delay-600">
            <div className="flex flex-col items-center justify-center text-center">
              <h3 className="text-2xl lg:text-4xl font-black uppercase italic tracking-tighter mb-4">Visão <span className="text-emerald-500">Geral</span></h3>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-[0.1em] leading-relaxed max-w-sm">Análise em tempo real da consistência operacional de sua vida.</p>
              
              {/* Weekly Task Progress Below Title */}
              <div className="w-full mt-10">
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.3em] mb-4">Produtividade Semanal</p>
                <WeeklyTaskChart data={weeklyTaskStats} />
              </div>
            </div>
            <div className="flex justify-center transition-transform duration-700 hover:scale-105">
              <RadarScoreChart data={radarData} size={window.innerWidth < 640 ? 280 : 380} />
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out delay-800">
          {/* Gráfico / Principal */}
          <div className="lg:col-span-8">
            <Card className="relative overflow-hidden h-full border-neutral-800/40 transition-all duration-500 hover:border-emerald-500/20 shadow-2xl p-6">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <p className="text-neutral-500 text-[9px] mb-2 uppercase tracking-[0.2em] font-black">Patrimônio Nexus</p>
                  <h2 className="text-5xl lg:text-8xl font-black tracking-tighter">
                    <AnimatedNumber value={stats.balance} prefix="R$ " />
                  </h2>
                  <div className="flex gap-3 mt-6">
                    <span className="flex items-center gap-1.5 text-emerald-500 text-[9px] font-black bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                      <TrendingUp size={12} /> +12.4%
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-500 text-[9px] font-black bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20">
                      <Zap size={12} fill="currentColor" /> ALTA
                    </span>
                  </div>
                </div>
                <button onClick={() => handleAddTransaction('EXPENSE', 200)} className="p-4 bg-rose-500 rounded-2xl text-white hover:bg-rose-400 transition-all duration-300 active:scale-90 shadow-2xl">
                   <Minus size={24} strokeWidth={4} />
                </button>
              </div>
              <div className="mt-10">
                <div className="flex justify-between items-end mb-6">
                  <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.3em]">Métrica de Disciplina (7D)</p>
                  <span className="text-emerald-500 text-xs font-black italic">{stats.xp} XP</span>
                </div>
                <AnimatedChart data={xpHistory} height={120} />
              </div>
            </Card>
          </div>

          {/* Sumário lateral */}
          <div className="lg:col-span-4">
            <Card title="Sumário Nexus" className="h-full border-neutral-800/40 transition-all duration-500 p-6">
              <div className="flex flex-col mt-2 space-y-1">
                <OverviewRow icon={Wallet} label="Saldo total" value={stats.balance} />
                <OverviewRow icon={ArrowDownLeft} label="A pagar" value={stats.totalExpenses} valueColor="text-rose-500" />
                <OverviewRow icon={ArrowUpRight} label="A receber" value={stats.totalRevenue * 0.25} />
                <OverviewRow icon={Banknote} label="Faturamento" value={stats.totalRevenue} valueColor="text-emerald-500" />
                
                <div className="mt-8 pt-6 border-t border-neutral-800/50">
                  <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-6">Metas</h4>
                  <div className="space-y-6">
                    {metas.slice(0, 2).map((meta, idx) => (
                      <div key={meta.id} className="animate-in fade-in slide-in-from-right-4 duration-1000 ease-out" style={{ transitionDelay: `${idx * 200}ms` }}>
                        <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-widest items-center">
                          <span className="text-neutral-400 flex items-center gap-2">
                            <span className="text-base">{meta.emoji}</span> {meta.title}
                          </span>
                          <span className={`text-${meta.color === 'emerald' ? 'emerald' : meta.color === 'blue' ? 'blue' : 'purple'}-500`}>
                            {Math.round((meta.current / meta.target) * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/50 shadow-inner">
                          <div 
                            className={`h-full transition-all duration-1000 ease-in-out bg-${meta.color === 'emerald' ? 'emerald-500' : meta.color === 'blue' ? 'blue-500' : 'purple-500'}`}
                            style={{ width: `${(meta.current / meta.target) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'finance': return (
        <div className="space-y-6 animate-in fade-in duration-700">
           <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Finanças</h2>
            <button onClick={() => handleAddTransaction('REVENUE', 1000)} className="p-3 bg-emerald-500 text-black rounded-xl active:scale-95"><Plus size={20} strokeWidth={4} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {CATEGORIES.slice(0, 4).map((cat, i) => (
              <Card key={cat} className="p-4 bg-[#0e0e0e] flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-[9px] text-neutral-500 font-black uppercase mb-1">{cat}</p>
                  <span className="text-lg">
                    {['🏠', '🍕', '🚌', '🍿'][i] || '💰'}
                  </span>
                </div>
                <span className="text-xl font-black tracking-tighter text-white">R$ {(Math.random() * 2000).toFixed(2)}</span>
              </Card>
            ))}
          </div>
          <Card title="Operações">
            <div className="space-y-3">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-[#121212] rounded-2xl border border-neutral-800/50 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${t.type === 'REVENUE' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                      {t.emoji || (t.type === 'REVENUE' ? '📈' : '📉')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-200">{t.description}</p>
                      <p className="text-[9px] text-neutral-500 uppercase font-black">{t.category}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-black italic ${t.type === 'REVENUE' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.type === 'REVENUE' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      );
      case 'tasks': return (
        <div className="space-y-6 animate-in fade-in duration-700">
          <h2 className="text-3xl font-black tracking-tighter uppercase italic mb-6">Tarefas</h2>
          <div className="grid gap-3">
            {tasks.map(t => <TaskItem key={t.id} task={t} />)}
          </div>
          <DailyProgressIndicator />
        </div>
      );
      case 'profile': return (
        <div className="space-y-12 animate-in fade-in duration-1000">
          <div className="flex flex-col items-center text-center pt-8">
            <div className="relative mb-6">
                <div className={`w-32 h-32 rounded-[2.5rem] border-4 ${RANK_COLORS[stats.rank].replace('text-', 'border-')} p-4 bg-neutral-900`}>
                    <div className="w-full h-full bg-neutral-950 rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl">👑</div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black text-[10px] font-black px-4 py-1.5 rounded-full border-2 border-neutral-950">LVL {stats.level}</div>
            </div>
            <h2 className={`text-4xl font-black tracking-tighter uppercase italic ${RANK_COLORS[stats.rank]}`}>{stats.rank}</h2>
          </div>
          <Card title="Conquistas">
            <div className="grid grid-cols-2 gap-4">
              {achievements.map(a => (
                <div key={a.id} className={`p-4 rounded-3xl border ${a.unlocked ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-neutral-900 border-neutral-800 opacity-40 grayscale'} flex flex-col items-center text-center`}>
                  <span className="text-3xl mb-2">{a.icon}</span>
                  <p className="text-[9px] font-black uppercase mb-1">{a.title}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      );
      case 'chat': return renderChat();
      default: return <div className="text-center p-32 text-neutral-600 font-black uppercase tracking-[0.5em] animate-pulse">Sistema...</div>;
    }
  };

  const renderChat = () => (
    <div className="flex flex-col h-[75vh] animate-in fade-in duration-700">
      <div className="flex items-center gap-4 mb-6 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[24px]">
        <Bot size={28} className="text-emerald-500" />
        <h2 className="text-lg font-black uppercase tracking-widest">Nexus IA</h2>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-emerald-500 text-black font-bold' : 'bg-neutral-900 border border-neutral-800 text-neutral-200'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && <div className="text-[10px] font-black uppercase text-emerald-500 animate-pulse">Nexus Processando...</div>}
      </div>
      <div className="relative">
        <input 
          type="text" 
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Comando Nexus..."
          className="w-full bg-neutral-900 border border-neutral-800 focus:border-emerald-500 outline-none rounded-2xl px-6 py-4 pr-16 text-sm font-semibold"
        />
        <button onClick={handleSendMessage} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-black rounded-lg active:scale-90"><Send size={18} /></button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-24 bg-black selection:bg-emerald-500 selection:text-black">
      <nav className="fixed bottom-0 left-0 right-0 lg:left-0 lg:top-0 lg:h-full lg:w-24 bg-neutral-950/90 backdrop-blur-2xl border-t lg:border-t-0 lg:border-r border-neutral-800/50 flex lg:flex-col justify-around lg:justify-center items-center py-4 z-50">
        <div className="hidden lg:flex mb-12"><div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-2xl text-black">N</div></div>
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'finance', icon: Wallet },
          { id: 'tasks', icon: CheckSquare },
          { id: 'profile', icon: Trophy },
          { id: 'chat', icon: MessageSquare },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`p-3 rounded-xl transition-all duration-300 ${activeTab === tab.id ? 'text-emerald-500 bg-emerald-500/10' : 'text-neutral-500 hover:text-neutral-200'}`}
          >
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          </button>
        ))}
      </nav>
      <main className="max-w-[1400px] mx-auto p-5 lg:p-12">
        <header className="flex justify-between items-center mb-10 animate-in fade-in slide-in-from-top-4 duration-1000 ease-out">
            <div>
                <h1 className="text-2xl lg:text-4xl font-black tracking-tighter uppercase">Nexus</h1>
                <p className="text-[9px] text-neutral-700 font-black uppercase tracking-[0.4em] mt-1">CORE_STABLE</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-white italic">LVL_{stats.level}</p>
                    <p className="text-[9px] text-emerald-500 font-black uppercase mt-0.5">{stats.rank}</p>
                </div>
                <div className="w-12 h-12 rounded-[16px] bg-neutral-900 border border-emerald-500/30 flex items-center justify-center text-xl font-black text-emerald-500 shadow-xl">{stats.level}</div>
            </div>
        </header>
        <div className="transition-all duration-700 ease-in-out">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
