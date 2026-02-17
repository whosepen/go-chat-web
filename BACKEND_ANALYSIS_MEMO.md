# Backend Analysis Memo

## 1. Data Models

### User
- **Struct**: `User`
- **Fields**: `ID`, `Username`, `Nickname`, `Avatar`, `Email`, `Phone`, `Status` (1:Normal, 2:Disabled), `LastLogin`

### Message
- **Struct**: `Message`
- **Fields**: `ID`, `FromUserID`, `ToUserID`, `Content`, `Type`, `Media` (1:Text, 2:Image, 3:Audio)

### Group
- **Struct**: `Group`
- **Fields**: `ID`, `Code`, `Name`, `OwnerID`, `Icon`, `Desc`

### GroupMember
- **Struct**: `GroupMember`
- **Fields**: `GroupID`, `UserID`, `Username`, `Nickname`, `Role` (1:Owner, 2:Admin, 3:Member), `Mute` (0:Normal, 1:Muted), `LastReadMsgID`

### Relation (Friendship)
- **Struct**: `Relation`
- **Fields**: `OwnerID`, `TargetID`, `Type` (1:Friend, 2:Block), `Desc`, `LastReadMsgID`

## 2. API Endpoints

**Base URL**: `/api`

### Auth
- `POST /user/register`
- `POST /user/login`

### User
- `GET /user/info`
- `GET /user/profile`
- `POST /user/info/update`
- `POST /user/password/update`
- `GET /user/search`

### Friend
- `POST /friend/request`
- `POST /friend/handle`
- `GET /friend/requests`
- `GET /friend/list`
- `GET /friend/info`
- `POST /friend/delete`
- `POST /friend/block`
- `POST /friend/unblock`
- `POST /friend/mark-read`

### Group
- `POST /group/create`
- `GET /group/info`
- `POST /group/info/update`
- `GET /group/members`
- `GET /group/my-groups`
- `GET /group/search`
- `POST /group/join`
- `GET /group/requests`
- `POST /group/handle-join`
- `POST /group/kick`
- `POST /group/quit`
- `POST /group/mark-read`

### Chat
- `GET /chat/history`

### Media
- `POST /media/upload`

## 3. WebSocket Protocol

**Endpoint**: `/api/ws` (likely requires auth token)

### Message Types
- `0`: **TypeHeartbeat** (Ping)
- `1`: **TypeLogin** (System/Online)
- `2`: **TypeSingleMsg** (Private Chat)
- `3`: **TypeGroupMsg** (Group Chat)
- `4`: **TypeWebRTC** (Signaling)

### Payload Structure
```json
{
  "type": 0-4,
  "target_id": "Target UserID or GroupID",
  "content": "Message content or JSON string",
  "media": 1-3 (Text/Image/Audio)
}
```
