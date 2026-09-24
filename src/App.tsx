import { useState } from 'react'

import { useCurrentUser } from './features/user/useCurrentUser.ts'
import { UserNameForm } from './features/user/UserNameForm.tsx'

export default function App() {
  const { userName, setUserName } = useCurrentUser()
  const [isChangingName, setIsChangingName] = useState(false)

  if (!userName || isChangingName) {
    return (
      <UserNameForm
        initialName={userName ?? ''}
        onSubmit={(name) => {
          setUserName(name)
          setIsChangingName(false)
        }}
        onCancel={userName ? () => setIsChangingName(false) : undefined}
      />
    )
  }

  // Placeholder until the chat page is added in the next step.
  return (
    <main>
      <h1>Doodle Chat</h1>
      <p>
        Chatting as <strong>{userName}</strong>
      </p>
      <button type="button" onClick={() => setIsChangingName(true)}>
        Change name
      </button>
    </main>
  )
}
