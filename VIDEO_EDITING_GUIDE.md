# Video Editing Guide — Toolnaut 1-Minute Ad
## Step-by-Step Instructions for DaVinci Resolve, Premiere Pro, CapCut

---

## 🎬 EDITING SOFTWARE COMPARISON

| Feature | DaVinci Resolve | Premiere Pro | CapCut | Winner |
|---------|-----------------|--------------|--------|--------|
| **Cost** | FREE | $54.99/mo | FREE | DaVinci/CapCut |
| **Learning Curve** | Medium | Hard | Easy | CapCut |
| **Professional Quality** | Excellent | Best | Good | Premiere |
| **Mobile-Friendly** | No | No | YES | CapCut |
| **Color Grading** | Best-in-class | Good | Basic | DaVinci |
| **Best For This Project** | Desktop Pro | Agency | Quick/Social | DaVinci or CapCut |

**Recommendation for this project:** **DaVinci Resolve** (free, professional, best color grading)

---

## 📋 PRE-EDITING CHECKLIST

Before you start, gather:
- [ ] All screen recordings from Toolnaut app (MOV or MP4)
- [ ] 3 music tracks (intro, middle, outro sections)
- [ ] SFX: whoosh, click, transition, ding sounds
- [ ] Brand logo (PNG with transparency)
- [ ] Voiceover audio file (WAV or MP3)
- [ ] Graphics/images for visuals
- [ ] Font files (if not system default)

---

# 🎨 DAVINCI RESOLVE (RECOMMENDED)

## Installation & Setup

1. **Download:** davinciresolve.com (free version)
2. **Install** on Windows/Mac/Linux
3. **Create new project:**
   - Open DaVinci Resolve
   - File → New Project
   - Name: "Toolnaut_Ad_60sec"
   - Timeline resolution: 1920×1080 (YouTube) OR 1080×1920 (Instagram)
   - Frame rate: 30fps
   - Click Create

## Step-by-Step Editing

### **STEP 1: Import Assets (10 min)**

1. **Create a folder structure:**
   ```
   Toolnaut_Ad/
   ├── Video Clips/
   ├── Audio/
   ├── Graphics/
   └── Exports/
   ```

2. **Import media:**
   - Media Pool (left panel)
   - Right-click → Import Media
   - Select all your video clips, music, voiceover
   - Organize into folders by dragging

3. **Set up timecode:**
   - Timeline settings → FPS: 30
   - Duration: 00:00:60 (exactly 60 seconds)

### **STEP 2: Build Timeline (15 min)**

**Timeline layout:**
```
Track 1 (V1):  Logo/graphics
Track 2 (V2):  Main video content
Track 3 (V3):  Text overlays/titles
Audio 1 (A1):  Voiceover
Audio 2 (A2):  Music
Audio 3 (A3):  Sound effects
```

1. **Drag & arrange clips in order:**
   - 0:00-0:10 → Hook section (logos flashing)
   - 0:10-0:20 → Problem section (research, confusion)
   - 0:20-0:45 → Solution section (app walkthrough)
   - 0:45-1:00 → CTA section (website, call-to-action)

2. **Drag clips from Media Pool to Timeline:**
   - Click clip → Drag to Video Track (V2)
   - Clips should snap to timeline
   - Adjust length by dragging clip edges

3. **Add music:**
   - Drag music track to Audio Track (A2)
   - Extends full 60 seconds
   - Lower volume later in color grading

### **STEP 3: Add Transitions (10 min)**

1. **Fade between clips:**
   - Click between two clips on timeline
   - Transitions panel (right) → Fade
   - Drag "Fade" to the cut between clips
   - Duration: 0.3-0.5 seconds

2. **Transition settings:**
   - Click transition → Inspector panel
   - Duration: 300ms (0.3s)
   - Easing: Ease in/out

3. **Add slide transitions for section breaks:**
   - Transitions → Slide Right
   - Between major sections (hook→problem→solution→CTA)

### **STEP 4: Add Text Overlays (20 min)**

1. **Create text on V3 track:**
   - Timeline → right-click V3 track → Add text
   - Or: Fusion tab → Text+ (more control)

