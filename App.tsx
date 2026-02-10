
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Target as TargetIcon, 
  Bot, 
  Edit2, 
  Check, 
  Trash2, 
  Mic, 
  MicOff, 
  History, 
  PieChart, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  X, 
  ShieldCheck, 
  ChevronRight, 
  ClipboardList, 
  Flame, 
  Zap, 
  Flag, 
  BarChart3, 
  Loader2,
  Calendar,
  AlertCircle,
  ChevronLeft,
  CircleDollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil
} from 'lucide-react';
import { Card } from './components/ui/Card';
import { AnimatedNumber } from './components/ui/AnimatedNumber';
import { RadarScoreChart } from './components/ui/RadarScoreChart';
import { WeeklyTaskChart } from './components/ui/WeeklyTaskChart';
import { GoalProgressCard } from './components/ui/GoalProgressCard';
import { WeeklyExpensesChart } from './components/ui/WeeklyExpensesChart';
import { CategoryExpensesChart } from './components/ui/CategoryExpensesChart';
import { 
  Priority, 
  Rank, 
  Transaction, 
  Task, 
  UserStats 
} from './types';
import { 
  XP_REQUIREMENTS,
  CATEGORIES
} from './constants';
import { processAICmd, classifyCategory } from './services/geminiService';
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

// Logo Component
const VWalletLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    {/* Usando a imagem enviada via data URI para garantir que apareça */}
    <img 
      src="https://raw.githubusercontent.com/google/material-design-icons/master/png/action/account_balance_wallet/materialicons/48dp/1x/baseline_account_balance_wallet_white_48dp.png" 
      alt="VWallet Logo"
      className="hidden" // Escondendo apenas para carregar, abaixo usaremos um substituto visual baseado na foto
    />
    <div className="relative transform hover:scale-105 transition-transform duration-500">
      {/* Representação visual da logo da foto: V estilizado + Moeda */}
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,174,0,0.3)]">
        <path d="M20,30 Q35,85 50,85 Q65,85 80,30" fill="none" stroke="url(#v-gradient)" strokeWidth="12" strokeLinecap="round" />
        <path d="M25,35 Q35,80 50,80 Q65,80 75,35" fill="none" stroke="url(#v-gradient-2)" strokeWidth="8" strokeLinecap="round" />
        <circle cx="50" cy="35" r="18" fill="url(#coin-gradient)" />
        <text x="50" y="42" textAnchor="middle" fill="#5c4000" fontSize="18" fontWeight="bold" fontFamily="serif">$</text>
        <defs>
          <linearGradient id="v-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e63946" />
            <stop offset="100%" stopColor="#f4a261" />
          </linearGradient>
          <linearGradient id="v-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="100%" stopColor="#ffae00" />
          </linearGradient>
          <linearGradient id="coin-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffeb3b" />
            <stop offset="100%" stopColor="#ff9800" />
          </linearGradient>
        </defs>
      </svg>
      {/* Brilhos (Sparkles da foto) */}
      <Sparkles className="absolute -top-1 -right-1 text-yellow-400 w-4 h-4 animate-pulse" />
      <Sparkles className="absolute top-4 -right-3 text-yellow-200 w-3 h-3 animate-pulse delay-75" />
    </div>
  </div>
);

