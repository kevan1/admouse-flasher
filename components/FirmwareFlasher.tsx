"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { KEYBOARD_ACTIONS, MOUSE_ACTIONS, getAction, type ActionId } from "../lib/actions";
import { patchFirmwareConfiguration } from "../lib/firmware-config";
import { flashMicronucleus, type FlashProgress } from "../lib/micronucleus";

type InputMode = "mouse" | "keyboard";
type FlashStatus = "idle" | "working" | "done" | "error";
const INITIAL_ACTION: ActionId = 1;
const KEYBOARD_ROWS: readonly (readonly ActionId[])[] = [[19, 18, 20], [25, 26, 16], [23, 21, 24], [17, 22, 0]];

function MousePicker({ selected, onSelect }: { selected: ActionId; onSelect: (action: ActionId) => void }) {
  return (
    <div className="mouse-picker" aria-label="Acciones del mouse">
      <button type="button" className={`mouse-zone mouse-left ${selected === 1 ? "selected" : ""}`} onClick={() => onSelect(1)} aria-label="Clic izquierdo" aria-pressed={selected === 1}><span>Izquierdo</span></button>
      <button type="button" className={`mouse-zone mouse-right ${selected === 2 ? "selected" : ""}`} onClick={() => onSelect(2)} aria-label="Clic derecho" aria-pressed={selected === 2}><span>Derecho</span></button>
      <button type="button" className={`mouse-wheel ${selected === 3 ? "selected" : ""}`} onClick={() => onSelect(3)} aria-label="Clic de rueda" aria-pressed={selected === 3}><span className="wheel-mark" /><span aria-hidden="true">Rueda</span></button>
      <button type="button" className={`double-click ${selected === 4 ? "selected" : ""}`} onClick={() => onSelect(4)} aria-label="Doble clic izquierdo" aria-pressed={selected === 4}>Doble clic</button>
    </div>
  );
}

