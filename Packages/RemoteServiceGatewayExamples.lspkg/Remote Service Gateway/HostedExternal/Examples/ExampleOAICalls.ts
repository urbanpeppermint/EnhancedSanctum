import { OpenAI } from "../OpenAI";
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";

@component
export class BreathingPracticeAssistant extends BaseScriptComponent {
  // ─── Text & Feedback ──────────────────────────────────
  @ui.separator
  @ui.group_start("Display")
  @input textDisplay: Text;
  @input private image: Image;
  @input private spinner: SceneObject;
  @ui.group_end

  // ─── Voice Settings ───────────────────────────────────
  @ui.separator
  @ui.group_start("Voice Settings")
  @input
  @widget(new TextAreaWidget())
  private voiceInstructions: string =
    "Wise zen master or therapist tone. Calm, grounding, deeply peaceful voice. Speak slowly with intentional pauses between phrases.";
  @ui.group_end

  // ─── Session Buttons ──────────────────────────────────
  @ui.separator
  @ui.group_start("Session Buttons")
  @input private breathingButton: SceneObject;
  @input private acupressureButton: SceneObject;
  @input
  @label("Run On Tap")
  private startPracticeOnTap: boolean = false;
  @ui.group_end

  // ─── Chakra Buttons ───────────────────────────────────
  @ui.separator
  @ui.group_start("Chakra Buttons")
  @input private rootChakraButton: SceneObject;
  @input private sacralChakraButton: SceneObject;
  @input private solarPlexusChakraButton: SceneObject;
  @input private heartChakraButton: SceneObject;
  @input private throatChakraButton: SceneObject;
  @input private thirdEyeChakraButton: SceneObject;
  @input private crownChakraButton: SceneObject;
  @ui.group_end

  // ─── Private Members ─────────────────────────────────
  private gestureModule: GestureModule = require("LensStudio:GestureModule");

  private isBreathingActive: boolean = false;
  private isAcupressureActive: boolean = false;
  private isChakraActive: boolean = false;
  private sessionCancelled: boolean = false;
  private currentAudioComponent: AudioComponent | null = null;

  private _currentSessionPoints: AcupressurePoint[] = [];
  private _preloadedTextures: Texture[] = [];

  // ─── Breathing Phases ─────────────────────────────────
  private breathingPhases = [
    { phase: "preparation", duration: 3, text: "Find a comfortable position. Let your body relax." },
    { phase: "inhale", duration: 4, text: "Breathe in slowly through your nose… 1… 2… 3… 4" },
    { phase: "hold", duration: 4, text: "Hold gently… 1… 2… 3… 4" },
    { phase: "exhale", duration: 6, text: "Breathe out slowly through your mouth… 1… 2… 3… 4… 5… 6" },
    { phase: "pause", duration: 2, text: "Notice the stillness…" },
  ];
  private totalCycles = 3;

