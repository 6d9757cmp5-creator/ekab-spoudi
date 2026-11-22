/* EKAB BETA — hardware-style, audio-only Push-to-Talk radio.
   Real voice requires a configured LiveKit SFU + token/floor server.
   Demo mode is explicitly local: no microphone and no network transmission. */
(() => {
  "use strict";

  const config = window.EKAB_RADIO_CONFIG || {};
  const roomName = typeof config.roomName === "string" && /^[a-zA-Z0-9_-]{8,100}$/.test(config.roomName)
    ? config.roomName : "EKABSpoudiRadio01";
  const livekitUrl = typeof config.livekitUrl === "string" ? config.livekitUrl : "";
  const tokenEndpoint = typeof config.tokenEndpoint === "string" ? config.tokenEndpoint : "";
  const floorEndpoint = typeof config.floorEndpoint === "string" ? config.floorEndpoint : "";
  const hasBackend = /^wss:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(livekitUrl) &&
    /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(tokenEndpoint) &&
    /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(floorEndpoint);

  const $ = (id) => document.getElementById(id);
  const launch = $("radioLaunch");
  const badge = $("radioBadge");
  const panel = $("radioPanel");
  const close = $("radioClose");
  const hardware = $("radioHardware");
  const displayMode = $("radioMode");
  const timer = $("radioTimer");
  const count = $("radioCount");
  const speaker = $("radioSpeaker");
  const status = $("radioStatus");
  const ptt = $("radioPtt");
  const join = $("radioJoin");
  const demo = $("radioDemo");
  const leave = $("radioLeave");
  const sounds = $("radioSounds");
  const copy = $("radioCopy");
  const external = $("radioExternal");
  const audioSink = $("radioAudioSink");

  const invitation = new URL(window.location.href);
  const openFromInvitation = invitation.searchParams.get("radio") === "1";
  invitation.searchParams.set("radio", "1");
  invitation.hash = "";
  const invitationUrl = invitation.toString();
  external.href = invitationUrl;

  let mode = "offline"; // offline | connecting | demo | online
  let room = null;
  let sessionToken = "";
  let desiredTx = false;
  let requestSequence = 0;
  let activeFloorId = null;
  let granted = false;
  let txStarted = 0;
  let timerInterval = null;
  let soundEnabled = true;
  let audioContext = null;
  let sdkPromise = null;
  let leaving = false;
  let launchPressTimer = null;
  let launchPressing = false;
  let launchLongPress = false;
  let suppressLaunchClick = false;
  const voxalConnected = () => window.EKAB_CHANNEL_HUB?.isConnected?.() === true;

  const updateStatus = (message, state = "idle") => {
    status.textContent = message;
    status.dataset.state = state;
  };
  const setVisualState = (next, label) => {
    hardware.dataset.radioState = next;
    displayMode.textContent = label;
    badge.textContent = next === "tx" ? "TX" : next === "rx" ? "RX" : next === "demo" ? "DEMO" : next === "online" ? "Συνδεδεμένος" : "Εκτός σύνδεσης";
    launch.classList.toggle("is-connected", next === "online" || next === "rx" || next === "tx");
  };
  const updateCount = () => {
    count.textContent = mode === "online" && room ? String(room.remoteParticipants.size + 1) : "—";
  };
  const showControls = () => {
    const active = mode === "online" || mode === "demo";
    ptt.disabled = !active;
    join.hidden = active;
    demo.hidden = active;
    leave.hidden = !active;
    leave.textContent = mode === "demo" ? "Τέλος δοκιμής" : "Αποχώρηση";
  };
  const setPanel = (open) => {
    if (!open) endTx();
    panel.hidden = !open;
    launch.setAttribute("aria-expanded", String(open));
    if (open) close.focus({ preventScroll: true });
    else launch.focus({ preventScroll: true });
  };
  // The launcher has two physical-radio gestures: tap to open, hold to talk.
  // Requiring a short hold avoids opening the microphone on ordinary taps.
  launch.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || (mode !== "online" && mode !== "demo" && !voxalConnected())) return;
    launchPressing = true;
    launchLongPress = false;
    try { launch.setPointerCapture(event.pointerId); } catch { /* Non-pointer browsers still have tap. */ }
    launchPressTimer = setTimeout(() => {
      if (!launchPressing) return;
      launchLongPress = true;
      launch.classList.add("is-holding");
      if (voxalConnected()) window.EKAB_CHANNEL_HUB.transmit(true);
      else beginTx(true);
    }, 260);
  });
  const releaseLauncher = () => {
    clearTimeout(launchPressTimer);
    launchPressTimer = null;
    if (launchLongPress) {
      suppressLaunchClick = true;
      if (voxalConnected()) window.EKAB_CHANNEL_HUB.transmit(false);
      endTx();
    }
    launchLongPress = false;
    launchPressing = false;
    launch.classList.remove("is-holding");
  };
  launch.addEventListener("pointerup", releaseLauncher);
  launch.addEventListener("pointercancel", releaseLauncher);
  launch.addEventListener("lostpointercapture", releaseLauncher);
  launch.addEventListener("click", (event) => {
    if (suppressLaunchClick) {
      suppressLaunchClick = false;
      event.preventDefault();
      return;
    }
    if (window.EKAB_CHANNEL_HUB?.show) {
      if (window.EKAB_CHANNEL_HUB.isOpen?.()) window.EKAB_CHANNEL_HUB.minimize?.();
      else window.EKAB_CHANNEL_HUB.show();
    }
    else setPanel(panel.hidden);
  });
  close.addEventListener("click", () => setPanel(false));
  if (openFromInvitation) window.addEventListener("load", () => {
    if (window.EKAB_CHANNEL_HUB?.show) window.EKAB_CHANNEL_HUB.show();
    else setPanel(true);
  });

  const playRadioTone = (transmitStart) => {
    if (!soundEnabled) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!audioContext) audioContext = new Context();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = transmitStart ? 930 : 690;
      const now = audioContext.currentTime;
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.024, now + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .095);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + .1);
    } catch { /* Optional feedback must never block transmitting. */ }
  };
  sounds.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    sounds.textContent = soundEnabled ? "Εφέ ON" : "Εφέ OFF";
    sounds.setAttribute("aria-pressed", String(soundEnabled));
    if (soundEnabled) playRadioTone(true);
  });
  sounds.textContent = "Εφέ ON";
  sounds.setAttribute("aria-pressed", "true");
  window.EKAB_RADIO_TONES = Object.freeze({
    beep: playRadioTone,
    toggle: () => sounds.click(),
    enabled: () => soundEnabled,
    syncVoxal: ({ connected, direction, speaker: voiceName, peers, channel }) => {
      if (mode !== "offline") return;
      ptt.disabled = !connected;
      join.hidden = connected;
      demo.hidden = connected;
      leave.hidden = true;
      hardware.dataset.radioState = connected ? direction || "online" : "offline";
      displayMode.textContent = !connected ? "OFFLINE" : direction === "tx" ? "TX · ΕΚΠΟΜΠΗ" : direction === "rx" ? "RX · ΛΗΨΗ" : "RX · ΑΝΑΜΟΝΗ";
      speaker.textContent = voiceName || "—";
      count.textContent = connected && Number.isInteger(peers) ? String(peers) : "—";
      ptt.classList.toggle("is-pressed", direction === "tx");
      ptt.setAttribute("aria-pressed", String(direction === "tx"));
      const channelIndex = ["voxal", "walkielazy", "walkie", "radio1", "private"].indexOf(channel);
      const screenLabel = hardware.querySelector(".radio-screen-top>span");
      if (screenLabel && channelIndex >= 0) screenLabel.textContent =
        "CH " + String(channelIndex + 1).padStart(2, "0") + " / ΣΠΟΥΔΑΣΤΕΣ";
      updateStatus(connected ? "Voxal P2P · " + (direction === "tx" ? "εκπέμπεις" : direction === "rx" ? "λήψη φωνής" : "έτοιμο για PTT") : "Εκτός σύνδεσης. Δεν εκπέμπεται ήχος.", connected ? "connected" : "idle");
    },
    openHardware: () => {
      window.EKAB_CHANNEL_HUB?.close?.();
      setPanel(true);
    }
  });
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      updateStatus("Αντιγράφηκε ο σύνδεσμος του καναλιού.", mode === "online" ? "connected" : "idle");
    } catch { updateStatus("Δεν επιτράπηκε η αντιγραφή. Χρησιμοποίησε το «Ξεχωριστό παράθυρο».", "error"); }
  });

  const stopTimer = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    txStarted = 0;
    timer.textContent = "00:00";
  };
  const showTransmit = () => {
    granted = true;
    ptt.classList.add("is-pressed");
    ptt.setAttribute("aria-pressed", "true");
    setVisualState("tx", mode === "demo" ? "TX · ΔΟΚΙΜΗ" : "TX · ΕΚΠΟΜΠΗ");
    updateStatus(mode === "demo" ? "Το PTT ανταποκρίνεται. Δεν μεταδίδεται φωνή." : "Εκπέμπεις ζωντανά όσο κρατάς πατημένο.", mode === "demo" ? "demo" : "connected");
    playRadioTone(true);
    stopTimer();
    txStarted = Date.now();
    timerInterval = setInterval(() => {
      const seconds = Math.floor((Date.now() - txStarted) / 1000);
      timer.textContent = String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
    }, 250);
  };
  const showReceiveReady = () => {
    if (mode === "demo") {
      setVisualState("demo", "STANDBY · ΔΟΚΙΜΗ");
      updateStatus("Δοκιμή χειρισμού · χωρίς μικρόφωνο ή μετάδοση.", "demo");
    } else if (mode === "online") {
      setVisualState("online", "RX · ΑΝΑΜΟΝΗ");
      updateStatus("Συνδεδεμένος στο κανάλι · κράτα πατημένο για εκπομπή.", "connected");
    } else setVisualState("offline", "OFFLINE");
  };
  const floorRequest = async (action, requestId) => {
    const response = await fetch(floorEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + sessionToken },
      body: JSON.stringify({ action, room: roomName, requestId }),
      cache: "no-store"
    });
    if (!response.ok) {
      if (response.status === 409) return { granted: false };
      throw new Error("floor " + response.status);
    }
    return response.json();
  };
  const releaseFloor = (id) => {
    if (!id || !sessionToken || !hasBackend) return;
    floorRequest("release", id).catch(() => {
      // Server-side floor leases must expire even when a client disconnects.
    });
  };
  const endTx = () => {
    const wasTx = granted;
    const wasRequested = desiredTx;
    desiredTx = false;
    requestSequence++;
    granted = false;
    ptt.classList.remove("is-pressed");
    ptt.setAttribute("aria-pressed", "false");
    stopTimer();
    if (mode === "online" && room) {
      // Mute immediately on release; never wait for the network round trip.
      room.localParticipant.setMicrophoneEnabled(false).catch(() => {});
      if (activeFloorId) releaseFloor(activeFloorId);
    }
    activeFloorId = null;
    if (wasTx) playRadioTone(false);
    if (wasTx || wasRequested) showReceiveReady();
  };
  const beginTx = async (fromLauncher = false) => {
    if (desiredTx || ptt.disabled || (panel.hidden && !fromLauncher)) return;
    if (mode !== "demo" && mode !== "online") return;
    desiredTx = true;
    const sequence = ++requestSequence;
    if (mode === "demo") { showTransmit(); return; }
    updateStatus("Έλεγχος ελεύθερου καναλιού…");
    const id = crypto.randomUUID();
    try {
      const floor = await floorRequest("acquire", id);
      const allowed = floor.granted === true || floor.floor === "granted";
      if (!allowed) {
        desiredTx = false;
        setVisualState("rx", "BUSY · RX");
        updateStatus("Κατειλημμένο κανάλι. Περίμενε να τελειώσει η εκπομπή.", "error");
        return;
      }
      // If released before the server replied, give up the floor immediately.
      if (!desiredTx || sequence !== requestSequence || mode !== "online") { releaseFloor(id); return; }
      activeFloorId = id;
      await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true });
      if (!desiredTx || sequence !== requestSequence || mode !== "online") {
        await room.localParticipant.setMicrophoneEnabled(false);
        releaseFloor(id);
        if (activeFloorId === id) activeFloorId = null;
        return;
      }
      showTransmit();
    } catch {
      if (activeFloorId === id) { releaseFloor(id); activeFloorId = null; }
      if (mode === "online") {
        desiredTx = false;
        setVisualState("rx", "ΣΦΑΛΜΑ PTT");
        updateStatus("Δεν δόθηκε δικαίωμα εκπομπής. Έλεγξε το δίκτυο/μικρόφωνο.", "error");
      }
    }
  };

  ptt.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || ptt.disabled) return;
    event.preventDefault();
    try { ptt.setPointerCapture(event.pointerId); } catch { /* Browser may not support capture. */ }
    if (voxalConnected()) window.EKAB_CHANNEL_HUB.transmit(true);
    else beginTx();
  });
  const releasePTT = () => {
    if (voxalConnected()) window.EKAB_CHANNEL_HUB.transmit(false);
    else endTx();
  };
  ptt.addEventListener("pointerup", releasePTT);
  ptt.addEventListener("pointercancel", releasePTT);
  ptt.addEventListener("lostpointercapture", releasePTT);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden && !$("dialog").open) setPanel(false);
    if (event.code !== "Space" || event.repeat) return;
    const target = event.target;
    if (voxalConnected()) {
      // The hub focuses its Minimize button on opening. Space must still act
      // as PTT there, while never stealing a space from the room's text chat.
      if (target instanceof HTMLElement && target.closest("input,textarea,select,[contenteditable]")) return;
      event.preventDefault();
      window.EKAB_CHANNEL_HUB.transmit(true);
      return;
    }
    if (panel.hidden && target !== launch) return;
    if (target instanceof HTMLElement && target !== ptt && target !== launch && target.closest("input,textarea,select,button,a,[contenteditable]")) return;
    if (mode !== "online" && mode !== "demo") return;
    event.preventDefault();
    beginTx(target === launch);
  });
  document.addEventListener("keyup", (event) => {
    if (event.code === "Space" && voxalConnected()) {
      if (!(event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable]"))) event.preventDefault();
      // Release even if focus moved into the chat while the key was held.
      window.EKAB_CHANNEL_HUB.transmit(false);
    }
    if (event.code === "Space" && desiredTx) { event.preventDefault(); endTx(); }
  });
  window.addEventListener("blur", () => { releaseLauncher(); endTx(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { releaseLauncher(); endTx(); } });

  const reset = async (message) => {
    endTx();
    leaving = true;
    const previousRoom = room;
    room = null;
    sessionToken = "";
    mode = "offline";
    if (previousRoom) {
      try { await previousRoom.disconnect(); } catch { /* Unexpected network loss. */ }
    }
    audioSink.replaceChildren();
    speaker.textContent = "—";
    count.textContent = "—";
    showControls();
    setVisualState("offline", "OFFLINE");
    updateStatus(message || "Εκτός σύνδεσης. Δεν εκπέμπεται ήχος.");
    leaving = false;
  };
  demo.addEventListener("click", () => {
    if (mode !== "offline") return;
    mode = "demo";
    showControls();
    showReceiveReady();
  });
  leave.addEventListener("click", () => reset());

  const loadSdk = () => {
    if (window.LivekitClient?.Room) return Promise.resolve(window.LivekitClient);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/livekit-client@2.24.1/dist/livekit-client.umd.min.js";
      script.async = true;
      let done = false;
      const timeout = setTimeout(() => finish(false), 16000);
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        if (ok && window.LivekitClient?.Room) resolve(window.LivekitClient);
        else reject(new Error("LiveKit SDK unavailable"));
      };
      script.onload = () => finish(true);
      script.onerror = () => finish(false);
      document.head.appendChild(script);
    }).catch((error) => { sdkPromise = null; throw error; });
    return sdkPromise;
  };
  const attachAudio = (track, LiveKit) => {
    if (track.kind !== LiveKit.Track.Kind.Audio) return;
    const element = track.attach();
    element.autoplay = true;
    element.controls = false;
    audioSink.appendChild(element);
  };

  join.addEventListener("click", async () => {
    if (mode !== "offline") return;
    if (!hasBackend) {
      if (window.EKAB_CHANNEL_HUB?.show) {
        window.EKAB_CHANNEL_HUB.show();
        return;
      }
      updateStatus("Ο LiveKit PTT server δεν έχει ενεργοποιηθεί ακόμη. Δοκίμασε τον χειρισμό χωρίς μετάδοση.", "error");
      return;
    }
    mode = "connecting";
    join.disabled = true;
    setVisualState("offline", "CONNECTING");
    updateStatus("Σύνδεση στον εξυπηρετητή PTT…");
    try {
      const LiveKit = await loadSdk();
      const tokenResponse = await fetch(tokenEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomName, name: "Σπουδαστής" }), cache: "no-store"
      });
      if (!tokenResponse.ok) throw new Error("token request refused");
      const issued = await tokenResponse.json();
      if (typeof issued.token !== "string" || !issued.token) throw new Error("missing token");
      sessionToken = issued.token;
      room = new LiveKit.Room({ adaptiveStream: false, dynacast: false, autoSubscribe: true });
      room.on(LiveKit.RoomEvent.ParticipantConnected, updateCount);
      room.on(LiveKit.RoomEvent.ParticipantDisconnected, updateCount);
      room.on(LiveKit.RoomEvent.TrackSubscribed, (track) => attachAudio(track, LiveKit));
      room.on(LiveKit.RoomEvent.TrackUnsubscribed, (track) => track.detach().forEach((element) => element.remove()));
      room.on(LiveKit.RoomEvent.ActiveSpeakersChanged, (participants) => {
        if (granted || mode !== "online") return;
        const remote = participants.find((p) => p.identity !== room.localParticipant.identity);
        if (remote) {
          speaker.textContent = remote.name || "Σπουδαστής";
          setVisualState("rx", "RX · ΛΗΨΗ");
        } else showReceiveReady();
      });
      room.on(LiveKit.RoomEvent.Reconnecting, () => {
        endTx();
        setVisualState("offline", "RECONNECTING");
        updateStatus("Προσωρινή διακοπή δικτύου · επανασύνδεση…", "error");
      });
      room.on(LiveKit.RoomEvent.Reconnected, () => { if (mode === "online") showReceiveReady(); });
      room.on(LiveKit.RoomEvent.Disconnected, () => {
        if (!leaving && mode === "online") reset("Η σύνδεση χάθηκε. Μπορείς να ξανασυνδεθείς.");
      });
      await room.connect(livekitUrl, sessionToken);
      mode = "online";
      showControls();
      updateCount();
      showReceiveReady();
    } catch {
      await reset("Δεν ολοκληρώθηκε η ζωντανή σύνδεση. Έλεγξε τον PTT server.");
      status.dataset.state = "error";
    } finally {
      join.disabled = false;
    }
  });

  setVisualState("offline", "OFFLINE");
  showControls();
})();
