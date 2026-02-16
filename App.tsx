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
  TrendingUp
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
        alt="Fante IA Logo" 
        className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(204,90,90,0.3)]"
      />
      <Sparkles className="absolute -top-1 -right-1 text-[#CC5A5A] w-5 h-5 animate-pulse" />
    </div>
  </div>
);

export const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
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
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isAiOpen) scrollToBottom();
  }, [messages, isAiLoading, isAiOpen]);

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

  const equityHistoryPoints = useMemo(() => {
    if (transactions.length === 0) return [initialReserve, initialReserve];
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentVal = initialReserve;
    const points = [initialReserve];
    sorted.forEach(t => {
      const val = t.type === 'REVENUE' ? t.amount : -t.amount;
      currentVal += val;
      points.push(currentVal);
    });
    return points.slice(-12);
  }, [transactions, initialReserve]);

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
    const savedTheme = localStorage.getItem('nexus_user_theme') as 'light' | 'dark' | null;

    if (savedReserve) setInitialReserve(Number(savedReserve));
    if (savedTheme) setTheme(savedTheme);
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

  const triggerFireworks = (color = '#CC5A5A') => {
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
    triggerFireworks(newTransType === 'REVENUE' ? '#4A9F6E' : '#CC5A5A');
  };

  const handleUpdateTotalBalance = () => {
    const newVal = parseCurrencyToNumber(tempBalance);
    if (!isNaN(newVal)) {
      setInitialReserve(newVal - monthlyStats.balance);
      triggerFireworks('#CC5A5A');
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
    const title = newTaskTitle.trim();
    if (!title) return;
    
    const tempId = Date.now().toString();
    const newTask: Task = {
      id: tempId,
      title: title,
      priority: Priority.MEDIUM,
      completed: false,
      xpValue: 20,
      emoji: '⏳'
    };
    
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    triggerFireworks();

    suggestEmoji(title).then(emoji => {
      setTasks(prev => prev.map(t => t.id === tempId ? { ...t, emoji } : t));
    });
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
    triggerFireworks('#CC5A5A');
  };

  const handleUpdateGoal = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const newCurrent = g.current + amount;
        const isCompleted = newCurrent >= g.target;
        if (isCompleted && !g.completed) {
          setStats(s => ({ ...s, xp: s.xp + 100 }));
          triggerFireworks('#CC5A5A');
        }
        return { ...g, current: newCurrent, completed: isCompleted };
      }
      return g;
    }));
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
            triggerFireworks(call.args.type === 'REVENUE' ? '#4A9F6E' : '#CC5A5A');
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
        <Card className="w-full max-w-lg bg-[var(--bg-card)] border-[var(--border-color)] p-8 sm:p-12 space-y-10 rounded-[2.5rem] animate-scale-in shadow-2xl">
          <div className="text-center space-y-4">
            <DonteLogo className="w-32 h-32 mx-auto mb-2" />
            <h1 className="text-3xl text-chique font-black tracking-widest text-[#CC5A5A]">FANTE IA</h1>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-[0.2em]">Configuração Inicial de Comando</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
               <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest text-center font-black">Escolha seu Ambiente Visual</p>
               <div className="grid grid-cols-2 gap-4">
                 <button 
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all ${theme === 'light' ? 'border-[#CC5A5A] bg-[#CC5A5A]/5 scale-105' : 'border-[var(--border-color)] hover:border-[#CC5A5A]/30'}`}
                 >
                   <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-[#CC5A5A]' : 'text-[var(--icon-inactive)]'}`} />
                   <span className="text-[10px] font-black uppercase">Modo Claro</span>
                 </button>
                 <button 
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-3xl border-2 transition-all ${theme === 'dark' ? 'border-[#CC5A5A] bg-[#CC5A5A]/5 scale-105' : 'border-[var(--border-color)] hover:border-[#CC5A5A]/30'}`}
                 >
                   <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-[#CC5A5A]' : 'text-[var(--icon-inactive)]'}`} />
                   <span className="text-[10px] font-black uppercase">Modo Escuro</span>
                 </button>
               </div>
            </div>

            <div className="space-y-4">
               <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest text-center font-black">INFORME SEU PRIMEIRO NOME</p>
               <input 
                 type="text" 
                 placeholder="Seu Nome" 
                 value={userName} 
                 onChange={e => setUserName(e.target.value)}
                 className="w-full bg-[var(--bg-main)] border-b-2 border-[var(--border-color)] focus:border-[#CC5A5A] p-4 text-xl font-medium text-center outline-none transition-all focus:scale-105 text-[var(--text-primary)]"
               />
            </div>

            <div className="space-y-4">
               <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest text-center font-black">Quanto você tem na sua conta?</p>
               <input 
                 type="text" 
                 placeholder="R$ 0,00" 
                 value={tempBalance}
                 onChange={e => setTempBalance(formatAsCurrencyInput(e.target.value))}
                 className="w-full bg-[var(--bg-main)] border-b-2 border-[var(--border-color)] focus:border-[#CC5A5A] p-4 text-3xl font-bold text-center outline-none transition-all focus:scale-105 text-[var(--text-primary)]"
               />
            </div>
          </div>

          <button 
            onClick={() => { 
              if (!userName.trim()) return; 
              setInitialReserve(parseCurrencyToNumber(tempBalance));
              setIsOnboarding(false); 
            }}
            className="btn-modern w-full py-6 font-bold rounded-full shadow-lg uppercase tracking-wider text-sm"
          >
            Iniciar Operação
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col lg:flex-row font-sans overflow-hidden transition-colors duration-500">
      <aside className="hidden lg:flex flex-col w-72 border-r border-[var(--border-color)] p-10 bg-[var(--bg-card)] shadow-lg z-50">
        <div className="flex flex-col items-center gap-6 mb-16 animate-fade-up">
          <DonteLogo className="w-24 h-24" />
          <span className="text-lg text-chique font-black text-center mt-2 text-[#CC5A5A]">FANTE IA</span>
        </div>
        <nav className="space-y-3 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
            { id: 'finances', icon: Wallet, label: 'Finanças' },
            { id: 'tasks', icon: CheckSquare, label: 'Tarefas' },
            { id: 'goals', icon: Flag, label: 'Metas' },
            { id: 'settings', icon: Settings, label: 'Ajustes' }
          ].map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl uppercase text-[10px] tracking-[0.25em] font-bold transition-all animate-slide-right ${
                activeTab === item.id ? 'bg-[#CC5A5A] text-white shadow-xl scale-105' : 'text-[var(--icon-inactive)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
              }`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
          <button 
            onClick={() => setIsAiOpen(true)} 
            className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl uppercase text-[10px] tracking-[0.25em] font-bold transition-all mt-10 border border-[#CC5A5A]/20 hover:scale-105 ${isAiOpen ? 'bg-[#CC5A5A] text-white' : 'text-[#CC5A5A] hover:bg-[#CC5A5A]/10'}`}
          >
            <Bot className="w-4 h-4" /> Nero
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto w-full pb-32 lg:pb-12 overflow-y-auto h-screen no-scrollbar relative">
        {activeTab === 'dashboard' && (
          <div key="tab-dashboard" className="space-y-8 lg:space-y-12 animate-fade-up">
            <header className="flex flex-col sm:flex-row justify-between items-start gap-6 sm:gap-8">
              <div className="space-y-2 lg:space-y-4">
                <h2 className="text-3xl lg:text-6xl font-bold tracking-tight">Olá, <span className="text-[#CC5A5A] uppercase animate-pulse">{userName}</span></h2>
                <p className="text-sm lg:text-lg text-[var(--text-secondary)] uppercase tracking-[0.2em] font-black border-l-4 border-[#CC5A5A] pl-5 py-1">
                  {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
                </p>
              </div>
              <button onClick={() => setIsAiOpen(true)} className="btn-modern p-5 lg:p-6 rounded-full font-bold shadow-xl">
                <Bot className="w-6 h-6" />
              </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
              <Card className="xl:col-span-2 bg-[var(--bg-card)] border-[var(--border-color)] rounded-[2.5rem] p-8 lg:p-10 shadow-sm flex flex-col justify-center card-hover animate-fade-up stagger-1">
                <div className="flex items-center gap-3 mb-6">
                  <Plus className="w-5 h-5 text-[#CC5A5A] animate-bounce" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#CC5A5A]">REGISTRO DE ENTRADAS E SAÍDAS</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input 
                    type="text" 
                    placeholder="GASTO OU ENTRADA... EX: PIZZA, JANTA" 
                    value={newTransDesc} 
                    onChange={e => setNewTransDesc(e.target.value)} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none focus:border-[#CC5A5A] text-sm transition-all focus:scale-105 text-[var(--text-primary)]" 
                  />
                  <input 
                    type="text" 
                    placeholder="R$ 0,00" 
                    value={newTransAmount} 
                    onChange={e => setNewTransAmount(formatAsCurrencyInput(e.target.value))} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none focus:border-[#CC5A5A] text-sm transition-all focus:scale-105 text-[var(--text-primary)]" 
                  />
                  <select 
                    value={newTransCategory} 
                    onChange={e => setNewTransCategory(e.target.value)} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none focus:border-[#CC5A5A] text-sm appearance-none cursor-pointer text-[var(--text-primary)] font-medium"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setNewTransType('REVENUE')} 
                      className={`flex-1 p-3 rounded-2xl font-bold uppercase text-[9px] transition-all transform active:scale-95 ${newTransType === 'REVENUE' ? 'bg-[#4A9F6E] text-white shadow-md' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[#4A9F6E]/50'}`}
                    >
                      Entrada
                    </button>
                    <button 
                      onClick={() => setNewTransType('EXPENSE')} 
                      className={`flex-1 p-3 rounded-2xl font-bold uppercase text-[9px] transition-all transform active:scale-95 ${newTransType === 'EXPENSE' ? 'bg-[#CC5A5A] text-white shadow-md' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[#CC5A5A]/50'}`}
                    >
                      Saída
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleAddManualTransaction} 
                  className="btn-modern mt-6 w-full py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px]"
                >
                  Registrar Fluxo
                </button>
              </Card>

              <Card className="bg-[var(--bg-card)] border-[var(--border-color)] rounded-[2.5rem] p-8 lg:p-10 shadow-sm flex flex-col max-h-[320px] card-hover animate-fade-up stagger-2">
                <div className="flex items-center gap-3 mb-6">
                  <History className="w-5 h-5 text-[var(--icon-inactive)]" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Fluxo Recente</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                   {transactions.length === 0 ? (
                     <p className="text-[10px] text-[var(--text-secondary)] uppercase italic py-4 font-bold">Nenhum registro ainda.</p>
                   ) : (
                     transactions.slice(0, 5).map((t, idx) => (
                       <div 
                         key={t.id} 
                         className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl animate-fade-up"
                         style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                         <div className={`p-2 rounded-lg ${t.type === 'REVENUE' ? 'bg-[#4A9F6E]/10 text-[#4A9F6E]' : 'bg-[#CC5A5A]/10 text-[#CC5A5A]'}`}>
                           {t.type === 'REVENUE' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-[10px] font-bold text-[var(--text-primary)] uppercase truncate">{t.description}</p>
                           <p className="text-[8px] text-[var(--text-secondary)] uppercase tracking-widest font-black">{t.category}</p>
                         </div>
                         <p className={`text-[10px] font-black ${t.type === 'REVENUE' ? 'text-[#4A9F6E]' : 'text-[#CC5A5A]'}`}>
                           {t.type === 'REVENUE' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                         </p>
                       </div>
                     ))
                   )}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
              <Card className="relative overflow-hidden p-8 lg:p-12 bg-[var(--bg-card)] border-[var(--border-color)] shadow-sm group rounded-[2.5rem] card-hover animate-fade-up stagger-3 min-h-[300px] flex flex-col">
                <Wallet className="absolute -right-8 -top-8 text-[#CC5A5A] opacity-10 rotate-12 w-24 h-24 lg:w-32 lg:h-32 group-hover:rotate-45 transition-transform duration-700" />
                <h4 className="text-base lg:text-lg text-[#CC5A5A] uppercase tracking-[0.25em] mb-4 lg:mb-6 font-black">Balanço Patrimonial Total</h4>
                <div className="flex items-center gap-5 mb-8">
                   {isEditingBalance ? (
                     <div className="flex items-center gap-2 animate-scale-in">
                       <input 
                         type="text" 
                         value={tempBalance}
                         onChange={e => setTempBalance(formatAsCurrencyInput(e.target.value))}
                         className="bg-[var(--bg-main)] border-b-2 border-[#CC5A5A] text-2xl lg:text-3xl font-semibold w-48 lg:w-56 outline-none text-[var(--text-primary)]"
                         autoFocus
                         onKeyDown={e => e.key === 'Enter' && handleUpdateTotalBalance()}
                       />
                       <button onClick={handleUpdateTotalBalance} className="p-3 bg-[#CC5A5A] text-white rounded-full hover:scale-110 transition-transform shadow-md">
                         <Save className="w-4 h-4"/>
                       </button>
                     </div>
                   ) : (
                     <>
                       <div className="text-3xl lg:text-5xl font-bold tracking-tighter text-[var(--text-primary)]">R$ <AnimatedNumber value={totalEquity} /></div>
                       <button onClick={() => { setTempBalance(totalEquity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })); setIsEditingBalance(true); }} className="p-3 lg:p-4 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-full hover:text-[#CC5A5A] transition-all hover:scale-110 shadow-sm text-[var(--text-primary)]">
                         <Pencil className="w-4 h-4" />
                       </button>
                     </>
                   )}
                </div>

                <div className="mt-auto pt-4 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3 h-3 text-[#CC5A5A]" />
                    <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Fluxo Histórico Recente</span>
                  </div>
                  <div className="h-24">
                    <AnimatedChart data={equityHistoryPoints} color="#CC5A5A" height={90} />
                  </div>
                </div>
              </Card>

              <Card className="p-8 lg:p-12 bg-[var(--bg-card)] border-[var(--border-color)] shadow-sm rounded-[2.5rem] card-hover animate-fade-up stagger-4">
                <h4 className="text-base lg:text-lg text-[#CC5A5A] uppercase tracking-[0.25em] mb-4 lg:mb-6 font-black">Performance Nero</h4>
                <div className="text-3xl lg:text-5xl font-bold text-[var(--text-primary)]">{stats.xp} <span className="text-sm font-normal text-[var(--text-secondary)] font-black">XP</span></div>
                <div className="mt-6 lg:mt-8 h-2 bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)]">
                  <div className="h-full bg-gradient-to-r from-[#B84C4C] to-[#CC5A5A] transition-all duration-1000 shadow-sm" style={{ width: `${(stats.xp % 2000) / 20}%` }} />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-10">
              <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 flex flex-col shadow-sm card-hover animate-fade-up stagger-5">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-primary)] mb-6 lg:mb-10 border-b border-[var(--border-color)] pb-4 lg:pb-6">Diretrizes do Dia</h3>
                <div className="space-y-6 lg:space-y-8 flex-1">
                  {tasks.length === 0 ? (
                    <p className="text-xs text-[var(--text-secondary)] uppercase italic font-bold">Nenhuma diretriz pendente.</p>
                  ) : (
                    tasks.slice(0, 4).map((task, idx) => (
                      <div 
                        key={task.id} 
                        onClick={() => toggleTask(task.id)} 
                        className="flex items-center gap-6 lg:gap-8 group cursor-pointer transition-all animate-fade-up"
                        style={{ animationDelay: `${idx * 0.15}s` }}
                      >
                        <div className={`w-6 h-6 lg:w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${task.completed ? 'bg-[#4A9F6E] border-[#4A9F6E] scale-110' : 'border-[var(--border-color)] group-hover:border-[#CC5A5A] hover:scale-110'}`}>
                          {task.completed && <Check className="w-4 h-4 text-white animate-scale-in" strokeWidth={3} />}
                        </div>
                        <span className={`text-lg lg:text-xl font-bold tracking-tight transition-all uppercase ${task.completed ? 'text-[var(--text-secondary)] line-through opacity-50' : 'text-[var(--text-primary)] group-hover:text-[#CC5A5A]'}`}>
                          {task.emoji && <span className="mr-3">{task.emoji}</span>}
                          {task.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 flex flex-col items-center justify-center relative shadow-sm overflow-hidden min-h-[350px] animate-scale-in stagger-5">
                <RadarScoreChart data={[
                  { label: 'Foco', value: totalCount > 0 ? (completedCount / totalCount) * 100 : 0, color: '#CC5A5A' },
                  { label: 'Fluxo', value: Math.min(100, (totalEquity / 10000) * 100), color: '#CC5A5A' },
                  { label: 'Ação', value: Math.min(100, (stats.xp / 5000) * 100), color: '#CC5A5A' },
                  { label: 'Metas', value: goals.length > 0 ? (completedGoalsCount / goals.length) * 100 : 0, color: '#CC5A5A' },
                  { label: 'Nero', value: 85, color: '#CC5A5A' }
                ]} size={320} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finances' && (
          <div key="tab-finances" className="space-y-8 lg:space-y-12 pb-24 animate-fade-up">
            <header className="flex flex-col items-center gap-6 lg:gap-10">
              <div className="flex items-center gap-6 lg:gap-10">
                <button onClick={() => changeMonth(-1)} className="p-3 lg:p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-main)] transition-colors transform active:scale-90 shadow-sm text-[#CC5A5A]">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-widest text-[var(--text-primary)]">{currentMonthName}</h2>
                <button onClick={() => changeMonth(1)} className="p-3 lg:p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-main)] transition-colors transform active:scale-90 shadow-sm text-[#CC5A5A]">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
               <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 shadow-sm card-hover animate-scale-in">
                 <CategoryExpensesChart transactions={currentMonthTransactions} />
               </div>
               <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 shadow-sm h-[450px] lg:h-[500px] flex flex-col card-hover animate-scale-in stagger-1">
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-primary)] mb-6 lg:mb-8 border-b border-[var(--border-color)] pb-4">Histórico Mensal</h3>
                 <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                   {currentMonthTransactions.length === 0 ? (
                     <p className="text-[10px] text-[var(--text-secondary)] uppercase italic py-8 font-black">Sem lançamentos este mês.</p>
                   ) : (
                     currentMonthTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t, idx) => (
                       <div key={t.id} className="flex items-center justify-between p-4 lg:p-5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl group transition-all animate-fade-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                         <div className="flex items-center gap-4">
                           <div className={`p-2 lg:p-3 rounded-xl transition-transform group-hover:scale-110 ${t.type === 'REVENUE' ? 'bg-[#4A9F6E]/10 text-[#4A9F6E]' : 'bg-[#CC5A5A]/10 text-[#CC5A5A]'}`}>
                             {t.type === 'REVENUE' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                           </div>
                           <div>
                             <p className="text-xs lg:text-sm font-bold text-[var(--text-primary)] uppercase group-hover:text-[#CC5A5A] transition-colors">{t.description}</p>
                             <p className="text-[8px] lg:text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-black">{t.category} • {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                           </div>
                         </div>
                         <p className={`text-xs lg:text-sm font-black transition-all group-hover:scale-105 ${t.type === 'REVENUE' ? 'text-[#4A9F6E]' : 'text-[#CC5A5A]'}`}>R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       </div>
                     ))
                   )}
                 </div>
               </Card>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div key="tab-tasks" className="space-y-8 lg:space-y-12 pb-24 animate-fade-up">
             <header><h2 className="text-3xl lg:text-4xl font-bold tracking-tight uppercase text-[#CC5A5A]">Tarefas diárias</h2></header>
            <Card className="rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 bg-[var(--bg-card)] border-[var(--border-color)] shadow-sm card-hover">
              <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 mb-8 lg:mb-12">
                <input type="text" placeholder="Defina sua nova Tarefa..." className="flex-1 bg-[var(--bg-main)] border-b-2 border-[var(--border-color)] p-4 lg:p-6 text-lg lg:text-xl outline-none focus:border-[#CC5A5A] text-[var(--text-primary)] transition-all focus:pl-10 font-medium" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTask()} />
                <button onClick={handleAddTask} className="btn-modern p-4 lg:p-6 rounded-3xl self-end sm:self-auto hover:scale-105 active:scale-95 transition-transform shadow-lg">
                  <Plus className="w-8 h-8" />
                </button>
              </div>
              <div className="space-y-4 lg:space-y-6">
                {tasks.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] uppercase italic py-8 text-center border border-dashed border-[var(--border-color)] rounded-2xl font-black">Sua lista de tarefas está vazia.</p>
                ) : (
                  tasks.map((task, idx) => (
                    <div key={task.id} onClick={() => toggleTask(task.id)} className={`p-6 lg:p-8 border rounded-[2rem] flex items-center gap-6 lg:gap-8 cursor-pointer transition-all animate-fade-up ${task.completed ? 'opacity-40 scale-95' : 'border-[var(--border-color)] hover:border-[#CC5A5A]/40 bg-[var(--bg-card)] hover:scale-[1.02] shadow-sm'}`} style={{ animationDelay: `${idx * 0.1}s` }}>
                      <div className={`w-6 h-6 lg:w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${task.completed ? 'bg-[#4A9F6E] border-[#4A9F6E] rotate-[360deg]' : 'border-[var(--border-color)] group-hover:border-[#CC5A5A]'}`}>
                        {task.completed && <Check className="w-4 h-4 text-white animate-scale-in" strokeWidth={3} />}
                      </div>
                      <span className={`text-lg lg:text-xl uppercase flex-1 transition-all font-bold ${task.completed ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                        {task.emoji && <span className="mr-3">{task.emoji}</span>}{task.title}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); setTasks(prev => prev.filter(t => t.id !== task.id)); }} className="text-[var(--text-secondary)] hover:text-[#CC5A5A] transition-all transform hover:scale-125">
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
           <div key="tab-goals" className="space-y-8 lg:space-y-12 pb-24 animate-fade-up">
             <header><h2 className="text-3xl lg:text-4xl font-bold tracking-tight uppercase text-[#CC5A5A]">Metas</h2></header>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-10 shadow-sm card-hover animate-scale-in">
                  <GoalProgressCard activeCount={activeGoalsCount} completedCount={completedCount} />
                </div>
                
                {goals.map((goal, idx) => (
                  <Card key={goal.id} className="relative p-8 lg:p-10 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] lg:rounded-[3rem] group shadow-sm card-hover animate-fade-up" style={{ animationDelay: `${idx * 0.15}s` }}>
                    <h4 className="text-lg lg:text-xl font-black uppercase mb-2 text-[var(--text-primary)] group-hover:text-[#CC5A5A] transition-colors">{goal.emoji && <span className="mr-2">{goal.emoji}</span>}{goal.title}</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase mb-6 lg:mb-8 tracking-widest">Meta: {goal.target.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <div className="h-3 bg-[var(--bg-main)] rounded-full overflow-hidden mb-6 lg:mb-8 border border-[var(--border-color)]">
                      <div className="h-full bg-gradient-to-r from-[#B84C4C] to-[#CC5A5A] transition-all duration-1000 shadow-sm" style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }} />
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => {
                         const val = prompt("Qual o valor a adicionar?");
                         if (val) handleUpdateGoal(goal.id, parseFloat(val));
                       }} className="flex-1 py-3 lg:py-4 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-2xl font-black uppercase text-[10px] border border-[var(--border-color)] hover:bg-opacity-50 transition-all active:scale-95 shadow-sm">+ Adicionar</button>
                    </div>
                    <button onClick={() => setGoals(prev => prev.filter(g => g.id !== goal.id))} className="absolute top-6 right-6 p-2 text-[var(--text-secondary)] hover:text-[#CC5A5A] opacity-0 group-hover:opacity-100 transition-all transform hover:scale-125">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Card>
                ))}

                {isAddingGoal ? (
                  <Card className="p-8 lg:p-10 bg-[var(--bg-main)] border-[#CC5A5A]/40 border-2 rounded-[2.5rem] lg:rounded-[3rem] shadow-xl animate-scale-in">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#CC5A5A] animate-pulse">Nova Meta</h4>
                      <input 
                        type="text" 
                        placeholder="Título da Meta" 
                        value={newGoalTitle} 
                        onChange={e => setNewGoalTitle(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl text-[var(--text-primary)] outline-none focus:border-[#CC5A5A] transition-all font-bold"
                        autoFocus
                      />
                      <input 
                        type="text" 
                        placeholder="Valor Alvo (R$)" 
                        value={newGoalTarget} 
                        onChange={e => setNewGoalTarget(formatAsCurrencyInput(e.target.value))}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl text-[var(--text-primary)] outline-none focus:border-[#CC5A5A] transition-all font-bold"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setIsAddingGoal(false)} className="flex-1 py-4 bg-[var(--bg-card)] text-[var(--text-secondary)] rounded-xl font-black uppercase text-[10px] hover:bg-opacity-80 transition-colors border border-[var(--border-color)]">Cancelar</button>
                        <button onClick={handleCreateGoal} className="flex-1 py-4 btn-modern rounded-xl font-black uppercase text-[10px] hover:scale-105 transition-transform active:scale-95">Criar</button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <button 
                    onClick={() => setIsAddingGoal(true)} 
                    className="border-2 border-dashed border-[var(--border-color)] rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-10 flex flex-col items-center justify-center gap-4 text-[var(--text-secondary)] hover:text-[#CC5A5A] hover:border-[#CC5A5A]/60 transition-all min-h-[250px] bg-[var(--bg-card)]/50 group animate-fade-up stagger-3"
                  >
                     <div className="p-4 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] group-hover:border-[#CC5A5A] group-hover:bg-[#CC5A5A]/10 transition-all group-hover:scale-110 shadow-sm">
                       <Plus className="w-9 h-9" />
                     </div>
                     <span className="text-xs font-black uppercase tracking-[0.2em]">Nova Meta Estratégica</span>
                  </button>
                )}
             </div>
           </div>
        )}

        {activeTab === 'settings' && (
          <div key="tab-settings" className="space-y-8 lg:space-y-12 pb-24 animate-fade-up">
            <header><h2 className="text-3xl lg:text-4xl font-bold tracking-tight uppercase text-[#CC5A5A]">Ajustes do Sistema</h2></header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
              <Card className="bg-[var(--bg-card)] border-[var(--border-color)] rounded-[2.5rem] p-8 lg:p-10 shadow-sm animate-fade-up stagger-1">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-[#CC5A5A]/10 rounded-2xl">
                    {theme === 'light' ? <Sun className="text-[#CC5A5A]" /> : <Moon className="text-[#CC5A5A]" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">Personalização</h3>
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-tight">Alterne a estética do Nero</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${theme === 'light' ? 'border-[#CC5A5A] bg-[#CC5A5A]/5' : 'border-[var(--border-color)] hover:border-[#CC5A5A]/30'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Sun className="w-5 h-5" />
                      <span className="text-xs font-black uppercase">Modo Claro</span>
                    </div>
                    {theme === 'light' && <Check className="w-4 h-4 text-[#CC5A5A]" />}
                  </button>

                  <button 
                    onClick={() => setTheme('dark')}
                    className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${theme === 'dark' ? 'border-[#CC5A5A] bg-[#CC5A5A]/5' : 'border-[var(--border-color)] hover:border-[#CC5A5A]/30'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Moon className="w-5 h-5" />
                      <span className="text-xs font-black uppercase">Modo Escuro</span>
                    </div>
                    {theme === 'dark' && <Check className="w-4 h-4 text-[#CC5A5A]" />}
                  </button>
                </div>
              </Card>

              <Card className="bg-[var(--bg-card)] border-[var(--border-color)] rounded-[2.5rem] p-8 lg:p-10 shadow-sm animate-fade-up stagger-2 flex flex-col items-center justify-center text-center">
                <DonteLogo className="w-20 h-20 mb-6" />
                <h3 className="text-lg font-black uppercase text-[#CC5A5A] tracking-widest">FANTE IA</h3>
                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-black tracking-[0.2em] mb-8">Versão 2.5.0 Final</p>
                <div className="w-full h-px bg-[var(--border-color)] mb-8" />
                <p className="text-xs text-[var(--text-secondary)] font-bold leading-relaxed uppercase">
                  Gestão estratégica de alta performance.<br/>Transformando dados em progresso real.
                </p>
              </Card>
            </div>
          </div>
        )}
      </main>

      {isAiOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-12 lg:right-12 lg:w-[480px] lg:h-[840px] bg-[var(--bg-main)] border border-[var(--border-color)] lg:rounded-[3.5rem] flex flex-col z-[500] shadow-2xl overflow-hidden animate-scale-in">
          <div className="p-6 lg:p-10 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-card)]/95 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full border-2 border-[#CC5A5A]/30 overflow-hidden bg-[var(--bg-card)] shadow-sm group">
                <img src={NERO_AVATAR} alt="Nero" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              </div>
              <div>
                <span className="uppercase text-xs lg:text-[14px] font-bold text-[#CC5A5A] tracking-[0.3em] block">NERO</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#4A9F6E] animate-pulse shadow-sm" />
                  <span className="text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-widest">Disponível</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsAiOpen(false)} className="text-[var(--text-secondary)] hover:text-[#CC5A5A] transition-all bg-[var(--bg-card)] p-2 lg:p-3 rounded-full hover:rotate-90 shadow-sm">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6 lg:space-y-8 no-scrollbar" style={{ background: 'radial-gradient(circle at 50% 10%, rgba(204, 90, 90, 0.05) 0%, rgba(var(--bg-main-rgb), 0) 80%)' }}>
            {messages.length === 0 && (
              <div className="text-center py-20 lg:py-32 space-y-8 lg:space-y-10 animate-fade-up">
                <div className="w-24 lg:w-32 h-24 lg:h-32 mx-auto rounded-full border-4 border-[#CC5A5A]/10 overflow-hidden bg-[var(--bg-card)] shadow-lg animate-pulse">
                  <img src={NERO_AVATAR} alt="Nero" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs lg:text-sm text-[var(--text-secondary)] font-bold italic px-4 lg:px-8 opacity-70">"Nero, registre um gasto de R$ 50 com almoço"</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-scale-in`}>
                <div className={`max-w-[90%] p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] text-xs lg:text-sm font-bold uppercase shadow-sm ${m.role === 'user' ? 'bg-[#CC5A5A] text-white' : 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)]'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isAiLoading && <div className="text-[#CC5A5A] animate-pulse text-[11px] uppercase font-bold px-4 lg:px-8 flex items-center gap-3"><Loader2 className="animate-spin w-4 h-4"/> Nero está pensando...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-6 lg:p-10 border-t border-[var(--border-color)] space-y-6 lg:space-y-8 bg-[var(--bg-card)]/95 pb-32 lg:pb-16 backdrop-blur-xl">
            <div className="flex gap-3 lg:gap-5 items-center">
              <input type="text" placeholder="Comande o Nero..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiChat(chatInput)} className="flex-1 bg-[var(--bg-main)] border border-[var(--border-color)] p-4 lg:p-6 rounded-[1.5rem] lg:rounded-3xl text-xs lg:text-sm outline-none focus:border-[#CC5A5A] text-[var(--text-primary)] transition-all focus:scale-105 font-medium" />
              <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-4 lg:p-6 rounded-[1.5rem] lg:rounded-3xl transition-all shadow-md hover:scale-110 active:scale-90 ${isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>
                <Mic className="w-6 h-6" />
              </button>
              <button onClick={() => handleAiChat(chatInput)} className="p-4 lg:p-6 btn-modern rounded-[1.5rem] lg:rounded-3xl shadow-lg active:scale-90 hover:scale-105 transition-transform">
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-24 bg-[var(--bg-card)]/95 backdrop-blur-3xl border-t border-[var(--border-color)] flex items-center justify-around px-2 pb-6 z-[400] shadow-2xl animate-fade-up">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
          { id: 'finances', icon: Wallet, label: 'Contas' },
        ].map(btn => (
          <button 
            key={btn.id}
            onClick={() => setActiveTab(btn.id)} 
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all min-w-[56px] ${activeTab === btn.id ? 'text-[#CC5A5A] scale-110 font-black' : 'text-[var(--icon-inactive)]'}`}
          >
            <btn.icon className="w-5 h-5" />
            <span className="text-[9px] uppercase tracking-widest font-black">{btn.label}</span>
          </button>
        ))}
        
        <button 
          onClick={() => setIsAiOpen(true)} 
          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border-2 border-[#CC5A5A]/20 -translate-y-4 shadow-2xl active:scale-90 ${isAiOpen ? 'bg-[#CC5A5A] text-white border-[#CC5A5A]' : 'bg-[var(--bg-card)] text-[#CC5A5A]'}`}
        >
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">Nero</span>
        </button>
        
        {[
          { id: 'tasks', icon: CheckSquare, label: 'Tarefas' },
          { id: 'settings', icon: Settings, label: 'Ajustes' }
        ].map(btn => (
          <button 
            key={btn.id}
            onClick={() => setActiveTab(btn.id)} 
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all min-w-[56px] ${activeTab === btn.id ? 'text-[#CC5A5A] scale-110 font-black' : 'text-[var(--icon-inactive)]'}`}
          >
            <btn.icon className="w-5 h-5" />
            <span className="text-[9px] uppercase tracking-widest font-black">{btn.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};