import os

bind = f"0.0.0.0:{os.environ['PORT']}"
workers = 2
threads = 4
timeout = 120
