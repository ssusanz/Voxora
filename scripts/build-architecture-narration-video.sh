#!/usr/bin/env bash
# Build a narrated MP4: architecture PDF (**3 pages**, one figure each) + English TTS (macOS `say`).
# Figures 1–2: **split-screen** — diagram (left 960) + code (right 960). Figure 1 right column **scrolls**;
# Figure 2 right column is **one static** 960×1080 frame. **Figure 3:** full **1920×1080** frame = iteration
# slide (top 540) + GitHub branches screenshot (bottom 540); **no** right code column.
# Figure 1 right strip: `eas-build-ios.sh` → EAS Builds PNG → TestFlight PNG → `server-dev.sh` → snippets.
# **Playback order** (voice + video + subs): **Figure 1** (deployment) → **Figure 2** (technical) →
# **Figure 3** (iterations). PDF page N → `arch-figure-N.png` / `slide-N.png`.
# Requires: ffmpeg, pdftoppm, say (macOS), ImageMagick `magick`, python3 (SRT timing from voice-*.txt).
# Subtitles: English **soft** track (mov_text in MP4) + sidecar .srt. Toggle CC in VLC / QuickTime.
# Burned-in subs need a ffmpeg build with libass (`subtitles` filter); this script does not depend on it.
#
# Usage:
#   ./scripts/build-architecture-narration-video.sh
# Env (optional):
#   LEFT_TOP_FIG1    optional path: Figure 1 top strip only (disables Coze+Cursor auto combo when set).
#   LEFT_TOP_FIG2    optional path: Figure 2 top strip (default: repo + branches PNGs stacked vertically).
#   VOICE, SPEAK_RATE  macOS `say` voice and words-per-minute (defaults: Karen, 168).
#   SCROLL_EASE_POWER  code-panel scroll easing: pow(progress, this) after the hold; default 1.75.
#   CODE_SCROLL_PAUSE_SEC  code panel hold at top before scroll (Fig1 only); default 5.
#   SILENCE_GAP       seconds of silence **before** each figure's spoken track (three gaps). Default 0.5.
#   CARD_GAP          seconds of silent split-screen **before** each figure's narration. Default 0.5 (keep equal to SILENCE_GAP so audio matches video).
# Output:
#   docs/latex/video-out/voxora-architecture-narration.mp4  (H.264 + AAC + English mov_text subtitle track)
#   docs/latex/video-out/voxora-architecture-narration.srt  (same cues; edit or import elsewhere)
#
# English narration text lives in heredocs below — keep in sync with
# docs/Voxora Technical Video Diagram Narration.md (Figure 1–3 English blocks).
# Total runtime grows with word count; tune SPEAK_RATE / gaps if you need a tighter clip.
#
# Left panel: a **top strip** (960×400) + architecture slide (960×680).
# Figure 1: **Coze above Cursor** (960×200 each) when both PNGs exist; else single asset or GitHub.
# Figure 2: **GitHub repo above branches** (960×200 each) when both PNGs exist; else **LEFT_TOP_FIG2=** or repo-only.
# **LEFT_TOP_FIG1=** forces one custom image (skips Coze+Cursor stack).
# Figure 3 video: `slide-3.png` over `docs/assets/voxora-github-branches-overview.png` (see build_fig3_vertical_vid).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PDF="$ROOT/docs/latex/voxora-architecture.pdf"
OUT="$ROOT/docs/latex/video-out"
# Default **Karen** (en_AU): usually sounds more natural than Samantha for long English narration.
# Override: VOICE=Samantha or VOICE=Moira (en_IE), etc. — list: `say -v '?'`
VOICE="${VOICE:-Karen}"
# Speaking rate (words per minute). macOS default ~180; slightly lower reads calmer for video.
SPEAK_RATE="${SPEAK_RATE:-168}"
# Monospace font for code panel (use a CJK-capable .ttf/.ttc if captions show tofu)
CODE_FONT="${CODE_FONT:-/System/Library/Fonts/Supplemental/Courier New.ttf}"
# Right panel: after CODE_SCROLL_PAUSE_SEC hold, scroll progress = u^p with u=(t-hold)/(dur-hold).
SCROLL_EASE_POWER="${SCROLL_EASE_POWER:-1.75}"
CODE_SCROLL_PAUSE_SEC="${CODE_SCROLL_PAUSE_SEC:-5}"
SILENCE_GAP="${SILENCE_GAP:-0.5}"
CARD_GAP="${CARD_GAP:-0.5}"

