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
  Send,
  History,
  Settings,
  Moon,
  Sun,
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  User,
  Palette,
  Target,
  Trophy,
  Calendar,
  List
} from 'lucide-react';
import { Card } from './components/ui/Card';
import { AnimatedNumber } from './components/ui/AnimatedNumber';
import { RadarScoreChart } from './components/ui/RadarScoreChart';
import { GoalProgressCard } from './components/ui/GoalProgressCard';
import { CategoryExpensesChart } from './components/ui/CategoryExpensesChart';
import { AnimatedChart } from './components/ui/AnimatedChart';
import { 
  Priority, 
  Rank, 
  Transaction, 
  Task, 
  UserStats 
} from './types';
import { CATEGORIES, XP_REQUIREMENTS, RANK_COLORS } from './constants';
import { processAICmd, suggestEmoji, getFinancialForecast } from './services/geminiService';
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

interface HabitTracker {
  id: string;
  name: string;
  completions: Record<string, boolean>; // date string "YYYY-MM-DD" -> status
  xpPerCheck: number;
}

interface ForecastResult {
  projectedBalance: number;
  insight: string;
  trendPoints: number[];
}

const SAFARI_AVATAR = "https://i.postimg.cc/j5q6V0PQ/Chat-GPT-Image-17-de-fev-de-2026-13-54-58-removebg-preview.png"; 
const APP_LOGO = "https://i.postimg.cc/q768GvkD/Chat-GPT-Image-17-de-fev-de-2026-10-45-16-removebg-preview.png";

const CATEGORY_EMOJIS: Record<string, string> = {
  'Moradia': '🏠',
  'Alimentação': '🍔',
  'Transporte': '🚗',
  'Saúde': '💊',
  'Lazer': '🎮',
  'Educação': '📚',
  'Compras pessoais': '🛍️',
  'Assinaturas e serviços': '📺',
  'Impostos e taxas': '💸',
  'Outros': '📦'
};

const DEFAULT_BUDGETS: Record<string, number> = {
  'Moradia': 2500,
  'Alimentação': 1500,
  'Transporte': 250,
  'Saúde': 200,
  'Lazer': 450,
  'Educação': 850,
  'Compras pessoais': 500,
  'Assinaturas e serviços': 125,
  'Impostos e taxas': 1000,
  'Outros': 300
};

const DonteLogo = ({ className = "w-12 h-12", theme = "dark" }: { className?: string; theme?: 'light' | 'dark' }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <div className="relative transform hover:scale-105 transition-transform duration-700 w-full h-full flex items-center justify-center">
      <img 
        src={APP_LOGO} 
        alt="Fante IA Logo" 
        className="w-full h-full object-contain z-10"
        style={{ filter: theme === 'light' ? 'brightness(0)' : 'none' }}
      />
      <Sparkles className="absolute -top-2 -right-2 text-[#fa7f72] w-5 h-5 animate-pulse z-20" />
    </div>
  </div>
);

