// Double Dummy Solver (DDS) integration for AnywhereBridge
// Uses C++ DDS library compiled to WebAssembly (via bridge-dds)

import { Card, Seat, TrumpSuit, Vulnerability } from '../types/bridge';
// @ts-ignore
import DdsLoader from 'bridge-dds/dist/lib/dds.js';

export interface DdsTableResult {
  // tricks: [seat][suit] -> number of tricks (0-13)
  tricks: Record<Seat, Record<TrumpSuit, number>>;
  parScore: number;
  parContracts: string[];
}

let ddsModulePromise: Promise<any> | null = null;

export async function getDdsModule(): Promise<any> {
  if (!ddsModulePromise) {
    ddsModulePromise = DdsLoader().then((mod: any) => {
      try {
        mod.ccall('SetMaxThreads', null, ['number'], [0]);
      } catch (e) {
        console.warn('SetMaxThreads error:', e);
      }
      return mod;
    });
  }
  return ddsModulePromise;
}

/**
 * Converts a 13-card hand into PBN format: "S.H.D.C"
 * e.g. "AKQ.JT9.876.5432"
 */
export function formatHandPbn(cards: Card[]): string {
  const suits = ['S', 'H', 'D', 'C'];
  const rankOrder = '23456789TJQKA';

  return suits
    .map(suit => {
      return cards
        .filter(c => c.suit === suit)
        .map(c => c.rank)
        .sort((a, b) => rankOrder.indexOf(b) - rankOrder.indexOf(a))
        .join('');
    })
    .join('.');
}

/**
 * Converts 4 hands (N, E, S, W) into full PBN deal string
 * format: "N:<North> <East> <South> <West>"
 */
export function formatDealPbn(hands: { N: Card[]; E: Card[]; S: Card[]; W: Card[] }): string {
  const nPbn = formatHandPbn(hands.N);
  const ePbn = formatHandPbn(hands.E);
  const sPbn = formatHandPbn(hands.S);
  const wPbn = formatHandPbn(hands.W);

  return `N:${nPbn} ${ePbn} ${sPbn} ${wPbn}`;
}

const SEATS: Seat[] = ['N', 'E', 'S', 'W'];
const STRAINS: TrumpSuit[] = ['S', 'H', 'D', 'C', 'NT'];

/**
 * Calculates the Double Dummy Table and Minimax / Par score using Bo Haglund's DDS.
 */
export async function calculateDdsAnalysis(
  hands: { N: Card[]; E: Card[]; S: Card[]; W: Card[] },
  dealer: Seat = 'N',
  vulnerability: Vulnerability = 'NONE'
): Promise<DdsTableResult | null> {
  try {
    const mod = await getDdsModule();

    const pbn = formatDealPbn(hands);
    const dealPtr = mod._malloc(80);
    const resPtr = mod._malloc(80);
    const parPtr = mod._malloc(200);

    try {
      mod.stringToUTF8(pbn, dealPtr, 80);
      const res = mod.ccall('CalcDDtablePBN', 'number', ['number', 'number'], [dealPtr, resPtr]);
      if (res !== 1) {
        console.error('DDS CalcDDtablePBN failed with code:', res);
        return null;
      }

      // Read table: 5 strains x 4 seats
      const tricks: Record<Seat, Record<TrumpSuit, number>> = {
        N: { S: 0, H: 0, D: 0, C: 0, NT: 0 },
        E: { S: 0, H: 0, D: 0, C: 0, NT: 0 },
        S: { S: 0, H: 0, D: 0, C: 0, NT: 0 },
        W: { S: 0, H: 0, D: 0, C: 0, NT: 0 },
      };

      for (let sIdx = 0; sIdx < STRAINS.length; sIdx++) {
        const strain = STRAINS[sIdx];
        for (let hIdx = 0; hIdx < SEATS.length; hIdx++) {
          const seat = SEATS[hIdx];
          const offset = (sIdx * 4 + hIdx) * 4;
          const tr = mod.getValue(resPtr + offset, 'i32');
          tricks[seat][strain] = tr;
        }
      }

      // Par calculation
      // dealer: 0=N, 1=E, 2=S, 3=W
      const dealerIdx = SEATS.indexOf(dealer);
      // vul: 0=None, 1=Both, 2=NS, 3=EW
      let vulIdx = 0;
      if (vulnerability === 'BOTH') vulIdx = 1;
      else if (vulnerability === 'NS') vulIdx = 2;
      else if (vulnerability === 'EW') vulIdx = 3;

      mod.ccall(
        'DealerPar',
        'number',
        ['number', 'number', 'number', 'number'],
        [resPtr, parPtr, dealerIdx >= 0 ? dealerIdx : 0, vulIdx]
      );

      const parCount = mod.getValue(parPtr, 'i32');
      const parScore = mod.getValue(parPtr + 4, 'i32');
      const parContracts: string[] = [];

      for (let i = 0; i < Math.min(parCount, 10); i++) {
        const contractStr = mod.UTF8ToString(parPtr + 8 + i * 10, 10);
        if (contractStr && contractStr.trim()) {
          parContracts.push(contractStr.trim());
        }
      }

      return {
        tricks,
        parScore,
        parContracts,
      };
    } finally {
      mod._free(dealPtr);
      mod._free(resPtr);
      mod._free(parPtr);
    }
  } catch (err) {
    console.error('Error calculating DDS analysis:', err);
    return null;
  }
}