  // ─── Acupressure Point Catalogue ──────────────────────
  private acupressurePoints: AcupressurePoint[] = [
    {
      name: "He Gu (LI4)",
      location: "In the web between your thumb and index finger",
      instruction:
        "Using the thumb and index finger of your opposite hand, firmly pinch the fleshy area between the thumb and index finger. Apply steady pressure in a circular motion for 30 seconds. Relieves stress, headaches, and tension.",
      imagePrompt:
        "Professional minimalist medical illustration on solid black background. White clean line drawing of a human hand, palm facing upward, detailed anatomy. A single bright glowing red circle marks the pressure point in the fleshy web between the thumb and index finger. Three small white circles containing the numerals 1, 2, 3 placed along thin white curved arrows showing a circular massage motion around the red point. High contrast, clean precise anatomical line art, elegant, no words, no labels, no text except the numerals 1 2 3 inside the circles.",
    },
    {
      name: "Nei Guan (PC6)",
      location: "Inner wrist, two finger-widths below the wrist crease",
      instruction:
        "Turn your palm up. Place three fingers across your wrist from the crease. The point is below your index finger between the two tendons. Press firmly with your thumb for 30 seconds while breathing deeply. Calms anxiety.",
      imagePrompt:
        "Professional minimalist medical illustration on solid black background. White clean line drawing of a human forearm and wrist, inner side facing up, detailed anatomy showing tendons. A single bright glowing red circle marks the pressure point on the inner wrist two finger-widths below the wrist crease between two tendons. A white arrow from three fingers placed across the wrist shows the measuring position. Three small white circles containing numerals 1, 2, 3 along thin white arrows showing pressing motion. High contrast, clean precise anatomical line art, elegant, no words, no labels, no text except the numerals 1 2 3.",
    },
    {
      name: "Yin Tang (Third Eye)",
      location: "Between the eyebrows, centre of the forehead",
      instruction:
        "Using your index finger, apply gentle but firm pressure directly between your eyebrows. Press in small circles for 30 seconds. Breathe slowly. Calms the mind and relieves anxiety.",
      imagePrompt:
        "Professional minimalist medical illustration on solid black background. White clean line drawing of a human face, front view, serene expression, detailed anatomy. A single bright glowing red circle marks the pressure point centered between the eyebrows on the forehead. A white drawn index finger approaches the point. Three small white circles containing numerals 1, 2, 3 along thin white curved arrows showing small circular pressing motion. High contrast, clean precise anatomical line art, elegant, no words, no labels, no text except the numerals 1 2 3.",
    },
    {
      name: "Jian Jing (GB21)",
      location: "Highest point of the shoulder muscle, midway between neck and shoulder edge",
      instruction:
        "Reach across with your opposite hand and find the midpoint of your shoulder muscle. Press down firmly with your fingers. Hold steady pressure for 30 seconds. Releases shoulder tension and stress.",
      imagePrompt:
        "Professional minimalist medical illustration on solid black background. White clean line drawing of a human upper body from behind, showing neck and both shoulders, detailed anatomy of trapezius muscle. A single bright glowing red circle marks the pressure point on top of the right shoulder muscle midway between neck and shoulder edge. A white drawn opposite hand reaches across to press the point. Three small white circles containing numerals 1, 2, 3 along thin white arrows showing downward pressing motion. High contrast, clean precise anatomical line art, elegant, no words, no labels, no text except the numerals 1 2 3.",
    },
    {
      name: "Shen Men (HT7)",
      location: "On the wrist crease, pinky side, in the small hollow",
      instruction:
        "Turn your palm up, find the wrist crease on the pinky side. Feel for a small dip next to the tendon. Apply gentle pressure with your opposite thumb for 30 seconds. The Spirit Gate, deeply calming for emotional stress.",
      imagePrompt:
        "Professional minimalist medical illustration on solid black background. White clean line drawing of a human hand and wrist, palm facing up, detailed anatomy showing wrist crease and tendons. A single bright glowing red circle marks the pressure point on the wrist crease on the pinky finger side in a small hollow beside the tendon. A white drawn opposite thumb presses the point. Three small white circles containing numerals 1, 2, 3 along thin white arrows showing gentle pressing motion. High contrast, clean precise anatomical line art, elegant, no words, no labels, no text except the numerals 1 2 3.",
    },
  ];

