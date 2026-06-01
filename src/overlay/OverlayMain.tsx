import React, { useEffect } from 'react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Badge, Box, IconButton, Tab, Tabs, TextField, Typography } from '@mui/material';
import {
  clearActiveEffectsUpdatedListener,
  clearGenericResponseListener,
  clearTradeParsedListener,
  setupActiveEffectsUpdatedListener,
  setupGenericResponseListener,
  setupTradeParsedListener,
  TradeParsedMessage,
} from '../chrome/messages';
import { ReceivedWebsocketMessage } from '../inject/websocketMessages';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { expandPanel } from '../overlay';
import { parseQuestExport } from '../util/parseQuestExport';
import { DiscordButton } from '../widgets/DiscordButton';
import { ChatView } from './ChatView';
import { EeView } from './EeView';
import { HelpDialog } from './HelpDialog';
import { getOverlayStore } from './overlayStore';
import { parseSocketMessage } from './parseSocketMessage';
import { QuestJournal } from './QuestJournal';
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
  const [initialQuestIndex, setInitialQuestIndex] = React.useState<number | undefined>(undefined);

  const useOverlayStore = getOverlayStore();
  const autoOpen = useOverlayStore((state) => state.autoOpenTrade ?? true);
  const chapter = useOverlayStore((state) => state.chapter);

  // Connect Quests from Zustand Store
  const quests = useOverlayStore((state) => state.quests);
  const setQuests = useOverlayStore((state) => state.setQuests);
  const [dropError, setDropError] = React.useState<string | undefined>(undefined);

  const chatTab = 0;
  const tradeTab = chapter >= 18 ? 1 : -1;
  const eeTab = chapter >= 18 ? 2 : 1;
  const questsTab = chapter >= 18 ? 3 : 2;

  const setOfferedGoods = useOverlayStore((state) => state.setOfferedGoods);
  const storeSetUserMap = useOverlayStore((state) => state.setUserMap);

  const storeChatMessages = useOverlayStore((state) => state.chatMessages);
  const storeSetChatMessages = useOverlayStore((state) => state.setChatMessages);

  // Keyboard shortcut: 'C' expands overlay and goes to chat tab
  React.useEffect(() => {
    const handleKeyC = (event: MessageEvent) => {
      if (event.source !== window || event.data.type !== 'capturedAltC') {
        return;
      }
      const code = event.data.payload.code;
      const tabDic = {
        KeyC: chatTab,
        KeyE: eeTab,
        KeyQ: questsTab,
      };
      if (!(code in tabDic)) {
        return;
      }
      const overlayExpanded = useOverlayStore.getState().overlayExpanded;
      const requestedTab = tabDic[code as keyof typeof tabDic];
      if (overlayExpanded && tabRef.current === requestedTab) {
        expandPanel(false);
      } else {
        expandPanel(true);
        setTab(requestedTab); // Set the tab based on the captured key
      }
    };

    window.addEventListener('message', handleKeyC);
    return () => window.removeEventListener('message', handleKeyC);
  }, []);

  React.useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  React.useEffect(() => {
    const newMessages = chatMessages.filter((m) => !storeChatMessages?.some((sm) => sm.uuid === m.uuid));

    storeSetChatMessages([...storeChatMessages, ...newMessages]);
  }, [chatMessages]);

  const messageHandler = (event: MessageEvent<ReceivedWebsocketMessage>) => {
    // We must verify the sender and the message type for security
    if (event.source !== window || event.data.type !== 'RECEIVED_WEBSOCKET_MESSAGE') {
      return;
    }

    const socketMessage = parseSocketMessage(event.data.payload.value);

    if (!socketMessage) return;

    if (socketMessage?.type === 'chat/rpc/get-history') {
      userMap.current =
        socketMessage.body.payload.users.reduce<Record<string, string>>((map, user) => {
          map[user.id] = user.metadata.public_name;
          return map;
        }, {}) || {};

      storeSetUserMap(userMap.current);

      setChatMessages(socketMessage.body.payload.messages);
    }

    if (socketMessage?.type === 'chat/who') {
      const userNames = socketMessage.body.payload.userIds.map((id) => userMap.current[id] || 'Unknown');
    }

    if (socketMessage?.type === 'chat/send') {
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
    }
  };

  React.useEffect(() => {
    if (chapter < 18 || !tradesMsg) {
      return;
    }
    const offeredGoods = Array.from(new Set(tradesMsg.trades.map((trade) => trade.offer)));
    setOfferedGoods(offeredGoods);
    if (autoOpen) {
      expandPanel(offeredGoods.length > 0);
      if (offeredGoods.length > 0) {
        setTab(tradeTab);
      }
    }
  }, [tradesMsg, chapter, autoOpen]);

  React.useEffect(() => {
    window.addEventListener('message', messageHandler);

    setupTradeParsedListener((tradesMsg) => {
      setTradesMsg(tradesMsg);
    });

    setupActiveEffectsUpdatedListener(() => {
      useOverlayStore.getState().triggerEeUpdate();
    });

    return () => {
      window.removeEventListener('message', messageHandler);
      clearTradeParsedListener();
      clearActiveEffectsUpdatedListener();
    };
  }, []);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  useEffect(() => {
    const listenerIds: string[] = [];

    listenerIds.push(
      setupGenericResponseListener<number | undefined>('R:QuestMilestoneService/updateQuestMilestone', (msg) => {
        const progress = msg.payload;
        setInitialQuestIndex(progress);
        if (progress === undefined) {
          setQuests(undefined);
        }
      }),
    );

    return () => {
      listenerIds.forEach((id) => {
        clearGenericResponseListener(id);
      });
    };
  }, []);

  // Handlers for the file drop area
  const processFile = (file: File | undefined | null) => {
    setDropError(undefined); // Clear previous errors on new attempt
    if (!file) return;

    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      setDropError('Invalid file type. Please drop a valid .txt file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedQuests = parseQuestExport(content);
        setQuests(parsedQuests);
      } catch (error) {
        if (error instanceof Error) {
          setDropError(error.message);
        } else {
          setDropError('An unknown error occurred while parsing the quest file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Required to allow dropping
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const renderLabel = (text: string) => {
    const tooltip = `Alt+C, ${text[0]}`;
    return (
      <span title={tooltip}>
        <span style={{ fontSize: '1.2em', fontWeight: 700, textDecoration: 'underline' }}>{text[0]}</span>
        {text.slice(1)}
      </span>
    );
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
          <Tab label={renderLabel('Chat')} />
          {chapter >= 18 && <Tab label='Trade' />}
          <Tab label={renderLabel('EE')} />
          <Tab label={renderLabel('Quests')} />
        </Tabs>
        {tab === chatTab && (
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

        <DiscordButton
          discordUrl='https://discord.gg/zYzUUDcMrv'
          size='small'
          sx={{ position: 'absolute', top: -46, right: 94, zIndex: 10 }}
        />

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
      {tab === chatTab && (
        <ChatView searchActive={searchActive} searchTerm={searchTerm} setSearchActive={setSearchActive} />
      )}
      {chapter >= 18 && tab === tradeTab && <TradeView />}
      {tab == eeTab && <EeView />}
      {tab === questsTab &&
        (quests === undefined ? (
          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => document.getElementById('quest-file-upload')?.click()}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flexGrow: 1,
              boxSizing: 'border-box',
              minHeight: 300,
              p: 4,
              m: 2,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: dropError ? 'error.main' : 'divider',
              borderRadius: 2,
              bgcolor: dropError ? 'rgba(211, 47, 47, 0.04)' : 'background.default', // Subtle red tint on error
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: dropError ? 'rgba(211, 47, 47, 0.08)' : 'action.hover',
              },
            }}
          >
            <input
              type='file'
              id='quest-file-upload'
              accept='.txt'
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />

            {dropError ? (
              <>
                <Typography variant='h6' sx={{ color: 'error.main', mb: 1, fontWeight: 'bold' }}>
                  Upload Failed
                </Typography>
                <Typography variant='body2' sx={{ color: 'error.main', mb: 2, maxWidth: 400 }}>
                  {dropError}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  Click or drag a new file to try again.
                </Typography>
              </>
            ) : (
              <>
                <Typography variant='h6' sx={{ color: 'text.secondary', mb: 1 }}>
                  No quests loaded
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                  Drag and drop a .txt quest export file here, or click to browse.
                </Typography>
              </>
            )}
          </Box>
        ) : initialQuestIndex === undefined ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexGrow: 1,
              p: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant='h6' sx={{ color: 'text.secondary' }}>
              There is no event currently in progress.
            </Typography>
          </Box>
        ) : (
          <QuestJournal
            quests={quests}
            initialQuestIndex={initialQuestIndex}
            onClearQuests={() => setQuests(undefined)}
          />
        ))}{' '}
    </div>
  );
}
