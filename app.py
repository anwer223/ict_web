from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import numpy as np
import time
import threading
import json
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
import re

app = Flask(__name__)
app.config['SECRET_KEY'] = 'aese_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*")

# ============================================================
# CHATBOT TRAINING DATA - Comprehensive Knowledge Base
# ============================================================
question_data = [
    # --- General ---
    ("hello", "greeting"),
    ("hi", "greeting"),
    ("hey", "greeting"),
    ("good morning", "greeting"),
    ("good afternoon", "greeting"),
    ("good evening", "greeting"),
    ("thanks", "greeting"),
    ("thank you", "greeting"),
    ("help", "greeting"),
    
    # --- What is the experiment ---
    ("what is the experiment", "experiment"),
    ("what is this experiment", "experiment"),
    ("explain the experiment", "experiment"),
    ("what is rheographic", "experiment"),
    ("rheographic tank", "experiment"),
    ("what does this do", "experiment"),
    
    # --- Hardware ---
    ("hardware", "hardware"),
    ("components", "hardware"),
    ("what hardware", "hardware"),
    ("stepper motor", "hardware"),
    ("nema17", "hardware"),
    ("esp32", "hardware"),
    ("what is esp32", "hardware"),
    ("microcontroller", "hardware"),
    ("a4988", "hardware"),
    ("driver", "hardware"),
    ("ads1115", "hardware"),
    ("adc", "hardware"),
    ("servo", "hardware"),
    ("mg995", "hardware"),
    ("probe", "hardware"),
    ("brass probe", "hardware"),
    ("rails", "hardware"),
    ("linear rails", "hardware"),
    ("carriage", "hardware"),
    ("electrode", "hardware"),
    ("plates", "hardware"),
    
    # --- Physics ---
    ("physics", "physics"),
    ("electric field", "physics"),
    ("what is electric field", "physics"),
    ("field", "physics"),
    ("equipotential", "physics"),
    ("equipotential lines", "physics"),
    ("voltage", "physics"),
    ("potential", "physics"),
    ("potential difference", "physics"),
    ("field lines", "physics"),
    ("uniform field", "physics"),
    ("parallel plates", "physics"),
    ("capacitor", "physics"),
    ("gradient", "physics"),
    ("e field", "physics"),
    ("electric potential", "physics"),
    ("electrostatic", "physics"),
    ("charge", "physics"),
    ("coulomb", "physics"),
    ("gauss", "physics"),
    ("faraday cage", "physics"),
    
    # --- Measurement ---
    ("measure", "measurement"),
    ("measurement", "measurement"),
    ("voltage measurement", "measurement"),
    ("data acquisition", "measurement"),
    ("reading", "measurement"),
    ("sensor reading", "measurement"),
    ("packet", "measurement"),
    ("data packet", "measurement"),
    
    # --- Controls ---
    ("move", "control"),
    ("movement", "control"),
    ("carriage movement", "control"),
    ("home", "control"),
    ("reset", "control"),
    ("position", "control"),
    ("y position", "control"),
    ("scan", "control"),
    
    # --- Data ---
    ("csv", "data"),
    ("export", "data"),
    ("data export", "data"),
    ("download", "data"),
    ("data table", "data"),
    ("measurements", "data"),
    
    # --- Simulation ---
    ("simulation", "simulation"),
    ("how to use", "simulation"),
    ("controls", "simulation"),
    ("buttons", "simulation"),
    
    # --- Math ---
    ("formula", "math"),
    ("equation", "math"),
    ("v(x)", "math"),
    ("e = v/d", "math"),
    ("calculate", "math"),
]

texts = [q for q, _ in question_data]
labels = [l for _, l in question_data]

vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
X_train = vectorizer.fit_transform(texts)

# Train multiple models and use ensemble voting
models = {
    "random_forest": RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42).fit(X_train, labels),
    "svm": SVC(kernel='linear', probability=True, random_state=42).fit(X_train, labels),
    "knn": KNeighborsClassifier(n_neighbors=3).fit(X_train, labels),
    "decision_tree": DecisionTreeClassifier(max_depth=8, random_state=42).fit(X_train, labels),
    "logistic": LogisticRegression(max_iter=200, random_state=42).fit(X_train, labels)
}

