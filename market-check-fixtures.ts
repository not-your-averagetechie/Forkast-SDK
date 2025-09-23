import axios from 'axios';
import * as dotenv from 'dotenv';
import { ForkastSDK, Network } from '@forkastgg/client';
import * as readline from 'readline';

dotenv.config();

const NETWORK = process.env.NETWORK || 'mainnet';

const CONFIG = {
    testnet: {
        EVENT_API_URL: process.env.TESTNET_MARKET_API_URL || 'http://localhost:3000/market/event',
    },
    mainnet: {
        EVENT_API_URL: process.env.MAINNET_MARKET_API_URL,
    }
} as const;

const EVENT_API_URL = CONFIG[NETWORK as 'testnet' | 'mainnet'].EVENT_API_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const API_KEY = process.env.API_KEY;

// Wallets (reuse two accounts like mmil.ts)
const WALLET_ADDRESS = process.env.MAINNET_WALLET_ADDRESS || process.env.TESTNET_WALLET_ADDRESS;
const PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY || process.env.TESTNET_PRIVATE_KEY;
const PROXY_WALLET = process.env.MAINNET_PROXY_WALLET || process.env.TESTNET_PROXY_WALLET;
const WALLET_ADDRESS_2 = process.env.MAINNET_WALLET_ADDRESS_2 || process.env.TESTNET_WALLET_ADDRESS_2;
const PRIVATE_KEY_2 = process.env.MAINNET_PRIVATE_KEY_2 || process.env.TESTNET_PRIVATE_KEY_2;
const PROXY_WALLET_2 = process.env.MAINNET_PROXY_WALLET_2 || process.env.TESTNET_PROXY_WALLET_2;

if (!EVENT_API_URL) {
    console.error('❌ EVENT_API_URL is not configured. Set TESTNET_MARKET_API_URL or MAINNET_MARKET_API_URL.');
    process.exit(1);
}

async function httpGetJson(url: string, params?: any) {
    const isLocalEventEndpoint = /\/market\/event(\b|$)/.test(url);
    const isPublicMarketsBase = /\/markets(\b|$)/.test(url);
    const headers: Record<string, string> = {};
    if (ACCESS_TOKEN) headers['Authorization'] = `Bearer ${ACCESS_TOKEN}`;

    if (isLocalEventEndpoint) {
        const res = await axios.get(url, { params: { ...(params || {}), accessToken: ACCESS_TOKEN }, headers, timeout: 30000 });
        return res.data;
    }
    if (isPublicMarketsBase && params?.id) {
        const res = await axios.get(`${url}/${params.id}`, { params: { accessToken: ACCESS_TOKEN }, headers, timeout: 30000 });
        return res.data;
    }
    const res = await axios.get(url, { params, headers, timeout: 30000 });
    return res.data;
}

// SDK and order placement helpers
const sdk = new ForkastSDK(NETWORK === 'mainnet' ? Network.MAINNET : Network.TESTNET, API_KEY);

async function loginWithPrivateKey(pk?: string): Promise<string | null> {
    if (!pk) return null;
    try {
        const res = await sdk.getAccountService().loginWithPrivateKey(pk);
        return res.accessToken;
    } catch (e: any) {
        console.log(`   ⚠️  Login failed: ${e?.message || e}`);
        return null;
    }
}

function makeAccount(address?: string, pk?: string, proxy?: string, accessToken?: string) {
    return { wallet: address, private_key: pk, proxy_wallet: proxy, accessToken };
}

async function placeBuy(marketId: number, token: any, account: any, price: number, amount: number): Promise<boolean> {
    try {
        const res = await sdk.getOrderService().placeSingleOrder(
            marketId,
            token,
            account,
            price,
            amount,
            0,
            account?.accessToken
        );
        return !!res;
    } catch (e: any) {
        if (e?.response?.data?.message?.includes('salt or signature already exists')) return false;
        console.log(`   ⚠️  Order failed at $${price}: ${e?.message || e}`);
        return false;
    }
}

async function askConfirm(question: string): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(`${question} (y/N): `, (answer) => {
            rl.close();
            const a = String(answer || '').trim().toLowerCase();
            resolve(a === 'y' || a === 'yes');
        });
    });
}

