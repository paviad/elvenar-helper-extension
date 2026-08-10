import { parseSocketMessageRaw } from '../overlay/parseSocketMessage';
import { matchedSocketResponses } from './socketResponses';

/**
 * A STOMP frame as the game actually sends one, trimmed of the contribution ledger and the
 * reward chests. This is the push that arrives when somebody donates to one of your wonders —
 * nobody asked for it, so it never appears on the HTTP side at all.
 */
const contributionFrame = `MESSAGE
destination:/queue
subscription:sub-0
message-id:8
X-SocketServer-Plugin:events
X-SocketServer-Method:send-to-user
X-UUID:c7ec0499-d7be-4517-ba15-2aa473b40a8d
X-SocketServer-Topic:848933052

[{"__class__":"ServerResponseVO","requestClass":"AncientWonderService","requestMethod":"phaseUpdated","requestId":1,"responseData":[{"__class__":"ResearchPhaseVO","playerId":848933052,"entityBaseName":"B_Fairies_AW2","investedKnowledgePoints":955,"requiredKnowledgePoints":1040}]}]\0`;

const chatFrame = `MESSAGE
destination:/queue
subscription:sub-0
message-id:2
X-SocketServer-Plugin:chat/rpc
X-SocketServer-Method:get-history
X-UUID:ed5db6db-fe3c-465e-bc3d-c00c39dc85ed
X-SocketServer-Topic:guild.169

{"event":"history","payload":{"messages":[]}}\0`;

const bodyOf = (frame: string) => parseSocketMessageRaw(frame)?.body;

describe('matchedSocketResponses', () => {
  it('picks out a wonder contribution pushed down the socket', () => {
    const matched = matchedSocketResponses(bodyOf(contributionFrame));

    expect(matched).toHaveLength(1);
    expect(matched[0]).toMatchObject({
      requestClass: 'AncientWonderService',
      requestMethod: 'phaseUpdated',
    });
  });

  it('ignores a frame that carries no responses at all', () => {
    expect(matchedSocketResponses(bodyOf(chatFrame))).toEqual([]);
  });

  it('ignores a response nothing is listening for', () => {
    const body = [{ __class__: 'ServerResponseVO', requestClass: 'NoSuchService', requestMethod: 'poke' }];

    expect(matchedSocketResponses(body)).toEqual([]);
  });

  it('yields nothing for a body that is not a list', () => {
    expect(matchedSocketResponses(undefined)).toEqual([]);
    expect(matchedSocketResponses({ requestClass: 'AncientWonderService' })).toEqual([]);
  });
});
