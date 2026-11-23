"""
Adds two fake workouts to biometrics.db so you can test the page without the device.
"""
import time
from biometrics import init_db, save_session
import sqlite3

init_db()
db = sqlite3.connect("biometrics.db")

now = int(time.time())
save_session(db, [(12, 98), (10, 105), (8, 112)], ts=now - 86400)       # yesterday
save_session(db, [(15, 92), (14, 101), (12, 110), (9, 118)], ts=now)    # now

db.close()
print("Added 2 demo workouts.")