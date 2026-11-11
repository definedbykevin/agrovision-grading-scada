# Threshing EBC classification service

Production boundary for the EBC conveyor and exactly three categories: `usb`, `psb`, and `eb`.

## Setup

1. Create a virtual environment and install `requirements.txt`.
2. Copy `.env.example` to `.env` and set database/model values.
3. Run `python -m database.init_database` from this directory.
4. Put trained weights in `models/ebc_classification.pt` (or change `MODEL_PATH`).
5. Run `python app.py`.
6. Configure the RTSP source from configuration mode in the EBC tab.

No synthetic detections are generated. Downstream services read the versioned current result from `agrovision_threshing_ai_ebc.v_threshing_ebc_process_input`.
