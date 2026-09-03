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
import { createPortal } from 'react-dom';
import {
  clearActiveEffectsUpdatedListener,
  clearGenericResponseListener,
  clearMessagesUpdatedListener,
  clearTradeParsedListener,
  setupActiveEffectsUpdatedListener,
  setupGenericResponseListener,
  setupMessagesUpdatedListener,
  setupTradeParsedListener,
} from '../chrome/messages';
import { ReceivedWebsocketMessage } from '../inject/websocketMessages';
import { ChatMessage } from '../model/socketMessages/chatPayload';
import { TournyProvinceInformation } from '../model/tourny/provinceInformation';
import { TournyProvince } from '../model/tourny/provincesOverview';
import { TournyTime } from '../model/tourny/tournamentTime';
import { expandPanel, getOverlaySize, setOverlaySizePreset } from '../overlay';
import { parseQuestExport } from '../util/parseQuestExport';
import { DiscordButton } from '../widgets/DiscordButton';
import { ChatView } from './ChatView';
import { EeView } from './EeView';
import { HelpDialog } from './HelpDialog';
import { MessagesView } from './MessagesView';
import { sameOfferedGoods } from './offeredGoods';
import { matchOverlaySizePreset, OVERLAY_SIZE_PRESETS, OverlaySize, OverlaySizePreset } from './overlaySize';
import { OVERLAY_MENU_Z_INDEX } from './overlayStacking';
import { getOverlayStore } from './overlayStore';
import { OverlayTab, OverlayTabKey, shortcutLetter, visibleOverlayTabs } from './overlayTabs';
import { parseSocketMessage } from './parseSocketMessage';
import { QuestJournal } from './QuestJournal';
import { Tourny } from './Tourny';
import { emptyTournyData } from './tournyData';
import { TradeView } from './TradeView';

const SIZE_PRESET_LABELS: Record<OverlaySizePreset, string> = {
  small: 'Small',
  large: 'Large',
};

const SIZE_PRESET_ORDER: OverlaySizePreset[] = ['small', 'large'];

const DISCORD_INVITE_URL = 'https://discord.gg/zYzUUDcMrv';

interface OverlayMainProps {
  /**
   * The header's slot for the React-owned buttons. The header is built as plain DOM before React
   * mounts, so the buttons are rendered into it through a portal rather than positioned over it.
   */
  headerActionsSlot?: HTMLElement;
}

