
import React from 'react';
import { Rank, Achievement, Priority } from './types';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: 'Primeiro Passo', description: 'Complete sua primeira tarefa diária.', unlocked: false, icon: '🎯' },
  { id: '2', title: 'Investidor Iniciante', description: 'Registre sua primeira receita.', unlocked: false, icon: '💰' },
  { id: '3', title: 'Disciplina de Ferro', description: 'Mantenha um streak de 7 dias em um hábito.', unlocked: false, icon: '🔥' },
  { id: '4', title: 'Mestre Financeiro', description: 'Termine o mês com saldo positivo acima de R$ 1000.', unlocked: false, icon: '🏆' },
];

export const CATEGORIES = [
  'Alimentação', 
  'Moradia', 
  'Transporte', 
  'Saúde', 
  'Lazer', 
  'Educação', 
  'Compras pessoais', 
  'Assinaturas e serviços', 
  'Impostos e taxas', 
  'Outros'
];

export const XP_REQUIREMENTS = {
  [Rank.INICIANTE]: 0,
  [Rank.INTERMEDIARIO]: 2500,
  [Rank.AVANCADO]: 10000,
  [Rank.ELITE]: 30000,
};

export const RANK_COLORS = {
  [Rank.INICIANTE]: 'text-gray-400',
  [Rank.INTERMEDIARIO]: 'text-blue-400',
  [Rank.AVANCADO]: 'text-purple-400',
  [Rank.ELITE]: 'text-[#ffae00]',
};
