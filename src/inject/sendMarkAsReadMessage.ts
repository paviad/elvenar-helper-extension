import { getWebSocketSendHook } from './CustomWebSocket';

/*
implement sending a "mark as read message" that looks like this:

SEND
X-SocketServer-Plugin:chat/markasread
X-SocketServer-Method:update
X-SocketServer-Topic:guild.169
X-Correlation:848933052
destination:/queue
content-length:2

{}
*/
export async function sendMarkAsReadMessage(playerId: number, guildId: number) {
  const globalSendHook = getWebSocketSendHook();
  if (!globalSendHook) {
    console.warn('ElvenAssist: WebSocket send hook is not installed yet.');
    return;
  }

  // if (!globalTopicId) {
  //   console.warn('ElvenAssist: Topic ID is not available.');
  //   return;
  // }
  globalSendHook(`SEND
X-SocketServer-Plugin:chat/markasread
X-SocketServer-Method:update
X-SocketServer-Topic:guild.${guildId}
X-Correlation:${playerId}
destination:/queue
content-length:2

{}\0`);
}
