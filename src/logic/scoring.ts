import { Contract, ScoreRecord, Seat, Vulnerability } from '../types/bridge';
import { getPartnership, isSideVulnerable } from './vulnerability';

export interface ScoreCalculationResult {
  tricksWonDeclarer: number;
  tricksRequired: number;
  diff: number; // e.g. 0 for =, +1 for +1, -1 for -1
  points: number; // Total points earned by declarer's side (can be negative if defeated)
  resultStr: string; // e.g. "4♠ = (+420)"
  scoreNS: number;
  scoreEW: number;
}

export function formatContractString(contract: Contract): string {
  const suitSymbols: Record<string, string> = {
    C: '♣',
    D: '♦',
    H: '♥',
    S: '♠',
    NT: 'BA',
  };
  const dStr = contract.doubled === 'REDOUBLED' ? 'xx' : contract.doubled === 'DOUBLED' ? 'x' : '';
  return `${contract.level}${suitSymbols[contract.suit] || contract.suit}${dStr}`;
}

export function calculateDuplicateScore(
  contract: Contract,
  tricksWonNS: number,
  tricksWonEW: number,
  vulnerability: Vulnerability
): ScoreCalculationResult {
  const declarerSide = getPartnership(contract.declarer);
  const isVulnerable = isSideVulnerable(declarerSide, vulnerability);

  const tricksWonDeclarer = declarerSide === 'NS' ? tricksWonNS : tricksWonEW;
  const tricksRequired = 6 + contract.level;
  const diff = tricksWonDeclarer - tricksRequired;

  const isMinor = contract.suit === 'C' || contract.suit === 'D';
  const isNT = contract.suit === 'NT';

  let totalScore = 0;

  if (diff >= 0) {
    // Contract made!
    // 1. Contract trick score
    let baseTrickScore = 0;
    if (isMinor) {
      baseTrickScore = contract.level * 20;
    } else if (isNT) {
      baseTrickScore = 40 + (contract.level - 1) * 30;
    } else {
      // Major (H, S)
      baseTrickScore = contract.level * 30;
    }

    let contractPoints = baseTrickScore;
    if (contract.doubled === 'DOUBLED') contractPoints *= 2;
    if (contract.doubled === 'REDOUBLED') contractPoints *= 4;

    totalScore += contractPoints;

    // 2. Game or Partscore bonus
    if (contractPoints >= 100) {
      // Game bonus
      totalScore += isVulnerable ? 500 : 300;
    } else {
      // Partscore bonus
      totalScore += 50;
    }

    // 3. Slam bonus
    if (contract.level === 6) {
      totalScore += isVulnerable ? 750 : 500;
    } else if (contract.level === 7) {
      totalScore += isVulnerable ? 1500 : 1000;
    }

    // 4. Insult bonus (for making doubled/redoubled contract)
    if (contract.doubled === 'DOUBLED') {
      totalScore += 50;
    } else if (contract.doubled === 'REDOUBLED') {
      totalScore += 100;
    }

    // 5. Overtricks
    const overtricks = diff;
    if (overtricks > 0) {
      if (contract.doubled === 'NONE') {
        const valPerOvertrick = isMinor ? 20 : 30;
        totalScore += overtricks * valPerOvertrick;
      } else if (contract.doubled === 'DOUBLED') {
        totalScore += overtricks * (isVulnerable ? 200 : 100);
      } else if (contract.doubled === 'REDOUBLED') {
        totalScore += overtricks * (isVulnerable ? 400 : 200);
      }
    }
  } else {
    // Defeated contract (Wpadka)
    const undertricks = Math.abs(diff);
    let penalty = 0;

    if (contract.doubled === 'NONE') {
      penalty = undertricks * (isVulnerable ? 100 : 50);
    } else if (contract.doubled === 'DOUBLED') {
      if (!isVulnerable) {
        // Not vulnerable doubled: 100 for 1st, 200 for 2nd and 3rd, 300 for subsequent
        if (undertricks >= 1) penalty += 100;
        if (undertricks >= 2) penalty += 200;
        if (undertricks >= 3) penalty += 200;
        if (undertricks > 3) penalty += (undertricks - 3) * 300;
      } else {
        // Vulnerable doubled: 200 for 1st, 300 for subsequent
        if (undertricks >= 1) penalty += 200;
        if (undertricks > 1) penalty += (undertricks - 1) * 300;
      }
    } else if (contract.doubled === 'REDOUBLED') {
      // Redoubled is exactly twice the doubled penalty
      if (!isVulnerable) {
        if (undertricks >= 1) penalty += 200;
        if (undertricks >= 2) penalty += 400;
        if (undertricks >= 3) penalty += 400;
        if (undertricks > 3) penalty += (undertricks - 3) * 600;
      } else {
        if (undertricks >= 1) penalty += 400;
        if (undertricks > 1) penalty += (undertricks - 1) * 600;
      }
    }

    totalScore = -penalty;
  }

  const scoreNS = declarerSide === 'NS' ? totalScore : -totalScore;
  const scoreEW = declarerSide === 'EW' ? totalScore : -totalScore;

  const diffStr = diff === 0 ? '=' : diff > 0 ? `+${diff}` : `${diff}`;
  const cStr = formatContractString(contract);
  const resultStr = `${cStr} ${diffStr} (${totalScore >= 0 ? '+' : ''}${totalScore})`;

  return {
    tricksWonDeclarer,
    tricksRequired,
    diff,
    points: totalScore,
    resultStr,
    scoreNS,
    scoreEW,
  };
}