mkdir -p "$OUT"
cd "$OUT"

if [[ ! -f "$PDF" ]]; then
  echo "error: missing PDF: $PDF (run: cd docs/latex && pdflatex voxora-architecture.tex)" >&2
  exit 1
fi

echo "==> Architecture slides → PNG (prefer pre-exported high-DPI from ./scripts/export-architecture-figures.sh)"
FIG_EXPORT="$ROOT/docs/latex/exports"
if [[ -f "$FIG_EXPORT/arch-figure-1.png" ]]; then
  for i in 1 2 3; do
    cp -f "$FIG_EXPORT/arch-figure-${i}.png" "slide-${i}.png"
  done
  echo "    (using $FIG_EXPORT/arch-figure-{1,2,3}.png)"
else
  echo "    (fallback: pdftoppm from PDF at 150 DPI — run export-architecture-figures.sh for sharper PNG)"
  pdftoppm -png -r 150 -f 1 -l 3 "$PDF" slide
  for i in 1 2 3; do
    ii=$(printf '%02d' "$i")
    if [[ -f "slide-${ii}.png" ]]; then
      mv -f "slide-${ii}.png" "slide-${i}.png"
    elif [[ -f "slide-${i}.png" ]]; then
      :
    else
      echo "error: pdftoppm did not produce slide-${ii}.png or slide-${i}.png" >&2
      exit 1
    fi
  done
fi
for i in 1 2 3; do
  if [[ ! -f "slide-${i}.png" ]]; then
    echo "error: missing slide-${i}.png (check PDF has 3 pages)" >&2
    exit 1
  fi
done

GH_REPO_IMG="$ROOT/docs/assets/voxora-github-repo-overview.png"
GH_BRANCH_IMG="$ROOT/docs/assets/voxora-github-branches-overview.png"
COZE_VIBE_IMG="$ROOT/docs/assets/voxora-coze-vibe-coding.png"
CURSOR_VIEW_IMG="$ROOT/docs/assets/voxora-cursor-project-view.png"
EAS_BUILDS_IMG="$ROOT/docs/assets/voxora-expo-eas-builds-dashboard.png"
TESTFLIGHT_IMG="$ROOT/docs/assets/voxora-appstore-testflight-ios.png"

# Stack two assets into one 960×400 top strip (top image, then bottom image).
stack_top_strip_vertical() {
  local out="$1" top_img="$2" bottom_img="$3"
  magick \( "$top_img" -resize 960x200^ -gravity north -extent 960x200 \) \
    \( "$bottom_img" -resize 960x200^ -gravity north -extent 960x200 \) \
    -background '#0b1224' -append "$out"
}

# Left 960×1080: top strip + architecture slide (bottom), or slide-only if top asset missing.
compose_left_panel() {
  local slide_png="$1" github_png="$2" out_png="$3"
  if [[ -f "$github_png" ]]; then
    magick \( "$github_png" -resize 960x400^ -gravity north -extent 960x400 \) \
      \( "$slide_png" -resize 960x680^ -gravity center -extent 960x680 \) \
      -background '#0b1224' -append "$out_png"
  else
    echo "    (no top-strip image at $github_png — left panel = diagram only)" >&2
    magick "$slide_png" -resize 960x1080^ -gravity center -extent 960x1080 "$out_png"
  fi
}

FIG1_TOP="${LEFT_TOP_FIG1:-}"
FIG1_TOP_LABEL=""
if [[ -n "$FIG1_TOP" && -f "$FIG1_TOP" ]]; then
  FIG1_TOP_LABEL="${FIG1_TOP##*/} (LEFT_TOP_FIG1)"
