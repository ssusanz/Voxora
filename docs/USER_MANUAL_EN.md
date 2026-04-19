# Voxora User Guide

**Applies to: v1.3.1**  
**Audience: end users — features and how to use them**

*Chinese edition: [USER_MANUAL.md](./USER_MANUAL.md)*

---

## 0. Install the app (iOS)

**Recommended: TestFlight**

1. Install **TestFlight** from the App Store.  
2. **Accept the invite** sent to your **Apple ID** e‑mail (from Apple / App Store Connect), or use the **public TestFlight link** your team shared.  
3. Open **TestFlight**, find **Voxora** (or the name shown), then tap **Install** / **Update**.  

On a new iPhone you usually install again from **TestFlight** with the same Apple ID — **no** per-device “internal IPA” rebuild for each new device. If you do not see the app, ask your maintainer to verify your e‑mail in App Store Connect or resend the invite.

**Fallback (only if your team uses EAS internal builds):** register the device (UDID), then open the **Expo build install page** they send; new devices often require a new build. See [iOS distribution — TestFlight & internal](./ios-eas-joint-testing.md).

---

## 1. What is Voxora?

Voxora is a **family-first memory and connection** app: capture precious moments in the **Time Gallery** with photos and text, and use **Meet the Future** to brainstorm upcoming gatherings, trips, or milestones with your family — leave text or voice notes, then turn them into an actionable summary.

What you see and what works on your device may depend on your setup (for example whether your own backend is reachable or cloud features are enabled). Where it matters, we call out **on-device / LAN** vs **needs network**.

---

## 2. Screen overview (bottom navigation)

The bottom bar usually has five areas (the center control is **Add**; exact layout follows your build):

| Area | Typical use |
|------|-------------|
| **Home** | Family “dynamic island”, mood check-ins, **Time Gallery** + **Meet the Future** switcher, memory list, and more |
| **Family** | Family-space features (members, topology, alerts, etc. — depends on the build) |
| **Add (center)** | Quick add memory, open Vlog, or **voice commands** (tap vs long-press may differ) |
| **Moments** | Entry for photo / moments-style browsing |
| **Profile** | Your profile, settings, and related items |

You can switch languages where the app supports it; some copy is localized per language.

---

## 3. Home: Time Gallery

**Time Gallery** lists saved memory cards (cover, title, date, etc.). You can:

- **Tap** a card to open **memory detail** (when that flow is wired in your build).
- **Scroll** the list; extra space at the bottom avoids overlap with the tab bar.
- On the **Time Gallery / Meet the Future** switcher card, a short line sets the mood (for example in Chinese **「翻翻就醉人」** — the idea of flipping through memories and feeling swept away).

---

## 4. Home: Meet the Future

**Meet the Future** is a **planning and discussion board**: turn “things we want to do together” into **future cards**, let everyone leave notes, then run **Summarize**.

### 4.1 Gradient hero at the top

- A **random playful line** about family planning (the duplicate **“Meet the Future”** heading was removed so it does not repeat the tab label).
- Small chips suggest themes: discuss, split tasks, gentle teasing.

### 4.2 Create a future card

1. Tap **“Add another future”** or, when the list is empty, **“Light up the first one”** (or equivalent).  
2. In the sheet, fill in:  
   - **What is it?** (title — required)  
   - **Roughly when** (optional free text, e.g. “May holiday”, “next weekend”)  
   - **Type**: Trip / Birthday / Party / Gathering  
3. After save, the new card appears at the top of the list.

### 4.3 What you see on a card

- **Title and date** (if you added a date).  
- **Status**: brainstorming vs locked-in (tap the lock to toggle — use however your family likes).  
- **Type** (e.g. “Trip”) sits at the **bottom-right** of the card.  
- **Hints** such as tap to open the thread, long-press to delete (follow on-screen copy).

### 4.4 Open a card (discussion screen)

1. **Tap** the card to open **Meet the Future · detail**.  
2. The top shows **that card’s title**, type, and date; use the **pencil** to edit the title (save / cancel).  
3. **Everyone chimes in**  
   - Choose **who is speaking** (e.g. Me, Grandma, Dad, Mom).  
   - **Text**: type in the composer and send.  
   - **Voice**: tap the mic; after transcription, a message appears (with a **Voice** tag).  
   - **To-dos**: next to each message, **Add to to-do** (requires **Gemini** on the server) turns that line into one actionable item. Tap the square on the left of a to-do to mark it **done**.  
4. **Summarize**  
   - You need **at least one message** first (otherwise you’ll see a hint).  
   - The summary rolls up what’s on the card; if the server has **Gemini** configured, the service prefers **AI** output (structured, **Chinese** body in the current product prompt). If not, a **local template** still returns readable text.  
   - The summary is stored on the card and remains when you come back.

### 4.5 Delete a card

On the home list, **long-press** the card and confirm via the delete affordance (exact UI follows your build).

---

## 5. Add memory and other entry points

- **Center Add**: usually create a memory, open Vlog, or **voice commands** (phrases like “add a memory” / “open moments” — follow in-app hints for what works).  
- **Voice commands** need microphone access; results drive navigation or memory lookup.

---

## 6. Permissions and privacy

The OS may ask for:

- **Photos / camera** — attach or capture images for memories, Vlog, etc.  
- **Microphone** — voice notes, voice commands, video audio.  
- **Location** (if enabled) — location-aware recording or services.

**Meet the Future** keeps cards and messages **on-device first**, and **syncs to your Express API** when reachable (`GET` / `PUT` on `/api/v1/future-plans`, stored under the server’s `data/future-plans/` folder). Offline edits still work; the app retries upload when online. Across devices, the **last saved list on the server wins** (simple merge). If the backend is down or misconfigured, you only see local data — back up before switching phones or clearing storage.

---

## 7. Network and “your own backend”

- **Summarize**, **memory list**, **upload**, etc. may require your **Express** API to be reachable from the phone (same Wi‑Fi, tunnel, or public URL).  
- Builds often set **`EXPO_PUBLIC_BACKEND_BASE_URL`** (or equivalent) to the API root; wrong values cause load or summarize failures.  
- When debugging, check **network**, **whether the server is up**, and **which environment** the app points at.

---

## 8. FAQ

**Q: Summarize always fails?**  
A: Check network and backend URL. Without AI you should still get a local template. If nothing works, inspect server logs or contact whoever runs the backend.

**Q: Wrong title on a future card?**  
A: Open the card detail, tap the **pencil**, edit, and save.

**Q: The small line under Time Gallery differs in English?**  
A: Copy is localized per language — that is expected.

---

## 9. Version and this document

- This guide matches **app version v1.3.1**.  
- After upgrades, menus, permissions text, or cloud behavior may change — follow the in-app UI.

Send product feedback or bugs through your team’s usual channel (issue tracker, email, or internal chat).
