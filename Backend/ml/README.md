# Pet Vision Local ML Pipeline

This folder contains the local training and inference pipeline for Pet Vision. Training is designed to run on a developer machine, not inside the Render/Vercel web service.

## 1. Create a Virtual Environment

From the repository root:

```bash
python -m venv .venv
```

Activate it:

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

## 2. Install Requirements

```bash
pip install -r Backend/ml/requirements.txt
```

TensorFlow may download pretrained ImageNet weights the first time `MobileNetV2` or `EfficientNetB0` is used. The scripts do not download datasets.

## 3. Dataset Format

The current MVP is dog/cat breed-level classification. Class folders are read directly from `Backend/ml/dataset/train`.

```text
Backend/ml/dataset/
  train/
    cho Pug/
    cho Beagle/
    cho Samoyed/
    meo Bengal/
    meo Persian/
    meo Siamese/
  val/
    cho Pug/
    cho Beagle/
    cho Samoyed/
    meo Bengal/
    meo Persian/
    meo Siamese/
```

Folder naming rules:

- `cho <breed>` maps to species `Chó`
- `meo <breed>` maps to species `Mèo`
- underscores are converted to spaces for display

Examples:

| Folder | Display |
| --- | --- |
| `cho Pug` | Chó Pug |
| `cho Shiba_inu` | Chó Shiba Inu |
| `meo British_Shorthair` | Mèo British Shorthair |
| `meo Maine_Coon` | Mèo Maine Coon |

If `train/` and `val/` do not exist, you may place images under:

```text
Backend/ml/dataset/raw/<class_name>/
```

`train.py` will create a simple train/validation split from `raw/`.

## 4. Train

```bash
python Backend/ml/train.py --data Backend/ml/dataset --epochs 10 --batch-size 32
```

Optional EfficientNetB0:

```bash
python Backend/ml/train.py --data Backend/ml/dataset --model efficientnetb0 --epochs 10 --batch-size 32
```

Outputs:

- Model: `Backend/ml/models/pet_breed_model.keras`
- Labels: `Backend/ml/labels.json`
- Metrics: `Backend/ml/outputs/metrics.json`
- Status: `Backend/ml/model-status.json`

`labels.json` includes raw labels and display metadata:

```json
{
  "classes": [
    {
      "index": 0,
      "label": "cho Pug",
      "displayName": "Chó Pug",
      "species": "Chó",
      "breed": "Pug"
    }
  ]
}
```

## 5. Predict

```bash
python Backend/ml/predict.py --image test.jpg
```

Successful output is JSON only:

```json
{
  "success": true,
  "prediction": {
    "label": "cho Pug",
    "displayName": "Chó Pug",
    "species": "Chó",
    "breed": "Pug",
    "confidence": 0.91,
    "topK": []
  }
}
```

If the model file is missing:

```json
{
  "success": false,
  "message": "MODEL_NOT_FOUND"
}
```

## 6. Node Backend Integration

The Express backend calls this script with a fixed command from `petVisionService.js`:

```bash
python Backend/ml/predict.py --image <tempImagePath>
```

The script prints exactly one JSON object to stdout. Logs and errors must go to stderr so the Node backend can safely parse the prediction.

## 7. Limitations

- Current focus is dog/cat breed classes from your dataset folders.
- Other species can be added later by adding class folders and updating product/category mapping if needed.
- Accuracy depends heavily on dataset quality, class balance, and validation split.
- The default model is MobileNetV2 transfer learning with 224x224 images.

## 8. Deployment Note

Train locally, then deploy the exported model file separately. Do not train inside the normal web service request cycle. Keep datasets and large model files out of Git.