elif [[ -f "$COZE_VIBE_IMG" && -f "$CURSOR_VIEW_IMG" ]]; then
  # 960×200 + 960×200 → 960×400: Coze (top) + Cursor (bottom).
  stack_top_strip_vertical "$OUT/fig1-top-coze-cursor.png" "$COZE_VIBE_IMG" "$CURSOR_VIEW_IMG"
  FIG1_TOP="$OUT/fig1-top-coze-cursor.png"
  FIG1_TOP_LABEL="coze+cursor (vertical 960×400)"
elif [[ -f "$COZE_VIBE_IMG" ]]; then
  FIG1_TOP="$COZE_VIBE_IMG"
  FIG1_TOP_LABEL="${FIG1_TOP##*/}"
elif [[ -f "$CURSOR_VIEW_IMG" ]]; then
  FIG1_TOP="$CURSOR_VIEW_IMG"
  FIG1_TOP_LABEL="${FIG1_TOP##*/}"
else
  FIG1_TOP="$GH_REPO_IMG"
  FIG1_TOP_LABEL="${FIG1_TOP##*/}"
fi

FIG2_TOP="${LEFT_TOP_FIG2:-}"
FIG2_TOP_LABEL=""
if [[ -n "$FIG2_TOP" && -f "$FIG2_TOP" ]]; then
  FIG2_TOP_LABEL="${FIG2_TOP##*/} (LEFT_TOP_FIG2)"
elif [[ -f "$GH_REPO_IMG" && -f "$GH_BRANCH_IMG" ]]; then
  stack_top_strip_vertical "$OUT/fig2-top-github-vertical.png" "$GH_REPO_IMG" "$GH_BRANCH_IMG"
  FIG2_TOP="$OUT/fig2-top-github-vertical.png"
  FIG2_TOP_LABEL="github repo+branches (vertical)"
else
  FIG2_TOP="$GH_REPO_IMG"
  FIG2_TOP_LABEL="${FIG2_TOP##*/}"
fi

echo "==> Left panel: top strip + architecture (960×1080); Fig1 top = ${FIG1_TOP_LABEL:-${FIG1_TOP##*/}} | Fig2 top = ${FIG2_TOP_LABEL:-${FIG2_TOP##*/}}"
compose_left_panel "slide-1.png" "$FIG1_TOP" "left-panel-1.png"
compose_left_panel "slide-2.png" "$FIG2_TOP" "left-panel-2.png"
# Figure 3 uses full-frame vertical layout (see build_fig3_vertical_vid); no left-panel-3 composite.

append_code_block() {
  local target="$1" rel="$2" max="${3:-200}"
  {
    printf '\n\n== %s ==\n\n' "$rel"
    if [[ -f "$ROOT/$rel" ]]; then
      # Avoid `nl | head` under `pipefail` (SIGPIPE → exit 141 aborts the script).
      awk -v max="$max" '{ printf "%6d\t%s\n", NR, $0; if (NR >= max) exit }' "$ROOT/$rel"
    else
      printf '(missing: %s/%s)\n' "$ROOT" "$rel"
    fi
  } >> "$target"
}

# Append a line range from a repo file (inclusive), for curated strips.
append_code_lines() {
  local target="$1" rel="$2" start="$3" end="$4" label="${5:-$rel}"
  {
    printf '\n\n== %s ==\n\n' "$label"
    if [[ -f "$ROOT/$rel" ]]; then
      nl -ba "$ROOT/$rel" | sed -n "${start},${end}p"
    else
      printf '(missing: %s/%s)\n' "$ROOT" "$rel"
    fi
  } >> "$target"
}

