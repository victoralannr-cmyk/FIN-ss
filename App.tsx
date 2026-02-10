
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
  Target,
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
  ShieldCheck
} from 'lucide-react';
import { Card } from './components/ui/Card';
import { AnimatedNumber } from './components/ui/AnimatedNumber';
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
import { processAICmd } from './services/geminiService';
import confetti from 'canvas-confetti';

interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  text: string;
}

const App: React.FC = () => {
  // --- Estados Core ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<UserStats>({ xp: 0, rank: Rank.INICIANTE, level: 1, totalRevenue: 0, totalExpenses: 0, balance: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  
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

  // --- Outros Estados UI ---
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTransDesc, setNewTransDesc] = useState('');
  const [newTransAmount, setNewTransAmount] = useState('');
  const [newTransType, setNewTransType] = useState<'REVENUE' | 'EXPENSE'>('REVENUE');

  // --- Efeitos de Persistência ---
  useEffect(() => {
    const savedName = localStorage.getItem('nexus_user_name');
    const savedStats = localStorage.getItem('nexus_user_stats');
    const savedTasks = localStorage.getItem('nexus_user_tasks');
    const savedTransactions = localStorage.getItem('nexus_user_transactions');
    const savedMicPerm = localStorage.getItem('nexus_mic_permission');
    
    if (savedMicPerm === 'true') setMicPermissionGranted(true);

    if (savedName) {
      setUserName(savedName);
      setIsOnboarding(false);
      if (savedStats) setStats(JSON.parse(savedStats));
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isOnboarding && isLoaded) {
      localStorage.setItem('nexus_user_name', userName);
      localStorage.setItem('nexus_user_stats', JSON.stringify(stats));
      localStorage.setItem('nexus_user_tasks', JSON.stringify(tasks));
      localStorage.setItem('nexus_user_transactions', JSON.stringify(transactions));
    }
  }, [stats, tasks, transactions]);

  // --- Lógica de Ações do Nexus AI ---
  const executeAiFunctions = (calls: any[]) => {
    calls.forEach(call => {
      const { name, args } = call;
      if (name === 'add_transaction') {
        const val = args.type === 'REVENUE' ? args.amount : -args.amount;
        handleAdjustBalance(val, args.description, args.category || 'Geral');
      } else if (name === 'update_balance') {
        setStats(prev => ({ ...prev, balance: args.amount }));
        triggerFireworks('#10b981');
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
    
    if (text && text !== "Comando de voz recebido") {
      setMessages(prev => [...prev, { role: 'user', text }]);
    } else if (audioBase64) {
      setMessages(prev => [...prev, { role: 'user', text: "🎤 Comando de áudio enviado" }]);
    }
    
    const result = await processAICmd(text, audioBase64);
    
    if (result.functionCalls) {
      executeAiFunctions(result.functionCalls);
    }

    setMessages(prev => [...prev, { role: 'ai', text: result.text || "Comando processado com sucesso pelo Nexus Core." }]);
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
          handleAiChat("Comando de voz recebido", base64);
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

  const triggerFireworks = (color = '#10b981') => {
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 }, colors: [color] });
  };

  if (!isLoaded) return null;

  if (isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white font-black">
        <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 p-8 space-y-6">
          <div className="text-center">
            <Sparkles className="mx-auto text-emerald-500 mb-4" size={48} />
            <h1 className="text-3xl tracking-tighter uppercase">Nexus Core</h1>
            <p className="text-neutral-500 text-xs mt-2 uppercase tracking-widest">Inicie sua jornada de elite</p>
          </div>
          <input 
            type="text" 
            placeholder="Seu nome" 
            value={userName} 
            onChange={e => setUserName(e.target.value)}
            className="w-full bg-black border-2 border-neutral-800 focus:border-emerald-500 p-4 rounded-xl outline-none"
          />
          <button 
            onClick={() => setIsOnboarding(false)}
            className="w-full py-4 bg-emerald-500 text-black uppercase tracking-widest rounded-xl hover:bg-emerald-400"
          >
            Acessar Sistema
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-black">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-neutral-900 p-6 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-12">
          <Sparkles className="text-emerald-500" />
          <span className="text-xl tracking-tighter">NEXUS</span>
        </div>
        <nav className="space-y-2 flex-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
            { id: 'finances', icon: Wallet, label: 'Finanças' },
            { id: 'tasks', icon: CheckSquare, label: 'Tarefas' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all ${
                activeTab === item.id ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800 text-[10px]">
          <div className="flex justify-between mb-1">
            <span className="text-emerald-500 font-black">NÍVEL {Math.floor(stats.xp / 200) + 1}</span>
            <span className="text-neutral-500">{stats.xp} XP</span>
          </div>
          <div className="h-1.5 bg-black rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(stats.xp % 200) / 2}%` }} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full pb-24 lg:pb-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header>
              <h2 className="text-3xl lg:text-5xl tracking-tighter">Olá, <span className="text-emerald-500">{userName}</span></h2>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-2 font-bold">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="relative overflow-hidden group">
                <Wallet className="absolute -right-4 -top-4 opacity-10" size={80} />
                <h4 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-black">Saldo Atual</h4>
                <div className="text-3xl tracking-tighter font-black">R$ <AnimatedNumber value={stats.balance} /></div>
              </Card>

              <Card>
                <h4 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 font-black">Pontuação XP</h4>
                <div className="text-3xl tracking-tighter font-black">{stats.xp} <span className="text-sm text-neutral-500 uppercase">PONTOS</span></div>
              </Card>

              <Card className="md:col-span-1 border-emerald-500/20 bg-emerald-500/5">
                <h4 className="text-[10px] text-emerald-500 uppercase tracking-widest mb-4 font-black">Nexus AI</h4>
                <button 
                  onClick={() => setIsAiOpen(true)}
                  className="w-full flex items-center justify-between p-3 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-all uppercase text-[10px] font-black"
                >
                  <Bot size={18} /> Iniciar Conversa
                </button>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'finances' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <header>
              <h2 className="text-3xl tracking-tighter font-black">Gestão <span className="text-emerald-500">Financeira</span></h2>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <Card>
                  <h4 className="text-[10px] text-neutral-400 uppercase tracking-widest mb-6 flex items-center gap-2 font-black"><Plus size={16} className="text-emerald-500" /> Novo Registro</h4>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Descrição (ex: Aluguel, Salário)" 
                      className="w-full bg-black border border-neutral-800 p-4 rounded-xl text-xs font-bold outline-none focus:border-emerald-500" 
                      value={newTransDesc}
                      onChange={e => setNewTransDesc(e.target.value)}
                    />
                    <div className="flex gap-4">
                      <input 
                        type="number" 
                        placeholder="Valor R$" 
                        className="flex-1 bg-black border border-neutral-800 p-4 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                        value={newTransAmount}
                        onChange={e => setNewTransAmount(e.target.value)}
                      />
                      <select 
                        className="bg-black border border-neutral-800 p-4 rounded-xl text-xs uppercase font-black outline-none"
                        value={newTransType}
                        onChange={e => setNewTransType(e.target.value as any)}
                      >
                        <option value="REVENUE">Entrada</option>
                        <option value="EXPENSE">Saída</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => handleAdjustBalance(newTransType === 'REVENUE' ? Number(newTransAmount) : -Number(newTransAmount), newTransDesc || "Lançamento manual", 'Geral')}
                      className="w-full py-4 bg-emerald-500 text-black uppercase tracking-widest rounded-xl font-black shadow-lg hover:bg-emerald-400"
                    >
                      Registrar Agora
                    </button>
                  </div>
               </Card>
               <div className="space-y-4">
                  <h4 className="text-[10px] text-neutral-400 uppercase tracking-widest flex items-center gap-2 font-black"><History size={16} className="text-emerald-500" /> Histórico</h4>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                    {transactions.map(t => (
                      <div key={t.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white uppercase font-black">{t.description}</span>
                          <span className="text-[8px] text-neutral-500 uppercase">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <span className={`text-xs font-black ${t.type === 'REVENUE' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {t.type === 'REVENUE' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-8 animate-in fade-in">
             <header>
              <h2 className="text-3xl tracking-tighter font-black">Obrigações <span className="text-emerald-500">Diárias</span></h2>
            </header>
            <Card className="max-w-2xl">
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  placeholder="Nova tarefa..." 
                  className="flex-1 bg-black border border-neutral-800 p-4 rounded-xl text-xs font-black outline-none focus:border-emerald-500"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                />
                <button 
                  onClick={() => {
                    if (newTaskTitle.trim()) {
                      setTasks(prev => [{ id: Date.now().toString(), title: newTaskTitle, priority: Priority.MEDIUM, completed: false, xpValue: 20 }, ...prev]);
                      setNewTaskTitle('');
                    }
                  }}
                  className="p-4 bg-emerald-500 text-black rounded-xl"
                ><Plus size={20} /></button>
              </div>
              <div className="space-y-3">
                {tasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => toggleTask(task.id)}
                    className={`p-4 border rounded-xl flex items-center gap-4 cursor-pointer transition-all ${task.completed ? 'opacity-40 bg-neutral-900 border-neutral-800' : 'border-neutral-800 hover:border-emerald-500/50'}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-700'}`}>
                      {task.completed && <Check size={12} className="text-black" />}
                    </div>
                    <span className={`text-xs uppercase font-black flex-1 ${task.completed ? 'line-through' : ''}`}>{task.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Nexus AI - Floating Chat */}
      {isAiOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-10 lg:right-8 lg:w-96 lg:h-[600px] bg-black/95 backdrop-blur-2xl border border-neutral-800 lg:rounded-3xl flex flex-col z-[100] shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
          <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="text-emerald-500" />
              <span className="uppercase text-[10px] tracking-widest font-black">Nexus Core AI</span>
            </div>
            <button onClick={() => setIsAiOpen(false)} className="text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <ShieldCheck className="mx-auto text-emerald-500 opacity-20" size={48} />
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Sincronização Ativa</p>
                <p className="text-xs text-neutral-400 italic">"Gastei 50 reais em transporte hoje" ou "Adicione Estudar Inglês à minha lista"</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] uppercase tracking-tight font-black ${
                  m.role === 'user' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' : 
                  m.role === 'system' ? 'bg-neutral-800 text-neutral-400 text-center w-full' : 'bg-neutral-900 text-white'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isAiLoading && <div className="text-emerald-500 animate-pulse text-[10px] uppercase font-black px-4">Nexus Processando...</div>}
          </div>

          <div className="p-6 border-t border-neutral-800 space-y-4 bg-black/50 pb-10 lg:pb-6">
            {showMicPrompt ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                <p className="text-[10px] text-emerald-500 font-black uppercase text-center">Permitir acesso ao microfone?</p>
                <div className="flex gap-2">
                  <button onClick={requestMicAccess} className="flex-1 py-2 bg-emerald-500 text-black rounded-lg text-[10px] font-black uppercase">Sim</button>
                  <button onClick={() => setShowMicPrompt(false)} className="flex-1 py-2 bg-neutral-800 text-neutral-400 rounded-lg text-[10px] font-black uppercase">Não</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Comando Nexus..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && chatInput.trim() && handleAiChat(chatInput)}
                  className="flex-1 bg-neutral-900 border border-neutral-800 p-4 rounded-xl text-xs outline-none focus:border-emerald-500 font-bold"
                />
                <button 
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  className={`p-4 rounded-xl transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-neutral-800 text-neutral-500 hover:text-emerald-500'}`}
                >
                  <Mic size={20} />
                </button>
                <button 
                  onClick={() => chatInput.trim() && handleAiChat(chatInput)}
                  className="p-4 bg-emerald-500 text-black rounded-xl"
                ><Send size={20} /></button>
              </div>
            )}
            <p className="text-[8px] text-neutral-600 text-center uppercase tracking-widest font-black">
              {isRecording ? "ESCUTANDO COMANDO..." : "SEGURE O ÍCONE PARA FALAR"}
            </p>
          </div>
        </div>
      )}

      {/* Mobile Nav - Oculto quando chat está aberto para evitar colisão */}
      {!isAiOpen && (
        <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 p-2 rounded-2xl z-50 shadow-2xl">
          {[
            { id: 'dashboard', icon: LayoutDashboard },
            { id: 'finances', icon: Wallet },
            { id: 'tasks', icon: CheckSquare }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`p-4 rounded-xl transition-all ${activeTab === item.id ? 'bg-emerald-500 text-black' : 'text-neutral-500'}`}
            >
              <item.icon size={20} />
            </button>
          ))}
          <div className="w-[1px] h-6 bg-neutral-800 mx-1"></div>
          <button 
            onClick={() => setIsAiOpen(true)}
            className="p-4 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          >
            <Bot size={20} />
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
