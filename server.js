// 1. Load the Express tool we installed
const express = require('express');
const app = express();

// 2. Tell the server to understand JSON text (the language computers use to talk to APIs)
app.use(express.json());

// 3. Create an empty map to store our active devices
const monitors = new Map();

// 4. This function handles what happens when a device goes down
const fireAlert = (id, email) => {
    console.log("\n⚠️ --- CRITICAL ALERT --- ⚠️");
    console.log(`Device [${id}] has stopped talking!`);
    console.log(`Sending email alert to: ${email}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log("---------------------------\n");
};

// 5. ENDPOINT 1: Register a new device
app.post('/monitors', (req, res) => {
    const { id, timeout, alert_email } = req.body;

    // Check if the user forgot to give us information
    if (!id || !timeout || !alert_email) {
        return res.status(400).json({ error: "Please provide id, timeout, and alert_email" });
    }

    // If this device already has a timer running, stop it first
    if (monitors.has(id)) {
        clearTimeout(monitors.get(id).timerId);
    }

    // Start a countdown! When the timer hits 0, trigger the alert
    const timerId = setTimeout(() => {
        const device = monitors.get(id);
        if (device && device.status !== 'paused') {
            device.status = 'down';
            fireAlert(id, device.alert_email);
        }
    }, timeout * 1000); // Node.js measures time in milliseconds, so 10 seconds = 10000ms

    // Save this device's information into our memory map
    monitors.set(id, { timeout, alert_email, status: 'active', timerId });

    // Respond back to the client that it worked
    res.status(201).json({ message: `Successfully tracking device: ${id}` });
});

// 6. ENDPOINT 2: The Heartbeat (Reset the timer)
app.post('/monitors/:id/heartbeat', (req, res) => {
    const deviceId = req.params.id;
    const device = monitors.get(deviceId);

    // If the device doesn't exist in our system
    if (!device) {
        return res.status(404).json({ error: "Device not found" });
    }

    // Stop the old countdown timer from blowing up
    clearTimeout(device.timerId);

    // Start a brand new fresh countdown timer
    const newTimerId = setTimeout(() => {
        const currentDevice = monitors.get(deviceId);
        if (currentDevice && currentDevice.status !== 'paused') {
            currentDevice.status = 'down';
            fireAlert(deviceId, currentDevice.alert_email);
        }
    }, device.timeout * 1000);

    // Update our records with the new timer and make sure it's active
    device.timerId = newTimerId;
    device.status = 'active';

    res.status(200).json({ message: `Heartbeat received! Timer reset for ${deviceId}.` });
});

// 7. Start the server so it listens for requests
app.listen(3000, () => {
    console.log("🚀 Watchdog Sentinel Server is alive and running on http://localhost:3000");
});