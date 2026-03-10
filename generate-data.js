#!/usr/bin/env node
// Generates mission control data.json from live project state
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = '/Users/brandonkatz/.openclaw/workspace';
const OUT = path.join(__dirname, 'data.json');

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10000 }).trim(); } catch { return ''; }
}

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

// ── FitSorted Stats ──
let fitsortedStats = {};
try {
  const usersDir = path.join(WORKSPACE, 'fitsorted', 'users');
  if (fs.existsSync(usersDir)) {
    const userFiles = fs.readdirSync(usersDir).filter(f => f.endsWith('.json'));
    let totalLogs = 0, activeLast7 = 0, premiumCount = 0;
    const now = Date.now();
    for (const f of userFiles) {
      const u = readJSON(path.join(usersDir, f));
      if (!u) continue;
      if (u.premium) premiumCount++;
      const logDates = Object.keys(u.log || {});
      totalLogs += logDates.reduce((s, d) => s + (u.log[d]?.length || 0), 0);
      const lastLog = logDates.sort().pop();
      if (lastLog && (now - new Date(lastLog).getTime()) < 7 * 86400000) activeLast7++;
    }
    fitsortedStats = {
      'Total Users': { val: userFiles.length.toString(), color: 'green' },
      'Active (7d)': { val: activeLast7.toString(), color: activeLast7 > 5 ? 'green' : 'orange' },
      'Premium Users': { val: premiumCount.toString(), color: premiumCount > 0 ? 'green' : 'red' },
      'Total Logs': { val: totalLogs.toLocaleString(), color: 'blue' },
      'Bot Status': { val: run('pm2 jlist 2>/dev/null | node -e "const d=JSON.parse(require(\'fs\').readFileSync(\'/dev/stdin\',\'utf8\')); const f=d.find(p=>p.name===\'fitsorted\'); console.log(f?f.pm2_env.status:\'unknown\')"') || 'unknown', color: 'green' },
    };
  }
} catch (e) { console.error('FitSorted error:', e.message); }

// Count foods
let foodCount = 445;
try {
  const extraFoods = readJSON(path.join(WORKSPACE, 'fitsorted', 'extra-foods.json'));
  if (extraFoods) foodCount += Object.keys(extraFoods).filter(k => !k.startsWith('_meta')).length;
} catch {}
fitsortedStats['Food Database'] = { val: foodCount.toString() + ' foods', color: 'blue' };

// ── Crypto Casino Stats ──
let cryptoCasinos = {};
try {
  const dataDir = path.join(WORKSPACE, 'crypto-casinos', 'site', 'data');
  const today = new Date().toISOString().split('T')[0];
  let latestFile;
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const f = path.join(dataDir, `deposits-${d}.csv`);
    if (fs.existsSync(f)) { latestFile = f; break; }
  }
  if (latestFile) {
    const lines = fs.readFileSync(latestFile, 'utf8').trim().split('\n').slice(1);
    const totalUSD = lines.reduce((s, l) => s + (parseFloat(l.split(',')[8]) || 0), 0);
    const whales = lines.filter(l => (parseFloat(l.split(',')[8]) || 0) > 10000).length;
    cryptoCasinos = {
      'Deposits Today': { val: lines.length.toLocaleString(), color: 'purple' },
      'Total Volume': { val: '$' + (totalUSD / 1000000).toFixed(1) + 'M', color: 'green' },
      'Whale Deposits': { val: whales.toString() + ' (>$10K)', color: 'orange' },
      'Casinos Tracked': { val: [...new Set(lines.map(l => l.split(',')[3]?.replace(/ \d+$/, '')))].length.toString(), color: 'blue' },
    };
  }
} catch (e) { console.error('Casino error:', e.message); }

// ── Projects ──
const projects = [
  { name: 'FitSorted', url: 'https://fitsorted.co.za', status: 'live', traffic: (fitsortedStats['Active (7d)']?.val || '?') + ' active', trafficColor: 'green' },
  { name: 'BetSorted', url: 'https://betsorted.co.za', status: 'live', traffic: '', trafficColor: 'blue' },
  { name: 'CryptoCasinoSorted', url: 'https://cryptocasinosorted.com', status: 'live', traffic: '', trafficColor: 'purple' },
  { name: 'RetirementSorted', url: 'https://retirementsorted.co.za', status: 'live', traffic: '', trafficColor: '' },
  { name: 'PaidProperly', url: 'https://paidproperly.co.za', status: 'live', traffic: '', trafficColor: '' },
  { name: 'DeFi Yield DEX', url: 'https://dex.defiyield.live', status: 'live', traffic: '', trafficColor: '' },
  { name: 'TradeSorted', url: 'https://tradesorted.co.za', status: 'idea', traffic: '', trafficColor: '' },
  { name: 'CVSorted', url: '#', status: 'idea', traffic: 'Scoped', trafficColor: 'orange' },
];

