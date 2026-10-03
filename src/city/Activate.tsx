import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { loadAllAccounts } from '../elvenar/accountStore';
import { useTabStore } from '../util/tabStore';

export function Activate() {
  const [doNavigate, setDoNavigate] = React.useState(false);
  const setAccountId = useTabStore((s) => s.setAccountId);

  const [searchParams] = useSearchParams();
  const routeAccountId = searchParams.get('accountId');

  const nav = useNavigate();

  React.useEffect(() => {
    async function loadData() {
      if (routeAccountId) {
        await loadAllAccounts();
        setAccountId(routeAccountId);
        setDoNavigate(true);
        await nav('/city', { replace: true });
      }
    }
    void loadData();
  }, [routeAccountId, setAccountId, nav]);

  return (
    <>
      {doNavigate ? (
        <Link to='/city' replace>
          Go to City
        </Link>
      ) : (
        <div>Activating account...</div>
      )}
    </>
  );
}
