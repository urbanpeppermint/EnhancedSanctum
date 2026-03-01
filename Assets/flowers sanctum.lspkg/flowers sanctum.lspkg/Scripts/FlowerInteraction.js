// FlowerInteraction.js — Idle blend shapes + SIK trigger interaction for flowers
// Attach to a SceneObject that has: RenderMeshVisual, Collider, Interactable, AudioComponent
//
//@input Asset.AudioTrackAsset audioTrack {"label":"Audio Track"}
//@input float idleSpeed = 1.2 {"widget":"slider", "min":0.5, "max":4.0, "step":0.1, "label":"Idle Speed"}
//@input float triggerSpeed = 2.0 {"widget":"slider", "min":0.5, "max":5.0, "step":0.1, "label":"Trigger Speed"}
//@input float triggerDuration = 1.2 {"widget":"slider", "min":0.3, "max":3.0, "step":0.1, "label":"Trigger Duration (s)"}

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
var currentMode = 0; // 0=PetalOpen, 1=PetalWiggle, 2=PetalCurl

// Shape key names for flowers
var SHAPE_OPEN = "PetalOpen";
var SHAPE_WIGGLE = "PetalWiggle";
var SHAPE_CURL = "PetalCurl";

var hasOpen = false;
var hasWiggle = false;
var hasCurl = false;

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
        try { mesh.setBlendShapeWeight(SHAPE_OPEN, 0); hasOpen = true; } catch (e) { hasOpen = false; }
        try { mesh.setBlendShapeWeight(SHAPE_WIGGLE, 0); hasWiggle = true; } catch (e) { hasWiggle = false; }
        try { mesh.setBlendShapeWeight(SHAPE_CURL, 0); hasCurl = true; } catch (e) { hasCurl = false; }
    }

    print("[FLOWER] mesh:" + (mesh ? "OK" : "MISSING") +
          " open:" + hasOpen + " wiggle:" + hasWiggle + " curl:" + hasCurl +
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
            print("[FLOWER] Interactable: OK");
        } else {
            print("[FLOWER] WARNING: No Interactable found. Add Interactable + Collider components.");
        }
    } catch (e) {
        print("[FLOWER] Interactable setup error: " + e);
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
        // === TRIGGERED ANIMATION: ping-pong with random mode ===
        pingPong += dt * script.triggerSpeed * 2;
        if (pingPong > 1) pingPong = 2 - pingPong;
        if (pingPong < -1) pingPong = -2 - pingPong;

        var intensity = Math.abs(pingPong);

        if (currentMode === 0) {
            if (hasOpen) try { mesh.setBlendShapeWeight(SHAPE_OPEN, intensity); } catch (e) {}
            if (hasWiggle) try { mesh.setBlendShapeWeight(SHAPE_WIGGLE, intensity * 0.4); } catch (e) {}
            if (hasCurl) try { mesh.setBlendShapeWeight(SHAPE_CURL, 0); } catch (e) {}
        } else if (currentMode === 1) {
            if (hasWiggle) try { mesh.setBlendShapeWeight(SHAPE_WIGGLE, intensity); } catch (e) {}
            if (hasOpen) try { mesh.setBlendShapeWeight(SHAPE_OPEN, intensity * 0.3); } catch (e) {}
            if (hasCurl) try { mesh.setBlendShapeWeight(SHAPE_CURL, 0); } catch (e) {}
        } else {
            if (hasCurl) try { mesh.setBlendShapeWeight(SHAPE_CURL, intensity); } catch (e) {}
            if (hasWiggle) try { mesh.setBlendShapeWeight(SHAPE_WIGGLE, intensity * 0.5); } catch (e) {}
            if (hasOpen) try { mesh.setBlendShapeWeight(SHAPE_OPEN, 0); } catch (e) {}
        }
    } else {
        // === IDLE ANIMATION: gentle breathing ===
        pingPong *= 0.92;

        var idleOpen = (Math.sin(t * script.idleSpeed + offset) * 0.5 + 0.5) * 0.12;
        var idleWiggle = (Math.sin(t * script.idleSpeed * 1.3 + offset + 0.8) * 0.5 + 0.5) * 0.08;
        var idleCurl = (Math.sin(t * script.idleSpeed * 0.8 + offset + 2.0) * 0.5 + 0.5) * 0.06;

        var residual = Math.abs(pingPong);
        var blendFactor = Math.max(residual, 0);

        var finalOpen = idleOpen * (1 - blendFactor) + residual * blendFactor;
        var finalWiggle = idleWiggle * (1 - blendFactor) + residual * 0.4 * blendFactor;
        var finalCurl = idleCurl * (1 - blendFactor) + residual * 0.5 * blendFactor;

        if (hasOpen) try { mesh.setBlendShapeWeight(SHAPE_OPEN, finalOpen); } catch (e) {}
        if (hasWiggle) try { mesh.setBlendShapeWeight(SHAPE_WIGGLE, finalWiggle); } catch (e) {}
        if (hasCurl) try { mesh.setBlendShapeWeight(SHAPE_CURL, finalCurl); } catch (e) {}
    }
});

function onTriggerStart() {
    print("[FLOWER] Triggered!");
    isTriggered = true;
    triggerTimer = script.triggerDuration;
    pingPong = 0;
    currentMode = Math.floor(Math.random() * 3);
    playSound();
}

function playSound() {
    if (!audio || !script.audioTrack) return;
    audio.audioTrack = script.audioTrack;
    audio.play(1);
    print("[FLOWER] Playing audio");
}