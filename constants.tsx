
import React from 'react';
import { Rank, Achievement, Priority } from './types';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: 'Primeiro Passo', description: 'Complete sua primeira tarefa diária.', unlocked: false, icon: '🎯' },
  { id: '2', title: 'Investidor Iniciante', description: 'Registre sua primeira receita.', unlocked: false, icon: '💰' },
  { id: '3', title: 'Disciplina de Ferro', description: 'Mantenha um streak de 7 dias em um hábito.', unlocked: false, icon: '🔥' },
  { id: '4', title: 'Mestre Financeiro', description: 'Termine o mês com saldo positivo acima de R$ 1000.', unlocked: false, icon: '🏆' },
];

export const CATEGORIES = [
  'Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Investimentos', 'Outros'
];

export const XP_REQUIREMENTS = {
  [Rank.INICIANTE]: 0,
  [Rank.INTERMEDIARIO]: 1000,
  [Rank.AVANCADO]: 5000,
  [Rank.ELITE]: 15000,
};

export const RANK_COLORS = {
  [Rank.INICIANTE]: 'text-gray-400',
  [Rank.INTERMEDIARIO]: 'text-blue-400',
  [Rank.AVANCADO]: 'text-purple-400',
  [Rank.ELITE]: 'text-emerald-400',
};