echo "==> Code strips (txt) + tall PNG (strip 1 = Fig1 deploy, strip 2 = Fig2 technical)"
# Figure 1 right column (top → bottom): **eas-build-ios.sh** → Expo **EAS Builds** (PNG) → **TestFlight** (PNG)
# → **scripts/server-dev.sh** (local Express backend) → other snippets.
: > codestrip-1-eas-script.txt
append_code_block codestrip-1-eas-script.txt scripts/eas-build-ios.sh 200
: > codestrip-1-rest.txt
append_code_block codestrip-1-rest.txt scripts/server-dev.sh 120
append_code_block codestrip-1-rest.txt package.json 90
append_code_block codestrip-1-rest.txt .cozeproj/scripts/dev_run.sh 90
append_code_block codestrip-1-rest.txt client/eas.json 140
append_code_block codestrip-1-rest.txt client/app.config.ts 140
append_code_block codestrip-1-rest.txt server/src/lib/gemini-summarize.ts 180

# Figure 2 — technical diagram: **short curated** snippets only; panel is **scaled to 960×1080** (no y-scroll).
: > codestrip-2.txt
append_code_block codestrip-2.txt client/utils/meetFutureStorage.ts 58
append_code_lines codestrip-2.txt client/utils/backend.ts 106 147 "client/utils/backend.ts (getBackendBaseUrl)"
append_code_block codestrip-2.txt client/components/VoiceInput.tsx 52
append_code_block codestrip-2.txt server/src/load-env.ts 80
append_code_block codestrip-2.txt server/src/lib/gemini-summarize.ts 42

: > codestrip-3.txt
{
  echo ""
  echo "=== git tag -n1 (excerpt) ==="
  git -C "$ROOT" tag -n1 2>/dev/null | head -n 50 || echo "(git tag unavailable)"
  echo ""
  echo "=== git show v1.3.1 --stat ==="
  git -C "$ROOT" show v1.3.1 --stat --no-patch 2>/dev/null | head -n 80 || echo "(git show v1.3.1 unavailable)"
  echo ""
  echo "=== git show v1.3.0 --stat ==="
  git -C "$ROOT" show v1.3.0 --stat --no-patch 2>/dev/null | head -n 80 || echo "(git show v1.3.0 unavailable)"
} >> codestrip-3.txt
append_code_block codestrip-3.txt client/package.json 55

caption_to_png() {
  local txt="$1" png="$2"
  magick -background '#0b1224' -fill '#e5e7eb' -font "$CODE_FONT" -pointsize 12.5 \
    -size 904x caption:@"$txt" -alpha off "$png"
}

caption_to_png codestrip-1-eas-script.txt code-tall-1-eas-script.png
caption_to_png codestrip-1-rest.txt code-tall-1-rest.png

F1_STRIP_PARTS=(code-tall-1-eas-script.png)
if [[ -f "$EAS_BUILDS_IMG" ]]; then
  magick "$EAS_BUILDS_IMG" -resize 904x^ -gravity north -background '#0b1224' -extent 904x680 \
    code-tall-1-eas-dashboard.png
  F1_STRIP_PARTS+=(code-tall-1-eas-dashboard.png)
fi
if [[ -f "$TESTFLIGHT_IMG" ]]; then
  magick "$TESTFLIGHT_IMG" -resize 904x^ -gravity north -background '#0b1224' -extent 904x680 \
    code-tall-1-testflight.png
  F1_STRIP_PARTS+=(code-tall-1-testflight.png)
fi
F1_STRIP_PARTS+=(code-tall-1-rest.png)
magick "${F1_STRIP_PARTS[@]}" -background '#0b1224' -append code-tall-1.png
echo "    (Fig1 code strip: eas-build-ios → EAS/TF PNGs (if present) → server-dev.sh → snippets)"

caption_to_png codestrip-2.txt code-tall-2.png
# Fit entire Figure 2 code panel in one 960×1080 frame (no vertical scroll in split filter).
magick code-tall-2.png -resize '960x1080>' -gravity center -background '#0b1224' -extent 960x1080 code-tall-2-fit.png
mv -f code-tall-2-fit.png code-tall-2.png

caption_to_png codestrip-3.txt code-tall-3.png
echo "    (Fig3: code-tall-3.png for hand-recording only — MP4 uses full-frame slide + GitHub, no code column)"