print("AI models trained successfully!")

# ============================================================
# COMPREHENSIVE ANSWER DATABASE
# ============================================================
def get_answer(intent):
    answers = {
        'greeting': """Hello! I'm your AESE simulation assistant. I can help you understand:
- What the experiment is and how it works
- The hardware components (ESP32, steppers, ADC, probes)
- The physics of electric fields and equipotential lines
- How to use the simulation controls
- How to export and analyze data

Feel free to ask me anything about the experiment.""",

        'experiment': """The rheographic tank experiment maps electric fields between two charged plates.

How it works:
1. Two metal plates are placed in a tank of conductive water.
2. The left plate is at +12V, the right plate at 0V.
3. A carriage with five probes moves across the tank.
4. Each probe measures the voltage at its position.
5. By measuring at many points, we create a 2D map of the electric potential.

The result shows equipotential lines (same voltage) and the electric field direction.
The field is uniform between parallel plates: E = V/d = 1.2 V/cm.""",

        'hardware': """The system uses these main components:

ESP32: The main microcontroller. It reads sensors, controls motors, and sends data.

NEMA17 Stepper Motors (2x): Provide precise linear motion for the carriage.
A4988 Drivers (2x): Control the stepper motors using STEP/DIR signals.

ADS1115 ADC: A 16-bit analog-to-digital converter that reads voltages from the five probes with high precision.

MG995 Servo: Lifts and lowers the probes into the water.

5 Brass Probes: Measure voltage at different X positions.
They are mounted on the carriage at: -4.5, -2.25, 0, 2.25, 4.5 cm.

Linear Rails (2x): Guide the carriage movement along the Y axis.
Timing Belts: Connect the motor pulleys to the carriage.

Acrylic Tank: Holds the water and electrodes.
The system is powered by a 24V supply for the motors and 5V for the electronics.""",

        'physics': """The physics of the experiment is based on electrostatics:

Electric Field: The force per unit charge. Between parallel plates, E = V/d.
For this experiment: E = 12V / 10cm = 1.2 V/cm.

Voltage/Potential: The potential varies linearly with distance from the plates.
V(x) = 12 * (1 - x/d), where x is the distance from the left plate.

Equipotential Lines: Lines connecting points with the same voltage.
They are always perpendicular to the electric field lines.

Field Direction: The electric field points from high potential (12V) to low potential (0V).
This is the direction a positive charge would move.

Uniform Field: Between parallel plates, the field is constant everywhere.
This means equipotential lines are straight and parallel to the plates.

Field lines are perpendicular to equipotential lines.
The gradient of the potential gives the electric field: E = -∇V.""",

        'measurement': """Measurement Process:

Each measurement consists of reading voltages from all five probes at a given Y position.

The ADC (ADS1115) converts the analog voltage from each probe to a digital value.
The ESP32 reads these values over I2C and creates a data packet.

A data packet contains:
- Packet ID: Unique identifier for each measurement cycle
- Timestamp: When the measurement was taken
- Y Position: Current carriage position in centimeters
- 5 Voltage Readings: One for each probe

The probes measure voltage simultaneously, giving a snapshot of the potential at five different X positions.

In the simulation, clicking "Measure" generates a packet with realistic voltage values.
The "Simulate Packet" button does the same thing, simulating the ESP32's data acquisition.""",

        'control': """Simulation Controls:

Home: Moves the carriage to the center position (Y = 0 cm).

Move Y: Advances the carriage to the next position in the sequence:
-5 → -3 → -1 → 1 → 3 → 5 cm.
Each movement automatically triggers a measurement.

Measure: Takes a measurement at the current Y position.
Generates a data packet with five voltage readings.

Reset: Returns the carriage to Y = 0 and resets the position counter.

You can also orbit, pan, and zoom the 3D view using your mouse:
- Drag to rotate the view
- Scroll to zoom in/out
- Right-click and drag to pan""",

        'data': """Data Export:

All measurements are stored in the data table on the right panel.

Export CSV: Downloads all collected measurements as a CSV file.
The file contains:
- Packet ID
- Timestamp
- Probe number (1-5)
- X position of the probe (cm)
- Y position of the carriage (cm)
- Voltage measurement (V)

This data can be analyzed in Excel, Python, MATLAB, or any data analysis tool.

Clear: Removes all measurements from the table.
This does not affect the CSV export (exports only current data).

The data shows how voltage varies with position, allowing you to plot equipotential lines and calculate the electric field.""",

        'simulation': """How to Use the Simulation:

1. View the 3D tank: The tank is displayed in the main view.
   You can rotate, zoom, and pan using your mouse.

2. Move the carriage: Click "Move Y" to advance through positions.
   The carriage will move and automatically take measurements.

3. Take measurements: Click "Measure" or "Simulate Packet" to generate data.

4. View data: Measurements appear in the table on the right.

5. Export data: Click "Export CSV" to download your measurements.

6. Ask questions: Use the chat box to ask about any aspect of the experiment.
   I can explain physics, hardware, controls, and data analysis.

The simulation models the real experiment in 3D, showing the tank, probes, and the moving carriage with realistic physics.""",

        'math': """Key Formulas:

1. Electric Field between parallel plates:
   E = V / d
   Where V = voltage difference, d = plate separation
   For this experiment: E = 12 / 10 = 1.2 V/cm

2. Voltage as a function of position:
   V(x) = V₀ * (1 - x/d)
   Where V₀ = 12V, x = distance from left plate, d = 10cm

3. Electric Field from potential:
   E = -dV/dx (the negative gradient of the potential)

4. For this simulation with Y variation:
   V(x,y) = 12 * (1 - (y+5)/10) * (0.75 + 0.25*(x+6)/12)
   This adds a small Y-dependence to simulate real-world effects.

5. Energy conservation:
   U = qV (potential energy of a charge in an electric field)

6. Force on a charge:
   F = qE (force equals charge times electric field)"""

    }
    return answers.get(intent, "I don't have a specific answer for that. Try asking about: the experiment, hardware, ESP32, physics, measurements, controls, or data export.")

