# Threshing MPD classification service

Production-ready boundary for the MPD conveyor camera and the three cooking categories: `normal_cook`, `under_cook`, and `over_cook`.

## Setup

1. Create a virtual environment and install `requirements.txt`.
2. Copy `.env.example` to `.env` and set database/model values.
3. Run `python -m database.init_database` from this directory.
4. Put trained weights in `models/mpd_cooking.pt` (or change `MODEL_PATH`).
5. Run `python app.py`.
6. In the Threshing MPD tab, enter configuration mode and configure the RTSP URL.

The service never produces synthetic detections. Missing camera, model, or database is exposed explicitly through `/api/threshing-mpd/health` and the current-result status.

## Read contract

Downstream services should read `agrovision_threshing_ai_mpd.v_threshing_mpd_process_input`. The view contains one versioned current result per line and is invalidated when camera or model becomes unavailable.
