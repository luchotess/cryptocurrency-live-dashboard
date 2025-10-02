import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OutboundMessage, QuoteTick, HourlyAvgSnapshot, StatusMessage } from '../shared/types';

@WebSocketGateway({
  namespace: '/ws/quotes',
  cors: {
    origin: process.env.NODE_ENV === 'development' ? ['http://localhost:5173', 'http://localhost:5174'] : false,
    credentials: true,
  },
})
export class QuotesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QuotesGateway.name);

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Send initial status
    const statusMessage: OutboundMessage = {
      type: 'status',
      payload: { status: 'connected' },
    };
    
    client.emit('message', statusMessage);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Broadcast a tick to all connected clients
   */
  broadcastTick(tick: QuoteTick) {
    const message: OutboundMessage = {
      type: 'tick',
      payload: tick,
    };
    
    this.server.emit('message', message);
  }

  /**
   * Broadcast an hourly average update to all connected clients
   */
  broadcastAverage(average: HourlyAvgSnapshot) {
    const message: OutboundMessage = {
      type: 'avg',
      payload: average,
    };
    
    this.server.emit('message', message);
  }

  /**
   * Broadcast status update to all connected clients
   */
  broadcastStatus(status: StatusMessage) {
    const message: OutboundMessage = {
      type: 'status',
      payload: status,
    };
    
    this.server.emit('message', message);
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    // In Socket.IO v4 with namespaces, use sockets.sockets.size
    return this.server?.sockets?.sockets?.size || 0;
  }
}