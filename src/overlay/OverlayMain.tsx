import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, Tab, Tabs, TextField } from '@mui/material';
import React from 'react';
import { expandPanel } from '../overlay';
import { clearTradeParsedListener, setupTradeParsedListener, TradeParsedMessage } from '../chrome/messages';
import { MessageFromInjectedScript } from '../inject/MessageFromInjectedScript';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { ChatView } from './ChatView';
import { HelpDialog } from './HelpDialog';
import { getOverlayStore } from './overlayStore';
import { parseSocketMessage } from './parseSocketMessage';
import { TradeView } from './TradeView';

export function OverlayMain() {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [searchActive, setSearchActive] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [tab, setTab] = React.useState(0);
  const [tradesMsg, setTradesMsg] = React.useState<TradeParsedMessage | undefined>(undefined);
  const userMap = React.useRef<Record<string, string>>({});
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const tabRef = React.useRef<number>(tab);

  const useOverlayStore = getOverlayStore();

  const chapter = useOverlayStore((state) => state.chapter);

  const setOfferedGoods = useOverlayStore((state) => state.setOfferedGoods);
  const storeSetUserMap = useOverlayStore((state) => state.setUserMap);

  const storeChatMessages = useOverlayStore((state) => state.chatMessages);
  const storeSetChatMessages = useOverlayStore((state) => state.setChatMessages);

  // Keyboard shortcut: 'C' expands overlay and goes to chat tab
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const overlayExpanded = useOverlayStore.getState().overlayExpanded;
      if (
        (event.code === 'KeyC') &&
        event.altKey &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        if (overlayExpanded && tabRef.current === 0) {
          expandPanel(false);
        } else {
          expandPanel(true);
          setTab(0); // 0 is the Chat tab
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  React.useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

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
    if (offeredGoods.length > 0) {
      setTab(1);
    }
  }, [tradesMsg, chapter]);

  React.useEffect(() => {
    window.addEventListener('message', messageHandler);

    setupTradeParsedListener((tradesMsg) => {
      setTradesMsg(tradesMsg);
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 2,
          background: '#f9f9fb',
          pr: 2,
        }}
      >
        <Tabs value={tab} onChange={handleChange} aria-label='Overlay Tabs' sx={{ flex: 1 }}>
          <Tab label='Chat' />
          {chapter >= 18 && <Tab label='Trade' />}
        </Tabs>
        {tab === 0 && (
          <>
            <IconButton aria-label='Search chat' size='small' sx={{ ml: 1 }} onClick={() => setSearchActive((v) => !v)}>
              <SearchIcon fontSize='small' />
            </IconButton>
            {searchActive && (
              <TextField
                autoFocus
                size='small'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Search chat...'
                sx={{ ml: 1, minWidth: 180 }}
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              />
            )}
          </>
        )}
        <IconButton
          aria-label='Help'
          size='small'
          sx={{ position: 'absolute', top: -46, right: 62, zIndex: 10 }} // User can adjust top/right as needed
          onClick={() => setHelpOpen(true)}
        >
          <HelpOutlineIcon fontSize='small' />
        </IconButton>
        <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      </Box>
      {tab === 0 && <ChatView searchActive={searchActive} searchTerm={searchTerm} setSearchActive={setSearchActive} />}
      {chapter >= 18 && tab === 1 && <TradeView />}
    </div>
  );
}
