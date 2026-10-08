import { Server } from 'socket.io';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { parseCookies, AUTH_COOKIE } from '../utils/cookies.js';
import { verifyTableToken } from '../utils/token.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Table } from '../models/Table.js';
import { Order } from '../models/Order.js';
import { ServiceRequest } from '../models/ServiceRequest.js';
import { setEmitter } from './emitter.js';
import { transitionOrder } from '../services/orderService.js';
import { getOrCreateOpenSession } from '../services/sessionService.js';

const ROLE_ROOM = { chef: 'kitchen', waiter: 'waiters', manager: 'managers' };

/** Verify a staff JWT from the handshake cookie. */
async function staffFromHandshake(handshake) {
  const cookies = parseCookies(handshake.headers?.cookie);
  const token = cookies[AUTH_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive) return null;
    return { id: user._id, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true },
    pingInterval: 20_000,
    pingTimeout: 25_000
  });
  setEmitter(io);

  io.on('connection', (socket) => {
    logger.debug({ sid: socket.id }, 'socket connected');

    socket.on('join', async (payload = {}, ack) => {
      try {
        const joined = [];

        // Staff join via httpOnly cookie
        const staff = await staffFromHandshake(socket.handshake);
        if (staff) {
          socket.data.staff = staff;
          const room = ROLE_ROOM[staff.role];
          await socket.join(room);
          joined.push(room);
        }

        // Customer join via table token (+ optional order rooms)
        if (payload.tableToken) {
          const tokenPayload = verifyTableToken(payload.tableToken);
          const table = await Table.findById(tokenPayload.table).lean();
          if (table && table.isActive && table.tokenVersion === tokenPayload.v) {
            const room = `table:${table._id}`;
            await socket.join(room);
            joined.push(room);

            for (const orderId of payload.orderIds || []) {
              const order = await Order.findById(orderId).select('table session').lean();
              if (order && String(order.table) === String(table._id)) {
                await socket.join(`order:${orderId}`);
              }
            }
          }
        }
        ack?.({ ok: true, rooms: joined });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    // Client -> server: staff status change (validated like REST)
    socket.on('order:status', async (data = {}, ack) => {
      const staff = socket.data.staff;
      if (!staff) return ack?.({ ok: false, error: 'Not authenticated' });
      try {
        const order = await transitionOrder(data.orderId, data.status, staff, data.reason || '');
        ack?.({ ok: true, data: { id: String(order._id), status: order.status } });
      } catch (err) {
        ack?.({ ok: false, error: err.message, code: err.code });
      }
    });

    // Client -> server: customer service request (table-token validated)
    socket.on('request:create', async (data = {}, ack) => {
      try {
        const tokenPayload = verifyTableToken(data.tableToken);
        const table = await Table.findById(tokenPayload.table).lean();
        if (!table || !table.isActive || table.tokenVersion !== tokenPayload.v) {
          return ack?.({ ok: false, error: 'Invalid table code' });
        }
        const session = await getOrCreateOpenSession(table._id);
        const request = await ServiceRequest.create({
          table: table._id,
          session: session._id,
          type: ['waiter', 'bill', 'water', 'other'].includes(data.type) ? data.type : 'waiter'
        });
        const { emitRequestNew } = await import('./emitter.js');
        emitRequestNew({ id: String(request._id), table: table.number, type: request.type });
        ack?.({ ok: true, data: { id: String(request._id) } });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ sid: socket.id, reason }, 'socket disconnected');
    });
  });

  logger.info('Socket.IO ready');
  return io;
}
