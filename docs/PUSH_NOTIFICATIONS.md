# Push Notifications (Expo)

Transport: Expo Push Service. Devices register an Expo push token with our API; the API
dispatches pushes for in-app notifications (announcements, achievements, team invites)
via `expo-server-sdk`.

## Flow

```
expo-notifications (mobile)  --POST /api/notifications/push-token-->  API
                                                                     ├ PushSubscription (userId, token, platform, enabled)
                                                                     └ dispatch on createNotification / createBroadcastNotification
API  --Expo push API-->  APNs / FCM  -->  device
```

## API

| Endpoint                          | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `POST /api/notifications/push-token`    | Register/upsert a device token (`token`, `platform`), re-enables |
| `GET /api/notifications/push-tokens`    | List the user's tokens                    |
| `DELETE /api/notifications/push-token`  | Unregister a token (body `{ token }`)     |

Dispatch respects `PushSubscription.enabled`, skips tokens that fail
`Expo.isExpoPushToken`, and is best-effort — a failed send never fails notification
creation. `EXPO_ACCESS_TOKEN` (server env) authenticates against the Expo API.

## Mobile requirements

- `expo-notifications` (SDK 57) + the `expo-notifications` plugin in `app.json`.
- **Push remote notifications do not work in Expo Go on Android since SDK 53.** Use a
  development build (`npx expo run:android|ios`) or an EAS build.
- A `projectId` is required to mint a token. The app reads it from
  `EXPO_PUBLIC_EAS_PROJECT_ID` or `extra.eas.projectId` in app config.
- On native, the app: creates the Android `default` channel, requests permission,
  mints the Expo push token, sends it to the API, and stores
  `{ enabled, token }` in AsyncStorage (`push-pref`). The toggle in the **Notifications**
  screen switches device push on/off (auto-re-register on login if enabled).
- Push-token rollover is handled via `addPushTokenListener`; a
  `addNotificationReceivedListener` refreshes the in-app unread badge.
- iOS foreground presentation uses `Notifications.setNotificationHandler(...)`.

## EAS setup

1. `eas init` / confirm project id, then set `EXPO_PUBLIC_EAS_PROJECT_ID` in the build env
   (it can also be committed under `extra.eas.projectId`).
2. Channels & builds:
   ```bash
   eas build:configure
   eas channel:view
   eas build --profile production --platform all
   ```
   Attach the resulting Android `.apk/.aab` / iOS `.ipa` to a staging channel
   (`eas submit` + `eas channel:edit`) for device QA.
3. Credentials for real devices: APNs key (iOS) / FCM service account (Android) under
   EAS project credentials.

## Production notes

- Keep `EXPO_ACCESS_TOKEN` from `https://expo.dev/settings/access-tokens` in the server
  env; leaving it empty still works for unauthenticated requests per-token rate limits
  apply.
- Pushes are apex-only (title/body/data). To deep-link from a push, add a `url` field in
  the notification `data` and mirror the routing example in the expo-notifications docs.
- Receipts: for high-volume dispatch, track
  `sendPushNotificationsAsync` ticket/receipt pairs `receiptId`s and reconcile
  (`expo.getPushNotificationReceiptsAsync`) — out of scope for the current volume.