#!/usr/bin/env python3
"""
SLS Packjob → .form Export via PreFormServer API
================================================
Importiert 4 Modelle mit den gewünschten Stückzahlen in PreFormServer,
packt sie automatisch und speichert alle Builds als .form-Dateien.

Voraussetzung: PreFormServer.app unter /Applications/PreFormServer.app
Download: https://support.formlabs.com/s/article/Formlabs-API-downloads-and-release-notes

Ausführen:
  python3 scripts/pack-to-form.py
"""

import os
import sys
import time
import subprocess
import requests

# ─── Konfiguration ────────────────────────────────────────────────────────────

PREFORM_SERVER = "http://localhost:44388"

PREFORM_SERVER_PATH = "/Applications/PreFormServer358/PreFormServer/PreFormServer.app/Contents/MacOS/PreFormServer"

# Ausgabe-Ordner für .form Dateien
OUTPUT_DIR = os.path.expanduser("~/Desktop/SLS-Packjobs")

# Basis-Ordner der openfarm-Modelle
MODELS_DIR = os.path.join(
    os.path.dirname(__file__),
    "..", "data", "models"
)

# Teile-Liste: (Dateiname im models-Ordner, Anzahl)
PARTS = [
    ("1776344326853-Batteriefachdeckel_V1.stl",       40),
    ("1776344327798-2010087860.stp",                  150),
    ("1776344327818-roter_stecker_Final_100__DG.3mf", 400),
    ("1776344327826-lila_stecker_V3_DG.3mf",          400),
]

# Formlabs Fuse 1 SLS Einstellungen
# machine_type für Fuse 1: wird beim Start per API abgefragt falls unbekannt
MACHINE_TYPE  = "PILK-1-0"   # Formlabs Fuse 1
MATERIAL_CODE = "FLP12G01"   # Nylon 12 V1
LAYER_THICKNESS_MM = 0.11    # Standard für Fuse 1

# Mindest-Packdichte in % (nur Warnung, kein Abbruch)
MIN_DENSITY = 30

# ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

