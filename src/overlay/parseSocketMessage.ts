import {
  SocketMessageChatHistory,
  SocketMessage,
  SocketMessageWho,
  SocketMessageSend,
} from '../model/socketMessages/socketMessage';

export const parseSocketMessage = (data: string): SocketMessage | null => {
  /*
    Example data:
    -------------------

MESSAGE
destination:/queue
subscription:sub-0
message-id:2
X-SocketServer-Plugin:chat/rpc
X-SocketServer-Method:get-history
X-UUID:ed5db6db-fe3c-465e-bc3d-c00c39dc85ed
X-SocketServer-Topic:guild.169
X-Correlation:848933052

{ ... }
  */
  // data always ends with a null character, remove it
  data = data.trimEnd();
  if (data.endsWith('\0')) {
    data = data.slice(0, -1);
  }
  // The first line is the message type, headers follow until the first empty line, then the payload
  const lines = data.split('\n');
  if (lines.length < 3) {
    return null;
  }
  const type = lines[0].trim();
  const headers: Record<string, string> = {};
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      i++;
      break;
    }
    const separatorIndex = line.indexOf(':');
    if (separatorIndex > 0) {
      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1).trim();
      headers[key] = value;
    }
  }
  const payloadLines = lines.slice(i);
  const payloadString = payloadLines.join('\n').trim();
  let body: unknown;
  try {
    body = JSON.parse(payloadString);
  } catch (e) {
    console.log('ElvenAssist: Error parsing socket message payload JSON:', e, { payloadString });
    return null;
  }

  const plugin = headers['X-SocketServer-Plugin'];
  const method = headers['X-SocketServer-Method'];
  const combinedType = plugin && method ? `${plugin}/${method}` : null;

  switch (combinedType) {
    case 'chat/rpc/get-history':
      return { type: 'ChatHistory', headers, body } as SocketMessageChatHistory;
    case 'chat/who':
      return { type: 'Who', headers, body } as SocketMessageWho;
    case 'chat/send':
      return { type: 'SendMessage', headers, body } as SocketMessageSend;
    default:
      return null;
  }
};
