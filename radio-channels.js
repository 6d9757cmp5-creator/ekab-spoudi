/* EKAB BETA radio hub: all five tabs share a proven Voxal P2P voice adapter.
 * Distinct providers remain separately linked; their advertised capacities
 * are NOT the measured capacity of this common adapter. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const hub = $("channelHub");
  const main = $("channelMain");
  const detail = $("channelDetail");
  const panel = $("radioPanel");
  const launch = $("radioLaunch");
  const badge = $("radioBadge");
  const frame = $("voxalFrame");
  const VOXAL = "https://web.voxal.app";
  const apiBase = typeof window.EKAB_RADIO_CONFIG?.apiBase === "string"
    ? window.EKAB_RADIO_CONFIG.apiBase.replace(/\/$/, "") : "";
  const names = ["voxal", "walkielazy", "walkie", "radio1", "private"];
  const counts = {
    voxal: ["channelCountVoxal", "6+"],
    walkielazy: ["channelCountLazy", "2*"],
    walkie: ["channelCountWalkie", "9*"],
    radio1: ["channelCountRadio1", "12*"],
    private: ["channelCountPrivate", "30+*"]
  };
  const providers = {
    voxal: { title: "Κανάλι 01", intro: "Κράτα πατημένο το μικρόφωνο για ομιλία. Η πρώτη σύνδεση μπορεί να ζητήσει άδεια μικροφώνου." },
    walkielazy: { title: "Κανάλι 02", intro: "Ξεχωριστό δωμάτιο της beta · ήχος μέσω Voxal." },
    walkie: { title: "Κανάλι 03", intro: "Ξεχωριστό δωμάτιο της beta · ήχος μέσω Voxal." },
    radio1: { title: "Κανάλι 04", intro: "Ξεχωριστό δωμάτιο της beta · ήχος μέσω Voxal." },
    private: { title: "Κανάλι 05 · Ιδιωτικό", intro: "Πληκτρολόγησε τον ιδιωτικό κωδικό μία φορά για να συνδεθείς." }
  };
  const pick = (name) => names.includes(name);
  const validRoom = (value) => typeof value === "string" && /^[\w.:-]{3,100}$/.test(value);
  const initial = new URL(location.href);
  const deepChannel = pick(initial.searchParams.get("channel")) ? initial.searchParams.get("channel") : null;
  const deepRoom = deepChannel !== "private" && validRoom(initial.searchParams.get("room"))
    ? initial.searchParams.get("room") : null;
  const participantId = (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID() : "beta-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
  const aliases = ["Άρης", "Μαρία", "Νίκη", "Ίριδα", "Λέων", "Ελένη", "Αλέξης", "Σοφία", "Μάριος", "Δανάη", "Πέτρος", "Αθηνά"];
  const seed = parseInt(participantId.replace(/[^a-f0-9]/gi, "").slice(0, 7), 16) || Math.floor(Math.random() * 1000000);
  const pseudonym = aliases[seed % aliases.length] + " · " + String(100 + seed % 900);
  $("channelChatName").value = pseudonym;
  $("channelSelfName").textContent = "Εσύ: " + pseudonym;
  let selected = null;
  let joined = null;
  let joining = null;
  let roomCode = "";
  let frameReady = false;
  let pending = null;
  let switching = null;
  let privateApproved = false;
  let privateToken = "";
  let transmitting = false;
  let remoteSpeaker = "";
  let micUnavailable = false;
  let actualPeers = null;
  let refreshInterval = null;
  let heartbeatInterval = null;
  let chatCache = "";
  let lastChatId = -1;
  let voiceSerial = 0;
  let joinTimer = null;
  let audioPaused = false;
  const clearJoinTimer = () => { clearTimeout(joinTimer); joinTimer = null; };
  const updatePauseButton = () => {
    const control = $("channelPauseAudio");
    control.setAttribute("aria-pressed", String(audioPaused));
    control.setAttribute("aria-label", audioPaused ? "Επανασύνδεση στον ήχο" : "Παύση ήχου με προσωρινή αποσύνδεση");
    control.title = audioPaused ? "Επανασύνδεση στο επιλεγμένο κανάλι" : "Η παύση διακόπτει προσωρινά τη σύνδεση";
    $("channelPauseLabel").textContent = audioPaused ? "Συνέχεια" : "Παύση";
    $("channelPauseIcon").textContent = audioPaused ? "▶" : "⏸";
    if (audioPaused) {
      badge.textContent = "PAUSE";
      $("channelVoiceConnect").hidden = true;
      $("channelCurrentCount").textContent = "Εκτός σύνδεσης";
    }
    else if (badge.textContent === "PAUSE") badge.textContent = "OFF";
  };

  const status = (message) => { $("voxalStatus").textContent = message; };
  const chatStatus = (message) => { $("channelChatStatus").textContent = message; };
  const api = async (channel, action, options = {}) => {
    if (!apiBase) throw new Error("Η υπηρεσία ασυρμάτου δεν έχει ρυθμιστεί.");
    const response = await fetch(apiBase + "/api/radio/" + channel + "/" + action, {
      mode: "cors", credentials: "omit", cache: "no-store", ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(channel === "private" && privateToken ? { "X-Radio-Private": privateToken } : {}),
        ...(options.headers || {})
      }
    });
    let data;
    try { data = await response.json(); } catch { data = { error: "Μη διαθέσιμη υπηρεσία." }; }
    if (!response.ok) {
      const error = new Error(data.error || "Σφάλμα " + response.status);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  };
  const post = (channel, action, data) => api(channel, action, {
    method: "POST", body: JSON.stringify(data)
  });
  const renderSpeech = () => {
    const direction = !joined ? "" : transmitting ? "tx" : remoteSpeaker ? "rx" : "";
    const name = direction === "tx" ? pseudonym : direction === "rx" ? remoteSpeaker : "";
    $("channelVoiceSpeaker").hidden = !direction;
    $("channelVoiceSpeakerName").textContent = direction ? name + " · " + direction.toUpperCase() : "";
    $("radioSpeaker").textContent = name || "—";
    for (const id of ["channelEqualizer", "radioEqualizer"]) {
      const equalizer = $(id);
      equalizer.classList.toggle("is-active", Boolean(direction));
      equalizer.dataset.direction = direction;
    }
    for (const control of [launch, $("radioPtt"), $("channelHardware")]) {
      control.classList.toggle("is-speaking", Boolean(direction));
      control.dataset.voiceDirection = direction;
    }
    $("channelHardware").disabled = !joined || direction === "rx" || micUnavailable;
    $("channelHardware").setAttribute("aria-pressed", String(direction === "tx"));
    $("channelHardware").setAttribute("aria-label", micUnavailable ? "Το μικρόφωνο δεν είναι διαθέσιμο" : direction === "tx" ? "Μιλάς τώρα — άφησε το κουμπί για να σταματήσεις" : direction === "rx" ? "Άλλος σπουδαστής μιλάει" : joined ? "Κράτα πατημένο για ομιλία" : "Αναμονή σύνδεσης ασυρμάτου");
    $("channelTalkLabel").textContent = micUnavailable ? "ΕΛΕΓΞΕ ΤΟ ΜΙΚΡΟΦΩΝΟ" :
      direction === "tx" ? "ΜΙΛΑΣ ΤΩΡΑ" :
      direction === "rx" ? "ΚΑΠΟΙΟΣ ΜΙΛΑΕΙ" : "ΚΡΑΤΑ ΓΙΑ ΟΜΙΛΙΑ";
    window.EKAB_RADIO_TONES?.syncVoxal?.({
      connected: Boolean(joined), direction, speaker: name, peers: actualPeers, channel: joined
    });
  };
  const updateLauncher = () => {
    if (joined) {
      badge.textContent = transmitting ? "TX" : "LIVE";
      launch.classList.add("is-connected");
    } else {
      if (badge.textContent === "LIVE" || badge.textContent === "TX") badge.textContent = "OFF";
      launch.classList.remove("is-connected");
    }
    renderSpeech();
  };
  const transmit = (down) => {
    if (!joined || micUnavailable || (down && remoteSpeaker && !transmitting)) return false;
    if (transmitting !== down) {
      transmitting = down;
      frame.contentWindow?.postMessage({
        type: "key", source: "voxal-parent", code: "Space", down
      }, VOXAL);
      window.EKAB_RADIO_TONES?.beep?.(down);
      updateLauncher();
    }
    return true;
  };
  const show = () => {
    panel.hidden = true;
    launch.setAttribute("aria-expanded", "true");
    hub.hidden = false;
    if (!selected) select(deepChannel || "voxal"); // Private invites never auto-join a public room.
    $("channelHubMinimize").focus({ preventScroll: true });
  };
  const minimize = () => {
    transmit(false); // Release a held PTT, but keep the live receiving session.
    hub.hidden = true;
    launch.setAttribute("aria-expanded", "false");
    launch.focus({ preventScroll: true });
  };
  const close = () => {
    audioPaused = false;
    stopVoice();
    updatePauseButton();
    hub.hidden = true;
    launch.setAttribute("aria-expanded", "false");
    launch.focus({ preventScroll: true });
  };
  const updateTabs = () => {
    $("channelQuick").querySelectorAll("[data-switch]").forEach((button) => {
      const active = button.dataset.switch === selected;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    });
  };
  const showList = () => {
    detail.hidden = true;
    main.hidden = false;
    hub.dataset.view = "list";
    hub.dataset.provider = "";
    selected = null;
    updateTabs();
    $("channelList").querySelector("[data-channel]")?.focus({ preventScroll: true });
  };
  const refreshCount = (channel, value) => {
    const [id, max] = counts[channel];
    if (channel === "private" && !privateApproved) {
      $(id).textContent = "🔒 / " + max;
      return;
    }
    $(id).textContent = (value === null ? "—" : value) + " / " + max;
    if (channel === selected) $("channelCurrentCount").textContent = audioPaused ? "Εκτός σύνδεσης" :
      value === null ? "Πληρότητα άγνωστη" : value + " μέσα";
  };
  const ensureFrame = () => {
    if (frame.getAttribute("src") && frame.getAttribute("src") !== "about:blank") return;
    const url = new URL(VOXAL);
    url.searchParams.set("ui", "tiny");
    url.searchParams.set("hideHeader", "true");
    url.searchParams.set("forceWeb", "true");
    url.searchParams.set("parentOrigin", location.origin);
    // Voxal accepts ?name= during bootstrap; voice and our chat share one alias.
    url.searchParams.set("name", pseudonym);
    frame.src = url.toString();
    status("Φόρτωση της σύνδεσης ήχου…");
  };
  const send = (message) => {
    if (!frameReady) {
      pending = message;
      ensureFrame();
      return;
    }
    frame.contentWindow?.postMessage(message, VOXAL);
  };
  const stopPolling = () => {
    clearInterval(refreshInterval);
    clearInterval(heartbeatInterval);
    refreshInterval = null;
    heartbeatInterval = null;
  };
  const chatReset = () => {
    chatCache = "";
    lastChatId = -1;
    $("channelChatMessages").replaceChildren();
    const hint = document.createElement("p");
    hint.textContent = "Τα μηνύματα του δωματίου θα εμφανιστούν εδώ.";
    $("channelChatMessages").appendChild(hint);
    chatStatus("");
  };
  const refreshChat = async (channel) => {
    try {
      const result = await api(channel, "messages?participantId=" + encodeURIComponent(participantId));
      if (joined !== channel) return;
      const key = JSON.stringify(result.messages || []);
      if (key === chatCache) return;
      chatCache = key;
      const box = $("channelChatMessages");
      const shouldFollow = box.scrollTop + box.clientHeight >= box.scrollHeight - 35;
      const nodes = (result.messages || []).map((message) => {
        const row = document.createElement("p");
        const author = document.createElement("strong");
        author.textContent = message.sender + ": ";
        const words = document.createElement("span");
        words.textContent = message.body;
        row.append(author, words);
        return row;
      });
      if (!nodes.length) {
        const empty = document.createElement("p");
        empty.textContent = "Δεν υπάρχουν πρόσφατα μηνύματα.";
        nodes.push(empty);
      }
      box.replaceChildren(...nodes);
      if (shouldFollow) box.scrollTop = box.scrollHeight;
      lastChatId = (result.messages || []).at(-1)?.id ?? -1;
    } catch (error) { if (joined === channel) chatStatus(error.message); }
  };
  const heartbeat = async (channel, code) => {
    if (joined !== channel || roomCode !== code) return;
    try {
      const state = await post(channel, "presence", {
        participantId, roomCode: code, action: "heartbeat"
      });
      if (joined === channel) refreshCount(channel, Math.max(state.participants, actualPeers || 0));
    } catch (error) { if (joined === channel) status("Ο ήχος λειτουργεί, αλλά η μέτρηση δεν ενημερώθηκε: " + error.message); }
  };
  const startPolling = (channel, code) => {
    stopPolling();
    heartbeat(channel, code);
    refreshChat(channel);
    refreshInterval = setInterval(() => {
      if (document.hidden || joined !== channel) return;
      refreshChat(channel);
      api(channel, "state").then((state) => {
        if (joined === channel) refreshCount(channel, Math.max(state.participants, actualPeers || 0));
      }).catch(() => {});
    }, 6000);
    heartbeatInterval = setInterval(() => {
      if (joined === channel) heartbeat(channel, code);
    }, 50000);
  };
  const leaveRoom = (switchTo = null) => {
    transmit(false);
    clearJoinTimer();
    voiceSerial++;
    const previous = joined;
    const oldCode = roomCode;
    joined = null;
    joining = null;
    roomCode = "";
    actualPeers = null;
    remoteSpeaker = "";
    micUnavailable = false;
    stopPolling();
    chatReset();
    $("channelVoiceConnect").hidden = false;
    $("channelVoiceLeave").hidden = true;
    $("voxalShare").disabled = true;
    $("channelHardware").disabled = true;
    $("channelHardware").setAttribute("aria-pressed", "false");
    updateLauncher();
    if (previous) {
      post(previous, "presence", { participantId, roomCode: oldCode, action: "left" }).catch(() => {});
      refreshCount(previous, null);
      switching = switchTo;
      send({ type: "leave" });
    } else if (switchTo) {
      connect(switchTo);
    }
  };
  // Voxal's iframe bridge has no receiver-mute command. Unloading its frame
  // reliably stops playback and microphone capture on iOS and desktop.
  // "Παύση" is a temporary DISCONNECT, never a misleading fake mute.
  const stopVoice = () => {
    if (joining && frameReady) frame.contentWindow?.postMessage({ type: "leave" }, VOXAL);
    leaveRoom();
    switching = null;
    frameReady = false;
    pending = null;
    frame.src = "about:blank";
    $("channelVoiceSetup").open = false;
  };
  const select = (channel) => {
    if (!pick(channel)) return;
    const previous = selected;
    selected = channel;
    hub.dataset.view = "detail";
    hub.dataset.provider = channel;
    main.hidden = true;
    detail.hidden = false;
    $("channelDetailTitle").textContent = providers[channel].title;
    $("channelDetailIntro").textContent = providers[channel].intro;
    $("channelExternal").hidden = true; // All five built-in channels use the same Voxal adapter.
    $("channelPrivate").hidden = channel !== "private" || privateApproved;
    $("channelVoice").hidden = channel === "private" && !privateApproved;
    updateTabs();
    refreshCount(channel, channel === joined ? actualPeers : null);
    const provider = providers[channel];
    if (provider.source) {
      $("channelExternalText").textContent = provider.note;
      $("channelSource").href = provider.source;
      $("channelLive").hidden = !provider.live;
      if (provider.live) $("channelLive").href = provider.live;
    }
    if (channel === joined) {
      $("channelVoiceConnect").hidden = true;
      $("channelVoiceLeave").hidden = false;
      $("channelHardware").disabled = false;
      return;
    }
    $("channelVoiceConnect").hidden = false;
    $("channelVoiceLeave").hidden = true;
    if (joined && previous !== channel) leaveRoom(channel === "private" && !privateApproved ? null : channel);
    else if (joining && previous !== channel) {
      clearJoinTimer();
      voiceSerial++;
      send({ type: "leave" });
      joining = null;
      switching = channel === "private" && !privateApproved ? null : channel;
      const target = switching;
      // An iframe that never joined may not emit "left"; avoid a stalled switch.
      if (target) setTimeout(() => {
        if (switching !== target || selected !== target) return;
        switching = null;
        connect(target);
      }, 1200);
    } else if (channel !== "private" && !audioPaused) connect(channel);
  };
  const connect = async (channel, override = null) => {
    if (!pick(channel) || audioPaused || (channel === "private" && !privateApproved)) return;
    if (joined === channel || joining === channel) return;
    if (joined && joined !== channel) { leaveRoom(channel); return; }
    const serial = ++voiceSerial;
    joining = channel;
    micUnavailable = false;
    $("channelHardware").disabled = true;
    $("channelVoiceConnect").hidden = true;
    // Keep the provider setup out of the basic PTT view. Expose its embedded
    // controls only when the automatic join fails or microphone help is needed.
    $("channelVoiceSetup").open = false;
    status("Εύρεση ενεργού δωματίου " + providers[channel].title + "…");
    $("channelVoiceConnect").disabled = true;
    ensureFrame();
    try {
      const state = await api(channel, "state");
      if (serial !== voiceSerial || selected !== channel) return;
      refreshCount(channel, state.participants);
      const code = override || state.roomCode;
      if (validRoom(code)) {
        status("Σύνδεση στο υπάρχον δωμάτιο…");
        send({ type: "join", roomCode: code });
      } else {
        status("Άδειο δωμάτιο · δημιουργείται αυτόματα. Εσύ είσαι ο πρώτος οικοδεσπότης.");
        send({ type: "create", channelName: "ΕΚΑΒ " + providers[channel].title });
      }
      clearJoinTimer();
      joinTimer = setTimeout(() => {
        if (joining !== channel || serial !== voiceSerial) return;
        joining = null;
        send({ type: "leave" });
        status("Η σύνδεση P2P δεν ολοκληρώθηκε. Δοκίμασε ξανά ή έλεγξε το δίκτυο/μικρόφωνο.");
        $("channelVoiceConnect").hidden = false;
        $("channelVoiceSetup").open = true;
      }, 26000);
    } catch (error) {
      if (serial === voiceSerial) {
        clearJoinTimer();
        joining = null;
        status("Η σύνδεση δεν ξεκίνησε: " + error.message);
        $("channelVoiceConnect").hidden = false;
        $("channelVoiceSetup").open = true;
      }
    } finally { $("channelVoiceConnect").disabled = false; }
  };
  const register = async (channel, code, action = "joined") => {
    try {
      const result = await post(channel, "presence", { participantId, roomCode: code, action });
      if (joined !== channel || roomCode !== code) return;
      refreshCount(channel, Math.max(result.participants, actualPeers || 0));
    } catch (error) {
      if (error.status === 409 && validRoom(error.data?.roomCode)) {
        status("Υπάρχει ήδη ενεργό δωμάτιο· γίνεται μεταφορά εκεί…");
        leaveRoom();
        switching = { channel, room: error.data.roomCode };
      } else status("Φωνή συνδεδεμένη · η καταμέτρηση δεν ενημερώθηκε: " + error.message);
    }
  };

  $("radioChannelsOpen").addEventListener("click", show);
  const headerPTT = $("channelHardware");
  headerPTT.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !joined || headerPTT.disabled) return;
    event.preventDefault?.();
    try { headerPTT.setPointerCapture(event.pointerId); } catch {}
    transmit(true);
  });
  const releaseHeaderPTT = () => {
    transmit(false);
  };
  headerPTT.addEventListener("pointerup", releaseHeaderPTT);
  headerPTT.addEventListener("pointercancel", releaseHeaderPTT);
  headerPTT.addEventListener("lostpointercapture", releaseHeaderPTT);
  headerPTT.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.repeat) transmit(true); });
  headerPTT.addEventListener("keyup", (event) => { if (event.key === "Enter") transmit(false); });
  $("channelSoundToggle").addEventListener("click", () => {
    window.EKAB_RADIO_TONES?.toggle?.();
    const enabled = window.EKAB_RADIO_TONES?.enabled?.() !== false;
    $("channelSoundToggle").textContent = enabled ? "Εφέ ON" : "Εφέ OFF";
    $("channelSoundToggle").setAttribute("aria-pressed", String(enabled));
  });
  $("channelPauseAudio").addEventListener("click", () => {
    if (!audioPaused) {
      audioPaused = true;
      stopVoice();
      status("Ήχος σε παύση · αποσυνδέθηκες προσωρινά. Πάτησε «Συνέχεια» για επανασύνδεση.");
    } else {
      audioPaused = false;
      status("Επανασύνδεση ήχου…");
      if (selected) connect(selected);
    }
    updatePauseButton();
  });
  $("channelHubClose").addEventListener("click", close);
  $("channelHubMinimize").addEventListener("click", minimize);
  $("channelBack").addEventListener("click", showList);
  $("channelList").querySelectorAll("[data-channel]").forEach((button) =>
    button.addEventListener("click", () => select(button.dataset.channel)));
  $("channelQuick").querySelectorAll("[data-switch]").forEach((button) =>
    button.addEventListener("click", () => select(button.dataset.switch)));
  $("channelVoiceConnect").addEventListener("click", () => connect(selected));
  $("channelVoiceLeave").addEventListener("click", () => {
    leaveRoom();
    status("Αποσυνδέθηκες. Μπορείς να ξαναμπείς οποιαδήποτε στιγμή.");
  });
  $("channelPrivateJoin").addEventListener("click", async () => {
    const code = $("channelPassword").value;
    $("channelPassword").value = "";
    $("channelPrivateJoin").disabled = true;
    $("channelPrivateStatus").textContent = "Έλεγχος έγκρισης…";
    try {
      const approval = await post("private", "auth", { code });
      privateToken = typeof approval.privateToken === "string" ? approval.privateToken : "";
      if (!privateToken) throw new Error("Δεν εκδόθηκε ασφαλής πρόσβαση στο ιδιωτικό κανάλι.");
      privateApproved = true;
      $("channelPrivate").hidden = true;
      $("channelVoice").hidden = false;
      $("channelPrivateStatus").textContent = "";
      select("private");
      status("Η έγκριση ολοκληρώθηκε. Σύνδεση στο ιδιωτικό δωμάτιο…");
      connect("private");
    } catch (error) {
      $("channelPrivateStatus").textContent = error.message;
      if (error.status === 503) $("channelPrivateStatus").textContent =
        "Η προστατευμένη υπηρεσία δεν ενεργοποιήθηκε. Δοκίμασε ξανά αργότερα.";
    } finally { $("channelPrivateJoin").disabled = false; }
  });
  $("channelPassword").addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); $("channelPrivateJoin").click(); }
  });
  $("voxalShare").addEventListener("click", async () => {
    if (!joined) return;
    const url = new URL(location.href);
    url.searchParams.set("channel", joined);
    if (joined === "private") url.searchParams.delete("room");
    else if (validRoom(roomCode)) url.searchParams.set("room", roomCode);
    url.searchParams.delete("radio");
    url.hash = "";
    try {
      await navigator.clipboard.writeText(url.toString());
      status(joined === "private" ? "Αντιγράφηκε πρόσκληση που απαιτεί κωδικό." : "Αντιγράφηκε η πρόσκληση του δωματίου.");
    } catch { status("Δεν επιτράπηκε η αντιγραφή από τον browser."); }
  });
  $("channelChatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!joined) { chatStatus("Συνδέσου πρώτα στον ασύρματο."); return; }
    const text = $("channelChatText").value.trim();
    $("channelChatSend").disabled = true;
    try {
      await post(joined, "messages", { participantId, name: pseudonym, text });
      $("channelChatText").value = "";
      chatStatus("");
      refreshChat(joined);
    } catch (error) { chatStatus(error.message); }
    finally { $("channelChatSend").disabled = false; }
  });

  window.addEventListener("message", async (event) => {
    if (event.origin !== VOXAL || event.source !== frame.contentWindow || event.data?.source !== "voxal") return;
    if (audioPaused || frame.getAttribute("src") === "about:blank") return;
    const data = event.data;
    switch (data.type) {
      case "ready":
        frameReady = true;
        if (pending) { const command = pending; pending = null; send(command); }
        break;
      case "joined": {
        const channel = joining;
        clearJoinTimer();
        if (!pick(channel) || (channel === "private" && !privateApproved)) {
          send({ type: "leave" });
          break;
        }
        if (!validRoom(data.roomCode)) { status("Μη έγκυρη απάντηση δωματίου."); break; }
        joined = channel;
        joining = null;
        roomCode = data.roomCode;
        actualPeers = null;
        remoteSpeaker = "";
        micUnavailable = false;
        $("channelVoiceConnect").hidden = true;
        $("channelVoiceLeave").hidden = false;
        $("channelHardware").disabled = false;
        $("channelVoiceSetup").open = false;
        $("voxalShare").disabled = false;
        status("Ζωντανή σύνδεση · κράτα πατημένο το μεγάλο μικρόφωνο για ομιλία.");
        updateLauncher();
        register(channel, roomCode);
        startPolling(channel, roomCode);
        break;
      }
      case "peers":
        if (joined && Array.isArray(data.peers)) {
          actualPeers = data.peers.length;
          refreshCount(joined, actualPeers);
          const speaker = data.peers.find((peer) => peer?.talking && !peer?.self);
          remoteSpeaker = speaker ? (typeof speaker.pseudo === "string" ? speaker.pseudo.slice(0, 32) : "Σπουδαστής") : "";
          renderSpeech();
        }
        break;
      case "host-changed":
        if (joined && validRoom(data.roomCode)) {
          roomCode = data.roomCode;
          register(joined, roomCode, "migrate");
          startPolling(joined, roomCode);
          status("Η φιλοξενία του δωματίου μεταφέρθηκε αυτόματα.");
        }
        break;
      case "talking":
        transmitting = Boolean(joined && data.active === true);
        updateLauncher();
        break;
      case "left":
        if (joined) leaveRoom();
        if (switching) {
          const target = switching;
          switching = null;
          if (typeof target === "string") connect(target);
          else connect(target.channel, target.room);
        } else if (joining) {
          clearJoinTimer();
          joining = null;
          status("Δεν ολοκληρώθηκε η σύνδεση. Δοκίμασε ξανά.");
        }
        break;
      case "error":
        if (joining) {
          clearJoinTimer();
          joining = null;
          $("channelVoiceConnect").hidden = false;
        }
        if (joined && /microphone|mic |permission|device|μικρόφων/i.test(String(data.message || ""))) {
          micUnavailable = true;
          $("channelVoiceSetup").open = true;
          renderSpeech();
        }
        status("Voxal: " + String(data.message || "Έλεγξε το δίκτυο ή το μικρόφωνο.").slice(0, 150));
        break;
    }
  });
  window.addEventListener("blur", () => transmit(false));
  document.addEventListener("visibilitychange", () => { if (document.hidden) transmit(false); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !hub.hidden) minimize();
  });
  window.EKAB_CHANNEL_HUB = Object.freeze({
    show, minimize, close, transmit,
    isConnected: () => Boolean(joined),
    isSelected: () => Boolean(selected),
    isOpen: () => !hub.hidden
  });
  Object.keys(counts).forEach((channel) => refreshCount(channel, null));
  updatePauseButton();
  if (deepChannel) {
    show();
    select(deepChannel);
    if (deepChannel !== "private") connect(deepChannel, deepRoom);
  }
})();
