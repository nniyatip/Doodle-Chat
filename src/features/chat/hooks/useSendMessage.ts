import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../../../api/http.ts'
import { createMessage, type Message, type NewMessage } from '../../../api/messages.ts'
import { addSent } from '../lib/chatMessages.ts'
import { messagesQueryKey } from './useMessages.ts'

/**
 * Sends a message and adds the saved copy from the server to the list. Mutations are
 * never retried, so a message can't be posted twice.
 */
export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation<Message, ApiError, NewMessage>({
    mutationFn: createMessage,
    onSuccess: (sent) => {
      const chat = queryClient.getQueryData(messagesQueryKey)
      if (chat) {
        queryClient.setQueryData(messagesQueryKey, addSent(chat, sent))
      } else {
        // Nothing loaded yet: the first load failed, or is still running and may have been
        // sent before this message. Start it again, so the page includes the message.
        // (Invalidating alone would wait for a running first load.)
        void queryClient
          .cancelQueries({ queryKey: messagesQueryKey })
          .then(() => queryClient.invalidateQueries({ queryKey: messagesQueryKey }))
      }
    },
  })
}