// ── Revenue ──
const revenue = {
  'FitSorted MRR': { val: 'R0', color: 'red' },
  'FitSorted Target': { val: 'R1,800/mo (100 users)', color: 'orange' },
  'Affiliate Revenue': { val: 'R0 (pending signups)', color: 'red' },
  'Orderly DEX Fees': { val: 'Active', color: 'green' },
  'Gold LP Yield': { val: '~15% APY ($20K)', color: 'green' },
};

// ── API Credits ──
const apiCredits = {
  'The Odds API': { val: '350/500 remaining', color: 'orange' },
  'OpenAI': { val: 'Active', color: 'green' },
  'Gemini': { val: 'Active (free tier)', color: 'green' },
  'Resend (email)': { val: '100/day free', color: 'green' },
  'Etherscan': { val: '100K/day', color: 'green' },
};

// ── Ideas ──
const ideas = [
  { emoji: '📖', name: 'VerseSorted', status: 'idea', buildTime: '2 days', revenue: 'R49/mo freemium' },
  { emoji: '🍺', name: 'DrunkSorted', status: 'idea', buildTime: '1-2 weeks', revenue: 'Ads + Uber affiliate' },
  { emoji: '📄', name: 'CVSorted', status: 'idea', buildTime: '1-2 weeks', revenue: 'R99/CV' },
  { emoji: '💰', name: 'BudgetSorted', status: 'idea', buildTime: '1 week', revenue: 'R29/mo' },
  { emoji: '🏋️', name: 'FitSorted App', status: 'wip', buildTime: 'Awaiting Apple account', revenue: 'Companion to WhatsApp' },
  { emoji: '📈', name: 'TradeSorted', status: 'idea', buildTime: '4-6 hours', revenue: 'R2K-20K/mo affiliates' },
  { emoji: '🩺', name: 'Dietician Suite', status: 'idea', buildTime: '4-6 weeks', revenue: 'R50/client/mo B2B' },
  { emoji: '🎰', name: 'Betting Tipster Bot', status: 'idea', buildTime: '1 week', revenue: 'R99/mo' },
  { emoji: '🏠', name: 'Rental Auto-Responder', status: 'idea', buildTime: '3 days', revenue: 'R199/mo per landlord' },
  { emoji: '💸', name: 'Crypto Price Alerts', status: 'idea', buildTime: '2 days', revenue: 'R49/mo' },
];

// ── Automations ──
const automations = [
  { time: '01:00', name: 'FitSorted Food DB Expansion', enabled: true },
  { time: '06:00', name: 'BetSorted Morning Odds', enabled: true },
  { time: '08:30', name: 'Crypto Casino Tweet Drafts', enabled: true },
  { time: '09:00', name: 'Arkham Deposit Addresses Reminder', enabled: true },
  { time: '18:00', name: 'BetSorted Evening Odds', enabled: true },
  { time: '20:00', name: 'FitSorted Evening Summary', enabled: true },
  { time: '20:05', name: 'FitSorted Dashboard Update', enabled: true },
  { time: 'Every 5m', name: 'FitSorted Stats Regen', enabled: true },
];

// ── TODOs ──
const todos = [
  'Test full FitSorted onboarding flow on WhatsApp',
  'Test email export (email, export, export week)',
  'Complete Apple Developer Account enrollment ($99/yr)',
  'Sign up for Google Play Console ($25)',
  'Run FitSorted stable for 1 week, then pitch influencers',
  'Post Reddit/Twitter content drafts',
  'Get more deposit addresses from Arkham',
  'Build React Native companion app (scope ready)',
  'Lock in Bloomberg terminal tweet card style in daily cron',
];

// ── Output ──
const data = {
  updated: new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }),
  projects,
  fitsorted: fitsortedStats,
  revenue,
  cryptoCasinos,
  automations,
  apiCredits,
  ideas,
  todos,
};

fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log('✅ Mission Control data.json generated');
