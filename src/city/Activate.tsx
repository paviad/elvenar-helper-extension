import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { loadAccountManagerFromStorage } from '../elvenar/AccountManager';
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
        await loadAccountManagerFromStorage(true);
        setAccountId(routeAccountId);
        setDoNavigate(true);
        nav('/city', { replace: true });
      }
    }
    loadData();
  }, []);

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
