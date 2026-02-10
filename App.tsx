
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

const VWalletLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <div className="relative transform hover:scale-105 transition-transform duration-700">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
        <path d="M20,30 Q35,85 50,85 Q65,85 80,30" fill="none" stroke="url(#v-gradient)" strokeWidth="14" strokeLinecap="round" />
        <circle cx="50" cy="35" r="22" fill="url(#coin-gradient)" />
        <text x="50" y="44" textAnchor="middle" fill="#2a1a00" fontSize="24" fontWeight="900" style={{ fontFamily: 'sans-serif' }}>$</text>
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

  // --- Memoized Values ---
  
  const currentMonthTransactions = useMemo((): Transaction[] => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }, [transactions, viewDate]);

  // Fix: Explicitly handle types and simplify calculations to resolve 'unknown' inference issues.
  // Using unique variable names and Number() conversion for state-derived values.
  const monthlyStats = useMemo(() => {
    let revenueSum: number = 0;
    let expensesSum: number = 0;
    currentMonthTransactions.forEach((t: Transaction) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'REVENUE') revenueSum += amt;
      else expensesSum += amt;
    });
    const balanceValue: number = revenueSum - expensesSum;
    const economyRateValue: number = revenueSum > 0 ? (balanceValue / revenueSum) * 100 : 0;
    const limit: number = Number(monthlyLimit) || 0;
    const budgetPercentageValue: number = limit > 0 ? Math.min(100, Math.round((expensesSum / limit) * 100)) : 0;
    
    return { 
      revenue: revenueSum, 
      expenses: expensesSum, 
      balance: balanceValue, 
      economyRate: economyRateValue, 
      budgetPercentage: budgetPercentageValue 
    };
  }, [currentMonthTransactions, monthlyLimit]);

  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(viewDate);
  }, [viewDate]);

  const activeItemsCount = useMemo(() => tasks.filter(t => !t.completed).length, [tasks]);

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

  const completedCount = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const totalCount = useMemo(() => tasks.length, [tasks]);
  const completedGoalsCount = useMemo(() => goals.filter(g => g.completed).length, [goals]);

  // --- Effects ---
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
  }, [stats, tasks, transactions, goals, monthlyLimit, initialReserve, isOnboarding, isLoaded, userName]);

  // --- Handlers ---
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

  const triggerFireworks = (color = '#ffae00') => {
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: [color] });
  };

  const handleStartSession = () => {
    if (!userName.trim()) {
      setOnboardingError('Identificação mandatória.');
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

  // --- Early Returns ---
  if (!isLoaded) return null;

  if (isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 p-12 space-y-12 backdrop-blur-3xl shadow-3xl rounded-[2.5rem] border-opacity-50">
          <div className="text-center space-y-6">
            <VWalletLogo className="w-24 h-24 mx-auto mb-2" />
            <h1 className="text-5xl text-chique tracking-tighter uppercase font-black text-white">VWallet</h1>
            <p className="text-neutral-500 text-[10px] uppercase tracking-[0.5em] font-black opacity-60">Sincronização de Ativos</p>
          </div>
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] text-neutral-600 uppercase font-black tracking-[0.3em] block text-center">Identificação do Titular</label>
              <input 
                type="text" 
                placeholder="Insira seu nome" 
                value={userName} 
                onChange={e => { setUserName(e.target.value); if (e.target.value.trim()) setOnboardingError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleStartSession()}
                className={`w-full bg-black border-b-2 ${onboardingError ? 'border-red-600' : 'border-neutral-800'} focus:border-[#d4af37] p-4 text-xl font-black text-center transition-all outline-none`}
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
            className="btn-modern w-full py-6 bg-gradient-to-r from-[#b8860b] to-[#d4af37] text-black uppercase tracking-[0.5em] text-[11px] font-black rounded-full shadow-2xl"
          >
            Acessar Sistema
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-sans overflow-hidden selection:bg-[#d4af37] selection:text-black">
      {/* Sidebar - Modern Dark */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-neutral-900 p-10 bg-black/80 backdrop-blur-2xl">
        <div className="flex flex-col items-center gap-6 mb-16">
          <VWalletLogo className="w-16 h-16" />
          <span className="text-2xl text-chique tracking-tighter uppercase font-black text-white">VWallet</span>
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
              className={`w-full flex items-center gap-5 px-8 py-5 rounded-2xl uppercase text-[10px] tracking-[0.25em] font-black transition-all ${
                activeTab === item.id ? 'bg-[#d4af37] text-black shadow-xl' : 'text-neutral-500 hover:text-white hover:bg-neutral-900/50'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-12 max-w-7xl mx-auto w-full pb-32 lg:pb-12 overflow-y-auto h-screen no-scrollbar relative">
        {activeTab === 'dashboard' && (
          <div className="space-y-16 animate-in fade-in duration-1000">
            <header className="flex flex-col sm:flex-row justify-between items-start gap-8">
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-7xl text-modern-bold tracking-tight font-black">Olá, <span className="text-[#d4af37] uppercase">{userName}</span></h2>
                <p className="text-[10px] text-neutral-600 uppercase tracking-[0.6em] font-black">
                  Sincronização: {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button 
                onClick={() => setIsAiOpen(true)}
                className="btn-modern flex items-center gap-4 px-10 py-6 bg-neutral-900 border border-[#d4af37]/20 text-white rounded-full font-black uppercase text-[11px] tracking-[0.35em] shadow-2xl"
              >
                <Bot size={20} /> Falar com Nero
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <Card className="relative overflow-hidden group border-neutral-900 hover:border-[#d4af37]/30 transition-all p-12 bg-neutral-950/40 shadow-2xl rounded-[2.5rem]">
                <Wallet className="absolute -right-12 -top-12 opacity-5 group-hover:opacity-10 transition-opacity rotate-12" size={160} />
                <h4 className="text-[11px] text-neutral-600 uppercase tracking-[0.5em] mb-6 font-black">Capital Disponível</h4>
                <div className="flex items-center gap-5">
                  <div className="text-6xl text-modern-bold tracking-tighter font-black">R$ <AnimatedNumber value={stats.balance} /></div>
                  <button onClick={() => { setTempBalance(stats.balance.toString()); setIsEditingBalance(true); }} className="p-4 text-neutral-700 hover:text-[#d4af37] transition-colors bg-neutral-900/50 rounded-full border border-neutral-800"><Edit2 size={18} /></button>
                </div>
              </Card>

              <Card className="p-12 bg-neutral-950/40 shadow-2xl rounded-[2.5rem] border-neutral-900">
                <h4 className="text-[11px] text-neutral-600 uppercase tracking-[0.5em] mb-6 font-black">Performance Nero</h4>
                <div className="text-6xl text-modern-bold tracking-tighter font-black">
                  {stats.xp} <span className="text-sm text-neutral-600 uppercase tracking-widest ml-2 font-black">XP</span>
                </div>
                <div className="mt-8 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-[#b8860b] to-[#d4af37] transition-all duration-1000" style={{ width: `${(stats.xp % 2000) / 20}%` }} />
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              <div className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-12 flex flex-col shadow-2xl">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white mb-10 border-b border-neutral-900 pb-6 opacity-60">Daily Objectives</h3>
                <div className="space-y-8 flex-1">
                  {tasks.slice(0, 4).map((task) => (
                    <div key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-8 group cursor-pointer transition-all">
                      <div className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${task.completed ? 'bg-[#d4af37] border-[#d4af37]' : 'border-neutral-800 group-hover:border-neutral-500'}`}>
                        {task.completed && <Check size={16} className="text-black" strokeWidth={4} />}
                      </div>
                      <span className={`text-xl font-bold tracking-tight transition-all uppercase ${task.completed ? 'text-neutral-700 line-through' : 'text-neutral-200'}`}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="text-center text-neutral-800 uppercase text-[10px] tracking-widest py-10 font-black">Nenhum comando.</p>}
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-12 flex flex-col items-center justify-center relative shadow-2xl">
                <div className="absolute top-10 left-10 flex items-center gap-4">
                  <Zap size={20} className="text-[#d4af37]" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-neutral-600">Core Metrics</h3>
                </div>
                <RadarScoreChart data={[
                  { label: 'Foco', value: (totalCount as number) > 0 ? (completedCount / totalCount) * 100 : 0, color: '#d4af37' },
                  { label: 'Fluxo', value: Math.min(100, ((stats.balance as number) / 10000) * 100), color: '#d4af37' },
                  { label: 'Ação', value: Math.min(100, ((stats.xp as number) / 5000) * 100), color: '#d4af37' },
                  { label: 'Metas', value: goals.length > 0 ? (completedGoalsCount / goals.length) * 100 : 0, color: '#d4af37' },
                  { label: 'Nero', value: 85, color: '#d4af37' }
                ]} size={320} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finances' && (
          <div className="space-y-12 animate-in fade-in duration-1000">
            <header className="flex flex-col items-center gap-10">
              <VWalletLogo className="w-20 h-20" />
              <div className="flex items-center gap-10">
                <button onClick={() => changeMonth(-1)} className="p-4 bg-neutral-900/50 rounded-2xl hover:bg-neutral-800 transition-all border border-neutral-800">
                  <ChevronLeft className="text-neutral-500" size={24} />
                </button>
                <div className="text-center">
                  <h2 className="text-3xl text-modern-bold tracking-tight uppercase font-black">
                    {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(viewDate)}
                  </h2>
                </div>
                <button onClick={() => changeMonth(1)} className="p-4 bg-neutral-900/50 rounded-2xl hover:bg-neutral-800 transition-all border border-neutral-800">
                  <ChevronRight className="text-neutral-500" size={24} />
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-neutral-950 border border-emerald-900/20 rounded-[2.5rem] p-12 shadow-2xl relative group">
                <TrendingUp className="absolute top-10 right-10 text-emerald-800 opacity-20" size={60} />
                <p className="text-[11px] text-emerald-500/60 font-black uppercase tracking-[0.5em] mb-4">CRÉDITOS</p>
                <h3 className="text-5xl text-modern-bold font-black text-emerald-500">R$ {monthlyStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="bg-neutral-950 border border-rose-900/20 rounded-[2.5rem] p-12 shadow-2xl relative group">
                <TrendingDown className="absolute top-10 right-10 text-rose-800 opacity-20" size={60} />
                <p className="text-[11px] text-rose-500/60 font-black uppercase tracking-[0.5em] mb-4">DÉBITOS</p>
                <h3 className="text-5xl text-modern-bold font-black text-rose-500">R$ {monthlyStats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
            </div>

            <Card className="bg-neutral-950 border border-neutral-900 rounded-[3rem] p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex items-center gap-8">
                 <div className="w-16 h-16 bg-[#d4af37]/10 rounded-full flex items-center justify-center border border-[#d4af37]/10 shadow-xl">
                    <Wallet className="text-[#d4af37]" size={28} />
                 </div>
                 <div>
                    <p className="text-[11px] text-neutral-600 font-black uppercase tracking-[0.4em] mb-2">BALANÇO PATRIMONIAL</p>
                    <h3 className="text-5xl text-modern-bold font-black text-white">R$ {(initialReserve + monthlyStats.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                 </div>
              </div>
              <div className="flex gap-6 items-center">
                <div className="text-right">
                  <p className="text-[10px] text-neutral-700 font-black uppercase tracking-[0.3em] mb-1">RESERVA INICIAL</p>
                  <p className="text-xl font-black text-neutral-500">R$ {initialReserve.toLocaleString('pt-BR')}</p>
                </div>
                <button onClick={() => {
                  const val = prompt("Definir Reserva:", initialReserve.toString());
                  if (val) setInitialReserve(Number(val));
                }} className="p-4 bg-neutral-900 rounded-xl hover:bg-[#d4af37] hover:text-black transition-all border border-neutral-800"><Pencil size={20}/></button>
              </div>
            </Card>

            <button onClick={() => setActiveTab('finances_new')} className="btn-modern w-full py-8 bg-gradient-to-r from-[#b8860b] to-[#d4af37] text-black rounded-full font-black uppercase tracking-[0.5em] text-[12px] shadow-3xl flex items-center justify-center gap-6">
               <Plus size={28} strokeWidth={4} /> Novo Lançamento
            </button>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-12 animate-in fade-in duration-1000">
             <header className="space-y-10">
              <h2 className="text-5xl text-modern-bold tracking-tight font-black uppercase">Diretrizes de Performance</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="bg-neutral-950 border border-neutral-900 rounded-[2.5rem] p-10 flex items-center gap-8 shadow-xl">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-rose-500/10 flex items-center justify-center border border-rose-500/10 shadow-inner">
                    <TargetIcon size={28} className="text-rose-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-700 uppercase font-black tracking-[0.4em] mb-2">META FREQUENTE</p>
                    <p className="text-2xl font-black text-white uppercase">{mostDone.title}</p>
                    <p className="text-[11px] text-neutral-600 font-black uppercase tracking-widest">{mostDone.count} execuções</p>
                  </div>
                </div>
                <div className="bg-neutral-950 border border-neutral-900 rounded-[2.5rem] p-10 flex items-center gap-8 shadow-xl">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10 shadow-inner">
                    <Calendar size={28} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-700 uppercase font-black tracking-[0.4em] mb-2">CICLO ATIVO</p>
                    <p className="text-2xl font-black text-white uppercase">{currentMonthName}</p>
                    <p className="text-[11px] text-neutral-600 font-black uppercase tracking-widest">{activeItemsCount} pendências</p>
                  </div>
                </div>
              </div>
            </header>

            <Card className="rounded-[3rem] p-12 bg-neutral-950 border-neutral-900 shadow-3xl">
              <div className="flex gap-6 mb-12">
                <input 
                  id="new-task-input"
                  type="text" 
                  placeholder="Defina sua próxima missão..." 
                  className="flex-1 bg-black/50 border-b-2 border-neutral-800 p-6 text-xl font-black outline-none focus:border-[#d4af37] transition-all" 
                  value={newTaskTitle} 
                  onChange={e => setNewTaskTitle(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter' && newTaskTitle.trim()) { setTasks(prev => [{ id: Date.now().toString(), title: newTaskTitle, priority: Priority.MEDIUM, completed: false, xpValue: 20 }, ...prev]); setNewTaskTitle(''); } }} 
                />
                <button onClick={() => { if (newTaskTitle.trim()) { setTasks(prev => [{ id: Date.now().toString(), title: newTaskTitle, priority: Priority.MEDIUM, completed: false, xpValue: 20 }, ...prev]); setNewTaskTitle(''); } }} className="btn-modern p-6 bg-[#d4af37] text-black rounded-3xl shadow-2xl flex items-center justify-center min-w-[80px]"><Plus size={32} strokeWidth={4} /></button>
              </div>
              <div className="space-y-6">
                {tasks.map(task => (
                  <div key={task.id} onClick={() => toggleTask(task.id)} className={`p-8 border rounded-[2rem] flex items-center gap-8 cursor-pointer transition-all ${task.completed ? 'opacity-30 bg-neutral-950/30 border-neutral-900' : 'border-neutral-900 hover:border-[#d4af37]/40 hover:bg-neutral-900 shadow-xl'}`}>
                    <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${task.completed ? 'bg-[#d4af37] border-[#d4af37]' : 'border-neutral-800'}`}>
                      {task.completed && <Check size={16} className="text-black" strokeWidth={5} />}
                    </div>
                    <span className={`text-xl uppercase font-black tracking-tight flex-1 ${task.completed ? 'line-through text-neutral-700' : 'text-neutral-200'}`}>{task.title}</span>
                  </div>
                ))}
                {tasks.length === 0 && <p className="text-center text-neutral-800 uppercase tracking-[0.8em] py-20 text-[12px] font-black">Nenhum comando pendente.</p>}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* CHAT NERO - Modern Sans UI */}
      {isAiOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-12 lg:right-12 lg:w-[480px] lg:h-[840px] bg-black border border-neutral-900 lg:rounded-[3.5rem] flex flex-col z-[500] shadow-[0_40px_150px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-12 duration-1000 overflow-hidden">
          <div className="p-10 border-b border-neutral-900 flex justify-between items-center bg-black/95 backdrop-blur-3xl">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-3.5 h-3.5 bg-[#d4af37] rounded-full animate-pulse shadow-[0_0_25px_#d4af37]" />
                <div className="absolute inset-0 bg-[#d4af37] rounded-full animate-ping opacity-10" />
              </div>
              <div className="flex flex-col"><span className="uppercase text-[14px] tracking-[0.5em] font-black text-chique">Nero AI</span><span className="text-[10px] text-neutral-600 uppercase font-black tracking-[0.4em]">Sincronização Ativa 5.0</span></div>
            </div>
            <button onClick={() => setIsAiOpen(false)} className="text-neutral-600 hover:text-white transition-colors bg-neutral-950 p-4 rounded-3xl border border-neutral-900"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar bg-neutral-950/20">
            {messages.length === 0 && (
              <div className="text-center py-32 space-y-10 animate-in fade-in zoom-in-95 duration-1000">
                <ShieldCheck className="mx-auto text-[#d4af37] opacity-10" size={100} />
                <div className="space-y-5">
                   <p className="text-[11px] text-neutral-700 uppercase tracking-[0.7em] font-black">Terminal Nero Operacional</p>
                   <p className="text-sm text-neutral-500 font-black px-12 leading-relaxed opacity-70">"Nero, registre aporte de R$ 5.000 para investimentos"
"Priorize nova tarefa: Planejamento Q3"</p>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-6 duration-500`}>
                <div className={`max-w-[90%] p-8 rounded-[2rem] text-sm tracking-tight leading-relaxed font-black uppercase ${m.role === 'user' ? 'bg-[#d4af37] text-black shadow-2xl' : m.role === 'system' ? 'bg-neutral-900 text-neutral-700 text-[10px] text-center w-full rounded-2xl' : 'bg-neutral-950 border border-neutral-900 text-white shadow-xl'}`}>{m.text}</div>
              </div>
            ))}
            {isAiLoading && <div className="text-[#d4af37] animate-pulse text-[11px] uppercase font-black px-8 flex items-center gap-5 tracking-[0.4em]"><Loader2 className="animate-spin" size={20} /> Sincronizando com Nero...</div>}
          </div>
          <div className="p-10 border-t border-neutral-900 space-y-8 bg-neutral-950/95 backdrop-blur-3xl pb-24 lg:pb-16 shadow-[0_-40px_80px_rgba(0,0,0,0.7)]">
            <div className="flex gap-5 items-center">
              <input type="text" placeholder="Dite comandos para Nero..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && chatInput.trim()) handleAiChat(chatInput); }} className="flex-1 bg-black border border-neutral-800 p-6 rounded-3xl text-sm font-black transition-all placeholder:text-neutral-800 focus:border-[#d4af37] outline-none shadow-inner" />
              <button onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`p-6 rounded-3xl transition-all shadow-2xl ${isRecording ? 'bg-rose-700 text-white animate-pulse' : 'bg-neutral-900 text-neutral-600 hover:text-[#d4af37] border border-neutral-800'}`}><Mic size={30} /></button>
              <button onClick={() => chatInput.trim() && handleAiChat(chatInput)} className="btn-modern p-6 bg-[#d4af37] text-black rounded-3xl shadow-2xl"><Send size={30} strokeWidth={4} /></button>
            </div>
            <p className="text-[10px] text-neutral-800 text-center uppercase tracking-[0.8em] font-black">{isRecording ? "NERO EM ESCUTA" : "AGUARDANDO PROTOCOLO"}</p>
          </div>
        </div>
      )}

      {/* MOBILE NAV (Modern Sans) */}
      {!isAiOpen && (
        <nav className="lg:hidden fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-5 bg-neutral-950/95 backdrop-blur-3xl border border-neutral-900 p-5 rounded-full z-[400] shadow-[0_40px_100px_rgba(0,0,0,1)]">
          {[ { id: 'dashboard', icon: LayoutDashboard }, { id: 'finances', icon: Wallet }, { id: 'tasks', icon: CheckSquare }, { id: 'goals', icon: Flag } ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`p-5 rounded-full transition-all active:scale-90 ${activeTab === item.id ? 'bg-[#d4af37] text-black shadow-2xl' : 'text-neutral-700'}`}><item.icon size={28} /></button>
          ))}
          <div className="w-[1px] h-14 bg-neutral-900 mx-3" />
          <button onClick={() => setIsAiOpen(true)} className="p-5 rounded-full bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/10 active:scale-90 shadow-xl"><Bot size={28} /></button>
        </nav>
      )}
    </div>
  );
};
