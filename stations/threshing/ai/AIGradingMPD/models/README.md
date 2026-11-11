# MPD model

Place the trained model at `models/mpd_cooking.pt`, or set `MODEL_PATH` in `.env`.

The model must emit labels mapped in `config/classification_config.json` for exactly:

- `normal_cook`
- `under_cook`
- `over_cook`

No placeholder weights or simulated inference are included.