strip_md() {
  sed -e 's/\*\*//g' -e 's/^[[:space:]]*"//' -e 's/"[[:space:]]*$//' -e "s/'/'/g"
}

echo "==> Write narration text (English; order: Fig1 deploy → Fig2 technical → Fig3 iterations)"
cat <<'EOF' | strip_md > voice-1.txt
This figure is how we build and ship Voxora. We started on Coze for early ideas and UI, but debugging code there felt slow, and publishing depends on region, which was hard for our teammate in India. We moved day-to-day work to Cursor, ship with EAS, and use TestFlight so remote collaboration stayed easy. The backend runs on a Mac mini with a public address. For the MVP we call Gemini 2.5 Flash for summaries and other AI helpers.
EOF

cat <<'EOF' | strip_md > voice-2.txt
Figure 2 is the technical picture. We built for families at home: grandparents who don't like typing or hunting through screens, and busy hands in the kitchen—so voice and simple commands are a normal path, not a stunt. Wi-Fi and mobile signal are not always reliable: save on the device first, then sync with the server in the background. The backend stays small—it mainly stores data safely. When it calls AI we strip sensitive detail; your real identity and photos are not what we upload. Cloud AI helps when on-phone speech recognition is not enough: family chat, voice, short to-do summaries. If we need photos or other private uploads, we ask clearly first. Later, stronger on-device models can take more of the load.
EOF

cat <<'EOF' | strip_md > voice-3.txt
The timeline on screen is how we paced releases toward the current app. We leaned on Coze and Cursor, but step one hurt: the Coze cloud project was mostly a UI shell until we moved it local, dropped Coze-only hooks, and shipped real memories, summaries, and vlogs—lesson: maybe start creative coding in Cursor sooner. Wiring up AI was easier than voice that truly drives the app. Fully capable on-device agents are still early, industry-wide; for now we used keyword spotting on a few high-frequency flows—like helping grandparents find or create a memory—to validate what users need, fast.
EOF

# H.264 yuv420p: final frame is 1920x1080 (left diagram + right code); setsar=1 for concat
ENC_V="-c:v libx264 -preset veryfast -pix_fmt yuv420p -r 30"

dur_media() {
  ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$1"
}

# Build English SRT: voice-1 = Fig1 deploy, voice-2 = Fig2 technical, voice-3 = Fig3; times as above.
write_narration_srt() {
  local d1="$1" d2="$2" d3="$3"
  CARD_GAP="$CARD_GAP" D1="$d1" D2="$d2" D3="$d3" python3 <<'PY'
import os, re, textwrap

def srt_ts(sec):
    if sec < 0:
        sec = 0.0
    total_ms = int(round(sec * 1000))
    h = total_ms // 3600000
    m = (total_ms % 3600000) // 60000
    s = (total_ms % 60000) // 1000
    ms = total_ms % 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def sentences(text):
    t = " ".join(text.split())
    if not t:
        return []
    parts = re.split(r"(?<=[.!?])\s+", t)
    return [p.strip() for p in parts if p.strip()]

def cues_for_block(start, end, text, wrap=46):
    segs = sentences(text)
    if not segs:
        return []
    span = max(end - start, 0.05)
    weights = [max(len(s), 8) for s in segs]
    tw = sum(weights)
    out = []
    t = start
    for s, w in zip(segs, weights):
        dur = span * (w / tw)
        body = "\n".join(textwrap.wrap(s, width=wrap, break_long_words=False, break_on_hyphens=False))
        out.append((t, t + dur, body))
        t += dur
    if out:
        a, _, txt = out[-1]
        out[-1] = (a, end, txt)
    return out

cg = float(os.environ.get("CARD_GAP", "0.5"))
d1 = float(os.environ["D1"])
d2 = float(os.environ["D2"])
d3 = float(os.environ["D3"])

def read_voice(n):
    with open(f"voice-{n}.txt", encoding="utf-8") as f:
        return f.read()

all_cues = []
idx = 1
t1 = cg
t2 = t1 + d1 + cg
t3 = t2 + d2 + cg

for start, end, n in ((t1, t1 + d1, 1), (t2, t2 + d2, 2), (t3, t3 + d3, 3)):
    for a, b, body in cues_for_block(start, end, read_voice(n)):
        all_cues.append((idx, a, b, body))
        idx += 1

with open("voxora-architecture-narration.srt", "w", encoding="utf-8") as out:
    for i, a, b, body in all_cues:
        out.write(f"{i}\n{srt_ts(a)} --> {srt_ts(b)}\n{body}\n\n")
PY
}

