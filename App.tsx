
import React, { useState, useEffect, useRef } from 'react';
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
  Calendar
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

// Fix: Exported App component as a named constant to match the import in index.tsx
export const App: React.FC = () => {
  // --- Estados Core ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<UserStats>({ xp: 0, rank: Rank.INICIANTE, level: 1, totalRevenue: 0, totalExpenses: 0, balance: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  // --- Estados do Nexus AI Chat ---
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

  // --- Estados de Edição de Saldo ---
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState('');

  // --- Estados de Nova Meta ---
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalUnit, setNewGoalUnit] = useState('');

  // --- Outros Estados UI ---
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTransDesc, setNewTransDesc] = useState('');
  const [newTransAmount, setNewTransAmount] = useState('');
  const [newTransType, setNewTransType] = useState<'REVENUE' | 'EXPENSE'>('REVENUE');
  const [isClassifying, setIsClassifying] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState('Outros');

  // --- Inicialização da Transcrição de Áudio (Browser API) ---
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

  // --- Efeitos de Persistência ---
  useEffect(() => {
    const savedName = localStorage.getItem('nexus_user_name');
    const savedStats = localStorage.getItem('nexus_user_stats');
    const savedTasks = localStorage.getItem('nexus_user_tasks');
    const savedTransactions = localStorage.getItem('nexus_user_transactions');
    const savedGoals = localStorage.getItem('nexus_user_goals');
    const savedMicPerm = localStorage.getItem('nexus_mic_permission');
    
    if (savedMicPerm === 'true') setMicPermissionGranted(true);

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
    }
  }, [stats, tasks, transactions, goals]);

  // --- Lógica de Ações do Nexus AI ---
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

    setMessages(prev => [...prev, { role: 'ai', text: result.text || "Comando processado com sucesso pelo Nexus." }]);
    setIsAiLoading(false);
    setChatInput('');
  };

  // --- Gestão de Áudio ---
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

  // --- Handlers Financeiros ---
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

  if (!isLoaded) return null;

  if (isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white font-black">
        <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 p-8 space-y-6">
          <div className="text-center">
            <Sparkles className="mx-auto text-[#ffae00] mb-4" size={48} />
            <h1 className="text-3xl tracking-tighter uppercase font-black">Nexus Core</h1>
            <p className="text-neutral-500 text-xs mt-2 uppercase tracking-widest font-bold">Inicie sua jornada de elite</p>
          </div>
          <input 
            type="text" 
            placeholder="Seu nome" 
            value={userName} 
            onChange={e => setUserName(e.target.value)}
            className="w-full bg-black border-2 border-neutral-800 focus:border-[#ffae00] p-4 rounded-xl outline-none font-bold text-center"
          />
          <button 
            onClick={() => setIsOnboarding(false)}
            className="w-full py-4 bg-[#ffae00] text-black uppercase tracking-widest rounded-xl hover:bg-[#ff8800] font-black transition-colors"
          >
            Acessar Sistema
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

  const weeklyTasksData = [4, 2, 5, 8, 3, 7, 6];

  // Logic for the summary cards in "ROTINA"
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

  // Date formatting for the Progress Card
  const now = new Date();
  const dayName = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dayNumber = now.getDate();
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
  const formattedToday = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dayNumber} De ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
  
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-black overflow-hidden selection:bg-[#ffae00] selection:text-black">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-neutral-900 p-6 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-12">
          <Sparkles className="text-[#ffae00]" />
          <span className="text-xl tracking-tighter font-black uppercase">Nexus OS</span>
        </div>
        <nav className="space-y-2 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
            { id: 'finances', icon: Wallet, label: 'Finanças' },
            { id: 'tasks', icon: CheckSquare, label: 'Tarefas' },
            { id: 'goals', icon: Flag, label: 'Metas' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all ${
                activeTab === item.id ? 'bg-[#ffae00] text-black shadow-[0_0_15px_rgba(255,174,0,0.3)]' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full pb-32 lg:pb-8 overflow-y-auto h-screen no-scrollbar relative">
        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* Boas-vindas e Botão AI */}
            <header className="space-y-6">
              <div>
                <h2 className="text-4xl lg:text-6xl tracking-tighter font-black">Bem-vindo, <span className="text-[#ffae00] uppercase">{userName}</span></h2>
                <p className="text-[11px] text-neutral-500 uppercase tracking-widest mt-2 font-black">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              <button 
                onClick={() => setIsAiOpen(true)}
                className="flex items-center gap-3 px-8 py-5 bg-[#ffae00] text-black rounded-2xl font-black uppercase text-[12px] tracking-[0.25em] shadow-[0_15px_30px_rgba(255,174,0,0.15)] hover:bg-[#ff8800] hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto text-center justify-center"
              >
                <Bot size={22} /> Falar com Nexus AI
              </button>
            </header>

            {/* SEÇÃO DE MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="relative overflow-hidden group border-neutral-800/50 hover:border-[#ffae00]/30 transition-all p-8 bg-neutral-950/20 shadow-xl">
                <Wallet className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity" size={100} />
                <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.3em] mb-3 font-black">Quanto você tem na conta?</h4>
                <div className="flex items-center gap-4">
                  {isEditingBalance ? (
                    <div className="flex gap-2 w-full animate-in zoom-in-95">
                      <input autoFocus type="text" value={tempBalance} onChange={e => setTempBalance(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualBalanceUpdate()} className="flex-1 bg-black border-b-2 border-[#ffae00] p-2 text-2xl font-black outline-none" />
                      <button onClick={handleManualBalanceUpdate} className="p-3 bg-[#ffae00] text-black rounded-xl"><Check size={20}/></button>
                      <button onClick={() => setIsEditingBalance(false)} className="p-3 bg-neutral-800 text-neutral-400 rounded-xl"><X size={20}/></button>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl tracking-tighter font-black">R$ <AnimatedNumber value={stats.balance} /></div>
                      <button onClick={() => { setTempBalance(stats.balance.toString()); setIsEditingBalance(true); }} className="p-2.5 text-neutral-600 hover:text-[#ffae00] transition-colors bg-neutral-950/50 rounded-xl border border-neutral-800" title="Editar Saldo Manualmente"><Edit2 size={18} /></button>
                    </>
                  )}
                </div>
              </Card>

              <Card className="p-8 bg-neutral-950/20 shadow-xl">
                <h4 className="text-[10px] text-neutral-500 uppercase tracking-[0.3em] mb-3 font-black">Nível de Engajamento</h4>
                <div className="text-4xl tracking-tighter font-black">
                  {stats.xp} <span className="text-sm text-neutral-500 uppercase tracking-widest ml-1">XP</span>
                </div>
                <div className="mt-4 h-1.5 bg-black rounded-full overflow-hidden border border-neutral-800">
                  <div className="h-full bg-[#ffae00] transition-all duration-1000" style={{ width: `${(stats.xp % 2000) / 20}%` }} />
                </div>
              </Card>
            </div>

            {/* SEÇÃO CONTEXTUAL */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-8 animate-in slide-in-from-top-4 duration-700 min-h-[300px] flex flex-col shadow-2xl">
                <h3 className="text-[14px] font-black uppercase tracking-[0.1em] text-white mb-6">RESUMO DO DIA</h3>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-neutral-500" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500">TAREFAS</span>
                  </div>
                  <span className="text-[11px] font-black text-neutral-500">{completedCount}/{totalCount}</span>
                </div>
                <div className="space-y-6 flex-1">
                  {totalCount === 0 ? (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-neutral-800 rounded-2xl">
                      <p className="text-[10px] text-neutral-600 uppercase font-black tracking-[0.2em]">Sem tarefas ativas</p>
                    </div>
                  ) : (
                    displayedTasks.map((task) => (
                      <div key={task.id} onClick={() => toggleTask(task.id)} className="flex items-center gap-5 group cursor-pointer">
                        <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${task.completed ? 'bg-[#ffae00] border-[#ffae00] shadow-[0_0_10px_rgba(255,174,0,0.3)]' : 'border-neutral-800 group-hover:border-neutral-600'}`}>
                          {task.completed && <Check size={14} className="text-black" />}
                        </div>
                        <span className={`text-[14px] font-bold tracking-tight transition-all ${task.completed ? 'text-neutral-600 line-through' : 'text-neutral-200'}`}>
                          {task.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {remainingCount > 0 && (
                  <button onClick={() => setActiveTab('tasks')} className="w-full text-center mt-6 pt-4 border-t border-neutral-800/50">
                    <span className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.2em] hover:text-white transition-colors">+{remainingCount} tarefas</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-8">
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden animate-in slide-in-from-right-4 duration-1000 shadow-2xl h-full">
                  <div className="absolute top-8 left-8 flex items-center gap-2">
                    <Zap size={16} className="text-[#ffae00]" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-400">VISÃO GERAL</h3>
                  </div>
                  <RadarScoreChart data={radarData} size={280} />
                </div>
              </div>
            </div>

            {/* SEÇÃO DE HISTÓRICO E METAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-6 duration-1000">
               <Card className="p-8 shadow-2xl bg-neutral-900/40">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <BarChart3 size={20} className="text-[#ff0000]" />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">HISTÓRICO DE TAREFAS (SÁB-SEX)</h3>
                    </div>
                  </div>
                  <WeeklyTaskChart data={weeklyTasksData} />
               </Card>

               <div className="flex flex-col gap-8">
                  <Card className="p-8 shadow-2xl bg-neutral-900/40">
                    <GoalProgressCard activeCount={activeGoalsCount} completedCount={completedGoalsCount} />
                  </Card>
                  
                  <Card className="p-8 shadow-2xl bg-neutral-900/40">
                    <WeeklyExpensesChart data={getWeeklyExpenses()} />
                  </Card>

                  <Card className="p-8 shadow-2xl bg-neutral-900/40">
                    <CategoryExpensesChart transactions={transactions} />
                  </Card>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
