
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

// Logo Component Refined for a Luxury Look - Solid Serif Gold
const VWalletLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <div className="relative transform hover:scale-105 transition-transform duration-700">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
        <path d="M20,30 Q35,85 50,85 Q65,85 80,30" fill="none" stroke="url(#v-gradient)" strokeWidth="12" strokeLinecap="round" />
        <circle cx="50" cy="35" r="20" fill="url(#coin-gradient)" />
        <text x="50" y="44" textAnchor="middle" fill="#3a2a00" fontSize="22" fontWeight="900" style={{ fontFamily: 'serif' }}>$</text>
        <defs>
          <linearGradient id="v-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#f4a261" />
          </linearGradient>
          <linearGradient id="coin-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#8b6508" />
          </linearGradient>
        </defs>
      </svg>
      <Sparkles className="absolute -top-3 -right-3 text-yellow-400 w-6 h-6 animate-pulse" />
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
      // Fix: Cast parsed objects to respective interfaces to ensure strict typing
      if (savedStats) setStats(JSON.parse(savedStats) as UserStats);
      if (savedTasks) setTasks(JSON.parse(savedTasks) as Task[]);
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions) as Transaction[]);
      if (savedGoals) setGoals(JSON.parse(savedGoals) as Goal[]);
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

  const handleAiChat = async (text: string, audioBase64?: string) => {
    if (!text && !audioBase64) return;
    setIsAiLoading(true);
    const displayMessage = text || "🎤 Enviando comando de áudio...";
    setMessages(prev => [...prev, { role: 'user', text: displayMessage }]);
    const result = await processAICmd(text, audioBase64);
    if (result.functionCalls) executeAiFunctions(result.functionCalls);
    setMessages(prev => [...prev, { role: 'ai', text: result.text || "Operação concluída pelo Nero." }]);
    setIsAiLoading(false);
    setChatInput('');
  };

  const executeAiFunctions = (calls: any[]) => {
    calls.forEach(call => {
      const { name, args } = call;
      if (name === 'add_transaction') {
        const val = args.type === 'REVENUE' ? Number(args.amount) : -Number(args.amount);
        handleAdjustBalance(val, args.description, args.category || 'Outros');
      } else if (name === 'update_balance') {
        setStats(prev => ({ ...prev, balance: Number(args.amount) }));
        triggerFireworks('#ffae00');
      } else if (name === 'add_task') {
        const newTask: Task = {
          id: Math.random().toString(36).substr(2, 9),
          title: args.title,
          priority: Priority.MEDIUM,
          completed: false,
          xpValue: 20
        };
        setTasks(prev => [newTask, ...prev]);
      }
    });
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
      setOnboardingError('Identificação mandatória para sincronização.');
      return;
    }
    setOnboardingError('');
    setIsOnboarding(false);
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const currentMonthTransactions = useMemo((): Transaction[] => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [transactions, viewDate]);

  // Fix: Explicitly typed revenue and expenses as number to resolve 'unknown' operator issues
  const monthlyStats = useMemo(() => {
    let revenue: number = 0;
    let expenses: number = 0;
    currentMonthTransactions.forEach((t: Transaction) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'REVENUE') revenue += amt;
      else expenses += amt;
    });
    const balance: number = revenue - expenses;
    const economyRate: number = revenue > 0 ? (balance / revenue) * 100 : 0;
    const budgetPercentage: number = monthlyLimit > 0 ? Math.min(100, Math.round((expenses / monthlyLimit) * 100)) : 0;

    return { revenue, expenses, balance, economyRate, budgetPercentage };
  }, [currentMonthTransactions, monthlyLimit]);

  const startRecording = async () => {
    if (!micPermissionGranted) { setShowMicPrompt(true); return; }
    try {
      transcriptRef.current = ''; setChatInput('');
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
          handleAiChat(transcriptRef.current || chatInput, base64);
        };
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { console.error("Mic error:", err); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const requestMicAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionGranted(true);
      localStorage.setItem('nexus_mic_permission', 'true');
      setShowMicPrompt(false);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) { setShowMicPrompt(false); }
  };

  if (!isLoaded) return null;

  if (isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <Card className="w-full max-w-md bg-neutral-950 border-neutral-900 p-12 space-y-10 backdrop-blur-3xl shadow-[0_0_120px_rgba(212,175,55,0.08)] rounded-[3rem]">
          <div className="text-center space-y-6">
            <VWalletLogo className="w-28 h-28 mx-auto mb-2" />
            <h1 className="text-6xl text-chique tracking-tighter uppercase font-black text-white italic">VWallet</h1>
            <p className="text-neutral-500 text-[12px] uppercase tracking-[0.6em] font-bold italic opacity-60">Sincronização de Ativos</p>
          </div>
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[12px] text-neutral-600 uppercase font-bold tracking-[0.4em] block text-center">Identificação do Titular</label>
              <input 
                type="text" 
                placeholder="Insira seu nome" 
                value={userName} 
                onChange={e => { setUserName(e.target.value); if (e.target.value.trim()) setOnboardingError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleStartSession()}
                className={`w-full bg-black/50 border-b-2 ${onboardingError ? 'border-red-600' : 'border-neutral-800'} focus:border-[#d4af37] p-4 text-lg font-bold text-center transition-all outline-none italic`}
              />
            </div>
            {onboardingError && (
              <p className="text-[10px] text-red-500 uppercase tracking-widest text-center animate-pulse flex items-center justify-center gap-1 font-bold">
                <AlertCircle size={12} /> {onboardingError}
              </p>
            )}
          </div>
          <button 
            onClick={handleStartSession}
            className="w-full py-7 bg-gradient-to-r from-[#b8860b] to-[#d4af37] text-black uppercase tracking-[0.5em] text-[12px] font-black rounded-full hover:scale-[1.03] active:scale-95 transition-all shadow-3xl"
          >
            Acessar Sistema
          </button>
        </Card>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const activeGoalsCount = goals.filter(g => !g.completed).length;
  const completedGoalsCount = goals.filter(g => g.completed).length;

  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(viewDate);
  }, [viewDate]);

  const activeItemsCount = tasks.filter(t => !t.completed).length;

  const mostDone = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return { title: 'Nenhuma', count: 0 };
    
    const counts = completedTasks.reduce((acc: Record<string, number>, t) => {
      acc[t.title] = (acc[t.title] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let maxTitle = '';
    let maxCount = 0;
    for (const [title, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxTitle = title;
      }
    }
    return { title: maxTitle, count: maxCount };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-bold overflow-hidden selection:bg-[#d4af37] selection:text-black">
      {/* Sidebar Lux */}
      <aside className="hidden lg:flex flex-col w-80 border-r border-neutral-900 p-12 bg-black/95 backdrop-blur-3xl shadow-2xl">
        <div className="flex flex-col items-center gap-8 mb-20">
          <VWalletLogo className="w-24 h-24" />
          <span className="text-3xl text-chique tracking-tighter uppercase font-black text-white italic">VWallet</span>
        </div>
        <nav className="space-y-5 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
            { id: 'finances', icon: Wallet, label: 'Finanças' },
            { id: 'tasks', icon: CheckSquare, label: 'Tarefas' },
            { id: 'goals', icon: Flag, label: 'Metas' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-6 px-10 py-6 rounded-full uppercase text-[12px] tracking-[0.4em] font-black transition-all ${
                activeTab === item.id ? 'bg-[#d4af37] text-black shadow-2xl' : 'text-neutral-500 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 sm:p-16 max-w-7xl mx-auto w-full pb-32 lg:pb-16 overflow-y-auto h-screen no-scrollbar relative">
        {activeTab === 'dashboard' && (
          <div className="space-y-20 animate-in fade-in duration-1000">
            <header className="flex flex-col sm:flex-row justify-between items-start gap-12">
              <div className="space-y-6">
                <h2 className="text-5xl lg:text-8xl text-chique tracking-tighter font-black italic">Olá, <span className="text-[#d4af37]">{userName}</span></h2>
                <p className="text-[12px] text-neutral-600 uppercase tracking-[0.7em] font-black">
                  Sincronização: {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button 
                onClick={() => setIsAiOpen(true)}
                className="flex items-center gap-6 px-14 py-8 bg-neutral-950 border border-[#d4af37]/30 text-white rounded-full font-black uppercase text-[12px] tracking-[0.5em] shadow-3xl hover:bg-[#d4af37] hover:text-black transition-all group w-full sm:w-auto text-center justify-center"
              >
                <Bot size={24} className="group-hover:rotate-12 transition-transform" /> Falar com Nero
              </button>
            </header>

            {/* Dash Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <Card className="relative overflow-hidden group border-neutral-900 hover:border-[#d4af37]/40 transition-all p-14 bg-neutral-950/60 shadow-3xl rounded-[3.5rem]">
                <Wallet className="absolute -right-16 -top-16 opacity-5 group-hover:opacity-10 transition-opacity rotate-12" size={220} />
                <h4 className="text-[14px] text-neutral-600 uppercase tracking-[0.6em] mb-8 font-black font-header-lux">Capital Disponível</h4>
                <div className="flex items-center gap-6">
                  <div className="text-7xl text-chique tracking-tighter font-black italic">R$ <AnimatedNumber value={stats.balance} /></div>
                  <button onClick={() => { setTempBalance(stats.balance.toString()); setIsEditingBalance(true); }} className="p-5 text-neutral-700 hover:text-[#d4af37] transition-colors bg-neutral-900/50 rounded-full border border-neutral-800"><Edit2 size={20} /></button>
                </div>
              </Card>

              <Card className="p-14 bg-neutral-950/60 shadow-3xl rounded-[3.5rem] border-neutral-900">
                <h4 className="text-[14px] text-neutral-600 uppercase tracking-[0.6em] mb-8 font-black font-header-lux">Performance Nero</h4>
                <div className="text-7xl text-chique tracking-tighter font-black italic">
                  {stats.xp} <span className="text-sm text-neutral-600 uppercase tracking-widest ml-3 font-black">XP</span>
                </div>
                <div className="mt-10 h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-[#b8860b] to-[#d4af37] transition-all duration-1000" style={{ width: `${(stats.xp % 2000) / 20}%` }} />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              <div className="bg-neutral-950 border border-neutral-900 rounded-[4rem] p-16 flex flex-col shadow-3xl">
                <h3 className="text-xl font-black uppercase tracking-[0.4em] text-white mb-12 border-b border-neutral-900 pb-8 font-header-lux italic">Daily Objectives</h3>
                <div className="space-y-10 flex-1">
                  {tasks.slice(0, 4).map((task) => (
                    <div key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-10 group cursor-pointer transition-all">
                      <div className={`w-10 h-10 rounded-full border-4 transition-all flex items-center justify-center shrink-0 ${task.completed ? 'bg-[#d4af37] border-[#d4af37]' : 'border-neutral-800 group-hover:border-neutral-600'}`}>
                        {task.completed && <Check size={20} className="text-black" strokeWidth={5} />}
                      </div>
                      <span className={`text-2xl font-bold tracking-tight transition-all uppercase italic ${task.completed ? 'text-neutral-700 line-through' : 'text-neutral-200'}`}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="text-center text-neutral-800 uppercase tracking-[0.6em] py-14 text-[12px] font-black italic">Pendente de comandos.</p>}
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-900 rounded-[4rem] p-16 flex flex-col items-center justify-center relative shadow-3xl">
                <div className="absolute top-16 left-16 flex items-center gap-5">
                  <Zap size={24} className="text-[#d4af37]" />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.6em] text-neutral-600 font-header-lux">Core Metrics</h3>
                </div>
                <RadarScoreChart data={[
                  { label: 'Foco', value: totalCount > 0 ? (completedCount / totalCount) * 100 : 0, color: '#d4af37' },
                  { label: 'Fluxo', value: Math.min(100, (stats.balance / 10000) * 100), color: '#d4af37' },
                  { label: 'Ação', value: Math.min(100, (stats.xp / 5000) * 100), color: '#d4af37' },
                  { label: 'Metas', value: goals.length > 0 ? (completedGoalsCount / goals.length) * 100 : 0, color: '#d4af37' },
                  { label: 'Nero', value: 85, color: '#d4af37' }
                ]} size={360} />
              </div>
            </div>
          </div>
        )}

        {/* --- Aba Finanças (Estilo Serif Bold) --- */}
        {activeTab === 'finances' && (
          <div className="space-y-16 animate-in fade-in duration-1000">
            <header className="flex flex-col items-center gap-12">
              <VWalletLogo className="w-32 h-32" />
              <div className="flex items-center gap-16">
                <button onClick={() => changeMonth(-1)} className="p-6 bg-neutral-900/50 rounded-full hover:bg-neutral-800 transition-all border border-neutral-800 shadow-xl">
                  <ChevronLeft className="text-neutral-500" size={32} />
                </button>
                <div className="text-center">
                  <h2 className="text-5xl text-chique tracking-tighter uppercase font-black italic">
                    {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(viewDate)}
                  </h2>
                </div>
                <button onClick={() => changeMonth(1)} className="p-6 bg-neutral-900/50 rounded-full hover:bg-neutral-800 transition-all border border-neutral-800 shadow-xl">
                  <ChevronRight className="text-neutral-500" size={32} />
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-neutral-950 border border-emerald-900/30 rounded-[3.5rem] p-14 shadow-3xl relative group">
                <TrendingUp className="absolute top-12 right-12 text-emerald-800 opacity-20 group-hover:opacity-40 transition-opacity" size={70} />
                <p className="text-[14px] text-emerald-500/60 font-black uppercase tracking-[0.7em] mb-6">CRÉDITOS</p>
                <h3 className="text-6xl text-chique font-black text-emerald-500 italic">R$ {monthlyStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>

              <div className="bg-neutral-950 border border-rose-900/30 rounded-[3.5rem] p-14 shadow-3xl relative group">
                <TrendingDown className="absolute top-12 right-12 text-rose-800 opacity-20 group-hover:opacity-40 transition-opacity" size={70} />
                <p className="text-[14px] text-rose-500/60 font-black uppercase tracking-[0.7em] mb-6">DÉBITOS</p>
                <h3 className="text-6xl text-chique font-black text-rose-500 italic">R$ {monthlyStats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>

              <Card className="bg-neutral-950/90 border-neutral-800/60 rounded-[4rem] p-14 shadow-3xl md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-16">
                <div className="flex items-center gap-10">
                   <div className="w-24 h-24 bg-[#d4af37]/10 rounded-full flex items-center justify-center border border-[#d4af37]/20 shadow-2xl">
                      <Wallet className="text-[#d4af37]" size={40} />
                   </div>
                   <div>
                      <p className="text-[14px] text-neutral-600 font-black uppercase tracking-[0.6em] mb-3 font-header-lux">BALANÇO PATRIMONIAL</p>
                      <h3 className="text-6xl text-chique font-black text-white italic">R$ {(initialReserve + monthlyStats.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                   </div>
                </div>
                <div className="flex gap-8 items-center">
                  <div className="text-right">
                    <p className="text-[12px] text-neutral-700 font-black uppercase tracking-[0.5em] mb-2 italic">RESERVA INICIAL</p>
                    <p className="text-2xl font-black text-neutral-400 italic">R$ {initialReserve.toLocaleString('pt-BR')}</p>
                  </div>
                  <button onClick={() => {
                    const val = prompt("Definir Reserva:", initialReserve.toString());
                    if (val) setInitialReserve(Number(val));
                  }} className="p-6 bg-neutral-900 rounded-3xl hover:bg-[#d4af37] hover:text-black transition-all border border-neutral-800 shadow-xl"><Pencil size={24}/></button>
                </div>
              </Card>
            </div>

            <div className="bg-neutral-950 border border-neutral-900 rounded-[4rem] p-20 shadow-3xl">
               <CategoryExpensesChart transactions={currentMonthTransactions} />
            </div>

            <button onClick={() => setActiveTab('finances_new')} className="w-full py-10 bg-gradient-to-r from-[#b8860b] to-[#d4af37] text-black rounded-full font-black uppercase tracking-[0.6em] text-[14px] hover:scale-[1.02] active:scale-95 transition-all shadow-4xl flex items-center justify-center gap-8">
               <Plus size={32} strokeWidth={5} /> Novo Lançamento Estratégico
            </button>
          </div>
        )}

        {/* ... Seção de Tarefas Serif Bold ... */}
        {activeTab === 'tasks' && (
          <div className="space-y-16 animate-in fade-in duration-1000">
             <header className="space-y-12">
              <h2 className="text-6xl text-chique tracking-tighter font-black uppercase italic">Protocolo de Rotina</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                <div className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-12 flex items-center gap-10 shadow-2xl">
                  <div className="w-20 h-20 rounded-[2rem] bg-rose-500/5 flex items-center justify-center border border-rose-500/10 shadow-inner">
                    <TargetIcon size={32} className="text-rose-700" />
                  </div>
                  <div>
                    <p className="text-[12px] text-neutral-700 uppercase font-black tracking-[0.6em] mb-3 font-header-lux">DIRETRIZ COMUM</p>
                    <p className="text-2xl font-black text-white uppercase italic">{mostDone.title}</p>
                    <p className="text-[12px] text-neutral-600 font-black uppercase tracking-widest italic">{mostDone.count} execuções</p>
                  </div>
                </div>

                <div className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-12 flex items-center gap-10 shadow-2xl">
                  <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 shadow-inner">
                    <Calendar size={32} className="text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-[12px] text-neutral-700 uppercase font-black tracking-[0.6em] mb-3 font-header-lux">CICLO ATIVO</p>
                    <p className="text-2xl font-black text-white uppercase italic">{currentMonthName}</p>
                    <p className="text-[12px] text-neutral-600 font-black uppercase tracking-widest italic">{activeItemsCount} comandos</p>
                  </div>
                </div>
              </div>
            </header>

            <Card className="rounded-[4rem] p-20 bg-neutral-950 border-neutral-900 shadow-4xl">
              <div className="flex gap-8 mb-16">
                <input 
                  id="new-task-input"
                  type="text" 
                  placeholder="Defina um novo comando de performance..." 
                  className="flex-1 bg-black/50 border-b-2 border-neutral-800 p-8 text-2xl font-black outline-none focus:border-[#d4af37] transition-all italic" 
                  value={newTaskTitle} 
                  onChange={e => setNewTaskTitle(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && newTaskTitle.trim()) { setTasks(prev => [{ id: Date.now().toString(), title: newTaskTitle, priority: Priority.MEDIUM, completed: false, xpValue: 20 }, ...prev]); setNewTaskTitle(''); } }} 
                />
                <button onClick={() => { if (newTaskTitle.trim()) { setTasks(prev => [{ id: Date.now().toString(), title: newTaskTitle, priority: Priority.MEDIUM, completed: false, xpValue: 20 }, ...prev]); setNewTaskTitle(''); } }} className="p-8 bg-[#d4af37] text-black rounded-[2.5rem] hover:bg-[#b8860b] active:scale-90 transition-all shadow-3xl flex items-center justify-center min-w-[100px]"><Plus size={40} strokeWidth={5} /></button>
              </div>
              <div className="space-y-8">
                {tasks.map(task => (
                  <div key={task.id} onClick={() => toggleTask(task.id)} className={`p-10 border rounded-[2.5rem] flex items-center gap-10 cursor-pointer transition-all ${task.completed ? 'opacity-30 bg-neutral-950/30 border-neutral-900' : 'border-neutral-900 hover:border-[#d4af37]/40 hover:bg-neutral-900/60 shadow-xl'}`}>
                    <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all ${task.completed ? 'bg-[#d4af37] border-[#d4af37]' : 'border-neutral-800'}`}>
                      {task.completed && <Check size={20} className="text-black" strokeWidth={6} />}
                    </div>
                    <span className={`text-2xl uppercase font-black tracking-tight flex-1 italic ${task.completed ? 'line-through text-neutral-600' : 'text-neutral-200'}`}>{task.title}</span>
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-center text-neutral-800 uppercase tracking-[0.8em] py-24 text-[12px] font-black italic">Sem comandos.</p>}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* CHAT NERO (Estilo Formal Serif Bold) */}
      {isAiOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-12 lg:right-12 lg:w-[520px] lg:h-[860px] bg-black border border-neutral-900 lg:rounded-[4.5rem] flex flex-col z-[500] shadow-[0_40px_180px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-12 duration-1000 overflow-hidden">
          <div className="p-12 border-b border-neutral-900 flex justify-between items-center bg-black/95 backdrop-blur-3xl shadow-lg">
            <div className="flex items-center gap-8">
              <div className="relative">
                <div className="w-4 h-4 bg-[#d4af37] rounded-full animate-pulse shadow-[0_0_30px_#d4af37]" />
                <div className="absolute inset-0 bg-[#d4af37] rounded-full animate-ping opacity-10" />
              </div>
              <div className="flex flex-col"><span className="uppercase text-[16px] tracking-[0.6em] font-black font-header-lux italic">Nero AI</span><span className="text-[10px] text-neutral-600 uppercase font-black tracking-[0.4em] italic">Conexão Vital 5.0</span></div>
            </div>
            <button onClick={() => setIsAiOpen(false)} className="text-neutral-600 hover:text-white transition-colors bg-neutral-950 p-5 rounded-[2rem] border border-neutral-900 shadow-inner"><X size={28} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-12 space-y-10 no-scrollbar bg-neutral-950/30">
            {messages.length === 0 && (
              <div className="text-center py-36 space-y-12 animate-in fade-in zoom-in-95 duration-1000">
                <ShieldCheck className="mx-auto text-[#d4af37] opacity-10" size={120} />
                <div className="space-y-6">
                   <p className="text-[12px] text-neutral-700 uppercase tracking-[0.8em] font-black font-header-lux">Protocolo Nero Operacional</p>
                   <p className="text-lg text-neutral-500 font-black px-16 leading-relaxed italic opacity-70">"Nero, registre entrada de R$ 10.000 de dividendos"<br/>"Nova meta: Aquisição de imóvel em 24 meses"</p>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-8 duration-500`}>
                <div className={`max-w-[95%] p-10 rounded-[3rem] text-lg tracking-tight leading-relaxed font-black italic shadow-2xl ${m.role === 'user' ? 'bg-[#d4af37] text-black' : m.role === 'system' ? 'bg-neutral-900 text-neutral-700 text-[11px] uppercase text-center w-full rounded-3xl' : 'bg-neutral-950 border border-neutral-900 text-white'}`}>{m.text}</div>
              </div>
            ))}
            {isAiLoading && <div className="text-[#d4af37] animate-pulse text-[12px] uppercase font-black px-10 flex items-center gap-6 font-header-lux italic"><Loader2 className="animate-spin" size={24} /> Sincronizando comandos Nero...</div>}
          </div>
          <div className="p-12 border-t border-neutral-900 space-y-10 bg-neutral-950/95 backdrop-blur-3xl pb-24 lg:pb-20 shadow-[0_-50px_100px_rgba(0,0,0,0.8)]">
            <div className="flex gap-6 items-center">
              <input type="text" placeholder="Dite comandos para Nero..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim()) handleAiChat(chatInput); }} className="flex-1 bg-black border border-neutral-900 p-8 rounded-[2rem] text-lg font-black italic transition-all placeholder:text-neutral-800 focus:border-[#d4af37] outline-none shadow-inner" />
              <button onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`p-8 rounded-[2rem] transition-all shadow-3xl ${isRecording ? 'bg-rose-800 text-white animate-pulse' : 'bg-neutral-900 text-neutral-600 hover:text-[#d4af37] border border-neutral-800'}`}><Mic size={34} /></button>
              <button onClick={() => chatInput.trim() && handleAiChat(chatInput)} className="p-8 bg-[#d4af37] text-black rounded-[2rem] shadow-3xl hover:bg-[#b8860b] transition-all"><Send size={34} strokeWidth={5} /></button>
            </div>
            <p className="text-[11px] text-neutral-800 text-center uppercase tracking-[1em] font-black font-header-lux italic">{isRecording ? "NERO EM ESCUTA" : "NERO AGUARDA PROTOCOLO"}</p>
          </div>
        </div>
      )}

      {/* MOBILE NAV (Lux Bold) */}
      {!isAiOpen && (
        <nav className="lg:hidden fixed bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-neutral-950/95 backdrop-blur-3xl border border-neutral-900 p-6 rounded-full z-[400] shadow-[0_50px_120px_rgba(0,0,0,1)]">
          {[ { id: 'dashboard', icon: LayoutDashboard }, { id: 'finances', icon: Wallet }, { id: 'tasks', icon: CheckSquare }, { id: 'goals', icon: Flag } ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`p-6 rounded-full transition-all active:scale-90 ${activeTab === item.id ? 'bg-[#d4af37] text-black shadow-3xl' : 'text-neutral-700'}`}><item.icon size={32} /></button>
          ))}
          <div className="w-[1px] h-16 bg-neutral-900 mx-4" />
          <button onClick={() => setIsAiOpen(true)} className="p-6 rounded-full bg-[#d4af37]/5 text-[#d4af37] border border-[#d4af37]/10 active:scale-90 shadow-2xl"><Bot size={32} /></button>
        </nav>
      )}
    </div>
  );
};
