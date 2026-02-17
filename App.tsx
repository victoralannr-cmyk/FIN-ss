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
  Palette
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

interface ForecastResult {
  projectedBalance: number;
  insight: string;
  trendPoints: number[];
}

const SAFARI_AVATAR = "https://i.postimg.cc/j5q6V0PQ/Chat-GPT-Image-17-de-fev-de-2026-13-54-58-removebg-preview.png"; 
const APP_LOGO = "https://i.postimg.cc/q768GvkD/Chat-GPT-Image-17-de-fev-de-2026-10-45-16-removebg-preview.png";

// COMPONENTE DE LOGO DA MARCA (SIDEBAR / ONBOARDING)
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
  
  const [viewDate, setViewDate] = useState(new Date());
  const [initialReserve, setInitialReserve] = useState(0); 

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState('');

  const [newTransDesc, setNewTransDesc] = useState('');
  const [newTransAmount, setNewTransAmount] = useState('');
  const [newTransType, setNewTransType] = useState<'REVENUE' | 'EXPENSE'>('EXPENSE');
  const [newTransCategory, setNewTransCategory] = useState('Outros');

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

  const handleFetchForecast = async () => {
    setIsForecasting(true);
    try {
      const res = await getFinancialForecast(currentMonthTransactions, totalEquity);
      if (res) setForecast(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsForecasting(false);
    }
  };

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
    setForecast(null);
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
        <Card className="w-full max-w-lg bg-[var(--bg-card)] border-[#fa7f72]/20 p-8 sm:p-12 space-y-10 rounded-[2.5rem] animate-scale-in shadow-2xl">
          <div className="text-center space-y-4">
            <DonteLogo className="w-32 h-32 mx-auto mb-2" theme={theme} />
            <h1 className="text-3xl text-chique font-black tracking-widest text-[#fa7f72]">FANTE IA</h1>
            <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-[0.2em]">Configuração Inicial de Comando</p>
          </div>

          <div className="space-y-6">
            {/* Seletor de Tema no Onboarding */}
            <div className="space-y-4">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest text-center font-black">Escolha seu estilo visual</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${theme === 'light' ? 'bg-[#fa7f72] border-[#fa7f72] text-black shadow-lg scale-105' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] opacity-60'}`}
                >
                  <Sun className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase">Claro</span>
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-[#fa7f72] border-[#fa7f72] text-black shadow-lg scale-105' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] opacity-60'}`}
                >
                  <Moon className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase">Escuro</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
               <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest text-center font-black">INFORME SEU PRIMEIRO NOME</p>
               <input 
                 type="text" 
                 placeholder="Seu Nome" 
                 value={userName} 
                 onChange={e => setUserName(e.target.value)}
                 className="w-full bg-transparent border-b-2 border-[var(--border-color)] focus:border-[#fa7f72] p-4 text-xl font-medium text-center outline-none transition-all focus:scale-105 text-[var(--text-primary)]"
               />
            </div>

            <div className="space-y-4">
               <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest text-center font-black">Quanto você tem na sua conta?</p>
               <input 
                 type="text" 
                 placeholder="R$ 0,00" 
                 value={tempBalance}
                 onChange={e => setTempBalance(formatAsCurrencyInput(e.target.value))}
                 className="w-full bg-transparent border-b-2 border-[var(--border-color)] focus:border-[#fa7f72] p-4 text-3xl font-bold text-center outline-none transition-all focus:scale-105 text-[var(--text-primary)]"
               />
            </div>
          </div>

          <button 
            onClick={() => { 
              if (!userName.trim()) return; 
              setInitialReserve(parseCurrencyToNumber(tempBalance));
              setIsOnboarding(false); 
            }}
            className="w-full py-6 bg-[#fa7f72] text-black font-black rounded-full shadow-lg uppercase tracking-wider text-sm transition-all hover:scale-105 active:scale-95"
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
          <DonteLogo className="w-24 h-24" theme={theme} />
          <span className="text-lg text-chique font-black text-center mt-2 text-[#fa7f72]">FANTE IA</span>
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
                activeTab === item.id ? 'bg-[#fa7f72] text-black shadow-xl scale-105' : 'text-[var(--icon-inactive)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
              }`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
          <button 
            onClick={() => setIsAiOpen(true)} 
            className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl uppercase text-[10px] tracking-[0.25em] font-bold transition-all mt-10 border border-[#fa7f72]/20 hover:scale-105 ${isAiOpen ? 'bg-[#fa7f72] text-black' : 'text-[#fa7f72] hover:bg-[#fa7f72]/10'}`}
          >
            <Bot className="w-4 h-4" /> Safari IA
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto w-full pb-32 lg:pb-12 overflow-y-auto h-screen no-scrollbar relative">
        {activeTab === 'dashboard' && (
          <div key="tab-dashboard" className="space-y-8 lg:space-y-12 animate-fade-up">
            <header className="flex flex-col items-center text-center space-y-10 mb-12 py-14 bg-[var(--bg-card)] rounded-[3rem] border border-[#fa7f72]/10 shadow-[0_0_60px_rgba(250,127,114,0.08)] animate-fade-up">
              
              <div className="relative w-36 h-36 lg:w-48 lg:h-48 group">
                <div className="absolute inset-0 rounded-[2.5rem] border-2 border-[#fa7f72] animate-pulse shadow-[0_0_25px_#fa7f72] opacity-80" />
                <div className="absolute inset-0 rounded-[2.5rem] border border-[#fa7f72]/40 scale-110 opacity-20 group-hover:scale-125 transition-transform duration-1000" />
                
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden p-1 lg:p-2 bg-[var(--bg-main)] backdrop-blur-sm z-10 relative">
                  <img 
                    src={SAFARI_AVATAR} 
                    alt="Safari IA" 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" 
                    style={{ filter: theme === 'light' ? 'brightness(0)' : 'none' }}
                  />
                </div>
              </div>
              
              <div className="space-y-6 flex flex-col items-center">
                <img 
                  src={APP_LOGO} 
                  alt="Fante IA" 
                  className="h-10 lg:h-14 object-contain opacity-90 transition-opacity hover:opacity-100" 
                  style={{ filter: theme === 'light' ? 'brightness(0)' : 'brightness(0) invert(1)' }}
                />

                <div className="space-y-2">
                  <h2 className="text-3xl lg:text-6xl font-black tracking-tighter text-[var(--text-primary)] uppercase tabular-nums">
                    BEM-VINDO, {userName}_
                  </h2>
                  <p className="text-[10px] lg:text-[13px] text-[var(--text-muted)] font-bold lowercase tracking-[0.2em] opacity-80">
                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsAiOpen(true)} 
                className="flex items-center gap-4 px-12 py-6 bg-[#fa7f72] hover:bg-[#fb988f] text-black font-black uppercase tracking-[0.25em] text-[11px] lg:text-[14px] rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(250,127,114,0.35)] group"
              >
                <div className="bg-black/10 p-2 rounded-full group-hover:rotate-12 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                FALAR COM SAFARI
              </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
              <Card className="xl:col-span-2 bg-[var(--bg-card)] border-[var(--border-color)] rounded-[2.5rem] p-8 lg:p-10 shadow-sm flex flex-col justify-center card-hover animate-fade-up stagger-1">
                <div className="flex items-center gap-3 mb-6">
                  <Plus className="w-5 h-5 text-[#fa7f72] animate-bounce" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#fa7f72]">REGISTRO DE ENTRADAS E SAÍDAS</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input 
                    type="text" 
                    placeholder="O que você gastou?" 
                    value={newTransDesc} 
                    onChange={e => setNewTransDesc(e.target.value)} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none focus:border-[#fa7f72] text-sm transition-all focus:scale-105 text-[var(--text-primary)]" 
                  />
                  <input 
                    type="text" 
                    placeholder="R$ 0,00" 
                    value={newTransAmount} 
                    onChange={e => setNewTransAmount(formatAsCurrencyInput(e.target.value))} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none focus:border-[#fa7f72] text-sm transition-all focus:scale-105 text-[var(--text-primary)]" 
                  />
                  <select 
                    value={newTransCategory} 
                    onChange={e => setNewTransCategory(e.target.value)} 
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-2xl outline-none focus:border-[#fa7f72] text-sm appearance-none cursor-pointer text-[var(--text-primary)] font-medium"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setNewTransType('REVENUE')} className={`flex-1 p-3 rounded-2xl font-bold uppercase text-[9px] transition-all ${newTransType === 'REVENUE' ? 'bg-[#fa7f72] text-black' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>Entrada</button>
                    <button onClick={() => setNewTransType('EXPENSE')} className={`flex-1 p-3 rounded-2xl font-bold uppercase text-[9px] transition-all ${newTransType === 'EXPENSE' ? 'bg-white/10 text-[#fa7f72] border border-[#fa7f72]/30' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>Saída</button>
                  </div>
                </div>
                <button 
                  onClick={handleAddManualTransaction} 
                  className="mt-6 w-full py-4 bg-[#fa7f72] text-black rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:scale-[1.02] transition-transform"
                >
                  Confirmar Registro
                </button>
              </Card>

              <Card className="bg-[var(--bg-card)] border-[var(--border-color)] rounded-[2.5rem] p-8 lg:p-10 shadow-sm flex flex-col max-h-[320px] card-hover animate-fade-up stagger-2">
                <div className="flex items-center gap-3 mb-6">
                  <History className="w-5 h-5 text-[var(--icon-inactive)]" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Fluxo Recente</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                   {transactions.length === 0 ? (
                     <p className="text-[10px] text-[var(--text-muted)] uppercase italic py-4 font-bold">Nenhum registro ainda.</p>
                   ) : (
                     transactions.slice(0, 5).map((t, idx) => (
                       <div key={t.id} className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl animate-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                         <div className={`p-2 rounded-lg ${t.type === 'REVENUE' ? 'bg-[#fa7f72]/10 text-[#fa7f72]' : 'bg-[var(--border-color)] text-[var(--text-muted)]'}`}>
                           {t.type === 'REVENUE' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-[10px] font-bold text-[var(--text-primary)] uppercase truncate">{t.description}</p>
                           <p className="text-[8px] text-[var(--text-secondary)] uppercase tracking-widest font-black">{t.category}</p>
                         </div>
                         <p className={`text-[10px] font-black ${t.type === 'REVENUE' ? 'text-[#fa7f72]' : 'text-[var(--text-muted)]'}`}>R$ {t.amount.toLocaleString('pt-BR')}</p>
                       </div>
                     ))
                   )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 lg:space-y-12 animate-fade-up max-w-4xl mx-auto">
            <h2 className="text-3xl font-black uppercase text-[#fa7f72] tracking-tighter">Ajustes do Sistema</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Card de Informação */}
              <Card className="p-10 bg-[var(--bg-card)] border-[var(--border-color)] rounded-[3rem] flex flex-col items-center text-center shadow-xl">
                <DonteLogo className="w-24 h-24 mb-6" theme={theme} />
                <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2">FANTE IA</h3>
                <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-[0.3em] mb-8">Ecosystem v2.6.2 Final</p>
                <div className="w-full h-px bg-[var(--border-color)] mb-8" />
                <p className="text-[11px] text-[var(--text-secondary)] font-bold leading-relaxed uppercase tracking-wider">
                  Controle financeiro de alta precisão.<br/>Safari IA ativada e pronta para comando.
                </p>
              </Card>

              {/* Card de Personalização (Tema) */}
              <Card className="p-10 bg-[var(--bg-card)] border-[var(--border-color)] rounded-[3rem] shadow-xl flex flex-col gap-8">
                <div className="flex items-center gap-4 mb-2">
                  <Palette className="w-6 h-6 text-[#fa7f72]" />
                  <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">Personalização</h3>
                </div>
                
                <div className="space-y-6">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Interface Visual</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all ${theme === 'light' ? 'bg-[#fa7f72] border-[#fa7f72] text-black shadow-lg scale-105' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] opacity-60 hover:opacity-100'}`}
                    >
                      <Sun className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Modo Claro</span>
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-[#fa7f72] border-[#fa7f72] text-black shadow-lg scale-105' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)] opacity-60 hover:opacity-100'}`}
                    >
                      <Moon className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Modo Escuro</span>
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {isAiOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-12 lg:right-12 lg:w-[480px] lg:h-[840px] bg-[var(--bg-main)] border border-[var(--border-color)] lg:rounded-[3.5rem] flex flex-col z-[500] shadow-2xl overflow-hidden animate-scale-in">
          <div className="p-6 lg:p-10 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-card)]/95 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-[1.2rem] border-2 border-[#fa7f72]/30 overflow-hidden bg-[var(--bg-main)] shadow-sm">
                <img 
                  src={SAFARI_AVATAR} 
                  alt="Safari IA" 
                  className="w-full h-full object-cover" 
                  style={{ filter: theme === 'light' ? 'brightness(0)' : 'none' }}
                />
              </div>
              <div>
                <span className="uppercase text-xs lg:text-[14px] font-bold text-[#fa7f72] tracking-[0.3em] block">SAFARI IA</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                  <span className="text-[9px] text-[#4ADE80] uppercase font-bold tracking-widest">Online</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsAiOpen(false)} className="text-[var(--text-secondary)] hover:text-[#fa7f72] p-2 bg-[var(--bg-card)] rounded-full shadow-sm"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6 no-scrollbar" style={{ background: 'radial-gradient(circle at 50% 10%, rgba(250, 127, 114, 0.05) 0%, rgba(var(--bg-main-rgb), 0) 80%)' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-scale-in`}>
                {m.role === 'ai' && (
                  <div className="w-8 h-8 rounded-lg border border-[#fa7f72]/20 overflow-hidden shrink-0 mt-1 bg-[var(--bg-main)]">
                    <img 
                      src={SAFARI_AVATAR} 
                      alt="Safari IA" 
                      className="w-full h-full object-cover" 
                      style={{ filter: theme === 'light' ? 'brightness(0)' : 'none' }}
                    />
                  </div>
                )}
                <div className={`max-w-[85%] p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] text-xs lg:text-sm font-bold uppercase shadow-sm ${m.role === 'user' ? 'bg-[#fa7f72] text-black' : 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)]'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isAiLoading && <div className="text-[#fa7f72] animate-pulse text-[11px] uppercase font-bold px-4 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Safari IA processando comando...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-6 lg:p-10 border-t border-[var(--border-color)] bg-[var(--bg-card)]/95 pb-32 lg:pb-16 backdrop-blur-xl">
            <div className="flex gap-3 items-center">
              <input type="text" placeholder="Dê uma ordem para a Safari..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiChat(chatInput)} className="flex-1 bg-[var(--bg-main)] border border-[var(--border-color)] p-4 rounded-3xl text-sm focus:border-[#fa7f72] text-[var(--text-primary)] outline-none transition-all focus:ring-1 focus:ring-[#fa7f72]/30" />
              <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-4 rounded-3xl transition-all shadow-md active:scale-90 ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-[var(--bg-card)] text-[#fa7f72] border border-[var(--border-color)] hover:border-[#fa7f72]/60'}`}><Mic className="w-6 h-6" /></button>
              <button onClick={() => handleAiChat(chatInput)} className="p-4 bg-[#fa7f72] text-black font-bold rounded-3xl shadow-lg active:scale-90 hover:scale-105 transition-transform"><Send className="w-6 h-6" /></button>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-24 bg-[var(--bg-card)]/95 backdrop-blur-3xl border-t border-[var(--border-color)] flex items-center justify-around px-2 pb-6 z-[400] shadow-2xl">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
          { id: 'finances', icon: Wallet, label: 'Contas' },
        ].map(btn => (
          <button key={btn.id} onClick={() => setActiveTab(btn.id)} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === btn.id ? 'text-[#fa7f72] scale-110' : 'text-neutral-500'}`}>
            <btn.icon className="w-5 h-5" />
            <span className="text-[9px] uppercase font-black tracking-widest">{btn.label}</span>
          </button>
        ))}
        <button onClick={() => setIsAiOpen(true)} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 border-[#fa7f72]/20 -translate-y-4 shadow-2xl bg-[var(--bg-main)] text-[#fa7f72] active:scale-95 transition-transform`}><Bot className="w-6 h-6 animate-pulse" /><span className="text-[10px] font-black uppercase">Safari IA</span></button>
        {[
          { id: 'tasks', icon: CheckSquare, label: 'Tarefas' },
          { id: 'settings', icon: Settings, label: 'Ajustes' }
        ].map(btn => (
          <button key={btn.id} onClick={() => setActiveTab(btn.id)} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === btn.id ? 'text-[#fa7f72] scale-110' : 'text-neutral-500'}`}>
            <btn.icon className="w-5 h-5" />
            <span className="text-[9px] uppercase font-black tracking-widest">{btn.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};