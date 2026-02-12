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
import { CATEGORIES } from './constants';
import { processAICmd, suggestEmoji } from './services/geminiService';
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
  emoji?: string;
}

const NERO_AVATAR = "https://i.postimg.cc/cJCRJfCZ/Chat-GPT-Image-12-de-fev-de-2026-16-02-46-removebg-preview.png"; 

const DonteLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <div className="relative transform hover:scale-105 transition-transform duration-700 w-full h-full flex items-center justify-center">
      <img 
        src="https://i.postimg.cc/cJCRJfCZ/Chat-GPT-Image-12-de-fev-de-2026-16-02-46-removebg-preview.png" 
        alt="GESTORA DONTE Logo" 
        className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.3)]"
      />
      <Sparkles className="absolute -top-1 -right-1 text-yellow-400 w-5 h-5 animate-pulse" />
    </div>
  </div>
);

export const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<UserStats>({ xp: 0, rank: Rank.INICIANTE, level: 1, totalRevenue: 0, totalExpenses: 0, balance: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  const [viewDate, setViewDate] = useState(new Date());
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

  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

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
    return { revenue: revenueSum, expenses: expensesSum, balance: revenueSum - expensesSum };
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
    const savedReserve = localStorage.getItem('nexus_initial_reserve');
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
      localStorage.setItem('nexus_initial_reserve', initialReserve.toString());
    }
  }, [stats, tasks, transactions, goals, initialReserve, isOnboarding, isLoaded, userName]);

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
    setStats(prev => ({ ...prev, balance: prev.balance + amount }));
  };

  const handleAddManualTransaction = () => {
    if (!newTransDesc || !newTransAmount) return;
    const amountValue = parseCurrencyToNumber(newTransAmount);
    if (isNaN(amountValue)) return;
    handleAdjustBalance(newTransType === 'REVENUE' ? amountValue : -amountValue, newTransDesc, newTransCategory);
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

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const emoji = await suggestEmoji(newTaskTitle);
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      priority: Priority.MEDIUM,
      completed: false,
      xpValue: 20,
      emoji: emoji
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    triggerFireworks();
  };

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim() || !newGoalTarget) return;
    const targetValue = parseCurrencyToNumber(newGoalTarget);
    if (isNaN(targetValue) || targetValue <= 0) return;

    const emoji = await suggestEmoji(newGoalTitle);
    const newGoal: Goal = {
      id: Date.now().toString(),
      title: newGoalTitle,
      target: targetValue,
      current: 0,
      unit: 'R$',
      completed: false,
      emoji: emoji
    };
    setGoals(prev => [...prev, newGoal]);
    setNewGoalTitle('');
    setNewGoalTarget('');
    setIsAddingGoal(false);
    triggerFireworks('#d4af37');
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
          handleAiChat("", base64Audio); 
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
        <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 p-8 sm:p-12 space-y-12 rounded-[2.5rem]">
          <div className="text-center space-y-6">
            <DonteLogo className="w-40 h-40 mx-auto mb-2" />
            <h1 className="text-3xl text-chique font-black tracking-widest">GESTORA DONTE</h1>
          </div>
          <div className="space-y-4">
             <p className="text-[10px] text-neutral-500 uppercase tracking-widest text-center">Informe seu Saldo Inicial</p>
             <input 
               type="text" 
               placeholder="R$ 0,00" 
               value={tempBalance}
               onChange={e => setTempBalance(formatAsCurrencyInput(e.target.value))}
               className="w-full bg-black border-b-2 border-neutral-800 focus:border-[#d4af37] p-4 text-3xl font-bold text-center outline-none"
             />
          </div>
          <div className="space-y-4">
             <p className="text-[10px] text-neutral-500 uppercase tracking-widest text-center">Seu Nome</p>
             <input 
               type="text" 
               placeholder="Identifique-se" 
               value={userName} 
               onChange={e => setUserName(e.target.value)}
               className="w-full bg-black border-b-2 border-neutral-800 focus:border-[#d4af37] p-4 text-xl font-medium text-center outline-none"
             />
          </div>
          <button 
            onClick={() => { 
              if (!userName.trim()) return; 
              setInitialReserve(parseCurrencyToNumber(tempBalance));
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
          <DonteLogo className="w-24 h-24" />
          <span className="text-lg text-chique font-black text-center mt-2">GESTORA DONTE</span>
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
          <button onClick={() => setIsAiOpen(true)} className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl uppercase text-[10px] tracking-[0.25em] font-bold transition-all mt-10 border border-[#d4af37]/20 ${isAiOpen ? 'bg-[#d4af37] text-black' : 'text-[#d4af37] hover:bg-[#d4af37]/10'}`}>
            <Bot size={16} /> Nero
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto w-full pb-32 lg:pb-12 overflow-y-auto h-screen no-scrollbar relative">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 lg:space-y-12 animate-in fade-in duration-1000">
            <header className="flex flex-col sm:flex-row justify-between items-start gap-6 sm:gap-8">
              <div className="space-y-2 lg:space-y-4">
                <h2 className="text-3xl lg:text-6xl font-bold tracking-tight">Olá, <span className="text-[#d4af37] uppercase">{userName}</span></h2>
                <p className="text-sm lg:text-lg text-white uppercase tracking-[0.2em] font-black border-l-4 border-[#d4af37] pl-5 py-1">
                  {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
                </p>
              </div>
              <button onClick={() => setIsAiOpen(true)} className="btn-modern p-5 lg:p-6 bg-neutral-900 border border-[#d4af37]/20 text-white rounded-full font-bold shadow-xl">
                <Bot size={24} />
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
              <Card className="relative overflow-hidden p-8 lg:p-12 bg-neutral-950 border-neutral-900 shadow-2xl group rounded-[2.5rem]">
                <Wallet className="absolute -right-8 -top-8 text-neutral-800 opacity-20 rotate-12" size={120} />
                <h4 className="text-base lg:text-lg text-[#d4af37] uppercase tracking-[0.25em] mb-4 lg:mb-6 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Balanço Patrimonial Total</h4>
                <div className="flex items-center gap-5">
                   {isEditingBalance ? (
                     <div className="flex items-center gap-2">
                       <input 
                         type="text" 
                         value={tempBalance}
                         onChange={e => setTempBalance(formatAsCurrencyInput(e.target.value))}
                         className="bg-black border-b-2 border-[#d4af37] text-2xl lg:text-3xl font-semibold w-48 lg:w-56 outline-none"
                         autoFocus
                         onKeyDown={e => e.key === 'Enter' && handleUpdateTotalBalance()}
                       />
                       <button onClick={handleUpdateTotalBalance} className="p-3 bg-[#d4af37] text-black rounded-full">
                         <Save size={18}/>
                       </button>
                     </div>
                   ) : (
                     <>
                       <div className="text-3xl lg:text-5xl font-bold tracking-tighter text-white">R$ <AnimatedNumber value={totalEquity} /></div>
                       <button onClick={() => { setTempBalance(totalEquity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })); setIsEditingBalance(true); }} className="p-3 lg:p-4 bg-neutral-900 rounded-full hover:text-[#d4af37] transition-colors">
                         <Pencil size={18} />
                       </button>
                     </>
                   )}
                </div>
              </Card>

              <Card className="p-8 lg:p-12 bg-neutral-950 border-neutral-900 shadow-2xl rounded-[2.5rem]">
                <h4 className="text-base lg:text-lg text-[#d4af37] uppercase tracking-[0.25em] mb-4 lg:mb-6 font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Performance Nero</h4>
                <div className="text-3xl lg:text-5xl font-bold text-white">{stats.xp} <span className="text-sm font-normal text-neutral-400">XP</span></div>
                <div className="mt-6 lg:mt-8 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <div className="h-full bg-gradient-to-r from-[#b8860b] to-[#d4af37] transition-all duration-1000" style={{ width: `${(stats.xp % 2000) / 20}%` }} />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-10">
              <Card className="bg-neutral-950 border border-neutral-900 rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 flex flex-col shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-6 lg:mb-10 border-b border-neutral-900 pb-4 lg:pb-6">Diretrizes do Dia</h3>
                <div className="space-y-6 lg:space-y-8 flex-1">
                  {tasks.length === 0 ? (
                    <p className="text-xs text-neutral-500 uppercase italic">Nenhuma diretriz pendente.</p>
                  ) : (
                    tasks.slice(0, 4).map((task) => (
                      <div key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-6 lg:gap-8 group cursor-pointer transition-all">
                        <div className={`w-6 h-6 lg:w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${task.completed ? 'bg-[#d4af37] border-[#d4af37]' : 'border-neutral-800 group-hover:border-neutral-500'}`}>
                          {task.completed && <Check size={14} className="text-black" strokeWidth={3} />}
                        </div>
                        <span className={`text-lg lg:text-xl font-normal tracking-tight transition-all uppercase ${task.completed ? 'text-neutral-700 line-through' : 'text-neutral-200'}`}>
                          {task.emoji && <span className="mr-3">{task.emoji}</span>}
                          {task.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
              <div className="bg-neutral-950 border border-neutral-900 rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 flex flex-col items-center justify-center relative shadow-2xl overflow-hidden min-h-[350px]">
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
          <div className="space-y-8 lg:space-y-12 pb-24">
            <header className="flex flex-col items-center gap-6 lg:gap-10">
              <div className="flex items-center gap-6 lg:gap-10">
                <button onClick={() => changeMonth(-1)} className="p-3 lg:p-4 bg-neutral-900/50 rounded-2xl border border-neutral-800">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-widest">{currentMonthName}</h2>
                <button onClick={() => changeMonth(1)} className="p-3 lg:p-4 bg-neutral-900/50 rounded-2xl border border-neutral-800">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </header>
            <Card className="bg-neutral-950 border-neutral-900 rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 shadow-2xl space-y-8">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#d4af37]">Gastos e Entradas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <input type="text" placeholder="Descrição" value={newTransDesc} onChange={e => setNewTransDesc(e.target.value)} className="w-full bg-black border border-neutral-800 p-4 rounded-xl outline-none focus:border-[#d4af37]" />
                <input type="text" placeholder="Valor R$ 0,00" value={newTransAmount} onChange={e => setNewTransAmount(formatAsCurrencyInput(e.target.value))} className="w-full bg-black border border-neutral-800 p-4 rounded-xl outline-none focus:border-[#d4af37]" />
                <select value={newTransCategory} onChange={e => setNewTransCategory(e.target.value)} className="w-full bg-black border border-neutral-800 p-4 rounded-xl outline-none focus:border-[#d4af37]">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setNewTransType('REVENUE')} className={`flex-1 p-4 rounded-xl font-bold uppercase text-[9px] ${newTransType === 'REVENUE' ? 'bg-emerald-600 text-white' : 'bg-neutral-900 text-neutral-500'}`}>Receita</button>
                  <button onClick={() => setNewTransType('EXPENSE')} className={`flex-1 p-4 rounded-xl font-bold uppercase text-[9px] ${newTransType === 'EXPENSE' ? 'bg-rose-600 text-white' : 'bg-neutral-900 text-neutral-500'}`}>Despesa</button>
                </div>
              </div>
              <button onClick={handleAddManualTransaction} className="btn-modern w-full py-6 bg-gradient-to-r from-[#b8860b] to-[#d4af37] text-black rounded-2xl font-black uppercase tracking-[0.4em] text-[11px]">Registrar Lançamento</button>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
               <div className="bg-neutral-950 border border-neutral-900 rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 shadow-3xl">
                 <CategoryExpensesChart transactions={currentMonthTransactions} />
               </div>
               <Card className="bg-neutral-950 border border-neutral-900 rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 shadow-3xl h-[450px] lg:h-[500px] flex flex-col">
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-6 lg:mb-8 border-b border-neutral-900 pb-4">Histórico Recente</h3>
                 <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                   {currentMonthTransactions.length === 0 ? (
                     <p className="text-[10px] text-neutral-600 uppercase italic py-8">Sem lançamentos este mês.</p>
                   ) : (
                     currentMonthTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                       <div key={t.id} className="flex items-center justify-between p-4 lg:p-5 bg-black/40 border border-neutral-900 rounded-2xl group transition-all">
                         <div className="flex items-center gap-4">
                           <div className={`p-2 lg:p-3 rounded-xl ${t.type === 'REVENUE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                             {t.type === 'REVENUE' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                           </div>
                           <div>
                             <p className="text-xs lg:text-sm font-medium text-white uppercase">{t.description}</p>
                             <p className="text-[8px] lg:text-[10px] text-neutral-600 uppercase tracking-widest">{t.category} • {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                           </div>
                         </div>
                         <p className={`text-xs lg:text-sm font-semibold ${t.type === 'REVENUE' ? 'text-emerald-500' : 'text-rose-500'}`}>R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       </div>
                     ))
                   )}
                 </div>
               </Card>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-8 lg:space-y-12 pb-24">
             <header><h2 className="text-3xl lg:text-4xl font-bold tracking-tight uppercase text-[#d4af37]">Tarefas diárias</h2></header>
            <Card className="rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 bg-neutral-950 border-neutral-900 shadow-2xl">
              <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 mb-8 lg:mb-12">
                <input type="text" placeholder="Defina sua nova Tarefa..." className="flex-1 bg-black/50 border-b-2 border-neutral-800 p-4 lg:p-6 text-lg lg:text-xl outline-none focus:border-[#d4af37] text-white" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTask()} />
                <button onClick={handleAddTask} className="p-4 lg:p-6 bg-[#d4af37] text-black rounded-3xl self-end sm:self-auto hover:scale-105 active:scale-95 transition-transform">
                  <Plus className="w-8 h-8" strokeWidth={3} />
                </button>
              </div>
              <div className="space-y-4 lg:space-y-6">
                {tasks.length === 0 ? (
                  <p className="text-sm text-neutral-600 uppercase italic py-8 text-center border border-dashed border-neutral-900 rounded-2xl">Sua lista de tarefas está vazia.</p>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} onClick={() => toggleTask(task.id)} className={`p-6 lg:p-8 border rounded-[2rem] flex items-center gap-6 lg:gap-8 cursor-pointer transition-all ${task.completed ? 'opacity-30' : 'border-neutral-900 hover:border-[#d4af37]/40 bg-neutral-950/50'}`}>
                      <div className={`w-6 h-6 lg:w-8 h-8 rounded-full border-4 flex items-center justify-center ${task.completed ? 'bg-[#d4af37] border-[#d4af37]' : 'border-neutral-800'}`}>
                        {task.completed && <Check className="w-4 h-4 text-black" strokeWidth={3} />}
                      </div>
                      <span className={`text-lg lg:text-xl uppercase flex-1 ${task.completed ? 'line-through text-neutral-600' : 'text-white'}`}>
                        {task.emoji && <span className="mr-3">{task.emoji}</span>}{task.title}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); setTasks(prev => prev.filter(t => t.id !== task.id)); }} className="text-neutral-800 hover:text-rose-500 transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'goals' && (
           <div className="space-y-8 lg:space-y-12 pb-24">
             <header><h2 className="text-3xl lg:text-4xl font-bold tracking-tight uppercase text-[#d4af37]">Metas</h2></header>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="bg-neutral-950 border border-neutral-900 rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-10 shadow-xl">
                  <GoalProgressCard activeCount={activeGoalsCount} completedCount={completedGoalsCount} />
                </div>
                
                {goals.map(goal => (
                  <Card key={goal.id} className="relative p-8 lg:p-10 bg-neutral-950 border-neutral-900 rounded-[2.5rem] lg:rounded-[3rem] group shadow-xl">
                    <h4 className="text-lg lg:text-xl font-black uppercase mb-2 text-white">{goal.emoji && <span className="mr-2">{goal.emoji}</span>}{goal.title}</h4>
                    <p className="text-[10px] text-neutral-400 font-black uppercase mb-6 lg:mb-8 tracking-widest">Meta: {goal.target.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <div className="h-3 bg-neutral-900 rounded-full overflow-hidden mb-6 lg:mb-8 border border-neutral-800">
                      <div className="h-full bg-gradient-to-r from-[#b8860b] to-[#d4af37] transition-all duration-700" style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }} />
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => {
                         const val = prompt("Qual o valor a adicionar?");
                         if (val) handleUpdateGoal(goal.id, parseFloat(val));
                       }} className="flex-1 py-3 lg:py-4 bg-neutral-900 text-white rounded-2xl font-black uppercase text-[10px] border border-neutral-800 hover:bg-neutral-800 transition-colors">+ Adicionar</button>
                    </div>
                    <button onClick={() => setGoals(prev => prev.filter(g => g.id !== goal.id))} className="absolute top-6 right-6 p-2 text-neutral-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Card>
                ))}

                {isAddingGoal ? (
                  <Card className="p-8 lg:p-10 bg-neutral-900 border-[#d4af37]/40 border-2 rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#d4af37]">Nova Meta</h4>
                      <input 
                        type="text" 
                        placeholder="Título da Meta" 
                        value={newGoalTitle} 
                        onChange={e => setNewGoalTitle(e.target.value)}
                        className="w-full bg-black border border-neutral-800 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]"
                        autoFocus
                      />
                      <input 
                        type="text" 
                        placeholder="Valor Alvo (R$)" 
                        value={newGoalTarget} 
                        onChange={e => setNewGoalTarget(formatAsCurrencyInput(e.target.value))}
                        className="w-full bg-black border border-neutral-800 p-4 rounded-xl text-white outline-none focus:border-[#d4af37]"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setIsAddingGoal(false)} className="flex-1 py-4 bg-neutral-800 text-white rounded-xl font-black uppercase text-[10px]">Cancelar</button>
                        <button onClick={handleCreateGoal} className="flex-1 py-4 bg-[#d4af37] text-black rounded-xl font-black uppercase text-[10px]">Criar</button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <button 
                    onClick={() => setIsAddingGoal(true)} 
                    className="border-2 border-dashed border-neutral-800 rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-10 flex flex-col items-center justify-center gap-4 text-neutral-700 hover:text-[#d4af37] hover:border-[#d4af37]/60 transition-all min-h-[250px] bg-neutral-950/20 group"
                  >
                     <div className="p-4 rounded-full bg-neutral-900 group-hover:bg-[#d4af37]/10 transition-colors">
                       <Plus className="w-9 h-9"/>
                     </div>
                     <span className="text-xs font-black uppercase tracking-[0.2em]">Nova Meta Estratégica</span>
                  </button>
                )}
             </div>
           </div>
        )}
      </main>

      {isAiOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-12 lg:right-12 lg:w-[480px] lg:h-[840px] bg-black border border-neutral-900 lg:rounded-[3.5rem] flex flex-col z-[500] shadow-[0_40px_100px_rgba(0,0,0,1)] overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
          <div className="p-6 lg:p-10 border-b border-neutral-900 flex justify-between items-center bg-black/95 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full border-2 border-[#d4af37]/50 overflow-hidden bg-neutral-900 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                <img src={NERO_AVATAR} alt="Nero" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="uppercase text-xs lg:text-[14px] font-bold text-[#d4af37] tracking-[0.3em] block">NERO</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-widest">Online</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsAiOpen(false)} className="text-neutral-600 hover:text-white transition-colors bg-neutral-900 p-2 lg:p-3 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6 lg:space-y-8 no-scrollbar" style={{ background: 'radial-gradient(circle at 50% 10%, #d4af37 0%, #000000 80%)', backgroundOpacity: '0.1' }}>
            {messages.length === 0 && (
              <div className="text-center py-20 lg:py-32 space-y-8 lg:space-y-10 animate-in fade-in duration-1000">
                <div className="w-24 lg:w-32 h-24 lg:h-32 mx-auto rounded-full border-4 border-[#d4af37]/20 overflow-hidden bg-neutral-900 shadow-2xl">
                  <img src={NERO_AVATAR} alt="Nero" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs lg:text-sm text-neutral-500 font-normal italic px-4 lg:px-8 opacity-60">"Nero, registre um gasto de R$ 50 com almoço"</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300`}>
                <div className={`max-w-[90%] p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] text-xs lg:text-sm font-normal uppercase ${m.role === 'user' ? 'bg-[#d4af37] text-black shadow-lg' : 'bg-neutral-900 text-white border border-neutral-800 shadow-xl'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isAiLoading && <div className="text-[#d4af37] animate-pulse text-[11px] uppercase font-medium px-4 lg:px-8 flex items-center gap-3"><Loader2 className="animate-spin w-4 h-4"/> Nero está processando...</div>}
          </div>
          <div className="p-6 lg:p-10 border-t border-neutral-900 space-y-6 lg:space-y-8 bg-neutral-950/95 pb-32 lg:pb-16 backdrop-blur-xl">
            <div className="flex gap-3 lg:gap-5 items-center">
              <input type="text" placeholder="Comande o Nero..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiChat(chatInput)} className="flex-1 bg-black border border-neutral-800 p-4 lg:p-6 rounded-[1.5rem] lg:rounded-3xl text-xs lg:text-sm outline-none focus:border-[#d4af37] text-white" />
              <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-4 lg:p-6 rounded-[1.5rem] lg:rounded-3xl transition-all shadow-xl ${isRecording ? 'bg-rose-700 text-white animate-pulse' : 'bg-neutral-900 text-neutral-600'}`}>
                <Mic className="w-6 h-6" />
              </button>
              <button onClick={() => handleAiChat(chatInput)} className="p-4 lg:p-6 bg-[#d4af37] text-black rounded-[1.5rem] lg:rounded-3xl shadow-xl active:scale-90">
                <Send className="w-6 h-6" strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-black/95 backdrop-blur-3xl border-t border-neutral-900 flex items-center justify-around px-4 pb-4 z-[400] shadow-[0_-15px_40px_rgba(0,0,0,0.9)]">
        <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-full transition-all ${activeTab === 'dashboard' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-neutral-700'}`}>
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('finances')} className={`p-3 rounded-full transition-all ${activeTab === 'finances' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-neutral-700'}`}>
          <Wallet className="w-6 h-6" />
        </button>
        <button onClick={() => setIsAiOpen(true)} className={`p-4 rounded-full transition-all border-2 border-[#d4af37]/20 ${isAiOpen ? 'bg-[#d4af37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-neutral-900 text-[#d4af37]'}`}>
          <Bot className="w-7 h-7" />
        </button>
        <button onClick={() => setActiveTab('tasks')} className={`p-3 rounded-full transition-all ${activeTab === 'tasks' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-neutral-700'}`}>
          <CheckSquare className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('goals')} className={`p-3 rounded-full transition-all ${activeTab === 'goals' ? 'bg-[#d4af37] text-black shadow-lg' : 'text-neutral-700'}`}>
          <Flag className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
};