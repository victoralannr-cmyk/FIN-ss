import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  LayoutDashboard, 
  Wallet, 
  CheckSquare, 
  Bot, 
  Check, 
  Trash2, 
  Mic, 
  X, 
  Zap, 
  Flag, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
  Save,
  Sparkles,
  Send
} from 'lucide-react';
import { Card } from './components/ui/Card';
import { AnimatedNumber } from './components/ui/AnimatedNumber';
import { RadarScoreChart } from './components/ui/RadarScoreChart';
import { GoalProgressCard } from './components/ui/GoalProgressCard';
import { CategoryExpensesChart } from './components/ui/CategoryExpensesChart';
import { 
  Priority, 
  Rank, 
  Transaction, 
  Task, 
  UserStats 
} from './types';
import { 
  CATEGORIES
} from './constants';
import { processAICmd } from './services/geminiService';
import confetti from 'canvas-confetti';

interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  text: string;
}

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  completed: boolean;
}

// Avatar do Nero (Pet Corvo Imperial) - Atualizado com a nova imagem majestosa enviada pelo usuário
const NERO_AVATAR = "https://raw.githubusercontent.com/StackBlitz/stackblitz-images/main/raven-nero-new.png"; 

const VWalletLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <div className="relative transform hover:scale-105 transition-transform duration-700">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
        <path d="M20,30 Q35,85 50,85 Q65,85 80,30" fill="none" stroke="url(#v-gradient)" strokeWidth="14" strokeLinecap="round" />
        <circle cx="50" cy="35" r="22" fill="url(#coin-gradient)" />
        <text x="50" y="44" textAnchor="middle" fill="#2a1a00" fontSize="24" fontWeight="700" style={{ fontFamily: 'var(--font-main)' }}>$</text>
        <defs>
          <linearGradient id="v-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#f4a261" />
          </linearGradient>
          <linearGradient id="coin-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
        </defs>
      </svg>
      <Sparkles className="absolute -top-3 -right-3 text-yellow-400 w-6 h-6 animate-pulse" />
    </div>
  </div>
);

