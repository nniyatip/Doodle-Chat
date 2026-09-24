import { useState } from 'react'

import { ChatPage } from './features/chat/ChatPage.tsx'
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

  return <ChatPage userName={userName} onChangeName={() => setIsChangingName(true)} />
}