export const App: React.FC = () => {
  // --- Estados Core ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [userName, setUserName] = useState('');
  const [onboardingError, setOnboardingError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<UserStats>({ xp: 0, rank: Rank.INICIANTE, level: 1, totalRevenue: 0, totalExpenses: 0, balance: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  // --- Estado de Finanças Mensais ---
  const [viewDate, setViewDate] = useState(new Date());
  const [monthlyLimit, setMonthlyLimit] = useState(5000); 
  const [initialReserve, setInitialReserve] = useState(38338); 

  // --- Estados do Chat Nero ---
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [showMicPrompt, setShowMicPrompt] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState('');

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalUnit, setNewGoalUnit] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTransDesc, setNewTransDesc] = useState('');
  const [newTransAmount, setNewTransAmount] = useState('');
  const [newTransType, setNewTransType] = useState<'REVENUE' | 'EXPENSE'>('REVENUE');
  const [isClassifying, setIsClassifying] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState('Outros');

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcriptRef.current += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setChatInput(transcriptRef.current + interimTranscript);
      };
    }
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem('nexus_user_name');
    const savedStats = localStorage.getItem('nexus_user_stats');
    const savedTasks = localStorage.getItem('nexus_user_tasks');
    const savedTransactions = localStorage.getItem('nexus_user_transactions');
    const savedGoals = localStorage.getItem('nexus_user_goals');
    const savedMicPerm = localStorage.getItem('nexus_mic_permission');
    const savedLimit = localStorage.getItem('nexus_monthly_limit');
    const savedReserve = localStorage.getItem('nexus_initial_reserve');
    
    if (savedMicPerm === 'true') setMicPermissionGranted(true);
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
  }, [stats, tasks, transactions, goals, monthlyLimit, initialReserve]);

  const executeAiFunctions = (calls: any[]) => {
    calls.forEach(call => {
      const { name, args } = call;
      if (name === 'add_transaction') {
        const val = args.type === 'REVENUE' ? args.amount : -args.amount;
        handleAdjustBalance(val, args.description, args.category || 'Outros');
      } else if (name === 'update_balance') {
        setStats(prev => ({ ...prev, balance: args.amount }));
        triggerFireworks('#ffae00');
      } else if (name === 'add_task') {
        const newTask: Task = {
          id: Math.random().toString(36).substr(2, 9),
          title: args.title,
          priority: Priority.MEDIUM,
          completed: false,
          xpValue: 20,
          emoji: '🤖'
        };
        setTasks(prev => [newTask, ...prev]);
      }
    });
  };

  const handleAiChat = async (text: string, audioBase64?: string) => {
    if (!text && !audioBase64) return;
    setIsAiLoading(true);
    
    const displayMessage = text || "🎤 Enviando comando de áudio...";
    setMessages(prev => [...prev, { role: 'user', text: displayMessage }]);
    
    const result = await processAICmd(text, audioBase64);
    
    if (result.functionCalls) {
      executeAiFunctions(result.functionCalls);
    }

    setMessages(prev => [...prev, { role: 'ai', text: result.text || "Comando processado com sucesso pelo Nero." }]);
    setIsAiLoading(false);
    setChatInput('');
  };

  const requestMicAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionGranted(true);
      localStorage.setItem('nexus_mic_permission', 'true');
      setShowMicPrompt(false);
      setMessages(prev => [...prev, { role: 'system', text: "Acesso ao microfone concedido." }]);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Erro microfone:", err);
      setMessages(prev => [...prev, { role: 'system', text: "Erro: Acesso ao microfone negado." }]);
      setShowMicPrompt(false);
    }
  };

  const startRecording = async () => {
    if (!micPermissionGranted) {
      setShowMicPrompt(true);
      return;
    }

    try {
      transcriptRef.current = '';
      setChatInput('');
      if (recognitionRef.current) recognitionRef.current.start();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          const finalText = transcriptRef.current || chatInput;
          handleAiChat(finalText, base64);
        };
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao gravar:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAdjustBalance = (amount: number, description: string, category: string) => {
    const isPositive = amount > 0;
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
    }));
  };

  const handleManualBalanceUpdate = () => {
    const newVal = parseFloat(tempBalance.replace(',', '.'));
    if (!isNaN(newVal)) {
      setStats(prev => ({ ...prev, balance: newVal }));
      triggerFireworks('#ffae00');
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

  const handleAddGoal = () => {
    if (newGoalTitle && newGoalTarget) {
      const g: Goal = {
        id: Date.now().toString(),
        title: newGoalTitle,
        target: Number(newGoalTarget),
        current: 0,
        unit: newGoalUnit || 'un',
        completed: false
      };
      setGoals(prev => [g, ...prev]);
      setNewGoalTitle('');
      setNewGoalTarget('');
      setNewGoalUnit('');
    }
  };

  const handleUpdateGoal = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const next = Math.min(g.target, Math.max(0, g.current + amount));
        const justCompleted = next >= g.target && !g.completed;
        if (justCompleted) {
          triggerFireworks('#ff0000');
          setStats(s => ({ ...s, xp: s.xp + 100 }));
        }
        return { ...g, current: next, completed: next >= g.target };
      }
      return g;
    }));
  };

  const triggerFireworks = (color = '#ffae00') => {
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: [color] });
  };

  const autoClassifyForm = async () => {
    if (newTransDesc.trim() && newTransAmount && newTransType === 'EXPENSE') {
      setIsClassifying(true);
      const cat = await classifyCategory(newTransDesc, Number(newTransAmount));
      setSuggestedCategory(cat);
      setIsClassifying(false);
    }
  };

  const handleStartSession = () => {
    if (!userName.trim()) {
      setOnboardingError('Identificação mandatória para inicialização.');
      return;
    }
    setOnboardingError('');
    setIsOnboarding(false);
  };

  const currentMonthTransactions = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [transactions, viewDate]);

  const monthlyStats = useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    currentMonthTransactions.forEach(t => {
      if (t.type === 'REVENUE') revenue += t.amount;
      else expenses += t.amount;
    });
    const balance = revenue - expenses;
    const economyRate = revenue > 0 ? (balance / revenue) * 100 : 0;
    const remainingBudget = monthlyLimit - expenses;
    const budgetPercentage = Math.min(100, Math.round((expenses / monthlyLimit) * 100));

    return {
      revenue,
      expenses,
      balance,
      economyRate,
      remainingBudget,
      budgetPercentage
    };
  }, [currentMonthTransactions, monthlyLimit]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  if (!isLoaded) return null;

  if (isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <Card className="w-full max-w-md bg-neutral-900/40 border-neutral-800 p-10 space-y-8 backdrop-blur-xl">
          <div className="text-center space-y-4">
            <VWalletLogo className="w-24 h-24 mx-auto mb-2" />
            <h1 className="text-4xl text-chique tracking-tighter uppercase font-black">VWallet</h1>
            <p className="text-neutral-500 text-[10px] uppercase tracking-[0.3em] font-medium italic">controle financeiro inteligente</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] text-neutral-600 uppercase font-black tracking-widest block text-center">Protocolo de Identificação</label>
              <input 
                type="text" 
                placeholder="Insira seu nome" 
                value={userName} 
                onChange={e => {
                  setUserName(e.target.value);
                  if (e.target.value.trim()) setOnboardingError('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleStartSession()}
                className={`w-full bg-black/50 border-b-2 ${onboardingError ? 'border-red-600' : 'border-neutral-800'} focus:border-[#ffae00] p-4 text-sm font-bold text-center transition-all outline-none`}
              />
            </div>
            {onboardingError && (
              <p className="text-[10px] text-red-500 uppercase tracking-widest text-center animate-pulse flex items-center justify-center gap-1 font-black">
                <AlertCircle size={12} /> {onboardingError}
              </p>
            )}
          </div>
          <button 
            onClick={handleStartSession}
            className="w-full py-5 bg-[#ffae00] text-black uppercase tracking-[0.25em] text-xs font-black rounded-full hover:bg-[#ffc107] hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
          >
            Acessar Core
          </button>
        </Card>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const displayedTasks = tasks.slice(0, 3);
  const remainingCount = totalCount > 3 ? totalCount - 3 : 0;

  const activeGoalsCount = goals.filter(g => !g.completed).length;
  const completedGoalsCount = goals.filter(g => g.completed).length;

  const radarData = [
    { label: 'Foco', value: totalCount > 0 ? (completedCount / totalCount) * 100 : 0, color: '#ff0000' },
    { label: 'Finanças', value: Math.min(100, (stats.balance / 10000) * 100), color: '#ff0000' },
    { label: 'XP', value: Math.min(100, (stats.xp / 5000) * 100), color: '#ff0000' },
    { label: 'Energia', value: Math.min(100, (completedCount * 15) + (stats.balance > 0 ? 30 : 10) + 10), color: '#ff0000' },
    { label: 'Metas', value: goals.length > 0 ? (completedGoalsCount / goals.length) * 100 : 0, color: '#ff0000' },
  ];

  const getWeeklyExpenses = () => {
    const weeklyData = [0, 0, 0, 0, 0, 0, 0];
    const today = new Date();
    transactions.forEach(t => {
      if (t.type === 'EXPENSE') {
        const tDate = new Date(t.date);
        const diffDays = Math.floor((today.getTime() - tDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          const dayIdx = (tDate.getDay() + 1) % 7; 
          weeklyData[dayIdx] += t.amount;
        }
      }
    });
    return weeklyData;
  };

  const getMostFrequentTask = () => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return { title: 'Nenhuma', count: 0 };
    
    const freq: Record<string, number> = {};
    completedTasks.forEach(t => freq[t.title] = (freq[t.title] || 0) + 1);
    
    let max = 0;
    let title = 'Nenhuma';
    Object.entries(freq).forEach(([t, c]) => {
      if (c > max) {
        max = c;
        title = t;
      }
    });
    return { title, count: max };
  };

  const currentMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());
  const activeItemsCount = tasks.filter(t => !t.completed).length + goals.filter(g => !g.completed).length;
  const mostDone = getMostFrequentTask();

  const now = new Date();
  const dayName = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dayNumber = now.getDate();
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
  const formattedToday = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dayNumber} De ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
  
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-medium overflow-hidden selection:bg-[#ffae00] selection:text-black">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-neutral-900 p-8 bg-black/80 backdrop-blur-2xl">
        <div className="flex flex-col items-center gap-4 mb-12">
          <VWalletLogo className="w-16 h-16" />
          <span className="text-xl text-chique tracking-tighter uppercase font-black text-white">VWallet</span>
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
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-full uppercase text-[10px] tracking-[0.2em] font-black transition-all ${
                activeTab === item.id ? 'bg-[#ffae00] text-black shadow-lg shadow-[#ffae00]/20' : 'text-neutral-500 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-10 max-w-7xl mx-auto w-full pb-32 lg:pb-10 overflow-y-auto h-screen no-scrollbar relative">
        {activeTab === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <header className="space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-4xl lg:text-6xl text-chique tracking-tighter font-black">Bem-vindo, <span className="text-[#ffae00]">{userName}</span></h2>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] mt-3 font-bold">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="hidden sm:block">
                   <VWalletLogo className="w-16 h-16" />
                </div>
              </div>

              <button 
                onClick={() => setIsAiOpen(true)}
                className="flex items-center gap-4 px-10 py-6 bg-neutral-900 border border-[#ffae00]/30 text-white rounded-full font-black uppercase text-[11px] tracking-[0.3em] shadow-xl hover:bg-[#ffae00] hover:text-black hover:border-transparent transition-all w-full sm:w-auto text-center justify-center group"
              >
                <Bot size={20} className="group-hover:animate-bounce" /> Falar com Nero
              </button>
            </header>

            {/* SEÇÃO DE MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="relative overflow-hidden group border-neutral-800/50 hover:border-[#ffae00]/30 transition-all p-10 bg-neutral-950/40 shadow-2xl rounded-[2.5rem]">
                <Wallet className="absolute -right-8 -top-8 opacity-5 group-hover:opacity-10 transition-opacity rotate-12" size={140} />
                <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] mb-4 font-black">Fluxo de Caixa Atual</h4>
                <div className="flex items-center gap-4">
                  {isEditingBalance ? (
                    <div className="flex gap-2 w-full animate-in zoom-in-95">
                      <input autoFocus type="text" value={tempBalance} onChange={e => setTempBalance(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualBalanceUpdate()} className="flex-1 bg-black border-b-2 border-[#ffae00] p-2 text-2xl font-black outline-none" />
                      <button onClick={handleManualBalanceUpdate} className="p-3 bg-[#ffae00] text-black rounded-full"><Check size={20}/></button>
                      <button onClick={() => setIsEditingBalance(false)} className="p-3 bg-neutral-800 text-neutral-400 rounded-full"><X size={20}/></button>
                    </div>
                  ) : (
                    <>
                      <div className="text-5xl text-chique tracking-tighter font-black">R$ <AnimatedNumber value={stats.balance} /></div>
                      <button onClick={() => { setTempBalance(stats.balance.toString()); setIsEditingBalance(true); }} className="p-3 text-neutral-600 hover:text-[#ffae00] transition-colors bg-neutral-900/50 rounded-full border border-neutral-800"><Edit2 size={16} /></button>
                    </>
                  )}
                </div>
              </Card>

              <Card className="p-10 bg-neutral-950/40 shadow-2xl rounded-[2.5rem] border-neutral-800/50">
                <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.4em] mb-4 font-black">Engajamento Nero</h4>
                <div className="text-5xl text-chique tracking-tighter font-black">
                  {stats.xp} <span className="text-sm text-neutral-500 uppercase tracking-widest ml-1 font-bold">XP</span>
                </div>
                <div className="mt-6 h-2 bg-black rounded-full overflow-hidden border border-neutral-800 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-[#ffae00] to-[#ff4d4d] transition-all duration-1000" style={{ width: `${(stats.xp % 2000) / 20}%` }} />
                </div>
              </Card>
            </div>

            {/* O resto do conteúdo do dashboard continua similar, mas com classes text-chique e fontes Montserrat */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-neutral-900/30 backdrop-blur-md border border-neutral-800/50 rounded-[3rem] p-10 animate-in slide-in-from-top-4 duration-700 min-h-[350px] flex flex-col shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-8 border-b border-neutral-800 pb-4">Sumário Operacional</h3>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Flame size={18} className="text-[#ff4d4d]" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-neutral-400">OBJETIVOS DIÁRIOS</span>
                  </div>
                  <span className="text-[11px] font-black text-neutral-500 bg-neutral-800/50 px-3 py-1 rounded-full">{completedCount}/{totalCount}</span>
                </div>
                <div className="space-y-6 flex-1">
                  {totalCount === 0 ? (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-neutral-800 rounded-3xl opacity-50">
                      <p className="text-[10px] text-neutral-600 uppercase font-black tracking-[0.2em]">Pendente de planejamento</p>
                    </div>
                  ) : (
                    displayedTasks.map((task) => (
                      <div key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-6 group cursor-pointer">
                        <div className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${task.completed ? 'bg-[#ffae00] border-[#ffae00] shadow-lg shadow-[#ffae00]/20' : 'border-neutral-700 group-hover:border-neutral-400'}`}>
                          {task.completed && <Check size={14} className="text-black" strokeWidth={4} />}
                        </div>
                        <span className={`text-sm font-bold tracking-tight transition-all uppercase ${task.completed ? 'text-neutral-600 line-through' : 'text-neutral-200'}`}>
                          {task.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-neutral-900/30 backdrop-blur-md border border-neutral-800/50 rounded-[3rem] p-10 flex flex-col items-center justify-center relative overflow-hidden animate-in slide-in-from-right-4 duration-1000 shadow-2xl h-full">
                <div className="absolute top-10 left-10 flex items-center gap-3">
                  <Zap size={18} className="text-[#ffae00]" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-500">MÉTRICAS CORE</h3>
                </div>
                <RadarScoreChart data={radarData} size={300} />
              </div>
            </div>
          </div>
        )}

        {/* --- Aba Finanças (Estilo Nero/VWallet) --- */}
        {activeTab === 'finances' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <header className="flex flex-col items-center gap-8">
              <VWalletLogo className="w-20 h-20" />
              <div className="flex items-center gap-10">
                <button onClick={() => changeMonth(-1)} className="p-4 bg-neutral-900/80 rounded-full hover:bg-neutral-800 transition-colors shadow-lg">
                  <ChevronLeft className="text-neutral-400" size={24} />
                </button>
                <div className="text-center">
                  <h2 className="text-3xl text-chique tracking-tighter uppercase font-black">
                    {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(viewDate)}
                  </h2>
                </div>
                <button onClick={() => changeMonth(1)} className="p-4 bg-neutral-900/80 rounded-full hover:bg-neutral-800 transition-colors shadow-lg">
                  <ChevronRight className="text-neutral-400" size={24} />
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-neutral-950/80 border border-emerald-900/30 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
                <div className="absolute top-8 right-8 w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <ArrowUpCircle className="text-emerald-500" size={24} />
                </div>
                <p className="text-[11px] text-emerald-500/50 font-black uppercase tracking-[0.3em] mb-3">RECEITAS</p>
                <h3 className="text-4xl text-chique font-black text-emerald-500">R$ {monthlyStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>

              <div className="bg-neutral-950/80 border border-rose-900/30 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
                <div className="absolute top-8 right-8 w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center">
                  <ArrowDownCircle className="text-rose-500" size={24} />
                </div>
                <p className="text-[11px] text-rose-500/50 font-black uppercase tracking-[0.3em] mb-3">GASTOS</p>
                <h3 className="text-4xl text-chique font-black text-rose-500">R$ {monthlyStats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>

              <div className="bg-neutral-950/80 border border-neutral-800 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl md:col-span-2 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-[#ffae00]/10 rounded-full flex items-center justify-center shadow-lg shadow-[#ffae00]/5">
                      <Wallet className="text-[#ffae00]" size={28} />
                   </div>
                   <div>
                      <p className="text-[11px] text-neutral-500 font-black uppercase tracking-[0.3em] mb-1">LIQUIDEZ TOTAL</p>
                      <h3 className="text-4xl text-chique font-black text-white">R$ {(initialReserve + monthlyStats.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                   </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest mb-1">RESERVA INICIAL</p>
                    <p className="text-lg font-bold text-neutral-400">R$ {initialReserve.toLocaleString('pt-BR')}</p>
                  </div>
                  <button onClick={() => {
                    const val = prompt("Ajustar Reserva Inicial:", initialReserve.toString());
                    if (val) setInitialReserve(Number(val));
                  }} className="p-4 bg-neutral-900 rounded-2xl hover:bg-neutral-800 transition-colors"><Pencil size={20} className="text-neutral-500" /></button>
                </div>
              </div>
            </div>

            <Card className="bg-neutral-900/30 border-neutral-800/50 rounded-[3rem] p-12">
               <CategoryExpensesChart transactions={currentMonthTransactions} />
            </Card>

            <button onClick={() => setActiveTab('finances_new')} className="w-full py-6 bg-[#ffae00] text-black rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-[#ffae00]/10">
               <Plus size={24} strokeWidth={3} /> Registrar Lançamento
            </button>
          </div>
        )}

        {/* Sub-aba de Novo Lançamento */}
        {activeTab === 'finances_new' && (
           <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-bottom-12 duration-700">
              <header className="flex justify-between items-center">
                <h2 className="text-3xl text-chique tracking-tighter font-black uppercase">NOVA TRANSAÇÃO</h2>
                <button onClick={() => setActiveTab('finances')} className="p-4 bg-neutral-900/80 rounded-full hover:bg-neutral-800 transition-colors"><X size={24} /></button>
              </header>
              <Card className="rounded-[3rem] p-12 border-neutral-800/50 shadow-2xl bg-neutral-950/50">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] text-neutral-600 uppercase font-black tracking-[0.3em] ml-4">Memorando</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Jantar de Negócios" 
                        className="w-full bg-black/50 border-b border-neutral-800 p-5 rounded-2xl text-sm font-bold outline-none focus:border-[#ffae00] transition-colors" 
                        value={newTransDesc} 
                        onChange={e => setNewTransDesc(e.target.value)} 
                        onBlur={autoClassifyForm}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] text-neutral-600 uppercase font-black tracking-[0.3em] ml-4">Valor (BRL)</label>
                        <input 
                          type="number" 
                          placeholder="0,00" 
                          className="w-full bg-black/50 border-b border-neutral-800 p-5 rounded-2xl text-sm font-bold outline-none focus:border-[#ffae00] transition-colors" 
                          value={newTransAmount} 
                          onChange={e => setNewTransAmount(e.target.value)} 
                          onBlur={autoClassifyForm}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] text-neutral-600 uppercase font-black tracking-[0.3em] ml-4">Natureza</label>
                        <select className="w-full bg-black/50 border-b border-neutral-800 p-5 rounded-2xl text-[10px] uppercase font-black outline-none cursor-pointer focus:border-[#ffae00] appearance-none" value={newTransType} onChange={e => setNewTransType(e.target.value as any)}>
                          <option value="REVENUE">CRÉDITO (ENTRADA)</option>
                          <option value="EXPENSE">DÉBITO (SAÍDA)</option>
                        </select>
                      </div>
                    </div>
                    {newTransType === 'EXPENSE' && (
                      <div className="space-y-3">
                        <label className="text-[10px] text-neutral-600 uppercase font-black tracking-[0.3em] ml-4 flex items-center gap-2">Categoria {isClassifying && <Loader2 className="animate-spin" size={12} />}</label>
                        <select 
                          className="w-full bg-black/50 border-b border-neutral-800 p-5 rounded-2xl text-[10px] font-black outline-none focus:border-[#ffae00] transition-all uppercase appearance-none"
                          value={suggestedCategory}
                          onChange={e => setSuggestedCategory(e.target.value)}
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )}
                    <button onClick={() => { if (newTransAmount) { handleAdjustBalance(newTransType === 'REVENUE' ? Number(newTransAmount) : -Number(newTransAmount), newTransDesc || "Lançamento", newTransType === 'EXPENSE' ? suggestedCategory : 'Receita'); setNewTransAmount(''); setNewTransDesc(''); setActiveTab('finances'); triggerFireworks(); } }} className="w-full py-6 bg-[#ffae00] text-black uppercase tracking-[0.3em] text-[11px] font-black rounded-full shadow-2xl shadow-[#ffae00]/10 hover:bg-[#ffc107] transition-all active:scale-[0.98]">Confirmar Transação</button>
                  </div>
              </Card>
           </div>
        )}

        {/* Outras abas (Tarefas e Metas) - Seguem o mesmo estilo visual renovado */}
        {activeTab === 'tasks' && (
          <div className="space-y-12 animate-in fade-in duration-700">
             <header className="space-y-8">
              <h2 className="text-4xl text-chique tracking-tighter font-black uppercase">GESTÃO DE ROTINA</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-3xl p-6 flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                    <TargetIcon size={24} className="text-rose-500" />
                  </div>
                  <div>
                    <p className="text-[9px] text-neutral-600 uppercase font-black tracking-[0.3em] mb-1">PROTOCOLO COMUM</p>
                    <p className="text-sm font-black text-white uppercase">{mostDone.title}</p>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase">{mostDone.count} ocorrências</p>
                  </div>
                </div>

                <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-3xl p-6 flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Calendar size={24} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[9px] text-neutral-600 uppercase font-black tracking-[0.3em] mb-1">CICLO VIGENTE</p>
                    <p className="text-sm font-black text-white uppercase">{currentMonthName}</p>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase">{activeItemsCount} pendências</p>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900/30 backdrop-blur-md border border-neutral-800/50 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.4em] mb-2 italic">HOJE • STATUS</p>
                    <h3 className="text-xl font-black text-white text-chique uppercase">{formattedToday}</h3>
                  </div>
                  <button 
                    onClick={() => document.getElementById('new-task-input')?.focus()}
                    className="w-12 h-12 bg-rose-600 text-white flex items-center justify-center rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-transform"
                  >
                    <Plus size={24} strokeWidth={4} />
                  </button>
                </div>

                <div className="flex justify-between items-end mb-4">
                  <span className="text-[11px] font-black text-neutral-500 uppercase tracking-widest">{completedCount}/{totalCount} EFETIVADO</span>
                  <span className="text-[11px] font-black text-rose-500 tracking-[0.2em]">{completionPercentage}% DE PERFORMANCE</span>
                </div>

                <div className="h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/50 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </header>

            <Card className="rounded-[3rem] p-12 bg-neutral-950/40 border-neutral-800/50">
              <div className="flex gap-4 mb-10">
                <input 
                  id="new-task-input"
                  type="text" 
                  placeholder="Defina sua próxima missão..." 
                  className="flex-1 bg-black/50 border-b border-neutral-800 p-5 rounded-2xl text-sm font-bold outline-none focus:border-[#ffae00] transition-colors" 
                  value={newTaskTitle} 
                  onChange={e => setNewTaskTitle(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && newTaskTitle.trim()) { setTasks(prev => [{ id: Date.now().toString(), title: newTaskTitle, priority: Priority.MEDIUM, completed: false, xpValue: 20 }, ...prev]); setNewTaskTitle(''); } }} 
                />
                <button onClick={() => { if (newTaskTitle.trim()) { setTasks(prev => [{ id: Date.now().toString(), title: newTaskTitle, priority: Priority.MEDIUM, completed: false, xpValue: 20 }, ...prev]); setNewTaskTitle(''); } }} className="p-5 bg-[#ffae00] text-black rounded-2xl hover:bg-[#ffc107] active:scale-90 transition-all shadow-xl flex items-center justify-center min-w-[64px]"><Plus size={28} strokeWidth={3} /></button>
              </div>
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <p className="text-[10px] text-neutral-600 uppercase text-center py-20 italic border border-dashed border-neutral-800 rounded-3xl tracking-widest">Sem missões ativas no momento.</p>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} onClick={() => toggleTask(task.id)} className={`p-6 border rounded-[1.5rem] flex items-center gap-6 cursor-pointer transition-all ${task.completed ? 'opacity-30 bg-neutral-950/50 border-neutral-900' : 'border-neutral-800 hover:border-[#ffae00]/40 hover:bg-neutral-900/30'}`}>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-[#ffae00] border-[#ffae00]' : 'border-neutral-700'}`}>
                        {task.completed && <Check size={14} className="text-black" strokeWidth={4} />}
                      </div>
                      <span className={`text-sm uppercase font-black tracking-tight flex-1 ${task.completed ? 'line-through text-neutral-500' : ''}`}>{task.title}</span>
                      {!task.completed && <span className="text-[9px] text-[#ffae00] font-black tracking-widest">+20 XP</span>}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Metas segue a mesma lógica... */}
        {activeTab === 'goals' && (
          <div className="space-y-12 animate-in fade-in duration-700">
             <header>
              <h2 className="text-4xl text-chique tracking-tighter font-black uppercase">VISÃO ESTRATÉGICA</h2>
              <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.4em] mt-3">PROJETANDO O FUTURO FINANCEIRO</p>
            </header>
            {/* O restante do código de metas estilizado analogamente aos outros */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start">
              <Card className="xl:col-span-1 border-neutral-800/50 rounded-[2.5rem] p-10 bg-neutral-950/50">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] mb-10 border-b border-neutral-900 pb-4">Novo Objetivo</h3>
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[9px] text-neutral-600 uppercase font-black tracking-[0.4em] ml-2">Propósito</label>
                    <input type="text" placeholder="Ex: Liberdade Financeira" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} className="w-full bg-black/50 border-b border-neutral-800 p-4 rounded-xl text-sm font-bold outline-none focus:border-[#ffae00] transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] text-neutral-600 uppercase font-black tracking-[0.4em] ml-2">Alvo</label>
                      <input type="number" placeholder="0" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} className="w-full bg-black/50 border-b border-neutral-800 p-4 rounded-xl text-sm font-bold outline-none focus:border-[#ffae00] transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-neutral-600 uppercase font-black tracking-[0.4em] ml-2">Unidade</label>
                      <input type="text" placeholder="R$" value={newGoalUnit} onChange={e => setNewGoalUnit(e.target.value)} className="w-full bg-black/50 border-b border-neutral-800 p-4 rounded-xl text-sm font-bold outline-none focus:border-[#ffae00] transition-all" />
                    </div>
                  </div>
                  <button onClick={handleAddGoal} className="w-full py-6 bg-[#ffae00] text-black uppercase tracking-[0.3em] text-[10px] font-black rounded-full hover:bg-[#ffc107] transition-all shadow-xl shadow-[#ffae00]/5">Firmar Compromisso</button>
                </div>
              </Card>
              <div className="xl:col-span-2 space-y-6">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] mb-6">Em Execução</h3>
                {goals.length === 0 ? (
                  <div className="p-24 border border-dashed border-neutral-800 rounded-[3rem] text-center opacity-30">
                    <TargetIcon size={64} className="mx-auto text-neutral-800 mb-6" /><p className="text-[10px] text-neutral-600 uppercase font-black tracking-widest">Nenhum plano traçado.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {goals.map(goal => {
                      const progress = (goal.current / goal.target) * 100;
                      return (
                        <Card key={goal.id} className={`p-8 border-neutral-800/50 rounded-[2.5rem] hover:border-[#ffae00]/30 transition-all bg-neutral-900/30 ${goal.completed ? 'bg-emerald-950/10 border-emerald-900/30' : ''}`}>
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex flex-col"><span className="text-sm uppercase font-black tracking-tighter text-white">{goal.title}</span><span className="text-[10px] text-neutral-500 font-bold uppercase mt-2 tracking-widest">{goal.current.toLocaleString()} / {goal.target.toLocaleString()} {goal.unit}</span></div>
                            {goal.completed ? <div className="bg-emerald-500 p-2 rounded-full shadow-lg shadow-emerald-500/20"><Check size={14} className="text-black" strokeWidth={4} /></div> : <div className="p-2 bg-neutral-800 rounded-xl"><Flag size={18} className="text-neutral-500" /></div>}
                          </div>
                          <div className="h-2 bg-black rounded-full overflow-hidden mb-8 shadow-inner">
                            <div className={`h-full transition-all duration-1000 ${goal.completed ? 'bg-emerald-500' : 'bg-[#ffae00]'}`} style={{ width: `${progress}%` }} />
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => handleUpdateGoal(goal.id, 1)} className="flex-1 py-3 bg-neutral-800 text-[#ffae00] rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[#ffae00] hover:text-black transition-all">+1 {goal.unit}</button>
                            <button onClick={() => { const val = prompt("Soma ao total:"); if (val) handleUpdateGoal(goal.id, Number(val)); }} className="px-5 bg-neutral-800 text-neutral-400 rounded-xl hover:text-white transition-all"><Plus size={18} /></button>
                            <button onClick={() => setGoals(prev => prev.filter(g => g.id !== goal.id))} className="px-5 bg-neutral-950 text-neutral-700 rounded-xl hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CHAT NERO */}
      {isAiOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-12 lg:right-10 lg:w-[450px] lg:h-[820px] bg-black border border-neutral-800 lg:rounded-[3rem] flex flex-col z-[500] shadow-[0_40px_120px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-12 duration-700 overflow-hidden">
          <div className="p-8 border-b border-neutral-800 flex justify-between items-center bg-black/95 backdrop-blur-3xl">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-3 h-3 bg-[#ffae00] rounded-full animate-pulse shadow-[0_0_20px_#ffae00]" />
                <div className="absolute inset-0 bg-[#ffae00] rounded-full animate-ping opacity-20" />
              </div>
              <div className="flex flex-col"><span className="uppercase text-[12px] tracking-[0.4em] font-black text-chique">Nero AI</span><span className="text-[8px] text-neutral-600 uppercase font-black tracking-widest">Sincronização Ativa • 5.0 Core</span></div>
            </div>
            <button onClick={() => setIsAiOpen(false)} className="text-neutral-500 hover:text-white transition-colors bg-neutral-900 p-3 rounded-2xl"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-neutral-950/40">
            {messages.length === 0 && (
              <div className="text-center py-28 space-y-8 animate-in fade-in zoom-in-95 duration-1000">
                <ShieldCheck className="mx-auto text-[#ffae00] opacity-10" size={80} />
                <div className="space-y-4">
                   <p className="text-[10px] text-neutral-700 uppercase tracking-[0.6em] font-black">Interface Nero Pronta</p>
                   <p className="text-[12px] text-neutral-400 font-bold px-12 leading-relaxed italic opacity-60">"Nero, registre gasto de 20 reais com café"<br/>"Nova meta: Comprar um carro, alvo 50 mil"</p>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-400`}>
                <div className={`max-w-[90%] p-6 rounded-[2rem] text-[13px] uppercase tracking-tighter font-black leading-tight ${m.role === 'user' ? 'bg-[#ffae00] text-black shadow-2xl shadow-[#ffae00]/10' : m.role === 'system' ? 'bg-neutral-800 text-neutral-500 text-center w-full rounded-2xl text-[10px]' : 'bg-neutral-900 text-white shadow-xl'}`}>{m.text}</div>
              </div>
            ))}
            {isAiLoading && <div className="text-[#ffae00] animate-pulse text-[10px] uppercase font-black px-6 flex items-center gap-4"><Loader2 className="animate-spin" size={20} /> Processando dados por Nero...</div>}
          </div>
          <div className="p-8 border-t border-neutral-800 space-y-6 bg-neutral-950/95 backdrop-blur-3xl pb-24 lg:pb-12 shadow-[0_-30px_60px_rgba(0,0,0,0.6)]">
            {showMicPrompt ? (
              <div className="p-8 bg-neutral-900 border border-[#ffae00]/20 rounded-[2.5rem] space-y-6 animate-in zoom-in-95 shadow-2xl">
                <p className="text-[12px] text-white font-black uppercase text-center leading-relaxed tracking-widest"> Nero solicita acesso aos sensores de áudio.</p>
                <div className="flex gap-4"><button onClick={requestMicAccess} className="flex-1 py-5 bg-[#ffae00] text-black rounded-full text-[10px] font-black uppercase shadow-xl shadow-[#ffae00]/20 active:scale-95 transition-all">Sincronizar</button><button onClick={() => setShowMicPrompt(false)} className="flex-1 py-5 bg-neutral-800 text-neutral-400 rounded-full text-[10px] font-black uppercase active:scale-95 transition-all">Declinar</button></div>
              </div>
            ) : (
              <div className="flex gap-4 items-center">
                <input type="text" placeholder="Dite para Nero..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim()) handleAiChat(chatInput); }} className="flex-1 bg-black border border-neutral-800 p-6 rounded-[1.5rem] text-sm outline-none focus:border-[#ffae00] font-black transition-all placeholder:text-neutral-700 shadow-inner" />
                <button onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`p-6 rounded-[1.5rem] transition-all shadow-2xl ${isRecording ? 'bg-rose-600 text-white animate-pulse scale-110' : 'bg-neutral-900 text-neutral-600 hover:text-[#ffae00] active:scale-90 border border-neutral-800'}`} title="Sincronia Nero"><Mic size={28} /></button>
                <button onClick={() => chatInput.trim() && handleAiChat(chatInput)} className="p-6 bg-[#ffae00] text-black rounded-[1.5rem] shadow-2xl hover:bg-[#ffc107] transition-all active:scale-90"><Send size={28} strokeWidth={3} /></button>
              </div>
            )}
            <p className="text-[10px] text-neutral-800 text-center uppercase tracking-[0.6em] font-black">{isRecording ? "NERO ESTÁ ESCUTANDO..." : "NERO AGUARDA COMANDOS"}</p>
          </div>
        </div>
      )}

      {/* MOBILE NAV (Chique) */}
      {!isAiOpen && (
        <nav className="lg:hidden fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-neutral-900/95 backdrop-blur-3xl border border-neutral-800 p-4 rounded-full z-[400] shadow-[0_30px_80px_rgba(0,0,0,1)]">
          {[ { id: 'dashboard', icon: LayoutDashboard }, { id: 'finances', icon: Wallet }, { id: 'tasks', icon: CheckSquare }, { id: 'goals', icon: Flag } ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`p-5 rounded-full transition-all active:scale-90 ${activeTab === item.id ? 'bg-[#ffae00] text-black shadow-xl shadow-[#ffae00]/40' : 'text-neutral-600 hover:text-white'}`}><item.icon size={26} /></button>
          ))}
          <div className="w-[1px] h-12 bg-neutral-800 mx-2" />
          <button onClick={() => setIsAiOpen(true)} className="p-5 rounded-full bg-[#ffae00]/10 text-[#ffae00] border border-[#ffae00]/20 active:scale-90 transition-all shadow-xl"><Bot size={26} /></button>
        </nav>
      )}
    </div>
  );
};
