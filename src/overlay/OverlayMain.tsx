import React from 'react';
import { Tab, Tabs } from '@mui/material';
import { ChatView } from './ChatView';
import { TradeView } from './TradeView';
import { expandPanel } from '..';
import {
  clearTradeParsedListener,
  setupCityDataUpdatedListener,
  setupTradeParsedListener,
  TradeParsedMessage,
} from '../chrome/messages';
import { useOverlayStore } from './overlayStore';
import { MessageFromInjectedScript } from '../inject/MessageFromInjectedScript';
import { getAccountById, getAccountByTabId, loadAccountManagerFromStorage } from '../elvenar/AccountManager';
import { parseSocketMessage } from './parseSocketMessage';
import { ChatMessage } from '../model/socketMessages/chatPayload';

export function OverlayMain() {
  const [tab, setTab] = React.useState(0);
  const [chapter, setChapter] = React.useState(0);
  const [tradesMsg, setTradesMsg] = React.useState<TradeParsedMessage | undefined>(undefined);
  const userMap = React.useRef<Record<string, string>>({});
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);

  const setOfferedGoods = useOverlayStore((state) => state.setOfferedGoods);
  const storeSetUserMap = useOverlayStore((state) => state.setUserMap);

  const storeChatMessages = useOverlayStore((state) => state.chatMessages);
  const storeSetChatMessages = useOverlayStore((state) => state.setChatMessages);

  React.useEffect(() => {
    const newMessages = chatMessages.filter((m) => !storeChatMessages?.some((sm) => sm.uuid === m.uuid));

    storeSetChatMessages([...storeChatMessages, ...newMessages]);
  }, [chatMessages]);

  const messageHandler = (event: MessageEvent<MessageFromInjectedScript>) => {
    // We must verify the sender and the message type for security
    if (event.source !== window || event.data.type !== 'MY_EXTENSION_MESSAGE') {
      return;
    }

    const socketMessage = parseSocketMessage(event.data.payload.value);

    if (!socketMessage) return;

    console.log('Content script received message from injected script', socketMessage);

    if (socketMessage?.type === 'ChatHistory') {
      userMap.current =
        socketMessage.body.payload.users.reduce<Record<string, string>>((map, user) => {
          map[user.id] = user.metadata.public_name;
          return map;
        }, {}) || {};

      storeSetUserMap(userMap.current);

      setChatMessages(socketMessage.body.payload.messages);
    }

    if (socketMessage?.type === 'Who') {
      const userNames = socketMessage.body.payload.userIds.map((id) => userMap.current[id] || 'Unknown');
      console.log('Connected users:', userNames);
    }

    if (socketMessage?.type === 'SendMessage') {
      const user = userMap.current[socketMessage.body.user] || 'Unknown';
      const msg = socketMessage.body.message;
      const uuid = socketMessage.headers['X-UUID'] || new Date().getTime().toString();
      const newMessage: ChatMessage = {
        uuid,
        user: socketMessage.body.user,
        text: msg,
        timestamp: socketMessage.body.timestamp,
      };
      setChatMessages((prev) => [...prev, newMessage]);
      console.log(`${user}: ${msg}`);
    }
  };

  React.useEffect(() => {
    if (chapter < 18 || !tradesMsg) {
      return;
    }
    const offeredGoods = Array.from(new Set(tradesMsg.trades.map((trade) => trade.offer)));
    setOfferedGoods(offeredGoods);
    expandPanel(offeredGoods.length > 0);
    setTab(1);
  }, [tradesMsg, chapter]);

  React.useEffect(() => {
    window.addEventListener('message', messageHandler);

    async function setup(tabId: number) {
      await loadAccountManagerFromStorage();
      const accountId = getAccountByTabId(tabId);
      if (accountId) {
        const account = getAccountById(accountId);
        if (account && account.cityQuery) {
          setChapter(account.cityQuery.chapter);
        }
      }
    }

    setupTradeParsedListener((tradesMsg) => {
      setTradesMsg(tradesMsg);
    });

    setupCityDataUpdatedListener(({ tabId }) => {
      setup(tabId);
    });

    return () => {
      window.removeEventListener('message', messageHandler);
      clearTradeParsedListener();
    };
  }, []);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <div style={{ height: '100%' }}>
      <Tabs value={tab} onChange={handleChange} aria-label='Overlay Tabs'>
        <Tab label='Chat' />
        {chapter >= 18 && <Tab label='Trade' />}
      </Tabs>
      {tab === 0 && <ChatView />}
      {chapter >= 18 && tab === 1 && <TradeView />}
    </div>
  );
}
