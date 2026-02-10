import type { Message, ChatType } from "@/types"

const DB_NAME = "GoChatCache"
const DB_VERSION = 1
const MESSAGES_PER_CONTACT = 500 // 每个联系人/群组最多存储500条消息

// 打开数据库
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // 创建消息存储，每个联系人一个 store，store 名称为 "chat_{userId}"
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" })
      }
    }
  })
}

// 过滤消息根据 chat_type
function filterMessagesByChatType(messages: Message[], targetId: number, chatType: ChatType): Message[] {
  if (chatType === 3) {
    // 群聊: receiver_id 就是 groupId
    return messages.filter((m) => m.receiver_id === targetId && m.chat_type === chatType)
  } else {
    // 单聊: sender_id || receiver_id
    return messages.filter(
      (m) =>
        (m.sender_id === targetId || m.receiver_id === targetId) && m.chat_type !== 3
    )
  }
}

// 获取某个联系人/群组的所有消息
export async function getCachedMessages(
  targetId: number,
  chatType?: ChatType
): Promise<Message[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const store = db.transaction("messages", "readonly").objectStore("messages")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        let messages = request.result as Message[]

        // 如果指定了 chat_type，进行过滤
        if (chatType !== undefined) {
          messages = filterMessagesByChatType(messages, targetId, chatType)
        } else {
          // 兼容旧代码：不过滤 chat_type
          messages = messages.filter(
            (m: Message) => m.sender_id === targetId || m.receiver_id === targetId
          )
        }

        // 按时间排序
        messages.sort((a: Message, b: Message) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        resolve(messages)
      }
    })
  } catch {
    return []
  }
}

// 保存消息到缓存
export async function saveMessage(message: Message): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("messages", "readwrite")
      const store = transaction.objectStore("messages")

      // 先获取该联系人的现有消息数量
      const getRequest = store.getAll()

      getRequest.onsuccess = () => {
        const allMessages = getRequest.result as Message[]
        const isGroupChat = message.chat_type === 3

        let contactMessages: Message[]
        if (isGroupChat) {
          // 群聊：按 receiver_id (groupId) 过滤
          contactMessages = allMessages.filter(
            (m) => m.receiver_id === message.receiver_id && m.chat_type === 3
          )
        } else {
          // 单聊：sender_id || receiver_id
          contactMessages = allMessages.filter(
            (m) =>
              (m.sender_id === message.sender_id || m.receiver_id === message.receiver_id) &&
              m.chat_type !== 3
          )
        }

        // 如果该联系人的消息超过限制，删除最旧的消息
        if (contactMessages.length >= MESSAGES_PER_CONTACT) {
          contactMessages.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          // 删除最旧的消息，直到低于限制
          const toDelete = contactMessages.slice(
            0,
            contactMessages.length - MESSAGES_PER_CONTACT + 1
          )
          toDelete.forEach((m) => {
            store.delete(m.id)
          })
        }

        // 保存新消息
        const putRequest = store.put(message)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  } catch (error) {
    console.error("Failed to save message to cache:", error)
  }
}

// 批量保存消息
export async function saveMessages(messages: Message[]): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("messages", "readwrite")
      const store = transaction.objectStore("messages")

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)

      messages.forEach((message) => {
        store.put(message)
      })
    })
  } catch (error) {
    console.error("Failed to save messages to cache:", error)
  }
}

// 更新消息状态
export async function updateMessageStatus(
  targetId: number,
  messageId: string,
  status: Message["status"],
  chatType?: ChatType
): Promise<void> {
  try {
    const messages = await getCachedMessages(targetId, chatType)
    const message = messages.find((m) => m.id === messageId)
    if (message) {
      message.status = status
      await saveMessage(message)
    }
  } catch (error) {
    console.error("Failed to update message status:", error)
  }
}

// 将某个联系人/群组的所有消息标记为已读
export async function markAllAsRead(targetId: number, chatType?: ChatType): Promise<void> {
  try {
    const messages = await getCachedMessages(targetId, chatType)
    const updatedMessages = messages.map((m) => ({ ...m, status: "read" as const }))
    await saveMessages(updatedMessages)
  } catch (error) {
    console.error("Failed to mark messages as read:", error)
  }
}

// 获取某个联系人/群组的未读消息数量
export async function getUnreadCount(targetId: number, chatType?: ChatType): Promise<number> {
  try {
    const messages = await getCachedMessages(targetId, chatType)
    return messages.filter((m) => m.status === "delivered").length
  } catch {
    return 0
  }
}

// 获取所有联系人的未读消息数量
export async function getAllUnreadCounts(): Promise<Map<number, number>> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const store = db.transaction("messages", "readonly").objectStore("messages")
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const messages = request.result as Message[]
        const unreadCounts = new Map<number, number>()

        messages.forEach((m: Message) => {
          if (m.status === "delivered") {
            // 群聊使用 receiver_id (groupId)，单聊使用 sender_id
            const key = m.chat_type === 3 ? m.receiver_id : m.sender_id
            unreadCounts.set(key, (unreadCounts.get(key) || 0) + 1)
          }
        })

        resolve(unreadCounts)
      }
    })
  } catch {
    return new Map()
  }
}

// 获取某个联系人/群组的最后一条消息
export async function getLastMessage(targetId: number, chatType?: ChatType): Promise<Message | null> {
  try {
    const messages = await getCachedMessages(targetId, chatType)
    return messages.length > 0 ? messages[messages.length - 1] : null
  } catch {
    return null
  }
}

// 获取群聊的最后一条消息 (便捷函数)
export async function getLastGroupMessage(groupId: number): Promise<Message | null> {
  try {
    const messages = await getCachedMessages(groupId, 3)
    return messages.length > 0 ? messages[messages.length - 1] : null
  } catch {
    return null
  }
}

// 清空所有缓存
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("messages", "readwrite")
      const store = transaction.objectStore("messages")
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error("Failed to clear cache:", error)
  }
}

// 检查消息是否已存在（通过内容和时间戳匹配）
export async function findMatchingMessage(
  targetId: number,
  content: string,
  timestamp: number,
  chatType?: ChatType
): Promise<Message | null> {
  try {
    const messages = await getCachedMessages(targetId, chatType)
    // 允许2秒内的时间戳差异
    return (
      messages.find(
        (m) =>
          m.content === content &&
          Math.abs(new Date(m.timestamp).getTime() - timestamp) < 2000
      ) || null
    )
  } catch {
    return null
  }
}