2. **Text for each section:**

   **0-10s (Hook):**
   - "1,000+ AI Tools"
   - "Endless Options"
   - "No Clear Path"

   **10-20s (Problem):**
   - "⏰ Hours of research"
   - "💰 Wrong subscriptions"
   - "❌ Missed opportunities"

   **20-45s (Solution):**
   - "Only tools that fit YOU"
   - "No guessing"
   - "No waste"

   **45-60s (CTA):**
   - "TOOLNAUT.XYZ" (LARGE)
   - "✓ Free to use"
   - "✓ 30-second quiz"
   - "✓ Personalized matches"

3. **Format each text:**
   - Inspector → Text panel
   - Font: Inter, Montserrat, or Poppins
   - Size: 48-72pt (readable on phone)
   - Color: White (#FFFFFF)
   - Alignment: Center
   - Shadow: Add drop shadow for legibility

4. **Animate text:**
   - Inspector → Animation
   - Fade In: 0.3s
   - Fade Out: 0.3s
   - Scale: 1.0 (no zoom unless emphasis)

### **STEP 5: Color Grading (15 min)**

1. **Open Color page:**
   - Top right → Color tab

2. **Primary color correction:**
   - Lift: +5 (brighten blacks slightly)
   - Gamma: +3 (overall brightness)
   - Gain: +8 (whites/highlights)
   - Saturation: +10 (slightly more vivid)

3. **Create brand color look:**
   - LUT (Look-Up Table) → Search "teal" or "tech"
   - Or manual: 
     - Shadows: Slight blue tint
     - Midtones: Neutral
     - Highlights: Slight warm tint

4. **Consistency:**
   - Apply same color grade to all clips
   - Use Power Window to isolate background

### **STEP 6: Audio Mixing (10 min)**

1. **Open Fairlight audio panel:**
   - Bottom right → Fairlight tab

2. **Level each track:**
   - Voiceover (A1): -3dB (loudest)
   - Music (A2): -12dB (background)
   - SFX (A3): -6dB (subtle but present)

3. **Add crossfade for audio:**
   - Music fades in at 0:00 (0.5s)
   - Music fades out at 0:58 (1s for smooth end)
   - Voiceover stays consistent level

4. **Add EQ to voiceover:**
   - A1 track → Inspector
   - EQ: High-pass filter (remove low rumble)
   - Boost: +3dB @ 3kHz (clarity)

### **STEP 7: Final Adjustments (10 min)**

1. **Add logo watermark:**
   - V1 track → Import logo image
   - Resize to top-left corner
   - Opacity: 40%
   - Duration: Full 60 seconds

2. **Add CTA button animation at end:**
   - Fusion tab → Create "Get Started" button
   - Animate: Pulse (2x) in last 5 seconds
   - Glow effect: Add bright outline

3. **Review full timeline:**
   - Play from start
   - Check sync (voiceover → visuals)
   - Check audio levels (no peaks)
   - Check text readability

### **STEP 8: Export (5 min)**

1. **Set up export:**
   - File → Export → YouTube
   - Or: File → Export → Social Media (Instagram)

2. **YouTube export:**
   - Codec: H.264
   - Resolution: 1920×1080
   - Bitrate: 12 Mbps
   - Frame rate: 30fps
   - Audio: 192 kbps AAC

3. **Instagram export:**
   - Create new timeline: 1080×1920 (vertical)
   - Copy all clips, rotate/reposition
   - Export at 9:16 aspect ratio
   - Bitrate: 8 Mbps (smaller for fast upload)

4. **Click "Export" and wait** (5-10 min rendering)

---

# 🎬 CAPCUT (FAST & EASY)

## Installation

**Download:** capcut.cc (web) or CapCut app (desktop/mobile)

## Quick Timeline (30 min total)

1. **New project:**
   - CapCut → New project
   - Aspect ratio: 16:9 (YouTube) or 9:16 (Instagram)
   - Duration: 60 seconds

2. **Upload clips:**
   - Drag all video clips to timeline
   - Drag music to Music track
   - Drag voiceover to Voiceover track

3. **Cut to timing:**
   - Use handles on clips to trim
   - Snap to voiceover timing

4. **Add transitions:**
   - Between clips → Transitions tab
   - Select "Fade" or "Slide"
   - Apply to all (0.3s duration)

5. **Add text:**
   - Text → Add text
   - Type: "1,000+ AI Tools"
   - Format: White, 48pt, center
   - Animate: Fade in/out

6. **Color grade:**
   - Clip → Adjust → Brightness/Saturation
   - Increase saturation +10
   - Increase brightness +5

7. **Audio:**
   - Voiceover: -3dB
   - Music: -12dB
   - Fade music in/out at edges

8. **Export:**
   - Export → YouTube (1920×1080)
   - Export → Instagram (1080×1920)
   - Quality: High
   - Wait for processing

---

# 📱 PREMIERE PRO (PROFESSIONAL)

*(Skip if you don't have subscription)*

1. **New project:** 1920×1080, 29.97fps
2. **Import assets:** File → Import
3. **Arrange timeline:** Drag clips
4. **Add transitions:** Window → Transitions
5. **Text:** Text tool → add overlays
6. **Color:** Lumetri Color panel
7. **Audio:** Essential Sound panel
8. **Export:** Media Encoder → H.264 MP4

---

## ✅ QUALITY CHECKLIST (Before Export)

- [ ] Video length: exactly 60 seconds
- [ ] All text readable on small screen (zoom in to check)
- [ ] Voiceover synced to visuals (no lag)
- [ ] Audio levels correct (no peaks/clipping)
- [ ] Colors consistent across all clips
- [ ] Transitions smooth (no jarring cuts)
- [ ] Logo visible for at least 3 seconds
- [ ] Website URL appears 3+ times
- [ ] Music fades in/out smoothly
- [ ] No black bars (full screen for mobile)

---

## 📊 EXPORT SETTINGS

### YouTube
```
Codec: H.264
Resolution: 1920×1080
Bitrate: 12 Mbps
Frame rate: 30fps
Audio: 192 kbps AAC
File: MP4
```

### Instagram (9:16)
```
Codec: H.264
Resolution: 1080×1920
Bitrate: 8 Mbps
Frame rate: 30fps
Audio: 128 kbps AAC
File: MP4
```

### Instagram (1:1)
```
Codec: H.264
Resolution: 1080×1080
Bitrate: 10 Mbps
Frame rate: 30fps
Audio: 128 kbps AAC
File: MP4
```

---

## 🚀 UPLOAD TO YOUTUBE

1. **youtube.com → Create → Upload Video**
2. **Title:** "Toolnaut — Find Your Perfect AI Tools in 30 Seconds"
3. **Description:** (see VIDEO_SCRIPT.md for full description)
4. **Thumbnail:** Custom image with logo + text
5. **Tags:** "AI tools, productivity, software, tech, chatgpt"
6. **Made for Kids:** No
7. **Visibility:** Public
8. **Click Upload**

---

## 📲 UPLOAD TO INSTAGRAM

1. **Instagram → Create → Reels (for vertical)**
2. **Upload video** (1080×1920 MP4)
3. **Add caption** (see VIDEO_SCRIPT.md)
4. **Add hashtags** (30 relevant tags)
5. **Cover image:** Choose frame from video
6. **Click Share**

---

## 📊 MONITORING

After uploading:
- **YouTube:** Check Shorts Analytics after 48 hours
- **Instagram:** Check Insights after 24 hours
- **Metrics to track:**
  - Views
  - Click-through rate (CTR) to website
  - Engagement (likes, comments, shares)
  - Watch time / Retention rate

---

## 💡 COMMON EDITING MISTAKES TO AVOID

1. ❌ Text too small (unreadable on mobile)
2. ❌ Voiceover out of sync with visuals
3. ❌ Audio levels too loud (distortion) or too quiet
4. ❌ Transitions too slow (drags pacing)
5. ❌ Colors inconsistent between clips
6. ❌ Website URL only shown once
7. ❌ Music too loud (voiceover inaudible)
8. ❌ Video longer than 60 seconds (YouTube Shorts cutoff)
9. ❌ No captions (many watch without sound)
10. ❌ Forgetting to export in correct aspect ratio

---

## 🎯 FINAL CHECKLIST

Before publishing:
- [ ] Video exactly 60 seconds
- [ ] All text large & white (readable on 4-inch screen)
- [ ] Audio synced & balanced
- [ ] Color graded (consistent look)
- [ ] Logo visible entire video
- [ ] Website URL prominent in last 15 seconds
- [ ] Tested on actual phone (not just computer)
- [ ] Captions enabled for Instagram
- [ ] Hashtags added
- [ ] Thumbnail image created

**You're ready to go! 🚀**

---

Ready to edit? Pick DaVinci Resolve (free + professional) or CapCut (fast + easy).
