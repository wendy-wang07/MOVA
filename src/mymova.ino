#include <cmath>

#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include "EEPROM.h"
#include "RTC.h"

MAX30105 particleSensor;

const int buttonPin = 2;
const int buzzerPin = 3;

// X is in direction of USB port (lengthwise)
// Y is in direction of broadside (widthwise)
// Z is up and down

const int xPin = A0;
const int yPin = A1;
const int zPin = A2;

// Ooximeter
const long FINGER_THRESHOLD = 50000; // IR below this = no finger

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
byte rateCount = 0;
long lastBeat = 0;
int beatAvg = 0;
unsigned long lastPrint = 0; // FOR OXIMETER SENSOR

// Accelerometer
int x{0};
int y{0};
int z{0};

double norm{0};
double normPrev{0};

unsigned long lastSample_accel{0};
unsigned long lastRep{0};
int lastBPM{0};

int reps{0};
bool trackSet{false};
int sets{0};

bool firstTime{true};

// OLED
const int SCREEN_WIDTH{128};
const int SCREEN_HEIGHT{64};
const int OLED_ADDR{0x3C};
const unsigned long I2C_HZ{400000UL};

int lastButton = LOW;
int mode = -1; // -1 for start screen only
bool button{false};
bool timeHold{false};
unsigned long buttonTimer_initial{0};
unsigned long buttonTimer{0};

// STOPWATCH
unsigned long stopwatch{0};
bool stopwatchRunning{false};

// CLOCK
unsigned long lastClock{0};


Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);


void resetReadings() {
  rateSpot = 0;
  rateCount = 0;
  lastBeat = 0;
  beatAvg = 0;
}

void setup() {

  Serial.begin(115200); // output to computer
  unsigned long bootStart = millis();
  while (!Serial && millis() - bootStart < 3000) {}

  pinMode(buttonPin, INPUT);
  pinMode(buzzerPin, OUTPUT);

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    std::exit(0);
  }

  particleSensor.setup();                    // default settings
  particleSensor.setPulseAmplitudeRed(0x0A); // low red LED
  particleSensor.setPulseAmplitudeGreen(0);  // green off
  particleSensor.shutDown();                 // start in the "off" state

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    std::exit(0);
  }
  
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(30, 4);
  display.setTextColor(SSD1306_WHITE); 

  display.println(F("MyMOVA"));
  display.setTextSize(1);
  display.println(F("\n\n\n\n HOLD BUTTON to start"));

  display.display();

  RTC.begin(); // RESET START TIME TO DATE UPON LAUNCH (its hard coded)
  /*
  RTCTime startTime(22, Month::NOVEMBER, 2026, 17, 51, 00, DayOfWeek::SUNDAY, SaveLight::SAVING_TIME_INACTIVE);
  RTC.setTime(startTime);
  */

  int totalInts{1 + EEPROM.read(0) * 2};

  // OUTPUT DATA
  for (int address = 0; address < totalInts * 4; address += 4) {
    int value{0};
    int zero{0};

    EEPROM.get(address, value);

    Serial.println(value);
    EEPROM.put(address, zero);
  }
}