  // ─── Breathing Pose Prompts ───────────────────────────
  private breathingImagePrompts: string[] = [
    "Professional minimalist medical illustration on solid black background. White clean line drawing of a person sitting cross-legged in calm meditation posture, front view, detailed anatomy. Lungs shown with subtle expanding motion lines inside the chest. A bright blue arrow flowing into the nose showing inhalation. A bright red arrow flowing out from the mouth showing exhalation. Three small white circles containing numerals 1, 2, 3 placed at the nose, chest, and mouth marking the breathing sequence steps. High contrast, clean precise anatomical line art, elegant, no words, no labels, no text except the numerals 1 2 3.",
    "Professional minimalist medical illustration on solid black background. White clean line drawing of a person seated upright in a chair with hands resting on knees, side view, detailed anatomy. Diaphragm shown with subtle downward motion during breathing. A bright blue arrow entering the nose for inhalation. A bright red arrow leaving the mouth for exhalation. Three small white circles containing numerals 1, 2, 3 placed at nose for inhale, chest for hold, mouth for exhale. High contrast, clean precise anatomical line art, elegant, no words, no labels, no text except the numerals 1 2 3.",
  ];

  // ─── Chakra Catalogue ─────────────────────────────────
  private chakras: ChakraData[] = [
    {
      name: "Root",
      sanskritName: "Muladhara",
      color: "deep red",
      location: "the very base of your spine",
      element: "Earth",
      theme: "safety, grounding, and stability",
      awareness: "Feel the weight of your body connecting to the ground beneath you. Visualize a warm, glowing sphere of deep red light at the base of your spine. With each breath, this light grows stronger, anchoring you firmly to the earth. You are safe. You are supported. You belong here.",
    },
    {
      name: "Sacral",
      sanskritName: "Svadhisthana",
      color: "warm orange",
      location: "just below your navel, in your lower abdomen",
      element: "Water",
      theme: "creativity, pleasure, and emotional flow",
      awareness: "Bring your attention to the space just below your navel. Visualize a warm, glowing sphere of vibrant orange light gently swirling like water. Allow your emotions to flow freely without judgment. Feel your creative energy awakening. You are allowed to feel. You are allowed to create.",
    },
    {
      name: "Solar Plexus",
      sanskritName: "Manipura",
      color: "bright golden yellow",
      location: "your upper abdomen, around your stomach area",
      element: "Fire",
      theme: "confidence, personal power, and self-worth",
      awareness: "Focus on the area around your stomach. Visualize a radiant sphere of bright golden yellow light, warm like the sun. Feel its warmth spreading through your core, filling you with quiet confidence and inner strength. You are powerful. You are worthy. You trust yourself completely.",
    },
    {
      name: "Heart",
      sanskritName: "Anahata",
      color: "emerald green",
      location: "the center of your chest",
      element: "Air",
      theme: "love, compassion, and connection",
      awareness: "Bring your awareness to the center of your chest. Visualize a beautiful sphere of emerald green light expanding with each breath. Feel it radiating warmth and compassion, first toward yourself, then outward to everyone around you. You are loved. You are love itself. Your heart is open and free.",
    },
    {
      name: "Throat",
      sanskritName: "Vishuddha",
      color: "clear sky blue",
      location: "your throat",
      element: "Ether",
      theme: "truth, expression, and communication",
      awareness: "Focus your attention on your throat. Visualize a clear, luminous sphere of sky blue light gently pulsing with each breath. Feel any tension in your jaw and neck softening. Your truth is worthy of expression. Your voice matters. Speak with kindness and clarity. You communicate with ease.",
    },
    {
      name: "Third Eye",
      sanskritName: "Ajna",
      color: "deep indigo",
      location: "the space between your eyebrows",
      element: "Light",
      theme: "intuition, insight, and inner wisdom",
      awareness: "Bring your focus to the space between your eyebrows. Visualize a deep indigo sphere of light glowing softly. Feel your mind becoming still and clear like a calm lake. Trust the wisdom that arises from within. Your intuition is a guide. You see clearly. You trust your inner knowing.",
    },
    {
      name: "Crown",
      sanskritName: "Sahasrara",
      color: "luminous violet and white",
      location: "the very top of your head",
      element: "Cosmic energy",
      theme: "spiritual connection, unity, and transcendence",
      awareness: "Bring your awareness to the very top of your head. Visualize a radiant sphere of violet and pure white light opening like a thousand-petaled lotus. Feel yourself connected to something vast and infinite. You are part of everything. You are whole. You are at peace with all that is.",
    },
  ];