def wait_for_server(timeout=30):
    """Wartet bis PreFormServer antwortet."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"{PREFORM_SERVER}/", timeout=2)
            if r.ok:
                print(f"  PreFormServer bereit: {r.json()}")
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


def start_server():
    """Startet PreFormServer falls nicht aktiv."""
    try:
        r = requests.get(f"{PREFORM_SERVER}/", timeout=2)
        if r.ok:
            print(f"PreFormServer läuft bereits: {r.json()}")
            return None
    except Exception:
        pass

    if not os.path.exists(PREFORM_SERVER_PATH):
        print(f"\n✗ PreFormServer nicht gefunden: {PREFORM_SERVER_PATH}")
        print("  Download: https://support.formlabs.com/s/article/Formlabs-API-downloads-and-release-notes")
        sys.exit(1)

    print("PreFormServer wird gestartet...")
    proc = subprocess.Popen(
        [PREFORM_SERVER_PATH],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if not wait_for_server(timeout=60):
        print("✗ PreFormServer antwortet nicht.")
        proc.terminate()
        sys.exit(1)
    return proc


def list_machines():
    """Gibt verfügbare Maschinentypen aus."""
    try:
        r = requests.get(f"{PREFORM_SERVER}/scene-settings/", timeout=5)
        if r.ok:
            data = r.json()
            machines = data.get("machine_types") or data.get("machines") or []
            if machines:
                print("  Verfügbare Maschinen:", machines)
    except Exception:
        pass


def create_scene():
    r = requests.post(f"{PREFORM_SERVER}/scene/", json={
        "machine_type":       MACHINE_TYPE,
        "material_code":      MATERIAL_CODE,
        "layer_thickness_mm": LAYER_THICKNESS_MM,
        "print_setting":      "DEFAULT",
    })
    if not r.ok:
        print(f"  ✗ Szene erstellen fehlgeschlagen: {r.status_code} {r.text}")
        sys.exit(1)
    return r.json()["id"]


def import_model(scene_id, file_path):
    r = requests.post(f"{PREFORM_SERVER}/scene/{scene_id}/import-model/", json={
        "file": os.path.abspath(file_path),
    })
    if not r.ok:
        raise ValueError(f"Import fehlgeschlagen ({r.status_code}): {r.text}")
    return r.json()["id"]


def auto_layout(scene_id):
    """SLS-Packing. Gibt False zurück wenn nicht alle passen."""
    r = requests.post(f"{PREFORM_SERVER}/scene/{scene_id}/auto-pack/", json={
        "model_spacing_mm": 3,
    })
    return r.status_code == 200


def get_utilization(scene_id):
    """Liest Packdichte aus (falls API das liefert)."""
    try:
        r = requests.get(f"{PREFORM_SERVER}/scene/{scene_id}/", timeout=5)
        if r.ok:
            data = r.json()
            return data.get("utilization_percent") or data.get("density_percent")
    except Exception:
        pass
    return None


def save_form(scene_id, path):
    r = requests.post(f"{PREFORM_SERVER}/scene/{scene_id}/save-form/", json={
        "file": path,
    })
    r.raise_for_status()


def delete_model(scene_id, model_id):
    r = requests.delete(f"{PREFORM_SERVER}/scene/{scene_id}/models/{model_id}/")
    r.raise_for_status()


# ─── Hauptprogramm ────────────────────────────────────────────────────────────

def main():
    print("=== SLS Packjob → .form Export ===\n")

    # Ausgabe-Ordner anlegen
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # PreFormServer starten
    server_proc = start_server()

    # Maschinentypen ausgeben (Diagnose)
    list_machines()

    # Alle Teile expandieren: (Dateipfad, model_id_placeholder) × Stückzahl
    queue = []
    for filename, qty in PARTS:
        filepath = os.path.normpath(os.path.join(MODELS_DIR, filename))
        if not os.path.exists(filepath):
            print(f"✗ Datei nicht gefunden: {filepath}")
            sys.exit(1)
        for _ in range(qty):
            queue.append(filepath)

    total = len(queue)
    print(f"\n{total} Teile werden in Builds aufgeteilt:\n")
    for filename, qty in PARTS:
        print(f"  {qty}× {filename}")

    # Batch-Schleife
    batch_num   = 1
    in_batch    = []   # [(model_id, filepath)]
    skipped     = []
    scene_id    = create_scene()
    saved_forms = []

    def save_current_batch():
        nonlocal batch_num, scene_id, in_batch
        form_path = os.path.join(OUTPUT_DIR, f"SLS_Fuse1_Build_{batch_num:02d}.form")
        print(f"\n  → Speichere Build {batch_num} ({len(in_batch)} Teile): {form_path}")
        save_form(scene_id, form_path)
        saved_forms.append((form_path, len(in_batch)))

        util = get_utilization(scene_id)
        if util is not None:
            flag = "✓" if util >= MIN_DENSITY else f"⚠ unter {MIN_DENSITY}%"
            print(f"    Packdichte: {util:.1f}% {flag}")

        batch_num += 1
        in_batch  = []
        scene_id  = create_scene()

    print()
    packed = 0
    while queue:
        filepath = queue.pop(0)
        packed  += 1
        name     = os.path.basename(filepath)
        sys.stdout.write(f"\r  [{packed}/{total}] Importiere {name[:40]}...")
        sys.stdout.flush()

        try:
            model_id = import_model(scene_id, filepath)
        except ValueError as e:
            ext = os.path.splitext(filepath)[1].lower()
            print(f"\n  ⚠ Überspringe {os.path.basename(filepath)}: {e}")
            if ext in (".stp", ".step"):
                print(f"    → STEP-Format nicht unterstützt von PreFormServer. Bitte als STL/3MF exportieren.")
            skipped.append(filepath)
            continue
        in_batch.append((model_id, filepath))

        fits = auto_layout(scene_id)
        if not fits:
            # Letztes Modell passt nicht → aus Build entfernen, Build speichern
            sys.stdout.write("\r")
            delete_model(scene_id, model_id)
            queue.insert(0, filepath)   # zurück in die Schlange
            packed -= 1
            in_batch.pop()

            if not in_batch:
                print(f"\n✗ Ein einzelnes Teil passt nicht in den Bauraum: {name}")
                sys.exit(1)

            save_current_batch()

    # Letzter unvollständiger Build
    if in_batch:
        save_current_batch()

    # Zusammenfassung
    print(f"\n\n=== Fertig ===")
    print(f"{len(saved_forms)} Build(s) gespeichert nach: {OUTPUT_DIR}\n")
    for i, (path, count) in enumerate(saved_forms, 1):
        print(f"  Build {i:02d}: {count:4d} Teile  →  {os.path.basename(path)}")

    if skipped:
        print(f"\n⚠ {len(skipped)} Teile übersprungen (Format nicht unterstützt):")
        seen = set()
        for s in skipped:
            b = os.path.basename(s)
            if b not in seen:
                count = sum(1 for x in skipped if os.path.basename(x) == b)
                print(f"  {count}× {b}")
                seen.add(b)

    if server_proc:
        server_proc.terminate()


if __name__ == "__main__":
    main()
