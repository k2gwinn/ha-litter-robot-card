export {};

type LedMode = "off" | "solid" | "blink" | "orbit";
type StatusBarMode = "icons" | "values" | "labels";

interface LedDisplay {
  mainColor: string;
  mainMode: LedMode;
  smallColor: string;
  smallMode: LedMode;
}

interface CatConfig {
  name: string;
  weight_entity: string;
  visits_entity: string;
  image?: string;
}

interface LitterRobotCardConfig {
  type: string;
  name?: string;

  entity?: string;
  sleep_entity?: string;

  litter_entity?: string;
  waste_entity?: string;

  last_pet_weight_entity?: string;
  cat_match_tolerance_lbs?: number;

  cats?: CatConfig[];

  show_status_bar?: boolean;
  status_bar_mode?: StatusBarMode;
  status_bar_mobile_mode?: StatusBarMode;

  // Hides the large Litter-Robot photo and its LED overlay. The status is still
  // carried by the status badge, so this only costs the decorative visual --
  // useful when several cards share one view and vertical space is tight.
  show_device_image?: boolean;

  power_entity?: string;
  cycles_entity?: string;
  cycle_delay_entity?: string;
  globe_light_entity?: string;
  globe_brightness_entity?: string;
  firmware_entity?: string;

  hopper_status_entity?: string;
  hopper_connected_entity?: string;

  show_controls?: boolean;
  vacuum_entity?: string;
  reset_button_entity?: string;
  confirm_reset?: boolean;
}

interface HomeAssistantState {
  state: string;
  last_changed?: string;
  last_updated?: string;
  attributes?: Record<string, unknown>;
}

interface HomeAssistant {
  states: Record<string, HomeAssistantState>;

  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ): Promise<unknown>;
}

interface CatData {
  name: string;
  image?: string;
  weightLbs: number | null;
  visits: number | null;
  differenceLbs: number;
}

interface StatusChip {
  icon: string;
  label: string;
  value: string;
  color: string;
  title: string;
  available: boolean;
  entityId?: string;
}

class HaLitterRobotCard extends HTMLElement {
  private config?: LitterRobotCardConfig;
  private _hass?: HomeAssistant;

  public setConfig(
    config: LitterRobotCardConfig,
  ): void {
    if (!config) {
      throw new Error(
        "Invalid card configuration",
      );
    }

    this.config = config;
    this.renderCard();
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;

    if (this.config) {
      this.renderCard();
    }
  }

  public connectedCallback(): void {
    if (this.config) {
      this.renderCard();
    }
  }

  private getEntity(
    entityId?: string,
  ): HomeAssistantState | undefined {
    if (!entityId) {
      return undefined;
    }

    return this._hass?.states[entityId];
  }

  private getState(entityId?: string): string {
    return (
      this.getEntity(entityId)?.state ??
      "unknown"
    );
  }

  private getEntityAttribute(
    entityId: string | undefined,
    attributeName: string,
  ): unknown {
    return this.getEntity(entityId)?.attributes?.[
      attributeName
    ];
  }

  private isAvailable(entityId?: string): boolean {
    if (!entityId) {
      return false;
    }

    const state = this.getState(entityId);

    return (
      state !== "unknown" &&
      state !== "unavailable" &&
      state !== ""
    );
  }

  private getNumber(
    entityId?: string,
  ): number | null {
    const state = this.getState(entityId);

    if (
      state === "unknown" ||
      state === "unavailable" ||
      state === ""
    ) {
      return null;
    }

    const parsedValue = Number.parseFloat(
      state.replace(",", "."),
    );

    return Number.isNaN(parsedValue)
      ? null
      : parsedValue;
  }

  private getPercentage(
    entityId?: string,
  ): number | null {
    const value = this.getNumber(entityId);

    if (value === null) {
      return null;
    }

    return Math.min(
      100,
      Math.max(0, value),
    );
  }

