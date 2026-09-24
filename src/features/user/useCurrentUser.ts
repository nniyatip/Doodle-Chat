import { useCallback, useState } from 'react'

import { readUserName, saveUserName } from './userStorage.ts'

/** The current user's name, read once from storage and saved whenever it changes. */
export function useCurrentUser() {
  const [userName, setUserNameState] = useState(readUserName)

  const setUserName = useCallback((name: string) => {
    saveUserName(name)
    setUserNameState(name)
  }, [])

  return { userName, setUserName }
}