export function OverlayMain({ headerActionsSlot }: OverlayMainProps) {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [searchActive, setSearchActive] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sizeAnchor, setSizeAnchor] = React.useState<HTMLElement | null>(null);
  // Read when the menu opens rather than tracked: the panel is resized by dragging its corner,
  // outside React, so there is nothing to subscribe to and nothing to go stale in between.
  const [sizeAtMenuOpen, setSizeAtMenuOpen] = React.useState<OverlaySize | undefined>(undefined);
  const [tabKey, setTabKey] = React.useState<OverlayTabKey>('chat');
  const userMap = React.useRef<Record<string, string>>({});
  const tabRef = React.useRef<OverlayTabKey>(tabKey);
  const [initialQuestIndex, setInitialQuestIndex] = React.useState<number | undefined>(undefined);

  const useOverlayStore = getOverlayStore();
  const chapter = useOverlayStore((state) => state.chapter);

  // Connect Quests from Zustand Store
  const quests = useOverlayStore((state) => state.quests);
  const setQuests = useOverlayStore((state) => state.setQuests);
  const [dropError, setDropError] = React.useState<string | undefined>(undefined);

  // Declarative, so the tab set, the Alt+C chord map, the rendered content and the help dialog
  // all read from one place. Hand-computed indices used to have to be adjusted in two places
  // whenever the Trade tab came and went with the chapter.
  const tabs = React.useMemo(() => visibleOverlayTabs(chapter), [chapter]);

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
  }, [useOverlayStore]);

  React.useEffect(() => {
    tabRef.current = tabKey;
  }, [tabKey]);

  React.useEffect(() => {
    // The chat list lives in the store, which is where ChatView reads it. It used to be
    // accumulated in local state here and copied across by an effect, so the two could
    // disagree, and the copy merged against a stale snapshot of the store. Writing
    // straight to the store through getState() also keeps this handler free of anything
    // from the render that registered it - it was defined in the component body and
    // registered once, so it held the first render's closure for the life of the panel.
    const addChatMessages = (incoming: ChatMessage[]) => {
      const store = useOverlayStore.getState();
      const existing = store.chatMessages ?? [];
      const fresh = incoming.filter((m) => !existing.some((sm) => sm.uuid === m.uuid));
      if (fresh.length === 0) {
        return;
      }
      store.setChatMessages([...existing, ...fresh]);
    };

    const messageHandler = (event: MessageEvent<ReceivedWebsocketMessage>) => {
      // We must verify the sender and the message type for security
      if (event.source !== window || event.data.type !== 'RECEIVED_WEBSOCKET_MESSAGE') {
        return;
      }

      const socketMessage = parseSocketMessage(event.data.payload.value);

      if (!socketMessage) return;

      if (socketMessage.type === 'chat/rpc/get-history') {
        userMap.current =
          socketMessage.body.payload.users.reduce<Record<string, string>>((map, user) => {
            map[user.id] = user.metadata.public_name;
            return map;
          }, {}) || {};

        useOverlayStore.getState().setUserMap(userMap.current);
        addChatMessages(socketMessage.body.payload.messages);
      }

      if (socketMessage.type === 'chat/send') {
        addChatMessages([
          {
            uuid: socketMessage.headers['X-UUID'] || new Date().getTime().toString(),
            user: socketMessage.body.user,
            text: socketMessage.body.message,
            timestamp: socketMessage.body.timestamp,
          },
        ]);
      }
    };

    window.addEventListener('message', messageHandler);

    setupTradeParsedListener((tradesMsg) => {
      const store = useOverlayStore.getState();
      if (store.chapter < 18) {
        return;
      }

      const offeredGoods = Array.from(new Set(tradesMsg.trades.map((trade) => trade.offer)));

      // The game refetches the trade list by itself - while the trader is open, after an offer is
      // posted or taken, on a re-sync - and it usually comes back saying the same thing. Only a
      // list that reads differently is worth taking the panel over; it used to reopen either way,
      // which is what made the Trade tab appear unasked.
      if (sameOfferedGoods(offeredGoods, store.offeredGoods)) {
        return;
      }
      store.setOfferedGoods(offeredGoods);

      if (!(store.autoOpenTrade ?? true)) {
        return;
      }

      if (offeredGoods.length > 0) {
        expandPanel(true);
        setTabKey('trade');
        return;
      }

      // The last trade worth taking is gone, so the panel that opened itself for them closes
      // itself again. Only while it is still showing them, though: it used to close from any tab,
      // which shut the panel in the middle of reading something else entirely.
      if (tabRef.current === 'trade') {
        expandPanel(false);
      }
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
  }, [useOverlayStore]);

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

    for (const type of ['R:AncientWonderService/phaseUpdated', 'R:AncientWonderService/getOtherPlayerAncientWonders']) {
      listenerIds.push(
        setupGenericResponseListener<void>(type, () => {
          // The service worker has already folded the new figures into the stored account;
          // this only tells the swap tab to read them again.
          useOverlayStore.getState().triggerWonderKpUpdate();
        }),
      );
    }

    listenerIds.push(
      setupGenericResponseListener<number | undefined>('R:QuestMilestoneService/updateQuestMilestone', (msg) => {
        const progress = msg.payload;
        setInitialQuestIndex(progress);
        if (progress === undefined) {
          setQuests(undefined);
        }
      }),
    );

    listenerIds.push(
      setupGenericResponseListener<TournyProvince[] | undefined>('R:TournamentService/getProvincesOverview', (msg) => {
        const provinces = msg.payload;
        if (!provinces) {
          return;
        }

        const tournyData = {
          ...(useOverlayStore.getState().tournyData || emptyTournyData()),
        };

        // A province that levelled up or finished upgrading is about to field a different
        // encounter, so its cached details are dropped rather than shown stale.
        for (const province of provinces) {
          const previousProvince = tournyData.provincesOverview.find((p) => p.r === province.r && p.q === province.q);
          if (!previousProvince) {
            continue;
          }
          const leveledUp = province.level !== previousProvince.level;
          const upgradeTimeElapsed = !province.upgradeTime && previousProvince.upgradeTime;
          if (leveledUp || upgradeTimeElapsed) {
            delete tournyData.provinceInformation[`${province.r},${province.q}`];
          }
        }

        useOverlayStore.getState().setTournyData({ ...tournyData, provincesOverview: provinces });
      }),
    );

    listenerIds.push(
      setupGenericResponseListener<TournyProvinceInformation>('R:WorldMapService/getProvinceInformation', (msg) => {
        const provinceInfo = msg.payload;
        const tournyData = useOverlayStore.getState().tournyData || emptyTournyData();
        useOverlayStore.getState().setTournyData({
          ...tournyData,
          provinceInformation: {
            ...tournyData.provinceInformation,
            [`${provinceInfo.r},${provinceInfo.q}`]: provinceInfo,
          },
        });
      }),
    );

    listenerIds.push(
      setupGenericResponseListener<TournyTime | undefined>('R:WorldMapService/updateTournamentTime', (msg) => {
        const tournyTime = msg.payload;
        if (!tournyTime) {
          return;
        }

        const tournyData = useOverlayStore.getState().tournyData || emptyTournyData();
        const overviewProvince = tournyData.provincesOverview.find((p) => p.r === tournyTime.r && p.q === tournyTime.q);
        if (!overviewProvince) {
          return;
        }

        if (tournyTime.remainingTime > 0) {
          overviewProvince.upgradeTime = tournyTime.remainingTime;
          overviewProvince.upgradeTimeEnd = Date.now() + tournyTime.remainingTime * 1000;
        } else {
          delete overviewProvince.upgradeTime;
          delete overviewProvince.upgradeTimeEnd;
        }

        useOverlayStore.getState().setTournyData({
          ...tournyData,
          provincesOverview: [...tournyData.provincesOverview],
        });
      }),
    );

    return () => {
      listenerIds.forEach((id) => {
        clearGenericResponseListener(id);
      });
    };
  }, [useOverlayStore, setQuests]);

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

  // The chord's second key, underlined in the label where the label has it and shown after it
  // where it does not. Read off the tab's shortcut rather than the label, so the two cannot drift
  // apart: a tab whose label does not start with its key used to be hinted with the wrong letter.
  const renderChordLabel = (label: string, letter: string) => {
    const hint = { fontSize: '1.2em', fontWeight: 700, textDecoration: 'underline' };
    const at = label.toUpperCase().indexOf(letter.toUpperCase());
    return (
      <span title={`Alt+C, ${letter}`}>
        {at >= 0 ? (
          <>
            {label.slice(0, at)}
            <span style={hint}>{label[at]}</span>
            {label.slice(at + 1)}
          </>
        ) : (
          <>
            {label}&thinsp;<span style={hint}>{letter}</span>
          </>
        )}
      </span>
    );
  };

  const renderLabel = ({ label, shortcut, isNew }: OverlayTab) => (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start' }}>
      {shortcut ? renderChordLabel(label, shortcutLetter(shortcut)) : label}
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

  // The panel-wide controls, as one group in the order they sit in the header. They are all
  // plain small IconButtons, so the header row - which holds hand-built buttons of the same
  // size - stays even without anyone nudging offsets.
  const headerActions = (
    <>
      <IconButton aria-label='Panel size' title='Panel size' size='small' onClick={openSizeMenu}>
        <AspectRatioIcon fontSize='small' />
      </IconButton>
      <DiscordButton discordUrl={DISCORD_INVITE_URL} size='small' />
      <IconButton aria-label='Help' title='Help' size='small' onClick={() => setHelpOpen(true)}>
        <HelpOutlineIcon fontSize='small' />
      </IconButton>
    </>
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

        {headerActionsSlot ? createPortal(headerActions, headerActionsSlot) : headerActions}
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
      {tabKey === 'tourny' && <Tourny />}
    </div>
  );
}