  private getLedDisplay(
    status: string,
    sleepModeActive: boolean,
  ): LedDisplay {
    if (sleepModeActive) {
      return {
        mainColor: "#8b5cf6",
        mainMode: "solid",
        smallColor: "transparent",
        smallMode: "off",
      };
    }

    switch (status) {
      case "rdy":
        return {
          mainColor: "#2388ff",
          mainMode: "solid",
          smallColor: "transparent",
          smallMode: "off",
        };

      case "ccp":
        return {
          mainColor: "transparent",
          mainMode: "off",
          smallColor: "#ffd028",
          smallMode: "orbit",
        };

      case "cd":
      case "cst":
        return {
          mainColor: "#ff3157",
          mainMode: "solid",
          smallColor: "transparent",
          smallMode: "off",
        };

      case "dfs":
        return {
          mainColor: "#2388ff",
          mainMode: "blink",
          smallColor: "transparent",
          smallMode: "off",
        };

      case "p":
      case "pd":
        return {
          mainColor: "#ffd028",
          mainMode: "solid",
          smallColor: "transparent",
          smallMode: "off",
        };

      case "off":
      case "offline":
        return {
          mainColor: "transparent",
          mainMode: "off",
          smallColor: "transparent",
          smallMode: "off",
        };

      default:
        return {
          mainColor: "#8a8a8a",
          mainMode: "solid",
          smallColor: "transparent",
          smallMode: "off",
        };
    }
  }

  private getStatusText(
    status: string,
  ): string {
    switch (status) {
      case "rdy":
        return "Ready";

      case "ccp":
        return "Cleaning";

      case "cd":
        return "Cat detected";

      case "cst":
        return "Settling after visit";

      case "dfs":
        return "Waste drawer full";

      case "p":
      case "pd":
        return "Paused";

      case "off":
        return "Powered off";

      case "offline":
        return "Offline";

      default:
        return status === "unknown"
          ? "Status unknown"
          : status.toUpperCase();
    }
  }

  private getStatusColor(
    status: string,
  ): string {
    switch (status) {
      case "rdy":
        return "#2388ff";

      case "ccp":
      case "p":
      case "pd":
        return "#ffd028";

      case "cd":
      case "cst":
        return "#ff3157";

      // Drawer full is a "go deal with this now" state, so it reads red rather
      // than the amber upstream used.
      case "dfs":
        return "#ff3157";

      // Dim grey, and rendered without a glow, so an off box looks unlit
      // rather than lit-but-grey.
      case "off":
      case "offline":
        return "#5c6370";

      default:
        return "#8a8a8a";
    }
  }

  private formatPounds(
    pounds: number | null,
  ): string {
    if (pounds === null) {
      return "–";
    }

    return `${pounds.toFixed(2)} lbs`;
  }

  private formatVisits(
    visits: number | null,
  ): string {
    if (visits === null) {
      return "No visit data";
    }

    const roundedVisits =
      Math.round(visits);

    if (roundedVisits === 0) {
      return "No visits today";
    }

    if (roundedVisits === 1) {
      return "1 visit today";
    }

    return `${roundedVisits} visits today`;
  }

