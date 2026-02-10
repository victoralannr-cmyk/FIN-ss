
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
  Banknote,
  Clock,
  Calendar,
  PiggyBank,
  ShieldCheck,
  ChevronLeft
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
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { getSmartInsights } from './services/geminiService';
import confetti from 'canvas-confetti';

interface FloatingChange {
  id: number;
  value: number;
}

const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState<'day' | 'month'>('month');
  const [userName] = useState('Kamilla');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // State
  const [stats, setStats] = useState<UserStats>({
    xp: 850,
    rank: Rank.INICIANTE,
    level: 1,
    totalRevenue: 5200,
    totalExpenses: 2150,
    balance: 3050
  });

  const [balanceHistory, setBalanceHistory] = useState<number[]>([2500, 2800, 2700, 3100, 2900, 3050]);
  const [floatingChanges, setFloatingChanges] = useState<FloatingChange[]>([]);
  const [chartColor, setChartColor] = useState('#10b981');

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', type: 'REVENUE', amount: 5000, category: 'Salário', date: new Date().toISOString().split('T')[0], description: 'Pagamento Mensal', emoji: '💵' },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Revisar portfólio', priority: Priority.HIGH, completed: false, xpValue: 50, emoji: '📂' },
    { id: '2', title: 'Academia', priority: Priority.MEDIUM, completed: true, xpValue: 30, emoji: '💪' },
    { id: '3', title: 'Ler 20 páginas', priority: Priority.LOW, completed: false, xpValue: 20, emoji: '📚' },
  ]);

  const [newTaskInput, setNewTaskInput] = useState('');

  const [metas, setMetas] = useState([
    { id: '1', title: 'Reserva de Emergência', emoji: '💰', target: 5000, current: 3050, color: 'emerald' },
    { id: '2', title: 'Viagem', emoji: '✈️', target: 10000, current: 1500, color: 'blue' },
  ]);

  // Intelligence: Leveling Logic
  useEffect(() => {
    let newRank = Rank.INICIANTE;
    if (stats.xp >= XP_REQUIREMENTS[Rank.ELITE]) newRank = Rank.ELITE;
    else if (stats.xp >= XP_REQUIREMENTS[Rank.AVANCADO]) newRank = Rank.AVANCADO;
    else if (stats.xp >= XP_REQUIREMENTS[Rank.INTERMEDIARIO]) newRank = Rank.INTERMEDIARIO;

    const newLevel = Math.floor(Math.sqrt(stats.xp / 200)) + 1;
    
    if (newRank !== stats.rank || newLevel !== stats.level) {
      if (newLevel > stats.level) triggerFireworks('#10b981');
      setStats(prev => ({ ...prev, rank: newRank, level: newLevel }));
    }
  }, [stats.xp]);

  // Minimalist Celebration Burst
  const triggerFireworks = (color: string = '#10b981') => {
    confetti({
      particleCount: 28,
      spread: 45,
      origin: { y: 0.7 },
      colors: [color],
      shapes: ['circle'],
      gravity: 1.4,
      scalar: 0.6,
      ticks: 120,
      startVelocity: 25,
      disableForReducedMotion: true
    });
  };

  const addXP = (amount: number) => {
    setStats(prev => ({ ...prev, xp: Math.max(0, prev.xp + amount) }));
  };

  // Specific adjustments for Finance tab
  const handleAdjustRevenueOnly = (amount: number) => {
    if (amount > 0) triggerFireworks('#10b981');
    setStats(prev => ({
      ...prev,
      totalRevenue: Math.max(0, prev.totalRevenue + amount),
      balance: prev.balance + amount
    }));
    addXP(amount > 0 ? 5 : 0);
  };

  const handleAdjustExpenseOnly = (amount: number) => {
    setStats(prev => ({
      ...prev,
      totalExpenses: Math.max(0, prev.totalExpenses + amount),
      balance: prev.balance - amount
    }));
    addXP(amount < 0 ? 2 : 0);
  };

  const handleAdjustBalanceDirect = (amount: number) => {
    if (amount > 0) triggerFireworks('#ffffff');
    setStats(prev => ({
      ...prev,
      balance: Math.max(0, prev.balance + amount)
    }));
    addXP(amount > 0 ? 1 : 0);
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

    setStats(prev => {
      const newBalance = prev.balance + amount;
      setBalanceHistory(history => [...history.slice(-14), newBalance]);
      return {
        ...prev,
        balance: newBalance,
        totalRevenue: isPositive ? prev.totalRevenue + amount : prev.totalRevenue,
        totalExpenses: !isPositive ? prev.totalExpenses + Math.abs(amount) : prev.totalExpenses
      };
    });

    setTimeout(() => {
      setFloatingChanges(prev => prev.filter(c => c.id !== changeId));
    }, 1000);

    addXP(isPositive ? 5 : 2); 
  };

  const handleAdjustReserva = (name: string, amount: number) => {
    const nameLower = name.toLowerCase();
    setMetas(prev => prev.map(m => {
      if (m.title.toLowerCase().includes(nameLower)) {
        if (amount > 0) triggerFireworks('#3b82f6');
        return { ...m, current: Math.max(0, m.current + amount) };
      }
      return m;
    }));
    addXP(amount > 0 ? 10 : 0);
  };

  const handleManageTask = (title: string, action: 'CREATE' | 'COMPLETE') => {
    if (action === 'CREATE') {
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        priority: Priority.MEDIUM,
        completed: false,
        xpValue: 30,
        emoji: '📝'
      };
      setTasks(prev => [newTask, ...prev]);
      addXP(5);
    } else {
      setTasks(prev => prev.map(t => {
        if (t.title.toLowerCase().includes(title.toLowerCase())) {
          if (!t.completed) {
            triggerFireworks('#10b981');
            addXP(t.xpValue);
          }
          return { ...t, completed: true };
        }
        return t;
      }));
    }
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (!t.completed) {
          addXP(t.xpValue);
          triggerFireworks('#10b981');
        }
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
  };

  const radarData = useMemo(() => [
    { label: 'Finanças', value: Math.min(100, (stats.balance / 10000) * 100), color: '#10b981' },
    { label: 'Disciplina', value: Math.min(100, (tasks.filter(t => t.completed).length / (tasks.length || 1)) * 100), color: '#a855f7' },
    { label: 'Físico', value: 50, color: '#f43f5e' },
    { label: 'Mental', value: 70, color: '#ec4899' },
    { label: 'Intelecto', value: Math.min(100, (stats.level / 10) * 100), color: '#f59e0b' },
    { label: 'Produtividade', value: 65, color: '#3b82f6' },
  ], [stats.balance, stats.level, tasks]);

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const currentMonthIdx = new Date().getMonth();
  const availableMonths = months.slice(0, currentMonthIdx + 1);

  const TaskItem: React.FC<{ task: Task }> = ({ task }) => (
    <div 
      onClick={() => toggleTask(task.id)}
      className={`flex items-center gap-3 p-3.5 rounded-[14px] bg-[#121212] border transition-all duration-300 cursor-pointer group hover:scale-[1.01] active:scale-[0.98] shadow-lg ${task.completed ? 'border-emerald-500/20 bg-[#121212]/80' : 'border-neutral-800/80 hover:border-emerald-500/30'}`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${task.completed ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-neutral-700 group-hover:border-emerald-500'}`}>
        {task.completed && <Check size={12} className="text-black" strokeWidth={4} />}
      </div>
      <div className="flex-1 overflow-hidden flex items-center gap-2">
        {task.emoji && <span className="text-base flex-shrink-0">{task.emoji}</span>}
        <span className={`text-sm font-black block truncate transition-all duration-300 ${task.completed ? 'line-through text-neutral-600 italic' : 'text-neutral-200'}`}>
          {task.title}
        </span>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl lg:text-5xl font-black tracking-tighter mb-1">
              Olá, <span className="text-emerald-500">{userName}</span>
            </h2>
            <p className="text-neutral-200 font-black uppercase tracking-[0.35em] text-[11px] drop-shadow-sm">
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join(' / ')}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-4 pt-2">
        <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <Activity size={14} className="text-emerald-500" /> RESUMO DO DIA
        </h3>
        <div className="space-y-3">
          <h4 className="text-[11px] font-black text-neutral-200 uppercase tracking-tight">Tarefas</h4>
          <Card className="p-4 border-neutral-800/40 bg-[#0a0a0a] shadow-inner">
            <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card className="relative overflow-hidden h-full p-5 border-neutral-800/60 shadow-2xl">
            <div className="flex justify-between items-start mb-8">
              <div className="relative">
                <p className="text-neutral-500 text-[9px] mb-1 uppercase tracking-widest font-black">Meu Saldo Atual</p>
                <h2 className="text-4xl lg:text-7xl font-black tracking-tighter flex items-center gap-4">
                  <AnimatedNumber value={stats.balance} prefix="R$ " />
                  {floatingChanges.map(c => (
                    <span key={c.id} className={`absolute left-full ml-4 top-1/2 -translate-y-1/2 text-xl font-black ${c.value > 0 ? 'text-emerald-500' : 'text-rose-500'} animate-bounce`}>
                      {c.value > 0 ? '+' : ''}{c.value}
                    </span>
                  ))}
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleAdjustBalance(100)} className="p-3 bg-emerald-500 rounded-xl text-black shadow-lg active:scale-90 hover:bg-emerald-400 transition-all"><Plus size={20} strokeWidth={4} /></button>
                <button onClick={() => handleAdjustBalance(-100)} className="p-3 bg-rose-500 rounded-xl text-white shadow-lg active:scale-90 hover:bg-rose-400 transition-all"><Minus size={20} strokeWidth={4} /></button>
              </div>
            </div>
            <AnimatedChart data={balanceHistory} height={120} color={chartColor} />
          </Card>
        </div>
        <div className="lg:col-span-4">
          <RadarScoreChart data={radarData} size={280} />
        </div>
      </div>
    </div>
  );

  const renderFinance = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Fluxo Financeiro</h2>
          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mt-1">Histórico de Performance de Ativos</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {availableMonths.map((month, idx) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(idx)}
              className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedMonth === idx ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-200'}`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Entradas', value: stats.totalRevenue, icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/5', onAdd: () => handleAdjustRevenueOnly(100), onSub: () => handleAdjustRevenueOnly(-100) },
          { label: 'Saídas', value: stats.totalExpenses, icon: ArrowDownLeft, color: 'text-rose-500', bg: 'bg-rose-500/5', onAdd: () => handleAdjustExpenseOnly(100), onSub: () => handleAdjustExpenseOnly(-100) },
          { label: 'Meu Saldo', value: stats.balance, icon: Wallet, color: 'text-white', bg: 'bg-neutral-900', onAdd: () => handleAdjustBalanceDirect(100), onSub: () => handleAdjustBalanceDirect(-100) },
          { label: 'Reserva Emergência', value: metas[0].current, icon: PiggyBank, color: 'text-blue-400', bg: 'bg-blue-500/5', onAdd: () => handleAdjustReserva('Emergência', 100), onSub: () => handleAdjustReserva('Emergência', -100) },
          { label: 'Reserva Viagem', value: metas[1].current, icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/5', onAdd: () => handleAdjustReserva('Viagem', 100), onSub: () => handleAdjustReserva('Viagem', -100) },
        ].map((item) => (
          <Card key={item.label} className={`p-5 border-neutral-800/40 ${item.bg} relative group transition-all duration-300`}>
            <div className="flex justify-between items-center mb-6">
              <div className={`p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/50 ${item.color} shadow-lg`}>
                <item.icon size={20} strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-1.5 z-10">
                <button 
                  onClick={item.onSub}
                  className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg border border-neutral-800 transition-all active:scale-90"
                  title="Diminuir"
                >
                  <Minus size={14} strokeWidth={3} />
                </button>
                <button 
                  onClick={item.onAdd}
                  className={`p-1.5 ${item.color.replace('text-', 'bg-')} text-black font-bold rounded-lg transition-all active:scale-90 shadow-lg`}
                  title="Aumentar"
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">{item.label}</p>
              <h3 className={`text-2xl font-black tracking-tighter ${item.color}`}>
                R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pl-20 bg-black selection:bg-emerald-500 selection:text-black">
      <nav className="fixed bottom-0 left-0 right-0 lg:left-0 lg:top-0 lg:h-full lg:w-20 bg-neutral-950/90 backdrop-blur-xl border-t lg:border-t-0 lg:border-r border-neutral-800/40 flex lg:flex-col justify-around lg:justify-center items-center py-3 z-50">
        <div className="hidden lg:flex mb-10"><div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-xl text-black">N</div></div>
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
            className={`p-2.5 rounded-lg transition-all ${activeTab === tab.id ? 'text-emerald-500 bg-emerald-500/5 scale-110 shadow-lg' : 'text-neutral-500 hover:text-neutral-200'}`}
          >
            <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          </button>
        ))}
      </nav>
      <main className="max-w-[1200px] mx-auto p-4 lg:p-10">
        <header className="flex justify-between items-center mb-8 animate-in fade-in duration-1000">
            <div>
                <h1 className="text-xl lg:text-3xl font-black tracking-tighter uppercase leading-none">Nexus</h1>
                <p className="text-[8px] text-neutral-700 font-black uppercase tracking-[0.3em] mt-1">CORE_PERF_OS</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-emerald-500/20 flex items-center justify-center text-lg font-black text-emerald-500 shadow-lg">{stats.level}</div>
            </div>
        </header>
        <div className="transition-all duration-500">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'finance' && renderFinance()}
          {activeTab === 'tasks' && (
             <div className="space-y-6 animate-in fade-in duration-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic">TAREFAS DE ROTINA</h2>
                  
                  <div className="flex items-center gap-2 max-w-sm w-full">
                    <input 
                      type="text"
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTaskInput.trim()) {
                          handleManageTask(newTaskInput, 'CREATE');
                          setNewTaskInput('');
                        }
                      }}
                      placeholder="Nova tarefa operacional..."
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-200 focus:border-emerald-500 outline-none transition-all"
                    />
                    <button 
                      onClick={() => {
                        if (newTaskInput.trim()) {
                          handleManageTask(newTaskInput, 'CREATE');
                          setNewTaskInput('');
                        }
                      }}
                      className="p-2.5 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>
                
                <div className="grid gap-2.5">
                  {tasks.length > 0 ? (
                    tasks.map(t => <TaskItem key={t.id} task={t} />)
                  ) : (
                    <div className="p-10 text-center border border-dashed border-neutral-800 rounded-2xl">
                       <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest">Nenhuma tarefa pendente no buffer.</p>
                    </div>
                  )}
                </div>
              </div>
          )}
          {activeTab === 'profile' && (
            <div className="space-y-10 animate-in fade-in duration-1000">
               <div className="flex flex-col items-center text-center pt-6">
                  <div className="relative mb-4 group">
                      <div className={`w-28 h-28 rounded-[2rem] border-2 ${RANK_COLORS[stats.rank].replace('text-', 'border-')} p-3 bg-neutral-900 shadow-2xl transition-all duration-500`}>
                          <div className="w-full h-full bg-neutral-950 rounded-[1.5rem] flex items-center justify-center text-3xl">👑</div>
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black text-[9px] font-black px-3 py-1 rounded-full border-2 border-neutral-950">LVL {stats.level}</div>
                  </div>
                  <h2 className={`text-3xl font-black tracking-tighter uppercase italic ${RANK_COLORS[stats.rank]}`}>{stats.rank}</h2>
                  <p className="text-[10px] text-neutral-700 font-bold mt-2 uppercase">Total: {stats.xp} XP</p>
               </div>
            </div>
          )}
          {activeTab === 'chat' && (
            <ChatInterface 
              stats={stats} 
              onAdjustBalance={handleAdjustBalance}
              onAdjustReserva={handleAdjustReserva}
              onManageTask={handleManageTask}
            />
          )}
        </div>
      </main>
    </div>
  );
};

