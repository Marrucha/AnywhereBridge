import { Card, Rank, Seat, Vulnerability } from '../types/bridge';
import { isSideVulnerable } from './vulnerability';

const RANK_HCP: Record<Rank, number> = {
  A: 4,
  K: 3,
  Q: 2,
  J: 1,
  T: 0,
  '9': 0,
  '8': 0,
  '7': 0,
  '6': 0,
  '5': 0,
  '4': 0,
  '3': 0,
  '2': 0,
};

/**
 * Calculates High Card Points (PC) of a single hand
 */
export function calculateHandHcp(hand: Card[]): number {
  if (!hand) return 0;
  return hand.reduce((sum, card) => sum + (RANK_HCP[card.rank] || 0), 0);
}

/**
 * Calculates PC for NS and EW partnerships. Sum always equals 40.
 */
export function calculateDealHcp(fullHands: Record<Seat, Card[]>): { hcpNS: number; hcpEW: number } {
  const n = calculateHandHcp(fullHands.N || []);
  const s = calculateHandHcp(fullHands.S || []);
  const e = calculateHandHcp(fullHands.E || []);
  const w = calculateHandHcp(fullHands.W || []);

  const hcpNS = n + s;
  const hcpEW = e + w;
  return { hcpNS, hcpEW };
}

/**
 * Tabela Miltona: oczekiwany zapis w punktach w zależności od sumy PC i założeń.
 */
interface MiltonEntry {
  hcp: number;
  nonVul: number;
  vul: number;
  desc: string;
}

const MILTON_TABLE: MiltonEntry[] = [
  { hcp: 20, nonVul: 0, vul: 0, desc: 'Równowaga (częściówka 0)' },
  { hcp: 21, nonVul: 50, vul: 50, desc: 'Częściówka (1-2 w kolor, 50 pkt)' },
  { hcp: 22, nonVul: 70, vul: 70, desc: 'Częściówka (2 w kolor, 70 pkt)' },
  { hcp: 23, nonVul: 110, vul: 110, desc: 'Częściówka (2-3 w kolor, 110 pkt)' },
  { hcp: 24, nonVul: 200, vul: 290, desc: 'Inwit / Częściówka z nadróbkami' },
  { hcp: 25, nonVul: 300, vul: 440, desc: 'Końcówka (3BA / 4 w starszy)' },
  { hcp: 26, nonVul: 350, vul: 520, desc: 'Końcówka (3BA / 4 w starszy)' },
  { hcp: 27, nonVul: 400, vul: 600, desc: 'Pewna końcówka (3BA / 4♠/4♥)' },
  { hcp: 28, nonVul: 430, vul: 630, desc: 'Końcówka z nadróbką (3BA +1)' },
  { hcp: 29, nonVul: 460, vul: 660, desc: 'Końcówka z 2 nadróbkami (3BA +2)' },
  { hcp: 30, nonVul: 490, vul: 690, desc: 'Wysoka końcówka (490/690 pkt)' },
  { hcp: 31, nonVul: 600, vul: 800, desc: 'Inwit szlemowy (600/800 pkt)' },
  { hcp: 32, nonVul: 700, vul: 1050, desc: 'Granica szlema (700/1050 pkt)' },
  { hcp: 33, nonVul: 900, vul: 1350, desc: 'Mały szlem (6 w starszy / 6BA)' },
  { hcp: 34, nonVul: 1000, vul: 1500, desc: 'Mały szlem z nadróbką' },
  { hcp: 35, nonVul: 1100, vul: 1650, desc: 'Inwit do wielkiego szlema' },
  { hcp: 36, nonVul: 1200, vul: 1800, desc: 'Inwit do wielkiego szlema' },
  { hcp: 37, nonVul: 1400, vul: 2100, desc: 'Wielki szlem (7 w kolor / 7BA)' },
];

/**
 * Returns expected score and contract description for a given HCP and vulnerability.
 */
