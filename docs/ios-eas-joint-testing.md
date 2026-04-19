# iOS distribution — TestFlight (recommended) & internal builds

**Recommended path:** **TestFlight** — testers install from Apple’s TestFlight app; **no per-device UDID** and **no rebuild when someone gets a new iPhone** (same Apple ID / invite flow).

**Legacy path:** **EAS internal** (`preview`) — each new physical iPhone must register its UDID; the organizer usually **re-runs** an iOS build so the provisioning profile includes the new device.

---

## 1. For testers: install via TestFlight

1. Install **TestFlight** from the App Store (if you do not have it yet).
2. **Accept the invite** your organizer sends (e‑mail from Apple / App Store Connect, or a **public TestFlight link** if they enabled one).
3. Open **TestFlight**, find **Voxora** (or the name shown), tap **Install** / **Update**.

**Tips**

- Use the **same Apple ID** on a new phone if you want to keep access without a new invite (depending on how your team set up testing).
- If you do not see the app, ask the organizer to confirm you are added under **App Store Connect → Users and Access** (internal) or invited for **external testing**.

---

## 2. For maintainers: ship a build to TestFlight (EAS)

Prerequisites: Apple Developer Program, App Store Connect app record for this bundle ID, and **expo.dev** (or `eas.json`) **environment variables** for `EXPO_PUBLIC_BACKEND_BASE_URL` on the **production** environment so the release build talks to your API.

1. **Build and submit** (from repo root — one script: build then `eas submit --latest`):

   ```bash
   ./scripts/eas-build-ios.sh production
   ```

   Default profile is already `production` if you omit it: `./scripts/eas-build-ios.sh`.

   This uses `client/eas.json` → **`production`** → **`ios.distribution`: `store`**. After a successful cloud build, the script runs **`npx eas-cli submit --platform ios --latest`** from `client/`.

   **Skip submit** (build only): `./scripts/eas-build-ios.sh production --no-submit` or `EAS_IOS_NO_SUBMIT=1 ./scripts/eas-build-ios.sh`.

   **Build number conflicts:** For each marketing version (e.g. **1.3.0**), App Store Connect requires a **unique iOS build number** (`CFBundleVersion`). **`autoIncrement` in `eas.json` is not supported** when the project uses a dynamic **`app.config.ts`**. Use **`IOS_BUILD_NUMBER`** (set in **expo.dev → Environment variables** for the `production` environment, or `export` before `eas build --local`) or bump the default in **`client/app.config.ts`** (`iosBuildNumber`) before each upload. Then run a new **`eas build`** and **`eas submit`**.

   First time: follow `eas-cli` prompts for API key or Apple ID. You may set `ascAppId` in `eas.json` → `submit.production` after the app exists in ASC.

2. In **App Store Connect → TestFlight**: wait for processing, complete **export compliance** / **privacy** if asked, then add **Internal** and/or **External** testers and send invites (or enable a **Public Link**).

3. **New testers / new phones:** add them in ASC or share the public link — **no new IPA** for each new UDID (until you ship a **new version** for other reasons).

---

## 3. Legacy: internal distribution (UDID + Expo install page)

Use only when you intentionally avoid ASC (e.g. very early hardware checks). Profile: **`preview`** → `distribution: internal`.

### 3.1 Register the iPhone (UDID)

1. On the **test iPhone**, open **Safari**.
2. Open the **register-device** link the organizer sends (example token URLs look like `https://expo.dev/register-device/<uuid>`).
3. Install the **device / development profile** when iOS prompts you.

### 3.2 Install from the Expo build page

After the organizer runs a **new** iOS `preview` build that includes your UDID, open the **Expo build URL** or QR they send. If iOS warns about an **untrusted developer**, use **Settings → General → VPN & Device Management** as instructed.

**Example build page (may expire when superseded):**  
https://expo.dev/accounts/susanshpd/projects/myapp/builds/36516dac-4e77-4d4e-81ba-f9bf44b6202e  

*Replace in docs when you publish a newer internal build.*

---

## 4. Troubleshooting (short)

| Issue | Try |
|--------|-----|
| TestFlight: invite not received | Spam folder; organizer re-sends; correct Apple ID. |
| TestFlight: “not accepting testers” | ASC: complete **Required agreements**, **Beta App Review** (external), **compliance** questions. |
| Internal: Unable to install | UDID not in profile yet → organizer **rebuild** after registration. |
| Internal: Profile install fails | **Settings → General → VPN & Device Management** — remove stale Expo/dev profile, retry. |

---

## Quick copy for testers — TestFlight (paste in chat)

```
Install TestFlight from the App Store, then accept the TestFlight invite we sent to your Apple ID email (or use the public TestFlight link we shared). Open TestFlight and install Voxora from there.
```

---

## Quick copy — legacy internal (UDID + Expo link)

```
Step 1 — Register this iPhone (Safari on device):
https://expo.dev/register-device/1d077706-a2c5-4b46-b3f5-84796d4bf8a6

Reply: "Device registration done" + your name.

Step 2 — After we confirm the next iOS build, open this on your iPhone:
https://expo.dev/accounts/susanshpd/projects/myapp/builds/36516dac-4e77-4d4e-81ba-f9bf44b6202e
```

---

## 组织者备注（中文）

- **对外测 / 亲友装：**优先走 **TestFlight**（`production` + `store` 构建 → `eas submit` → ASC 里发邀请或公开链接），避免「每来一台新 iPhone 就要重打 internal 包」。  
- **preview / internal** 仅作少数场景备用；每位新设备仍要注册 UDID，且通常要 **重跑 EAS iOS build**。  
- 环境变量：`EXPO_PUBLIC_BACKEND_BASE_URL` 须在 **expo.dev** 勾选 **production** 环境（与 `eas.json` 中 `production.environment` 一致），否则上架包仍可能指向 localhost。
