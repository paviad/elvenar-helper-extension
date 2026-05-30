import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import LockClockIcon from '@mui/icons-material/LockClock';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { ParsedQuestExport, QuestTaskPart } from '../util/parseQuestExport';

interface QuestJournalProps {
  quests: ParsedQuestExport;
  initialQuestIndex?: number;
  onClearQuests?: () => void;
}

export const QuestJournal: React.FC<QuestJournalProps> = ({ quests, initialQuestIndex = 0, onClearQuests }) => {
  const currentQuestIndex = initialQuestIndex;

  const renderTaskPart = (part: QuestTaskPart) => {
    if (Array.isArray(part)) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', alignSelf: 'center', justifyContent: 'center' }}>
          {part.map((orOption, i) => (
            <React.Fragment key={i}>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {orOption}
              </Typography>
              {i < part.length - 1 && (
                <Chip
                  label='OR'
                  size='small'
                  color='secondary'
                  variant='outlined'
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 'bold' }}
                />
              )}
            </React.Fragment>
          ))}
        </Box>
      );
    }
    return (
      <Typography variant='body2' sx={{ fontWeight: 600, alignSelf: 'center' }}>
        {part}
      </Typography>
    );
  };

  const renderQuestRequirements = (taskParts: QuestTaskPart[], isUpcoming: boolean = false) => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, opacity: isUpcoming ? 0.6 : 1 }}>
        {taskParts.map((part, index) => (
          <React.Fragment key={index}>
            {renderTaskPart(part)}
            {index < taskParts.length - 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center', my: 0.25 }}>
                <Divider sx={{ flexGrow: 1 }} />
                <Chip
                  label='AND'
                  size='small'
                  sx={{ mx: 1, height: 16, fontSize: '0.55rem', fontWeight: 'bold', bgcolor: 'action.selected' }}
                />
                <Divider sx={{ flexGrow: 1 }} />
              </Box>
            )}
          </React.Fragment>
        ))}
      </Box>
    );
  };

  const isFinished = currentQuestIndex >= quests.length;
  const activeQuest = quests[currentQuestIndex];
  const upcomingQuests = quests.slice(currentQuestIndex + 1);

  return (
    <Box
      sx={{
        p: 2,
        maxWidth: 600,
        mx: 'auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
            Quest Journal
          </Typography>
          {onClearQuests && (
            <Tooltip title='Clear loaded quests'>
              <IconButton size='small' onClick={onClearQuests} sx={{ color: 'text.secondary' }}>
                <DeleteOutlinedIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Typography variant='subtitle2' color='text.secondary'>
          Progress: {Math.min(currentQuestIndex, quests.length)} / {quests.length}
        </Typography>
      </Box>

      {isFinished ? (
        <Paper
          sx={{ p: 4, textAlign: 'center', bgcolor: 'success.lighter', borderColor: 'success.light', flexShrink: 0 }}
          variant='outlined'
        >
          <CheckCircleOutlinedIcon color='success' sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant='h5' color='success.main' sx={{ fontWeight: 'bold', mb: 1 }}>
            All Quests Completed!
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            You have finished the entire questline.
          </Typography>
        </Paper>
      ) : (
        <>
          <Card
            variant='outlined'
            sx={{
              mb: 2,
              borderColor: 'primary.main',
              borderWidth: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 2,
                py: 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography variant='subtitle2' sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                Active Quest (#{currentQuestIndex + 1})
              </Typography>
            </Box>

            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              {renderQuestRequirements(activeQuest)}
            </CardContent>
          </Card>

          {upcomingQuests.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                minHeight: 0,
              }}
            >
              <Typography
                variant='subtitle2'
                color='text.secondary'
                sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}
              >
                <LockClockIcon fontSize='small' />
                Upcoming Quests
              </Typography>
              <Paper
                variant='outlined'
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': { width: '6px' },
                  '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '10px' },
                }}
              >
                <List disablePadding>
                  {upcomingQuests.map((quest, index) => {
                    const actualQuestNumber = currentQuestIndex + index + 2;
                    return (
                      <React.Fragment key={actualQuestNumber}>
                        <ListItem sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                            <Typography variant='body2' color='text.disabled' sx={{ fontWeight: 'bold', pt: 0.1 }}>
                              #{actualQuestNumber}
                            </Typography>
                            <Box sx={{ flexGrow: 1 }}>{renderQuestRequirements(quest, true)}</Box>
                          </Box>
                        </ListItem>
                        {index < upcomingQuests.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>
              </Paper>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
