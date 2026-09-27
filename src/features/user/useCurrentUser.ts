import { useCallback, useEffect, useState } from 'react'

import { readUserName, saveUserName, subscribeToUserName } from './userStorage.ts'

/**
 * The current user's name: read from storage, saved whenever it changes, and kept in step
 * with other tabs, so they all send under the same name.
 */
export function useCurrentUser() {
  const [userName, setUserNameState] = useState(readUserName)

  useEffect(() => subscribeToUserName(() => setUserNameState(readUserName())), [])

  const setUserName = useCallback((name: string) => {
    saveUserName(name)
    setUserNameState(name)
  }, [])

  return { userName, setUserName }
}