export const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [stats, setStats] = useState<UserStats>({ xp: 0, rank: Rank.INICIANTE, level: 1, totalRevenue: 0, totalExpenses: 0, balance: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<HabitTracker[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [initialReserve, setInitialReserve] = useState(0); 
  const [tempBalance, setTempBalance] = useState('');

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const habitInputRef = useRef<HTMLInputElement>(null);

  const [newTransDesc, setNewTransDesc] = useState('');
  const [newTransAmount, setNewTransAmount] = useState('');
  const [newTransType, setNewTransType] = useState<'REVENUE' | 'EXPENSE'>('EXPENSE');
  const [newTransCategory, setNewTransCategory] = useState('Outros');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newHabitName, setNewHabitName] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.MEDIUM);

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isAiOpen) scrollToBottom();
  }, [messages, isAiLoading, isAiOpen]);

  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = -4; i <= 4; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      days.push({
        date: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }).split('.')[0].toUpperCase(),
        dayNum: d.getDate(),
        isToday: i === 0
      });
    }
    return days;
  }, []);

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

  const categorySpends = useMemo(() => {
    const spends: Record<string, number> = {};
    currentMonthTransactions.forEach(t => {
      if (t.type === 'EXPENSE') {
        spends[t.category] = (spends[t.category] || 0) + t.amount;
      }
    });
    return spends;
  }, [currentMonthTransactions]);

  const totalEquity = useMemo(() => initialReserve + monthlyStats.balance, [initialReserve, monthlyStats.balance]);

  useEffect(() => {
    const savedName = localStorage.getItem('nexus_user_name');
    const savedStats = localStorage.getItem('nexus_user_stats');
    const savedTasks = localStorage.getItem('nexus_user_tasks');
    const savedTransactions = localStorage.getItem('nexus_user_transactions');
    const savedGoals = localStorage.getItem('nexus_user_goals');
    const savedHabits = localStorage.getItem('nexus_user_habits');
    const savedReserve = localStorage.getItem('nexus_initial_reserve');
    const savedBudgets = localStorage.getItem('nexus_category_budgets');
    const savedTheme = localStorage.getItem('nexus_user_theme') as 'light' | 'dark' | null;

    if (savedReserve) setInitialReserve(Number(savedReserve));
    if (savedTheme) setTheme(savedTheme);
    if (savedBudgets) setCategoryBudgets(JSON.parse(savedBudgets));
    if (savedName) {
      setUserName(savedName);
      setIsOnboarding(false);
      if (savedStats) setStats(JSON.parse(savedStats));
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
      if (savedGoals) setGoals(JSON.parse(savedGoals));
      if (savedHabits) setHabits(JSON.parse(savedHabits));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexus_user_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isOnboarding && isLoaded) {
      localStorage.setItem('nexus_user_name', userName);
      localStorage.setItem('nexus_user_stats', JSON.stringify(stats));
      localStorage.setItem('nexus_user_tasks', JSON.stringify(tasks));
      localStorage.setItem('nexus_user_transactions', JSON.stringify(transactions));
      localStorage.setItem('nexus_user_goals', JSON.stringify(goals));
      localStorage.setItem('nexus_user_habits', JSON.stringify(habits));
      localStorage.setItem('nexus_initial_reserve', initialReserve.toString());
      localStorage.setItem('nexus_category_budgets', JSON.stringify(categoryBudgets));
    }
  }, [stats, tasks, transactions, goals, habits, initialReserve, categoryBudgets, isOnboarding, isLoaded, userName]);

  const triggerFireworks = (color = '#fa7f72') => {
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
    triggerFireworks(newTransType === 'REVENUE' ? '#FFFFFF' : '#fa7f72');
  };

  const handleDeleteTransaction = (id: string) => {
    const trans = transactions.find(t => t.id === id);
    if (!trans) return;
    const adjustment = trans.type === 'REVENUE' ? -trans.amount : trans.amount;
    setTransactions(prev => prev.filter(t => t.id !== id));
    setStats(prev => ({ ...prev, balance: prev.balance + adjustment }));
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const emoji = await suggestEmoji(newTaskTitle);
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskTitle,
      priority: newTaskPriority,
      completed: false,
      xpValue: newTaskPriority === Priority.HIGH ? 100 : newTaskPriority === Priority.MEDIUM ? 50 : 25,
      emoji
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) {
      // Se estiver vazio, foca o input para o usuário digitar
      if (habitInputRef.current) {
        habitInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        habitInputRef.current.focus();
      }
      return;
    }
    const newHabit: HabitTracker = {
      id: Math.random().toString(36).substr(2, 9),
      name: newHabitName.toUpperCase(),
      completions: {},
      xpPerCheck: 35
    };
    setHabits(prev => [newHabit, ...prev]);
    setNewHabitName('');
    triggerFireworks('#FFFFFF');
  };

  const toggleHabitDay = (habitId: string, dateStr: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const isNowCompleted = !h.completions[dateStr];
        if (isNowCompleted) {
          addXP(h.xpPerCheck);
          triggerFireworks('#4ADE80');
        } else {
          addXP(-h.xpPerCheck);
        }
        return {
          ...h,
          completions: {
            ...h.completions,
            [dateStr]: isNowCompleted
          }
        };
      }
      return h;
    }));
  };

  const deleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isNowCompleted = !t.completed;
        if (isNowCompleted) {
          addXP(t.xpValue);
          triggerFireworks('#4ADE80');
        } else {
          addXP(-t.xpValue);
        }
        return { ...t, completed: isNowCompleted };
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addXP = (amount: number) => {
    setStats(prev => {
      let newXp = prev.xp + amount;
      let newLevel = Math.floor(newXp / 1000) + 1;
      let newRank = prev.rank;

      if (newXp >= XP_REQUIREMENTS[Rank.ELITE]) newRank = Rank.ELITE;
      else if (newXp >= XP_REQUIREMENTS[Rank.AVANCADO]) newRank = Rank.AVANCADO;
      else if (newXp >= XP_REQUIREMENTS[Rank.INTERMEDIARIO]) newRank = Rank.INTERMEDIARIO;
      else newRank = Rank.INICIANTE;

      return { ...prev, xp: newXp, level: newLevel, rank: newRank };
    });
  };

  const handleAddGoal = () => {
    if (!newGoalTitle.trim() || !newGoalTarget) return;
    const targetVal = parseCurrencyToNumber(newGoalTarget);
    const newGoal: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      title: newGoalTitle,
      target: targetVal,
      current: 0,
      unit: 'R$',
      completed: false,
      emoji: '🏁'
    };
    setGoals(prev => [newGoal, ...prev]);
    setNewGoalTitle('');
    setNewGoalTarget('');
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleAiChat = async (text: string, audioBase64?: string) => {
    const input = text.trim();
    if (!input && !audioBase64) return;
    
    setIsAiLoading(true);
    if (input) setMessages(prev => [...prev, { role: 'user', text: input }]);
    setChatInput('');

    try {
      const result = await processAICmd(input, audioBase64);
      if (result.functionCalls) {
        result.functionCalls.forEach((call: any) => {
          if (call.name === 'add_transaction') {
            const val = call.args.type === 'REVENUE' ? Number(call.args.amount) : -Number(call.args.amount);
            handleAdjustBalance(val, call.args.description, call.args.category || 'Outros');
            triggerFireworks('#fa7f72');
          }
        });
      }
      setMessages(prev => [...prev, { role: 'ai', text: result.text || "Operação concluída com sucesso." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Desculpe, tive um erro na conexão neural." }]);
    } finally {
      setIsAiLoading(false);
    }
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-500">
        <Card className="w-full max-w-lg bg-[var(--bg-card)] border-[#fa7f72]/20 p-8 sm:p-12 space-y-10 rounded-3xl sm:rounded-[2.5rem] animate-scale-in shadow-2xl">
          <div className="text-center space-y-4">
            <DonteLogo className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-2" theme={theme} />
            <h1 className="text-2xl sm:text-3xl text-chique font-black tracking-widest text-[#fa7f72]">FANTE IA</h1>
            <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-[0.2em]">Configuração de Comando</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest text-center font-black">Estilo Visual</p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button onClick={() => setTheme('light')} className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all ${theme === 'light' ? 'bg-[#fa7f72] border-[#fa7f72] text-black shadow-lg scale-105' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] opacity-60'}`}>
                  <Sun className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Claro</span>
                </button>
                <button onClick={() => setTheme('dark')} className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-[#fa7f72] border-[#fa7f72] text-black shadow-lg scale-105' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] opacity-60'}`}>
                  <Moon className="w-5 h-5" /><span className="text-[9px] font-black uppercase">Escuro</span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
               <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest text-center font-black">NOME DE OPERADOR</p>
               <input type="text" placeholder="Seu Nome" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-transparent border-b-2 border-[var(--border-color)] focus:border-[#fa7f72] p-4 text-xl font-medium text-center outline-none transition-all text-[var(--text-primary)]" />
            </div>
            <div className="space-y-2">
               <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest text-center font-black">RESERVA INICIAL</p>
               <input type="text" placeholder="R$ 0,00" value={tempBalance} onChange={e => setTempBalance(formatAsCurrencyInput(e.target.value))} className="w-full bg-transparent border-b-2 border-[var(--border-color)] focus:border-[#fa7f72] p-4 text-2xl sm:text-3xl font-bold text-center outline-none transition-all text-[var(--text-primary)]" />
            </div>
          </div>

          <button onClick={() => { if (!userName.trim()) return; setInitialReserve(parseCurrencyToNumber(tempBalance)); setIsOnboarding(false); }} className="w-full py-5 bg-[#fa7f72] text-black font-black rounded-full shadow-lg uppercase tracking-wider text-sm transition-all hover:scale-105 active:scale-95">Acessar Sistema</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col lg:flex-row font-sans overflow-hidden transition-colors duration-500">
      <aside className="hidden lg:flex flex-col w-72 border-r border-[var(--border-color)] p-10 bg-[var(--bg-card)] shadow-lg z-50">
        <div className="flex flex-col items-center gap-6 mb-16 animate-fade-up">
          <DonteLogo className="w-24 h-24" theme={theme} />
          <span className="text-lg text-chique font-black text-center mt-2 text-[#fa7f72]">FANTE IA</span>
        </div>
        <nav className="space-y-3 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
            { id: 'finances', icon: Wallet, label: 'Financeiro' },
            { id: 'tasks', icon: CheckSquare, label: 'Tarefas' },
            { id: 'goals', icon: Flag, label: 'Metas' },
            { id: 'settings', icon: Settings, label: 'Ajustes' }
          ].map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl uppercase text-[10px] tracking-[0.25em] font-bold transition-all animate-slide-right ${
                activeTab === item.id ? 'bg-[#fa7f72] text-black shadow-xl scale-105' : 'text-[var(--icon-inactive)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
              }`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
          <button onClick={() => setIsAiOpen(true)} className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl uppercase text-[10px] tracking-[0.25em] font-bold transition-all mt-10 border border-[#fa7f72]/20 hover:scale-105 ${isAiOpen ? 'bg-[#fa7f72] text-black' : 'text-[#fa7f72] hover:bg-[#fa7f72]/10'}`}>
            <Bot className="w-4 h-4" /> Safari IA
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto w-full pb-40 lg:pb-12 overflow-y-auto h-screen no-scrollbar relative">
        {activeTab === 'dashboard' && (
          <div key="tab-dashboard" className="space-y-8 animate-fade-up">
            <header className="flex flex-col items-center text-center space-y-6 sm:space-y-10 mb-6 py-10 sm:py-14 bg-[var(--bg-card)] rounded-3xl sm:rounded-[3rem] border border-[#fa7f72]/10 shadow-[0_0_60px_rgba(250,127,114,0.08)]">
              <div className="relative w-32 h-32 sm:w-48 sm:h-48 group">
                <div className="absolute inset-0 rounded-[2.5rem] border-2 border-[#fa7f72] animate-pulse shadow-[0_0_25px_#fa7f72] opacity-80" />
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden p-1 lg:p-2 bg-[var(--bg-main)] backdrop-blur-sm z-10 relative">
                  <img src={SAFARI_AVATAR} alt="Safari IA" className="w-full h-full object-cover" style={{ filter: theme === 'light' ? 'brightness(0)' : 'none' }} />
                </div>
              </div>
              <div className="space-y-3 sm:space-y-6 flex flex-col items-center">
                <img src={APP_LOGO} alt="Fante IA" className="h-8 sm:h-14 object-contain opacity-90" style={{ filter: theme === 'light' ? 'brightness(0)' : 'brightness(0) invert(1)' }} />
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black tracking-tighter text-[var(--text-primary)] uppercase">BEM-VINDO, {userName}_</h2>
                  <p className="text-[10px] sm:text-[13px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
                </div>
              </div>
              <button onClick={() => setIsAiOpen(true)} className="flex items-center gap-4 px-8 sm:px-12 py-4 sm:py-6 bg-[#fa7f72] text-black font-black uppercase tracking-[0.25em] text-[10px] sm:text-[14px] rounded-full transition-all hover:scale-105 shadow-xl">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" /> FALAR COM SAFARI
              </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
              <Card className="xl:col-span-2 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 stagger-1">
                <div className="flex items-center gap-3 mb-6">
                  <Plus className="w-5 h-5 text-[#fa7f72]" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#fa7f72]">REGISTRO RÁPIDO</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" placeholder="O que você gastou ou entrou?" value={newTransDesc} onChange={e => setNewTransDesc(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none focus:border-[#fa7f72] text-sm text-[var(--text-primary)]" />
                  <input type="text" placeholder="R$ 0,00" value={newTransAmount} onChange={e => setNewTransAmount(formatAsCurrencyInput(e.target.value))} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none focus:border-[#fa7f72] text-sm text-[var(--text-primary)]" />
                  <select value={newTransCategory} onChange={e => setNewTransCategory(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none text-sm text-[var(--text-primary)]">{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                  <div className="flex gap-2">
                    <button onClick={() => setNewTransType('REVENUE')} className={`flex-1 p-3 rounded-2xl font-bold uppercase text-[9px] transition-all ${newTransType === 'REVENUE' ? 'bg-[#fa7f72] text-black' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>Entrada</button>
                    <button onClick={() => setNewTransType('EXPENSE')} className={`flex-1 p-3 rounded-2xl font-bold uppercase text-[9px] transition-all ${newTransType === 'EXPENSE' ? 'bg-white/10 text-[#fa7f72] border border-[#fa7f72]/30' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>Saída</button>
                  </div>
                </div>
                <button onClick={handleAddManualTransaction} className="mt-6 w-full py-4 bg-[#fa7f72] text-black rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:scale-105 transition-transform">Confirmar Registro</button>
              </Card>

              <Card className="rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 stagger-2 h-[350px] flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <History className="w-5 h-5 text-[var(--text-muted)]" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Fluxo Recente</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                   {transactions.length === 0 ? (<p className="text-[10px] text-[var(--text-muted)] uppercase italic font-bold py-4">Nenhum registro.</p>) : (
                     transactions.slice(0, 10).map((t, idx) => (
                       <div key={t.id} className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl">
                         <div className={`p-2 rounded-lg shrink-0 ${t.type === 'REVENUE' ? 'text-[#4ADE80]' : 'text-red-500'}`}>{t.type === 'REVENUE' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}</div>
                         <div className="flex-1 min-w-0">
                           <p className="text-[10px] font-bold text-[var(--text-primary)] uppercase truncate">{t.description}</p>
                           <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-widest font-black">{t.category}</p>
                         </div>
                         <p className={`text-[10px] font-black shrink-0 ${t.type === 'REVENUE' ? 'text-[#4ADE80]' : 'text-[var(--text-primary)]'}`}>R$ {t.amount.toLocaleString('pt-BR')}</p>
                       </div>
                     ))
                   )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'finances' && (
          <div key="tab-finances" className="space-y-8 animate-fade-up">
            <h2 className="text-3xl font-black uppercase text-[#fa7f72] tracking-tighter">Fluxo Financeiro</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              <Card className="p-6 sm:p-8 border-[#4ADE80]/30 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(74, 222, 128, 0.02) 100%)' }}>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Entradas do Mês</p>
                <p className="text-xl sm:text-2xl font-black text-[#4ADE80]">R$ {monthlyStats.revenue.toLocaleString('pt-BR')}</p>
              </Card>
              <Card className="p-6 sm:p-8 border-red-500/30 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.02) 100%)' }}>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Saídas do Mês</p>
                <p className="text-xl sm:text-2xl font-black text-red-500">R$ {monthlyStats.expenses.toLocaleString('pt-BR')}</p>
              </Card>
              <Card className="p-6 sm:p-8 border-[#4ADE80]/30 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(74, 222, 128, 0.03) 100%)' }}>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Saldo em Conta</p>
                <p className="text-xl sm:text-2xl font-black text-[#4ADE80]">R$ {totalEquity.toLocaleString('pt-BR')}</p>
              </Card>
            </div>

            <Card className="rounded-3xl sm:rounded-[2.5rem] bg-[var(--bg-card)] border-[var(--border-color)] p-6 sm:p-10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8">ORÇAMENTO POR CATEGORIA</h3>
              <div className="space-y-6">
                {Object.entries(CATEGORY_EMOJIS).map(([category, emoji]) => {
                  const spent = categorySpends[category] || 0;
                  const target = categoryBudgets[category] || 100;
                  const progress = Math.min((spent / target) * 100, 100);
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <div className="flex items-center gap-2"><span>{emoji}</span><span className="uppercase text-neutral-400">{category}</span></div>
                        <span className="tabular-nums">R$ {spent.toLocaleString('pt-BR')} / {target.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="h-2 w-full bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)]">
                        <div className="h-full bg-[#4ADE80] transition-all duration-1000" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div key="tab-tasks" className="space-y-8 sm:space-y-12 animate-fade-up">
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h2 className="text-3xl sm:text-5xl font-black uppercase text-white tracking-tighter">ROTINA</h2>
                <div className="flex gap-4 w-full md:w-auto">
                   <div className="flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded-xl shrink-0">
                      <button className="p-2 bg-neutral-800 rounded-lg text-white"><List className="w-4 h-4 sm:w-5 sm:h-5"/></button>
                      <button className="p-2 text-neutral-500"><Calendar className="w-4 h-4 sm:w-5 sm:h-5"/></button>
                   </div>
                   <button 
                     onClick={handleAddHabit} 
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white font-black uppercase tracking-widest text-[9px] sm:text-[11px] rounded-xl shadow-lg active:scale-95 transition-transform"
                   >
                      <Plus className="w-4 h-4" /> NOVO HÁBITO
                   </button>
                </div>
              </div>

              <div className="flex justify-between items-center px-1 sm:px-2 py-4 border-y border-neutral-800/50 overflow-x-auto no-scrollbar gap-4 sm:gap-0 snap-x">
                {weekDays.map((day) => (
                  <div key={day.date} className="flex flex-col items-center gap-2 sm:gap-3 shrink-0 snap-center">
                    <span className="text-[8px] sm:text-[9px] font-black text-neutral-500 uppercase tracking-widest">{day.dayName}</span>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-[11px] sm:text-sm font-black transition-all ${day.isToday ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-neutral-400'}`}>
                      {day.dayNum}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <input 
                  ref={habitInputRef}
                  type="text" 
                  placeholder="DIGITE O NOME DO HÁBITO + ENTER..." 
                  value={newHabitName} 
                  onChange={e => setNewHabitName(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleAddHabit()} 
                  className="w-full bg-transparent border-b border-neutral-800 py-4 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] outline-none focus:border-red-600 text-white transition-colors" 
                />
                <div className="space-y-4">
                  {habits.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-neutral-800 rounded-3xl">
                       <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Nenhuma rotina ativa</p>
                    </div>
                  ) : (
                    habits.map(habit => (
                      <div key={habit.id} className="p-5 sm:p-6 bg-neutral-900/40 border border-neutral-800/40 rounded-3xl space-y-4 group">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] sm:text-xs font-black uppercase text-white tracking-[0.2em]">{habit.name}</h4>
                          <button onClick={() => deleteHabit(habit.id)} className="p-2 text-neutral-600 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        <div className="overflow-x-auto no-scrollbar pb-2 snap-x">
                          <div className="flex justify-between items-center min-w-[360px] sm:min-w-0">
                            {weekDays.map(day => {
                              const isDone = habit.completions[day.date];
                              return (
                                <button 
                                  key={day.date} 
                                  onClick={() => toggleHabitDay(habit.id, day.date)} 
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isDone ? 'bg-green-600 text-black shadow-[0_0_10px_rgba(22,163,74,0.3)]' : 'bg-neutral-800/50 hover:bg-neutral-800'}`}
                                >
                                  {isDone ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[4px]" /> : <div className="w-3 h-3 rounded bg-neutral-900/50" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div key="tab-goals" className="space-y-8 animate-fade-up">
            <h2 className="text-3xl font-black uppercase text-[#fa7f72] tracking-tighter">Visão de Futuro</h2>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 sm:gap-8">
              <Card className="rounded-3xl p-6 sm:p-8">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6">Nova Meta</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Ex: Viagem, Carro..." value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none text-xs font-bold uppercase text-white" />
                  <input type="text" placeholder="Valor Alvo R$ 0,00" value={newGoalTarget} onChange={e => setNewGoalTarget(formatAsCurrencyInput(e.target.value))} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none text-xs font-bold tabular-nums text-white" />
                  <button onClick={handleAddGoal} className="w-full py-4 bg-[#fa7f72] text-black rounded-2xl font-black uppercase text-[10px] hover:scale-105 transition-all">Adicionar Meta</button>
                </div>
              </Card>
              <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {goals.map(goal => {
                  const progress = Math.min((goal.current / goal.target) * 100, 100);
                  return (
                    <Card key={goal.id} className="p-6 sm:p-8 rounded-3xl group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-[#fa7f72]/10 rounded-xl text-lg">{goal.emoji}</div>
                          <div><p className="text-[11px] sm:text-xs font-black uppercase">{goal.title}</p><p className="text-[8px] sm:text-[9px] font-bold text-neutral-500 uppercase mt-1">Faltam R$ {(goal.target - goal.current).toLocaleString('pt-BR')}</p></div>
                        </div>
                        <button onClick={() => deleteGoal(goal.id)} className="text-neutral-700 hover:text-red-500 transition-all"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="h-2 w-full bg-[var(--bg-main)] rounded-full overflow-hidden p-0.5 border border-[var(--border-color)]">
                         <div className="h-full bg-[#fa7f72] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-fade-up max-w-2xl mx-auto">
            <h2 className="text-3xl font-black uppercase text-[#fa7f72] tracking-tighter">Ajustes</h2>
            <Card className="p-8 sm:p-10 rounded-3xl sm:rounded-[3rem] text-center space-y-6">
              <DonteLogo className="mx-auto w-20 h-20" theme={theme} />
              <div><h3 className="text-xl font-black text-white">FANTE IA</h3><p className="text-[10px] text-neutral-500 font-black tracking-widest uppercase">Ecosystem v2.6.5</p></div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setTheme('light')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 ${theme === 'light' ? 'bg-[#fa7f72] border-[#fa7f72] text-black shadow-lg' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}><Sun className="w-5 h-5"/><span className="text-[9px] font-black uppercase">Claro</span></button>
                <button onClick={() => setTheme('dark')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 ${theme === 'dark' ? 'bg-[#fa7f72] border-[#fa7f72] text-black shadow-lg' : 'bg-neutral-900 border-neutral-800 text-neutral-500'}`}><Moon className="w-5 h-5"/><span className="text-[9px] font-black uppercase">Escuro</span></button>
              </div>
            </Card>
          </div>
        )}
      </main>

      {isAiOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-12 lg:right-12 lg:w-[450px] lg:h-[750px] bg-[var(--bg-main)] lg:border lg:border-[var(--border-color)] lg:rounded-[3rem] flex flex-col z-[1000] shadow-2xl overflow-hidden animate-scale-in">
          <div className="p-6 sm:p-8 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-card)]/90 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl border-2 border-[#fa7f72]/30 overflow-hidden bg-black"><img src={SAFARI_AVATAR} alt="Safari IA" className="w-full h-full object-cover" /></div>
              <div><span className="uppercase text-xs font-bold text-[#fa7f72] tracking-widest block">SAFARI IA</span><span className="text-[8px] text-[#4ADE80] uppercase font-bold tracking-widest flex items-center gap-1"><div className="w-1 h-1 bg-[#4ADE80] rounded-full animate-pulse"/>Ativa</span></div>
            </div>
            <button onClick={() => setIsAiOpen(false)} className="text-neutral-500 hover:text-white p-2"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] sm:text-xs font-bold uppercase shadow-sm ${m.role === 'user' ? 'bg-[#fa7f72] text-black' : 'bg-[var(--bg-card)] text-white border border-[var(--border-color)]'}`}>{m.text}</div>
              </div>
            ))}
            {isAiLoading && <div className="text-[#fa7f72] animate-pulse text-[9px] uppercase font-black tracking-widest px-4">Safari IA processando...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-6 bg-[var(--bg-card)]/90 backdrop-blur-xl pb-32 sm:pb-8">
            <div className="flex gap-2 items-center">
              <input type="text" placeholder="COMANDO..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiChat(chatInput)} className="flex-1 bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl text-[11px] text-white outline-none focus:border-[#fa7f72]" />
              <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-4 rounded-2xl ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-neutral-800 text-[#fa7f72]'}`}><Mic className="w-5 h-5"/></button>
              <button onClick={() => handleAiChat(chatInput)} className="p-4 bg-[#fa7f72] text-black rounded-2xl shadow-lg"><Send className="w-5 h-5"/></button>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-24 bg-[var(--bg-card)]/95 backdrop-blur-3xl border-t border-[var(--border-color)] flex items-center justify-around px-2 pb-6 z-[600] shadow-2xl">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
          { id: 'finances', icon: Wallet, label: 'Grana' },
        ].map(btn => (
          <button key={btn.id} onClick={() => setActiveTab(btn.id)} className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === btn.id ? 'text-[#fa7f72] scale-110' : 'text-neutral-500'}`}>
            <btn.icon className="w-5 h-5" /><span className="text-[8px] uppercase font-black tracking-widest">{btn.label}</span>
          </button>
        ))}
        <button onClick={() => setIsAiOpen(true)} className="flex flex-col items-center gap-1 p-3 rounded-2xl border-2 border-[#fa7f72]/20 -translate-y-5 bg-[var(--bg-main)] text-[#fa7f72] active:scale-90 transition-transform shadow-2xl"><Bot className="w-6 h-6 animate-pulse" /><span className="text-[9px] font-black uppercase">Safari</span></button>
        {[
          { id: 'tasks', icon: CheckSquare, label: 'Foco' },
          { id: 'settings', icon: Settings, label: 'Setup' }
        ].map(btn => (
          <button key={btn.id} onClick={() => setActiveTab(btn.id)} className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === btn.id ? 'text-[#fa7f72] scale-110' : 'text-neutral-500'}`}>
            <btn.icon className="w-5 h-5" /><span className="text-[8px] uppercase font-black tracking-widest">{btn.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};