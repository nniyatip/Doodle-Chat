import { useState } from 'react'

import { ChatPage } from './features/chat/ChatPage.tsx'
import { useCurrentUser } from './features/user/useCurrentUser.ts'
import { UserNameForm } from './features/user/UserNameForm.tsx'

type ChatFocus = 'composer' | 'changeName'

export default function App() {
  const { userName, setUserName } = useCurrentUser()
  const [isChangingName, setIsChangingName] = useState(false)
  // Switching screens unmounts the focused element, so say where focus goes next.
  const [chatFocus, setChatFocus] = useState<ChatFocus>()

  if (!userName || isChangingName) {
    return (
      <UserNameForm
        initialName={userName ?? ''}
        onSubmit={(name) => {
          setUserName(name)
          setIsChangingName(false)
          setChatFocus('composer')
        }}
        onCancel={
          userName
            ? () => {
                setIsChangingName(false)
                setChatFocus('changeName')
              }
            : undefined
        }
      />
    )
  }

  return (
    <ChatPage
      userName={userName}
      onChangeName={() => setIsChangingName(true)}
      initialFocus={chatFocus}
    />
  )
}
