Here are simple, clear answers to all 13 of your questions so you and your team have full clarity on every aspect of the project.

---

### 1. How will a citizen upload a geotagged photo?
Through our **Responsive Web App (PWA)** on their phone. When they click *"Report Smoke/Fire"*:
* The browser automatically requests GPS access using the standard **Browser Geolocation API** (`navigator.geolocation.getCurrentPosition()`) to get their exact latitude and longitude.
* Alternatively, if they upload an existing photo from their gallery, our backend reads the embedded **EXIF metadata** inside the image file to extract the exact GPS coordinates and timestamp when the photo was taken.

---

### 2. What will make a citizen want to do it? (Motivation & Incentives)
* **Immediate Local Feedback**: Citizens see instant validation (*"AI confirmed your report! Regional alert dispatched"*), making them feel like active civic heroes rather than helpless victims of pollution.
* **Hyperlocal Health Warnings**: Reporting smoke unlocks personalized, real-time safety advisories (*"Smoke heading toward your neighborhood in 2h — close windows & avoid outdoor exercise"*).
* **Gamification & Civic Credits**: Earning "CleanAir Badges" or civic reward points redeemable for municipal perks or public transport discounts.

---

### 3. What is a pollution plume?
A **pollution plume** is a moving cloud or column of smoke and chemical pollutants released from a specific source (like crop stubble burning or factory chimneys) that gets blown across the landscape by wind. 

*Think of chimney smoke stretching into a long, widening tail across the sky—that stream is the plume.*

---

### 4. How will you alert action teams? And what do they need to do?
* **How they are alerted**: Automated SMS/WhatsApp notifications, webhooks, and live pop-up alerts on the **Inter-Agency Command Center Dashboard**.
* **What action teams need to do**:
  * **Municipal Anti-Smog Squads**: Deploy water-sprinkling trucks and anti-smog guns to high-risk zones 4–6 hours *before* the plume hits.
  * **Agricultural Enforcement**: Dispatch ground patrols directly to GPS coordinates where crop burning is actively detected.
  * **Industrial Inspectors**: Issue temporary throttle orders to nearby factory chimneys or construction sites along the predicted path.

---

### 5. Do we need to make IoT sensors and place them? Or are they already there?
**They are already there! We do NOT need to build any hardware.**
* **OpenAQ v3 API** provides free, open-source access to thousands of live ground sensors globally.
* **Government Monitoring Networks** (like CPCB in India) stream official continuous ambient air monitoring station data publicly.
* Our system simply connects to these existing APIs to ingest real-time data.

---

### 6. Do we have NASA satellite fire spots data available every day?
**YES, absolutely.** 
* **NASA FIRMS** (Fire Information for Resource Management System) provides free, near-real-time thermal active fire data updated every 3 hours globally from the VIIRS (375-meter resolution) and MODIS satellites. We can pull this data via a free API key.

---

### 7. Do we have wind data available?
**YES.**
* We use the **Open-Meteo Weather API** (free & open). It provides hourly real-time data and 7-day forecasts for wind speed, wind direction (0–360°), temperature, and air pressure for any location on Earth.

---

### 8. How do we know historical patterns, and how do we store & use them?
* **Data Sources**: Past 1–5 years of air quality logs from OpenAQ and satellite fire records from NASA.
* **Storage**: Stored in **TimescaleDB / PostgreSQL** indexed by `(location, month, hour_of_day)`.
* **How we use it**: To calculate normal rolling baselines ($\mu_{\text{historical}}$). For example: If PM2.5 in Chandigarh at 2 PM is $180\,\mu\text{g/m}^3$, but the 3-year historical average for September at 2 PM is only $45\,\mu\text{g/m}^3$, the AI immediately flags a **$+300\%$ severe anomaly**.

---

### 9. What is atmospheric mixing height (Planetary Boundary Layer Height - PBLH)? And how do we get it?
* **What it is**: The vertical "ceiling" height up to which surface air and smoke are allowed to mix and disperse.
  * *High mixing height (e.g., 2,000m in summer)*: Smoke spreads out vertically into a huge volume of air $\rightarrow$ **Lower ground pollution**.
  * *Low mixing height (e.g., 200m in winter/night)*: Cold air traps smoke close to the ground like a lid $\rightarrow$ **Severe, hazardous smog accumulation**.
* **How we get it**: Open-Meteo and NOAA GFS weather models supply hourly `boundary_layer_height` in meters globally for free.

---

### 10. What's a transboundary alert?
An automated warning sent across administrative boundaries (e.g., from Punjab state authorities to Delhi-NCR, or across national borders in BRICS regions) when pollution generated in Region A is predicted by wind physics to drift into Region B within a few hours.

---

