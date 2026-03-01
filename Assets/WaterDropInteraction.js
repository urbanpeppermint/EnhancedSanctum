// WaterDropInteraction.js — Baked Animation trigger-only (no idle)
// Plays AnimationPlayer ONLY when Interactable is triggered
//
// INSPECTOR SETUP:
//   1. AnimationPlayer → keep "Play Automatically" ON (script disables component on load)
//   2. AnimationPlayer → set Playback to "Once" (not looping)
//   3. Interactable (SIK) on this SceneObject
//   4. AudioComponent (optional) on this object or child
//   5. Set "Anim Duration" below to match your clip length
//
//@input float cooldown = 1.0 {"widget":"slider", "min":0.3, "max":5.0, "step":0.1, "label":"Cooldown (s)"}
//@input float animDuration = 1.0 {"widget":"slider", "min":0.1, "max":10.0, "step":0.1, "label":"Anim Duration (s)"}

// ── SIK ──
var SIK = require("SpectaclesInteractionKit.lspkg/SIK").SIK;
var interactionConfiguration = SIK.InteractionConfiguration;
var interactionManager = SIK.InteractionManager;

var animComp = null;
var audioComp = null;
var lastTriggerTime = -999;
var triggerCount = 0;
var sceneTime = 0;
var animTimer = -1;
var pendingEnable = false;
var STARTUP_DELAY = 1.5;

// ── Boot ──
function onAwake() {
    script.createEvent("OnStartEvent").bind(onStart);
}

function onStart() {
    var obj = script.sceneObject;

    // Find AnimationPlayer (self → children → grandchildren)
    animComp = findDeep(obj, "Component.AnimationPlayer");

    // Fallback: try AnimationMixer in case the inspector labels differ
    if (!animComp) {
        animComp = findDeep(obj, "Component.AnimationMixer");
        if (animComp) print("[DROP] Found AnimationMixer instead of AnimationPlayer");
    }

    audioComp = findDeep(obj, "Component.AudioComponent");

    // ── Disable animation immediately so it does NOT play on load ──
    if (animComp) {
        animComp.enabled = false;
        print("[DROP] Animation component found and disabled — waiting for trigger");
    } else {
        print("[DROP] ERROR: No AnimationPlayer found on '" + obj.name + "' or its children!");
    }

    print("[DROP] audio:" + (audioComp ? "OK" : "NONE") +
          " audioTrack:" + (audioComp && audioComp.audioTrack ? "OK" : "NONE"));

    setupInteractable();
    script.createEvent("UpdateEvent").bind(onUpdate);
}

// ── Recursive component search (self → children → grandchildren) ──
function findDeep(obj, type) {
    var c = obj.getComponent(type);
    if (c) return c;
    for (var i = 0; i < obj.getChildrenCount(); i++) {
        var child = obj.getChild(i);
        c = child.getComponent(type);
        if (c) return c;
        for (var j = 0; j < child.getChildrenCount(); j++) {
            c = child.getChild(j).getComponent(type);
            if (c) return c;
        }
    }
    return null;
}

// ── SIK Interactable setup ──
function setupInteractable() {
    try {
        var t = interactionConfiguration.requireType("Interactable");
        var interactable = script.sceneObject.getComponent(t);

        if (!interactable) {
            interactable = interactionManager.getInteractableBySceneObject(script.sceneObject);
        }

        if (interactable) {
            disableFeedback("InteractableOutlineFeedback");
            disableFeedback("InteractableSquishFeedback");
            disableFeedback("InteractableColorFeedback");

            interactable.onInteractorTriggerStart(function () {
                onTriggerStart();
            });

            print("[DROP] Interactable: OK — ready for trigger");
        } else {
            print("[DROP] WARNING: No Interactable component found on '" +
                  script.sceneObject.name + "'");
        }
    } catch (e) {
        print("[DROP] Interactable setup error: " + e);
    }
}

function disableFeedback(name) {
    try {
        var fb = script.sceneObject.getComponent(
            interactionConfiguration.requireType(name)
        );
        if (fb) fb.enabled = false;
    } catch (e) { /* not present — fine */ }
}

// ── UPDATE ──
function onUpdate() {
    var dt = getDeltaTime();
    sceneTime += dt;

    // One-frame-delayed enable → guarantees clean restart
    if (pendingEnable) {
        pendingEnable = false;
        if (animComp) {
            animComp.enabled = true;

            // Also try explicit play calls for extra reliability
            tryPlay();

            animTimer = script.animDuration;
            print("[DROP] ▶ Animation playing (" + script.animDuration.toFixed(1) + "s)");
        }
    }

    // Auto-disable after animation finishes
    if (animTimer > 0) {
        animTimer -= dt;
        if (animTimer <= 0) {
            if (animComp) animComp.enabled = false;
            print("[DROP] Animation finished — disabled until next trigger");
        }
    }
}

// ── Try explicit play methods (covers AnimationPlayer & AnimationMixer APIs) ──
function tryPlay() {
    // AnimationPlayer style
    try { animComp.play(0, 1); return; } catch (e) {}
    try { animComp.play(1, 0); return; } catch (e) {}
    try { animComp.play();     return; } catch (e) {}

    // AnimationMixer style
    try { animComp.start("BaseLayer", 0, 1); return; } catch (e) {}
    try { animComp.start("",          0, 1); return; } catch (e) {}

    // If nothing worked, the enabled-toggle auto-play is our fallback
}

// ── TRIGGER CALLBACK ──
function onTriggerStart() {
    var now = getTime();

    if (sceneTime < STARTUP_DELAY) {
        print("[DROP] Ignored — startup");
        return;
    }
    if (now - lastTriggerTime < script.cooldown) {
        print("[DROP] Ignored — cooldown");
        return;
    }
    if (pendingEnable || animTimer > 0) {
        print("[DROP] Ignored — still playing");
        return;
    }

    lastTriggerTime = now;
    triggerCount++;
    print("[DROP] Triggered! (#" + triggerCount + ")");

    // Disable now → re-enable next frame (clean restart)
    if (animComp) {
        animComp.enabled = false;
        pendingEnable = true;
    }

    // Audio
    if (audioComp && audioComp.audioTrack) {
        audioComp.play(1);
        print("[DROP] ♪ Sound playing");
    }
}

// ── GO ──
onAwake();