function KeyboardPicker({ selected, onSelect }: { selected: ActionId; onSelect: (action: ActionId) => void }) {
  return (
    <div className="keyboard" aria-label="Teclado virtual">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div className="keyboard-row" key={rowIndex}>
          {row.map((actionId) => {
            const action = getAction(actionId);
            return (
              <button type="button" key={action.id} className={`key key-${action.id} ${selected === action.id ? "selected" : ""}`} onClick={() => onSelect(action.id)} aria-label={action.label} aria-pressed={selected === action.id} title={action.label}>
                <span>{action.symbol}</span><small>{action.shortLabel}</small>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function FirmwareFlasher() {
  const [mode, setMode] = useState<InputMode>("mouse");
  const [selectedAction, setSelectedAction] = useState<ActionId>(INITIAL_ACTION);
  const [webUsbSupported, setWebUsbSupported] = useState(true);
  const [secureContext, setSecureContext] = useState(true);
  const [flashStatus, setFlashStatus] = useState<FlashStatus>("idle");
  const [progress, setProgress] = useState<FlashProgress>({ phase: "idle", percentage: 0, message: "Listo para configurar." });

  useEffect(() => {
    setWebUsbSupported("usb" in navigator);
    setSecureContext(window.isSecureContext || window.location.hostname === "localhost");
  }, []);

  const canFlash = webUsbSupported && secureContext && flashStatus !== "working";

  const chooseAction = (action: ActionId) => {
    setSelectedAction(action);
    setFlashStatus("idle");
    setProgress({ phase: "idle", percentage: 0, message: "Configuración actualizada." });
  };

  const startFlash = async () => {
    setFlashStatus("working");
    setProgress({ phase: "connecting", percentage: 2, message: "Buscando el botón AdMouse..." });
    try {
      const response = await fetch("/firmware/admouse-controller.bin", { cache: "no-store" });
      if (!response.ok) throw new Error("No se encontró el firmware base de AdMouse.");
      const baseFirmware = new Uint8Array(await response.arrayBuffer());
      const configuredFirmware = patchFirmwareConfiguration(baseFirmware, selectedAction);
      await flashMicronucleus(configuredFirmware, setProgress);
      setFlashStatus("done");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo configurar el dispositivo.";
      setFlashStatus("error");
      setProgress({ phase: "error", percentage: 0, message });
    }
  };

  return (
    <div className="configurator-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
      <header className="product-header">
        <a href="https://admouse.net/" aria-label="Ir al sitio de AdMouse">
          <Image src="https://admouse.net/img/logoadmousesinfondo.png" alt="AdMouse" width={208} height={75} priority />
        </a>
        <div className="header-copy"><span className="eyebrow">Configurador de botón</span><p>Elegí una acción. Nosotros hacemos el resto.</p></div>
        <span className="private-chip"><span /> Todo sucede en tu computadora</span>
      </header>

      <main className="configurator-card" id="main-content">
        <section className="intro">
          <span className="step-number">1</span>
          <div><h1>¿Qué querés que haga tu botón?</h1><p>Elegí una acción del mouse o una tecla. Podés cambiarla cuando quieras.</p></div>
        </section>

        <div className="workspace-grid" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
          <section className="action-panel">
            <div className="mode-switch" role="group" aria-label="Tipo de acción">
              <button type="button" aria-pressed={mode === "mouse"} className={mode === "mouse" ? "active" : ""} onClick={() => setMode("mouse")}><span className="mode-icon mouse-icon" aria-hidden="true" /> Mouse</button>
              <button type="button" aria-pressed={mode === "keyboard"} className={mode === "keyboard" ? "active" : ""} onClick={() => setMode("keyboard")}><span className="mode-icon keyboard-icon" aria-hidden="true" /> Teclado</button>
            </div>

            <div className="picker-heading">
              <div><span>Configurando tu botón</span><h2>{mode === "mouse" ? "Elegí un clic" : "Elegí una tecla"}</h2></div>
              <span className="current-selection" aria-live="polite">Actual: {getAction(selectedAction).label}</span>
            </div>

            {mode === "mouse" ? <MousePicker selected={selectedAction} onSelect={chooseAction} /> : <KeyboardPicker selected={selectedAction} onSelect={chooseAction} />}

            <div className="quick-actions" aria-label="Acciones disponibles">
              {(mode === "mouse" ? MOUSE_ACTIONS : KEYBOARD_ACTIONS).map((action) => (
                <button type="button" key={action.id} className={selectedAction === action.id ? "selected" : ""} onClick={() => chooseAction(action.id)} aria-label={action.label} aria-pressed={selectedAction === action.id}><span aria-hidden="true">{action.symbol}</span>{action.shortLabel}</button>
              ))}
            </div>
          </section>
        </div>

        <section className="flash-section">
          <div className="flash-heading"><span className="step-number">2</span><div><h2>Conectá y configurá</h2><p>Desenchufá el botón, presioná configurar y volvé a conectarlo cuando Chrome lo solicite.</p></div></div>
          {!webUsbSupported && <p className="support-warning">Abrí esta página en Chrome o Edge desde una computadora.</p>}
          {webUsbSupported && !secureContext && <p className="support-warning">La configuración requiere HTTPS o localhost.</p>}
          <div className="flash-controls">
            <div className="progress-copy" id="flash-status" role="status" aria-live="polite">
              <div className={`status-dot ${flashStatus}`} />
              <div><strong>{progress.message}</strong><small>{flashStatus === "done" ? "Ya podés usar tu botón." : "No desconectes el dispositivo durante la grabación."}</small></div>
            </div>
            <button type="button" className="flash-button" onClick={startFlash} disabled={!canFlash} aria-describedby="flash-status">
              {flashStatus === "working" ? "Configurando..." : flashStatus === "done" ? "Configurar otra vez" : "Configurar mi botón"}<span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="progress-track" aria-hidden="true"><div className="progress-fill" style={{ width: `${progress.percentage}%` }} /></div>
        </section>
      </main>

      <footer className="product-footer"><span>Compatible con AdMouse ATtiny85 + Micronucleus</span><a href="https://admouse.net/">¿Necesitás ayuda?</a></footer>
    </div>
  );
}