# Left: architecture PNG — **cover** 960×1080 (scale up, center-crop) so it reads large in video.
# Right: code PNG (960 = half of 1920). Figure 1: y-scroll when ih>1080. Figure 2: ih==1080 (static).
# Hold CODE_SCROLL_PAUSE_SEC at top, then ease-scroll the remainder (Figure 1 only).
build_split_vid() {
  local diag="$1" codepng="$2" dur="$3" out="$4"
  local pause="${CODE_SCROLL_PAUSE_SEC:-5}"
  local pause_eff scroll_span
  pause_eff=$(awk -v d="$dur" -v p="$pause" 'BEGIN { printf "%.6f", (p < d ? p : d) }')
  scroll_span=$(awk -v d="$dur" -v pe="$pause_eff" 'BEGIN { s = d - pe; if (s < 0.000001) s = 0.000001; printf "%.6f", s }')
  local fc=""
  fc="[0:v]scale=960:1080:force_original_aspect_ratio=increase,crop=960:1080,format=yuv420p,setsar=1[diag];"
  fc+="[1:v]format=yuv420p,scale=960:-1[tall];"
  fc+="[tall]crop=960:1080:0:"
  fc+='if(lte(ih\,1080)\,0\,min(max(0\,(ih-1080)*pow(if(lte(t\,'
  fc+="${pause_eff}"
  fc+=')\,0\,min((t-'
  fc+="${pause_eff}"
  fc+=')/'
  fc+="${scroll_span}"
  fc+='\,1))\,'
  fc+="${SCROLL_EASE_POWER}"
  fc+='))\,ih-1080))'
  fc+="[code];"
  fc+="[diag][code]hstack=inputs=2,format=yuv420p,setsar=1[out]"
  ffmpeg -y -hide_banner -loglevel error -loop 1 -i "$diag" -loop 1 -i "$codepng" -t "$dur" \
    -filter_complex "$fc" -map "[out]" $ENC_V -an "$out"
}

# Figure 3 — wide timeline: **1920×1080** = slide (top half) + GitHub branches (bottom half), no code column.
build_fig3_vertical_vid() {
  local slide_png="$1" gh_png="$2" dur="$3" out="$4"
  if [[ ! -f "$slide_png" || ! -f "$gh_png" ]]; then
    echo "error: build_fig3_vertical_vid needs slide + GitHub PNG ($slide_png / $gh_png)" >&2
    exit 1
  fi
  local fc=""
  fc="[0:v]scale=1920:540:force_original_aspect_ratio=decrease,pad=1920:540:(ow-iw)/2:(oh-ih)/2:color=0x0b1224[top];"
  fc+="[1:v]scale=1920:540:force_original_aspect_ratio=decrease,pad=1920:540:(ow-iw)/2:(oh-ih)/2:color=0x0b1224[bot];"
  fc+="[top][bot]vstack=inputs=2,format=yuv420p,setsar=1[outv]"
  ffmpeg -y -hide_banner -loglevel error -loop 1 -i "$slide_png" -loop 1 -i "$gh_png" -t "$dur" \
    -filter_complex "$fc" -map "[outv]" $ENC_V -an "$out"
}

echo "==> Text-to-speech (macOS say) -> caf then wav (voice=$VOICE rate=$SPEAK_RATE wpm)"
for i in 1 2 3; do
  say -v "$VOICE" -r "$SPEAK_RATE" -o "voice-${i}.caf" -f "voice-${i}.txt"
  ffmpeg -y -hide_banner -loglevel error -i "voice-${i}.caf" -ar 44100 -ac 2 "voice-${i}.wav"