  private formatRelativeTime(
    dateValue?: string,
  ): string {
    if (!dateValue) {
      return "Time unknown";
    }

    const timestamp =
      new Date(dateValue).getTime();

    if (Number.isNaN(timestamp)) {
      return "Time unknown";
    }

    const differenceSeconds = Math.max(
      0,
      Math.floor(
        (Date.now() - timestamp) / 1000,
      ),
    );

    if (differenceSeconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(
      differenceSeconds / 60,
    );

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours = Math.floor(
      minutes / 60,
    );

    if (hours < 24) {
      return hours === 1
        ? "1 hr ago"
        : `${hours} hrs ago`;
    }

    const days = Math.floor(
      hours / 24,
    );

    return days === 1
      ? "1 day ago"
      : `${days} days ago`;
  }

  private getLastDetectedCat(
    lastWeightLbs: number | null,
  ): CatData | null {
    if (
      lastWeightLbs === null ||
      !this.config?.cats?.length
    ) {
      return null;
    }

    const cats: CatData[] =
      this.config.cats
        .map((cat) => {
          const weightLbs =
            this.getNumber(
              cat.weight_entity,
            );

          const visits =
            this.getNumber(
              cat.visits_entity,
            );

          return {
            name: cat.name,
            image: cat.image,
            weightLbs,
            visits,
            differenceLbs:
              weightLbs === null
                ? Number.POSITIVE_INFINITY
                : Math.abs(
                    lastWeightLbs -
                      weightLbs,
                  ),
          };
        })
        .sort(
          (first, second) =>
            first.differenceLbs -
            second.differenceLbs,
        );

    const closestCat = cats[0];

    const tolerance =
      this.config
        .cat_match_tolerance_lbs ?? 1;

    if (
      !closestCat ||
      closestCat.differenceLbs >
        tolerance
    ) {
      return null;
    }

    return closestCat;
  }

  private getLevelText(
    value: number | null,
    type: "litter" | "waste",
  ): string {
    if (value === null) {
      return "No data";
    }

    if (type === "litter") {
      if (value >= 60) {
        return "Plenty left";
      }

      if (value >= 30) {
        return "Running low";
      }

      return "Refill needed";
    }

    if (value < 50) {
      return "Still fine";
    }

    if (value < 80) {
      return "Empty soon";
    }

    return "Empty now";
  }

  private formatSelectValue(
    value: string,
  ): string {
    if (
      value === "unknown" ||
      value === "unavailable" ||
      value === ""
    ) {
      return "–";
    }

    const translations:
      Record<string, string> = {
        on: "On",
        off: "Off",
        auto: "Auto",
        low: "Low",
        medium: "Medium",
        high: "High",
        dim: "Dim",
        bright: "Bright",
      };

    const normalized =
      value.toLowerCase();

    return (
      translations[normalized] ??
      value
    );
  }

  private getCompactLightValue(
    lightState: string,
    brightnessState: string,
  ): string {
    const light =
      this.formatSelectValue(
        lightState,
      );

    const brightness =
      this.formatSelectValue(
        brightnessState,
      );

    if (light !== "–") {
      return light;
    }

    if (brightness !== "–") {
      return brightness;
    }

    return "–";
  }

  private formatDelay(
    value: string,
    compact = false,
  ): string {
    if (
      value === "unknown" ||
      value === "unavailable" ||
      value === ""
    ) {
      return "–";
    }

    const match = value.match(
      /-?\d+(?:[.,]\d+)?/,
    );

    if (!match) {
      return value;
    }

    const numericValue = match[0];

    return compact
      ? numericValue
      : `${numericValue} min`;
  }

  private getFirmwareVersion(
    entityId?: string,
  ): string {
    if (!entityId) {
      return "";
    }

    const attributeNames = [
      "installed_version",
      "current_version",
      "version",
      "latest_version",
    ];

    for (
      const attributeName
      of attributeNames
    ) {
      const value =
        this.getEntityAttribute(
          entityId,
          attributeName,
        );

      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }

    const state =
      this.getState(entityId);

    if (
      state !== "unknown" &&
      state !== "unavailable" &&
      state !== "on" &&
      state !== "off"
    ) {
      return state;
    }

    return "";
  }

  private renderChipContent(
    chip: StatusChip,
    mode: StatusBarMode,
  ): string {
    if (mode === "icons") {
      return "";
    }

    if (mode === "values") {
      return `
        <span class="chip-value">
          ${chip.value}
        </span>
      `;
    }

    return `
      <span class="chip-text">
        <span class="chip-label">
          ${chip.label}
        </span>

        <span class="chip-value">
          ${chip.value}
        </span>
      </span>
    `;
  }

  private renderStatusChip(
    chip: StatusChip,
    desktopMode: StatusBarMode,
    mobileMode: StatusBarMode,
  ): string {
    if (!chip.available) {
      return "";
    }

    const interactiveClass =
      chip.entityId
        ? "system-chip-interactive"
        : "";

    const entityAttribute =
      chip.entityId
        ? `data-entity="${chip.entityId}"`
        : "";

    return `
      <div
        class="system-chip ${interactiveClass}"
        title="${chip.title}"
        style="--chip-color: ${chip.color};"
        ${entityAttribute}
        role="${chip.entityId ? "button" : "presentation"}"
        tabindex="${chip.entityId ? "0" : "-1"}"
      >
        <ha-icon
          class="system-chip-icon"
          icon="${chip.icon}"
        ></ha-icon>

        <span class="desktop-chip-content">
          ${this.renderChipContent(
            chip,
            desktopMode,
          )}
        </span>

        <span class="mobile-chip-content">
          ${this.renderChipContent(
            chip,
            mobileMode,
          )}
        </span>
      </div>
    `;
  }

  private async callService(
    domain: string,
    service: string,
    entityId: string,
  ): Promise<void> {
    if (!this._hass) {
      return;
    }

    try {
      await this._hass.callService(
        domain,
        service,
        {
          entity_id: entityId,
        },
      );
    } catch (error) {
      console.error(
        `Nova UI: service ${domain}.${service} could not be called.`,
        error,
      );
    }
  }

  private attachStatusChipEvents(): void {
    const chips =
      this.querySelectorAll<HTMLElement>(
        ".system-chip[data-entity]",
      );

    const openMoreInfo = (
      chip: HTMLElement,
    ): void => {
      const entityId =
        chip.dataset.entity;

      if (!entityId) {
        return;
      }

      this.dispatchEvent(
        new CustomEvent(
          "hass-more-info",
          {
            detail: {
              entityId,
            },
            bubbles: true,
            composed: true,
          },
        ),
      );
    };

    chips.forEach((chip) => {
      chip.addEventListener(
        "click",
        () => {
          openMoreInfo(chip);
        },
      );

      chip.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key !== "Enter" &&
            event.key !== " "
          ) {
            return;
          }

          event.preventDefault();

          openMoreInfo(chip);
        },
      );
    });
  }

  private attachControlEvents(): void {
    const vacuumEntity =
      this.config?.vacuum_entity ??
      "vacuum.cleany_katzenklo";

    const resetButtonEntity =
      this.config?.reset_button_entity ??
      "button.cleany_zurucksetzen";

    const startButton =
      this.querySelector<HTMLButtonElement>(
        '[data-action="start"]',
      );

    const stopButton =
      this.querySelector<HTMLButtonElement>(
        '[data-action="stop"]',
      );

    const resetButton =
      this.querySelector<HTMLButtonElement>(
        '[data-action="reset"]',
      );

    startButton?.addEventListener(
      "click",
      async () => {
        await this.callService(
          "vacuum",
          "start",
          vacuumEntity,
        );
      },
    );

    stopButton?.addEventListener(
      "click",
      async () => {
        await this.callService(
          "vacuum",
          "stop",
          vacuumEntity,
        );
      },
    );

    resetButton?.addEventListener(
      "click",
      async () => {
        const confirmReset =
          this.config?.confirm_reset ??
          true;

        if (
          confirmReset &&
          !window.confirm(
            "Really reset the Litter-Robot?",
          )
        ) {
          return;
        }

        await this.callService(
          "button",
          "press",
          resetButtonEntity,
        );
      },
    );
  }

  private renderCard(): void {
    const name =
      this.config?.name ??
      "Litter-Robot 4";

    const statusEntity =
      this.config?.entity ??
      "sensor.cleany_statuscode";

    const sleepEntity =
      this.config?.sleep_entity ??
      "binary_sensor.cleany_ruhemodus";

    const powerEntity =
      this.config?.power_entity ??
      "binary_sensor.cleany_stromversorgung";

    const cyclesEntity =
      this.config?.cycles_entity ??
      "sensor.cleany_gesamtzyklen";

    const cycleDelayEntity =
      this.config
        ?.cycle_delay_entity ??
      "select.cleany_wartezeit_fur_den_reinigungszyklus_in_minuten";

    const globeLightEntity =
      this.config
        ?.globe_light_entity ??
      "select.cleany_globe_beleuchtung";

    const globeBrightnessEntity =
      this.config
        ?.globe_brightness_entity ??
      "select.cleany_globe_helligkeit";

    const firmwareEntity =
      this.config?.firmware_entity ??
      "update.cleany_firmware";

    const lastPetWeightEntity =
      this.config
        ?.last_pet_weight_entity ??
      "sensor.cleany_gewicht_des_haustiers";

    const vacuumEntity =
      this.config?.vacuum_entity ??
      "vacuum.cleany_katzenklo";

    const resetButtonEntity =
      this.config?.reset_button_entity ??
      "button.cleany_zurucksetzen";

    const showStatusBar =
      this.config
        ?.show_status_bar ?? true;

    const showControls =
      this.config
        ?.show_controls ?? true;

    const showDeviceImage =
      this.config
        ?.show_device_image ?? true;

    const desktopStatusMode =
      this.config
        ?.status_bar_mode ??
      "values";

    const mobileStatusMode =
      this.config
        ?.status_bar_mobile_mode ??
      "icons";

    const status =
      this.getState(statusEntity);

    const sleepModeActive =
      this.getState(sleepEntity) ===
      "on";

    const display =
      this.getLedDisplay(
        status,
        sleepModeActive,
      );

    const statusText =
      sleepModeActive
        ? "Sleep mode"
        : this.getStatusText(status);

    const statusColor =
      sleepModeActive
        ? "#8b5cf6"
        : this.getStatusColor(status);

    // A transparent LED is an unlit one; giving it a drop-shadow paints a halo
    // around nothing, so those get no filter.
    const ledGlow = (color: string) =>
      color === "transparent"
        ? "none"
        : `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 12px ${color})`;

    // A powered-off or offline box should read as an unlit lamp, so it gets no
    // glow at all -- the halo is what makes the other states look "on".
    const statusGlow =
      !sleepModeActive &&
      (status === "off" ||
        status === "offline")
        ? "none"
        : `0 0 10px ${statusColor}`;

    const firmwareVersion =
      this.getFirmwareVersion(
        firmwareEntity,
      );

    const litterValue =
      this.getPercentage(
        this.config?.litter_entity,
      );

    const wasteValue =
      this.getPercentage(
        this.config?.waste_entity,
      );

    const litterDisplay =
      litterValue === null
        ? "–"
        : `${Math.round(
            litterValue,
          )} %`;

    const wasteDisplay =
      wasteValue === null
        ? "–"
        : `${Math.round(
            wasteValue,
          )} %`;

    const litterBar =
      litterValue ?? 0;

    const wasteBar =
      wasteValue ?? 0;

    const lastPetWeight =
      this.getNumber(
        lastPetWeightEntity,
      );

    const lastPetEntity =
      this.getEntity(
        lastPetWeightEntity,
      );

    const matchedCat =
      this.getLastDetectedCat(
        lastPetWeight,
      );

    const lastVisitName =
      matchedCat?.name ??
      "Unknown cat";

    const lastVisitWeight =
      this.formatPounds(
        lastPetWeight,
      );

    const lastVisitVisits =
      matchedCat
        ? this.formatVisits(
            matchedCat.visits,
          )
        : "No clear match";

    const lastVisitTime =
      this.formatRelativeTime(
        lastPetEntity?.last_updated,
      );

    const catVisual =
      matchedCat?.image
        ? `
          <img
            class="cat-image"
            src="${matchedCat.image}"
            alt="${matchedCat.name}"
          />
        `
        : `
          <div class="cat-placeholder">
            🐈
          </div>
        `;

    const catsMarkup =
      (
        this.config?.cats ?? []
      )
        .map((cat, index) => {
          const weightLbs =
            this.getNumber(
              cat.weight_entity,
            );

          const visits =
            this.getNumber(
              cat.visits_entity,
            );

          const weightDisplay =
            this.formatPounds(
              weightLbs,
            );

          const visitsDisplay =
            this.formatVisits(
              visits,
            );

          const picture =
            cat.image
              ? `
                <img
                  class="profile-image"
                  src="${cat.image}"
                  alt="${cat.name}"
                />
              `
              : `
                <div
                  class="profile-placeholder"
                >
                  🐈
                </div>
              `;

          const accentClass =
            `cat-accent-${
              (index % 3) + 1
            }`;

          return `
            <article
              class="
                cat-profile
                ${accentClass}
              "
            >
              ${picture}

              <div class="profile-name">
                ${cat.name}
              </div>

              <div class="profile-weight">
                ${weightDisplay}
              </div>

              <div class="profile-visits">
                ${visitsDisplay}
              </div>
            </article>
          `;
        })
        .join("");

    const powerState =
      this.getState(powerEntity);

    const cyclesValue =
      this.getNumber(cyclesEntity);

    const delayState =
      this.getState(
        cycleDelayEntity,
      );

    const globeLightState =
      this.getState(
        globeLightEntity,
      );

    const globeBrightnessState =
      this.getState(
        globeBrightnessEntity,
      );

    const powerConnected =
      powerState === "on";

    const lightValue =
      this.getCompactLightValue(
        globeLightState,
        globeBrightnessState,
      );

    const vacuumAvailable =
      this.isAvailable(vacuumEntity);

    const resetAvailable =
      this.isAvailable(
        resetButtonEntity,
      );

    const statusChips:
      StatusChip[] = [
        {
          icon: powerConnected
            ? "mdi:power-plug"
            : "mdi:power-plug-off",
          label: "Power",
          value: powerConnected
            ? "On"
            : "Off",
          color: powerConnected
            ? "#62df76"
            : "#ff5c6c",
          title: powerConnected
            ? "Power connected"
            : "Power disconnected",
          available:
            this.isAvailable(
              powerEntity,
            ),
        entityId: powerEntity,
        },
        {
          icon:
            "mdi:moon-waning-crescent",
          label: "Sleep",
          value: sleepModeActive
            ? "On"
            : "Off",
          color: sleepModeActive
            ? "#a879ff"
            : "#818ca0",
          title: sleepModeActive
            ? "Sleep mode on"
            : "Sleep mode off",
          available:
            this.isAvailable(
              sleepEntity,
            ),
        entityId: sleepEntity,
        },
        {
          icon: "mdi:sync",
          label: "Cycles",
          value:
            cyclesValue === null
              ? "–"
              : `${Math.round(
                  cyclesValue,
                )}`,
          color: "#2f9cff",
          title:
            "Total number of clean cycles",
          available:
            this.isAvailable(
              cyclesEntity,
            ),
        entityId: cyclesEntity,
        },
        {
          icon: "mdi:clock-outline",
          label: "Wait",
          value: this.formatDelay(
            delayState,
            desktopStatusMode !==
              "labels",
          ),
          color: "#ffbd24",
          title:
            "Wait time before the clean cycle",
          available:
            this.isAvailable(
              cycleDelayEntity,
            ),
        entityId: cycleDelayEntity,
        },
        {
          icon: "mdi:lightbulb-outline",
          label: "Light",
          value: lightValue,
          color: "#ffd02f",
          title:
            "Globe light and brightness",
          available:
            this.isAvailable(
              globeLightEntity,
            ) ||
            this.isAvailable(
              globeBrightnessEntity,
            ),
        entityId: globeLightEntity,
        },
      ];

    const statusBarMarkup =
      statusChips
        .map((chip) =>
          this.renderStatusChip(
            chip,
            desktopStatusMode,
            mobileStatusMode,
          ),
        )
        .join("");

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

        .progress-litter {
          width:
            ${litterBar}%;
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
          width:
            ${wasteBar}%;
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
                ${name}
              </h2>

              ${
                firmwareVersion
                  ? `
                    <div
                      class="firmware-subtitle"
                    >
                      Firmware
                      ${firmwareVersion}
                    </div>
                  `
                  : ""
              }
            </div>

            <div class="status-badge">
              <span
                class="status-dot"
                style="
                  background: ${statusColor};
                  box-shadow: ${statusGlow};
                "
              ></span>

              <span>
                ${statusText}
              </span>
            </div>
          </div>

          ${
            showDeviceImage
              ? `
                <div class="robot-area">
                  <div
                    class="robot-image-wrap"
                  >
                    <img
                      class="robot-base"
                      src="/local/nova-ui/litter-robot.png"
                      alt="${name}"
                    />

                    <div
                      class="
                        led
                        led-main
                        ${display.mainMode}
                      "
                      style="
                        background: ${display.mainColor};
                        filter: ${ledGlow(display.mainColor)};
                      "
                    ></div>

                    <div
                      class="
                        led
                        led-small
                        ${display.smallMode}
                      "
                      style="
                        background: ${display.smallColor};
                        filter: ${ledGlow(display.smallColor)};
                      "
                    ></div>
                  </div>
                </div>
              `
              : ""
          }

          ${
            showStatusBar &&
            statusBarMarkup
              ? `
                <section
                  class="system-status-bar"
                >
                  ${statusBarMarkup}
                </section>
              `
              : ""
          }

          <section class="visit-card">
            <div class="section-title">
              Last visit
            </div>

            <div class="visit-content">
              ${catVisual}

              <div class="visit-info">
                <div class="visit-top">
                  <div class="cat-name">
                    ${lastVisitName}
                  </div>

                  <div class="visit-time">
                    ${lastVisitTime}
                  </div>
                </div>

                <div class="visit-weight">
                  ${lastVisitWeight}
                </div>

                <div class="visit-count">
                  ${lastVisitVisits}
                </div>
              </div>
            </div>
          </section>

          <section class="cats-card">
            <div class="section-title">
              Our cats
            </div>

            <div class="cats-grid">
              ${
                catsMarkup ||
                `
                  <div class="empty-cats">
                    No cats
                    configured
                  </div>
                `
              }
            </div>
          </section>

          <section class="details">
            <div class="section-title">
              Litter &amp; waste
            </div>

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
                    ${litterDisplay}
                  </div>

                  <div
                    class="level-state"
                  >
                    ${this.getLevelText(
                      litterValue,
                      "litter",
                    )}
                  </div>
                </div>

                <div class="progress">
                  <div
                    class="
                      progress-fill
                      progress-litter
                    "
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
                    ${wasteDisplay}
                  </div>

                  <div
                    class="level-state"
                  >
                    ${this.getLevelText(
                      wasteValue,
                      "waste",
                    )}
                  </div>
                </div>

                <div class="progress">
                  <div
                    class="
                      progress-fill
                      progress-waste
                    "
                  ></div>
                </div>
              </div>
            </div>
          </section>

          ${
            showControls
              ? `
                <section
                  class="controls-card"
                >
                  <div
                    class="section-title"
                  >
                    Controls
                  </div>

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
                      ${
                        vacuumAvailable
                          ? ""
                          : "disabled"
                      }
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
                      ${
                        vacuumAvailable
                          ? ""
                          : "disabled"
                      }
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
                      ${
                        resetAvailable
                          ? ""
                          : "disabled"
                      }
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
              `
              : ""
          }
        </div>
      </ha-card>
    `;

    this.attachStatusChipEvents();
    this.attachControlEvents();
  }

  public getCardSize(): number {
    return 12;
  }

  public static getStubConfig():
    LitterRobotCardConfig {
    return {
      type:
        "custom:ha-litter-robot-card",

      name: "Litter-Robot 4",

      entity:
        "sensor.cleany_statuscode",

      sleep_entity:
        "binary_sensor.cleany_ruhemodus",

      power_entity:
        "binary_sensor.cleany_stromversorgung",

      cycles_entity:
        "sensor.cleany_gesamtzyklen",

      cycle_delay_entity:
        "select.cleany_wartezeit_fur_den_reinigungszyklus_in_minuten",

      globe_light_entity:
        "select.cleany_globe_beleuchtung",

      globe_brightness_entity:
        "select.cleany_globe_helligkeit",

      firmware_entity:
        "update.cleany_firmware",

      last_pet_weight_entity:
        "sensor.cleany_gewicht_des_haustiers",

      cat_match_tolerance_lbs: 1,

      show_status_bar: true,
      status_bar_mode: "values",
      status_bar_mobile_mode: "icons",

      show_controls: true,

      vacuum_entity:
        "vacuum.cleany_katzenklo",

      reset_button_entity:
        "button.cleany_zurucksetzen",

      confirm_reset: true,

      hopper_status_entity:
        "sensor.cleany_hopper_status",

      hopper_connected_entity:
        "binary_sensor.cleany_hopper_verbunden",

      cats: [
        {
          name: "Feivel",

          weight_entity:
            "sensor.feivel_gewicht",

          visits_entity:
            "sensor.feivel_heutige_besuche",
        },
        {
          name: "Puschel",

          weight_entity:
            "sensor.puschel_gewicht",

          visits_entity:
            "sensor.puschel_heutige_besuche",
        },
        {
          name: "Schlumi",

          weight_entity:
            "sensor.schlumi_gewicht",

          visits_entity:
            "sensor.schlumi_heutige_besuche",
        },
      ],
    };
  }
}

if (
  !customElements.get(
    "ha-litter-robot-card",
  )
) {
  customElements.define(
    "ha-litter-robot-card",
    HaLitterRobotCard,
  );
}

declare global {
  interface Window {
    customCards?: Array<
      Record<string, unknown>
    >;
  }
}

window.customCards =
  window.customCards || [];

window.customCards.push({
  type: "ha-litter-robot-card",
  name:
    "Nova UI – Litter-Robot Card (English)",
  description:
    "A premium Litter-Robot 4 card for Home Assistant. English translation of smokedropp23/ha-litter-robot-card.",
  preview: true,
});