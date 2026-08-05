import React, { useEffect } from 'react';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import CheckIcon from '@mui/icons-material/Check';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  clearActiveEffectsUpdatedListener,
  clearGenericResponseListener,
  clearMessagesUpdatedListener,
  clearTradeParsedListener,
  setupActiveEffectsUpdatedListener,
  setupGenericResponseListener,
  setupMessagesUpdatedListener,
  setupTradeParsedListener,
  TradeParsedMessage,
} from '../chrome/messages';
import { ReceivedWebsocketMessage } from '../inject/websocketMessages';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { expandPanel, getOverlaySize, setOverlaySizePreset } from '../overlay';
import { parseQuestExport } from '../util/parseQuestExport';
import { DiscordButton } from '../widgets/DiscordButton';
import { ChatView } from './ChatView';
import { EeView } from './EeView';
import { HelpDialog } from './HelpDialog';
import { MessagesView } from './MessagesView';
import { matchOverlaySizePreset, OVERLAY_SIZE_PRESETS, OverlaySize, OverlaySizePreset } from './overlaySize';
import { getOverlayStore } from './overlayStore';
import { parseSocketMessage } from './parseSocketMessage';
import { QuestJournal } from './QuestJournal';
import { TradeView } from './TradeView';

type OverlayTabKey = 'chat' | 'trade' | 'ee' | 'quests' | 'messages';

interface OverlayTab {
  key: OverlayTabKey;
  label: string;
  /** Second key of the Alt+C chord. Tabs without one are mouse-only. */
  shortcut?: string;
  isNew?: boolean;
}

const SIZE_PRESET_LABELS: Record<OverlaySizePreset, string> = {
  small: 'Small',
  large: 'Large',
};

const SIZE_PRESET_ORDER: OverlaySizePreset[] = ['small', 'large'];

/**
 * Same reasoning as the wonders popover in SwapsView: the menu renders inside the panel rather
 * than on the body, so this only has to clear the panel's own children — chiefly the resize
 * handle `overlay.ts` puts at 10000, which would otherwise take the clicks over the corner.
 */
const OVERLAY_MENU_Z_INDEX = 10001;