### 11. What are all the corridors we are targeting?
We focus on major economic and travel corridors where pollution transport impacts millions:
1. **Indo-Gangetic Plain Corridor (India)**: Punjab $\rightarrow$ Haryana $\rightarrow$ Delhi-NCR $\rightarrow$ Uttar Pradesh.
2. **Industrial Economic Corridors**: Mumbai $\rightarrow$ Pune, Bengaluru $\rightarrow$ Chennai.
3. **BRICS Regional Corridors**: Beijing–Tianjin–Hebei (China), São Paulo Economic Zone (Brazil).

---

### 12. Will this be an app or website or both?
**It is a unified Responsive Web Application (PWA):**
* **Desktop View**: Designed for **Environmental & Government Command Centers** (full interactive geospatial maps, wind vector particle animations, plume trajectory sliders, and alert triggers).
* **Mobile View**: Optimized for **Citizens** on their phones (fast, simple 1-click photo upload with GPS geotagging without requiring an app store download).

---

### 13. Are you sure this is the right tech stack for this kind of project?
**100% YES.** This is the modern industry-standard stack for Geospatial AI applications:
* **FastAPI (Python)**: High-performance async Python backend—essential because all major AI/ML libraries (PyTorch, Scikit-Learn) and GIS tools run natively in Python.
* **PostgreSQL + PostGIS**: The gold standard spatial database. It allows us to run instant SQL queries like *"Find all active NASA fire spots within 10 km of this citizen photo"*.
* **Vite + React 18 + Leaflet**: Extremely fast frontend stack capable of rendering heavy interactive maps and 60fps canvas particle wind animations smoothly.

### 14. How do you get SMS/WhatsApp details, or access to the Inter-Agency Command Center Dashboard?

* **Dashboard Access**:
  * Authorized officials (e.g., State Pollution Control Board officers, Municipal Commissioners) log into the web portal via secure **OAuth2 / JWT Authentication** with Role-Based Access Control (RBAC). 
  * In a hackathon demo, we provide a **Role Switcher UI dropdown** (*"View as Administrator"*, *"View as Regional Inspector"*, *"View as Citizen"*) to demonstrate different permission levels live.

* **SMS & WhatsApp Contact Details**:
  * **Directory System**: During agency onboarding, a contacts database maps official phone numbers to specific geographic zones (e.g., `Zone_North_Delhi_Inspectors`, `Punjab_Agri_Taskforce`).
  * **Automated Dispatch**: When an event occurs, FastAPI uses **Twilio (for SMS)** or **Meta WhatsApp Business API** to send structured alerts directly to the registered phone numbers for that zone.

---

### 15. How do you notify industrial inspectors?

Here is the exact automated dispatch workflow:

```
[ AI detects industrial plume ] ──▶ [ PostGIS finds inspector assigned to zone ] ──▶ [ WhatsApp / App push alert sent ]
```

1. **Spatial Lookup**: When our AI detects an industrial smoke anomaly at `(Lat: 28.45, Lng: 77.02)`, PostGIS queries which inspector is currently assigned to that spatial region (`ST_Contains(zone_polygon, event_location)`).
2. **Instant Push Alert**: An automated message is dispatched to the inspector's phone with:
   * **Location & Map Link**: Direct Google Maps pin to the suspect industrial unit.
   * **Evidence Summary**: *"NO₂ concentration spike + 86% Computer Vision Smoke match from citizen photo."*
   * **Action Trigger**: *"Inspect Chimney Stack at Sector 18 Industrial Area; verify operational status of wet scrubbers."*
3. **Inspector Ack**: The inspector clicks a 1-tap button on their notification (*"Acknowledged - On my way"*) which updates the Command Center dashboard status in real-time.

---

### 16. If an industry releases smoke, can it only alert faraway areas or nearby places too?

**It alerts BOTH nearby AND faraway areas!**

The system works on two distinct time horizons:

```
                              ┌──▶ NEARBY (0–3 km)   : Immediate Ground Spike Alert (T = 0 to 15 mins)
[ Industrial Smoke Release ] ─┤
                              └──▶ FARAWAY (5–50 km) : Predictive Downwind Forecast Alert (T = +2 to +8 hours)
```

1. **Nearby Places (0 to 3 km)**:
   * **Immediate Alert**: Local IoT sensors and nearby citizens detect the heavy smoke concentration within minutes. 
   * **Action**: Immediate alerts go out to local factory inspectors, nearby schools, and local residents (*"High local industrial emissions detected within 1 km. Close windows."*).

2. **Faraway Downwind Places (5 to 50 km)**:
   * **Predictive Early Warning**: The smoke doesn't stay near the factory—wind carries it downwind. 
   * **Action**: Our **Gaussian Plume Dispersion Model** projects where that smoke cloud will drift over the next 3, 6, and 12 hours, warning downstream cities **hours before** the pollution reaches them.