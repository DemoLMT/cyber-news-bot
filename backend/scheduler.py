from apscheduler.schedulers.blocking import BlockingScheduler
import subprocess

def run_job():
    print("Running cyber agent...")
    subprocess.run(["python", "scripts/run_agent.py"], cwd="backend")

scheduler = BlockingScheduler()

# Sáng 7h
scheduler.add_job(run_job, 'cron', hour=7, minute=0)

# Trưa 12h
scheduler.add_job(run_job, 'cron', hour=12, minute=0)

# Tối 18h
scheduler.add_job(run_job, 'cron', hour=18, minute=0)

print("Cyber Intelligence Scheduler started...")
scheduler.start()