import { MarketOutcome, MarketPosition, MarketStatus } from "@forkastgg/client";

export interface Event {
  id: number;
  createdAt: Date;
  title: string;
  description: string;
  status: string;
  startDate: Date;
  endDate: Date;
  image: string;
  resolutionSource: string;
  volume: string;
  resolvedOn: Date | null;
  showInfoPopup: string;
  infoPopupTitle: string | null;
  infoPopupSubtitle: string | null;
  isFavorite: number;
  markets: Array<Market>;
}

export interface Market {
  id: number;
  title: string;
  question: string;
  questionId: string;
  image: string;
  rules: string;
  volume: string;
  status: MarketStatus;
  resolvedAddress: string | null;
  resolvedOutcome: string | null;
  resolvedOutcomeId: string | null;
  resolvedOn: string | null;
  openOrderNumber: number;
  positions: MarketPosition[];
  conditionId: string;
  outcomes: MarketOutcome[];
}

export interface OrderBook {
  asks: Array<{ price: number; size: number }>;
  bids: Array<{ price: number; size: number }>;
}

export interface TokenPrice {
  outcomeId: number;
  price: number;
  side: "Buy" | "Sell";
}