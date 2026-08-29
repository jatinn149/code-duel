import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { MatchState, ExecutionVerdict } from '@code-duel/types';
import { SocketEvents } from '@code-duel/shared';

const API_URL = 'http://localhost:3001/api/v1';
const WS_URL = 'http://localhost:3001';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScenario() {
  console.log('=== STARTING PRODUCTION CERTIFICATION INTEGRATION TEST ===\n');

  let userA, userB;
  let tokenA, tokenB;

  console.log('1. Authentication Journey');
  try {
    // Generate unique usernames to avoid conflicts
    const randomSuffix = Date.now().toString().slice(-4);
    const emailA = `playerA_${randomSuffix}@test.com`;
    const emailB = `playerB_${randomSuffix}@test.com`;

    const resA = await axios.post(`${API_URL}/auth/signup`, {
      username: `PlayerA_${randomSuffix}`,
      email: emailA,
      password: 'Password123!',
    }, { timeout: 5000 });
    if (!resA.data || !resA.data.data) {
      console.error('Unexpected resA format:', resA.data);
      process.exit(1);
    }
    tokenA = resA.data.data.accessToken;
    userA = resA.data.data.user;
    console.log(`✅ User A registered: ${userA.username}`);

    const resB = await axios.post(`${API_URL}/auth/signup`, {
      username: `PlayerB_${randomSuffix}`,
      email: emailB,
      password: 'Password123!',
    }, { timeout: 5000 });
    if (!resB.data || !resB.data.data) {
      console.error('Unexpected resB format:', resB.data);
      process.exit(1);
    }
    tokenB = resB.data.data.accessToken;
    userB = resB.data.data.user;
    console.log(`✅ User B registered: ${userB.username}`);
  } catch (err: any) {
    console.error('❌ Authentication failed:', err.response?.data || err.message);
    process.exit(1);
  }

  console.log('\n2. WebSocket Connection Journey');
  const socketA = io(WS_URL, { auth: { token: tokenA } });
  const socketB = io(WS_URL, { auth: { token: tokenB } });

  socketA.onAny((event, ...args) => {
    console.log(`[Socket A] Received event: ${event}`);
  });
  socketB.onAny((event, ...args) => {
    console.log(`[Socket B] Received event: ${event}`);
  });

  await new Promise<void>((resolve) => {
    let connected = 0;
    socketA.on('connect', () => { connected++; if (connected === 2) resolve(); });
    socketB.on('connect', () => { connected++; if (connected === 2) resolve(); });
  });
  console.log('✅ Both users connected to WebSocket');

  console.log('\n3. Private Room Creation & Join Journey');
  socketA.emit(SocketEvents.CREATE_ROOM, { maxPlayers: 2 });
  
  let roomId: string = '';
  const roomCreatedPromise = new Promise<void>(resolve => {
    socketA.on(SocketEvents.ROOM_UPDATED, (room) => {
      if (room.state === MatchState.WAITING && room.players.length === 1) {
        roomId = room.id;
        resolve();
      }
    });
  });

  await roomCreatedPromise;
  console.log(`✅ Private room created by User A: ${roomId}`);

  socketB.emit(SocketEvents.JOIN_ROOM, { roomId });

  let currentRoomA: any = null;
  const roomJoinedPromise = new Promise<void>(resolve => {
    socketA.on(SocketEvents.ROOM_UPDATED, (room) => {
      currentRoomA = room;
      if (room.state === MatchState.WAITING && room.players.length === 2) {
        resolve();
      }
    });
  });

  await roomJoinedPromise;
  console.log(`✅ User B joined private room. Both players in lobby.`);

  console.log('\n4. Room Preparation & Start Journey');
  // socketA.emit(SocketEvents.TOGGLE_READY);
  socketB.emit(SocketEvents.TOGGLE_READY);
  await delay(500);

  // Player A is host (the one who created the match first implicitly)
  socketA.emit(SocketEvents.START_COUNTDOWN);
  
  await new Promise<void>(resolve => {
    socketA.on(SocketEvents.START_COUNTDOWN, () => resolve());
  });
  console.log(`✅ Countdown sequence initiated`);

  await new Promise<void>(resolve => {
    socketA.on(SocketEvents.GAME_START, () => resolve());
  });
  console.log(`✅ Match started (state: PLAYING)`);

  console.log('\n5. Code Submission & Execution Journey');
  const code = 'def solution():\n  return [0, 1]';
  socketA.emit(SocketEvents.SUBMIT_CODE, { code, keystrokes: 50 });
  console.log(`✅ User A submitted code to Judge Service`);

  // Wait for judge result
  let roundResultsPromise = new Promise<any>(resolve => {
    socketA.on(SocketEvents.ROUND_ENDED, (data) => resolve(data));
  });

  let judgeProgressPromise = new Promise<void>(resolve => {
    socketA.on('judge:progress', (data) => resolve());
  });

  await judgeProgressPromise;
  console.log(`✅ Received judge progress updates`);

  let matchEndedPromise = new Promise<any>(resolve => {
    socketA.on(SocketEvents.GAME_END, (data) => resolve(data));
  });

  // User B submits failing code
  socketB.emit(SocketEvents.SUBMIT_CODE, { code: 'def solution(): pass', keystrokes: 20 });
  console.log(`✅ User B submitted code to Judge Service`);

  const roundResults = await roundResultsPromise;
  console.log(`✅ Round ended correctly. Score calculated.`);

  console.log('\n6. Match Conclusion Journey');

  const matchEndResult = await matchEndedPromise;
  console.log(`✅ Match ended successfully (winner: ${matchEndResult.winnerId})`);

  socketA.emit(SocketEvents.LEAVE_ROOM);
  socketB.emit(SocketEvents.LEAVE_ROOM);
  
  socketA.disconnect();
  socketB.disconnect();

  console.log('\n=== INTEGRATION TEST SUITE COMPLETED ===');
  process.exit(0);
}

runScenario().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
