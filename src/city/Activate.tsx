import React from 'react';
import { useSearchParams, Navigate, useNavigate, Link } from 'react-router';
import { useGlobalStore } from '../util/globalStore';
import { loadAccountManagerFromStorage } from '../elvenar/AccountManager';

export function Activate() {
  const [doNavigate, setDoNavigate] = React.useState(false);
  const setAccountId = useGlobalStore((s) => s.setAccountId);

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