  // ═════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ═════════════════════════════════════════════════════════

  onAwake() {
    // Clone material once
    if (this.image) {
      let imgMat = this.image.mainMaterial.clone();
      this.image.clearMaterials();
      this.image.mainMaterial = imgMat;
      this.image.sceneObject.enabled = false;
    }
    if (this.spinner) {
      this.spinner.enabled = false;
    }

    // Bind session buttons
    this.bindButton(this.breathingButton, () => this.handleBreathingPressed());
    this.bindButton(this.acupressureButton, () => this.handleAcupressurePressed());

    // Bind chakra buttons
    this.bindButton(this.rootChakraButton, () => this.handleChakraPressed(0));
    this.bindButton(this.sacralChakraButton, () => this.handleChakraPressed(1));
    this.bindButton(this.solarPlexusChakraButton, () => this.handleChakraPressed(2));
    this.bindButton(this.heartChakraButton, () => this.handleChakraPressed(3));
    this.bindButton(this.throatChakraButton, () => this.handleChakraPressed(4));
    this.bindButton(this.thirdEyeChakraButton, () => this.handleChakraPressed(5));
    this.bindButton(this.crownChakraButton, () => this.handleChakraPressed(6));

    // Gesture fallback
    if (global.deviceInfoSystem.isEditor()) {
      this.createEvent("TapEvent").bind(() => {
        if (this.startPracticeOnTap) this.handleBreathingPressed();
      });
    } else {
      this.gestureModule
        .getPinchDownEvent(GestureModule.HandType.Right)
        .add(() => {
          if (this.startPracticeOnTap) this.handleBreathingPressed();
        });
    }
  }

  private bindButton(buttonObj: SceneObject, callback: () => void) {
    if (!buttonObj) return;
    let interactable = buttonObj.getComponent(Interactable.getTypeName());
    if (!isNull(interactable)) {
      interactable.onTriggerEnd.add(callback);
    }
  }

  // ═════════════════════════════════════════════════════════
  //  SESSION CONTROL — never hides buttons, only stops commands
  // ═════════════════════════════════════════════════════════

  private cancelActiveSession() {
    this.sessionCancelled = true;
    this.isBreathingActive = false;
    this.isAcupressureActive = false;
    this.isChakraActive = false;
    this._preloadedTextures = [];

    if (this.currentAudioComponent) {
      try { this.currentAudioComponent.stop(true); } catch (_) {}
      this.currentAudioComponent = null;
    }

    if (this.image) this.image.sceneObject.enabled = false;
    if (this.spinner) this.spinner.enabled = false;

    print("Active session cancelled — all buttons remain active");
  }

  // ═════════════════════════════════════════════════════════
  //  IMAGE — b64_json, dall-e-3, preload into texture array
  // ═════════════════════════════════════════════════════════