interface ChatProps {
  stats: UserStats;
  onAdjustBalance: (amount: number, description?: string, category?: string) => void;
  onAdjustReserva: (name: string, amount: number) => void;
  onManageTask: (title: string, action: 'CREATE' | 'COMPLETE') => void;
}

const ChatInterface: React.FC<ChatProps> = ({ stats, onAdjustBalance, onAdjustReserva, onManageTask }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Nexus ativo. Posso registrar seus gastos, receitas, gerenciar reservas e tarefas. O que faremos hoje?' }
  ]);
  const [typing, setTyping] = useState(false);

  // Gemini Function Declarations
  const transactionTool: FunctionDeclaration = {
    name: 'register_transaction',
    parameters: {
      type: Type.OBJECT,
      description: 'Registra uma nova receita ou despesa no sistema financeiro.',
      properties: {
        amount: { type: Type.NUMBER, description: 'Valor da transação em reais.' },
        type: { type: Type.STRING, description: 'Tipo da transação: "REVENUE" para ganhos ou "EXPENSE" para gastos.' },
        category: { type: Type.STRING, description: 'Categoria do gasto (ex: Alimentação, Lazer, Saúde).' },
        description: { type: Type.STRING, description: 'Breve descrição do que foi a transação.' }
      },
      required: ['amount', 'type', 'category', 'description']
    }
  };

  const reserveTool: FunctionDeclaration = {
    name: 'update_savings_reserve',
    parameters: {
      type: Type.OBJECT,
      description: 'Adiciona ou remove valores de uma das reservas financeiras do usuário.',
      properties: {
        reserve_name: { type: Type.STRING, description: 'Nome da reserva (ex: Emergência, Viagem).' },
        amount: { type: Type.NUMBER, description: 'Valor a ser adicionado (positivo) ou removido (negativo).' }
      },
      required: ['reserve_name', 'amount']
    }
  };

  const taskTool: FunctionDeclaration = {
    name: 'manage_task',
    parameters: {
      type: Type.OBJECT,
      description: 'Cria uma nova tarefa ou conclui uma existente.',
      properties: {
        title: { type: Type.STRING, description: 'Título da tarefa.' },
        action: { type: Type.STRING, description: 'Ação a ser realizada: "CREATE" ou "COMPLETE".' }
      },
      required: ['title', 'action']
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Você é o Nexus, o núcleo de inteligência de performance da Kamilla. 
        Dados atuais: Saldo R$ ${stats.balance}, Nível ${stats.level}.
        Regras: Se o usuário disser que gastou ou recebeu, use register_transaction. 
        Se falar de poupar ou investir em reservas, use update_savings_reserve. 
        Se falar de tarefas, use manage_task. 
        Confirme a ação de forma curta e profissional. Comando: ${userMsg}`,
        config: {
          tools: [{ functionDeclarations: [transactionTool, reserveTool, taskTool] }]
        }
      });

      if (response.functionCalls) {
        for (const fc of response.functionCalls) {
          if (fc.name === 'register_transaction') {
            const { amount, type, category, description } = fc.args as any;
            const finalAmount = type === 'REVENUE' ? amount : -amount;
            onAdjustBalance(finalAmount, description, category);
          } else if (fc.name === 'update_savings_reserve') {
            const { reserve_name, amount } = fc.args as any;
            onAdjustReserva(reserve_name, amount);
          } else if (fc.name === 'manage_task') {
            const { title, action } = fc.args as any;
            onManageTask(title, action as any);
          }
        }
      }

      setMessages(prev => [...prev, { role: 'bot', text: response.text || 'Entendido. Comando processado e sincronizado no núcleo Nexus.' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Erro na sincronização de dados. Tente novamente.' }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 no-scrollbar text-neutral-300">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-emerald-500 text-black font-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-200'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && <div className="text-[10px] font-black uppercase text-emerald-500 animate-pulse ml-2 tracking-widest">Sincronizando Dados...</div>}
      </div>
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-10 group-focus-within:opacity-20 transition duration-500"></div>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Diga ao Nexus: 'Gastei 50 em lazer' ou 'Paguei o boleto'..."
          className="relative w-full bg-neutral-900/90 border border-neutral-800 focus:border-emerald-500 outline-none rounded-xl px-5 py-4 pr-14 text-sm font-semibold transition-all backdrop-blur-md text-white"
        />
        <button onClick={sendMessage} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-emerald-500 text-black rounded-lg active:scale-90 hover:bg-emerald-400 transition-colors shadow-xl">
          <Send size={18} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default App;
