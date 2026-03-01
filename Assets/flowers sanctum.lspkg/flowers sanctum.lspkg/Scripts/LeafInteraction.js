// LeafInteraction.js — Idle blend shapes + SIK trigger interaction for leaves
// Attach to a SceneObject that has: RenderMeshVisual, Collider, Interactable, AudioComponent
//
//@input Asset.AudioTrackAsset audioTrack {"label":"Audio Track"}
//@input float idleSpeed = 1.5 {"widget":"slider", "min":0.5, "max":4.0, "step":0.1, "label":"Idle Speed"}
//@input float triggerSpeed = 2.0 {"widget":"slider", "min":0.5, "max":5.0, "step":0.1, "label":"Trigger Speed"}
//@input float triggerDuration = 1.0 {"widget":"slider", "min":0.3, "max":3.0, "step":0.1, "label":"Trigger Duration (s)"}

var SIK = require("SpectaclesInteractionKit.lspkg/SIK").SIK;
var interactionConfiguration = SIK.InteractionConfiguration;
var interactionManager = SIK.InteractionManager;

var mesh = null;
var audio = null;
var interactable = null;

var t = 0;
var offset = Math.random() * 6.28;

// Trigger state
var isTriggered = false;
var triggerTimer = 0;
var pingPong = 0;

// Shape key names for leaves
var SHAPE_BEND = "LeafBend";
var SHAPE_WAVE = "LeafWave";

var hasBend = false;
var hasWave = false;

script.createEvent("OnStartEvent").bind(function () {
    // --- Find mesh ---
    mesh = script.getSceneObject().getComponent("Component.RenderMeshVisual");
    if (!mesh) {
        var count = script.getSceneObject().getChildrenCount();
        for (var i = 0; i < count; i++) {
            mesh = script.getSceneObject().getChild(i).getComponent("Component.RenderMeshVisual");
            if (mesh) break;
        }
    }

    // --- Find audio ---
    audio = script.getSceneObject().getComponent("Component.AudioComponent");

    // --- Check which shape keys exist ---
    if (mesh) {
        try { mesh.setBlendShapeWeight(SHAPE_BEND, 0); hasBend = true; } catch (e) { hasBend = false; }
        try { mesh.setBlendShapeWeight(SHAPE_WAVE, 0); hasWave = true; } catch (e) { hasWave = false; }
    }

    print("[LEAF] mesh:" + (mesh ? "OK" : "MISSING") +
          " bend:" + hasBend + " wave:" + hasWave +
          " audio:" + (audio ? "OK" : "MISSING"));

    // --- Set up SIK Interactable ---
    try {
        var interactableTypename = interactionConfiguration.requireType("Interactable");
        interactable = script.getSceneObject().getComponent(interactableTypename);

        if (!interactable) {
            interactable = interactionManager.getInteractableBySceneObject(script.getSceneObject());
        }

        if (interactable) {
            interactable.onInteractorTriggerStart(function (event) {
                onTriggerStart();
            });
            print("[LEAF] Interactable: OK");
        } else {
            print("[LEAF] WARNING: No Interactable found. Add Interactable + Collider components.");
        }
    } catch (e) {
        print("[LEAF] Interactable setup error: " + e);
    }
});

script.createEvent("UpdateEvent").bind(function () {
    if (!mesh) return;

    var dt = getDeltaTime();
    t += dt;

    // --- Handle trigger timer ---
    if (isTriggered) {
        triggerTimer -= dt;
        if (triggerTimer <= 0) {
            isTriggered = false;
        }
    }

    if (isTriggered) {
        // === TRIGGERED ANIMATION: ping-pong ===
        pingPong += dt * script.triggerSpeed * 2;
        if (pingPong > 1) pingPong = 2 - pingPong;
        if (pingPong < -1) pingPong = -2 - pingPong;

        var intensity = Math.abs(pingPong);

        if (hasBend) try { mesh.setBlendShapeWeight(SHAPE_BEND, intensity); } catch (e) {}
        if (hasWave) try { mesh.setBlendShapeWeight(SHAPE_WAVE, intensity * 0.6); } catch (e) {}
    } else {
        // === IDLE ANIMATION: gentle sine wave ===
        // Smoothly return ping-pong toward 0
        pingPong *= 0.92;

        var idleBend = (Math.sin(t * script.idleSpeed + offset) * 0.5 + 0.5) * 0.15;
        var idleWave = (Math.sin(t * script.idleSpeed * 1.4 + offset + 1.0) * 0.5 + 0.5) * 0.1;

        // Blend between residual ping-pong and idle
        var residual = Math.abs(pingPong);
        var blendFactor = Math.max(residual, 0);

        var finalBend = idleBend * (1 - blendFactor) + residual * blendFactor;
        var finalWave = idleWave * (1 - blendFactor) + residual * 0.6 * blendFactor;

        if (hasBend) try { mesh.setBlendShapeWeight(SHAPE_BEND, finalBend); } catch (e) {}
        if (hasWave) try { mesh.setBlendShapeWeight(SHAPE_WAVE, finalWave); } catch (e) {}
    }
});

function onTriggerStart() {
    print("[LEAF] Triggered!");
    isTriggered = true;
    triggerTimer = script.triggerDuration;
    pingPong = 0;
    playSound();
}

function playSound() {
    if (!audio || !script.audioTrack) return;
    audio.audioTrack = script.audioTrack;
    audio.play(1);
    print("[LEAF] Playing audio");
}