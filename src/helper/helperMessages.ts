// Define the available message IDs here
export type HelperMessageId = 'drag_tip' | 'visited_other' | 'multiple_accounts_notice';

// The actual content map
export const HELPER_MESSAGES: Record<HelperMessageId, string> = {
  drag_tip:
    "While dragging, you can press the '+' and '-' keys to quickly change the building's level. You may also press 'Del' to delete it.",

  visited_other:
    "You've just visited another player's city! You can find their city - {0} - in the city selector at the top right.",

  multiple_accounts_notice:
    'You have multiple cities set up. You can switch between them using the city selector at the top right.',
};
