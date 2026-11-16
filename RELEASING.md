# Releasing BitLab

Sideloaded updates install over the existing app (`com.bitlab.ee`). The phone offers an update only when `versionCode` in the public manifest is higher than the installed build. Every update must be signed with the same release key. A new key cannot replace the installed app.

This repository is public. Do not commit a keystore, a password, or `key.properties`.

## Version

This release is versionName `1.0`, versionCode `1`. Keep these in step when you cut the next build:

- `android/app/build.gradle` — `versionCode`, `versionName`
- `src/lib/appVersion.ts` — `APP_VERSION_CODE`, `APP_VERSION_NAME`
- `package.json` — `version` (`1.0` is stored as `1.0.0`)

`versionCode` is an integer and must go up by at least 1 for each published APK.

## Signing

Release signing reads environment variables first, then an untracked `android/key.properties` for any value that is unset.

| Environment variable | `key.properties` key | Meaning |
| --- | --- | --- |
| `BITLAB_STORE_FILE` | `storeFile` | Keystore path. Absolute, or relative to the `android/` directory. |
| `BITLAB_STORE_PASSWORD` | `storePassword` | Keystore password |
| `BITLAB_KEY_ALIAS` | `keyAlias` | Key alias |
| `BITLAB_KEY_PASSWORD` | `keyPassword` | Key password |

`android/key.properties` (gitignored):

```
storeFile=/absolute/path/bitlab-release.jks
storePassword=...
keyAlias=bitlab
keyPassword=...
```

Create the key once and reuse it. RSA 2048, validity 10000 days. `keytool` writes a PKCS12 store, which uses one password for the store and the key, so set `storePassword` and `keyPassword` to that same value:

```
keytool -genkeypair -v \
  -keystore bitlab-release.jks \
  -alias bitlab \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$BITLAB_STORE_PASSWORD" \
  -keypass "$BITLAB_KEY_PASSWORD" \
  -dname "CN=BitLab, OU=Mobile, O=BitLab, C=IL"
```

Debug builds keep using the debug keystore. `assembleRelease` is signed when the four values above are set.

```
npm run mobile:sync
cd android
./gradlew assembleRelease
```

The APK is `android/app/build/outputs/apk/release/app-release.apk`. Confirm the signature with `apksigner verify --verbose`.

## In-app updates

On launch, and from **About → Check for updates**, the app fetches:

`https://raw.githubusercontent.com/royeetirosh-boop/Ravofun--releases-/main/bitlab/latest.json`

A missing file or an offline device does nothing. A higher `versionCode` with an `apkUrl` offers the download and opens the system installer.

Manifest (same shape as `ravofun/update.json` and `tradingbot/update.json` in that repo):

```json
{
  "versionCode": 1,
  "versionName": "1.0",
  "apkUrl": "https://raw.githubusercontent.com/royeetirosh-boop/Ravofun--releases-/main/bitlab/BitLab-v1.0.apk",
  "notes": {
    "en": "First sideload build. Later updates install over this app.",
    "he": "גרסת התקנה ראשונה. עדכונים הבאים מותקנים מעל האפליקציה הזו."
  }
}
```

Publish by adding `bitlab/BitLab-v1.0.apk` and `bitlab/latest.json` to `royeetirosh-boop/Ravofun--releases-`. The name in `apkUrl` has to match the file. Do not put the keystore in that repo.