export const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [userName, setUserName] = useState('');
  const [onboardingError, setOnboardingError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<UserStats>({ xp: 0, rank: Rank.INICIANTE, level: 1, totalRevenue: 0, totalExpenses: 0, balance: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [monthlyLimit, setMonthlyLimit] = useState(5000); 
  const [initialReserve, setInitialReserve] = useState(0); 

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTransDesc, setNewTransDesc] = useState('');
  const [newTransAmount, setNewTransAmount] = useState('');
  const [newTransType, setNewTransType] = useState<'REVENUE' | 'EXPENSE'>('EXPENSE');
  const [newTransCategory, setNewTransCategory] = useState('Outros');

  // Máscara de Moeda Financeira (ex: 1.234,56)
  const formatAsCurrencyInput = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (!digits) return "";
    let amount = parseInt(digits) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyToNumber = (formatted: string) => {
    if (!formatted) return 0;
    return parseFloat(formatted.replace(/\./g, "").replace(",", "."));
  };

  // Cálculos Memoizados
  const currentMonthTransactions = useMemo((): Transaction[] => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [transactions, viewDate]);

  const monthlyStats = useMemo(() => {
    let revenueSum = 0;
    let expensesSum = 0;
    currentMonthTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'REVENUE') revenueSum += amt;
      else expensesSum += amt;
    });
    return { 
      revenue: revenueSum, 
      expenses: expensesSum, 
      balance: revenueSum - expensesSum 
    };
  }, [currentMonthTransactions]);

  const totalEquity = useMemo(() => initialReserve + monthlyStats.balance, [initialReserve, monthlyStats.balance]);

  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(viewDate);
  }, [viewDate]);

  const completedCount = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const totalCount = useMemo(() => tasks.length, [tasks]);
  const completedGoalsCount = useMemo(() => goals.filter(g => g.completed).length, [goals]);
  const activeGoalsCount = useMemo(() => goals.filter(g => !g.completed).length, [goals]);

  useEffect(() => {
    const savedName = localStorage.getItem('nexus_user_name');
    const savedStats = localStorage.getItem('nexus_user_stats');
    const savedTasks = localStorage.getItem('nexus_user_tasks');
    const savedTransactions = localStorage.getItem('nexus_user_transactions');
    const savedGoals = localStorage.getItem('nexus_user_goals');
    const savedLimit = localStorage.getItem('nexus_monthly_limit');
    const savedReserve = localStorage.getItem('nexus_initial_reserve');
    
    if (savedLimit) setMonthlyLimit(Number(savedLimit));
    if (savedReserve) setInitialReserve(Number(savedReserve));

    if (savedName) {
      setUserName(savedName);
      setIsOnboarding(false);
      if (savedStats) setStats(JSON.parse(savedStats));
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
      if (savedGoals) setGoals(JSON.parse(savedGoals));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isOnboarding && isLoaded) {
      localStorage.setItem('nexus_user_name', userName);
      localStorage.setItem('nexus_user_stats', JSON.stringify(stats));
      localStorage.setItem('nexus_user_tasks', JSON.stringify(tasks));
      localStorage.setItem('nexus_user_transactions', JSON.stringify(transactions));
      localStorage.setItem('nexus_user_goals', JSON.stringify(goals));
      localStorage.setItem('nexus_monthly_limit', monthlyLimit.toString());
      localStorage.setItem('nexus_initial_reserve', initialReserve.toString());
    }
  }, [stats, tasks, transactions, goals, monthlyLimit, initialReserve, isOnboarding, isLoaded, userName]);

  const changeMonth = (offset: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const triggerFireworks = (color = '#ffae00') => {
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: [color] });
  };

  const handleAdjustBalance = (amount: number, description: string, category: string) => {
    const isPositive = amount > 0;
    const absAmount = Math.abs(amount);
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: isPositive ? 'REVENUE' : 'EXPENSE',
      amount: absAmount,
      category: category,
      date: new Date().toISOString().split('T')[0],
      description: description,
    };
    setTransactions(prev => [newTransaction, ...prev]);
    setStats(prev => ({
      ...prev,
      balance: prev.balance + amount,
    }));
  };

  const handleAddManualTransaction = () => {
    if (!newTransDesc || !newTransAmount) return;
    const amountValue = parseCurrencyToNumber(newTransAmount);
    if (isNaN(amountValue)) return;

    handleAdjustBalance(
      newTransType === 'REVENUE' ? amountValue : -amountValue,
      newTransDesc,
      newTransCategory
    );

    setNewTransDesc('');
    setNewTransAmount('');
    triggerFireworks(newTransType === 'REVENUE' ? '#10b981' : '#f43f5e');
  };

  const handleUpdateTotalBalance = () => {
    const newVal = parseCurrencyToNumber(tempBalance);
    if (!isNaN(newVal)) {
      setInitialReserve(newVal - monthlyStats.balance);
      triggerFireworks('#d4af37');
      setIsEditingBalance(false);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(item => item.id !== id));
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id && !t.completed) {
        setStats(s => ({ ...s, xp: s.xp + 20 }));
        triggerFireworks();
        return { ...t, completed: true };
      }
      return t;
    }));
  };

  const handleUpdateGoal = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const newCurrent = g.current + amount;
        const isCompleted = newCurrent >= g.target;
        if (isCompleted && !g.completed) {
          setStats(s => ({ ...s, xp: s.xp + 100 }));
          triggerFireworks('#d4af37');
        }
        return { ...g, current: newCurrent, completed: isCompleted };
      }
      return g;
    }));
  };

  const handleAiChat = async (text: string, audioBase64?: string) => {
    if (!text && !audioBase64) return;
    setIsAiLoading(true);
    if (text) setMessages(prev => [...prev, { role: 'user', text }]);
    const result = await processAICmd(text, audioBase64);
    if (result.functionCalls) {
      result.functionCalls.forEach((call: any) => {
        if (call.name === 'add_transaction') {
          const val = call.args.type === 'REVENUE' ? Number(call.args.amount) : -Number(call.args.amount);
          handleAdjustBalance(val, call.args.description, call.args.category || 'Outros');
        }
      });
    }
    setMessages(prev => [...prev, { role: 'ai', text: result.text || "Operação concluída pelo Nero." }]);
    setIsAiLoading(false);
    setChatInput('');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          handleAiChat("Comando de áudio registrado.", base64Audio); 
        };
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  if (!isLoaded) return null;

  if (isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 p-12 space-y-12 rounded-[2.5rem]">
          <div className="text-center space-y-6">
            <VWalletLogo className="w-24 h-24 mx-auto mb-2" />
            <h1 className="text-4xl text-chique font-bold">VWallet</h1>
          </div>
          <div className="space-y-8">
            <input 
              type="text" 
              placeholder="Identifique-se" 
              value={userName} 
              onChange={e => setUserName(e.target.value)}
              className="w-full bg-black border-b-2 border-neutral-800 focus:border-[#d4af37] p-4 text-xl font-medium text-center outline-none"
            />
            {onboardingError && <p className="text-red-500 text-center font-medium">{onboardingError}</p>}
          </div>
          <button 
            onClick={() => {
              if (!userName.trim()) return setOnboardingError('Identificação mandatória.');
              setIsOnboarding(false);
            }}
            className="btn-modern w-full py-6 bg-gradient-to-r from-[#b8860b] to-[#d4af37] text-black font-bold rounded-full shadow-2xl uppercase tracking-wider"
          >
            Acessar Sistema
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-sans overflow-hidden">
      <aside className="hidden lg:flex flex-col w-72 border-r border-neutral-900 p-10 bg-black/80 backdrop-blur-2xl">
        <div className="flex flex-col items-center gap-6 mb-16">
          <VWalletLogo className="w-16 h-16" />
          <span className="text-xl text-chique font-bold">VWallet</span>
        </div>
        <nav className="space-y-3 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
            { id: 'finances', icon: Wallet, label: 'Finanças' },
            { id: 'tasks', icon: CheckSquare, label: 'Tarefas' },
            { id: 'goals', icon: Flag, label: 'Metas' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl uppercase text-[10px] tracking-[0.25em] font-bold transition-all ${
                activeTab === item.id ? 'bg-[#d4af37] text-black shadow-xl' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
          {/* Botão Nero Sempre Visível no Desktop */}
          <button
            onClick={() => setIsAiOpen(true)}
            className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl uppercase text-[10px] tracking-[0.25em] font-bold transition-all mt-10 border border-[#d4af37]/20 ${
              isAiOpen ? 'bg-[#d4af37] text-black' : 'text-[#d4af37] hover:bg-[#d4af37]/10'
            }`}
          >
            <Bot size={16} />
            Chat Nero
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-6 sm:p-12 max-w-7xl mx-auto w-full pb-32 lg:pb-12 overflow-y-auto h-screen no-scrollbar relative">
        {activeTab === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-1000">
            <header className="flex justify-between items-start gap-8">
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-6xl font-bold tracking-tight">Olá, <span className="text-[#d4af37] uppercase">{userName}</span></h2>
                <p className="text-[10px] text-neutral-600 uppercase tracking-[0.6em] font-medium">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button onClick={() => setIsAiOpen(true)} className="btn-modern p-6 bg-neutral-900 border border-[#d4af37]/20 text-white rounded-full font-bold uppercase text-[11px] tracking-[0.35em] shadow-xl">
                <Bot size={24} />
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <Card className="relative overflow-hidden p-12 bg-neutral-950 border-neutral-900 shadow-2xl group rounded-[2.5rem]">
                <Wallet className="absolute -right-8 -top-8 text-neutral-800 opacity-20 rotate-12" size={120} />
                <h4 className="text-[11px] text-neutral-600 uppercase tracking-[0.5em] mb-6 font-medium">Balanço Patrimonial Total</h4>
                <div className="flex items-center gap-5">
                   {isEditingBalance ? (
                     <div className="flex items-center gap-2">
                       <input 
                         type="text" 
                         value={tempBalance}
                         onChange={e => setTempBalance(formatAsCurrencyInput(e.target.value))}
                         className="bg-black border-b-2 border-[#d4af37] text-3xl font-semibold w-56 outline-none"
                         autoFocus
                         onKeyDown={e => e.key === 'Enter' && handleUpdateTotalBalance()}
                       />
                       <button onClick={handleUpdateTotalBalance} className="p-3 bg-[#d4af37] text-black rounded-full"><Save size={18}/></button>
                     </div>
                   ) : (
                     <>
                       <div className="text-5xl font-bold tracking-tighter">R$ <AnimatedNumber value={totalEquity} /></div>
                       <button onClick={() => { setTempBalance(totalEquity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })); setIsEditingBalance(true); }} className="p-4 bg-neutral-900 rounded-full hover:text-[#d4af37] transition-colors"><Pencil size={18} /></button>
                     </>
                   )}
                </div>
              </Card>

              <Card className="p-12 bg-neutral-950 border-neutral-900 shadow-2xl rounded-[2.5rem]">
                <h4 className="text-[11px] text-neutral-600 uppercase tracking-[0.5em] mb-6 font-medium">Performance Nero</h4>
                <div className="text-5xl font-bold">{stats.xp} <span className="text-sm font-normal">XP</span></div>
                <div className="mt-8 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <div className="h-full bg-gradient-to-r from-[#b8860b] to-[#d4af37] transition-all duration-1000" style={{ width: `${(stats.xp % 2000) / 20}%` }} />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-950 border border-emerald-900/20 rounded-[2rem] p-8 shadow-xl">
                 <p className="text-[10px] text-emerald-500/60 font-medium uppercase tracking-widest mb-2">Entradas Mensais</p>
                 <h3 className="text-2xl font-semibold text-emerald-500">R$ {monthlyStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="bg-neutral-950 border border-rose-900/20 rounded-[2rem] p-8 shadow-xl">
                 <p className="text-[10px] text-rose-500/60 font-medium uppercase tracking-widest mb-2">Saídas Mensais</p>
                 <h3 className="text-2xl font-semibold text-rose-500">R$ {monthlyStats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-[2rem] p-8 shadow-xl">
                 <p className="text-[10px] text-neutral-600 font-medium uppercase tracking-widest mb-2">Saldo do Mês</p>
                 <h3 className="text-2xl font-semibold text-white">R$ {monthlyStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              <div className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-12 flex flex-col shadow-2xl">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-white mb-10 border-b border-neutral-900 pb-6 opacity-60">Diretrizes do Dia</h3>
                <div className="space-y-8 flex-1">
                  {tasks.slice(0, 4).map((task) => (
                    <div key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-8 group cursor-pointer transition-all">
                      <div className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${task.completed ? 'bg-[#d4af37] border-[#d4af37]' : 'border-neutral-800 group-hover:border-neutral-500'}`}>
                        {task.completed && <Check size={16} className="text-black" strokeWidth={3} />}
                      </div>
                      <span className={`text-xl font-normal tracking-tight transition-all uppercase ${task.completed ? 'text-neutral-700 line-through' : 'text-neutral-200'}`}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-12 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden">
                <RadarScoreChart data={[
                  { label: 'Foco', value: totalCount > 0 ? (completedCount / totalCount) * 100 : 0, color: '#d4af37' },
                  { label: 'Fluxo', value: Math.min(100, (totalEquity / 10000) * 100), color: '#d4af37' },
                  { label: 'Ação', value: Math.min(100, (stats.xp / 5000) * 100), color: '#d4af37' },
                  { label: 'Metas', value: goals.length > 0 ? (completedGoalsCount / goals.length) * 100 : 0, color: '#d4af37' },
                  { label: 'Nero', value: 85, color: '#d4af37' }
                ]} size={320} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finances' && (
          <div className="space-y-12 pb-24">
            <header className="flex flex-col items-center gap-10">
              <div className="flex items-center gap-10">
                <button onClick={() => changeMonth(-1)} className="p-4 bg-neutral-900/50 rounded-2xl border border-neutral-800"><ChevronLeft size={24} /></button>
                <h2 className="text-3xl font-bold uppercase">{currentMonthName}</h2>
                <button onClick={() => changeMonth(1)} className="p-4 bg-neutral-900/50 rounded-2xl border border-neutral-800"><ChevronRight size={24} /></button>
              </div>
            </header>

            <Card className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex items-center gap-8">
                 <div className="w-16 h-16 bg-[#d4af37]/10 rounded-full flex items-center justify-center border border-[#d4af37]/10">
                    <Wallet className="text-[#d4af37]" size={28} />
                 </div>
                 <div>
                    <p className="text-[11px] text-neutral-600 font-medium uppercase tracking-[0.4em] mb-2">BALANÇO PATRIMONIAL TOTAL</p>
                    {isEditingBalance ? (
                      <div className="flex items-center gap-4">
                        <input 
                          type="text" 
                          value={tempBalance}
                          onChange={e => setTempBalance(formatAsCurrencyInput(e.target.value))}
                          className="bg-black border-b-2 border-[#d4af37] text-3xl font-semibold w-56 outline-none"
                          autoFocus
                        />
                        <button onClick={handleUpdateTotalBalance} className="p-3 bg-[#d4af37] text-black rounded-full"><Save size={18}/></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <h3 className="text-5xl font-bold text-white">R$ {totalEquity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        <button onClick={() => { setTempBalance(totalEquity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })); setIsEditingBalance(true); }} className="text-neutral-600 hover:text-[#d4af37]"><Pencil size={20}/></button>
                      </div>
                    )}
                 </div>
              </div>
            </Card>

            <Card className="bg-neutral-950 border-neutral-900 rounded-[3rem] p-12 shadow-2xl space-y-8">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.5em] text-[#d4af37]">Novo Lançamento Manual</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <input 
                  type="text" 
                  placeholder="Descrição" 
                  value={newTransDesc}
                  onChange={e => setNewTransDesc(e.target.value)}
                  className="w-full bg-black border border-neutral-800 p-4 rounded-xl outline-none focus:border-[#d4af37]"
                />
                <input 
                  type="text" 
                  placeholder="Valor R$ 0,00" 
                  value={newTransAmount}
                  onChange={e => setNewTransAmount(formatAsCurrencyInput(e.target.value))}
                  className="w-full bg-black border border-neutral-800 p-4 rounded-xl outline-none focus:border-[#d4af37]"
                />
                <select 
                  value={newTransCategory}
                  onChange={e => setNewTransCategory(e.target.value)}
                  className="w-full bg-black border border-neutral-800 p-4 rounded-xl outline-none focus:border-[#d4af37]"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setNewTransType('REVENUE')} className={`flex-1 p-4 rounded-xl font-bold uppercase text-[9px] ${newTransType === 'REVENUE' ? 'bg-emerald-600 text-white' : 'bg-neutral-900 text-neutral-500'}`}>Receita</button>
                  <button onClick={() => setNewTransType('EXPENSE')} className={`flex-1 p-4 rounded-xl font-bold uppercase text-[9px] ${newTransType === 'EXPENSE' ? 'bg-rose-600 text-white' : 'bg-neutral-900 text-neutral-500'}`}>Despesa</button>
                </div>
              </div>
              <button onClick={handleAddManualTransaction} className="btn-modern w-full py-6 bg-gradient-to-r from-[#b8860b] to-[#d4af37] text-black rounded-2xl font-bold uppercase tracking-[0.4em] text-[11px]">Registrar Lançamento</button>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-12 shadow-3xl">
                 <CategoryExpensesChart transactions={currentMonthTransactions} />
               </div>
               <Card className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-12 shadow-3xl h-[500px] flex flex-col">
                 <h3 className="text-[11px] font-medium uppercase tracking-[0.4em] text-white mb-8 border-b border-neutral-900 pb-4">Histórico Recente</h3>
                 <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                   {currentMonthTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                     <div key={t.id} className="flex items-center justify-between p-5 bg-black/40 border border-neutral-900 rounded-2xl group transition-all">
                       <div className="flex items-center gap-4">
                         <div className={`p-3 rounded-xl ${t.type === 'REVENUE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                           {t.type === 'REVENUE' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                         </div>
                         <div>
                           <p className="text-sm font-medium text-white uppercase">{t.description}</p>
                           <p className="text-[10px] text-neutral-600 uppercase tracking-widest">{t.category} • {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-5">
                         <p className={`text-sm font-semibold ${t.type === 'REVENUE' ? 'text-emerald-500' : 'text-rose-500'}`}>R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                         <button onClick={() => handleDeleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-neutral-700 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                       </div>
                     </div>
                   ))}
                 </div>
               </Card>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-12 pb-24">
             <header><h2 className="text-4xl font-bold tracking-tight uppercase">Performances</h2></header>
            <Card className="rounded-[3rem] p-12 bg-neutral-950 border-neutral-900 shadow-2xl">
              <div className="flex gap-6 mb-12">
                <input 
                  type="text" 
                  placeholder="Defina sua missão..." 
                  className="flex-1 bg-black/50 border-b-2 border-neutral-800 p-6 text-xl outline-none focus:border-[#d4af37]" 
                  value={newTaskTitle} 
                  onChange={e => setNewTaskTitle(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && newTaskTitle.trim()) { setTasks(prev => [{ id: Date.now().toString(), title: newTaskTitle, priority: Priority.MEDIUM, completed: false, xpValue: 20 }, ...prev]); setNewTaskTitle(''); } }} 
                />
                <button onClick={() => { if (newTaskTitle.trim()) { setTasks(prev => [{ id: Date.now().toString(), title: newTaskTitle, priority: Priority.MEDIUM, completed: false, xpValue: 20 }, ...prev]); setNewTaskTitle(''); } }} className="p-6 bg-[#d4af37] text-black rounded-3xl"><Plus size={32} strokeWidth={3} /></button>
              </div>
              <div className="space-y-6">
                {tasks.map(task => (
                  <div key={task.id} onClick={() => toggleTask(task.id)} className={`p-8 border rounded-[2rem] flex items-center gap-8 cursor-pointer transition-all ${task.completed ? 'opacity-30' : 'border-neutral-900 hover:border-[#d4af37]/40 bg-neutral-950/50'}`}>
                    <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center ${task.completed ? 'bg-[#d4af37] border-[#d4af37]' : 'border-neutral-800'}`}>
                      {task.completed && <Check size={16} className="text-black" strokeWidth={3} />}
                    </div>
                    <span className={`text-xl uppercase flex-1 ${task.completed ? 'line-through text-neutral-600' : ''}`}>{task.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'goals' && (
           <div className="space-y-12 pb-24">
             <header><h2 className="text-4xl font-bold tracking-tight uppercase">Metas</h2></header>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-10 shadow-xl">
                  <GoalProgressCard activeCount={activeGoalsCount} completedCount={completedGoalsCount} />
                </div>
                {goals.map(goal => (
                  <Card key={goal.id} className="relative p-10 bg-neutral-950 border-neutral-900 rounded-[3rem] group shadow-xl">
                    <h4 className="text-xl font-semibold uppercase mb-2">{goal.title}</h4>
                    <p className="text-[10px] text-neutral-600 font-medium uppercase mb-8">{goal.current} / {goal.target} {goal.unit}</p>
                    <div className="h-3 bg-neutral-900 rounded-full overflow-hidden mb-8 border border-neutral-800">
                      <div className="h-full bg-[#d4af37] transition-all duration-700" style={{ width: `${(goal.current / goal.target) * 100}%` }} />
                    </div>
                    <button onClick={() => handleUpdateGoal(goal.id, 1)} className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold uppercase text-[10px] border border-neutral-800">+ Incrementar</button>
                  </Card>
                ))}
                <button onClick={() => {
                  const title = prompt("Qual sua meta?");
                  const target = prompt("Qual o valor alvo?");
                  if (title && target) setGoals(prev => [...prev, { id: Date.now().toString(), title, target: Number(target), current: 0, unit: 'un', completed: false }]);
                }} className="border-2 border-dashed border-neutral-900 rounded-[3rem] p-10 flex flex-col items-center justify-center gap-4 text-neutral-800 hover:text-[#d4af37] hover:border-[#d4af37] transition-all">
                   <Plus size={40}/>
                   <span className="text-[11px] font-medium uppercase tracking-widest">Nova Meta Estratégica</span>
                </button>
             </div>
           </div>
        )}
      </main>

      {/* CHAT NERO */}
      {isAiOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-12 lg:right-12 lg:w-[480px] lg:h-[840px] bg-black border border-neutral-900 lg:rounded-[3.5rem] flex flex-col z-[500] shadow-[0_40px_100px_rgba(0,0,0,1)] overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
          <div className="p-10 border-b border-neutral-900 flex justify-between items-center bg-black/95 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-[#d4af37]/50 overflow-hidden shadow-[0_0_15px_rgba(212,175,55,0.3)] bg-neutral-900">
                <img src={NERO_AVATAR} alt="Nero Pet" className="w-full h-full object-cover" />
              </div>
              <span className="uppercase text-[14px] font-bold text-[#d4af37] tracking-[0.3em]">NERO AI</span>
            </div>
            <button onClick={() => setIsAiOpen(false)} className="text-neutral-600 hover:text-white transition-colors bg-neutral-900 p-3 rounded-full"><X size={20} /></button>
          </div>
          <div 
            className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar"
            style={{ background: 'radial-gradient(circle at 50% 10%, #660000 0%, #000000 80%)' }}
          >
            {messages.length === 0 && (
              <div className="text-center py-32 space-y-10 animate-in fade-in duration-1000">
                <div className="relative inline-block">
                  <div className="w-32 h-32 mx-auto rounded-full border-4 border-[#d4af37]/20 overflow-hidden opacity-60 hover:opacity-100 transition-opacity shadow-2xl bg-neutral-900">
                    <img src={NERO_AVATAR} alt="Pet Nero" className="w-full h-full object-cover" />
                  </div>
                  <Sparkles className="absolute -top-2 -right-2 text-[#d4af37] animate-pulse" />
                </div>
                <p className="text-sm text-neutral-500 font-normal italic px-8 opacity-60">"Nero, registre um gasto de R$ 50 com almoço"</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300`}>
                <div className={`max-w-[90%] p-6 rounded-[2rem] text-sm font-normal uppercase ${m.role === 'user' ? 'bg-[#d4af37] text-black shadow-lg' : 'bg-neutral-900 text-white border border-neutral-800 shadow-xl'}`}>{m.text}</div>
              </div>
            ))}
            {isAiLoading && <div className="text-[#d4af37] animate-pulse text-[11px] uppercase font-medium px-8 flex items-center gap-3"><Loader2 className="animate-spin" size={16}/> Nero está processando...</div>}
          </div>
          <div className="p-10 border-t border-neutral-900 space-y-8 bg-neutral-950/95 pb-24 lg:pb-16 backdrop-blur-xl">
            <div className="flex gap-5 items-center">
              <input type="text" placeholder="Comande o Nero..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiChat(chatInput)} className="flex-1 bg-black border border-neutral-800 p-6 rounded-3xl text-sm outline-none focus:border-[#d4af37] shadow-inner" />
              <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-6 rounded-3xl transition-all shadow-xl ${isRecording ? 'bg-rose-700 text-white animate-pulse' : 'bg-neutral-900 text-neutral-600'}`}><Mic size={30} /></button>
              <button onClick={() => handleAiChat(chatInput)} className="p-6 bg-[#d4af37] text-black rounded-3xl shadow-xl transition-all active:scale-90"><Send size={30} strokeWidth={3} /></button>
            </div>
          </div>
        </div>
      )}

      {/* NAVEGAÇÃO MOBILE */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-24 bg-black/95 backdrop-blur-3xl border-t border-neutral-900 flex items-center justify-around px-6 pb-6 z-[400] shadow-[0_-15px_40px_rgba(0,0,0,0.9)]">
        <button onClick={() => setActiveTab('dashboard')} className={`p-4 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-[#d4af37] text-black' : 'text-neutral-700'}`}>
          <LayoutDashboard size={26} />
        </button>
        <button onClick={() => setActiveTab('finances')} className={`p-4 rounded-full transition-all ${activeTab === 'finances' ? 'bg-[#d4af37] text-black' : 'text-neutral-700'}`}>
          <Wallet size={26} />
        </button>
        {/* Botão AI Central no Mobile */}
        <button onClick={() => setIsAiOpen(true)} className={`p-5 rounded-full transition-all border-2 border-[#d4af37]/20 ${isAiOpen ? 'bg-[#d4af37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-neutral-900 text-[#d4af37]'}`}>
          <Bot size={30} />
        </button>
        <button onClick={() => setActiveTab('tasks')} className={`p-4 rounded-full transition-all ${activeTab === 'tasks' ? 'bg-[#d4af37] text-black' : 'text-neutral-700'}`}>
          <CheckSquare size={26} />
        </button>
        <button onClick={() => setActiveTab('goals')} className={`p-4 rounded-full transition-all ${activeTab === 'goals' ? 'bg-[#d4af37] text-black' : 'text-neutral-700'}`}>
          <Flag size={26} />
        </button>
      </nav>
    </div>
  );
};