export function OverlayMain() {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [searchActive, setSearchActive] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sizeAnchor, setSizeAnchor] = React.useState<HTMLElement | null>(null);
  // Read when the menu opens rather than tracked: the panel is resized by dragging its corner,
  // outside React, so there is nothing to subscribe to and nothing to go stale in between.
  const [sizeAtMenuOpen, setSizeAtMenuOpen] = React.useState<OverlaySize | undefined>(undefined);
  const [tabKey, setTabKey] = React.useState<OverlayTabKey>('chat');
  const [tradesMsg, setTradesMsg] = React.useState<TradeParsedMessage | undefined>(undefined);
  const userMap = React.useRef<Record<string, string>>({});
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const tabRef = React.useRef<OverlayTabKey>(tabKey);
  const [initialQuestIndex, setInitialQuestIndex] = React.useState<number | undefined>(undefined);

  const useOverlayStore = getOverlayStore();
  const autoOpen = useOverlayStore((state) => state.autoOpenTrade ?? true);
  const chapter = useOverlayStore((state) => state.chapter);

  // Connect Quests from Zustand Store
  const quests = useOverlayStore((state) => state.quests);
  const setQuests = useOverlayStore((state) => state.setQuests);
  const [dropError, setDropError] = React.useState<string | undefined>(undefined);

  // Declarative, so the tab set, the Alt+C chord map and the rendered content all read from
  // one place. Hand-computed indices used to have to be adjusted in two places whenever the
  // Trade tab came and went with the chapter.
  const tabs = React.useMemo<OverlayTab[]>(
    () => [
      { key: 'chat', label: 'Chat', shortcut: 'KeyC' },
      ...(chapter >= 18 ? ([{ key: 'trade', label: 'Trade' }] satisfies OverlayTab[]) : []),
      { key: 'ee', label: 'EE', shortcut: 'KeyE' },
      { key: 'quests', label: 'Quests', shortcut: 'KeyQ' },
      { key: 'messages', label: 'Messages', shortcut: 'KeyM', isNew: true },
    ],
    [chapter],
  );

  // Selection is held as a key rather than an index, so the Trade tab appearing once the
  // chapter loads cannot silently shift which tab is showing.
  const tabIndex = Math.max(
    0,
    tabs.findIndex((t) => t.key === tabKey),
  );

  // The chord listener is installed once, so it reads the current tabs through a ref.
  const tabsRef = React.useRef(tabs);
  React.useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

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

      if (code === 'KeyX') {
        expandPanel(false);
        return;
      }

      const requested = tabsRef.current.find((t) => t.shortcut === code);
      if (!requested) {
        return;
      }
      const overlayExpanded = useOverlayStore.getState().overlayExpanded;
      if (overlayExpanded && tabRef.current === requested.key) {
        expandPanel(false);
      } else {
        expandPanel(true);
        setTabKey(requested.key); // Set the tab based on the captured key
      }
    };

    window.addEventListener('message', handleKeyC);
    return () => window.removeEventListener('message', handleKeyC);
  }, []);

  React.useEffect(() => {
    tabRef.current = tabKey;
  }, [tabKey]);

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
        setTabKey('trade');
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

    setupMessagesUpdatedListener((msg) => {
      const store = useOverlayStore.getState();
      store.triggerMessagesUpdate();
      // A detail response means the user opened Messages in-game this session -> data is live.
      if (msg.reqRespType === 'R:MessageService/fetchMessages') {
        store.setMessagesDetailsReceived(true);
      }
    });

    return () => {
      window.removeEventListener('message', messageHandler);
      clearTradeParsedListener();
      clearActiveEffectsUpdatedListener();
      clearMessagesUpdatedListener();
    };
  }, []);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabKey(tabs[newValue].key);
  };

  const openSizeMenu = (event: React.MouseEvent<HTMLElement>) => {
    setSizeAtMenuOpen(getOverlaySize());
    setSizeAnchor(event.currentTarget);
  };

  const chooseSizePreset = (preset: OverlaySizePreset) => {
    setOverlaySizePreset(preset);
    setSizeAnchor(null);
  };

  const activeSizePreset = matchOverlaySizePreset(sizeAtMenuOpen);

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

  // The chord's second key is always the label's initial, so the underline doubles as the hint.
  const renderLabel = ({ label, shortcut, isNew }: OverlayTab) => (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start' }}>
      {shortcut ? (
        <span title={`Alt+C, ${label[0]}`}>
          <span style={{ fontSize: '1.2em', fontWeight: 700, textDecoration: 'underline' }}>{label[0]}</span>
          {label.slice(1)}
        </span>
      ) : (
        label
      )}
      {isNew && (
        <span
          style={{
            marginLeft: 4,
            marginTop: -2,
            padding: '1px 4px',
            fontSize: '0.55rem',
            fontWeight: 700,
            lineHeight: 1.4,
            color: '#fff',
            background: '#9c27b0',
            borderRadius: 8,
          }}
        >
          NEW
        </span>
      )}
    </span>
  );

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
        <Tabs value={tabIndex} onChange={handleChange} aria-label='Overlay Tabs' sx={{ flex: 1 }}>
          {tabs.map((t) => (
            <Tab key={t.key} label={renderLabel(t)} />
          ))}
        </Tabs>
        {tabKey === 'chat' && (
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
          aria-label='Panel size'
          title='Panel size'
          size='small'
          sx={{ position: 'absolute', top: -46, right: 126, zIndex: 10 }}
          onClick={openSizeMenu}
        >
          <AspectRatioIcon fontSize='small' />
        </IconButton>
        <Menu
          anchorEl={sizeAnchor}
          open={!!sizeAnchor}
          onClose={() => setSizeAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          // Menu is a Modal, and Modal portals to document.body by default, where it would land
          // at MUI's modal layer (1300) behind this z-index 9999 panel - open, anchored and
          // invisible. Rendering in place keeps it in the panel's own stacking context.
          disablePortal
          sx={{ zIndex: OVERLAY_MENU_Z_INDEX }}
        >
          {SIZE_PRESET_ORDER.map((preset) => {
            const { width, height } = OVERLAY_SIZE_PRESETS[preset];
            return (
              <MenuItem key={preset} onClick={() => chooseSizePreset(preset)} selected={activeSizePreset === preset}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {activeSizePreset === preset && <CheckIcon fontSize='small' />}
                </ListItemIcon>
                <ListItemText primary={SIZE_PRESET_LABELS[preset]} secondary={`${width} × ${height}`} />
              </MenuItem>
            );
          })}
        </Menu>

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
      {tabKey === 'chat' && (
        <ChatView searchActive={searchActive} searchTerm={searchTerm} setSearchActive={setSearchActive} />
      )}
      {chapter >= 18 && tabKey === 'trade' && <TradeView />}
      {tabKey === 'ee' && <EeView />}
      {tabKey === 'quests' &&
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
      {tabKey === 'messages' && <MessagesView />}
    </div>
  );
}
