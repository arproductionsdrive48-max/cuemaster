/**
 * smartGenerator.ts
 * 
 * A fully offline, instant smart content generator using curated snooker
 * word banks and combinatorial logic. No AI download required — generates
 * genuinely varied, contextually relevant suggestions every time.
 */

// ─── Snooker Word Banks ───────────────────────────────────────────────────────

const SNOOKER_ADJECTIVES = [
  'The Rocket', 'The Magician', 'The Wizard', 'The Machine', 'The Surgeon',
  'The Sniper', 'The Ace', 'The Legend', 'The King', 'The Beast',
  'The Phantom', 'The Ghost', 'The Hawk', 'The Fox', 'The Tiger',
  'The Bullet', 'The Cannon', 'The Storm', 'The Flash', 'The Shadow',
];

const SNOOKER_SUFFIXES = [
  '147', 'Max', 'Pro', 'Elite', 'Sharp', 'Gold', 'Fire', 'Steel',
  'Blaze', 'Swift', 'Prime', 'Ultra', 'Apex', 'Cue', 'Break',
];

const SNOOKER_VERBS = [
  'CueMaster', 'BreakBuilder', 'SnookerKing', 'PocketKing', 'CueKing',
  'FrameBreaker', 'CueBaller', 'CueArtist', 'CueHero', 'TableKing',
];

