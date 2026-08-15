//#region src/ha-litter-robot-card.ts
var e = class extends HTMLElement {
	config;
	_hass;
	setConfig(e) {
		if (!e) throw Error("Invalid card configuration");
		this.config = e, this.renderCard();
	}
	set hass(e) {
		this._hass = e, this.config && this.renderCard();
	}
	connectedCallback() {
		this.config && this.renderCard();
	}
	getEntity(e) {
		if (e) return this._hass?.states[e];
	}
	getState(e) {
		return this.getEntity(e)?.state ?? "unknown";
	}
	getEntityAttribute(e, t) {
		return this.getEntity(e)?.attributes?.[t];
	}
	isAvailable(e) {
		if (!e) return !1;
		let t = this.getState(e);
		return t !== "unknown" && t !== "unavailable" && t !== "";
	}
	getNumber(e) {
		let t = this.getState(e);
		if (t === "unknown" || t === "unavailable" || t === "") return null;
		let n = Number.parseFloat(t.replace(",", "."));
		return Number.isNaN(n) ? null : n;
	}
	getPercentage(e) {
		let t = this.getNumber(e);
		return t === null ? null : Math.min(100, Math.max(0, t));
	}
	getLedDisplay(e, t) {
		if (t) return {
			mainColor: "#8b5cf6",
			mainMode: "solid",
			smallColor: "transparent",
			smallMode: "off"
		};
		switch (e) {
			case "rdy": return {
				mainColor: "#2388ff",
				mainMode: "solid",
				smallColor: "transparent",
				smallMode: "off"
			};
			case "ccp": return {
				mainColor: "transparent",
				mainMode: "off",
				smallColor: "#ffd028",
				smallMode: "orbit"
			};
			case "cd":
			case "cst": return {
				mainColor: "#ff3157",
				mainMode: "solid",
				smallColor: "transparent",
				smallMode: "off"
			};
			case "dfs": return {
				mainColor: "#2388ff",
				mainMode: "blink",
				smallColor: "transparent",
				smallMode: "off"
			};
			case "p":
			case "pd": return {
				mainColor: "#ffd028",
				mainMode: "solid",
				smallColor: "transparent",
				smallMode: "off"
			};
			case "off":
			case "offline": return {
				mainColor: "transparent",
				mainMode: "off",
				smallColor: "transparent",
				smallMode: "off"
			};
			default: return {
				mainColor: "#8a8a8a",
				mainMode: "solid",
				smallColor: "transparent",
				smallMode: "off"
			};
		}
	}
	getStatusText(e) {
		switch (e) {
			case "rdy": return "Ready";
			case "ccp": return "Cleaning";
			case "cd": return "Cat detected";
			case "cst": return "Settling after visit";
			case "dfs": return "Waste drawer full";
			case "p":
			case "pd": return "Paused";
			case "off": return "Powered off";
			case "offline": return "Offline";
			default: return e === "unknown" ? "Status unknown" : e.toUpperCase();
		}
	}
	getStatusColor(e) {
		switch (e) {
			case "rdy": return "#2388ff";
			case "ccp":
			case "p":
			case "pd": return "#ffd028";
			case "cd":
			case "cst": return "#ff3157";
			case "dfs": return "#ff3157";
			case "off":
			case "offline": return "#5c6370";
			default: return "#8a8a8a";
		}
	}
	formatPounds(e) {
		return e === null ? "–" : `${e.toFixed(2)} lbs`;
	}
	formatVisits(e) {
		if (e === null) return "No visit data";
		let t = Math.round(e);
		return t === 0 ? "No visits today" : t === 1 ? "1 visit today" : `${t} visits today`;
	}
	formatRelativeTime(e) {
		if (!e) return "Time unknown";
		let t = new Date(e).getTime();
		if (Number.isNaN(t)) return "Time unknown";
		let n = Math.max(0, Math.floor((Date.now() - t) / 1e3));
		if (n < 60) return "Just now";
		let r = Math.floor(n / 60);
		if (r < 60) return `${r} min ago`;
		let i = Math.floor(r / 60);
		if (i < 24) return i === 1 ? "1 hr ago" : `${i} hrs ago`;
		let a = Math.floor(i / 24);
		return a === 1 ? "1 day ago" : `${a} days ago`;
	}
	getLastDetectedCat(e) {
		if (e === null || !this.config?.cats?.length) return null;
		let t = this.config.cats.map((t) => {
			let n = this.getNumber(t.weight_entity), r = this.getNumber(t.visits_entity);
			return {
				name: t.name,
				image: t.image,
				weightLbs: n,
				visits: r,
				differenceLbs: n === null ? Infinity : Math.abs(e - n)
			};
		}).sort((e, t) => e.differenceLbs - t.differenceLbs)[0], n = this.config.cat_match_tolerance_lbs ?? 1;
		return !t || t.differenceLbs > n ? null : t;
	}
	getLevelText(e, t) {
		return e === null ? "No data" : t === "litter" ? e >= 60 ? "Plenty left" : e >= 30 ? "Running low" : "Refill needed" : e < 50 ? "Still fine" : e < 80 ? "Empty soon" : "Empty now";
	}
	formatSelectValue(e) {
		return e === "unknown" || e === "unavailable" || e === "" ? "–" : {
			on: "On",
			off: "Off",
			auto: "Auto",
			low: "Low",
			medium: "Medium",
			high: "High",
			dim: "Dim",
			bright: "Bright"
		}[e.toLowerCase()] ?? e;
	}
	getCompactLightValue(e, t) {
		let n = this.formatSelectValue(e), r = this.formatSelectValue(t);
		return n === "–" ? r === "–" ? "–" : r : n;
	}
	formatDelay(e, t = !1) {
		if (e === "unknown" || e === "unavailable" || e === "") return "–";
		let n = e.match(/-?\d+(?:[.,]\d+)?/);
		if (!n) return e;
		let r = n[0];
		return t ? r : `${r} min`;
	}
	getFirmwareVersion(e) {
		if (!e) return "";
		for (let t of [
			"installed_version",
			"current_version",
			"version",
			"latest_version"
		]) {
			let n = this.getEntityAttribute(e, t);
			if (typeof n == "string" && n.trim()) return n.trim();
		}
		let t = this.getState(e);
		return t !== "unknown" && t !== "unavailable" && t !== "on" && t !== "off" ? t : "";
	}
	renderChipContent(e, t) {
		return t === "icons" ? "" : t === "values" ? `
        <span class="chip-value">
          ${e.value}
        </span>
      ` : `
      <span class="chip-text">
        <span class="chip-label">
          ${e.label}
        </span>

        <span class="chip-value">
          ${e.value}
        </span>
      </span>
    `;
	}
	renderStatusChip(e, t, n) {
		if (!e.available) return "";
		let r = e.entityId ? "system-chip-interactive" : "", i = e.entityId ? `data-entity="${e.entityId}"` : "";
		return `
      <div
        class="system-chip ${r}"
        title="${e.title}"
        style="--chip-color: ${e.color};"
        ${i}
        role="${e.entityId ? "button" : "presentation"}"
        tabindex="${e.entityId ? "0" : "-1"}"
      >
        <ha-icon
          class="system-chip-icon"
          icon="${e.icon}"
        ></ha-icon>

        <span class="desktop-chip-content">
          ${this.renderChipContent(e, t)}
        </span>

        <span class="mobile-chip-content">
          ${this.renderChipContent(e, n)}
        </span>
      </div>
    `;
	}
	async callService(e, t, n) {
		if (this._hass) try {
			await this._hass.callService(e, t, { entity_id: n });
		} catch (n) {
			console.error(`Nova UI: service ${e}.${t} could not be called.`, n);
		}
	}
	attachStatusChipEvents() {
		let e = this.querySelectorAll(".system-chip[data-entity]"), t = (e) => {
			let t = e.dataset.entity;
			t && this.dispatchEvent(new CustomEvent("hass-more-info", {
				detail: { entityId: t },
				bubbles: !0,
				composed: !0
			}));
		};
		e.forEach((e) => {
			e.addEventListener("click", () => {
				t(e);
			}), e.addEventListener("keydown", (n) => {
				(n.key === "Enter" || n.key === " ") && (n.preventDefault(), t(e));
			});
		});
	}
	attachControlEvents() {
		let e = this.config?.vacuum_entity ?? "vacuum.cleany_katzenklo", t = this.config?.reset_button_entity ?? "button.cleany_zurucksetzen", n = this.querySelector("[data-action=\"start\"]"), r = this.querySelector("[data-action=\"stop\"]"), i = this.querySelector("[data-action=\"reset\"]");
		n?.addEventListener("click", async () => {
			await this.callService("vacuum", "start", e);
		}), r?.addEventListener("click", async () => {
			await this.callService("vacuum", "stop", e);
		}), i?.addEventListener("click", async () => {
			(this.config?.confirm_reset ?? !0) && !window.confirm("Really reset the Litter-Robot?") || await this.callService("button", "press", t);
		});
	}
	renderCard() {
		let e = this.config?.name ?? "Litter-Robot 4", t = this.config?.entity ?? "sensor.cleany_statuscode", n = this.config?.sleep_entity ?? "binary_sensor.cleany_ruhemodus", r = this.config?.power_entity ?? "binary_sensor.cleany_stromversorgung", i = this.config?.cycles_entity ?? "sensor.cleany_gesamtzyklen", a = this.config?.cycle_delay_entity ?? "select.cleany_wartezeit_fur_den_reinigungszyklus_in_minuten", o = this.config?.globe_light_entity ?? "select.cleany_globe_beleuchtung", s = this.config?.globe_brightness_entity ?? "select.cleany_globe_helligkeit", c = this.config?.firmware_entity ?? "update.cleany_firmware", l = this.config?.last_pet_weight_entity ?? "sensor.cleany_gewicht_des_haustiers", u = this.config?.vacuum_entity ?? "vacuum.cleany_katzenklo", d = this.config?.reset_button_entity ?? "button.cleany_zurucksetzen", f = this.config?.show_status_bar ?? !0, p = this.config?.show_controls ?? !0, m = this.config?.show_device_image ?? !0, h = this.config?.show_cat_roster ?? !0, g = this.config?.status_bar_mode ?? "values", _ = this.config?.status_bar_mobile_mode ?? "icons", v = this.getState(t), y = this.getState(n) === "on", b = this.getLedDisplay(v, y), x = y ? "Sleep mode" : this.getStatusText(v), S = y ? "#8b5cf6" : this.getStatusColor(v), C = (e) => e === "transparent" ? "none" : `drop-shadow(0 0 5px ${e}) drop-shadow(0 0 12px ${e})`, w = !y && (v === "off" || v === "offline") ? "none" : `0 0 10px ${S}`, T = this.getFirmwareVersion(c), E = this.getPercentage(this.config?.litter_entity), D = this.getPercentage(this.config?.waste_entity), O = E === null ? "–" : `${Math.round(E)} %`, k = D === null ? "–" : `${Math.round(D)} %`, A = E ?? 0, j = D ?? 0, M = this.getNumber(l), N = this.getEntity(l), P = this.getLastDetectedCat(M), F = P?.name ?? "Unknown cat", I = this.formatPounds(M), L = P ? this.formatVisits(P.visits) : "No clear match", R = this.formatRelativeTime(N?.last_updated), z = P?.image ? `
          <img
            class="cat-image"
            src="${P.image}"
            alt="${P.name}"
          />
        ` : "\n          <div class=\"cat-placeholder\">\n            🐈\n          </div>\n        ", B = (this.config?.cats ?? []).map((e, t) => {
			let n = this.getNumber(e.weight_entity), r = this.getNumber(e.visits_entity), i = this.formatPounds(n), a = this.formatVisits(r), o = e.image ? `
                <img
                  class="profile-image"
                  src="${e.image}"
                  alt="${e.name}"
                />
              ` : "\n                <div\n                  class=\"profile-placeholder\"\n                >\n                  🐈\n                </div>\n              ";
			return `
            <article
              class="
                cat-profile
                ${`cat-accent-${t % 3 + 1}`}
              "
            >
              ${o}

              <div class="profile-name">
                ${e.name}
              </div>

              <div class="profile-weight">
                ${i}
              </div>

              <div class="profile-visits">
                ${a}
              </div>
            </article>
          `;
		}).join(""), V = this.getState(r), H = this.getNumber(i), U = this.getState(a), W = this.getState(o), G = this.getState(s), K = V === "on", q = this.getCompactLightValue(W, G), J = this.isAvailable(u), Y = this.isAvailable(d), X = [
			{
				icon: K ? "mdi:power-plug" : "mdi:power-plug-off",
				label: "Power",
				value: K ? "On" : "Off",
				color: K ? "#62df76" : "#ff5c6c",
				title: K ? "Power connected" : "Power disconnected",
				available: this.isAvailable(r),
				entityId: r
			},
			{
				icon: "mdi:moon-waning-crescent",
				label: "Sleep",
				value: y ? "On" : "Off",
				color: y ? "#a879ff" : "#818ca0",
				title: y ? "Sleep mode on" : "Sleep mode off",
				available: this.isAvailable(n),
				entityId: n
			},
			{
				icon: "mdi:sync",
				label: "Cycles",
				value: H === null ? "–" : `${Math.round(H)}`,
				color: "#2f9cff",
				title: "Total number of clean cycles",
				available: this.isAvailable(i),
				entityId: i
			},
			{
				icon: "mdi:clock-outline",
				label: "Wait",
				value: this.formatDelay(U, g !== "labels"),
				color: "#ffbd24",
				title: "Wait time before the clean cycle",
				available: this.isAvailable(a),
				entityId: a
			},
			{
				icon: "mdi:lightbulb-outline",
				label: "Light",
				value: q,
				color: "#ffd02f",
				title: "Globe light and brightness",
				available: this.isAvailable(o) || this.isAvailable(s),
				entityId: o
			}
		].map((e) => this.renderStatusChip(e, g, _)).join("");
		this.innerHTML = `
      <style>
        ha-card {
          overflow: hidden;
          border-radius: 26px;
          color:
            var(--primary-text-color);
          background:
            radial-gradient(
              circle at 35% 18%,
              rgba(35, 136, 255, 0.08),
              transparent 34%
            ),
            linear-gradient(
              145deg,
              rgba(27, 31, 40, 0.98),
              rgba(12, 15, 21, 0.98)
            );
          border:
            1px solid
            rgba(255, 255, 255, 0.08);
          box-shadow:
            0 18px 45px
            rgba(0, 0, 0, 0.28);
        }

        .nova-card {
          box-sizing: border-box;
          padding: 22px;
        }

        .header {
          display: flex;
          align-items: flex-start;
          justify-content:
            space-between;
          gap: 18px;
          margin-bottom: 12px;
        }

        .title {
          margin: 0;
          font-size: 25px;
          line-height: 1.15;
          font-weight: 650;
          letter-spacing: -0.5px;
        }

        .firmware-subtitle {
          margin-top: 6px;
          color:
            var(
              --secondary-text-color
            );
          font-size: 13px;
          font-weight: 500;
        }

        .status-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          /* Uniform pill across cards: without a floor, "Ready" renders about
             half the width of "Waste drawer full", and nowrap stops two-word
             statuses like "Powered off" wrapping to a second line and making
             that one card's header taller than its neighbours. */
          min-width: 150px;
          white-space: nowrap;
          flex: 0 0 auto;
          padding: 8px 12px;
          border-radius: 999px;
          background:
            rgba(
              255,
              255,
              255,
              0.055
            );
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );
          color:
            var(
              --secondary-text-color
            );
          font-size: 13px;
        }

        /* The colour is applied inline on the element, NOT here. This card
           renders into the light DOM, so every instance's <style> block applies
           page-wide; a per-card colour written into this rule is overwritten by
           whichever card renders last, and every dot on the page ends up the
           same colour. Inline styles are per-element and cannot collide. */
        .status-dot {
          flex: 0 0 auto;
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        .robot-area {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 330px;
          padding: 4px 0 6px;
        }

        .robot-image-wrap {
          position: relative;
          width:
            min(100%, 390px);
        }

        .robot-base {
          display: block;
          width: 100%;
          height: auto;
          user-select: none;
          pointer-events: none;
        }

        .led {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        /* Colour and glow come from inline styles on the element -- same
           light-DOM collision as .status-dot. See the note there. */
        .led-main {
          -webkit-mask-image:
            url(
              "/local/nova-ui/litter-robot-led-main.png"
            );
          -webkit-mask-repeat:
            no-repeat;
          -webkit-mask-position:
            center;
          -webkit-mask-size:
            contain;

          mask-image:
            url(
              "/local/nova-ui/litter-robot-led-main.png"
            );
          mask-repeat: no-repeat;
          mask-position: center;
          mask-size: contain;
        }

        .led-small {
          -webkit-mask-image:
            url(
              "/local/nova-ui/litter-robot-led-small.png"
            );
          -webkit-mask-repeat:
            no-repeat;
          -webkit-mask-position:
            center;
          -webkit-mask-size:
            contain;

          mask-image:
            url(
              "/local/nova-ui/litter-robot-led-small.png"
            );
          mask-repeat: no-repeat;
          mask-position: center;
          mask-size: contain;
        }

        .solid {
          opacity: 0.92;
        }

        .off {
          display: none;
        }

        .blink {
          animation:
            led-blink
            1s
            ease-in-out
            infinite;
        }

        .orbit {
          transform-origin:
            50% 39%;
          animation:
            led-orbit
            2.8s
            linear
            infinite;
        }

        .system-status-bar {
          display: flex;
          align-items: stretch;
          justify-content: center;
          margin-bottom: 14px;
          padding: 7px 9px;
          border-radius: 17px;
          background:
            rgba(
              255,
              255,
              255,
              0.032
            );
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.075
            );
        }

        .system-chip {
          display: flex;
          align-items: center;
          justify-content: center;
          /* flex: 1 1 0 stretched chips to fill the bar, so a box exposing one
             chip got a full-width pill while its neighbour exposing two got two
             halves -- the same chip rendered at different sizes card to card.
             A fixed basis keeps every chip the same size regardless of how many
             entities a given box happens to expose. */
          flex: 0 0 auto;
          min-width: 96px;
          gap: 7px;
          padding: 5px 11px;
          white-space: nowrap;
        }

        .system-chip-interactive {
          cursor: pointer;
          border-radius: 11px;
          transition:
            background 0.15s ease,
            transform 0.15s ease;
        }

        .system-chip-interactive:hover {
          background:
            rgba(
              255,
              255,
              255,
              0.055
            );
        }

        .system-chip-interactive:active {
          transform:
            scale(0.96);
        }

        .system-chip-interactive:focus-visible {
          outline:
            2px solid
            var(--chip-color);
          outline-offset: -2px;
        }

        .system-chip +
        .system-chip {
          border-left:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        .system-chip-icon {
          flex: 0 0 auto;
          width: 21px;
          height: 21px;
          color:
            var(--chip-color);
          filter:
            drop-shadow(
              0 0 5px
              var(--chip-color)
            );
        }

        .desktop-chip-content {
          display: inline-flex;
          min-width: 0;
        }

        .mobile-chip-content {
          display: none;
        }

        .chip-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
          line-height: 1.1;
        }

        .chip-label {
          color:
            var(
              --secondary-text-color
            );
          font-size: 9px;
        }

        .chip-value {
          overflow: hidden;
          max-width: 82px;
          color:
            var(
              --primary-text-color
            );
          font-size: 11px;
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .visit-card,
        .cats-card,
        .details,
        .controls-card {
          padding: 18px;
          border-radius: 20px;
          background:
            rgba(
              255,
              255,
              255,
              0.035
            );
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );
        }

        .visit-card,
        .cats-card,
        .details {
          margin-bottom: 14px;
        }

        .section-title {
          margin-bottom: 17px;
          color:
            var(
              --secondary-text-color
            );
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.05px;
          text-transform: uppercase;
        }

        .visit-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .cat-image,
        .cat-placeholder {
          flex: 0 0 auto;
          width: 72px;
          height: 72px;
          border-radius: 20px;
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.09
            );
          background:
            rgba(
              255,
              255,
              255,
              0.055
            );
        }

        .cat-image {
          display: block;
          object-fit: cover;
        }

        .cat-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
        }

        .visit-info {
          min-width: 0;
          flex: 1;
        }

        .visit-top {
          display: flex;
          align-items: flex-start;
          justify-content:
            space-between;
          gap: 12px;
        }

        .cat-name {
          overflow: hidden;
          font-size: 20px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .visit-time {
          flex: 0 0 auto;
          color:
            var(
              --secondary-text-color
            );
          font-size: 12px;
        }

        .visit-weight {
          margin-top: 6px;
          color: #50a3ff;
          font-size: 18px;
          font-weight: 650;
        }

        .visit-count {
          margin-top: 5px;
          color:
            var(
              --secondary-text-color
            );
          font-size: 13px;
        }

        .cats-grid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 12px;
        }

        .cat-profile {
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          min-width: 0;
          padding: 16px 12px;
          border-radius: 19px;
          text-align: center;
          background:
            linear-gradient(
              145deg,
              rgba(
                255,
                255,
                255,
                0.065
              ),
              rgba(
                255,
                255,
                255,
                0.025
              )
            );
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.09
            );
        }

        .cat-profile::before {
          position: absolute;
          content: "";
          inset: 0;
          pointer-events: none;
          opacity: 0.15;
          background:
            radial-gradient(
              circle at 50% 0%,
              var(--cat-accent),
              transparent 65%
            );
        }

        .cat-accent-1 {
          --cat-accent:
            #f2a55f;
        }

        .cat-accent-2 {
          --cat-accent:
            #438cff;
        }

        .cat-accent-3 {
          --cat-accent:
            #9a6cff;
        }

        .profile-image,
        .profile-placeholder {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 74px;
          height: 74px;
          margin: 0 auto 12px;
          border-radius: 50%;
          border:
            2px solid
            rgba(
              255,
              255,
              255,
              0.25
            );
          background:
            rgba(
              255,
              255,
              255,
              0.07
            );
          box-shadow:
            0 7px 20px
            rgba(0, 0, 0, 0.25);
        }

        .profile-image {
          object-fit: cover;
        }

        .profile-placeholder {
          font-size: 33px;
        }

        .profile-name {
          position: relative;
          overflow: hidden;
          font-size: 17px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .profile-weight {
          position: relative;
          margin-top: 8px;
          color:
            var(--cat-accent);
          font-size: 19px;
          font-weight: 700;
        }

        .profile-visits {
          position: relative;
          margin-top: 7px;
          color:
            var(
              --secondary-text-color
            );
          font-size: 12px;
        }

        .empty-cats {
          color:
            var(
              --secondary-text-color
            );
          font-size: 13px;
        }

        .levels {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }

        .level {
          min-width: 0;
          padding: 3px 18px;
        }

        .level:first-child {
          padding-left: 0;
          border-right:
            1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        .level:last-child {
          padding-right: 0;
        }

        .level-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 11px;
        }

        .level-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 11px;
          background:
            rgba(
              255,
              255,
              255,
              0.055
            );
          font-size: 19px;
        }

        .level-name {
          color:
            var(
              --secondary-text-color
            );
          font-size: 13px;
        }

        .level-value-row {
          display: flex;
          align-items: baseline;
          justify-content:
            space-between;
          gap: 8px;
          margin-bottom: 12px;
        }

        .level-value {
          font-size: 28px;
          line-height: 1;
          font-weight: 650;
          letter-spacing: -0.5px;
        }

        .level-state {
          overflow: hidden;
          color:
            var(
              --secondary-text-color
            );
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .progress {
          overflow: hidden;
          height: 9px;
          border-radius: 999px;
          background:
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        .progress-fill {
          height: 100%;
          border-radius: inherit;
          transition:
            width 0.35s ease;
        }

        /* Width is applied inline on the element, NOT here -- same light-DOM
           collision as .status-dot. Interpolated here, every card's bar took the
           percentage from whichever card rendered last. */
        .progress-litter {
          background:
            linear-gradient(
              90deg,
              #2388ff,
              #50a3ff
            );
          box-shadow:
            0 0 12px
            rgba(
              35,
              136,
              255,
              0.4
            );
        }

        .progress-waste {
          background:
            linear-gradient(
              90deg,
              #63cf72,
              #8be28f
            );
          box-shadow:
            0 0 12px
            rgba(
              99,
              207,
              114,
              0.35
            );
        }

        .controls-grid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 10px;
        }

        .control-button {
          appearance: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 0;
          min-height: 82px;
          gap: 8px;
          padding: 12px 8px;
          border-radius: 16px;
          color:
            var(
              --primary-text-color
            );
          background:
            linear-gradient(
              145deg,
              rgba(
                255,
                255,
                255,
                0.07
              ),
              rgba(
                255,
                255,
                255,
                0.025
              )
            );
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.09
            );
          font: inherit;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            background 0.15s ease,
            border-color 0.15s ease,
            opacity 0.15s ease;
        }

        .control-button:hover:not(
          :disabled
        ) {
          background:
            rgba(
              255,
              255,
              255,
              0.085
            );
          border-color:
            rgba(
              255,
              255,
              255,
              0.16
            );
        }

        .control-button:active:not(
          :disabled
        ) {
          transform:
            scale(0.96);
        }

        .control-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .control-icon {
          width: 27px;
          height: 27px;
          color:
            var(--control-color);
          filter:
            drop-shadow(
              0 0 6px
              var(--control-color)
            );
        }

        .control-label {
          overflow: hidden;
          max-width: 100%;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .control-start {
          --control-color:
            #ffbd24;
        }

        .control-stop {
          --control-color:
            #ff8a2b;
        }

        .control-reset {
          --control-color:
            #a879ff;
        }

        @keyframes led-blink {
          0%,
          100% {
            opacity: 1;
          }

          50% {
            opacity: 0.15;
          }
        }

        @keyframes led-orbit {
          0% {
            transform:
              rotate(-28deg);
          }

          100% {
            transform:
              rotate(20deg);
          }
        }

        @media (
          max-width: 520px
        ) {
          .nova-card {
            padding: 18px;
          }

          .title {
            font-size: 22px;
          }

          .status-badge {
            /* Narrow screens: keep the pills uniform but let them shrink, and
               drop the desktop floor so a long status cannot overflow the card.
               A max-width here alone would fight the desktop min-width. */
            min-width: 118px;
            max-width: 48%;
            padding: 7px 10px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .robot-area {
            min-height: 285px;
          }

          .system-status-bar {
            padding: 7px 5px;
          }

          .system-chip {
            padding: 5px 7px;
          }

          .system-chip-icon {
            width: 20px;
            height: 20px;
          }

          .desktop-chip-content {
            display: none;
          }

          .mobile-chip-content {
            display: inline-flex;
          }

          .chip-value {
            max-width: 54px;
            font-size: 10px;
          }

          .visit-card,
          .cats-card,
          .details,
          .controls-card {
            padding: 16px;
          }

          .cat-image,
          .cat-placeholder {
            width: 64px;
            height: 64px;
            border-radius: 17px;
          }

          .cat-name {
            font-size: 18px;
          }

          .visit-top {
            display: block;
          }

          .visit-time {
            margin-top: 3px;
          }

          .cats-grid {
            display: flex;
            overflow-x: auto;
            gap: 11px;
            padding-bottom: 5px;
            scroll-snap-type:
              x mandatory;
            scrollbar-width: thin;
          }

          .cat-profile {
            flex: 0 0 145px;
            scroll-snap-align: start;
          }

          .profile-image,
          .profile-placeholder {
            width: 68px;
            height: 68px;
          }

          .profile-name {
            font-size: 16px;
          }

          .profile-weight {
            font-size: 18px;
          }

          .level {
            padding-left: 13px;
            padding-right: 13px;
          }

          .level-value-row {
            display: block;
          }

          .level-state {
            margin-top: 6px;
          }

          .level-value {
            font-size: 24px;
          }

          .controls-grid {
            gap: 8px;
          }

          .control-button {
            min-height: 74px;
            padding: 10px 5px;
          }

          .control-icon {
            width: 25px;
            height: 25px;
          }

          .control-label {
            font-size: 11px;
          }
        }
      </style>

      <ha-card>
        <div class="nova-card">
          <div class="header">
            <div>
              <h2 class="title">
                ${e}
              </h2>

              ${T ? `
                    <div
                      class="firmware-subtitle"
                    >
                      Firmware
                      ${T}
                    </div>
                  ` : ""}
            </div>

            <div class="status-badge">
              <span
                class="status-dot"
                style="
                  background: ${S};
                  box-shadow: ${w};
                "
              ></span>

              <span>
                ${x}
              </span>
            </div>
          </div>

          ${m ? `
                <div class="robot-area">
                  <div
                    class="robot-image-wrap"
                  >
                    <img
                      class="robot-base"
                      src="/local/nova-ui/litter-robot.png"
                      alt="${e}"
                    />

                    <div
                      class="
                        led
                        led-main
                        ${b.mainMode}
                      "
                      style="
                        background: ${b.mainColor};
                        filter: ${C(b.mainColor)};
                      "
                    ></div>

                    <div
                      class="
                        led
                        led-small
                        ${b.smallMode}
                      "
                      style="
                        background: ${b.smallColor};
                        filter: ${C(b.smallColor)};
                      "
                    ></div>
                  </div>
                </div>
              ` : ""}

          ${f && X ? `
                <section
                  class="system-status-bar"
                >
                  ${X}
                </section>
              ` : ""}

          <section class="visit-card">
            <div class="section-title">
              Last visit
            </div>

            <div class="visit-content">
              ${z}

              <div class="visit-info">
                <div class="visit-top">
                  <div class="cat-name">
                    ${F}
                  </div>

                  <div class="visit-time">
                    ${R}
                  </div>
                </div>

                <div class="visit-weight">
                  ${I}
                </div>

                <div class="visit-count">
                  ${L}
                </div>
              </div>
            </div>
          </section>

          ${h ? `
                <section class="cats-card">
                  <div class="section-title">
                    Our cats
                  </div>

                  <div class="cats-grid">
                    ${B || "\n                        <div class=\"empty-cats\">\n                          No cats\n                          configured\n                        </div>\n                      "}
                  </div>
                </section>
              ` : ""}

          <section class="details">
            <div class="levels">
              <div class="level">
                <div class="level-head">
                  <div
                    class="level-icon"
                  >
                    ◌
                  </div>

                  <div
                    class="level-name"
                  >
                    Litter
                  </div>
                </div>

                <div
                  class="
                    level-value-row
                  "
                >
                  <div
                    class="level-value"
                  >
                    ${O}
                  </div>

                  <div
                    class="level-state"
                  >
                    ${this.getLevelText(E, "litter")}
                  </div>
                </div>

                <div class="progress">
                  <div
                    class="
                      progress-fill
                      progress-litter
                    "
                    style="width: ${A}%;"
                  ></div>
                </div>
              </div>

              <div class="level">
                <div class="level-head">
                  <div
                    class="level-icon"
                  >
                    ▱
                  </div>

                  <div
                    class="level-name"
                  >
                    Waste drawer
                  </div>
                </div>

                <div
                  class="
                    level-value-row
                  "
                >
                  <div
                    class="level-value"
                  >
                    ${k}
                  </div>

                  <div
                    class="level-state"
                  >
                    ${this.getLevelText(D, "waste")}
                  </div>
                </div>

                <div class="progress">
                  <div
                    class="
                      progress-fill
                      progress-waste
                    "
                    style="width: ${j}%;"
                  ></div>
                </div>
              </div>
            </div>
          </section>

          ${p ? `
                <section
                  class="controls-card"
                >
                  <div
                    class="controls-grid"
                  >
                    <button
                      class="
                        control-button
                        control-start
                      "
                      type="button"
                      data-action="start"
                      ${J ? "" : "disabled"}
                    >
                      <ha-icon
                        class="control-icon"
                        icon="mdi:play-circle-outline"
                      ></ha-icon>

                      <span
                        class="control-label"
                      >
                        Clean
                      </span>
                    </button>

                    <button
                      class="
                        control-button
                        control-stop
                      "
                      type="button"
                      data-action="stop"
                      ${J ? "" : "disabled"}
                    >
                      <ha-icon
                        class="control-icon"
                        icon="mdi:stop-circle-outline"
                      ></ha-icon>

                      <span
                        class="control-label"
                      >
                        Stop
                      </span>
                    </button>

                    <button
                      class="
                        control-button
                        control-reset
                      "
                      type="button"
                      data-action="reset"
                      ${Y ? "" : "disabled"}
                    >
                      <ha-icon
                        class="control-icon"
                        icon="mdi:restore"
                      ></ha-icon>

                      <span
                        class="control-label"
                      >
                        Reset
                      </span>
                    </button>
                  </div>
                </section>
              ` : ""}
        </div>
      </ha-card>
    `, this.attachStatusChipEvents(), this.attachControlEvents();
	}
	getCardSize() {
		return 12;
	}
	static getStubConfig() {
		return {
			type: "custom:ha-litter-robot-card",
			name: "Litter-Robot 4",
			entity: "sensor.cleany_statuscode",
			sleep_entity: "binary_sensor.cleany_ruhemodus",
			power_entity: "binary_sensor.cleany_stromversorgung",
			cycles_entity: "sensor.cleany_gesamtzyklen",
			cycle_delay_entity: "select.cleany_wartezeit_fur_den_reinigungszyklus_in_minuten",
			globe_light_entity: "select.cleany_globe_beleuchtung",
			globe_brightness_entity: "select.cleany_globe_helligkeit",
			firmware_entity: "update.cleany_firmware",
			last_pet_weight_entity: "sensor.cleany_gewicht_des_haustiers",
			cat_match_tolerance_lbs: 1,
			show_status_bar: !0,
			status_bar_mode: "values",
			status_bar_mobile_mode: "icons",
			show_controls: !0,
			vacuum_entity: "vacuum.cleany_katzenklo",
			reset_button_entity: "button.cleany_zurucksetzen",
			confirm_reset: !0,
			hopper_status_entity: "sensor.cleany_hopper_status",
			hopper_connected_entity: "binary_sensor.cleany_hopper_verbunden",
			cats: [
				{
					name: "Feivel",
					weight_entity: "sensor.feivel_gewicht",
					visits_entity: "sensor.feivel_heutige_besuche"
				},
				{
					name: "Puschel",
					weight_entity: "sensor.puschel_gewicht",
					visits_entity: "sensor.puschel_heutige_besuche"
				},
				{
					name: "Schlumi",
					weight_entity: "sensor.schlumi_gewicht",
					visits_entity: "sensor.schlumi_heutige_besuche"
				}
			]
		};
	}
};
customElements.get("ha-litter-robot-card") || customElements.define("ha-litter-robot-card", e), window.customCards = window.customCards || [], window.customCards.push({
	type: "ha-litter-robot-card",
	name: "Nova UI – Litter-Robot Card (English)",
	description: "A premium Litter-Robot 4 card for Home Assistant. English translation of smokedropp23/ha-litter-robot-card.",
	preview: !0
});
//#endregion

//# sourceMappingURL=ha-litter-robot-card.js.map