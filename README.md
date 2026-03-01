# 🧘 Sanctum — AI-Powered Wellness Assistant for Snap Spectacles

Sanctum is an immersive AR wellness assistant built for **Snap Spectacles (2024)** using
**Lens Studio**, **TypeScript**, and the **OpenAI Remote Service Gateway**.

This repository represents a major evolution of the original Sanctum concept,
expanding it into a fully AI-driven experience with dynamic voice guidance,
real-time image generation, and intelligent session management.

🔗 Original Version (v1): https://github.com/urbanpeppermint/Sanctum

Sanctum delivers guided breathing exercises, acupressure stress-relief sessions,
and chakra awareness meditations — all through voice, text, and AI-generated
instructional imagery displayed directly in your field of view.

---

## ✨ Features

### 1. Guided Breathing Practice 🌬️
- AI-generated ~1-minute guided breathing script (4-4-6 pattern: inhale, hold, exhale)
- Real-time text overlay counting each phase
- Calming TTS voice guidance (OpenAI `gpt-4o-mini-tts`, voice `coral`)
- AI-generated breathing posture diagram (DALL·E 3) — black background,
  white anatomical line art, numbered steps, blue/red arrows for inhale/exhale
- Image pre-loads before the session begins for a seamless experience

### 2. Acupressure Stress-Relief Session 💆
- Randomly selects 3 of 5 catalogued acupressure points per session
- AI-generated ~2-minute guided session script with per-point instructions
- Professional medical-style diagrams for each point:
  - Black background with white anatomical line art
  - Bright red dot marking the exact pressure point
  - Numbered step indicators (1, 2, 3) showing massage motion
  - No garbled text — prompts strictly avoid AI-generated fonts/words
- All 3 images pre-generated before the session starts (with spinner feedback)
- Voice guidance plays over the full session while images cycle every ~35 seconds

### 3. Chakra Awareness & Tuning 🎵
- 7 dedicated buttons, one per chakra (Root → Crown)
- Each button is designed to accompany a chakra-tuned music track already playing
- AI-generated ~1-minute awareness script including:
  - Guided body focus to the chakra's location
  - Color visualization meditation
  - Breathing into the energy center
  - Theme affirmation (safety, creativity, love, truth, etc.)
- Voice layers naturally over the existing music
- Never mentions frequency or Hz — refers only to "healing tones"

### 4. Intelligent Session Management 🔄
- Any button press instantly cancels the currently running session
- All buttons remain visible and interactive at all times
- sessionCancelled flag checked after every async call to prevent stale callbacks
- Clean fallback scripts for every session type if API calls fail

---

## 🏗️ Architecture

BreathingPracticeAssistant (@component)

Session Handlers:
- handleBreathingPressed() → script → voice → text phases → pose image
- handleAcupressurePressed() → preload images → script → voice → image cycle
- handleChakraPressed(index) → script → voice → text overlay

Shared Services:
- doVoiceGuidance(script) → OpenAI TTS → AudioComponent
- generateTexture(prompt) → DALL·E 3 → b64_json → Base64.decodeTextureAsync
- cancelActiveSession() → stop audio, hide image, reset flags

Data Catalogues:
- acupressurePoints[] → 5 points with name, location, instruction, imagePrompt
- chakras[] → 7 chakras with name, color, location, element, theme, awareness
- breathingImagePrompts[] → 2 pose diagram prompts

Inputs:
- textDisplay: Text
- image: Image
- spinner: SceneObject
- breathingButton: SceneObject
- acupressureButton: SceneObject
- 7× chakraButton: SceneObject

---

## 🔧 Tech Stack

- Platform: Snap Spectacles (2024) / Snap OS
- IDE: Lens Studio
- Language: TypeScript
- AI Chat: OpenAI gpt-4.1-nano via Remote Service Gateway
- AI Voice: OpenAI gpt-4o-mini-tts (voice: coral)
- AI Images: OpenAI DALL·E 3 (1024x1024, b64_json)
- Interaction: Spectacles Interaction Kit (Interactable)
- Gestures: GestureModule (pinch) + TapEvent (editor)

---

## 📦 Setup

### Prerequisites
- Latest Lens Studio with Spectacles support
- Spectacles Developer Program access
- Remote Service Gateway installed with OpenAI API key configured

### Installation
1. Clone or download the project into Lens Studio
2. Ensure these packages are installed:
   - SpectaclesInteractionKit.lspkg
   - RemoteServiceGatewayExamples.lspkg
3. Create and assign:
   - Text → textDisplay
   - Image → image
   - SceneObject → spinner
   - 2 SceneObject buttons → breathingButton, acupressureButton
   - 7 SceneObject buttons → chakra buttons
4. Attach BreathingPracticeAssistant script
5. Wire inputs in Inspector
6. Push to Spectacles and test

---

## 🧠 Acupressure Points

- He Gu (LI4) — Web between thumb & index finger
- Nei Guan (PC6) — Inner wrist
- Yin Tang — Between eyebrows
- Jian Jing (GB21) — Top of shoulder
- Shen Men (HT7) — Wrist crease

---

## 🌈 Chakras

1. Root — Safety, grounding  
2. Sacral — Creativity, flow  
3. Solar Plexus — Confidence  
4. Heart — Love, compassion  
5. Throat — Expression  
6. Third Eye — Intuition  
7. Crown — Unity  

---

## ⚠️ Considerations

- DALL·E generation ~5–10 seconds per image
- Spectacles battery ~45 minutes
- First TTS playback may have small latency
- Chakra buttons trigger voice only (music handled separately)

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

- Snap Inc.
- OpenAI
- Snap AR Community
