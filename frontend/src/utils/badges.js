// Donor badge system — calculated from completed donation count

export const BADGES = [
  { id: 'legend',      min: 20, label: 'Legend',      emoji: '🏆', color: '#8b5cf6', description: '20+ donations' },
  { id: 'champion',    min: 10, label: 'Champion',     emoji: '⭐', color: '#f59e0b', description: '10+ donations' },
  { id: 'contributor', min: 5,  label: 'Contributor',  emoji: '💚', color: '#10b981', description: '5+ donations'  },
  { id: 'helper',      min: 3,  label: 'Helper',       emoji: '🤝', color: '#3b82f6', description: '3+ donations'  },
  { id: 'seedling',    min: 1,  label: 'Seedling',     emoji: '🌱', color: '#6ee7b7', description: 'First donation' },
];

// Returns the highest earned badge or null
export const getBadge = (completedCount = 0) => {
  return BADGES.find(b => completedCount >= b.min) || null;
};

// Returns ALL earned badges
export const getAllBadges = (completedCount = 0) => {
  return BADGES.filter(b => completedCount >= b.min);
};

// Returns next badge to earn
export const getNextBadge = (completedCount = 0) => {
  return [...BADGES].reverse().find(b => completedCount < b.min) || null;
};