# ============================================================
# ROUTES
# ============================================================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    question = data.get('question', '').strip()
    
    if not question:
        return jsonify({'error': 'No question provided'}), 400
    
    if len(question) < 3:
        return jsonify({'answer': "Please ask a longer question. I can help with the experiment, hardware, physics, controls, or data."})
    
    # Use Random Forest as primary classifier with fallback
    vec = vectorizer.transform([question])
    
    # Try primary model
    primary_model = models['random_forest']
    intent = primary_model.predict(vec)[0]
    confidence = np.max(primary_model.predict_proba(vec))
    
    # If confidence is low, try other models
    if confidence < 0.5:
        for name, model in models.items():
            if name != 'random_forest':
                pred = model.predict(vec)[0]
                if hasattr(model, 'predict_proba'):
                    conf = np.max(model.predict_proba(vec))
                    if conf > confidence:
                        confidence = conf
                        intent = pred
    
    answer = get_answer(intent)
    
    # Add intent info for debugging (optional)
    return jsonify({'answer': answer, 'intent': intent})

# ============================================================
# SOCKETIO EVENTS
# ============================================================
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connected', {'status': 'ok'})

@socketio.on('move_to')
def handle_move(data):
    y = data.get('y', 0)
    # Simulate movement (will be handled by client)
    emit('position_update', {'y': y})

@socketio.on('start_scan')
def handle_scan(data):
    def scan_task():
        positions = [-5, -3.3, -1.7, 0, 1.7, 3.3, 5]
        for i, y in enumerate(positions):
            socketio.emit('position_update', {'y': y})
            time.sleep(0.4)
            voltages = [round(6 + y * 0.3 + (x / 6) * 2.5, 3) for x in [-4.5, -2.25, 0, 2.25, 4.5]]
            socketio.emit('sensor_data', {'y': y, 'voltages': voltages})
            time.sleep(0.3)
            socketio.emit('scan_progress', {'current': i+1, 'total': len(positions)})
        socketio.emit('scan_complete', {'status': 'done'})
    threading.Thread(target=scan_task).start()

# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