void loop() {
  button = digitalRead(buttonPin);

  if (button == HIGH && lastButton == LOW) {
    timeHold = true;
    buttonTimer_initial = millis();
  }

  if (timeHold) {
    buttonTimer = millis() - buttonTimer_initial;

    if (button == LOW) { // SHORT PRESS
      firstTime = false;
      timeHold = false;
      buttonTimer = 0;

      if (mode == 1) {
        trackSet = !trackSet;
        if (!trackSet) {
          trackSet = false;
          norm = 0;

          if (reps > 0) {
            EEPROM.put(4 + sets * 2, reps);
            EEPROM.put(8 + sets * 2, lastBPM);

            sets++;
            EEPROM.put(0, sets);
          }
        } else {
          reps = 0;

        }
      
      } else if (mode == 2) {
        if (stopwatchRunning) {
          stopwatch = millis() - stopwatch; // convert start time -> elapsed time
          stopwatchRunning = false;

        } else if (!stopwatchRunning && stopwatch == 0) {
          stopwatch = millis();
          stopwatchRunning = true;

        } else {
          stopwatch = 0;

        }
      }
    }
  }

  if (button == HIGH && buttonTimer > 500) { // switch modes for long press
    mode++;
    if (mode >= 3) { // 3 modes: clock, metrics, timer
      mode = 0;
    }

    if (mode == 0) { // hang clock (it doesn't work)
      mode++;
    }


    timeHold = false;
    buttonTimer = 0;

    resetReadings();
    if (mode == 1) {
      particleSensor.wakeUp();
    } else {
      particleSensor.shutDown();
    }

    display.clearDisplay();
    display.setCursor(0, 0);

    switch (mode) {
      case 0:
        display.print("Clock");
        break;
      
      case 1:
        display.print("Metrics");
        break;

      case 2:
        firstTime = false;
        display.print("Stopwatch");
        break;
    }

    display.display();

    /* Generate tone upon switching mode

    tone(buzzerPin, 660);
    delay(50);
    noTone(buzzerPin);
    tone(buzzerPin, 990);
    delay(50);
    noTone(buzzerPin);
    */

  }


  switch (mode) {
    case 0: {

      if (millis() - lastClock > 1000) { // change to alter update frequency
        lastClock = millis();

        RTCTime currentTime;
        RTC.getTime(currentTime);

        display.setCursor(20, 24);
        display.fillRect(0, 8, 128, 64, SSD1306_BLACK);

        display.setTextSize(3);

        display.print(currentTime.getHour());
        display.print(":");

        if (currentTime.getMinutes() < 9) {
          display.print(0);
        }
        display.print(currentTime.getMinutes());
        display.setTextSize(1);

        display.display();
      }
      break;
    }
    case 1: {
      long irValue = particleSensor.getIR();

      if (irValue < FINGER_THRESHOLD) {
        resetReadings();

      } else if (checkForBeat(irValue)) {
        long delta = millis() - lastBeat;
        lastBeat = millis();
        float bpm = 60 / (delta / 1000.0);

        if (bpm > 20 && bpm < 255) {
          rates[rateSpot++] = (byte)bpm;
          rateSpot %= RATE_SIZE;
          if (rateCount < RATE_SIZE) {
            rateCount++;
          }

          int sum = 0;
          for (byte i = 0; i < rateCount; i++) {
            sum += rates[i];
            beatAvg = sum / rateCount;
          }
        }
      }

      x = analogRead(A0); 
      y = analogRead(A1);
      z = analogRead(A2);

      if (trackSet) {
        if (reps > 1 && millis() - lastRep > 10000) { // Detect break
          trackSet = false;
          norm = 0;

          if (reps > 0) {
            EEPROM.put(4 + sets * 2, reps);
            EEPROM.put(8 + sets * 2, lastBPM);

            sets++;
            EEPROM.put(0, sets);
          }
        }

        if (millis() - lastSample_accel > 200) {

          lastSample_accel = millis();
          norm = std::sqrt((x * x) + (y * y) + (z * z)) - 693; // 693 is calibration const
          if (millis() - lastRep > 500 && norm - normPrev > 0 && abs(norm - normPrev) > 35) {
            lastRep = millis();
            lastBPM = beatAvg;

            reps++;
          }
          normPrev = norm;
        }
      }


      // ---- Status print twice per second ----
      if (millis() - lastPrint > 500) {
        lastPrint = millis();
        display.setCursor(0, 16);
        display.fillRect(0, 8, 128, 64, SSD1306_BLACK);

        display.setTextSize(1);
        display.print(F("Heart Rate: "));
        display.println(beatAvg);

        display.print(F("Sets: "));
        display.println(sets);

        display.print(F("Reps: "));
        display.println(reps);

        if (trackSet) {
          display.print(F("Motion: "));
          display.println(static_cast<int>(std::round(norm)));

        } else if (firstTime) {
          display.println(F("\nPRESS to start"));
          display.println(F("HOLD to switch mode"));
        }

        display.setTextSize(1);
        display.display();
      }

      break;
    }
    case 2: {
      unsigned long t = stopwatchRunning ? (millis() - stopwatch) : stopwatch;

      unsigned long totalSec = t / 1000;
      unsigned int minutes = totalSec / 60;
      unsigned int seconds = totalSec % 60;
      unsigned int centis  = (t % 1000) / 10;

      char buf[16];
      snprintf(buf, sizeof(buf), "%02u:%02u.%02u", minutes, seconds, centis);

      display.setCursor(0, 4);
      display.fillRect(0, 8, 128, 64, SSD1306_BLACK);

      display.setTextSize(2);
      display.println(F("\n"));
      display.print(buf);
      display.setTextSize(1);

      display.display();
      break;
    }


  }

  lastButton = button;

}
