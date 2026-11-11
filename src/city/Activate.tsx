import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { loadAllAccounts } from '../elvenar/accountStore';
import { useTabStore } from '../util/tabStore';

export function Activate() {
  const [doNavigate, setDoNavigate] = React.useState(false);
  const setAccountId = useTabStore((s) => s.setAccountId);

  const [searchParams] = useSearchParams();
  const routeAccountId = searchParams.get('accountId');
  // Only pages known here, so the address cannot send the tab anywhere else.
  const target = searchParams.get('page') === 'world-map' ? '/world-map' : '/city';

  const nav = useNavigate();

  React.useEffect(() => {
    async function loadData() {
      if (routeAccountId) {
        await loadAllAccounts();
        setAccountId(routeAccountId);
        setDoNavigate(true);
        await nav(target, { replace: true });
      }
    }
    void loadData();
  }, [routeAccountId, setAccountId, nav, target]);

  return (
    <>
      {doNavigate ? (
        <Link to={target} replace>
          Continue
        </Link>
      ) : (
        <div>Activating account...</div>
      )}
    </>
  );
}
