import { ExtensionSharedInfo } from '../model/extensionSharedInfo';

export async function processNotifications(untypedJson: unknown, sharedInfo: ExtensionSharedInfo) {
  const json = untypedJson as {
    requestClass: string;
    requestMethod: string;
    responseData: {
      __class__: string;
      id: number;
      other_player: {
        player_id: number;
        name: string;
      };
      timestamp: number;
      entityId: number;
      entityName: string;
      knowledgePoints: number;
    }[];
  }[];

  const ancientWonderContributionClass = 'AncientWonderResearchContributedNotificationVO';

  const notificationResponses = json
    .filter(
      (r) =>
        r.requestClass === 'NotificationService' &&
        (r.requestMethod === 'getAllNotifications' || r.requestMethod === 'getPreviewNotifications'),
    )
    .map((r) => r.responseData.filter((n) => n.__class__ === ancientWonderContributionClass))
    .flat()
    .map((n) => ({
      id: n.id,
      other_player: {
        player_id: n.other_player.player_id,
        name: n.other_player.name,
      },
      timestamp: n.timestamp,
      entityId: n.entityId,
      entityName: n.entityName,
      knowledgePoints: n.knowledgePoints,
    }));

  // const displayNotifications = notificationResponses.map((n) => {
  //   const date = new Date(n.timestamp * 1000);
  //   return `${n.id}: ${n.other_player.name} contributed ${n.knowledgePoints} to "${n.entityName}" on ${date.toLocaleString()}.`;
  // });

  // for (const notif of displayNotifications) {
  //   console.log(notif);
  // }
}