  /**
   * Generates a single image and returns a Promise<Texture>.
   * Image sceneObject stays hidden — caller decides when to show.
   */
  private generateTexture(prompt: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      OpenAI.imagesGenerate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      })
        .then((response) => {
          if (this.sessionCancelled) {
            reject("Session cancelled");
            return;
          }
          let datum = response.data[0];
          if (datum.b64_json) {
            Base64.decodeTextureAsync(
              datum.b64_json,
              (texture) => {
                print("Texture decoded successfully");
                resolve(texture);
              },
              () => {
                reject("Failed to decode base64 texture");
              }
            );
          } else {
            reject("No b64_json in response");
          }
        })
        .catch((error) => {
          reject("Image generation error: " + error);
        });
    });
  }

  /** Apply a preloaded texture and show the image. */
  private showTexture(texture: Texture) {
    if (!this.image) return;
    this.image.mainMaterial.mainPass.baseTex = texture;
    this.image.sceneObject.enabled = true;
  }

  private hideImage() {
    if (this.image) this.image.sceneObject.enabled = false;
  }

  // ═════════════════════════════════════════════════════════
  //  VOICE GUIDANCE
  // ═════════════════════════════════════════════════════════

  private doVoiceGuidance(script: string) {
    OpenAI.speech({
      model: "gpt-4o-mini-tts",
      input: script,
      voice: "coral",
      instructions: this.voiceInstructions,
    })
      .then((response) => {
        if (this.sessionCancelled) return;
        print("Got speech response");
        let aud = this.sceneObject.createComponent("AudioComponent");
        aud.audioTrack = response;
        aud.play(1);
        this.currentAudioComponent = aud;
      })
      .catch((error) => {
        print("Voice error: " + error);
      });
  }

  // ═════════════════════════════════════════════════════════
  //  BREATHING SESSION
  // ═════════════════════════════════════════════════════════

  private handleBreathingPressed() {
    if (this.isBreathingActive) return;

    // Stop other commands, never hide buttons
    if (this.isAcupressureActive || this.isChakraActive) {
      this.cancelActiveSession();
    }

    this.sessionCancelled = false;
    this.isBreathingActive = true;

    this.textDisplay.sceneObject.enabled = true;
    this.textDisplay.text = "Preparing your breathing practice…";
    if (this.spinner) this.spinner.enabled = true;

    // 1 — Pre-generate the breathing pose image FIRST
    let prompt =
      this.breathingImagePrompts[
        Math.floor(Math.random() * this.breathingImagePrompts.length)
      ];

    this.generateTexture(prompt)
      .then((texture) => {
        if (this.sessionCancelled) return;
        this._preloadedTextures = [texture];
        print("Breathing image preloaded");
        if (this.spinner) this.spinner.enabled = false;

        // 2 — Now generate the voice script
        this.generateBreathingScriptAndStart();
      })
      .catch((error) => {
        print("Breathing image preload failed: " + error);
        if (this.spinner) this.spinner.enabled = false;
        if (this.sessionCancelled) return;

        // Continue without image
        this._preloadedTextures = [];
        this.generateBreathingScriptAndStart();
      });
  }

  private generateBreathingScriptAndStart() {
    OpenAI.chatCompletions({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: `You are a meditation guide creating a 1-minute breathing practice script.

Structure:
- Brief welcome (5 seconds)
- 3 breathing cycles: inhale 4s, hold 4s, exhale 6s
- Brief closing (5 seconds)

Use calming language with natural pauses indicated by three dots.
Include gentle counting. Total speaking around 50-55 seconds.`,
        },
        {
          role: "user",
          content:
            "Create a calming 1-minute guided breathing practice to reduce stress and lower heart rate.",
        },
      ],
      temperature: 0.7,
    })
      .then((response) => {
        if (this.sessionCancelled) return;

        let script = response.choices[0].message.content;
        if (!script || script.trim() === "") {
          script = this.getFallbackBreathingScript();
        }

        // Show the preloaded image
        if (this._preloadedTextures.length > 0) {
          this.showTexture(this._preloadedTextures[0]);
        }

        this.textDisplay.text = "Beginning your practice…";
        this.doVoiceGuidance(script);
        this.runBreathingSequence();
      })
      .catch((error) => {
        print("Breathing script error: " + error);
        if (this.sessionCancelled) return;

        if (this._preloadedTextures.length > 0) {
          this.showTexture(this._preloadedTextures[0]);
        }

        let script = this.getFallbackBreathingScript();
        this.doVoiceGuidance(script);
        this.runBreathingSequence();
      });
  }

  private getFallbackBreathingScript(): string {
    return `Welcome. Find a comfortable position and close your eyes if you wish.

Let's begin. Breathe in slowly through your nose... one... two... three... four.

Hold gently... one... two... three... four.

Now breathe out slowly through your mouth... one... two... three... four... five... six.

Again, breathe in... one... two... three... four.

Hold... one... two... three... four.

And release... one... two... three... four... five... six.

One more time. Breathe in deeply... one... two... three... four.

Hold this breath... one... two... three... four.

And let it all go... one... two... three... four... five... six.

Beautiful. Notice how calm your body feels. When you are ready, gently open your eyes.`;
  }

  private runBreathingSequence() {
    let cycleCount = 0;
    let phaseIndex = 0;

    const nextPhase = () => {
      if (this.sessionCancelled) return;

      if (cycleCount >= this.totalCycles) {
        this.textDisplay.text = "Practice complete. Notice how you feel.";
        this.isBreathingActive = false;
        this.delayedCallback(6, () => {
          if (!this.isAcupressureActive && !this.isChakraActive) this.hideImage();
        });
        return;
      }

      let phase = this.breathingPhases[phaseIndex];
      this.textDisplay.text = phase.text;

      phaseIndex++;
      if (phaseIndex >= this.breathingPhases.length) {
        phaseIndex = 1;
        cycleCount++;
      }
      this.delayedCallback(phase.duration, nextPhase);
    };

    nextPhase();
  }

  // ═════════════════════════════════════════════════════════
  //  ACUPRESSURE SESSION
  // ═════════════════════════════════════════════════════════

  private handleAcupressurePressed() {
    if (this.isAcupressureActive) return;

    if (this.isBreathingActive || this.isChakraActive) {
      this.cancelActiveSession();
    }

    this.sessionCancelled = false;
    this.isAcupressureActive = true;

    this.textDisplay.sceneObject.enabled = true;
    this.textDisplay.text = "Preparing Acupressure Session…";
    if (this.spinner) this.spinner.enabled = true;

    // Select 3 random points
    let selected = this.getRandomPoints(3);
    this._currentSessionPoints = selected;

    // Pre-generate ALL images before starting
    this.preloadAcupressureImages(selected, 0, []);
  }

  private preloadAcupressureImages(
    points: AcupressurePoint[],
    index: number,
    textures: Texture[]
  ) {
    if (this.sessionCancelled) return;

    if (index >= points.length) {
      // All images ready — start the session
      this._preloadedTextures = textures;
      if (this.spinner) this.spinner.enabled = false;
      print("All " + textures.length + " acupressure images preloaded");
      this.startAcupressureSession();
      return;
    }

    this.textDisplay.text =
      "Preparing point " + (index + 1) + " of " + points.length + "…";

    this.generateTexture(points[index].imagePrompt)
      .then((texture) => {
        if (this.sessionCancelled) return;
        textures.push(texture);
        print("Preloaded image " + (index + 1) + " of " + points.length);
        this.preloadAcupressureImages(points, index + 1, textures);
      })
      .catch((error) => {
        print("Failed to preload image " + (index + 1) + ": " + error);
        textures.push(null);
        this.preloadAcupressureImages(points, index + 1, textures);
      });
  }

  private startAcupressureSession() {
    let points = this._currentSessionPoints;

    let pointBlock = points
      .map(
        (p, i) =>
          `Point ${i + 1}: ${p.name}\n  Location: ${p.location}\n  Technique: ${p.instruction}`
      )
      .join("\n\n");

    OpenAI.chatCompletions({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: `You are a calming acupressure-therapy guide. Create a 2-minute guided session script.

Structure:
- Welcome and brief explanation of acupressure for stress relief (10 seconds)
- For EACH point (30-40 seconds each):
    - Name and location
    - Step-by-step pressure technique
    - Guided breathing while holding
    - Benefit
- Closing with encouragement (10 seconds)

Soothing language. Pauses with three dots. Speak as if guiding in real-time.

Points:
${pointBlock}`,
        },
        {
          role: "user",
          content:
            "Create a calming guided acupressure session for stress relief covering the specified points.",
        },
      ],
      temperature: 0.7,
    })
      .then((response) => {
        if (this.sessionCancelled) return;

        let script = response.choices[0].message.content;
        if (!script || script.trim() === "") {
          script = this.getFallbackAcupressureScript();
        }

        this.doVoiceGuidance(script);
        this.runAcupressureSequence(0);
      })
      .catch((error) => {
        print("Acupressure script error: " + error);
        if (this.sessionCancelled) return;

        let script = this.getFallbackAcupressureScript();
        this.doVoiceGuidance(script);
        this.runAcupressureSequence(0);
      });
  }

  private getFallbackAcupressureScript(): string {
    this._currentSessionPoints = this.acupressurePoints.slice(0, 3);
    return `Welcome to your stress-relief acupressure session. Take one deep breath in... and slowly let it out.

We will work through three powerful acupressure points to melt away tension.

First, He Gu, LI4. Find the fleshy web between your thumb and index finger. Pinch firmly with your other hand... Apply steady circles... Breathe deeply... one... two... three... and release.

Next, Nei Guan, PC6. Turn your palm up... two finger-widths below the wrist crease, between the tendons... Press firmly with your thumb... Hold and breathe... one... two... three... and release.

Finally, Yin Tang, the Third Eye. Bring your finger between your eyebrows... Press gently in small circles... Breathe slowly... one... two... three... and release.

Take one final deep breath in... and let it all go. You can return to these points anytime.`;
  }

  private getRandomPoints(count: number): AcupressurePoint[] {
    let shuffled = [...this.acupressurePoints].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  private runAcupressureSequence(index: number) {
    if (this.sessionCancelled) return;

    let points = this._currentSessionPoints;

    if (index >= points.length) {
      this.textDisplay.text =
        "Session complete. Notice how your body feels. You can repeat anytime.";
      this.isAcupressureActive = false;
      this.delayedCallback(6, () => {
        if (!this.isBreathingActive && !this.isChakraActive) this.hideImage();
      });
      return;
    }

    let point = points[index];

    // Show text
    this.textDisplay.text =
      "Point " + (index + 1) + " of " + points.length + ": " + point.name + "\n" +
      point.location + "\n\n" +
      point.instruction;

    // Show preloaded image if available
    if (this._preloadedTextures[index]) {
      this.showTexture(this._preloadedTextures[index]);
    } else {
      this.hideImage();
    }

    // Wait 35s then next point
    this.delayedCallback(35, () => {
      this.runAcupressureSequence(index + 1);
    });
  }

  // ═════════════════════════════════════════════════════════
  //  CHAKRA AWARENESS SESSION
  // ═════════════════════════════════════════════════════════

  private handleChakraPressed(chakraIndex: number) {
    // Stop any running session commands
    if (this.isBreathingActive || this.isAcupressureActive || this.isChakraActive) {
      this.cancelActiveSession();
    }

    this.sessionCancelled = false;
    this.isChakraActive = true;

    let chakra = this.chakras[chakraIndex];

    this.textDisplay.sceneObject.enabled = true;
    this.textDisplay.text =
      chakra.name + " Chakra (" + chakra.sanskritName + ")\n" +
      "Location: " + chakra.location + "\n" +
      "Color: " + chakra.color + "\n\n" +
      "Tune in to the music and bring awareness to this energy center…";

    // Hide any previous image — chakra is voice + music only
    this.hideImage();

    // Generate awareness guidance script
    OpenAI.chatCompletions({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: `You are a gentle, wise energy healing guide. Create a 1-minute chakra awareness and cleansing script.

The user is listening to music tuned to the ${chakra.name} Chakra (${chakra.sanskritName}).

Chakra details:
- Name: ${chakra.name} Chakra (${chakra.sanskritName})
- Color: ${chakra.color}
- Location: ${chakra.location}
- Element: ${chakra.element}
- Theme: ${chakra.theme}

Use this awareness foundation and expand it with your own wisdom:
${chakra.awareness}

Structure:
- Gently bring attention to the chakra location (10 seconds)
- Guide a color visualization at that point (15 seconds)
- Breathing into the chakra, feeling it cleanse and open (20 seconds)
- Affirm the theme and qualities of this chakra (10 seconds)
- Close with a brief integration moment (5 seconds)

Rules:
- Never mention frequency, hertz, or any numerical measurement
- Refer to the music as the healing tones or the sound already flowing
- Speak slowly with natural pauses indicated by three dots
- Keep the tone warm, nurturing, and deeply calming
- Total speaking time about 55-60 seconds`,
        },
        {
          role: "user",
          content:
            "Guide me through a cleansing and tuning of my " + chakra.name + " Chakra while I listen to the healing tones.",
        },
      ],
      temperature: 0.8,
    })
      .then((response) => {
        if (this.sessionCancelled) return;

        let script = response.choices[0].message.content;
        if (!script || script.trim() === "") {
          script = this.getFallbackChakraScript(chakraIndex);
        }

        this.textDisplay.text =
          chakra.name + " Chakra (" + chakra.sanskritName + ")\n\n" +
          "Visualize " + chakra.color + " light at " + chakra.location + "…\n\n" +
          "Theme: " + chakra.theme;

        this.doVoiceGuidance(script);

        // End chakra session after 65 seconds
        this.delayedCallback(65, () => {
          if (this.sessionCancelled) return;
          this.textDisplay.text =
            chakra.name + " Chakra balanced.\nCarry this awareness with you.";
          this.isChakraActive = false;
        });
      })
      .catch((error) => {
        print("Chakra script error: " + error);
        if (this.sessionCancelled) return;

        let script = this.getFallbackChakraScript(chakraIndex);
        this.doVoiceGuidance(script);

        this.delayedCallback(65, () => {
          if (this.sessionCancelled) return;
          this.isChakraActive = false;
        });
      });
  }

  private getFallbackChakraScript(index: number): string {
    let c = this.chakras[index];
    return `Gently close your eyes and bring your full attention to ${c.location}...

Allow the healing tones to wash over you as you focus on this sacred energy center...

Now visualize a beautiful sphere of ${c.color} light glowing softly at ${c.location}... With each breath, this light grows brighter... warmer... more alive...

Breathe in deeply... and direct that breath right into the center of this ${c.color} light... Feel it expanding... cleansing... releasing anything that no longer serves you...

Breathe out... and let go...

Again, breathe in... feeling the light of your ${c.name} Chakra growing stronger... connected to ${c.theme}...

And breathe out... releasing, surrendering, trusting...

${c.awareness}

Allow the music to carry this healing deeper... You are balanced... You are whole... Carry this awareness with you as you gently return.`;
  }

  // ═════════════════════════════════════════════════════════
  //  UTILITIES
  // ═════════════════════════════════════════════════════════

  private delayedCallback(delayTime: number, callback: () => void) {
    let evt = this.createEvent("DelayedCallbackEvent");
    evt.bind(callback);
    evt.reset(delayTime);
  }

  // ═════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═════════════════════════════════════════════════════════

  public triggerBreathingPractice() {
    this.handleBreathingPressed();
  }

  public triggerAcupressureSession() {
    this.handleAcupressurePressed();
  }

  public triggerChakra(index: number) {
    this.handleChakraPressed(index);
  }

  public resetPractice() {
    this.cancelActiveSession();
    this.sessionCancelled = false;
    this.textDisplay.text = "Ready to begin your wellness session";
  }
}

// ─── Helper Types ───────────────────────────────────────
interface AcupressurePoint {
  name: string;
  location: string;
  instruction: string;
  imagePrompt: string;
}

interface ChakraData {
  name: string;
  sanskritName: string;
  color: string;
  location: string;
  element: string;
  theme: string;
  awareness: string;
}