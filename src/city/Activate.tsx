import React from 'react';
import { useSearchParams, Navigate, useNavigate, Link } from 'react-router';
import { useTabStore } from '../util/tabStore';
import { loadAccountManagerFromStorage } from '../elvenar/AccountManager';

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
        console.log('ElvenAssist: Activating accountId:', routeAccountId);
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
