import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { ApiError } from '../../../api/http.ts'
import { createMessage, type Message, type NewMessage } from '../../../api/messages.ts'
import { mergeMessages } from '../lib/mergeMessages.ts'
import { messagesQueryKey } from './useMessages.ts'

/**
 * Sends a message and adds the saved copy from the server to the list. Mutations are
 * never retried, so a message can't be posted twice.
 */
export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation<Message, ApiError, NewMessage>({
    mutationFn: (newMessage) => createMessage(newMessage),
    onSuccess: (created) => {
      const current = queryClient.getQueryData<Message[]>(messagesQueryKey)
      if (current) {
        queryClient.setQueryData(messagesQueryKey, mergeMessages(current, [created]))
      } else {
        // Nothing loaded yet (first load pending or failed): refetch the page, which includes it.
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey })
      }
    },
  })
}