export function getExpectedScoreForHcp(
  hcp: number,
  isVul: boolean
): { expectedPoints: number; desc: string } {
  if (hcp < 20) {
    // Other side has majority of HCP
    const oppHcp = 40 - hcp;
    const oppResult = getExpectedScoreForHcp(oppHcp, isVul);
    return {
      expectedPoints: -oppResult.expectedPoints,
      desc: oppResult.desc,
    };
  }

  const clampedHcp = Math.min(37, Math.max(20, hcp));
  const entry = MILTON_TABLE.find(e => e.hcp === clampedHcp) || MILTON_TABLE[0];
  const expectedPoints = isVul ? entry.vul : entry.nonVul;

  return {
    expectedPoints,
    desc: entry.desc,
  };
}

/**
 * Standard WBF IMP Conversion Table
 */
export function convertDifferenceToImp(diff: number): number {
  const absDiff = Math.abs(diff);
  let imp = 0;

  if (absDiff <= 10) imp = 0;
  else if (absDiff <= 40) imp = 1;
  else if (absDiff <= 80) imp = 2;
  else if (absDiff <= 120) imp = 3;
  else if (absDiff <= 160) imp = 4;
  else if (absDiff <= 210) imp = 5;
  else if (absDiff <= 260) imp = 6;
  else if (absDiff <= 310) imp = 7;
  else if (absDiff <= 360) imp = 8;
  else if (absDiff <= 420) imp = 9;
  else if (absDiff <= 490) imp = 10;
  else if (absDiff <= 590) imp = 11;
  else if (absDiff <= 740) imp = 12;
  else if (absDiff <= 890) imp = 13;
  else if (absDiff <= 1090) imp = 14;
  else if (absDiff <= 1290) imp = 15;
  else if (absDiff <= 1490) imp = 16;
  else if (absDiff <= 1740) imp = 17;
  else if (absDiff <= 1990) imp = 18;
  else if (absDiff <= 2240) imp = 19;
  else if (absDiff <= 2490) imp = 20;
  else if (absDiff <= 2990) imp = 21;
  else if (absDiff <= 3490) imp = 22;
  else if (absDiff <= 3990) imp = 23;
  else imp = 24;

  return diff >= 0 ? imp : -imp;
}

export interface BoardImpAnalysis {
  hcpNS: number;
  hcpEW: number;
  expectedScoreNS: number;
  expectedContractDesc: string;
  pointsDiffNS: number;
  impNS: number;
  impEW: number;
}

/**
 * Calculates complete IMP analysis for a finished duplicate board.
 */
export function calculateBoardImp(
  scoreNS: number,
  hcpNS: number,
  vulnerability: Vulnerability
): BoardImpAnalysis {
  const hcpEW = 40 - hcpNS;
  const isNSVul = isSideVulnerable('NS', vulnerability);
  const isEWVul = isSideVulnerable('EW', vulnerability);

  let expectedScoreNS = 0;
  let expectedContractDesc = '';

  if (hcpNS >= 20) {
    const res = getExpectedScoreForHcp(hcpNS, isNSVul);
    expectedScoreNS = res.expectedPoints;
    expectedContractDesc = `${res.desc} (${expectedScoreNS > 0 ? '+' : ''}${expectedScoreNS} pkt)`;
  } else {
    const res = getExpectedScoreForHcp(hcpEW, isEWVul);
    expectedScoreNS = -res.expectedPoints;
    expectedContractDesc = `Przeciwnicy: ${res.desc} (${expectedScoreNS} pkt)`;
  }

  const pointsDiffNS = scoreNS - expectedScoreNS;
  const impNS = convertDifferenceToImp(pointsDiffNS);
  const impEW = -impNS;

  return {
    hcpNS,
    hcpEW,
    expectedScoreNS,
    expectedContractDesc,
    pointsDiffNS,
    impNS,
    impEW,
  };
}
