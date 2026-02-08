
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum Rank {
  INICIANTE = 'Iniciante',
  INTERMEDIARIO = 'Intermediário',
  AVANCADO = 'Avançado',
  ELITE = 'Elite'
}

export interface Transaction {
  id: string;
  type: 'REVENUE' | 'EXPENSE';
  amount: number;
  category: string;
  date: string;
  description: string;
  emoji?: string;
}

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  xpValue: number;
  emoji?: string;
}

export interface Habit {
  id: string;
  name: string;
  positive: boolean;
  streak: number;
  lastCompleted: string | null;
  xpValue: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

export interface UserStats {
  xp: number;
  rank: Rank;
  level: number;
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
}