function getFixtureIdFromEvent(event: any): string | number | undefined {
    // Try common property names and nested locations
    const candidates = [
        event?.fixtureId, event?.fixturesId, event?.fixture_id, event?.fixtures_id,
        event?.data?.fixtureId, event?.data?.fixturesId, event?.data?.fixture_id, event?.data?.fixtures_id,
    ];
    for (const v of candidates) {
        if (v !== undefined && v !== null && String(v).length > 0) return v;
    }
    return undefined;
}

function isMarketActive(status: any): boolean {
    const s = String(status || '').toLowerCase();
    if (!s) return true;
    const activeLike = ['active', 'open', 'trading', 'live'];
    const inactiveLike = ['resolved', 'closed', 'settled', 'cancelled', 'expired'];
    if (inactiveLike.includes(s)) return false;
    if (activeLike.includes(s)) return true;
    return true;
}

function parseSportsbooks(): string[] {
    const raw = (process.env.OPTIC_SPORTSBOOKS || 'Pinnacle,DraftKings,BetMGM,FanDuel,Caesars').trim();
    return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function inferSportFromFixtureId(fixtureId: string | number): string | undefined {
    const s = String(fixtureId);
    if (s.includes(':')) return s.split(':')[0];
    return undefined;
}

async function fetchOpticOddsOnce(fixtureId: string | number, sportsbook?: string) {
    const apiKey = process.env.OPTIC_ODDS_API_KEY;
    if (!apiKey) {
        console.warn('   ⚠️  OPTIC_ODDS_API_KEY not set; skipping odds fetch');
        return null;
    }
    const url = 'https://api.opticodds.com/api/v3/fixtures/odds';
    try {
        const params: Record<string, any> = { fixture_id: fixtureId, market: 'moneyline' };
        const sport = inferSportFromFixtureId(fixtureId);
        if (sport) params.sport = sport;
        if (sportsbook) params.sportsbook = sportsbook;
        const res = await axios.get(url, {
            params,
            headers: {
                'x-api-key': apiKey
            },
            timeout: 20000
        });
        if (String(process.env.OPTIC_DEBUG || '').toLowerCase() === 'true') {
            const topKeys = Object.keys(res.data || {}).slice(0, 10);
            const qs = `fixture_id=${fixtureId}${sportsbook ? `&sportsbook=${encodeURIComponent(sportsbook)}` : ''}`;
            console.log(`      ↪ OpticOdds ${res.status} ${url}?${qs} | keys: ${topKeys.join(', ')}`);
            const dataNode = res.data?.data ?? res.data;
            if (Array.isArray(dataNode)) {
                console.log(`      ↪ items: ${dataNode.length}`);
            }
            if (Array.isArray(dataNode) && dataNode[0]) {
                const sample = JSON.stringify(dataNode[0]).slice(0, 400);
                console.log(`      ↪ sample: ${sample}...`);
            }
        }
        return res.data;
    } catch (e: any) {
        console.log(`   ⚠️  Optic Odds fetch failed for fixtureId=${fixtureId}${sportsbook ? ` (sportsbook=${sportsbook})` : ''}: ${e?.message || e}`);
        if (String(process.env.OPTIC_DEBUG || '').toLowerCase() === 'true' && e?.response) {
            console.log(`      ↪ status=${e.response.status} body=${JSON.stringify(e.response.data).slice(0, 300)}...`);
        }
        return null;
    }
}

async function fetchOpticOdds(fixtureId: string | number) {
    const sportsbooks = parseSportsbooks();
    // Try each sportsbook until one returns non-empty .data
    for (const sb of sportsbooks) {
        const payload = await fetchOpticOddsOnce(fixtureId, sb);
        const dataNode = payload?.data ?? payload;
        if (Array.isArray(dataNode) && dataNode.length > 0) return payload;
    }
    // Fallback: try without sportsbook filter (all books)
    const payloadAll = await fetchOpticOddsOnce(fixtureId, undefined);
    return payloadAll;
}

function summarizeOpticOdds(oddsPayload: any): string | null {
    if (!oddsPayload) return null;
    const data = oddsPayload?.data ?? oddsPayload;
    const lines: string[] = [];
    const items = Array.isArray(data) ? data : [data];
    const first = items.find(Boolean);
    if (!first) return null;

    // Prefer exact team odds if present
    const exact = getExactTeamOdds(first);
    if (exact) {
        const { homeTeam, awayTeam, homeAmerican, awayAmerican, homeDecimal, awayDecimal, sportsbook } = exact;
        const homePct = toImpliedProbabilityPercent(homeAmerican, homeDecimal);
        const awayPct = toImpliedProbabilityPercent(awayAmerican, awayDecimal);
        const [homeStr, awayStr] = normalizePercents(homePct, awayPct);
        return `ML ${homeTeam}: ${homeStr}% vs ${awayTeam}: ${awayStr}%${sportsbook ? ` @ ${sportsbook}` : ''}`;
    }

    // Try common structures
    const ml = first.moneyline || first.ml || first.Moneyline;
    const spread = first.spread || first.handicap || first.Spread;
    const total = first.total || first.totals || first.Total;

    if (ml) {
        const home = ml.home ?? ml.H ?? ml.Home;
        const away = ml.away ?? ml.A ?? ml.Away;
        if (home !== undefined || away !== undefined) {
            lines.push(`ML H:${home ?? '-'} A:${away ?? '-'}`);
        }
    }
    if (spread) {
        const line = spread.line ?? spread.points ?? spread.Line;
        const home = spread.home ?? spread.H ?? spread.Home;
        const away = spread.away ?? spread.A ?? spread.Away;
        if (line !== undefined || home !== undefined || away !== undefined) {
            lines.push(`Spread ${line ?? '-'} H:${home ?? '-'} A:${away ?? '-'}`);
        }
    }
    if (total) {
        const line = total.line ?? total.points ?? total.Line;
        const over = total.over ?? total.o ?? total.Over;
        const under = total.under ?? total.u ?? total.Under;
        if (line !== undefined || over !== undefined || under !== undefined) {
            lines.push(`Total ${line ?? '-'} O:${over ?? '-'} U:${under ?? '-'}`);
        }
    }

    // If nothing matched, try to print first-level keys succinctly
    if (lines.length === 0) {
        const keys = Object.keys(first).slice(0, 5).join(', ');
        lines.push(`keys: ${keys}`);
    }
    return lines.join(' | ');
}

// Convert American or Decimal odds to implied probability in percent (not de-vigged)
function toImpliedProbabilityPercent(american?: string | number, decimal?: number): number | undefined {
    if (american !== undefined && american !== null && String(american).trim() !== '') {
        const a = Number(american);
        if (Number.isFinite(a) && a !== 0) {
            const p = a > 0 ? (100 / (a + 100)) : (-a / (-a + 100));
            return Math.max(0, Math.min(1, p)) * 100;
        }
    }
    if (decimal !== undefined && decimal !== null) {
        const d = Number(decimal);
        if (Number.isFinite(d) && d > 1) {
            const p = 1 / d;
            return Math.max(0, Math.min(1, p)) * 100;
        }
    }
    return undefined;
}

// Normalize two percentages to sum to 100 when both present; otherwise return as-is
function normalizePercents(h?: number, a?: number): [string, string] {
    if (h !== undefined && a !== undefined) {
        const s = h + a;
        if (s > 0) {
            const hn = (h / s) * 100;
            const an = (a / s) * 100;
            return [hn.toFixed(1), an.toFixed(1)];
        }
    }
    return [h !== undefined ? h.toFixed(1) : '-', a !== undefined ? a.toFixed(1) : '-'];
}

// Attempt to extract exact moneyline odds for home/away across common shapes
function getExactTeamOdds(item: any): null | {
    homeTeam?: string,
    awayTeam?: string,
    homeAmerican?: string | number,
    awayAmerican?: string | number,
    homeDecimal?: number,
    awayDecimal?: number,
    sportsbook?: string
} {
    try {
        const homeTeam = item?.home_competitors?.[0]?.name || item?.home_team_display || item?.homeTeam?.name || item?.home_team || item?.home || item?.home_name;
        const awayTeam = item?.away_competitors?.[0]?.name || item?.away_team_display || item?.awayTeam?.name || item?.away_team || item?.away || item?.away_name;
        const sportsbook = item?.sportsbook || item?.book || item?.source;

        // Direct moneyline fields
        const ml = item?.moneyline || item?.ml;
        const mlNode = ml?.odds || ml;
        const tryExtract = (node: any) => {
            if (!node) return null;
            const h = node.home ?? node.H ?? node.Home ?? node.home_price ?? node.homeOdds ?? node.home_decimal ?? node.home_american;
            const a = node.away ?? node.A ?? node.Away ?? node.away_price ?? node.awayOdds ?? node.away_decimal ?? node.away_american;
            const homeAmerican = typeof h === 'object' ? (h.american ?? h.us ?? h.American) : (isNaN(Number(h)) ? h : undefined);
            const awayAmerican = typeof a === 'object' ? (a.american ?? a.us ?? a.American) : (isNaN(Number(a)) ? a : undefined);
            const homeDecimal = typeof h === 'object' ? (h.decimal ?? h.Decimal ?? h.eu) : (Number.isFinite(Number(h)) ? Number(h) : undefined);
            const awayDecimal = typeof a === 'object' ? (a.decimal ?? a.Decimal ?? a.eu) : (Number.isFinite(Number(a)) ? Number(a) : undefined);
            if (homeAmerican || awayAmerican || homeDecimal || awayDecimal) {
                return { homeTeam, awayTeam, homeAmerican, awayAmerican, homeDecimal, awayDecimal, sportsbook };
            }
            return null;
        };

        const direct = tryExtract(mlNode);
        if (direct) return direct;

        // Markets-based structures: item.markets[].type/key ~ moneyline; look at outcomes
        if (Array.isArray(item?.markets)) {
            const mm = item.markets.find((m: any) => /moneyline|ml/i.test(String(m?.key || m?.type || m?.name || '')));
            const outcomes = mm?.outcomes || mm?.selection || mm?.selections;
            if (Array.isArray(outcomes)) {
                // Try to map outcomes to home/away by comparing names
                const homeName = homeTeam?.toLowerCase();
                const awayName = awayTeam?.toLowerCase();
                let homeAmerican: any, awayAmerican: any, homeDecimal: any, awayDecimal: any;
                for (const o of outcomes) {
                    const nm = String(o?.name || o?.team || o?.runner || '').toLowerCase();
                    const price = o?.price || o?.odds || o?.line || o?.moneyline;
                    const american = o?.american ?? o?.us ?? o?.price_american ?? o?.moneyline_american;
                    const decimal = o?.decimal ?? o?.eu ?? o?.price_decimal ?? o?.moneyline_decimal;
                    if (homeName && nm.includes(homeName)) {
                        homeAmerican = homeAmerican ?? american;
                        homeDecimal = homeDecimal ?? (Number.isFinite(Number(price)) ? Number(price) : decimal);
                    } else if (awayName && nm.includes(awayName)) {
                        awayAmerican = awayAmerican ?? american;
                        awayDecimal = awayDecimal ?? (Number.isFinite(Number(price)) ? Number(price) : decimal);
                    }
                }
                if (homeAmerican || awayAmerican || homeDecimal || awayDecimal) {
                    return { homeTeam, awayTeam, homeAmerican, awayAmerican, homeDecimal, awayDecimal, sportsbook };
                }
            }
        }

        // Odds array structure like in provided example: item.odds[] entries with market, team_id, price (American)
        if (Array.isArray(item?.odds)) {
            const mlEntries = item.odds.filter((o: any) => /moneyline/i.test(String(o?.market || o?.market_id || '')));
            const homeId = item?.home_competitors?.[0]?.id;
            const awayId = item?.away_competitors?.[0]?.id;
            const norm = (s?: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            const homeSlug = norm(homeTeam);
            const awaySlug = norm(awayTeam);
            let homeAmerican: any, awayAmerican: any;
            let homeDecimal: any, awayDecimal: any;
            for (const o of mlEntries) {
                const teamId = o?.team_id;
                const normalized = norm(o?.normalized_selection || o?.selection || o?.name);
                const price = o?.price; // American integer
                if ((homeId && teamId === homeId) || (!homeId && homeSlug && normalized === homeSlug)) {
                    if (homeAmerican === undefined) homeAmerican = price;
                } else if ((awayId && teamId === awayId) || (!awayId && awaySlug && normalized === awaySlug)) {
                    if (awayAmerican === undefined) awayAmerican = price;
                }
            }
            if (homeAmerican !== undefined || awayAmerican !== undefined) {
                return { homeTeam, awayTeam, homeAmerican, awayAmerican, homeDecimal, awayDecimal, sportsbook: mlEntries?.[0]?.sportsbook || sportsbook };
            }
        }
    } catch {}
    return null;
}

async function main() {
    // Prompt user for starting market and count
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>(res => rl.question(q, ans => res(ans)));

    const startInput = await ask('🔍 Enter latest market ID to start from (default 700): ');
    const countInput = await ask('📊 How many markets to check? (default 50, max 1000): ');
    rl.close();

    let latestMarketId = parseInt((startInput || '').trim());
    if (isNaN(latestMarketId) || latestMarketId <= 0) latestMarketId = parseInt(process.env.LATEST_MARKET_ID || '700');

    let toCheck = parseInt((countInput || '').trim());
    if (isNaN(toCheck) || toCheck <= 0) toCheck = parseInt(process.env.MARKETS_TO_CHECK || '50');
    if (toCheck > 1000) toCheck = 1000;

    console.log('='.repeat(70));
    console.log('🧪 MARKET CHECK (with fixtures id)');
    console.log('='.repeat(70));
    console.log(`🌐 Network: ${NETWORK}`);
    console.log(`🔎 Event endpoint: ${EVENT_API_URL}`);
    console.log(`🎯 Range: ${latestMarketId} → ${Math.max(1, latestMarketId - toCheck + 1)} (${toCheck} events)`);

    for (let eventId = latestMarketId; eventId > latestMarketId - toCheck; eventId--) {
        try {
            const event = await httpGetJson(EVENT_API_URL!, { id: eventId });
            if (!event) {
                console.log(`\n🔍 Event ${eventId}: not found`);
                continue;
            }

            // Support both hosted format { data: { markets: [...] }} and direct { markets: [...] }
            const eventData = event?.data ?? event;
            const fixtureIdGlobal = getFixtureIdFromEvent(event) ?? getFixtureIdFromEvent(eventData);

            const markets: any[] = Array.isArray(eventData?.markets) ? eventData.markets : [];
            if (markets.length === 0) {
                console.log(`\n🔍 Event ${eventId}: no markets${fixtureIdGlobal ? ` | fixtureId=${fixtureIdGlobal}` : ''}`);
                continue;
            }

            console.log(`\n🔍 Event ${eventId}: ${markets.length} market(s)${fixtureIdGlobal ? ` | fixtureId=${fixtureIdGlobal}` : ''}`);

            // Login once per event for both accounts
            const access1 = await loginWithPrivateKey(PRIVATE_KEY);
            const access2 = await loginWithPrivateKey(PRIVATE_KEY_2);
            const account1 = makeAccount(WALLET_ADDRESS, PRIVATE_KEY, PROXY_WALLET, access1 || ACCESS_TOKEN || undefined);
            const account2 = makeAccount(WALLET_ADDRESS_2, PRIVATE_KEY_2, PROXY_WALLET_2, access2 || ACCESS_TOKEN || undefined);

            for (const market of markets) {
                const title = market?.title || `Market ${market?.id ?? 'unknown'}`;
                const status = market?.status ?? 'unknown';
                const marketId = market?.id;
                // Prefer per-market fixture id if present
                const fixtureIdLocal = getFixtureIdFromEvent(market) || getFixtureIdFromEvent(market?.metadata);
                const fixtureId = fixtureIdLocal ?? fixtureIdGlobal;
                const header = `   • Market ${marketId}: ${title} | status=${status}${fixtureId ? ` | fixtureId=${fixtureId}` : ''}`;
                const includeInactive = String(process.env.INCLUDE_INACTIVE_ODDS || '').toLowerCase() === 'true';
                const shouldFetchOdds = fixtureId && (isMarketActive(status) || includeInactive);
                if (shouldFetchOdds) {
                    const odds = await fetchOpticOdds(fixtureId);
                    const dataNode = odds?.data ?? odds;
                    let printed = false;
                    if (dataNode) {
                        const items = Array.isArray(dataNode) ? dataNode : [dataNode];
                        for (const it of items) {
                            const exact = getExactTeamOdds(it);
                            if (exact) {
                                const { homeTeam, awayTeam, homeAmerican, awayAmerican, homeDecimal, awayDecimal, sportsbook } = exact;
                                const homePct = toImpliedProbabilityPercent(homeAmerican, homeDecimal) || undefined;
                                const awayPct = toImpliedProbabilityPercent(awayAmerican, awayDecimal) || (homePct !== undefined ? (100 - homePct) : undefined);
                                const [homeStr, awayStr] = normalizePercents(homePct, awayPct);
                                console.log(`${header} | odds: ${homeTeam ?? 'Home'} ${homeStr}% vs ${awayTeam ?? 'Away'} ${awayStr}%${sportsbook ? ` @ ${sportsbook}` : ''}`);

                                // Build ORDER PLAN based on implied probabilities, keeping 0.01 spread, 2-3 shares per 0.05 level
                                if (market && Array.isArray(market?.outcomes) && market.outcomes.length >= 2 && isMarketActive(status)) {
                                    const team1 = market.outcomes[0];
                                    const team2 = market.outcomes[1];
                                    // Map team names to outcomes by title containment (fallback to positional)
                                    const t1Name = String(team1?.title || '').toLowerCase();
                                    const t2Name = String(team2?.title || '').toLowerCase();
                                    let team1IsHome = true;
                                    if (homeTeam && awayTeam) {
                                        const h = String(homeTeam).toLowerCase();
                                        const a = String(awayTeam).toLowerCase();
                                        // naive mapping
                                        team1IsHome = t1Name.includes(h) || (!t1Name && !t2Name);
                                    }
                                    const pHome = (homePct ?? 50) / 100;
                                    const target1 = team1IsHome ? pHome : (1 - pHome);
                                    let level = Math.min(0.94, Math.max(0.06, Math.round(target1 * 100) / 100));
                                    const levels: number[] = [];
                                    for (let i = 0; i < 3; i++) {
                                        const lv = Math.max(0.06, Math.round((level - i * 0.05) * 100) / 100);
                                        if (!levels.includes(lv)) levels.push(lv);
                                    }
                                    const amounts = [3, 2, 2];
                                    // Complementary levels ensure ~0.01 spread
                                    const comp = (v: number) => Math.max(0.06, Math.min(0.94, Math.round((0.99 - v) * 100) / 100));

                                    // Login accounts already done; build account objects
                                    const acc1 = account1?.accessToken ? account1 : undefined;
                                    const acc2 = account2?.accessToken ? account2 : undefined;
                                    if (acc1 && acc2) {
                                        const ordersPlan: Array<{ outcome: any, account: any, price: number, amount: number, teamLabel: string }> = [];
                                        for (let idx = 0; idx < levels.length; idx++) {
                                            const price1 = levels[idx];
                                            const price2 = comp(price1);
                                            const amt = amounts[idx] || 2;
                                            ordersPlan.push({ outcome: team1, account: acc1, price: price1, amount: amt, teamLabel: team1IsHome ? (homeTeam || 'Home') : (awayTeam || 'Away') });
                                            ordersPlan.push({ outcome: team2, account: acc2, price: price2, amount: amt, teamLabel: team1IsHome ? (awayTeam || 'Away') : (homeTeam || 'Home') });
                                        }

                                        // Show plan
                                        console.log(`\n📋 ORDER PLAN for Market ${market.id} (${title}):`);
                                        ordersPlan.forEach((o, i) => {
                                            console.log(`  ${i + 1}. BUY ${o.amount} @ $${o.price.toFixed(2)} on ${o.teamLabel}`);
                                        });

                                        const proceed = await askConfirm('📝 Place these orders now?');
                                        if (proceed) {
                                            for (const o of ordersPlan) {
                                                await placeBuy(market.id, o.outcome, o.account, o.price, o.amount);
                                                await new Promise(r => setTimeout(r, 500));
                                            }
                                        } else {
                                            console.log('⏭️  Skipped placing orders for this market.');
                                        }
                                    }
                                }
                                printed = true;
                                break;
                            }
                        }
                    }
                    if (!printed) {
                        const summary = summarizeOpticOdds(odds);
                        console.log(`${header} | odds: ${summary ?? 'n/a'}`);
                    }
                } else {
                    if (fixtureId && !isMarketActive(status) && !includeInactive) {
                        console.log(`${header} | odds skipped (inactive; set INCLUDE_INACTIVE_ODDS=true to include)`);
                    } else {
                        console.log(header);
                    }
                }
            }
        } catch (e: any) {
            console.log(`\n⚠️  Event ${eventId}: ${e?.message || e}`);
        }
    }
}

if (typeof require !== 'undefined' && require.main === module) {
    main().catch((e) => {
        console.error('❌ Fatal error:', e);
        process.exit(1);
    });
}

export { main };


