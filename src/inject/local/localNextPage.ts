export const localNextPage = () => {
  const pagination = window.aviad_pagination_a.filter(r => r.parent && Object.getPrototypeOf(r.parent).__class__.__name__ === 'de.innogames.onyx.shared.ranking.views.tabs.tabbodies.PlayerRankingBody');
  const lastOne = pagination[pagination.length - 1];
  if (!lastOne) {
    console.error('No pagination found for PlayerRankingBody');
    return;
  }
  window.aviad_pagination_a = pagination;
  lastOne._onSelectNextPage();
}