// Shuffle deterministically using the name as a seed
const seededShuffle = <T>(arr: T[], seed: string): T[] => {
  const copy = [...arr];
  let hash = 0;
  for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  for (let i = copy.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(hash) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// ─── Nickname Generator ───────────────────────────────────────────────────────

export function generateNicknames(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || 'Player';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const initials = parts.map(p => p[0]?.toUpperCase()).join('');

  const shuffledAdjectives = seededShuffle(SNOOKER_ADJECTIVES, fullName);
  const shuffledSuffixes = seededShuffle(SNOOKER_SUFFIXES, fullName + '2');
  const shuffledVerbs = seededShuffle(SNOOKER_VERBS, fullName + '3');

  const suggestions = new Set<string>();

  // Pattern 1: FirstName + "The Adjective" style (e.g. "Ronnie The Rocket")
  suggestions.add(`${first} ${shuffledAdjectives[0]}`);

  // Pattern 2: Action/Title + LastName or FirstName (e.g. "CueMaster O'Sullivan")
  suggestions.add(`${shuffledVerbs[0]} ${last || first}`);

  // Pattern 3: Initials + title (e.g. "RS 147")
  suggestions.add(`${initials} ${shuffledSuffixes[0]}`);

  // Pattern 4: FirstName + suffix number/word (e.g. "Ronnie 147")
  suggestions.add(`${first} ${shuffledSuffixes[1]}`);

  // Pattern 5: Different adjective style (e.g. "The Ghost Ronnie")
  suggestions.add(`${shuffledAdjectives[1].replace('The ', 'The ')} ${first}`);

  // Pattern 6: CombinedNickname (e.g. "Ronnie Blaze" or "RS Gold")
  suggestions.add(
    last
      ? `${first} ${shuffledSuffixes[2]}`
      : `${initials} ${shuffledAdjectives[2].split(' ').pop()}`
  );

  // Pattern 7: Pure snooker title (e.g. "The Wizard of Frames")
  suggestions.add(`${first} "${shuffledSuffixes[3]}"`);

  return [...suggestions].slice(0, 6);
}

// ─── Tournament Name & Description Generator ──────────────────────────────────

const TOURNAMENT_ADJECTIVES = [
  'Winter', 'Summer', 'Elite', 'Grand', 'Golden', 'Premier', 'Pro',
  'Champion', 'Open', 'Classic', 'Masters', 'Royal', 'Supreme', 'Ultimate',
];

const TOURNAMENT_NOUNS = [
  'Cup', 'Trophy', 'Championship', 'Invitational', 'Challenge', 'Open',
  'Masters', 'Tour', 'Series', 'Battle', 'Showdown', 'Clash', 'Arena',
];

const TOURNAMENT_PREFIXES = [
  'CueMaster', '147', 'Golden Frame', 'Break Kings', 'Cue Warriors',
  'Pocket Elite', 'Frame Masters', 'Snooker Elite', 'Power Break',
];

export function generateTournamentSuggestions(
  format: string,
  location?: string,
  entryFee?: number,
  seedName?: string
): Array<{ name: string; description: string }> {
  // Simple spell check/normalization for common inputs
  let cleanFormat = format;
  const lowerFormat = format.toLowerCase().trim();
  if (lowerFormat.includes('snoker') || lowerFormat === 'snook') cleanFormat = 'Snooker';
  if (lowerFormat === '8ball' || lowerFormat === '8 ball') cleanFormat = '8-Ball';
  if (lowerFormat === '9ball' || lowerFormat === '9 ball') cleanFormat = '9-Ball';

  const shuffledAdj = seededShuffle(TOURNAMENT_ADJECTIVES, cleanFormat + Date.now().toString().slice(-4));
  const shuffledNouns = seededShuffle(TOURNAMENT_NOUNS, cleanFormat + 'n');
  const shuffledPrefixes = seededShuffle(TOURNAMENT_PREFIXES, cleanFormat + 'p');
  const year = new Date().getFullYear();
  const feeText = entryFee && entryFee > 0 ? `Entry fee: ₹${entryFee}.` : 'Free to enter.';
  const locText = location ? `Held at ${location}.` : 'Held at the club.';

  const baseSeed = seedName?.trim();
  const hasSeed = baseSeed && baseSeed.length > 2;

  const results: Array<{ name: string; description: string }> = [
    {
      name: hasSeed ? `${baseSeed} ${shuffledNouns[0]} ${year}` : `${shuffledAdj[0]} ${cleanFormat} ${shuffledNouns[0]} ${year}`,
      description: `A prestigious ${cleanFormat.toLowerCase()} tournament${hasSeed ? ` inspired by "${baseSeed}"` : ''} bringing together the best players for an exciting competition. ${locText} ${feeText} Compete for glory!`,
    },
    {
      name: hasSeed ? `${shuffledPrefixes[0]} ${baseSeed} Masters` : `${shuffledPrefixes[0]} ${cleanFormat} ${shuffledNouns[1]}`,
      description: `An elite ${cleanFormat.toLowerCase()} event${hasSeed ? ` carrying the ${baseSeed} legacy` : ''}. Designed to test skills under pressure. ${locText} ${feeText} Only the sharpest cue artists will make it to the final!`,
    },
    {
      name: hasSeed ? `The ${baseSeed} ${shuffledAdj[1]} Open` : `${shuffledAdj[1]} ${shuffledPrefixes[1]} ${shuffledNouns[2]}`,
      description: `The ultimate ${cleanFormat.toLowerCase()} showdown! ${hasSeed ? `A unique event specifically for ${baseSeed} fans.` : ''} ${locText} ${feeText} Battle through rounds to claim the championship title.`,
    },
    {
      name: hasSeed ? `${baseSeed} ${shuffledPrefixes[2]} Challenge` : `${shuffledPrefixes[2]} Open ${year}`,
      description: `An open-entry ${cleanFormat.toLowerCase()} tournament welcoming all skill levels${hasSeed ? ` under the ${baseSeed} banner` : ''}. ${locText} ${feeText} Show the club what you're made of.`,
    },
    {
      name: hasSeed ? `The ${shuffledAdj[2]} ${baseSeed} Invitational` : `The ${shuffledAdj[2]} ${cleanFormat} Invitational`,
      description: `A special invitational-style ${cleanFormat.toLowerCase()} event featuring the best of ${hasSeed ? baseSeed : 'the club'}. ${locText} ${feeText} Expect intense frames and big breaks from start to finish.`,
    },
  ];

  return results;
}

// ─── Match Commentary Generator ──────────────────────────────────────────────

export function generateCommentary(
  players: string[],
  tableNumber?: number,
  winnerName?: string,
  score?: { s1: number; s2: number },
  bestOf?: number,
  clubName?: string,
  duration?: number
): string {
  const [p1, p2] = players;
  const scoreText = score ? `(${score.s1}–${score.s2})` : '';
  const formatText = bestOf ? `Best of ${bestOf}` : '';
  const hashtag = clubName ? `#${clubName.replace(/\s+/g, '')}` : '#SnookOS';
  
  const templates = [
    `🔥 *Match Update:* ${p1} vs ${p2} on Table ${tableNumber || '?'}. ${winnerName ? `🏆 Winner: *${winnerName}* ${scoreText}!` : `📊 Current Score: *${scoreText}*`}\n⚡ ${formatText} | ${hashtag}`,
    `🎱 *Snook OS Live:* ${winnerName ? `🏆 *${winnerName}* takes it! Final score ${scoreText}` : `${p1} and ${p2} are battle-locked ${scoreText}`} on Table ${tableNumber || '?'}.\n🎯 ${formatText} | ${hashtag}`,
    `🏆 *Tournament Result:* ${p1} ${score?.s1 ?? 0} – ${score?.s2 ?? 0} ${p2} ${tableNumber ? `| Table ${tableNumber}` : ''}.\n${winnerName ? `🥇 *${winnerName}* advances!` : 'Intense competition on display!'} 🎱\n${hashtag}`,
    `🎯 *Quick Update:* ${winnerName ? `Congratulations *${winnerName}* on the win ${scoreText}!` : `Live action: ${p1} vs ${p2} is ${scoreText}`} on Table ${tableNumber || '?'}.\n⚡ ${formatText} — stay tuned!\n${hashtag}`,
    `⚡ *Table ${tableNumber || '?'} Action:* ${p1} vs ${p2} ${formatText}.\n${winnerName ? `🏆 *${winnerName}* victory! ${scoreText}` : `📊 Current: ${scoreText}`} 🎱\n${hashtag}`,
  ];
  
  // Use a combination of inputs for more stable but varied randomness
  const seed = players.join('') + (winnerName || '') + (score?.s1 || 0) + (score?.s2 || 0) + Date.now().toString().slice(-2);
  const idx = Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % templates.length;
  return templates[idx];
}

// ─── Promotions Text Generator ────────────────────────────────────────────────

export function generatePromotionTexts(
  clubName: string,
  type: 'weekend' | 'tournament' | 'happy_hour' | 'member' | 'general' = 'general',
  details?: {
    discount?: string;
    day?: string;
    tournamentName?: string;
    memberTier?: string;
  }
): string[] {
  const c = clubName || 'the club';
  const { discount = '20%', day = 'this weekend', tournamentName = 'our upcoming tournament', memberTier = 'Gold' } = details ?? {};

  const promoSets: Record<string, string[]> = {
    weekend: [
      `🎱 ${day.charAt(0).toUpperCase() + day.slice(1)} Special at ${c}! Get ${discount} off table time. Book your frame now — limited slots! 📲`,
      `⚡ It's ${day} vibes at ${c}! Grab ${discount} off all tables. First come, first served. Book via WhatsApp now! 🏆`,
      `🏆 ${day.charAt(0).toUpperCase() + day.slice(1)} offer at ${c}: ${discount} off any session! Bring your mates, sharpen your cue, and let the frames begin. Call us to reserve! 🎯`,
    ],
    tournament: [
      `🏆 REGISTER NOW — ${tournamentName} is here! Limited spots available at ${c}. Don't miss your shot at the title. Contact us today! 🎱`,
      `🎯 ${tournamentName} at ${c} — Are you ready to compete? Open to all members. WhatsApp us to reserve your spot before it's full! 🔥`,
      `⚡ Think you can handle the pressure? Join ${tournamentName} at ${c}! Register today — spots filling fast! 🏆`,
    ],
    happy_hour: [
      `🕐 Happy Hour at ${c}! ${discount} off table bookings between 2–5 PM. Perfect time to practice those breaks! 🎱`,
      `🎱 Beat the rush with our Happy Hour deal at ${c} — ${discount} off! Available daily 2–5 PM. WhatsApp to book now! ⚡`,
      `⏰ Happy Hour Special at ${c}: ${discount} discount on all tables. Limited hours — come in and play! 🔥`,
    ],
    member: [
      `⭐ ${memberTier} Members at ${c} get exclusive perks this month! Extra points, priority booking, and special discounts. Renew or upgrade your membership today! 🎱`,
      `🏆 Calling all ${memberTier} members at ${c}! Enjoy exclusive benefits and earn bonus CPP points this week. Check with admin for details! 🎯`,
      `🌟 Member Appreciation Week at ${c}! As a ${memberTier} member, you get ${discount} off all sessions. Thank you for being part of our community! 🎱`,
    ],
    general: [
      `🎱 ${c} is OPEN! Come in for a game, challenge your mates, or just practice your breaks. Great tables, great vibes. 🏆`,
      `⚡ Looking for the best snooker in town? Come to ${c}! Premium tables, great atmosphere, and a community that loves the game. Book now! 🎱`,
      `🔥 It's a great day for snooker! ${c} has open tables — drop by, warm up your cue, and enjoy some frames. See you on the green! 🎯`,
    ],
  };

  return promoSets[type] ?? promoSets.general;
}