done

echo "==> Stereo silence between figures (SILENCE_GAP=${SILENCE_GAP}s × 3, timeline matches video)"
ffmpeg -y -hide_banner -loglevel error -f lavfi -i "anullsrc=r=44100:cl=stereo" -t "$SILENCE_GAP" "silence-between.wav"

echo "==> Full narration audio: silence + voice × 3 (timeline matches 6 video segments)"
printf "file '%s'\n" \
  "$OUT/silence-between.wav" "$OUT/voice-1.wav" \
  "$OUT/silence-between.wav" "$OUT/voice-2.wav" \
  "$OUT/silence-between.wav" "$OUT/voice-3.wav" \
  > audio-concat.txt
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i audio-concat.txt -c copy "narration-full.wav"

echo "==> Video-only segments (Fig1–2: split diagram+code; Fig3: full-width slide over GitHub)"
echo "    silent intro per figure: CARD_GAP=${CARD_GAP}s | code hold (Fig1 only): CODE_SCROLL_PAUSE_SEC=${CODE_SCROLL_PAUSE_SEC}s"
echo "    code scroll easing: SCROLL_EASE_POWER=${SCROLL_EASE_POWER} (set to 1 for linear; try 2–2.5 for calmer start)"
# Video order matches voice: Fig1 (slide-1 deploy) → Fig2 (slide-2 technical) → Fig3.
build_split_vid "left-panel-1.png" "code-tall-1.png" "$CARD_GAP" "vid0.mp4"
D1=$(dur_media "voice-1.wav"); build_split_vid "left-panel-1.png" "code-tall-1.png" "$D1" "vid1.mp4"
build_split_vid "left-panel-2.png" "code-tall-2.png" "$CARD_GAP" "vid2.mp4"
D2=$(dur_media "voice-2.wav"); build_split_vid "left-panel-2.png" "code-tall-2.png" "$D2" "vid3.mp4"
build_fig3_vertical_vid "slide-3.png" "$GH_BRANCH_IMG" "$CARD_GAP" "vid4.mp4"
D3=$(dur_media "voice-3.wav"); build_fig3_vertical_vid "slide-3.png" "$GH_BRANCH_IMG" "$D3" "vid5.mp4"

echo "==> Concat 6 silent videos -> video-only.mp4"
ffmpeg -y -hide_banner -loglevel error \
  -i vid0.mp4 -i vid1.mp4 -i vid2.mp4 -i vid3.mp4 -i vid4.mp4 -i vid5.mp4 \
  -filter_complex "[0:v][1:v][2:v][3:v][4:v][5:v]concat=n=6:v=1:a=0[outv]" \
  -map "[outv]" $ENC_V "video-only.mp4"

echo "==> Subtitles (English, from voice-*.txt) -> voxora-architecture-narration.srt"
write_narration_srt "$D1" "$D2" "$D3"

echo "==> Mux: H.264 video + AAC narration + mov_text subtitle track (soft subs; enable CC in player)"
ffmpeg -y -hide_banner -loglevel error \
  -i "video-only.mp4" -i "narration-full.wav" -f srt -i "voxora-architecture-narration.srt" \
  -map 0:v -map 1:a -map 2 \
  -c:v copy -c:a aac -b:a 192k -c:s mov_text \
  -disposition:s:0 default \
  -movflags +faststart -shortest \
  "voxora-architecture-narration.mp4"

ls -la voxora-architecture-narration.mp4 voxora-architecture-narration.srt
A=$(dur_media narration-full.wav)
V=$(dur_media video-only.mp4)
M=$(dur_media voxora-architecture-narration.mp4)
echo "durations: narration_wav=$A video_only=$V final=$M (wav vs video_only should match)"
echo "Done: $OUT/voxora-architecture-narration.mp4 (+ English soft subs + voxora-architecture-narration.srt)"
